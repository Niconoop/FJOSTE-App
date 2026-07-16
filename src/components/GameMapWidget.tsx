import { useEffect, useRef, useState, useCallback } from 'react';
import * as proj4 from 'proj4';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as pmtiles from 'pmtiles';
import { Crosshair, Navigation } from 'lucide-react';
import { API_URL } from '../config';
import { findCity } from '../data/ets2Cities';
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
  /** Current city name */
  city?: string;
  /** Navigation distance in meters */
  navDistance?: number;
  /** Whether the game is connected */
  connected?: boolean;
  /** Accent color from theme */
  accentColor?: string;
  /** Widget width */
  width?: number;
  /** Widget height */
  height?: number;
}

// --- ETS2 coordinate → lat/lng projection (Lambert Conformal Conic) ---
// This implementation is based on the projection from the TruckerMudgeon/maps project
// It uses a Lambert Conformal Conic projection, which is what the game engine uses internally.
// https://github.com/truckermudgeon/maps/blob/main/packages/libs/map/projections.ts

const earthRadiusMeters = 6_370_997;
const lengthOfDegree = (earthRadiusMeters * Math.PI) / 180;

// from def/climate.sii
const ets2DefData = {
  mapProjection: 'lambert_conic',
  standardParalel1: 37,
  standardParalel2: 65,
  mapOrigin: [50, 15],
  mapOffset: [16660, 4150],
  mapFactor: [-0.000171570875, 0.0001729241463],
} as const;

const ets2ProjectionString = [
  '+proj=lcc', // lambert conformal conic
  `+R=${earthRadiusMeters}`,
  `+lat_1=${ets2DefData.standardParalel1}`,
  `+lat_2=${ets2DefData.standardParalel2}`,
  `+lat_0=${ets2DefData.mapOrigin[0]}`,
  `+lon_0=${ets2DefData.mapOrigin[1]}`,
].join(' ');

const fromWgs84ToEts2Converter = proj4.default(ets2ProjectionString);

/**
 * Converts ETS2 game coordinates (x, z) to geographical coordinates (latitude, longitude)
 * using a Lambert Conformal Conic projection.
 *
 * @param gx The in-game X coordinate.
 * @param gz The in-game Z coordinate (referred to as Y in telemetry).
 * @returns A tuple [latitude, longitude] or null if inputs are invalid.
 */
function projectGameToLatLng(gx: number, gz: number): [number, number] | null {
  if (gx == null || gz == null) return null;

  let x = gx;
  let y = gz;

  const sx = Math.floor(x / 4000);
  const sy = Math.floor(y / 4000);
  // apply mapOffset to coords before projecting.
  x -= ets2DefData.mapOffset[0];
  y -= ets2DefData.mapOffset[1];

  // UK content is authored at a slightly larger scale (~14.37 vs. ~19.15)
  const ukScaleFactor = 0.75;
  // HACK: treat all coords up-and-to-the-left of the sector containing Calais
  // (-31_100, -5500) as UK coords.
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

  // Bounds check to ensure coordinates are within a reasonable range for the ETS2 map
  if (lat > 35 && lat < 71 && lng > -15 && lng < 45) {
    return [lat, lng];
  }


  return null;
}

// ETS2 PMTiles style for MapLibre (dark theme, minimal)
const PROXY_BASE = `${API_URL}/map/proxy`;

function createEts2Style(): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
    sprite: 'https://truckermudgeon.github.io/sprites',
    sources: {
      ets2: {
        type: 'vector',
        url: `pmtiles://${PROXY_BASE}/ets2.pmtiles`,
      },
      world: {
        type: 'vector',
        url: `pmtiles://${PROXY_BASE}/world.pmtiles`,
      },
    },
    layers: [
      // Solid background
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
          'fill-color': '#000000',
        },
      },
      // ETS2 map areas (land polygons)
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
            0, '#000000',  // water
            1, '#050508',  // land
            2, '#14171f',  // road surface
            3, '#050507',  // building
            '#050508',
          ],
          'fill-opacity': 0.95,
        },
      },
      // ETS2 prefabs (intersections, etc.)
      {
        id: 'ets2-prefabs',
        type: 'fill',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'prefab'], ['!=', ['get', 'hidden'], true]],
        paint: { 'fill-color': '#14171f', 'fill-opacity': 0.9 },
      },
      // ETS2 roads
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
            'freeway', '#ff8c00',  // Dark Orange (Autobahn / Freeway)
            'divided', '#e5a93b',  // Gold (Divided / Main Roads)
            'local', '#384556',    // Dark grey-blue (Local Roads)
            'train', '#11161b',    // Black (Rail)
            '#384556',
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 0.5,
            6, 1.5,
            10, 3,
          ],
          'line-opacity': 0.9,
        },
      },
      // ETS2 ferries
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
      // City labels
      // POI Icons (gas stations, services, dealers, recruitment, parking, garages, toll booths, viewpoints)
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
      // Company Depot Icons
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

// --- Rotation Helper ---
// Berechnet die kürzeste Winkeldifferenz zwischen zwei Bearings (immer im Bereich [-180, 180])
function shortestAngleDelta(from: number, to: number): number {
  let delta = ((to - from) % 360 + 540) % 360 - 180;
  return delta;
}

// Normalisiert einen Winkel auf [-180, 180]
function normalizeBearing(deg: number): number {
  return ((deg % 360) + 540) % 360 - 180;
}

const GameMapWidget: React.FC<GameMapWidgetProps> = ({
  gameX, gameY, heading, source, dest, city,
  navDistance, connected, accentColor = '#f59e0b',
  width = 300, height = 200,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerEl = useRef<HTMLDivElement | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const [following, setFollowing] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  const lastPos = useRef<[number, number] | null>(null);

  const [routeGeoJson, setRouteGeoJson] = useState<{
    traveled: GeoJSON.FeatureCollection;
    remaining: GeoJSON.FeatureCollection;
  }>({
    traveled: { type: 'FeatureCollection', features: [] },
    remaining: { type: 'FeatureCollection', features: [] },
  });

  // Eigenes Bearing-Tracking: Wir tracken den aktuellen Bearing selbst,
  // statt uns auf MapLibres getBearing() zu verlassen (das kann mid-animation sein)
  const currentBearingRef = useRef<number>(0);
  const lastRawHeading = useRef<number | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;
    addPmTilesProtocol();

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: createEts2Style(),
      center: [12, 50],
      zoom: 6,
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

    // Nur echte User-Interaktionen deaktivieren 'following'
    map.on('dragstart', () => {
      setFollowing(false);
    });
    map.on('rotatestart', (e: any) => {
      if (e.originalEvent) {
        setFollowing(false);
      }
    });

    // Wenn der User die Karte manuell rotiert, syncen wir unseren tracked bearing
    map.on('rotateend', () => {
      currentBearingRef.current = map.getBearing();
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      map.remove();
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

    // Always update inner HTML when accentColor changes to prevent color caching
    markerEl.current.innerHTML = `
      <div class="gm-marker-arrow" style="display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 0 6px ${accentColor});">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${accentColor}" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/>
        </svg>
      </div>
    `;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
    };
  }, [mapReady, accentColor]);

  // --- Haupt-Update: Position + Rotation ---
  useEffect(() => {
    if (!mapRef.current || !mapReady || !markerEl.current) return;
    if (gameX == null || gameY == null) return;

    const pos = projectGameToLatLng(gameX, gameY);
    if (!pos) return;

    const [lat, lng] = pos;
    lastPos.current = pos;

    const rawHeading = heading ?? lastRawHeading.current ?? 0;
    if (heading != null) lastRawHeading.current = heading;

    // Meridian-Konvergenz-Korrektur: Da die Karte in Web Mercator projiziert ist und das Spiel eine 
    // Lambert Conformal Conic Projektion nutzt, weicht die geografische Richtung auf der Karte von 
    // der Spiel-Raster-Richtung ab (besonders abseits des Zentralmeridians 15°).
    // Wir projizieren einen Punkt 1000m vor dem Spieler und berechnen das geografische Bearing.
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

    // Marker erstellen oder Position aktualisieren
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

    // Karte folgen lassen
    if (following && mapRef.current) {
      // Berechne den kürzesten Weg zum Ziel-Bearing
      const delta = shortestAngleDelta(currentBearingRef.current, desiredBearing);

      // Smooth interpolation: 60% zum Ziel pro Update (schnell aber weich)
      const SMOOTHING = 0.6;
      const newBearing = currentBearingRef.current + delta * SMOOTHING;

      // Speichere den neuen Bearing (NICHT normalisieren – der Wert darf über ±180 hinausgehen,
      // damit die Rotation sich kontinuierlich dreht ohne zu springen)
      currentBearingRef.current = newBearing;

      // Position smooth animieren, Bearing sofort setzen (kein Animation-Konflikt)
      mapRef.current.easeTo({
        center: [lng, lat],
        zoom: 10,
        bearing: newBearing,
        pitch: 60,
        duration: 200,
        easing: (t) => t, // Linear – wir machen das Smoothing selbst
      });
    }
  }, [gameX, gameY, heading, mapReady, following]);

  // --- Routen-Logik ---

  // 1. Berechne die GeoJSON-Daten für die Route, wenn sich die Eingabedaten ändern
  useEffect(() => {
    const calculateRoute = () => {
      const destCity = dest ? findCity(dest) : null;
      const currentPos = lastPos.current;

      const remainingCoords: [number, number][] = [];
      if (currentPos) remainingCoords.push([currentPos[1], currentPos[0]]);
      if (destCity) remainingCoords.push([destCity.lng, destCity.lat]);

      const remainingFeature: GeoJSON.Feature[] = remainingCoords.length >= 2 ? [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: remainingCoords },
      }] : [];

      // Für die zurückgelegte Strecke: Linie vom Start zum aktuellen Punkt
      const sourceCity = source ? findCity(source) : null;
      const traveledCoords: [number, number][] = [];
      if (sourceCity) traveledCoords.push([sourceCity.lng, sourceCity.lat]);
      if (currentPos) traveledCoords.push([currentPos[1], currentPos[0]]);

      const traveledFeature: GeoJSON.Feature[] = traveledCoords.length >= 2 ? [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: traveledCoords },
      }] : [];

      const finalGeoJson = {
        remaining: { type: 'FeatureCollection' as const, features: remainingFeature },
        traveled: { type: 'FeatureCollection' as const, features: traveledFeature },
      };

      setRouteGeoJson(finalGeoJson);
    };

    calculateRoute();
  }, [source, dest, gameX, gameY]); // Abhängig von den Positionsdaten

  // 2. Füge die Layer und Sources zur Karte hinzu, wenn sie bereit ist
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const setupRouteLayers = () => {
      // Stellt sicher, dass die Sources und Layer nicht doppelt hinzugefügt werden
      if (map.getSource('route-remaining')) {
        // Update layer colors when accentColor changes dynamically
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

      // Source für die verbleibende Route
      map.addSource('route-remaining', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      // Source für die zurückgelegte Route
      map.addSource('route-traveled', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      // Layer für die zurückgelegte Strecke (dezent)
      map.addLayer({
        id: 'route-traveled-line',
        type: 'line',
        source: 'route-traveled',
        paint: {
          'line-color': accentColor,
          'line-width': 3,
          'line-opacity': 0.3, // Weniger prominent
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      // Layer für den "Glow"-Effekt der verbleibenden Route
      map.addLayer({
        id: 'route-remaining-glow',
        type: 'line',
        source: 'route-remaining',
        paint: {
          'line-color': accentColor,
          'line-width': 7,
          'line-opacity': 0.15,
          'line-blur': 5,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });

      // Layer für die gestrichelte Linie der verbleibenden Route
      map.addLayer({
        id: 'route-remaining-line',
        type: 'line',
        source: 'route-remaining',
        paint: {
          'line-color': accentColor,
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [3, 3],
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      });
    };

    // Warten bis die Karte geladen ist, um Race Conditions zu vermeiden
    if (map.isStyleLoaded()) {
      setupRouteLayers();
    } else {
      map.once('styledata', setupRouteLayers);
    }

  }, [mapReady, accentColor]);

  // 3. Aktualisiere die Kartendaten, wenn sich das GeoJSON ändert
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
    // Behalte den aktuellen Bearing bei – einfach nur Position zentrieren
    mapRef.current.flyTo({
      center: [lastPos.current[1], lastPos.current[0]],
      zoom: 8,
      bearing: currentBearingRef.current,
      duration: 800,
    });
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

      {/* Overlay: Top info bar */}
      <div className="gm-top-bar">
        {city && (
          <div className="gm-city-badge">
            <div className="gm-city-dot" />
            <span>{city}</span>
          </div>
        )}
        {dest && (
          <div className="gm-dest-badge">
            <Navigation size={9} />
            <span>{dest}</span>
            {navDistance ? <span className="gm-dest-dist">{formatDistance(navDistance)}</span> : null}
          </div>
        )}
        {!dest && navDistance != null && navDistance > 0 && (
          <div className="gm-dest-badge">
            <Navigation size={9} />
            <span>GPS</span>
            <span className="gm-dest-dist">{formatDistance(navDistance)}</span>
          </div>
        )}
      </div>

      {/* Re-center button */}
      {!following && lastPos.current && (
        <button className="gm-recenter-btn" onClick={recenter} title="Karte zentrieren">
          <Crosshair size={14} />
        </button>
      )}

      {/* No connection overlay */}
      {!connected && (
        <div className="gm-no-connection">
          <span>Kein Spiel erkannt</span>
        </div>
      )}

      <style>{`
        .game-map-widget {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          background: #0d1117;
          border: 1px solid rgba(245, 158, 11,0.2);
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
        }
        .game-map-container {
          width: 100%;
          height: 100%;
        }
        .game-map-container .maplibregl-canvas {
          border-radius: 16px;
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

        /* Re-center button */
        .gm-recenter-btn {
          position: absolute;
          bottom: 8px;
          right: 8px;
          z-index: 10;
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
          pointer-events: auto;
        }
        .gm-recenter-btn:hover {
          background: rgba(245, 158, 11,0.2);
          border-color: var(--gm-accent, #f59e0b);
          box-shadow: 0 0 12px rgba(245, 158, 11,0.3);
        }

        /* Player marker */
        .game-map-player-marker {
          position: relative;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gm-marker-ring {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid var(--gm-accent, #f59e0b);
          background: rgba(13,17,23,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.3s ease;
          z-index: 2;
          box-shadow: 0 0 12px rgba(245, 158, 11,0.4);
        }
        .gm-marker-pulse {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          z-index: 1;
          animation: gm-pulse 2.5s ease-out infinite;
        }
        @keyframes gm-pulse {
          0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
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
};

export default GameMapWidget;
