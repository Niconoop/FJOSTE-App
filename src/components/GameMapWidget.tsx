import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as proj4 from 'proj4';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as pmtiles from 'pmtiles';
import { Crosshair, Navigation, Plus, Minus } from 'lucide-react';
import { API_URL } from '../config';
import { findCity, findCompany } from '../data/ets2Cities';
import { CarPlayNavOverlay } from './CarPlayNavOverlay';
import { generateNextInstruction, type JSONTurnPoint, type InstructionResult } from '../utils/navInstructionEngine';
import type { GameMapWidgetHandle } from './GameMapWidget.types';

// Register PMTiles protocol once
let pmTilesProtocolAdded = false;
function addPmTilesProtocol() {
  if (pmTilesProtocolAdded) return;
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  pmTilesProtocolAdded = true;
}

interface GameMapWidgetProps {
  /** Game X coordinate from telemetry */
  gameX?: number;
  /** Game Z coordinate from telemetry (Y in SCS convention) */
  gameY?: number;
  /** Heading in radians */
  heading?: number;
  /** Source city name */
  source?: string;
  /** Destination city name */
  dest?: string;
  /** Destination company name */
  destCompany?: string;
  /** Current city name */
  city?: string;
  /** Navigation distance in meters */
  navDistance?: number;
  /** Whether the game is connected */
  connected?: boolean;
  /** Accent color from theme */
  accentColor?: string;
  /** Map theme mode ('dark' | 'light') */
  themeMode?: 'dark' | 'light';
  /** Widget width */
  width?: number | string;
  /** Widget height */
  height?: number | string;
  /** Controlled map zoom level */
  zoom?: number;
  /** Initial map zoom level */
  initialZoom?: number;
  /** Callback emitted when zoom changes */
  onZoomChange?: (zoom: number) => void;
  /** Whether to show top-right CarPlay navigation overlay banner */
  showInstructions?: boolean;
  /** Unique map identifier */
  mapId?: string;
  /** Callback when destination is reached */
  onDestinationReached?: () => void;
}

// --- ETS2 coordinate → lat/lng projection (Lambert Conformal Conic) ---
const earthRadiusMeters = 6_370_997;
const lengthOfDegree = (earthRadiusMeters * Math.PI) / 180;

const createTurnArrowheadImage = (map: maplibregl.Map) => {
  if (map.hasImage('turn-arrowhead-icon')) return;

  // Short wide triangle whose base width matches the 8px route line.
  // Canvas is 32x24: base at bottom spans full width, tip at top center.
  const s = 2; // pixel ratio
  const w = 32 * s;
  const h = 20 * s;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#ffffff';
    // Triangle: tip at top-center, base spans full width at bottom
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);        // tip
    ctx.lineTo(w, h);            // bottom-right
    ctx.lineTo(0, h);            // bottom-left
    ctx.closePath();
    ctx.fill();
  }

  const imgData = ctx?.getImageData(0, 0, w, h);
  if (imgData) {
    map.addImage('turn-arrowhead-icon', imgData, { pixelRatio: s });
  }
};

const PROXY_BASE = `${API_URL}/map/proxy`;

const ets2DefData = {
  mapProjection: 'lambert_conic',
  standardParalel1: 37,
  standardParalel2: 65,
  mapOrigin: [50, 15],
  mapOffset: [16660, 4150],
  mapFactor: [-0.000171570875, 0.0001729241463],
} as const;

const ets2ProjectionString = [
  '+proj=lcc',
  `+R=${earthRadiusMeters}`,
  `+lat_1=${ets2DefData.standardParalel1}`,
  `+lat_2=${ets2DefData.standardParalel2}`,
  `+lat_0=${ets2DefData.mapOrigin[0]}`,
  `+lon_0=${ets2DefData.mapOrigin[1]}`,
].join(' ');

const fromWgs84ToEts2Converter = proj4.default(ets2ProjectionString);

function projectGameToLatLng(gx: number, gz: number): [number, number] | null {
  if (gx == null || gz == null) return null;

  let x = gx;
  let y = gz;

  const sx = Math.floor(x / 4000);
  const sy = Math.floor(y / 4000);
  x -= ets2DefData.mapOffset[0];
  y -= ets2DefData.mapOffset[1];

  const ukScaleFactor = 0.75;
  const calais = [-31100, -5500];
  const isUk = sx <= -8 && sy <= -2 && !(sx === -8 && sy === -2);
  if (isUk) {
    x = (x + calais[0] / 2) * ukScaleFactor;
    y = (y + calais[1] / 2) * ukScaleFactor;
  }

  const lccCoords: [number, number] = [
    x * ets2DefData.mapFactor[1] * lengthOfDegree,
    y * ets2DefData.mapFactor[0] * lengthOfDegree,
  ];

  const [lng, lat] = fromWgs84ToEts2Converter.inverse(lccCoords);

  if (lat > 35 && lat < 71 && lng > -15 && lng < 45) {
    return [lat, lng];
  }

  return null;
}

const createArrowImage = (map: maplibregl.Map) => {
  if (map.hasImage('route-arrow-icon')) return;

  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 32, 32);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(16, 4);
    ctx.lineTo(28, 22);
    ctx.lineTo(22, 22);
    ctx.lineTo(16, 13);
    ctx.lineTo(10, 22);
    ctx.lineTo(4, 22);
    ctx.closePath();
    ctx.fill();
  }

  const imgData = ctx?.getImageData(0, 0, 32, 32);
  if (imgData) {
    map.addImage('route-arrow-icon', imgData, { pixelRatio: 2 });
  }
};

function createEts2Style(): maplibregl.StyleSpecification {
  const tileRoot = `${API_URL}/map/proxy`;


  return {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sprite: 'https://truckermudgeon.github.io/sprites',
    sources: {
      ets2: {
        type: 'vector',
        url: `pmtiles://${tileRoot}/ets2.pmtiles`,
      },
      world: {
        type: 'vector',
        url: `pmtiles://${tileRoot}/world.pmtiles`,
      },
      footprints: {
        type: 'vector',
        url: `pmtiles://${tileRoot}/ets2-footprints.pmtiles`,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#050508',
        },
      },
      {
        id: 'world-water',
        type: 'fill',
        source: 'world',
        'source-layer': 'water',
        paint: {
          'fill-color': '#0f1c30',
        },
      },
      {
        id: 'ets2-areas',
        type: 'fill',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'mapArea']],
        layout: { 'fill-sort-key': ['get', 'zIndex'] },
        paint: {
          'fill-color': [
            'match', ['get', 'color'],
            0, '#1e293b',  // Parkplätze & Raststätten (High-contrast Slate Asphalt)
            1, '#0e261d',  // Rasen & Grünflächen (Edles Dunkelgrün)
            2, '#283548',  // Betriebshöfe & Verladestationen
            3, '#0a1d16',  // Sekundäre Grünflächen / Terrain
            '#1e293b',
          ],
          'fill-opacity': 0.95,
        },
      },
      {
        id: 'ets2-prefabs',
        type: 'fill',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'prefab'], ['!=', ['get', 'hidden'], true]],
        paint: { 'fill-color': '#1e293b', 'fill-opacity': 0.95 },
      },
      {
        id: 'ets2-footprints',
        type: 'fill',
        source: 'footprints',
        'source-layer': 'footprints',
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'footprint']],
        paint: {
          'fill-color': '#1e293b',
          'fill-opacity': ['step', ['zoom'], 1, 9, 0.85],
        },
      },
      {
        id: 'ets2-extrusions',
        type: 'fill-extrusion',
        source: 'footprints',
        'source-layer': 'footprints',
        minzoom: 8,
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'footprint']],
        paint: {
          'fill-extrusion-color': '#2b3648',
          'fill-extrusion-height': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            9,
            ['*', 10, ['get', 'height']],
            13,
            ['*', 20, ['get', 'height']],
          ],
          'fill-extrusion-opacity': 0.8,
          'fill-extrusion-vertical-gradient': true,
        },
      },

      {
        id: 'ets2-roads-casing',
        type: 'line',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'type'], 'road'], ['!=', ['get', 'hidden'], true]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'match', ['get', 'roadType'],
            'freeway', '#1d4ed8',
            'divided', '#334155',
            'local', '#1e293b',
            'train', '#0f172a',
            '#1e293b',
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 3.5,
            6, 7.5,
            10, 13,
          ],
          'line-opacity': 0.95,
        },
      },
      {
        id: 'ets2-roads',
        type: 'line',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'type'], 'road'], ['!=', ['get', 'hidden'], true]],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': [
            'match', ['get', 'roadType'],
            'freeway', '#3b82f6',
            'divided', '#cbd5e1',
            'local', '#475569',
            'train', '#1e293b',
            '#475569',
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 2,
            6, 5,
            10, 9,
          ],
          'line-opacity': 0.95,
        },
      },
      {
        id: 'ets2-ferries',
        type: 'line',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'type'], 'ferry']],
        paint: {
          'line-color': '#f59e0b',
          'line-width': 1.5,
          'line-dasharray': [4, 4],
          'line-opacity': 0.6,
        },
      },
      {
        id: 'world-states',
        type: 'line',
        source: 'world',
        'source-layer': 'states',
        paint: {
          'line-color': '#10131a',
          'line-width': 1,
          'line-opacity': 0.8,
          'line-dasharray': [2, 2],
        },
      },
      {
        id: 'world-countries',
        type: 'line',
        source: 'world',
        'source-layer': 'countries',
        filter: ['!=', ['get', 'name'], 'Serbia-Kosovo'],
        paint: {
          'line-color': '#1a1f29',
          'line-width': 1.5,
          'line-opacity': 0.9,
        },
      },
      {
        id: 'world-countries-dashed',
        type: 'line',
        source: 'world',
        'source-layer': 'countries',
        filter: ['==', ['get', 'name'], 'Serbia-Kosovo'],
        paint: {
          'line-color': '#1a1f29',
          'line-width': 1.5,
          'line-opacity': 0.9,
          'line-dasharray': [3, 2],
        },
      },
      {
        id: 'ets2-pois',
        type: 'symbol',
        source: 'ets2',
        'source-layer': 'ets2',
        minzoom: 8,
        filter: [
          'all',
          ['==', ['geometry-type'], 'Point'],
          ['==', ['get', 'type'], 'poi'],
          ['!=', ['get', 'poiType'], 'company']
        ],
        layout: {
          'icon-image': '{sprite}',
          'icon-allow-overlap': true,
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            8, 0.4,
            11, 0.7,
            14, 1.0
          ]
        }
      },
      {
        id: 'ets2-companies',
        type: 'symbol',
        source: 'ets2',
        'source-layer': 'ets2',
        minzoom: 9,
        filter: [
          'all',
          ['==', ['geometry-type'], 'Point'],
          ['==', ['get', 'type'], 'poi'],
          ['==', ['get', 'poiType'], 'company']
        ],
        layout: {
          'icon-image': '{sprite}',
          'icon-allow-overlap': true,
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            9, 0.4,
            12, 0.7,
            15, 1.0
          ]
        }
      },
      {
        id: 'ets2-cities',
        type: 'symbol',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'type'], 'city']],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 8, 7, 12, 10, 14],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-padding': 4,
        },
        paint: {
          'text-color': '#8899aa',
          'text-halo-color': '#0d1117',
          'text-halo-width': 1.5,
        },
      },
    ],
  } as any;
}

function shortestAngleDelta(from: number, to: number): number {
  let delta = ((to - from) % 360 + 540) % 360 - 180;
  return delta;
}

function normalizeBearing(deg: number): number {
  return ((deg % 360) + 540) % 360 - 180;
}

/** Safely removes a MapLibre marker without throwing NotFoundError if detached */
function safeRemoveMarker(marker: maplibregl.Marker | null) {
  if (!marker) return;
  try {
    marker.remove();
  } catch (err) {
    try {
      const el = marker.getElement();
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    } catch (e) {
      // Ignore DOM detachment error
    }
  }
}

function getIpcRenderer() {
  try {
    if (typeof window !== 'undefined') {
      const electron = (window as any).electron || ((window as any).require ? (window as any).require('electron') : null);
      return electron?.ipcRenderer || electron;
    }
  } catch (e) {}
  return null;
}

const GameMapWidget = forwardRef<GameMapWidgetHandle, GameMapWidgetProps>(({
  gameX, gameY, heading, source, dest, destCompany, city,
  navDistance, connected, accentColor = '#f59e0b', themeMode = 'dark',
  width = 300, height = 200, zoom, initialZoom = 9, onZoomChange,
  showInstructions = false, mapId, onDestinationReached
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerEl = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const turnMarkersRef = useRef<maplibregl.Marker[]>([]);
  const [following, setFollowing] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const lastPos = useRef<[number, number] | null>(null);

  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;

  const [jsonTurnPoints, setJsonTurnPoints] = useState<JSONTurnPoint[]>([]);
  const [segmentLanes, setSegmentLanes] = useState<number[]>([]);
  const [rawRouteCoords, setRawRouteCoords] = useState<[number, number][]>([]);
  const [navInstruction, setNavInstruction] = useState<InstructionResult>({ primary: null, upcoming: [] });

  // Dynamic zoom state tracked in ref to avoid telemetry zoom resets
  const currentZoomRef = useRef<number>(zoom ?? initialZoom);
  const lastRouteKeyRef = useRef<string>('');
  const lastRouteCalcPosRef = useRef<{ x: number; y: number } | null>(null);
  const headingRef = useRef<number | undefined>(heading);
  headingRef.current = heading;

  // Controlled zoom prop synchronization
  useEffect(() => {
    if (zoom !== undefined && mapRef.current && mapReady) {
      const current = mapRef.current.getZoom();
      if (Math.abs(current - zoom) > 0.05) {
        currentZoomRef.current = zoom;
        mapRef.current.easeTo({ zoom, duration: 250 });
      }
    }
  }, [zoom, mapReady]);

  const [routeGeoJson, setRouteGeoJson] = useState<{
    traveled: GeoJSON.FeatureCollection;
    remaining: GeoJSON.FeatureCollection;
  }>({
    traveled: { type: 'FeatureCollection', features: [] },
    remaining: { type: 'FeatureCollection', features: [] },
  });

  const currentBearingRef = useRef<number>(0);
  const lastRawHeading = useRef<number | null>(null);

  // Expose imperative ref methods
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (!mapRef.current) return;
      const current = mapRef.current.getZoom();
      const next = Math.min(current + 1, 12);
      currentZoomRef.current = next;
      mapRef.current.easeTo({ zoom: next, duration: 300 });
      if (onZoomChangeRef.current) {
        onZoomChangeRef.current(next);
      }
    },
    zoomOut: () => {
      if (!mapRef.current) return;
      const current = mapRef.current.getZoom();
      const next = Math.max(current - 1, 4);
      currentZoomRef.current = next;
      mapRef.current.easeTo({ zoom: next, duration: 300 });
      if (onZoomChangeRef.current) {
        onZoomChangeRef.current(next);
      }
    },
    recenter: () => {
      if (!mapRef.current || !lastPos.current) return;
      setFollowing(true);
      mapRef.current.flyTo({
        center: [lastPos.current[1], lastPos.current[0]],
        zoom: currentZoomRef.current,
        bearing: currentBearingRef.current,
        duration: 800,
      });
    },
    fitRoute: () => {
      if (!mapRef.current || !lastPos.current) return;
      mapRef.current.flyTo({
        center: [lastPos.current[1], lastPos.current[0]],
        zoom: 7,
        duration: 1000
      });
    },
    clearRoute: () => {
      setRouteGeoJson({
        traveled: { type: 'FeatureCollection', features: [] },
        remaining: { type: 'FeatureCollection', features: [] },
      });
    },
    focusDestination: (lng: number, lat: number) => {
      if (!mapRef.current) return;
      setFollowing(false);
      mapRef.current.flyTo({ center: [lng, lat], zoom: 9, duration: 1000 });
    },
    focusDestinationByGameCoords: (gx: number, gz: number) => {
      const pos = projectGameToLatLng(gx, gz);
      if (!pos || !mapRef.current) return;
      setFollowing(false);
      mapRef.current.flyTo({ center: [pos[1], pos[0]], zoom: 9, duration: 1000 });
    },
    setView: (lng: number, lat: number, zoom: number, bearing?: number) => {
      if (!mapRef.current) return;
      currentZoomRef.current = zoom;
      if (bearing != null) currentBearingRef.current = bearing;
      mapRef.current.jumpTo({ center: [lng, lat], zoom, bearing: bearing ?? mapRef.current.getBearing() });
    },
    getView: () => {
      if (!mapRef.current) return null;
      const center = mapRef.current.getCenter();
      return {
        center: [center.lng, center.lat],
        zoom: mapRef.current.getZoom(),
        bearing: mapRef.current.getBearing(),
      };
    },
  }), []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    addPmTilesProtocol();

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: createEts2Style(),
      center: [12, 50],
      zoom: currentZoomRef.current,
      minZoom: 4,
      maxZoom: 12,
      bearing: 0,
      pitch: 60,
      attributionControl: false,
      interactive: true,
      dragRotate: true,
      pitchWithRotate: false,
      touchZoomRotate: true,
      doubleClickZoom: true,
    });
    map.setMinZoom(4);
    map.setMaxZoom(12);

    map.on('load', () => {
      setMapReady(true);
    });

    map.on('dragstart', () => {
      setFollowing(false);
    });
    map.on('rotatestart', (e: any) => {
      if (e.originalEvent) {
        setFollowing(false);
      }
    });

    map.on('rotateend', () => {
      currentBearingRef.current = map.getBearing();
    });

    // Track user zoom actions to update currentZoomRef and notify parent listeners
    const handleZoomEvent = () => {
      if (mapRef.current) {
        const newZoom = Math.round(mapRef.current.getZoom() * 10) / 10;
        currentZoomRef.current = newZoom;
        if (onZoomChangeRef.current) {
          onZoomChangeRef.current(newZoom);
        }
      }
    };

    map.on('zoomend', handleZoomEvent);
    map.on('zoom', handleZoomEvent);

    mapRef.current = map;

    return () => {
      if (markerRef.current) {
        safeRemoveMarker(markerRef.current);
        markerRef.current = null;
      }
      try {
        map.remove();
      } catch (e) {}
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // Create/update player marker
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    if (!markerEl.current) {
      const el = document.createElement('div');
      el.className = 'game-map-player-marker';
      markerEl.current = el;
    }

    markerEl.current.innerHTML = `
      <div class="gm-marker-arrow" style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 14px ${accentColor}) drop-shadow(0 0 6px rgba(0,0,0,0.9));">
        <svg width="56" height="56" viewBox="0 0 24 24" fill="${accentColor}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/>
        </svg>
      </div>
    `;

    return () => {
      if (markerRef.current) {
        safeRemoveMarker(markerRef.current);
        markerRef.current = null;
      }
    };
  }, [mapReady, accentColor]);

  // Main telemetry position & rotation update loop
  useEffect(() => {
    if (!mapRef.current || !mapReady || !markerEl.current) return;
    if (gameX == null || gameY == null) return;

    const pos = projectGameToLatLng(gameX, gameY);
    if (!pos) return;

    const [lat, lng] = pos;
    lastPos.current = pos;

    const rawHeading = heading ?? lastRawHeading.current ?? 0;
    if (heading != null) lastRawHeading.current = heading;

    const theta = (0.5 - rawHeading) * Math.PI * 2 + Math.PI / 2;
    const lookX = gameX + 1000 * Math.cos(theta);
    const lookY = gameY + 1000 * Math.sin(theta);
    const lookPos = projectGameToLatLng(lookX, lookY);

    let desiredBearing = 0;
    if (pos && lookPos) {
      const [lat1, lon1] = pos;
      const [lat2, lon2] = lookPos;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const lat1Rad = lat1 * Math.PI / 180;
      const lat2Rad = lat2 * Math.PI / 180;

      const yVal = Math.sin(dLon) * Math.cos(lat2Rad);
      const xVal = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
        Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

      const brng = Math.atan2(yVal, xVal) * 180 / Math.PI;
      desiredBearing = normalizeBearing(brng);
    } else {
      desiredBearing = normalizeBearing(-(rawHeading * 360));
    }

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        element: markerEl.current,
        anchor: 'center',
        pitchAlignment: 'map',
        rotationAlignment: 'viewport',
      })
        .setLngLat([lng, lat])
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (following && mapRef.current) {
      const delta = shortestAngleDelta(currentBearingRef.current, desiredBearing);
      const SMOOTHING = 0.6;
      const newBearing = currentBearingRef.current + delta * SMOOTHING;
      currentBearingRef.current = newBearing;

      // Retain current user zoom instead of hardcoding zoom level
      mapRef.current.easeTo({
        center: [lng, lat],
        zoom: currentZoomRef.current,
        bearing: newBearing,
        pitch: 60,
        duration: 200,
        easing: (t) => t,
      });
    }
  }, [gameX, gameY, heading, mapReady, following]);

  // Accurate Road Route calculation logic with movement threshold throttling
  useEffect(() => {
    let canceled = false;

    const calculateRoute = async () => {
      if (!dest && !destCompany) {
        lastRouteKeyRef.current = '';
        lastRouteCalcPosRef.current = null;
        setRouteGeoJson({
          remaining: { type: 'FeatureCollection' as const, features: [] },
          traveled: { type: 'FeatureCollection' as const, features: [] },
        });
        return;
      }

      const currentX = gameX ?? 0;
      const currentY = gameY ?? 0;
      const routeKey = `${source || ''}_${dest || ''}_${destCompany || ''}`;
      const lastCalcPos = lastRouteCalcPosRef.current;

      const distMoved = lastCalcPos
        ? Math.hypot(currentX - lastCalcPos.x, currentY - lastCalcPos.y)
        : Infinity;

      // Throttle: only calculate route if target destination changed OR vehicle moved >= 100 meters
      if (routeKey === lastRouteKeyRef.current && distMoved < 100) {
        return;
      }

      let destX: number | null = null;
      let destZ: number | null = null;
      let destLngLat: [number, number] | null = null;

      if (destCompany) {
        const company = findCompany(destCompany, dest);
        if (company) {
          destX = company.x;
          destZ = company.z;
          const pt = projectGameToLatLng(company.x, company.z);
          if (pt) destLngLat = [pt[1], pt[0]];
        }
      }

      if (destX == null && dest) {
        const destCity = findCity(dest);
        if (destCity) {
          destX = destCity.x;
          destZ = destCity.z;
          destLngLat = [destCity.lng, destCity.lat];
        }
      }

      const currentPos = lastPos.current || (gameX != null && gameY != null ? projectGameToLatLng(gameX, gameY) : null);
      const sourceX = gameX ?? (source ? findCity(source)?.x : null);
      const sourceZ = gameY ?? (source ? findCity(source)?.z : null);

      let remainingCoords: [number, number][] = [];

      // Try accurate road network route via Electron route service
      const ipc = getIpcRenderer();
      if (ipc && sourceX != null && sourceZ != null && destX != null && destZ != null) {
        try {
          const res = await ipc.invoke('get-route', sourceX, sourceZ, destX, destZ, headingRef.current);
          if (!canceled && res && res.success && Array.isArray(res.coordinates) && res.coordinates.length >= 2) {
            setJsonTurnPoints(res.turnPoints || []);
            setSegmentLanes(res.segmentLanes || []);
            setRawRouteCoords(res.coordinates || []);
            remainingCoords = res.coordinates
              .map(([gx, gz]: [number, number]) => {
                const pt = projectGameToLatLng(gx, gz);
                return pt ? [pt[1], pt[0]] : null;
              })
              .filter((pt): pt is [number, number] => pt !== null);
          }
        } catch (e) {
          // Fall back to straight line if IPC fails
        }
      }

      // Fallback straight line if road route calculation was unavailable or failed
      if (remainingCoords.length === 0) {
        if (currentPos) remainingCoords.push([currentPos[1], currentPos[0]]);
        if (destLngLat) remainingCoords.push(destLngLat);
      }

      if (canceled) return;

      lastRouteKeyRef.current = routeKey;
      lastRouteCalcPosRef.current = { x: currentX, y: currentY };

      const remainingFeature: GeoJSON.Feature[] = remainingCoords.length >= 2 ? [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: remainingCoords },
      }] : [];

      const sourceCity = source ? findCity(source) : null;
      const traveledCoords: [number, number][] = [];
      if (sourceCity) traveledCoords.push([sourceCity.lng, sourceCity.lat]);
      if (currentPos) traveledCoords.push([currentPos[1], currentPos[0]]);

      const traveledFeature: GeoJSON.Feature[] = traveledCoords.length >= 2 ? [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: traveledCoords },
      }] : [];

      setRouteGeoJson({
        remaining: { type: 'FeatureCollection' as const, features: remainingFeature },
        traveled: { type: 'FeatureCollection' as const, features: traveledFeature },
      });
    };

    calculateRoute();

    return () => {
      canceled = true;
    };
  }, [source, dest, destCompany, gameX, gameY]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const setupRouteLayers = () => {
      if (map.getSource('route-remaining')) {
        if (map.getLayer('route-traveled-line')) {
          map.setPaintProperty('route-traveled-line', 'line-color', accentColor);
        }
        if (map.getLayer('route-remaining-glow')) {
          map.setPaintProperty('route-remaining-glow', 'line-color', accentColor);
        }
        if (map.getLayer('route-remaining-line')) {
          map.setPaintProperty('route-remaining-line', 'line-color', accentColor);
        }
        return;
      }

      map.addSource('route-remaining', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addSource('route-traveled', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addSource('route-turn-curves', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      map.addSource('route-turn-tips', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      createArrowImage(map);
      createTurnArrowheadImage(map);

      map.addLayer({
        id: 'route-traveled-line',
        type: 'line',
        source: 'route-traveled',
        paint: {
          'line-color': accentColor,
          'line-width': 3,
          'line-opacity': 0.3,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      map.addLayer({
        id: 'route-remaining-glow',
        type: 'line',
        source: 'route-remaining',
        paint: {
          'line-color': accentColor,
          'line-width': 8,
          'line-opacity': 0.2,
          'line-blur': 4,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      map.addLayer({
        id: 'route-remaining-line',
        type: 'line',
        source: 'route-remaining',
        paint: {
          'line-color': accentColor,
          'line-width': 5,
          'line-opacity': 0.9,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      map.addLayer({
        id: 'route-turn-curves-glow',
        type: 'line',
        source: 'route-turn-curves',
        paint: {
          'line-color': '#ffffff',
          'line-width': 0,
          'line-opacity': 0,
        },
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
      });

      map.addLayer({
        id: 'route-turn-curves-line',
        type: 'line',
        source: 'route-turn-curves',
        paint: {
          'line-color': '#ffffff',
          'line-width': 0,
          'line-opacity': 0,
        },
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
      });

      map.addLayer({
        id: 'route-turn-tips-symbol',
        type: 'symbol',
        source: 'route-turn-tips',
        paint: {
          'icon-opacity': 0,
        },
        layout: {
          'icon-image': 'turn-arrowhead-icon',
          'icon-size': 0,
          'icon-rotate': ['get', 'bearing'],
          'icon-rotation-alignment': 'map',
          'icon-anchor': 'bottom',
        },
      });
    };

    if (map.isStyleLoaded()) {
      setupRouteLayers();
    } else {
      map.once('styledata', setupRouteLayers);
    }

  }, [mapReady, accentColor]);

  // Dynamic Map Theme (Dark / Light Mode) updates
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const isLight = themeMode === 'light';
    if (map.getLayer('background')) {
      map.setPaintProperty('background', 'background-color', isLight ? '#f8fafc' : '#050508');
    }
    if (map.getLayer('world-water')) {
      map.setPaintProperty('world-water', 'fill-color', isLight ? '#93c5fd' : '#0f1c30');
    }
    // Map areas (parking lots, fields, etc.) – must adapt to light mode
    if (map.getLayer('ets2-areas')) {
      map.setPaintProperty('ets2-areas', 'fill-color', isLight
        ? [
            'match', ['get', 'color'],
            0, '#cbd5e1',  // Parkplätze / Raststätten (Slate-300)
            1, '#d1fae5',  // Rasen & Grünflächen (Sanftes Pastellgrün)
            2, '#b4c6dc',  // Betriebshöfe (Blue-Slate 200)
            3, '#ecfdf5',  // Sekundäre Grünflächen
            '#cbd5e1',
          ]
        : [
            'match', ['get', 'color'],
            0, '#1e293b',  // Parkplätze & Raststätten (High-contrast Slate Asphalt)
            1, '#0e261d',  // Rasen & Grünflächen (Edles Dunkelgrün)
            2, '#283548',  // Betriebshöfe & Verladestationen
            3, '#0a1d16',  // Sekundäre Grünflächen / Terrain
            '#1e293b',
          ]
      );
    }
    if (map.getLayer('ets2-prefabs')) {
      map.setPaintProperty('ets2-prefabs', 'fill-color', isLight ? '#cbd5e1' : '#1e293b');
    }
    if (map.getLayer('ets2-models')) {
      map.setPaintProperty('ets2-models', 'fill-extrusion-color', isLight ? '#94a3b8' : '#334155');
    }
    if (map.getLayer('ets2-roads-casing')) {
      map.setPaintProperty('ets2-roads-casing', 'line-color', isLight
        ? [
            'match', ['get', 'roadType'],
            'freeway', '#2563eb',
            'divided', '#94a3b8',
            'local', '#cbd5e1',
            'train', '#e2e8f0',
            '#cbd5e1',
          ]
        : [
            'match', ['get', 'roadType'],
            'freeway', '#1d4ed8',
            'divided', '#334155',
            'local', '#1e293b',
            'train', '#0f172a',
            '#1e293b',
          ]
      );
    }
    if (map.getLayer('ets2-roads')) {
      map.setPaintProperty('ets2-roads', 'line-color', isLight
        ? [
            'match', ['get', 'roadType'],
            'freeway', '#3b82f6',  // Autobahnen: Blau
            'divided', '#64748b',  // Landstraßen: Slate-500
            'local', '#475569',    // Nebenstraßen: Slate-600
            'train', '#cbd5e1',    // Zugstrecken: Slate-300
            '#475569',
          ]
        : [
            'match', ['get', 'roadType'],
            'freeway', '#3b82f6',
            'divided', '#cbd5e1',
            'local', '#475569',
            'train', '#1e293b',
            '#475569',
          ]
      );
    }
    // Borders and labels in light mode
    if (map.getLayer('world-states')) {
      map.setPaintProperty('world-states', 'line-color', isLight ? '#94a3b8' : '#10131a');
    }
    if (map.getLayer('world-countries')) {
      map.setPaintProperty('world-countries', 'line-color', isLight ? '#64748b' : '#1a1f29');
    }
    if (map.getLayer('world-countries-dashed')) {
      map.setPaintProperty('world-countries-dashed', 'line-color', isLight ? '#64748b' : '#1a1f29');
    }
    if (map.getLayer('ets2-cities')) {
      map.setPaintProperty('ets2-cities', 'text-color', isLight ? '#334155' : '#8899aa');
      map.setPaintProperty('ets2-cities', 'text-halo-color', isLight ? '#f8fafc' : '#0d1117');
    }
  }, [themeMode, mapReady]);

  // Render turn curve path highlights and directional arrowheads along the route
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Clear old turn markers
    turnMarkersRef.current.forEach((m) => {
      try { safeRemoveMarker(m); } catch (e) {}
    });
    turnMarkersRef.current = [];

    const turnCurveFeatures: GeoJSON.Feature[] = [];
    const turnTipFeatures: GeoJSON.Feature[] = [];

    const remaining = routeGeoJson.remaining.features[0]?.geometry;
    const remainingCoords = (remaining && remaining.type === 'LineString') ? remaining.coordinates : [];

    if (jsonTurnPoints && jsonTurnPoints.length > 0 && remainingCoords.length >= 4) {
      let lastTurnCoordIdx = -999;
      jsonTurnPoints.forEach((tp) => {
        const pt = projectGameToLatLng(tp.x, tp.y);
        if (!pt) return;
        const tpLngLat = [pt[1], pt[0]];

        // Find closest index in remainingCoords
        let closestIdx = -1;
        let minDistSq = Infinity;
        for (let i = 0; i < remainingCoords.length; i++) {
          const dx = remainingCoords[i][0] - tpLngLat[0];
          const dy = remainingCoords[i][1] - tpLngLat[1];
          const dSq = dx * dx + dy * dy;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closestIdx = i;
          }
        }

        // Prevent overlapping turn chevrons if points are too close along the route polyline
        if (closestIdx >= 0 && Math.abs(closestIdx - lastTurnCoordIdx) >= 8) {
          lastTurnCoordIdx = closestIdx;
          const startIdx = Math.max(0, closestIdx - 3);
          const endIdx = Math.min(remainingCoords.length - 1, closestIdx + 3);
          const slice = remainingCoords.slice(startIdx, endIdx + 1) as [number, number][];

          if (slice.length >= 2) {
            // Add curve white line feature
            turnCurveFeatures.push({
              type: 'Feature',
              properties: {},
              geometry: { type: 'LineString', coordinates: slice },
            });

            // Arrowhead tip at the end of the white turn curve
            const endPt = slice[slice.length - 1];
            const prevPt = slice[slice.length - 2];
            const dy = endPt[1] - prevPt[1];
            const dx = (endPt[0] - prevPt[0]) * Math.cos(((prevPt[1] + endPt[1]) * Math.PI) / 360);
            const bearing = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;

            turnTipFeatures.push({
              type: 'Feature',
              properties: { bearing },
              geometry: { type: 'Point', coordinates: endPt },
            });
          }
        }
      });
    }

    // Update GeoJSON sources for turn curves & tips
    const turnSource = map.getSource('route-turn-curves') as maplibregl.GeoJSONSource;
    if (turnSource) {
      turnSource.setData({
        type: 'FeatureCollection',
        features: turnCurveFeatures,
      });
    }

    const tipSource = map.getSource('route-turn-tips') as maplibregl.GeoJSONSource;
    if (tipSource) {
      tipSource.setData({
        type: 'FeatureCollection',
        features: turnTipFeatures,
      });
    }

    return () => {
      turnMarkersRef.current.forEach((m) => {
        try { safeRemoveMarker(m); } catch (e) {}
      });
      turnMarkersRef.current = [];
    };
  }, [jsonTurnPoints, routeGeoJson, mapReady]);

  // Generate top-right CarPlay navigation instructions
  useEffect(() => {
    if (!showInstructions || !rawRouteCoords.length || gameX == null || gameY == null) {
      setNavInstruction({ primary: null, upcoming: [] });
      return;
    }

    const inst = generateNextInstruction(
      rawRouteCoords,
      gameX,
      gameY,
      dest || destCompany || null,
      segmentLanes,
      jsonTurnPoints
    );
    setNavInstruction(inst);
  }, [showInstructions, rawRouteCoords, gameX, gameY, dest, destCompany, segmentLanes, jsonTurnPoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const remainingSource = map.getSource('route-remaining') as maplibregl.GeoJSONSource;
    if (remainingSource) {
      remainingSource.setData(routeGeoJson.remaining);
    }

    const traveledSource = map.getSource('route-traveled') as maplibregl.GeoJSONSource;
    if (traveledSource) {
      traveledSource.setData(routeGeoJson.traveled);
    }
  }, [routeGeoJson, mapReady]);

  const recenter = useCallback(() => {
    if (!mapRef.current || !lastPos.current) return;
    setFollowing(true);
    mapRef.current.flyTo({
      center: [lastPos.current[1], lastPos.current[0]],
      zoom: currentZoomRef.current,
      bearing: currentBearingRef.current,
      duration: 800,
    });
  }, []);

  const handleZoomIn = useCallback(() => {
    if (!mapRef.current) return;
    const current = mapRef.current.getZoom();
    const next = Math.min(current + 1, 12);
    currentZoomRef.current = next;
    mapRef.current.easeTo({ zoom: next, duration: 300 });
    if (onZoomChangeRef.current) {
      onZoomChangeRef.current(next);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!mapRef.current) return;
    const current = mapRef.current.getZoom();
    const next = Math.max(current - 1, 4);
    currentZoomRef.current = next;
    mapRef.current.easeTo({ zoom: next, duration: 300 });
    if (onZoomChangeRef.current) {
      onZoomChangeRef.current(next);
    }
  }, []);

  const formatDistance = (meters: number) => {
    if (!meters || isNaN(meters)) return '';
    return `${Math.round(meters / 1000)} km`;
  };

  return (
    <div
      className="game-map-widget"
      style={{ width, height, '--gm-accent': accentColor } as React.CSSProperties}
    >
      {/* Map Container */}
      <div ref={mapContainer} className="game-map-container" />

      {/* Top Right CarPlay Navigation Banner */}
      {showInstructions && navInstruction.primary && (
        <CarPlayNavOverlay
          primary={navInstruction.primary}
          upcoming={navInstruction.upcoming}
          accentColor={accentColor}
        />
      )}

      {/* Overlay: Top info bar */}
      {city && (
        <div className="gm-top-bar">
          <div className="gm-city-badge">
            <div className="gm-city-dot" />
            <span>{city}</span>
          </div>
        </div>
      )}

      {/* Map Controls Group (Zoom In, Zoom Out, Recenter) */}
      <div className="gm-controls-group" onClick={(e) => e.stopPropagation()}>
        <button
          className="gm-ctrl-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomIn();
          }}
          title="Heranzoomen (+)"
        >
          <Plus size={14} />
        </button>
        <button
          className="gm-ctrl-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleZoomOut();
          }}
          title="Herauszoomen (-)"
        >
          <Minus size={14} />
        </button>
        {!following && lastPos.current && (
          <button
            className="gm-ctrl-btn gm-recenter-active"
            onClick={(e) => {
              e.stopPropagation();
              recenter();
            }}
            title="Karte zentrieren"
          >
            <Crosshair size={14} />
          </button>
        )}
      </div>

      {/* No connection overlay */}
      {!connected && (
        <div className="gm-no-connection">
          <span>Kein Spiel erkannt</span>
        </div>
      )}

      <style>{`
        .game-map-widget {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: inherit;
          overflow: hidden !important;
          background: #0d1117;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          isolation: isolate;
        }
        .game-map-container {
          width: 100%;
          height: 100%;
          position: relative;
          z-index: 0;
          border-radius: inherit;
          overflow: hidden !important;
        }
        .game-map-container .maplibregl-canvas-container,
        .game-map-container .maplibregl-canvas {
          border-radius: inherit !important;
          overflow: hidden !important;
        }
        .game-map-container .maplibregl-canvas-container * {
          z-index: 0 !important;
        }
        .game-map-container .maplibregl-marker {
          z-index: 1 !important;
        }
        .game-map-container .maplibregl-ctrl-bottom-left,
        .game-map-container .maplibregl-ctrl-bottom-right,
        .game-map-container .maplibregl-ctrl-top-left,
        .game-map-container .maplibregl-ctrl-top-right {
          display: none !important;
        }

        /* Top info bar */
        .gm-top-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          background: linear-gradient(to bottom, rgba(13,17,23,0.9) 0%, rgba(13,17,23,0) 100%);
          pointer-events: none;
          z-index: 10;
        }
        .gm-city-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 9px;
          font-weight: 800;
          color: #cdd6e0;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .gm-city-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--gm-accent, #f59e0b);
          box-shadow: 0 0 6px var(--gm-accent, #f59e0b);
        }
        .gm-dest-badge {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: 8px;
          font-weight: 700;
          color: var(--gm-accent, #f59e0b);
          opacity: 0.8;
          margin-left: auto;
        }
        .gm-dest-dist {
          color: #8899aa;
          font-size: 7px;
        }

        /* Map Controls Group */
        .gm-controls-group {
          position: absolute;
          bottom: 8px;
          right: 8px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 4px;
          pointer-events: auto;
        }
        .gm-ctrl-btn {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          border: 1px solid rgba(245, 158, 11,0.3);
          background: rgba(13,17,23,0.85);
          backdrop-filter: blur(8px);
          color: var(--gm-accent, #f59e0b);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .gm-ctrl-btn:hover {
          background: rgba(245, 158, 11,0.2);
          border-color: var(--gm-accent, #f59e0b);
          box-shadow: 0 0 12px rgba(245, 158, 11,0.3);
        }
        .gm-recenter-active {
          background: rgba(245, 158, 11,0.25);
          border-color: var(--gm-accent, #f59e0b);
        }

        /* Player marker */
        .game-map-player-marker {
          position: relative;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* No connection overlay */
        .gm-no-connection {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(13,17,23,0.7);
          backdrop-filter: blur(4px);
          z-index: 20;
        }
        .gm-no-connection span {
          font-size: 9px;
          font-weight: 800;
          color: #556677;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
      `}</style>
    </div>
  );
});

GameMapWidget.displayName = 'GameMapWidget';

export default GameMapWidget;
