import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import * as proj4 from 'proj4';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as pmtiles from 'pmtiles';
import { Crosshair, Navigation } from 'lucide-react';
import { API_URL } from '../config';
import { findCity, findCompany } from '../data/ets2Cities';
import { CarPlayNavOverlay } from './CarPlayNavOverlay';
import { generateNextInstruction, extractTurnsFromRouteCoords, type JSONTurnPoint, type InstructionResult } from '../utils/navInstructionEngine';
import { smoothRouteCoords } from '../utils/routeSmoother';
import { getSpeedCamerasGeoJson, findApproachingSpeedcam, type SpeedcamAlertInfo } from '../data/ets2Speedcams';
import type { GameMapWidgetHandle, NearbyTrafficVehicle, NearbySemaphore } from './GameMapWidget.types';
import { detectApproachingTrafficLight, type ApproachingTrafficLight } from '../utils/trafficLightDetector';
import { TrafficLightWidget } from './TrafficLightWidget';

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
  /** Current vehicle speed in km/h */
  currentSpeed?: number;
  /** Current speed limit in km/h */
  speedLimit?: number;
  /** Exact in-game route waypoints from OPCGameBridge plugin [x, y, z] */
  routeWaypoints?: [number, number, number][] | [number, number][] | null;
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
  /** Navigation remaining time in seconds */
  navTime?: number;
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
  /** Whether the navigation overlay banner should span 100% full width */
  fullWidthInstructions?: boolean;
  /** Whether to display speed cameras (Blitzer) on the map */
  showSpeedcams?: boolean;
  /** Callback emitted when approaching a speed camera */
  onSpeedcamAlert?: (alert: SpeedcamAlertInfo | null) => void;
  /** Unique map identifier */
  mapId?: string;
  /** Callback when destination is reached */
  onDestinationReached?: () => void;
  /** Callback when route calculation completes or updates */
  onRouteCalculated?: (routeInfo: { distanceMeters: number; durationSeconds: number } | null) => void;
  /** Nearby multiplayer / AI traffic vehicles from OPCGameBridge plugin */
  nearbyVehicles?: NearbyTrafficVehicle[];
  /** Optional custom marker color for nearby vehicles (defaults to #007aff matching player marker) */
  nearbyVehicleColor?: string;
  /** Nearby semaphores / traffic lights from telemetry */
  semaphores?: NearbySemaphore[];
  /** Callback emitted when approaching a traffic light (<= 150m) */
  onApproachingTrafficLightChange?: (light: ApproachingTrafficLight | null) => void;
  /** Optional manual top padding override for camera following */
  followPaddingTop?: number;
}

// --- ETS2 coordinate → lat/lng projection (Lambert Conformal Conic) ---
const earthRadiusMeters = 6_370_997;
const lengthOfDegree = (earthRadiusMeters * Math.PI) / 180;

const createTurnArrowheadImage = (map: maplibregl.Map) => {
  if (map.hasImage('turn-arrowhead-icon')) return;

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

const createSpeedcamImage = (map: maplibregl.Map) => {
  if (map.hasImage('speedcam_ico')) return;

  const s = 2;
  const size = 48 * s; // 96x96
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    // High-visibility Crimson/Rose Red Warning Badge with subtle drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6 * s;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2) - (4 * s), 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48'; // crimson red
    ctx.fill();
    ctx.lineWidth = 3 * s;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Pillar stand
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(22 * s, 34 * s, 4 * s, 5 * s, 1 * s);
    ctx.fill();

    // Main camera body
    ctx.beginPath();
    ctx.roundRect(14 * s, 17 * s, 20 * s, 17 * s, 3 * s);
    ctx.fill();

    // Primary Lens (Crimson cutout)
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(21 * s, 25.5 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Lens Reflection (White dot)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(21 * s, 25.5 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Flash sensor (Yellow / Amber)
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(28 * s, 20 * s, 4 * s, 4 * s, 1 * s);
    ctx.fill();

    // Lower sensor
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.roundRect(28 * s, 26 * s, 4 * s, 4 * s, 1 * s);
    ctx.fill();

    // Radar Emission Waves (Top-Left)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5 * s;
    ctx.beginPath();
    ctx.arc(13 * s, 13 * s, 4.5 * s, 1.1 * Math.PI, 1.6 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(13 * s, 13 * s, 7.5 * s, 1.1 * Math.PI, 1.6 * Math.PI);
    ctx.stroke();
  }

  const imgData = ctx?.getImageData(0, 0, size, size);
  if (imgData) {
    map.addImage('speedcam_ico', imgData, { pixelRatio: s });
  }
};

const createRailcrossingImage = (map: maplibregl.Map) => {
  if (map.hasImage('railcrossing')) return;

  const s = 2;
  const size = 48 * s; // 96x96
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    const w = 6.5 * s;

    // 1. Subtle drop shadow
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.lineWidth = w + (2 * s);
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(8 * s, 10 * s); ctx.lineTo(40 * s, 42 * s);
    ctx.moveTo(40 * s, 10 * s); ctx.lineTo(8 * s, 42 * s);
    ctx.stroke();

    // 2. Dark outline for crisp contrast on map
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = w + (1.2 * s);
    ctx.beginPath();
    ctx.moveTo(7 * s, 7 * s); ctx.lineTo(41 * s, 41 * s);
    ctx.moveTo(41 * s, 7 * s); ctx.lineTo(7 * s, 41 * s);
    ctx.stroke();

    // 3. Main pure white beams
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(7 * s, 7 * s); ctx.lineTo(41 * s, 41 * s);
    ctx.moveTo(41 * s, 7 * s); ctx.lineTo(7 * s, 41 * s);
    ctx.stroke();

    // 4. Characteristic Signal Red Tips (4 ends)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(7 * s, 7 * s); ctx.lineTo(14 * s, 14 * s);
    ctx.moveTo(34 * s, 34 * s); ctx.lineTo(41 * s, 41 * s);
    ctx.moveTo(41 * s, 7 * s); ctx.lineTo(34 * s, 14 * s);
    ctx.moveTo(14 * s, 34 * s); ctx.lineTo(7 * s, 41 * s);
    ctx.stroke();

    // 5. Clean white center square
    ctx.fillStyle = '#ffffff';
    ctx.fillRect((size / 2) - (w / 2), (size / 2) - (w / 2), w, w);

    const imgData = ctx.getImageData(0, 0, size, size);
    map.addImage('railcrossing', imgData, { pixelRatio: s });
  }
};

const createNearbyVehiclesImages = (map: maplibregl.Map, color: string = '#007aff') => {
  const s = 2; // High-DPI Retina scaling

  if (map.hasImage('nearby_truck_ico')) {
    try { map.removeImage('nearby_truck_ico'); } catch {}
  }

  // High-visibility, prominent navigation marker for nearby multiplayer / traffic vehicles (matches player marker color #007aff)
  const size = 48 * s; // 96x96 px Retina canvas (48x48 logical)
  const cx = size / 2;
  const cy = size / 2 + 2 * s;
  const r = 11 * s; // ~22px logical diameter

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    // Deep drop shadow + subtle glow matching player marker
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 5 * s;
    ctx.shadowOffsetY = 2 * s;

    // High-contrast outer silhouette (combines circular base + prominent directional arrow pip)
    ctx.beginPath();
    ctx.moveTo(cx, cy - r - 6.5 * s);
    ctx.lineTo(cx + 6.5 * s, cy - r + 1.8 * s);
    ctx.arc(cx, cy, r + 0.8 * s, -0.3 * Math.PI, 1.3 * Math.PI, false);
    ctx.lineTo(cx - 6.5 * s, cy - r + 1.8 * s);
    ctx.closePath();
    ctx.fillStyle = '#05070f';
    ctx.fill();

    // Disable shadow for crisp interior strokes
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Crisp white separation ring for contrast against any road / terrain
    ctx.lineWidth = 1.8 * s;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.stroke();

    // Solid CarPlay marker color fill (same color as player marker: #007aff)
    const innerR = r - 2 * s;
    ctx.beginPath();
    ctx.moveTo(cx, cy - innerR - 5 * s);
    ctx.lineTo(cx + 4.8 * s, cy - innerR + 1.5 * s);
    ctx.arc(cx, cy, innerR, -0.3 * Math.PI, 1.3 * Math.PI, false);
    ctx.lineTo(cx - 4.8 * s, cy - innerR + 1.5 * s);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Crisp white central core dot
    ctx.beginPath();
    ctx.arc(cx, cy, 3 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Inner crisp white directional pointer line inside the arrow tip
    ctx.beginPath();
    ctx.moveTo(cx, cy - innerR - 3.5 * s);
    ctx.lineTo(cx, cy - 1.2 * s);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 1.8 * s;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const imgData = ctx?.getImageData(0, 0, size, size);
  if (imgData) {
    map.addImage('nearby_truck_ico', imgData, { pixelRatio: s });
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
    sprite: `${tileRoot}/sprites`,
    sources: {
      ets2: {
        type: 'vector',
        url: `pmtiles://${tileRoot}/ets2.pmtiles`,
      },
      world: {
        type: 'vector',
        url: `pmtiles://${tileRoot}/world.pmtiles`,
      },
      terrain: {
        type: 'raster-dem',
        url: `pmtiles://${tileRoot}/ets2-terrain.pmtiles`,
        tileSize: 256,
        encoding: 'mapbox',
      },
      contours: {
        type: 'vector',
        url: `pmtiles://${tileRoot}/ets2-contours.pmtiles`,
      },
      footprints: {
        type: 'vector',
        url: `pmtiles://${tileRoot}/ets2-footprints.pmtiles`,
      },
    },
    terrain: {
      source: 'terrain',
      exaggeration: 2.2,
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
        id: 'world-land',
        type: 'fill',
        source: 'world',
        'source-layer': 'land',
        paint: {
          'fill-color': '#08101a',
        },
      },
      {
        id: 'contours-lines',
        type: 'line',
        source: 'contours',
        'source-layer': 'contours',
        minzoom: 6.5,
        filter: ['==', ['%', ['get', 'elevation'], 50], 0],
        paint: {
          'line-color': '#475569',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            6.5, 0.4,
            9, 0.7,
            13, 1.0,
          ],
          'line-opacity': [
            'interpolate', ['linear'], ['zoom'],
            6.5, 0.15,
            8, 0.28,
            12, 0.4,
          ],
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
        minzoom: 8.5,
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
        minzoom: 8.5,
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
        layout: { 'line-cap': 'round', 'line-join': 'bevel' },
        paint: {
          'line-color': [
            'match', ['get', 'roadType'],
            'freeway', '#1d4ed8',
            'divided', '#334155',
            'local', '#1e293b',
            'train', '#0f172a',
            '#1e293b',
          ],
          'line-gap-width': [
            'interpolate',
            ['exponential', 1.4],
            ['zoom'],
            3, 1.5,
            7, 5.0,
            10, 16.0,
            12, 32.0,
            14, 52.0,
            16, 220.0,
          ],
          'line-width': [
            'interpolate',
            ['exponential', 1.4],
            ['zoom'],
            8, 1.5,
            11, 2.5,
            14, 4.0,
            16, 6.0,
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
        layout: { 'line-cap': 'round', 'line-join': 'bevel' },
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
            'interpolate',
            ['exponential', 1.4],
            ['zoom'],
            3, 1.5,
            7, 5.0,
            10, 16.0,
            12, 32.0,
            14, 52.0,
            16, 220.0,
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
            8, 0.65,
            11, 1.0,
            14, 1.4
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
            9, 0.6,
            12, 0.95,
            15, 1.35
          ]
        }
      },
      // Traffic Features (Ampeln / Traffic Lights, Baustellen, Bahnübergänge)
      {
        id: 'ets2-traffic',
        type: 'symbol',
        source: 'ets2',
        'source-layer': 'ets2',
        minzoom: 10,
        filter: [
          'all',
          ['==', ['geometry-type'], 'Point'],
          ['==', ['get', 'type'], 'traffic']
        ],
        layout: {
          'icon-image': '{sprite}',
          'icon-allow-overlap': false,
          'icon-ignore-placement': false,
          'symbol-sort-key': [
            'match', ['get', 'sprite'],
            'railcrossing', 1,
            'roadwork', 2,
            'trafficlight', 3,
            10
          ],
          'icon-padding': 2,
          'icon-size': [
            'interpolate', ['linear'], ['zoom'],
            10, 0.55,
            12, 0.85,
            14, 1.2
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

/**
 * Calculates the exact forward geographic bearing (degrees CW from North) for ETS2 telemetry.
 * Uses a forward-projected lookAt vector in Lambert Conformal Conic space, exactly like TruckersMudgeon.
 * This compensates for the meridian convergence angle between ETS2 game coordinates and WGS84/Web Mercator,
 * ensuring the map heading aligns 100% with the road without the "paar Grad" tilt.
 */
function computeExactBearing(effX: number, effY: number, rawHeading: number, pos: [number, number]): number {
  const theta = (0.5 - rawHeading) * Math.PI * 2 + Math.PI / 2;
  const lookAtGameX = effX + 1000 * Math.cos(theta);
  const lookAtGameY = effY + 1000 * Math.sin(theta);
  const lookAt = projectGameToLatLng(lookAtGameX, lookAtGameY);
  if (!lookAt) {
    return normalizeBearing(-rawHeading * 360);
  }
  const [lat1, lon1] = pos;
  const [lat2, lon2] = lookAt;
  const rad = Math.PI / 180;
  const phi1 = lat1 * rad;
  const phi2 = lat2 * rad;
  const dLon = (lon2 - lon1) * rad;
  const y = Math.sin(dLon) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLon);
  return normalizeBearing(Math.atan2(y, x) * (180 / Math.PI));
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

function areInstructionsEqual(a: InstructionResult, b: InstructionResult): boolean {
  if (a === b) return true;
  if (!a.primary && !b.primary) return true;
  if (!a.primary || !b.primary) return false;
  const pa = a.primary;
  const pb = b.primary;
  if (
    pa.actionText !== pb.actionText ||
    pa.distanceText !== pb.distanceText ||
    pa.subText !== pb.subText ||
    pa.type !== pb.type ||
    pa.direction !== pb.direction ||
    pa.roundaboutExit !== pb.roundaboutExit
  ) {
    return false;
  }
  if (pa.lanes.length !== pb.lanes.length) return false;
  for (let i = 0; i < pa.lanes.length; i++) {
    if (pa.lanes[i].type !== pb.lanes[i].type || pa.lanes[i].active !== pb.lanes[i].active) return false;
  }
  if (a.upcoming.length !== b.upcoming.length) return false;
  for (let i = 0; i < a.upcoming.length; i++) {
    if (a.upcoming[i].dir !== b.upcoming[i].dir || a.upcoming[i].distText !== b.upcoming[i].distText) return false;
  }
  return true;
}

const GameMapWidget = forwardRef<GameMapWidgetHandle, GameMapWidgetProps>(({
  gameX, gameY, heading, currentSpeed, speedLimit, routeWaypoints, source, dest, destCompany, city,
  navDistance, connected, accentColor = '#f59e0b', themeMode = 'dark',
  width = 300, height = 200, zoom, initialZoom = 9, onZoomChange,
  showInstructions = false, fullWidthInstructions = false,
  showSpeedcams = true, onSpeedcamAlert,
  mapId, onDestinationReached, onRouteCalculated,
  nearbyVehicles, nearbyVehicleColor = '#007aff',
  semaphores,
  onApproachingTrafficLightChange,
  followPaddingTop
}, ref) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerEl = useRef<HTMLDivElement | null>(null);
  const markerInnerEl = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const turnMarkersRef = useRef<maplibregl.Marker[]>([]);
  const lastReportedLightRef = useRef<ApproachingTrafficLight | null>(null);
  const lastNearbyCountRef = useRef<number>(0);
  const lastRoadQueryTimeRef = useRef<number>(0);
  const lastRoadQueryPosRef = useRef<[number, number] | null>(null);
  const cachedRoadTypeRef = useRef<'freeway' | 'divided' | 'local' | 'unknown'>('unknown');
  const lastCameraPaddingTopRef = useRef<number>(-1);
  const [following, setFollowing] = useState(true);
  const isFollowingRef = useRef<boolean>(true);
  isFollowingRef.current = following;
  const [mapReady, setMapReady] = useState(false);
  const lastPos = useRef<[number, number] | null>(null);

  const onZoomChangeRef = useRef(onZoomChange);
  onZoomChangeRef.current = onZoomChange;
  const onSpeedcamAlertRef = useRef(onSpeedcamAlert);
  onSpeedcamAlertRef.current = onSpeedcamAlert;
  const onApproachingTrafficLightChangeRef = useRef(onApproachingTrafficLightChange);
  onApproachingTrafficLightChangeRef.current = onApproachingTrafficLightChange;

  const [jsonTurnPoints, setJsonTurnPoints] = useState<JSONTurnPoint[]>([]);
  const [segmentLanes, setSegmentLanes] = useState<number[]>([]);
  const [rawRouteCoords, setRawRouteCoords] = useState<[number, number][]>([]);
  const [navInstruction, setNavInstruction] = useState<InstructionResult>({ primary: null, upcoming: [] });
  const navInstructionRef = useRef<InstructionResult>(navInstruction);
  navInstructionRef.current = navInstruction;
  const showInstructionsRef = useRef(showInstructions);
  showInstructionsRef.current = showInstructions;
  const fullWidthInstructionsRef = useRef(fullWidthInstructions);
  fullWidthInstructionsRef.current = fullWidthInstructions;
  const followPaddingTopRef = useRef(followPaddingTop);
  followPaddingTopRef.current = followPaddingTop;

  // Dynamic zoom state tracked in ref to avoid telemetry zoom resets
  const currentZoomRef = useRef<number>(zoom ?? initialZoom);
  const targetZoomRef = useRef<number>(zoom ?? initialZoom);
  const lastRouteKeyRef = useRef<string>('');
  const lastDirectWaypointsHashRef = useRef<string>('');
  const lastRouteCalcPosRef = useRef<{ x: number; y: number } | null>(null);
  const headingRef = useRef<number | undefined>(heading);
  headingRef.current = heading;
  const gameXRef = useRef<number | undefined>(gameX);
  const gameYRef = useRef<number | undefined>(gameY);
  gameXRef.current = gameX;
  gameYRef.current = gameY;

  // Target and interpolated position/bearing for smooth 60 FPS driving
  const targetPosRef = useRef<[number, number]>([50.95, 1.85]);
  const targetBearingRef = useRef<number>(0);
  const currentPosRef = useRef<[number, number]>([50.95, 1.85]);
  const currentBearingRef = useRef<number>(0);
  const hasInitializedPosRef = useRef<boolean>(false);
  const lastRawHeading = useRef<number | null>(null);
  const prevTargetPosRef = useRef<[number, number] | null>(null);
  const lastTargetTimeRef = useRef<number>(performance.now());
  const targetVelocityRef = useRef<[number, number]>([0, 0]);

  const [routeCalcTrigger, setRouteCalcTrigger] = useState(0);

  // Controlled zoom prop synchronization - update target immediately with 0ms delay
  useEffect(() => {
    if (zoom !== undefined) {
      targetZoomRef.current = Math.min(Math.max(zoom, 4), 13);
    }
  }, [zoom]);

  const [routeGeoJson, setRouteGeoJson] = useState<{
    traveled: GeoJSON.FeatureCollection;
    remaining: GeoJSON.FeatureCollection;
  }>({
    traveled: { type: 'FeatureCollection', features: [] },
    remaining: { type: 'FeatureCollection', features: [] },
  });

  const fullRemainingCoordsRef = useRef<[number, number][]>([]);
  const rawRouteCoordsRef = useRef<[number, number][]>([]);
  const lastRouteSliceTimeRef = useRef<number>(0);
  const lastRouteSlicePosRef = useRef<[number, number] | null>(null);
  const consecutiveOffRouteCountRef = useRef<number>(0);

  // Dynamic route progress slicing: slices remaining route from current vehicle position forward,
  // and marks traversed path as traveled without altering raw road curvature geometry.
  const sliceRouteProgress = useCallback((effX: number, effY: number) => {
    const map = mapRef.current;
    if (!map) return;

    const fullRemaining = fullRemainingCoordsRef.current;
    if (fullRemaining.length < 2) return;

    const now = performance.now();
    if (now - lastRouteSliceTimeRef.current < 180) return; // 5.5 Hz max throttling

    if (lastRouteSlicePosRef.current) {
      const dPos = Math.hypot(effX - lastRouteSlicePosRef.current[0], effY - lastRouteSlicePosRef.current[1]);
      if (dPos < 2.5) return; // Only re-slice after 2.5 meters moved
    }

    lastRouteSliceTimeRef.current = now;
    lastRouteSlicePosRef.current = [effX, effY];

    const pos = lastPos.current;
    if (!pos) return;
    const curLat = pos[0];
    const curLng = pos[1];

    // Find closest segment directly on fullRemaining [lng, lat]
    let minDistanceSq = Infinity;
    let bestSegmentIndex = 0;
    let bestProjLngLat: [number, number] = fullRemaining[0];

    for (let i = 0; i < fullRemaining.length - 1; i++) {
      const ax = fullRemaining[i][0];
      const ay = fullRemaining[i][1];
      const bx = fullRemaining[i + 1][0];
      const by = fullRemaining[i + 1][1];

      const dx = bx - ax;
      const dy = by - ay;
      const lenSq = dx * dx + dy * dy;

      let t = 0;
      if (lenSq > 1e-12) {
        t = Math.max(0, Math.min(1, ((curLng - ax) * dx + (curLat - ay) * dy) / lenSq));
      }

      const projX = ax + t * dx;
      const projY = ay + t * dy;
      // Convert degree diff to approximate meters
      const dLngMeters = (curLng - projX) * 111320 * Math.cos(curLat * Math.PI / 180);
      const dLatMeters = (curLat - projY) * 110540;
      const distSq = dLngMeters * dLngMeters + dLatMeters * dLatMeters;

      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        bestSegmentIndex = i;
        bestProjLngLat = [projX, projY];
      }
    }

    // If vehicle is > 250m away from planned route, trigger off-route recalculation
    if (Math.sqrt(minDistanceSq) > 250) {
      consecutiveOffRouteCountRef.current++;
      if (consecutiveOffRouteCountRef.current > 15) {
        consecutiveOffRouteCountRef.current = 0;
        lastRouteKeyRef.current = '';
        setRouteCalcTrigger((prev) => prev + 1);
      }
      return;
    }
    consecutiveOffRouteCountRef.current = 0;

    // Slice remaining coordinates: begins directly at projected vehicle point
    const remainingSliced: [number, number][] = [
      bestProjLngLat,
      ...fullRemaining.slice(bestSegmentIndex + 1),
    ];

    // Slice traveled coordinates: from origin up to projected vehicle point
    const traveledSliced: [number, number][] = [
      ...fullRemaining.slice(0, bestSegmentIndex + 1),
      bestProjLngLat,
    ];

    // Update MapLibre sources directly for instant 60 FPS performance without React re-renders
    const remSource = map.getSource('route-remaining') as maplibregl.GeoJSONSource;
    if (remSource && remSource.setData) {
      remSource.setData({
        type: 'FeatureCollection',
        features: remainingSliced.length >= 2 ? [{
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: remainingSliced },
        }] : [],
      });
    }

    const travSource = map.getSource('route-traveled') as maplibregl.GeoJSONSource;
    if (travSource && travSource.setData) {
      travSource.setData({
        type: 'FeatureCollection',
        features: traveledSliced.length >= 2 ? [{
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: traveledSliced },
        }] : [],
      });
    }
  }, []);

  // Expose imperative ref methods
  useImperativeHandle(ref, () => ({
    zoomIn: () => {
      const next = Math.min(Math.round(targetZoomRef.current + 1), 13);
      targetZoomRef.current = next;
      if (onZoomChangeRef.current) {
        onZoomChangeRef.current(next);
      }
    },
    zoomOut: () => {
      const next = Math.max(Math.round(targetZoomRef.current - 1), 4);
      targetZoomRef.current = next;
      if (onZoomChangeRef.current) {
        onZoomChangeRef.current(next);
      }
    },
    recenter: () => {
      if (!mapRef.current || !lastPos.current) return;
      setFollowing(true);
      const topOffset = followPaddingTopRef.current !== undefined
        ? followPaddingTopRef.current
        : ((showInstructionsRef.current && navInstructionRef.current.primary) ? (fullWidthInstructionsRef.current ? 140 : 150) : 0);
      mapRef.current.flyTo({
        center: [lastPos.current[1], lastPos.current[0]],
        zoom: currentZoomRef.current,
        bearing: currentBearingRef.current,
        duration: 800,
        padding: { top: topOffset, bottom: 0, left: 0, right: 0 },
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
      lastRouteKeyRef.current = '';
      lastRouteCalcPosRef.current = null;
      fullRemainingCoordsRef.current = [];
      rawRouteCoordsRef.current = [];
      setRawRouteCoords([]);
      setJsonTurnPoints([]);
      setSegmentLanes([]);
      setNavInstruction({ primary: null, upcoming: [] });
      setRouteGeoJson({
        traveled: { type: 'FeatureCollection', features: [] },
        remaining: { type: 'FeatureCollection', features: [] },
      });
      onRouteCalculated?.(null);
    },
    focusDestination: (lng: number, lat: number) => {
      if (!mapRef.current) return;
      setFollowing(false);
      currentZoomRef.current = 12;
      mapRef.current.flyTo({ center: [lng, lat], zoom: 12, duration: 1000 });
    },
    focusDestinationByGameCoords: (gx: number, gz: number) => {
      const pos = projectGameToLatLng(gx, gz);
      if (!pos || !mapRef.current) return;
      setFollowing(false);
      currentZoomRef.current = 12;
      mapRef.current.flyTo({ center: [pos[1], pos[0]], zoom: 12, duration: 1000 });
    },
    setView: (lng: number, lat: number, zoom: number, bearing?: number) => {
      if (!mapRef.current) return;
      currentZoomRef.current = zoom;
      if (bearing != null) {
        currentBearingRef.current = bearing;
        targetBearingRef.current = bearing;
      }
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
      center: [1.85, 50.95],
      zoom: currentZoomRef.current,
      minZoom: 4,
      maxZoom: 13,
      bearing: 0,
      pitch: 60,
      attributionControl: false,
      interactive: true,
      dragRotate: true,
      pitchWithRotate: false,
      touchZoomRotate: true,
      doubleClickZoom: true,
      maxTileCacheSize: 15,
      fadeDuration: 0,
      collectResourceTiming: false,
      renderWorldCopies: false,
    });
    map.setMinZoom(4);
    map.setMaxZoom(13);

    map.on('load', () => {
      try {
        createArrowImage(map);
        createTurnArrowheadImage(map);
        createSpeedcamImage(map);
        createRailcrossingImage(map);
        createNearbyVehiclesImages(map, nearbyVehicleColor);

        // Register nearby vehicles (TruckersMP / Traffic) source & layer
        if (!map.getSource('nearby-vehicles-source')) {
          map.addSource('nearby-vehicles-source', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'nearby-vehicles-layer',
            type: 'symbol',
            source: 'nearby-vehicles-source',
            minzoom: 4.5,
            layout: {
              'icon-image': ['get', 'icon'],
              'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                4.5, 0.75,
                7, 1.05,
                9, 1.35,
                11, 1.65,
                13, 1.9,
              ],
              'icon-rotate': ['get', 'bearing'],
              'icon-rotation-alignment': 'map',
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });
        }

        // Register speed cameras source & symbol layer
        if (!map.getSource('speedcams-source')) {
          map.addSource('speedcams-source', {
            type: 'geojson',
            data: getSpeedCamerasGeoJson(),
          });

          map.addLayer({
            id: 'ets2-speedcams',
            type: 'symbol',
            source: 'speedcams-source',
            minzoom: 6.5,
            layout: {
              'icon-image': 'speedcam_ico',
              'icon-size': [
                'interpolate', ['linear'], ['zoom'],
                6.5, 0.45,
                9, 0.75,
                12, 1.05,
              ],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
            },
          });

          // Speed camera speed limit badge text (zoom >= 8.5)
          map.addLayer({
            id: 'ets2-speedcams-limit',
            type: 'symbol',
            source: 'speedcams-source',
            minzoom: 8.5,
            layout: {
              'text-field': ['concat', ['get', 'speedLimit']],
              'text-font': ['Open Sans Bold'],
              'text-size': [
                'interpolate', ['linear'], ['zoom'],
                8.5, 9,
                11, 11,
                13, 13,
              ],
              'text-offset': [0, 1.3],
              'text-anchor': 'top',
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': '#ffffff',
              'text-halo-color': '#e11d48',
              'text-halo-width': 2.5,
              'text-halo-blur': 0.5,
            },
          });
        }

        map.setTerrain({ source: 'terrain', exaggeration: 2.2 });
      } catch (err) {
        console.debug("Terrain load notice:", err);
      }
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
      targetBearingRef.current = map.getBearing();
    });

    // Track user-initiated zoom actions (mouse wheel, gestures) to update targetZoomRef and notify parent
    const handleZoomEvent = (e: any) => {
      if (mapRef.current && e?.originalEvent) {
        const newZoom = Math.round(mapRef.current.getZoom() * 10) / 10;
        targetZoomRef.current = newZoom;
        currentZoomRef.current = newZoom;
        if (onZoomChangeRef.current) {
          onZoomChangeRef.current(newZoom);
        }
      }
    };

    map.on('zoomend', handleZoomEvent);

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

  // Toggle speed camera layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const vis = showSpeedcams !== false ? 'visible' : 'none';
    if (map.getLayer('ets2-speedcams')) {
      map.setLayoutProperty('ets2-speedcams', 'visibility', vis);
    }
    if (map.getLayer('ets2-speedcams-limit')) {
      map.setLayoutProperty('ets2-speedcams-limit', 'visibility', vis);
    }
  }, [showSpeedcams, mapReady]);

  // Main telemetry position & rotation update loop (Updates targets + Proximity alerts)
  useEffect(() => {
    // Determine effective game coordinates
    let effX = gameX;
    let effY = gameY;

    // Check if telemetry position is missing, null, or zero (e.g. game disconnected or telemetry initializing)
    const isTelemPosValid = effX != null && effY != null && (effX !== 0 || effY !== 0);

    if (!isTelemPosValid) {
      if (destCompany && dest) {
        const comp = findCompany(destCompany, dest);
        if (comp) { effX = comp.x; effY = comp.z; }
      }
      if ((effX == null || effX === 0) && dest) {
        const c = findCity(dest);
        if (c) { effX = c.x; effY = c.z; }
      }
      if ((effX == null || effX === 0) && source) {
        const c = findCity(source);
        if (c) { effX = c.x; effY = c.z; }
      }
      if ((effX == null || effX === 0) && city) {
        const c = findCity(city);
        if (c) { effX = c.x; effY = c.z; }
      }
      if (effX == null || effX === 0) {
        // Fallback: Calais game coordinates (x: -31100, z: -5500 -> lat: 50.95, lng: 1.85)
        effX = -31100;
        effY = -5500;
      }
    }

    const pos = projectGameToLatLng(effX, effY) || lastPos.current || [50.95, 1.85];
    if (!pos) return;

    lastPos.current = pos;

    const nowTarget = performance.now();
    const dtTarget = (nowTarget - lastTargetTimeRef.current) / 1000;
    lastTargetTimeRef.current = nowTarget;

    if (dtTarget > 0.005 && dtTarget < 0.25 && prevTargetPosRef.current) {
      const vLat = (pos[0] - prevTargetPosRef.current[0]) / dtTarget;
      const vLng = (pos[1] - prevTargetPosRef.current[1]) / dtTarget;
      const speedMag = Math.hypot(vLat, vLng);
      // Valid vehicle movement: smooth out velocity vector (prevents discrete position jumps)
      if (speedMag < 0.005) {
        targetVelocityRef.current = [
          targetVelocityRef.current[0] * 0.3 + vLat * 0.7,
          targetVelocityRef.current[1] * 0.3 + vLng * 0.7,
        ];
      }
    }
    prevTargetPosRef.current = pos;
    targetPosRef.current = pos;

    if (!hasInitializedPosRef.current) {
      currentPosRef.current = pos;
      hasInitializedPosRef.current = true;
    }

    const rawHeading = heading ?? lastRawHeading.current ?? 0;
    if (heading != null) lastRawHeading.current = heading;

    // Convert SCS SDK heading to true WGS84 geographic bearing via forward-projected lookAt vector
    // (Corrects Lambert Conformal Conic meridian convergence angle so map aligns 100% with road)
    const desiredBearing = computeExactBearing(effX, effY, rawHeading, pos);
    targetBearingRef.current = desiredBearing;

    if (!hasInitializedPosRef.current) {
      currentBearingRef.current = desiredBearing;
    }

    // Speedcam Proximity Detection
    if (showSpeedcams !== false && pos) {
      const alert = findApproachingSpeedcam(pos[0], pos[1], currentSpeed ?? 0, 750, desiredBearing);
      onSpeedcamAlertRef.current?.(alert);
    }

    // Dynamic route progress slicing: update traveled vs remaining path as vehicle drives forward
    sliceRouteProgress(effX, effY);

    // Traffic Light (Ampel) Ahead Detection: only active when <= 100m in front of vehicle
    const activeLight = detectApproachingTrafficLight(
      semaphores,
      effX,
      effY,
      heading,
      desiredBearing,
      100
    );
    const prevLight = lastReportedLightRef.current;
    const hasLightChanged =
      (!prevLight && !!activeLight) ||
      (!!prevLight && !activeLight) ||
      (!!prevLight && !!activeLight && (
        prevLight.id !== activeLight.id ||
        prevLight.state !== activeLight.state ||
        prevLight.distance !== activeLight.distance ||
        prevLight.timeRemaining !== activeLight.timeRemaining
      ));
    if (hasLightChanged) {
      lastReportedLightRef.current = activeLight;
      onApproachingTrafficLightChangeRef.current?.(activeLight);
    }
  }, [gameX, gameY, heading, currentSpeed, showSpeedcams, dest, destCompany, source, city, semaphores]);



  // High Performance 60 FPS requestAnimationFrame Smooth Driving Camera & Marker Loop
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    let animFrameId: number;
    let lastFrameTime = performance.now();

    const renderLoop = (now: number) => {
      const dt = Math.min((now - lastFrameTime) / 1000, 0.1); // clamp delta time
      lastFrameTime = now;

      const map = mapRef.current;
      if (map) {
        const targetPos = targetPosRef.current;
        const curPos = currentPosRef.current;
        const vel = targetVelocityRef.current;
        const timeSinceTarget = (now - lastTargetTimeRef.current) / 1000;

        // Smooth Dead Reckoning: extrapolate vehicle position forward along velocity vector between telemetry updates (capped at 60ms)
        const extrapTime = Math.min(timeSinceTarget, 0.06);
        const predictedLat = targetPos[0] + vel[0] * extrapTime;
        const predictedLng = targetPos[1] + vel[1] * extrapTime;

        // High-frequency convergence: camera glides seamlessly without stuttering or rubber-banding
        const posDecay = 24.0;
        const posAlpha = 1 - Math.exp(-posDecay * dt);

        const newLat = curPos[0] + (predictedLat - curPos[0]) * posAlpha;
        const newLng = curPos[1] + (predictedLng - curPos[1]) * posAlpha;
        currentPosRef.current = [newLat, newLng];

        // Smooth bearing interpolation (shortest angle delta)
        const bearingDecay = 20.0;
        const bearingAlpha = 1 - Math.exp(-bearingDecay * dt);
        const targetBearing = targetBearingRef.current;
        const curBearing = currentBearingRef.current;

        const deltaBearing = shortestAngleDelta(curBearing, targetBearing);
        const newBearing = normalizeBearing(curBearing + deltaBearing * bearingAlpha);
        currentBearingRef.current = newBearing;

        // Player marker setup & smooth update without DOM recreation (Solid Apple CarPlay Blue Navigation Chevron)
        if (!markerEl.current) {
          const el = document.createElement('div');
          el.className = 'game-map-player-marker';
          el.style.cssText = 'width:64px;height:64px;position:relative;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:999999;';
          const inner = document.createElement('div');
          inner.style.cssText = 'display:flex;align-items:center;justify-content:center;transform-origin:center center;filter:drop-shadow(0 2px 8px rgba(0,122,255,0.85)) drop-shadow(0 4px 14px rgba(0,0,0,0.9));will-change:transform;';
          inner.innerHTML = `
            <svg width="58" height="72" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Outer Dark Contour border for crisp contrast on light & dark road surfaces -->
              <path d="M14 2L2.5 32.5L14 25.5L25.5 32.5L14 2Z" fill="#070b19" stroke="#070b19" stroke-width="2.5" stroke-linejoin="round"/>
              <!-- Solid monochrome Apple CarPlay blue navigation chevron -->
              <path d="M14 3.2L4.0 31.6L14 25.4L24.0 31.6L14 3.2Z" fill="#007aff"/>
            </svg>
          `;
          el.appendChild(inner);
          markerEl.current = el;
          markerInnerEl.current = inner;
        }

        const mapBearing = map.getBearing();
        const isFollow = isFollowingRef.current;
        // When following the truck, the map rotates with the vehicle so the arrow points straight forward (0 deg).
        // Only in free-cam mode does the arrow rotate relative to the free map bearing.
        const arrowRotation = isFollow ? 0 : (newBearing - mapBearing);
        if (markerInnerEl.current) {
          markerInnerEl.current.style.transform = `perspective(600px) rotateX(60deg) rotate(${arrowRotation}deg)`;
        }

        if (!markerRef.current) {
          markerRef.current = new maplibregl.Marker({
            element: markerEl.current,
          })
            .setLngLat([newLng, newLat])
            .addTo(map);
        } else {
          markerRef.current.setLngLat([newLng, newLat]);
        }

        // Smooth high-frequency zoom convergence (zero delay, perfectly smooth 60 FPS transition)
        const zoomDecay = 18.0;
        const zoomAlpha = 1 - Math.exp(-zoomDecay * dt);
        if (Math.abs(targetZoomRef.current - currentZoomRef.current) > 0.005) {
          currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * zoomAlpha;
        } else {
          currentZoomRef.current = targetZoomRef.current;
        }

        // Camera follow
        if (isFollow) {
          const topOffset = followPaddingTopRef.current !== undefined
            ? followPaddingTopRef.current
            : ((showInstructionsRef.current && navInstructionRef.current.primary) ? (fullWidthInstructionsRef.current ? 140 : 150) : 0);

          const isPosMoving = Math.abs(predictedLat - curPos[0]) > 1e-6 || Math.abs(predictedLng - curPos[1]) > 1e-6;
          const isBearingRotating = Math.abs(deltaBearing) > 0.04;
          const isZoomChanging = Math.abs(targetZoomRef.current - currentZoomRef.current) > 0.005;
          const isPaddingChanging = lastCameraPaddingTopRef.current !== topOffset;

          if (isPosMoving || isBearingRotating || isZoomChanging || isPaddingChanging) {
            lastCameraPaddingTopRef.current = topOffset;
            map.jumpTo({
              center: [newLng, newLat],
              bearing: newBearing,
              zoom: currentZoomRef.current,
              pitch: 60,
              padding: { top: topOffset, bottom: 0, left: 0, right: 0 },
            });
          }
        } else if (Math.abs(targetZoomRef.current - currentZoomRef.current) > 0.005) {
          map.setZoom(currentZoomRef.current);
        }
      }

      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animFrameId);
  }, [mapReady]);

  // Auto max-zoom to 12 when destination company prop becomes active
  const lastDestCompanyRef = useRef<string | undefined>(destCompany);
  useEffect(() => {
    if (destCompany && destCompany !== lastDestCompanyRef.current) {
      lastDestCompanyRef.current = destCompany;
      currentZoomRef.current = 12;
      if (mapRef.current && mapReady) {
        mapRef.current.easeTo({ zoom: 12, duration: 500 });
      }
    }
  }, [destCompany, mapReady]);

  // Accurate Road Route calculation logic - uses live in-game waypoints from plugin or calculates via road network
  useEffect(() => {
    let canceled = false;

    const calculateRoute = async () => {
      // 1. Direct In-Game Route Waypoints from OPCGameBridge Plugin
      if (Array.isArray(routeWaypoints) && routeWaypoints.length >= 2) {
        const first = routeWaypoints[0];
        const last = routeWaypoints[routeWaypoints.length - 1];
        const hash = `${routeWaypoints.length}_${first[0]?.toFixed(1)}_${(first[2] ?? first[1])?.toFixed(1)}_${last[0]?.toFixed(1)}_${(last[2] ?? last[1])?.toFixed(1)}`;
        if (hash === lastDirectWaypointsHashRef.current && routeGeoJson.remaining.features.length > 0) {
          return;
        }
        lastDirectWaypointsHashRef.current = hash;

        const rawCoords: [number, number][] = routeWaypoints.map((w: any) => [
          w[0],
          w[2] != null ? w[2] : w[1]
        ]);
        
        // Smooth in-game physical waypoints using Convex-Hull Quadratic Bézier Fillet smoothing
        // Eliminates sharp 25m-50m polygonal chords ('zackig') and lateral Z-kinks while strictly preserving turn maneuvers and road curvature
        const smoothedCoords = smoothRouteCoords(rawCoords, {
          maxSmoothingAngleDeg: 85.0,
          minSmoothingAngleDeg: 1.0,
        });

        const remainingCoords = smoothedCoords
          .map(([gx, gz]) => {
            const pt = projectGameToLatLng(gx, gz);
            return pt ? ([pt[1], pt[0]] as [number, number]) : null;
          })
          .filter((pt): pt is [number, number] => pt !== null);

        if (!canceled && remainingCoords.length >= 2) {
          setRawRouteCoords(rawCoords);
          rawRouteCoordsRef.current = rawCoords;
          fullRemainingCoordsRef.current = remainingCoords;

          // Calculate turn points for navigation instructions using distance-window curvature detector
          const rawTurnPoints = extractTurnsFromRouteCoords(rawCoords);
          let turnPoints = rawTurnPoints;

          const ipc = getIpcRenderer();
          if (ipc) {
            try {
              const verified = await ipc.invoke('verify-turn-nodes', rawTurnPoints);
              if (!canceled && Array.isArray(verified)) {
                turnPoints = verified;
              }
            } catch (err) {
              console.warn('[GameMapWidget] verify-turn-nodes IPC failed:', err);
            }
          } else {
            try {
              const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
              const hostname = window.location.hostname || 'localhost';
              const port = window.location.port === '5173' ? '8383' : (window.location.port || '8383');
              const res = await fetch(`${protocol}//${hostname}:${port}/api/carplay/verify-turns`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ turnPoints: rawTurnPoints }),
              });
              if (res.ok) {
                const data = await res.json();
                if (!canceled && Array.isArray(data.turnPoints)) {
                  turnPoints = data.turnPoints;
                }
              }
            } catch (err) {}
          }

          if (!canceled) {
            setJsonTurnPoints(turnPoints);
            setSegmentLanes([]);
          }

          const remainingFeature: GeoJSON.Feature[] = [{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: remainingCoords },
          }];

          setRouteGeoJson({
            remaining: { type: 'FeatureCollection' as const, features: remainingFeature },
            traveled: { type: 'FeatureCollection' as const, features: [] },
          });

          // Compute total polyline distance
          let totalDist = 0;
          for (let i = 1; i < rawCoords.length; i++) {
            const dx = rawCoords[i][0] - rawCoords[i - 1][0];
            const dy = rawCoords[i][1] - rawCoords[i - 1][1];
            totalDist += Math.sqrt(dx * dx + dy * dy);
          }
          onRouteCalculated?.({
            distanceMeters: Math.round(totalDist),
            durationSeconds: Math.round(totalDist / (60 / 3.6)),
          });
          return;
        }
      }

      // 2. Clear route if explicitly empty array or if neither direct waypoints nor destination exist
      const hasDirectWaypoints = Array.isArray(routeWaypoints) && routeWaypoints.length >= 2;
      const isExplicitlyCleared = Array.isArray(routeWaypoints) && routeWaypoints.length === 0;

      // Retain active in-memory direct route if routeWaypoints is momentarily undefined between telemetry frames
      if (routeWaypoints === undefined && rawRouteCoordsRef.current.length > 0) {
        return;
      }

      if (!hasDirectWaypoints && (isExplicitlyCleared || (!dest && !destCompany))) {
        lastRouteKeyRef.current = '';
        lastDirectWaypointsHashRef.current = '';
        lastRouteCalcPosRef.current = null;
        fullRemainingCoordsRef.current = [];
        rawRouteCoordsRef.current = [];
        setRawRouteCoords([]);
        setJsonTurnPoints([]);
        setSegmentLanes([]);
        setNavInstruction({ primary: null, upcoming: [] });
        setRouteGeoJson({
          remaining: { type: 'FeatureCollection' as const, features: [] },
          traveled: { type: 'FeatureCollection' as const, features: [] },
        });
        onRouteCalculated?.(null);
        return;
      }

      const currentX = gameXRef.current ?? 0;
      const currentY = gameYRef.current ?? 0;
      const routeKey = `${source || ''}_${dest || ''}_${destCompany || ''}`;

      // Avoid recalculating if destination & source key has not changed
      if (routeKey === lastRouteKeyRef.current && routeGeoJson.remaining.features.length > 0) {
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

      const currentPos = lastPos.current || (currentX !== 0 || currentY !== 0 ? projectGameToLatLng(currentX, currentY) : null);
      const sourceX = currentX !== 0 ? currentX : (source ? findCity(source)?.x : null);
      const sourceZ = currentY !== 0 ? currentY : (source ? findCity(source)?.z : null);

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
            rawRouteCoordsRef.current = res.coordinates;

            const smoothedCoords = smoothRouteCoords(res.coordinates);
            remainingCoords = smoothedCoords
              .map(([gx, gz]: [number, number]) => {
                const pt = projectGameToLatLng(gx, gz);
                return pt ? [pt[1], pt[0]] : null;
              })
              .filter((pt): pt is [number, number] => pt !== null);

            fullRemainingCoordsRef.current = remainingCoords;

            onRouteCalculated?.({
              distanceMeters: res.distanceMeters || 0,
              durationSeconds: res.durationSeconds || 0,
            });
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
      fullRemainingCoordsRef.current = remainingCoords;

      if (canceled) return;

      lastRouteKeyRef.current = routeKey;
      lastRouteCalcPosRef.current = { x: currentX, y: currentY };

      const remainingFeature: GeoJSON.Feature[] = remainingCoords.length >= 2 ? [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: remainingCoords },
      }] : [];

      setRouteGeoJson({
        remaining: { type: 'FeatureCollection' as const, features: remainingFeature },
        traveled: { type: 'FeatureCollection' as const, features: [] },
      });
    };

    calculateRoute();

    return () => {
      canceled = true;
    };
  }, [routeWaypoints, source, dest, destCompany, mapReady, onRouteCalculated]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const setupRouteLayers = () => {
      // Helper to ensure all sprites/POIs are rendered strictly ON TOP of route lines
      const ensureSpritesAboveRoute = () => {
        const topLayers = ['ets2-pois', 'ets2-companies', 'ets2-traffic', 'ets2-cities', 'nearby-vehicles-layer'];
        for (const layerId of topLayers) {
          if (map.getLayer(layerId)) {
            try { map.moveLayer(layerId); } catch {}
          }
        }
      };

      // Effective route line color: if accentColor is blue (which blends into ETS2 blue freeways #3b82f6), use vivid neon purple (#a855f7)
      const isBlueAccent = !accentColor || ['#3b82f6', '#2563eb', '#1d4ed8', '#0ea5e9', '#0284c7', '#007aff'].includes(accentColor.toLowerCase());
      const effectiveRouteColor = isBlueAccent ? '#a855f7' : accentColor;

      if (map.getSource('route-remaining')) {
        if (map.getLayer('route-traveled-line')) {
          map.setPaintProperty('route-traveled-line', 'line-color', effectiveRouteColor);
        }
        if (map.getLayer('route-remaining-glow')) {
          map.setPaintProperty('route-remaining-glow', 'line-color', effectiveRouteColor);
        }
        if (map.getLayer('route-remaining-line')) {
          map.setPaintProperty('route-remaining-line', 'line-color', effectiveRouteColor);
        }
        const remSource = map.getSource('route-remaining') as maplibregl.GeoJSONSource;
        if (remSource && remSource.setData) remSource.setData(routeGeoJson.remaining);
        const travSource = map.getSource('route-traveled') as maplibregl.GeoJSONSource;
        if (travSource && travSource.setData) travSource.setData(routeGeoJson.traveled);
        ensureSpritesAboveRoute();
        return;
      }

      map.addSource('route-remaining', {
        type: 'geojson',
        data: routeGeoJson.remaining,
      });
      map.addSource('route-traveled', {
        type: 'geojson',
        data: routeGeoJson.traveled,
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

      // Find first POI/sprite layer so route is placed beneath all sprites
      const beforeLayer = ['ets2-pois', 'ets2-companies', 'ets2-traffic', 'ets2-cities'].find(id => map.getLayer(id));

      // Route Casing layer (dark outline behind the route line for crisp contrast on both dark terrain and blue freeway roads)
      map.addLayer({
        id: 'route-remaining-casing',
        type: 'line',
        source: 'route-remaining',
        paint: {
          'line-color': '#020617',
          'line-width': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            4, 4.5,
            7, 8,
            9, 13,
            11, 19,
            12, 24
          ],
          'line-opacity': 0.9,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      }, beforeLayer);

      map.addLayer({
        id: 'route-traveled-line',
        type: 'line',
        source: 'route-traveled',
        paint: {
          'line-color': effectiveRouteColor,
          'line-width': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            4, 2,
            7, 5,
            9, 9,
            11, 14,
            12, 18
          ],
          'line-opacity': 0.35,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      }, beforeLayer);

      map.addLayer({
        id: 'route-remaining-glow',
        type: 'line',
        source: 'route-remaining',
        paint: {
          'line-color': effectiveRouteColor,
          'line-width': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            4, 4,
            7, 8,
            9, 13,
            11, 19,
            12, 23
          ],
          'line-opacity': 0.35,
          'line-blur': 3,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      }, beforeLayer);

      map.addLayer({
        id: 'route-remaining-line',
        type: 'line',
        source: 'route-remaining',
        paint: {
          'line-color': effectiveRouteColor,
          'line-width': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            4, 2.5,
            7, 5,
            9, 9,
            11, 14,
            12, 18
          ],
          'line-opacity': 0.95,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      }, beforeLayer);

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
      }, beforeLayer);

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
      }, beforeLayer);

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
      }, beforeLayer);

      // Ensure all POIs, companies, traffic features, city labels and nearby players are strictly ON TOP of route lines
      ensureSpritesAboveRoute();
    };

    if (map.isStyleLoaded()) {
      setupRouteLayers();
    } else {
      map.once('styledata', setupRouteLayers);
    }

  }, [mapReady, accentColor]);

  // Synchronize route GeoJSON data with MapLibre sources
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const updateSourceData = () => {
      try {
        const remainingSource = map.getSource('route-remaining') as maplibregl.GeoJSONSource | undefined;
        if (remainingSource && typeof remainingSource.setData === 'function') {
          remainingSource.setData(routeGeoJson.remaining);
        }
        const traveledSource = map.getSource('route-traveled') as maplibregl.GeoJSONSource | undefined;
        if (traveledSource && typeof traveledSource.setData === 'function') {
          traveledSource.setData(routeGeoJson.traveled);
        }
      } catch (e) {
        console.warn('Error updating route GeoJSON data on map:', e);
      }
    };

    if (map.isStyleLoaded()) {
      updateSourceData();
    } else {
      map.once('styledata', updateSourceData);
    }
  }, [routeGeoJson, mapReady]);

  // Synchronize nearby vehicles (TruckersMP / Traffic) with MapLibre source
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const count = Array.isArray(nearbyVehicles) ? nearbyVehicles.length : 0;
    // Fast bailout: if both current and previous count are 0, avoid touching GeoJSON or triggering WebGL repaints!
    if (count === 0 && lastNearbyCountRef.current === 0) {
      return;
    }

    const updateNearbyData = () => {
      try {
        const source = map.getSource('nearby-vehicles-source') as maplibregl.GeoJSONSource | undefined;
        if (!source || typeof source.setData !== 'function') return;

        if (count === 0) {
          if (lastNearbyCountRef.current > 0) {
            lastNearbyCountRef.current = 0;
            source.setData({ type: 'FeatureCollection', features: [] });
          }
          return;
        }
        lastNearbyCountRef.current = count;

        const features: any[] = [];
        for (const v of nearbyVehicles!) {
          // Do not display player trailers per user specification
          if (v.isTrailer) continue;

          const coords = projectGameToLatLng(v.x, v.z);
          if (!coords) continue;

          // Convert heading in radians to clockwise degrees from North
          const bearing = normalizeBearing((-v.heading * 180) / Math.PI);

          features.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [coords[1], coords[0]], // [lng, lat]
            },
            properties: {
              id: v.id,
              icon: 'nearby_truck_ico',
              bearing,
              isTrailer: false,
              isTmp: !!v.isTmp,
            },
          });
        }

        source.setData({
          type: 'FeatureCollection',
          features,
        });
      } catch (e) {
        console.warn('Error updating nearby vehicles on map:', e);
      }
    };

    // Real-time live update of player markers on incoming telemetry data
    const source = map.getSource('nearby-vehicles-source') as maplibregl.GeoJSONSource | undefined;
    if (source && typeof source.setData === 'function') {
      updateNearbyData();
      map.triggerRepaint();
    } else {
      map.once('styledata', () => {
        updateNearbyData();
        map.triggerRepaint();
      });
    }
  }, [nearbyVehicles, mapReady]);

  // Re-register nearby player icon on color change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    createNearbyVehiclesImages(map, nearbyVehicleColor);
    map.triggerRepaint();
  }, [nearbyVehicleColor, mapReady]);

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

    const destinationLabel = destCompany ? (dest ? `${destCompany}, ${dest}` : destCompany) : (dest || city || 'Ziel');

    // Detect actual road classification at player position to accurately determine lanes in driving direction
    // Throttled to every 500ms or on >20m movement to prevent expensive 33Hz WebGL tile queries
    let currentRoadType: 'freeway' | 'divided' | 'local' | 'unknown' = 'unknown';
    const now = performance.now();
    const curPos = lastPos.current;
    const lastRoadPos = lastRoadQueryPosRef.current;
    const distMoved = (curPos && lastRoadPos) ? Math.hypot(curPos[0] - lastRoadPos[0], curPos[1] - lastRoadPos[1]) : 999;

    if (now - lastRoadQueryTimeRef.current >= 500 || distMoved > 0.0002) {
      lastRoadQueryTimeRef.current = now;
      if (curPos) lastRoadQueryPosRef.current = [curPos[0], curPos[1]];
      const map = mapRef.current;
      if (map && mapReady && curPos) {
        try {
          const pt = map.project([curPos[1], curPos[0]]);
          const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
            [pt.x - 24, pt.y - 24],
            [pt.x + 24, pt.y + 24],
          ];
          const features = map.queryRenderedFeatures(bbox, { layers: ['ets2-roads'] });
          if (features && features.length > 0) {
            for (const f of features) {
              const rt = f.properties?.roadType;
              if (rt === 'freeway') { currentRoadType = 'freeway'; break; }
              if (rt === 'divided') { currentRoadType = 'divided'; }
              if (rt === 'local' && currentRoadType === 'unknown') { currentRoadType = 'local'; }
            }
          }
          cachedRoadTypeRef.current = currentRoadType;
        } catch (e) {}
      }
    } else {
      currentRoadType = cachedRoadTypeRef.current;
    }

    const inst = generateNextInstruction(
      rawRouteCoords,
      gameX,
      gameY,
      destinationLabel,
      segmentLanes,
      jsonTurnPoints,
      headingRef.current,
      speedLimit,
      currentSpeed,
      currentRoadType
    );
    // Only trigger React state update if the instruction, distance, maneuver or lane state actually changed
    if (!areInstructionsEqual(navInstructionRef.current, inst)) {
      setNavInstruction(inst);
    }
  }, [showInstructions, rawRouteCoords, gameX, gameY, dest, destCompany, city, segmentLanes, jsonTurnPoints, speedLimit, currentSpeed, mapReady]);

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
    const topOffset = followPaddingTop !== undefined
      ? followPaddingTop
      : ((showInstructions && navInstruction.primary) ? (fullWidthInstructions ? 140 : 150) : 0);
    mapRef.current.flyTo({
      center: [lastPos.current[1], lastPos.current[0]],
      zoom: currentZoomRef.current,
      bearing: currentBearingRef.current,
      duration: 800,
      padding: { top: topOffset, bottom: 0, left: 0, right: 0 },
    });
  }, [showInstructions, fullWidthInstructions, navInstruction.primary, followPaddingTop]);

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
          fullWidth={fullWidthInstructions}
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

      {/* Map Controls Group (Recenter when panned) */}
      {!following && lastPos.current && (
        <div className="gm-controls-group" onClick={(e) => e.stopPropagation()}>
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
        </div>
      )}

      {/* No connection overlay */}
      {!connected && (gameX == null || gameY == null || (gameX === 0 && gameY === 0)) && (
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
        .game-map-container .maplibregl-canvas-container {
          border-radius: inherit !important;
        }
        .game-map-container .maplibregl-canvas {
          border-radius: inherit !important;
          z-index: 0 !important;
        }
        .game-map-container .maplibregl-marker,
        .game-map-container .game-map-player-marker {
          z-index: 999999 !important;
          pointer-events: none !important;
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

        /* Player marker styling */
        .game-map-player-marker {
          position: relative;
          width: 52px;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }
        .gm-marker-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gm-marker-pulse {
          position: absolute;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          opacity: 0.35;
          animation: gmPulse 2s ease-out infinite;
        }
        @keyframes gmPulse {
          0% { transform: scale(0.6); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .gm-marker-arrow {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease-out;
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
