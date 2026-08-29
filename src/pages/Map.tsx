import { useEffect, useState, useRef, useCallback, useMemo } from 'react';

import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RefreshCw, Truck, MapPin, Clock, Users, X, Search, Map as MapIcon, ChevronRight, Gauge, Package, ArrowRight, Globe, AlertTriangle, Car, ChevronDown, Check, Radio, Navigation, List, Box, Camera, SlidersHorizontal, Mountain } from 'lucide-react';


import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, getAvatarUrl } from '../config';
import * as proj4 from 'proj4';
import * as pmtiles from 'pmtiles';
import { loadAllCities, findCity } from '../data/ets2Cities';
import { getSpeedCamerasGeoJson } from '../data/ets2Speedcams';

const SIDEBAR_WIDTH = 320;

const SPECIAL_ROAD_COORDS: Record<string, [number, number]> = {
  "alpen road": [47.263, 11.395],
  "c-d road": [51.050, 4.350],
  "cd road": [51.050, 4.350],
  "calais - duisburg": [51.050, 4.350],
};

// Register PMTiles protocol once
let pmTilesProtocolAdded = false;
function addPmTilesProtocol() {
  if (pmTilesProtocolAdded) return;
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', (params: any, abortController: any) => protocol.tile(params, abortController));
  pmTilesProtocolAdded = true;
}

function createEts2Style(isLight: boolean): maplibregl.StyleSpecification {
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
          'background-color': isLight ? '#f1f3f5' : '#050508',
        },
      },
      {
        id: 'world-land',
        type: 'fill',
        source: 'world',
        'source-layer': 'land',
        paint: {
          'fill-color': isLight ? '#e9ecef' : '#08101a',
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
          'line-color': isLight ? '#94a3b8' : '#475569',
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
          'fill-color': isLight ? '#c4d7ec' : '#0f1c30',
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
          'fill-color': isLight
            ? [
              'match', ['get', 'color'],
              0, '#c4d7ec',  // water (light)
              1, '#f1f3f5',  // land (light)
              2, '#cbd5e1',  // road surface (light)
              3, '#dee2e6',  // building (light)
              '#f1f3f5',
            ]
            : [
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
        id: 'ets2-prefabs-base',
        type: 'fill',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'prefab'], ['!=', ['get', 'hidden'], true]],
        paint: {
          'fill-color': isLight ? '#cbd5e1' : '#1e293b',
          'fill-opacity': 0.95
        },
      },
      {
        id: 'ets2-footprints',
        type: 'fill',
        source: 'footprints',
        'source-layer': 'footprints',
        minzoom: 8.5,
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'footprint']],
        paint: {
          'fill-color': isLight ? '#cbd5e1' : '#1e293b',
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
          'fill-extrusion-color': isLight ? '#94a3b8' : '#2b3648',
          'fill-extrusion-height': [
            'interpolate',
            ['exponential', 1.5],
            ['zoom'],
            9,
            ['*', 10, ['get', 'height']],
            13,
            ['*', 20, ['get', 'height']],
          ],
          'fill-extrusion-opacity': isLight ? 0.45 : 0.8,
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
          'line-color': isLight
            ? [
              'match', ['get', 'roadType'],
              'freeway', '#c2410c',
              'divided', '#d97706',
              'local', '#64748b',
              'train', '#475569',
              '#64748b',
            ]
            : [
              'match', ['get', 'roadType'],
              'freeway', '#1d4ed8',  // Deep blue casing for freeway
              'divided', '#334155',  // Slate casing for divided roads
              'local', '#1e293b',    // Dark casing for local roads
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
      // Prefab surface overlay: renders OVER casing to cover road edges inside intersections
      {
        id: 'ets2-prefabs',
        type: 'fill',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'Polygon'], ['==', ['get', 'type'], 'prefab'], ['!=', ['get', 'hidden'], true]],
        paint: {
          'fill-color': isLight ? '#8e9aa8' : '#475569',
          'fill-opacity': 0.95
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
          'line-color': isLight
            ? [
              'match', ['get', 'roadType'],
              'freeway', '#ff9f1c',  // Orange (Highways / Autobahn)
              'divided', '#ffd166',  // Yellow (Major Roads)
              'local', '#8e9aa8',    // Slate grey (Local Roads)
              'train', '#8a9ba8',    // Grey (Rail)
              '#8e9aa8',
            ]
            : [
              'match', ['get', 'roadType'],
              'freeway', '#3b82f6',  // Neon Blue Highway (CarPlay Style)
              'divided', '#cbd5e1',  // Bright Slate Major Roads
              'local', '#475569',    // Slate Grey Local Roads
              'train', '#1e293b',    // Dark Rail
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
          'line-color': isLight ? '#0ea5e9' : '#38bdf8',
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
          'line-color': isLight ? '#cbd5e1' : '#10131a',
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
          'line-color': isLight ? '#64748b' : '#1a1f29',
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
          'line-color': isLight ? '#64748b' : '#1a1f29',
          'line-width': 1.5,
          'line-opacity': 0.9,
          'line-dasharray': [3, 2],
        },
      },

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
            8, 0.65,
            11, 1.0,
            14, 1.4
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
          'icon-allow-overlap': true,
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
          'text-field': ['coalesce', ['get', 'name:de'], ['get', 'name']],
          'text-font': ['Open Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3, 8, 7, 12, 10, 14],
          'text-anchor': 'center',
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-padding': 4,
        },
        paint: {
          'text-color': isLight ? '#495057' : '#8899aa',
          'text-halo-color': isLight ? '#ffffff' : '#0d1117',
          'text-halo-width': 1.5,
        },
      },
    ],
  } as any;
}

// --- ETS2 coordinate → lat/lng projection (Lambert Conformal Conic) ---
const earthRadiusMeters = 6_370_997;
const lengthOfDegree = (earthRadiusMeters * Math.PI) / 180;

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

const createSpeedcamImage = (map: any) => {
  if (map.hasImage('speedcam_ico')) return;

  const s = 2;
  const size = 48 * s;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 6 * s;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2) - (4 * s), 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48';
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

    // Primary Lens
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(21 * s, 25.5 * s, 4.5 * s, 0, Math.PI * 2);
    ctx.fill();

    // Lens Reflection
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(21 * s, 25.5 * s, 2 * s, 0, Math.PI * 2);
    ctx.fill();

    // Flash sensor
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.roundRect(28 * s, 20 * s, 4 * s, 4 * s, 1 * s);
    ctx.fill();

    // Lower sensor
    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.roundRect(28 * s, 26 * s, 4 * s, 4 * s, 1 * s);
    ctx.fill();

    // Radar Waves
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

const createRailcrossingImage = (map: any) => {
  if (map.hasImage('railcrossing')) return;

  const s = 2;
  const size = 48 * s;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, size, size);

    // Dark glowing backplate with crimson hazard border
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (size / 2) - (3 * s), 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    ctx.fill();
    ctx.lineWidth = 2.5 * s;
    ctx.strokeStyle = '#e11d48';
    ctx.stroke();

    // Railway tracks
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(16 * s, 10 * s); ctx.lineTo(16 * s, 38 * s);
    ctx.moveTo(32 * s, 10 * s); ctx.lineTo(32 * s, 38 * s);
    ctx.stroke();

    // Cross ties (Sleepers)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.8 * s;
    ctx.beginPath();
    for (let y = 13; y <= 35; y += 5.5) {
      ctx.moveTo(13 * s, y * s);
      ctx.lineTo(35 * s, y * s);
    }
    ctx.stroke();

    // White X cross bars (Andreaskreuz)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5.5 * s;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(9 * s, 9 * s); ctx.lineTo(39 * s, 39 * s);
    ctx.moveTo(39 * s, 9 * s); ctx.lineTo(9 * s, 39 * s);
    ctx.stroke();

    // Red tips on 4 ends of the cross
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 5.5 * s;
    ctx.beginPath();
    ctx.moveTo(9 * s, 9 * s); ctx.lineTo(14 * s, 14 * s);
    ctx.moveTo(34 * s, 34 * s); ctx.lineTo(39 * s, 39 * s);
    ctx.moveTo(39 * s, 9 * s); ctx.lineTo(34 * s, 14 * s);
    ctx.moveTo(14 * s, 34 * s); ctx.lineTo(9 * s, 39 * s);
    ctx.stroke();

    // Center Warning Signal Light
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 4.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#e11d48';
    ctx.fill();
    ctx.lineWidth = 1.2 * s;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 2 * s, 0, Math.PI * 2);
    ctx.fillStyle = '#fecaca';
    ctx.fill();
  }

  const imgData = ctx?.getImageData(0, 0, size, size);
  if (imgData) {
    map.addImage('railcrossing', imgData, { pixelRatio: s });
  }
};

const setupSpeedcamsLayer = (map: any) => {
  if (!map) return;
  createSpeedcamImage(map);

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
};

// Custom Frosted Glass Server Dropdown Component
const ServerDropdown = ({
  value,
  onChange,
  servers = []
}: {
  value: string;
  onChange: (serverUrl: string) => void;
  servers?: any[];
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultServers = [
    { url: 'sim1', name: 'EU Simulation 1' },
    { url: 'sim2', name: 'EU Simulation 2' },
    { url: 'arc2', name: 'US Simulation' },
    { url: 'ets2promods', name: 'ProMods Europe' },
  ];

  const allServers = [...defaultServers];
  servers.forEach((s) => {
    if (s.url && !allServers.find((ds) => ds.url === s.url)) {
      allServers.push({ url: s.url, name: s.name || s.short || s.url });
    }
  });

  const selectedServer = allServers.find((s) => s.url === value) || allServers[0];

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-zinc-950/80 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 text-xs font-bold text-white transition-all cursor-pointer shadow-lg group"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Globe size={13} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
          <span className="truncate text-[11px] font-bold text-slate-200">{selectedServer.name}</span>
        </div>
        <ChevronDown size={13} className={`text-slate-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-amber-400' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-zinc-950/95 backdrop-blur-2xl border border-white/15 rounded-xl shadow-2xl p-1 max-h-56 overflow-y-auto custom-scrollbar"
          >
            {allServers.map((server) => {
              const isSelected = server.url === value;
              return (
                <button
                  key={server.url}
                  type="button"
                  onClick={() => {
                    onChange(server.url);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{server.name}</span>
                  {isSelected && <Check size={12} className="text-amber-400 shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Map = ({ onViewProfile, initialSelectedId, onClearInitialId, theme }: { onViewProfile?: (id: string | number) => void, initialSelectedId?: string | number | null, onClearInitialId?: () => void, theme?: string }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const trafficMarkersRef = useRef<any[]>([]);
  const currentPopupRef = useRef<any>(null);
  const [mapData, setMapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");

  // Traffic State
  const [showTraffic, setShowTraffic] = useState(true);
  const [showSpeedcams, setShowSpeedcams] = useState(true);
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [trafficServer, setTrafficServer] = useState("sim1");
  const [trafficServers, setTrafficServers] = useState<any[]>([]);
  const [trafficHotspotsOpen, setTrafficHotspotsOpen] = useState(false);
  const [trafficLoading, setTrafficLoading] = useState(false);
  const [mapZoom, setMapZoom] = useState<number>(4.5);
  const [is3DMode, setIs3DMode] = useState(false);
  const [showTerrain3D, setShowTerrain3D] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(false);

  const toggle3dMode = useCallback(() => {
    if (!mapRef.current) return;
    setIs3DMode(prev => {
      const next = !prev;
      if (next) {
        mapRef.current.easeTo({ pitch: 58, bearing: -15, duration: 1200 });
      } else {
        mapRef.current.easeTo({ pitch: 0, bearing: 0, duration: 1200 });
      }
      return next;
    });
  }, []);

  const toggleTerrain3D = useCallback(() => {
    if (!mapRef.current) return;
    setShowTerrain3D(prev => {
      const next = !prev;
      try {
        if (next) {
          mapRef.current.setTerrain({ source: 'terrain', exaggeration: 2.2 });
          if (mapRef.current.getLayer('contours-lines')) {
            mapRef.current.setLayoutProperty('contours-lines', 'visibility', 'visible');
          }
        } else {
          mapRef.current.setTerrain(null);
          if (mapRef.current.getLayer('contours-lines')) {
            mapRef.current.setLayoutProperty('contours-lines', 'visibility', 'none');
          }
        }
      } catch (err) {
        console.debug("Terrain toggle notice:", err);
      }
      return next;
    });
  }, []);


  // Live TruckersMP ID Tracking state
  const [trackedTmpPlayer, setTrackedTmpPlayer] = useState<any>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const trackedMarkerRef = useRef<any>(null);

  const getAvatarUrlLocal = (url?: string) => getAvatarUrl(url);

  const capitalize = (str?: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const getMapAnchor = useCallback(() => {
    if (!mapContainer.current) return undefined;
    const w = mapContainer.current.offsetWidth;
    const h = mapContainer.current.offsetHeight;
    const sw = sidebarOpen ? SIDEBAR_WIDTH : 0;
    return { x: (w - sw) / 2, y: h / 2 };
  }, [sidebarOpen]);

  const filteredDrivers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return mapData;
    return mapData.filter((m: any) => {
      const nameMatch = (m.username || '').toLowerCase().includes(query);
      const tmpIdMatch = (m.tmp_id || '').toString().includes(query);
      const cityMatch = (m.live_location?.city || m.last_position?.city || '').toLowerCase().includes(query);
      return nameMatch || tmpIdMatch || cityMatch;
    });
  }, [mapData, search]);


  const trackTmpPlayer = useCallback(async (tmpId: string | number) => {
    const cleanId = String(tmpId).trim();
    if (!cleanId) return;

    setSelectedDriver(null); // Close driver detail card if open
    setTrackingLoading(true);
    setTrackingError(null);

    try {
      let data: any = null;
      let tmpProfile: any = null;

      // 1. Fetch TruckersMP profile info via Trucky's unblocked API endpoint
      try {
        const pRes = await axios.get(`https://api.truckyapp.com/v2/truckersmp/player?playerID=${cleanId}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'OpenPipeClub/1.0' }
        });
        const respData = pRes.data?.response?.response || pRes.data?.response;
        if (respData && respData.name) {
          tmpProfile = respData;
        }
      } catch (e) {}

      // 2. Fetch session / live map data
      try {
        const res = await axios.get(`${API_URL}/truckersmp/server/${cleanId}`);
        data = res.data;
      } catch (err) {
        const fallbackRes = await axios.get(`https://api.truckyapp.com/v3/map/online?playerID=${cleanId}`, {
          headers: { 'Accept': 'application/json', 'User-Agent': 'OpenPipeClub/1.0' }
        });
        const info = fallbackRes.data?.response;
        if (info && info.online && info.x != null && info.y != null) {
          const projected = projectGameToLatLng(info.x, info.y);
          data = {
            online: true,
            tmp_id: cleanId,
            game_x: info.x,
            game_y: info.y,
            speed: info.speed,
            server_name: info.serverDetails?.name || "Simulation",
            city: info.location?.poi?.realName || "Unterwegs",
            country: info.location?.poi?.country || "Europa",
            lat: projected ? projected[0] : null,
            lng: projected ? projected[1] : null,
          };
        } else {
          data = { online: false, tmp_id: cleanId };
        }
      }

      const realName = data?.name || tmpProfile?.name || `TruckersMP #${cleanId}`;
      const realAvatar = data?.avatar || tmpProfile?.avatar || tmpProfile?.smallAvatar || null;
      const realGroup = data?.group || tmpProfile?.groupName || "TruckersMP Spieler";

      if (data && data.online && data.lat != null && data.lng != null) {
        const playerObj = {
          tmp_id: cleanId,
          name: realName,
          avatar: realAvatar,
          group: realGroup,
          online: true,
          server_name: data.server_name || "Online",
          lat: data.lat,
          lng: data.lng,
          speed: data.speed || 0,
          city: data.city || "Unterwegs",
          country: data.country || "",
          last_updated: new Date()
        };
        setTrackedTmpPlayer(playerObj);

        if (mapRef.current) {
            mapRef.current.flyTo({ center: [data.lng, data.lat], zoom: 13, speed: 1.5, anchor: getMapAnchor() });
          }
      } else {
        setTrackingError(`Spieler ${realName} ist aktuell OFFLINE oder nicht auf der Karte.`);
        setTrackedTmpPlayer({
          tmp_id: cleanId,
          name: realName,
          avatar: realAvatar,
          group: realGroup,
          online: false,
          last_updated: new Date()
        });
      }
    } catch (e: any) {
      setTrackingError(`Konnte TruckersMP ID #${cleanId} nicht finden.`);
    } finally {
      setTrackingLoading(false);
    }
  }, []);

  // 5s Live polling for tracked TruckersMP ID
  useEffect(() => {
    if (!trackedTmpPlayer || !trackedTmpPlayer.tmp_id || !trackedTmpPlayer.online) return;

    const interval = setInterval(async () => {
      try {
        let data: any = null;
        try {
          const res = await axios.get(`${API_URL}/truckersmp/server/${trackedTmpPlayer.tmp_id}`);
          data = res.data;
        } catch (e) {
          const fallbackRes = await axios.get(`https://api.truckyapp.com/v3/map/online?playerID=${trackedTmpPlayer.tmp_id}`, {
            headers: { 'Accept': 'application/json', 'User-Agent': 'OpenPipeClub/1.0' }
          });
          const info = fallbackRes.data?.response;
          if (info && info.online && info.x != null && info.y != null) {
            const projected = projectGameToLatLng(info.x, info.y);
            data = {
              online: true,
              tmp_id: trackedTmpPlayer.tmp_id,
              speed: info.speed,
              server_name: info.serverDetails?.name || "Simulation",
              city: info.location?.poi?.realName || "Unterwegs",
              country: info.location?.poi?.country || "Europa",
              lat: projected ? projected[0] : null,
              lng: projected ? projected[1] : null,
            };
          }
        }

        if (data && data.online && data.lat != null && data.lng != null) {
          setTrackedTmpPlayer((prev: any) => ({
            ...prev,
            online: true,
            lat: data.lat,
            lng: data.lng,
            speed: data.speed || 0,
            server_name: data.server_name || prev?.server_name,
            city: data.city || prev?.city,
            country: data.country || prev?.country,
            last_updated: new Date()
          }));

          if (autoFollow && mapRef.current) {
            mapRef.current.easeTo({ center: [data.lng, data.lat], duration: 1500 });
          }
        }
      } catch (err) {
        console.warn("Tracking update error:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [trackedTmpPlayer?.tmp_id, trackedTmpPlayer?.online, autoFollow]);

  // Tracked player map marker rendering (Theme Orange)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (trackedMarkerRef.current) {
      trackedMarkerRef.current.remove();
      trackedMarkerRef.current = null;
    }

    if (trackedTmpPlayer && trackedTmpPlayer.online && trackedTmpPlayer.lat != null && trackedTmpPlayer.lng != null) {
      const el = document.createElement("div");
      el.className = "tracked-tmp-marker";
      el.style.cssText = `
        width: 46px;
        height: 46px;
        border-radius: 50%;
        border: 3px solid #f59e0b;
        background: rgba(245, 158, 11, 0.25);
        backdrop-filter: blur(12px);
        box-shadow: 0 0 25px rgba(245, 158, 11, 0.9), inset 0 0 15px rgba(245, 158, 11, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 30;
      `;
      el.innerHTML = `
        <div style="font-size: 20px; line-height: 1; filter: drop-shadow(0 0 6px rgba(245,158,11,0.9));">📡</div>
      `;

      el.addEventListener("click", () => {
        map.flyTo({ center: [trackedTmpPlayer.lng, trackedTmpPlayer.lat], zoom: 13, duration: 1500, anchor: getMapAnchor() });
      });

      const marker = new (maplibregl as any).Marker({ element: el })
        .setLngLat([trackedTmpPlayer.lng, trackedTmpPlayer.lat])
        .addTo(map);

      trackedMarkerRef.current = marker;
    }
  }, [trackedTmpPlayer]);

  const fetchTraffic = useCallback(async (srv?: string) => {
    const targetServer = srv || trafficServer;
    try {
      setTrafficLoading(true);
      const [tRes, sRes] = await Promise.all([
        axios.get(`https://api.truckyapp.com/v2/traffic?server=${encodeURIComponent(targetServer)}&game=ets2`).catch(() => ({ data: { response: [] } })),
        axios.get(`https://api.truckyapp.com/v2/traffic/servers`).catch(() => ({ data: { response: [] } }))
      ]);
      const resp = tRes.data?.response;
      setTrafficData(Array.isArray(resp) ? resp : []);
      const serversList = sRes.data?.response;
      if (Array.isArray(serversList) && serversList.length > 0) {
        const ets2Only = serversList.filter((s: any) => !(s.game || s.short_name || s.name || "").toUpperCase().includes("ATS"));
        setTrafficServers(ets2Only);
      }
    } catch (e) {
      console.warn("Traffic fetch error:", e);
    } finally {
      setTrafficLoading(false);
    }
  }, [trafficServer]);

  useEffect(() => {
    loadAllCities();
  }, []);

  useEffect(() => {
    if (showTraffic) {
      fetchTraffic(trafficServer);
      const interval = setInterval(() => fetchTraffic(trafficServer), 30000);
      return () => clearInterval(interval);
    }
  }, [showTraffic, trafficServer, fetchTraffic]);

  const fetchData = useCallback(async () => {
    try {
      const [mapRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/live-map`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/management/users`).catch(() => ({ data: [] }))
      ]);

      const liveData = Array.isArray(mapRes.data) ? mapRes.data : [];
      const openpipeclubUsers = Array.isArray(usersRes.data) ? usersRes.data : [];

      // Merge: Use openpipeclubUsers as base to include everyone
      const merged = openpipeclubUsers.map((u: any) => {
        const live = liveData.find((l: any) => l.id == u.id || (l.trucky_id && l.trucky_id == u.trucky_driver_id));
        return {
          ...u,
          ...live,
          id: u.id,
          name: u.username || u.name,
          online: !!live?.online,
          lastSeen: live?.last_position?.updated_at || u.updated_at,
          avatar_url: u.avatar_url || live?.avatar_url,
          role: u.role || live?.role || 'Fahrer'
        };
      });

      // Add live users that might not be in openpipeclubUsers
      liveData.forEach((l: any) => {
        if (!merged.find(m => m.id == l.id || m.trucky_driver_id == l.id)) {
          merged.push({
            ...l,
            online: !!l.online,
            lastSeen: l.last_position?.updated_at
          });
        }
      });

      // Sort: Online first, then by name
      merged.sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        return (a.name || "").localeCompare(b.name || "");
      });

      setMapData(merged);
      setLastUpdate(new Date());
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;
    addPmTilesProtocol();
    const isLight = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: createEts2Style(isLight),
      center: [12, 51],
      zoom: 4.5,
      minZoom: 4.5,
      maxZoom: 14,
      pitch: is3DMode ? 58 : 0,
      maxPitch: 80,
      dragRotate: true,
      pitchWithRotate: true,
      attributionControl: false,
      fadeDuration: 0,
      trackResize: true,
      renderWorldCopies: false,
      maxTileCacheSize: 80,
    });
    map.on('load', () => {
      try {
        createRailcrossingImage(map);
        setupSpeedcamsLayer(map);
        map.setTerrain({ source: 'terrain', exaggeration: 2.2 });
      } catch (err) {
        console.debug("Terrain/Speedcam load notice:", err);
      }
    });

    map.setMinZoom(4.5);
    map.setMaxZoom(14);
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-left");

    const handleZoom = () => setMapZoom(map.getZoom());
    map.on('zoomend', handleZoom);
    setMapZoom(map.getZoom());

    mapRef.current = map;
    return () => {
      map.off('zoomend', handleZoom);
      map.remove();
    };

  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const isLight = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);

    const updateMapStyle = () => {
      if (mapRef.current && mapRef.current.isStyleLoaded()) {
        mapRef.current.setStyle(createEts2Style(isLight));
        mapRef.current.once('style.load', () => {
          try {
            createRailcrossingImage(mapRef.current);
            setupSpeedcamsLayer(mapRef.current);
            if (showTerrain3D) {
              mapRef.current?.setTerrain({ source: 'terrain', exaggeration: 2.2 });
              if (mapRef.current?.getLayer('contours-lines')) {
                mapRef.current.setLayoutProperty('contours-lines', 'visibility', 'visible');
              }
            } else {
              mapRef.current?.setTerrain(null);
              if (mapRef.current?.getLayer('contours-lines')) {
                mapRef.current.setLayoutProperty('contours-lines', 'visibility', 'none');
              }
            }
          } catch {}
        });
      }
    };

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', updateMapStyle);
      } else {
        mediaQuery.addListener(updateMapStyle);
      }
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', updateMapStyle);
        } else {
          mediaQuery.removeListener(updateMapStyle);
        }
      };
    }
  }, [theme]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (initialSelectedId && mapData.length > 0) {
      const driver = mapData.find(m => m.id == initialSelectedId || (m.trucky_id && m.trucky_id == initialSelectedId));
      if (driver) {
        setSelectedDriver(driver);
        const loc = driver.online ? driver.live_location : driver.last_position;
        if (loc && mapRef.current) {
          let lat = loc.lat;
          let lng = loc.lng;
          if (loc.game_x != null && loc.game_y != null) {
            const projected = projectGameToLatLng(loc.game_x, loc.game_y);
            if (projected) {
              [lat, lng] = projected;
            }
          }
          if (lat != null && lng != null) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 12, duration: 1500, anchor: getMapAnchor() });
          }
        }
      }
      onClearInitialId?.();
    }
  }, [initialSelectedId, mapData, onClearInitialId]);

  const driverMarkersMapRef = useRef<globalThis.Map<string, { marker: any; el: HTMLDivElement }>>(new window.Map());

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const seenPositions: { [key: string]: number } = {};
    const activeDriverIds = new Set<string>();

    mapData.forEach(member => {
      const loc = member.online ? member.live_location : member.last_position;
      if (!loc) return;

      let lat = loc.lat;
      let lng = loc.lng;

      if (loc.game_x != null && loc.game_y != null) {
        const projected = projectGameToLatLng(loc.game_x, loc.game_y);
        if (projected) {
          [lat, lng] = projected;
        }
      }

      if (lat == null || lng == null) return;

      // Prevent overlapping markers
      const posKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
      if (seenPositions[posKey]) {
        const count = seenPositions[posKey];
        const angle = count * 1.1; // Wider angle
        const radius = 0.0006 * count; // Larger radius (~65m per step)
        lat += Math.sin(angle) * radius;
        lng += Math.cos(angle) * radius;
        seenPositions[posKey]++;
      } else {
        seenPositions[posKey] = 1;
      }

      const driverId = String(member.id);
      activeDriverIds.add(driverId);

      const borderColor = member.online ? "#10b981" : "#f59e0b";
      const isSelected = selectedDriver?.id === member.id;
      const avatarUrl = getAvatarUrl(member.avatar_url);

      const existing = driverMarkersMapRef.current.get(driverId);

      if (existing) {
        // High-performance GPU position update (0ms DOM reflow)
        existing.marker.setLngLat([lng, lat]);
        existing.el.style.borderColor = borderColor;
        existing.el.style.zIndex = isSelected ? "10" : "1";
        existing.el.style.boxShadow = `0 0 20px ${borderColor}40`;
        existing.el.style.animation = member.online ? "map-marker-pulse 2s infinite" : "none";
      } else {
        // Create marker once
        const el = document.createElement("div");
        el.className = "map-marker";
        el.style.cssText = `width:42px;height:42px;border-radius:50%;border:3px solid ${borderColor};background:${avatarUrl ? `url(${avatarUrl}) center/cover` : "#1a1a2e"};box-shadow:0 0 20px ${borderColor}40;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:${isSelected ? 10 : 1};${member.online ? "animation:map-marker-pulse 2s infinite;" : ""}`;

        if (!avatarUrl) {
          el.innerHTML = '<svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>';
        }

        el.addEventListener("click", () => {
          setSelectedDriver(member);
          setTrackedTmpPlayer(null);
          map.flyTo({ center: [lng, lat], zoom: 12, duration: 1500, anchor: getMapAnchor() });
        });

        const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
        driverMarkersMapRef.current.set(driverId, { marker, el });
      }
    });

    // Remove obsolete markers
    driverMarkersMapRef.current.forEach((val, id) => {
      if (!activeDriverIds.has(id)) {
        val.marker.remove();
        driverMarkersMapRef.current.delete(id);
      }
    });
  }, [mapData, selectedDriver, getMapAnchor]);


  // GPU-Accelerated WebGL Traffic Layer (Zero Lag / 60 FPS)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const cleanupLayers = () => {
      if (map.getLayer('traffic-labels')) map.removeLayer('traffic-labels');
      if (map.getLayer('traffic-warning-icons')) map.removeLayer('traffic-warning-icons');
      if (map.getSource('traffic-data')) map.removeSource('traffic-data');
    };

    if (!showTraffic || !trafficData || trafficData.length === 0) {
      cleanupLayers();
      return;
    }

    const features: any[] = [];
    trafficData.forEach((countryItem: any) => {
      const locs = countryItem.locations || [];
      locs.forEach((loc: any) => {
        let lat: number | null = null;
        let lng: number | null = null;

        const locLower = (loc.name || '').toLowerCase().trim();
        if (SPECIAL_ROAD_COORDS[locLower]) {
          [lat, lng] = SPECIAL_ROAD_COORDS[locLower];
        } else {
          const city = findCity(loc.name);
          if (city) {
            lat = city.lat;
            lng = city.lng;
          }
        }

        if (lat == null || lng == null) return;

        const isJam = loc.trafficJams > 0 || loc.severity === 'Congested' || loc.severity === 'Heavy' || loc.severity === 'Jam';
        const isModerate = loc.severity === 'Moderate';

        // Grün (Freie Fahrt) komplett ausblenden! Nur Rot (Stau) und Orange (Zähfließend) anzeigen!
        if (!isJam && !isModerate) return;

        const color = isJam ? '#ff0033' : '#f59e0b';
        const cleanName = loc.name.replace(/\s*\((City|Road)\)/i, '');
        const labelText = `${cleanName} (${loc.players} 🚗)`;

        features.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          properties: {
            name: loc.name,
            cleanName,
            country: loc.country,
            players: loc.players,
            trafficJams: loc.trafficJams,
            playersStuck: loc.playersInvolvedInTrafficJams || 0,
            averageSpeed: Math.round(loc.averageSpeed || 0),
            severity: loc.severity,
            color,
            isJam: isJam ? 1 : 0,
            isModerate: isModerate ? 1 : 0,
            label: labelText
          }
        });
      });
    });

    const geojson = {
      type: 'FeatureCollection',
      features
    };

    if (map.getSource('traffic-data')) {
      (map.getSource('traffic-data') as any).setData(geojson);
    } else {
      map.addSource('traffic-data', {
        type: 'geojson',
        data: geojson
      });

      // Zentriertes Ausrufezeichen-Schild Icon Layer (Ohne Glow)
      map.addLayer({
        id: 'traffic-warning-icons',
        type: 'symbol',
        source: 'traffic-data',
        minzoom: 1.0,
        layout: {
          'text-field': '⚠️',
          'text-size': ['interpolate', ['linear'], ['zoom'], 1, 14, 5, 20, 9, 26, 12, 34],
          'text-anchor': 'center',
          'text-offset': [0, 0],
          'text-allow-overlap': true,
          'text-ignore-placement': true
        },
        paint: {
          'text-color': ['get', 'color'],
          'text-halo-color': '#000000',
          'text-halo-width': 3.0
        }
      });

      // High Visibility Traffic Labels
      map.addLayer({
        id: 'traffic-labels',
        type: 'symbol',
        source: 'traffic-data',
        minzoom: 3.5,
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 3.5, 10, 8, 12, 12, 15],
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 3.5
        }
      });

      // Click handler for popup
      map.on('click', 'traffic-warning-icons', (e: any) => {
        if (!e.features || e.features.length === 0) return;
        const feat = e.features[0];
        const props = feat.properties;
        const coords = feat.geometry.coordinates.slice();
        const speedVal = props.averageSpeed || 0;
        const speedText = speedVal > 0 
          ? `${speedVal} km/h`
          : (props.isJam ? '< 15 km/h (Stau)' : '~45 km/h (Zähfließend)');

        const popupHtml = `
          <div class="frosted-card" style="padding: 16px; min-width: 230px; color: #fff; font-family: system-ui, -apple-system, sans-serif;">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
              <div style="font-weight:900; font-size:14px; color:#f59e0b; letter-spacing:-0.2px;">${props.cleanName || props.name}</div>
              <span style="font-size:9px; font-weight:900; text-transform:uppercase; padding:3px 8px; border-radius:20px; background:${props.color}25; color:${props.color}; border:1px solid ${props.color}50;">${props.severity}</span>
            </div>
            <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">${props.country}</div>
            
            <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:10px 12px;">
              <div style="font-size:11px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#cbd5e1; font-weight:600;">Fahrer in Region:</span>
                <strong style="color:#fff; font-weight:800;">${props.players} 🚗</strong>
              </div>
              <div style="font-size:11px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="color:#cbd5e1; font-weight:600;">Staus:</span>
                <strong style="color:${props.isJam ? '#ef4444' : '#f59e0b'}; font-weight:800;">${props.trafficJams} (${props.playersStuck} im Stau)</strong>
              </div>
              <div style="font-size:11px; display:flex; justify-content:space-between; align-items:center;">
                <span style="color:#cbd5e1; font-weight:600;">Verkehrsfluss / Tempo:</span>
                <strong style="color:${props.isJam ? '#ef4444' : '#f59e0b'}; font-weight:800;">${speedText}</strong>
              </div>
            </div>
          </div>
        `;

        if (currentPopupRef.current) {
          currentPopupRef.current.remove();
        }
        const popup = new (maplibregl as any).Popup({ offset: [0, -10], closeButton: false, className: 'frosted-map-popup' })
          .setLngLat(coords)
          .setHTML(popupHtml)
          .addTo(map);
        currentPopupRef.current = popup;
      });

      map.on('mouseenter', 'traffic-warning-icons', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'traffic-warning-icons', () => {
        map.getCanvas().style.cursor = '';
      });
    }
  }, [showTraffic, trafficData]);

  // Extract all traffic hotspots
  const allTrafficLocations: any[] = [];
  trafficData.forEach((c: any) => {
    (c.locations || []).forEach((l: any) => {
      const isJam = l.trafficJams > 0 || l.severity === 'Congested' || l.severity === 'Heavy' || l.severity === 'Jam';
      const isModerate = l.severity === 'Moderate';
      if (isJam || isModerate) {
        allTrafficLocations.push({ ...l, country: c.country || c.name });
      }
    });
  });

  const trafficHotspots = [...allTrafficLocations].sort((a: any, b: any) => {
    if (b.trafficJams !== a.trafficJams) return b.trafficJams - a.trafficJams;
    return b.players - a.players;
  });

  const totalTrafficJams = allTrafficLocations.reduce((sum: number, l: any) => sum + (l.trafficJams || 0), 0);

  const triggerHotspotClick = (hotspot: any) => {
    const map = mapRef.current;
    if (!map) return;

    let lat: number | null = null;
    let lng: number | null = null;
    const locLower = (hotspot.name || '').toLowerCase().trim();
    if (SPECIAL_ROAD_COORDS[locLower]) {
      [lat, lng] = SPECIAL_ROAD_COORDS[locLower];
    } else {
      const c = findCity(hotspot.name);
      if (c) { lat = c.lat; lng = c.lng; }
    }

    if (lat != null && lng != null) {
      map.flyTo({ center: [lng, lat], zoom: 9, speed: 1.5 });

      const isJam = hotspot.trafficJams > 0 || hotspot.severity === 'Congested' || hotspot.severity === 'Heavy' || hotspot.severity === 'Jam';
      const isModerate = hotspot.severity === 'Moderate';
      const speedVal = hotspot.averageSpeed || 0;
      const speedText = speedVal > 0 
        ? `${Math.round(speedVal)} km/h`
        : (isJam ? '< 15 km/h (Stau)' : '~45 km/h (Zähfließend)');

      const popupHtml = `
        <div class="frosted-card" style="padding: 16px; min-width: 230px; color: #fff; font-family: system-ui, -apple-system, sans-serif;">
          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:6px;">
            <div style="font-weight:900; font-size:14px; color:#f59e0b; letter-spacing:-0.2px;">${hotspot.name.replace(/\s*\((City|Road)\)/i, '')}</div>
            <span style="font-size:9px; font-weight:900; text-transform:uppercase; padding:3px 8px; border-radius:20px; background:${isJam ? '#ff003325' : '#f59e0b25'}; color:${isJam ? '#ff0033' : '#f59e0b'}; border:1px solid ${isJam ? '#ff003350' : '#f59e0b50'};">${hotspot.severity}</span>
          </div>
          <div style="font-size:10px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">${hotspot.country}</div>
          
          <div style="background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:10px 12px;">
            <div style="font-size:11px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="color:#cbd5e1; font-weight:600;">Fahrer in Region:</span>
              <strong style="color:#fff; font-weight:800;">${hotspot.players} 🚗</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="color:#cbd5e1; font-weight:600;">Staus:</span>
              <strong style="color:${isJam ? '#ef4444' : '#f59e0b'}; font-weight:800;">${hotspot.trafficJams || 0} (${hotspot.playersInvolvedInTrafficJams || 0} im Stau)</strong>
            </div>
            <div style="font-size:11px; display:flex; justify-content:space-between; align-items:center;">
              <span style="color:#cbd5e1; font-weight:600;">Verkehrsfluss / Tempo:</span>
              <strong style="color:${isJam ? '#ef4444' : '#f59e0b'}; font-weight:800;">${speedText}</strong>
            </div>
          </div>
        </div>
      `;

      if (currentPopupRef.current) {
        currentPopupRef.current.remove();
      }
      const popup = new (maplibregl as any).Popup({ offset: [0, -10], closeButton: false, className: 'frosted-map-popup' })
        .setLngLat([lng, lat])
        .setHTML(popupHtml)
        .addTo(map);
      currentPopupRef.current = popup;
    }
  };

  const onlineCount = mapData.filter(m => m.online).length;

  return (

    <div className="flex h-full w-full !p-0 overflow-hidden relative">
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Map Overlays */}
        <div className="absolute top-24 left-6 z-30 flex flex-col gap-2">
          <div className="frosted-card !p-3.5 backdrop-blur-xl shadow-2xl border border-white/5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest mb-1">Live Karte</h3>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{onlineCount} Fahrer aktiv</span>
              </div>
            </div>
            <button
              onClick={() => { setLoading(true); fetchData(); if (showTraffic) fetchTraffic(); }}
              className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all border border-white/5 cursor-pointer shrink-0"
              title="Karte & Daten aktualisieren"
            >
              <RefreshCw size={14} className={loading || trafficLoading ? "animate-spin text-amber-400" : ""} />
            </button>
          </div>

          {/* Traffic & Map Layer Control Card */}
          <div className="frosted-card !p-2.5 backdrop-blur-xl shadow-2xl border border-white/10 flex flex-col gap-2 transition-all">
            <button
              onClick={() => setControlsOpen(!controlsOpen)}
              className="flex items-center justify-between gap-3 w-full px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all cursor-pointer bg-white/[0.02] hover:bg-white/5"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={14} className="text-amber-400" />
                <span className="font-unbounded tracking-wider uppercase text-[10px]">Ebenen & Filter</span>
                <div className="flex items-center gap-1 ml-1.5">
                  {showTraffic && <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.8)]" title="Staus aktiv" />}
                  {is3DMode && <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]" title="3D Ansicht aktiv" />}
                </div>
              </div>
              <ChevronDown size={14} className={`transition-transform duration-300 ${controlsOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {controlsOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-2.5 pt-2 border-t border-white/5"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <button
                      onClick={() => setShowTraffic(!showTraffic)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        showTraffic
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                          : "bg-white/5 text-slate-400 border border-white/5 hover:text-white"
                      }`}
                    >
                      <AlertTriangle size={14} className={showTraffic ? "text-amber-400" : ""} />
                      <span>Staus {totalTrafficJams > 0 ? `(${totalTrafficJams})` : ""}</span>
                    </button>

                    <button
                      onClick={() => {
                        const next = !showSpeedcams;
                        setShowSpeedcams(next);
                        if (mapRef.current) {
                          const vis = next ? 'visible' : 'none';
                          if (mapRef.current.getLayer('ets2-speedcams')) {
                            mapRef.current.setLayoutProperty('ets2-speedcams', 'visibility', vis);
                          }
                          if (mapRef.current.getLayer('ets2-speedcams-limit')) {
                            mapRef.current.setLayoutProperty('ets2-speedcams-limit', 'visibility', vis);
                          }
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        showSpeedcams
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.25)]"
                          : "bg-white/5 text-slate-400 border border-white/5 hover:text-white"
                      }`}
                      title="Feste Geschwindigkeitsblitzer & Tempolimits an-/ausschalten"
                    >
                      <Camera size={14} className={showSpeedcams ? "text-rose-400" : ""} />
                      <span>Blitzer</span>
                    </button>

                    <button
                      onClick={toggleTerrain3D}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        showTerrain3D
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                          : "bg-white/5 text-slate-400 border border-white/5 hover:text-white"
                      }`}
                      title="3D Gelände (Berge, Relief & Höhenringe) an-/ausschalten"
                    >
                      <Mountain size={14} className={showTerrain3D ? "text-amber-400" : ""} />
                      <span>3D Gelände</span>
                    </button>

                    <button
                      onClick={toggle3dMode}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        is3DMode
                          ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                          : "bg-white/5 text-slate-400 border border-white/5 hover:text-white"
                      }`}
                      title="3D Kamera-Perspektive umschalten (Kippwinkel & Neigung)"
                    >
                      <Box size={14} className={is3DMode ? "text-cyan-400" : ""} />
                      <span>3D Kamera</span>
                    </button>
                  </div>


                  {showTraffic && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div>
                          <ServerDropdown
                            value={trafficServer}
                            onChange={setTrafficServer}
                            servers={trafficServers}
                          />
                        </div>

                        <button
                          onClick={() => setTrafficHotspotsOpen(!trafficHotspotsOpen)}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold transition-all flex items-center gap-1 ${
                            trafficHotspotsOpen
                              ? "bg-primary/20 text-primary border-primary/30"
                              : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10"
                          }`}
                        >
                          <List size={12} />
                          Top Hotspots
                        </button>
                      </div>

                <AnimatePresence>
                  {trafficHotspotsOpen && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden flex flex-col w-full max-h-60 mt-1.5"
                    >
                      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                        {trafficHotspots.slice(0, 15).map((hotspot: any, idx: number) => {
                          const isJam = hotspot.trafficJams > 0 || hotspot.severity === 'Congested' || hotspot.severity === 'Heavy';
                          const isModerate = hotspot.severity === 'Moderate';
                          const speedVal = hotspot.averageSpeed || 0;
                          const speedText = speedVal > 0 
                            ? `${Math.round(speedVal)} km/h`
                            : (isJam ? '< 15 km/h' : isModerate ? '~45 km/h' : 'Flüssig');

                          return (
                            <button
                              key={idx}
                              onClick={() => triggerHotspotClick(hotspot)}
                              className="w-full text-left p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/5 border border-white/5 transition-all flex flex-col gap-1 group cursor-pointer"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[11px] font-bold text-white truncate group-hover:text-amber-400 transition-colors">
                                    {hotspot.name.replace(/\s*\((City|Road)\)/i, '')}
                                  </p>
                                  <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">{hotspot.country}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${
                                    isJam ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-500/20 text-amber-400"
                                  }`}>
                                    {hotspot.players} 🚗
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-[8px] text-slate-400 pt-1 border-t border-white/5 font-semibold">
                                <span>{hotspot.trafficJams > 0 ? `${hotspot.trafficJams} Staus (${hotspot.playersInvolvedInTrafficJams || 0} im Stau)` : 'Freie Fahrt'}</span>
                                <span className={isJam ? 'text-red-400' : 'text-slate-350'}>{speedText}</span>
                              </div>
                            </button>
                          );
                        })}

                        {trafficHotspots.length === 0 && (
                          <p className="text-center text-[10px] text-slate-500 py-3 font-bold uppercase">Keine aktiven Staus</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
</div>

      {/* Sidebar */}
      <div className={`absolute top-0 right-0 bottom-0 w-80 border-l border-white/5 bg-zinc-950/80 backdrop-blur-2xl flex flex-col shrink-0 transition-transform duration-500 z-50 pt-20 ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Fahrer ({filteredDrivers.length})</h2>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Seitenleiste schließen"
            >
              <X size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fahrer oder TMP ID suchen..."
              className="w-full bg-black/30 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-600 focus:border-[#f59e0b]/30 outline-none transition-all"
            />
          </div>

          {search.trim().length > 0 && /^\d+$/.test(search.trim()) && (
            <button
              onClick={() => trackTmpPlayer(search.trim())}
              disabled={trackingLoading}
              className="w-full flex items-center justify-between gap-2 p-2.5 mt-2.5 rounded-xl bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary font-bold text-xs transition-all shadow-lg cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Radio size={14} className="text-primary animate-pulse shrink-0" />
                <span className="truncate">TruckersMP ID #{search.trim()} orten</span>
              </div>
              {trackingLoading ? <RefreshCw size={14} className="animate-spin text-primary shrink-0" /> : <Navigation size={14} className="text-primary shrink-0" />}
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredDrivers.map(m => {
            const hasPos = (m.online && m.live_location) || m.last_position;
            const loc = m.online ? m.live_location : m.last_position;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedDriver(m);
                  setTrackedTmpPlayer(null); // Close TruckersMP tracking card when a driver is selected
                  if (hasPos && mapRef.current) {
                    let lat = loc.lat;
                    let lng = loc.lng;
                    if (loc.game_x != null && loc.game_y != null) {
                      const projected = projectGameToLatLng(loc.game_x, loc.game_y);
                      if (projected) {
                        [lat, lng] = projected;
                      }
                    }
                    if (lat != null && lng != null) {
                      mapRef.current.flyTo({ center: [lng, lat], zoom: 12, duration: 1500 });
                    }
                  }
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${selectedDriver?.id === m.id ? "bg-primary/10 border-primary/20" : "bg-white/[0.02] border-white/5 hover:bg-white/5"}`}
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full bg-zinc-900 border-2 overflow-hidden flex items-center justify-center transition-all ${m.online ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-[pulse_2s_infinite]" : "border-white/10"}`}>
                    {getAvatarUrlLocal(m.avatar_url) ? <img src={getAvatarUrlLocal(m.avatar_url)!} className="w-full h-full object-cover" /> : <Truck size={18} className="text-slate-600" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-white truncate">{m.name}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">{m.role || 'Fahrer'}</p>
                  <div className="mt-1">
                    {m.online ? (
                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-tighter">Online</span>
                    ) : (
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-tighter">
                        {m.lastSeen
                          ? `Zuletzt: ${new Date(m.lastSeen).toLocaleString("de-DE", { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                          : "Offline"}
                      </span>
                    )}
                  </div>
                  {loc?.city && (
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      <p className="text-[9px] text-primary font-bold truncate">{capitalize(loc.city)}{loc.country ? `, ${capitalize(loc.country)}` : ""}</p>
                      {m.online && (
                        <>
                          <span className="text-slate-800 text-[8px] shrink-0">•</span>
                          <p className={`text-[9px] font-bold uppercase truncate ${m.job ? "text-slate-400" : "text-slate-600"}`}>
                            {m.job ? m.job.destination : "Kein Job"}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight size={14} className="text-slate-700" />
              </button>
            );
          })}
          {filteredDrivers.length === 0 && (
            <p className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-widest py-8">Keine Fahrer gefunden</p>
          )}
        </div>
      </div>

      {/* Tracked TruckersMP Player Detail Card (Top-Level) */}
      <AnimatePresence>
        {trackedTmpPlayer && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            style={{ right: sidebarOpen ? "340px" : "24px" }}
            className="absolute bottom-6 z-[9999] w-80 frosted-card !p-0 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-500"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-60" />

            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-14 h-14 rounded-2xl bg-zinc-900 border-2 overflow-hidden flex items-center justify-center transition-all shrink-0 ${trackedTmpPlayer.online ? "border-primary shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-[pulse_2s_infinite]" : "border-white/10"}`}>
                    {trackedTmpPlayer.avatar ? (
                      <img src={trackedTmpPlayer.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center font-black text-primary text-xl">
                        {(trackedTmpPlayer.name || "T").charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-unbounded text-sm font-black text-white uppercase tracking-tight italic truncate">
                      {trackedTmpPlayer.name || `TruckersMP #${trackedTmpPlayer.tmp_id}`}
                    </h4>
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-0.5 truncate">
                      {trackedTmpPlayer.group || 'TruckersMP Spieler'} • #{trackedTmpPlayer.tmp_id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setTrackedTmpPlayer(null)}
                  className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-colors group shrink-0"
                  title="Ortung beenden"
                >
                  <X size={18} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              {trackingLoading ? (
                <div className="flex items-center justify-center py-6 gap-2 text-slate-400 text-xs font-bold">
                  <RefreshCw size={16} className="animate-spin text-primary" />
                  <span>Suche Live Position...</span>
                </div>
              ) : trackingError ? (
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">
                  {trackingError}
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Status & Speed */}
                  <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${trackedTmpPlayer.online ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" : "bg-slate-600"}`} />
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {trackedTmpPlayer.online ? "In Fahrt (Online)" : "Außer Dienst (Offline)"}
                      </span>
                    </div>
                    {trackedTmpPlayer.online && (
                      <div className="flex items-center gap-2 text-primary">
                        <Gauge size={14} />
                        <span className="text-sm font-black italic tracking-tighter">
                          {Math.round(trackedTmpPlayer.speed || 0)} <span className="text-[9px] not-italic text-slate-500">KM/H</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Server / Mode */}
                  {trackedTmpPlayer.online && (
                    <div className="flex items-center gap-2.5 p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                      <Globe size={14} className="text-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">TruckersMP Server</p>
                        <p className="text-[10px] font-bold text-white leading-none truncate">{trackedTmpPlayer.server_name || "Simulation"}</p>
                      </div>
                    </div>
                  )}

                  {/* Location */}
                  <div className="flex items-start gap-3.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group/loc">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover/loc:bg-primary/10 transition-colors" />
                    <MapPin size={18} className="text-primary shrink-0 mt-0.5 relative z-10" />
                    <div className="min-w-0 relative z-10">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Aktuelle Position</p>
                      <p className="text-xs font-bold text-white leading-tight">
                        {trackedTmpPlayer.city ? `${trackedTmpPlayer.city}${trackedTmpPlayer.country ? `, ${trackedTmpPlayer.country}` : ''}` : 'Unterwegs auf den Straßen'}
                      </p>
                    </div>
                  </div>

                  {/* Auto Follow & Refresh Controls */}
                  {trackedTmpPlayer.online && (
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <button
                        onClick={() => setAutoFollow(!autoFollow)}
                        className={`flex-1 py-2.5 px-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          autoFollow
                            ? 'bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/20'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:text-white'
                        }`}
                      >
                        <Navigation size={14} className={autoFollow ? 'animate-bounce' : ''} />
                        <span>{autoFollow ? 'Kamera Folgt' : 'Kamera Folgen'}</span>
                      </button>
                      <button
                        onClick={() => trackTmpPlayer(trackedTmpPlayer.tmp_id)}
                        className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
                        title="Jetzt aktualisieren"
                      >
                        <RefreshCw size={14} className={trackingLoading ? "animate-spin" : ""} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Driver Detail Card */}
      <AnimatePresence>
         {selectedDriver && (
           <motion.div
             key={selectedDriver.id}
             initial={{ opacity: 0, x: 20, scale: 0.95 }}
             animate={{ opacity: 1, x: 0, scale: 1 }}
             exit={{ opacity: 0, x: 20, scale: 0.95 }}
             style={{ right: sidebarOpen ? "340px" : "24px" }}
             className="absolute bottom-6 z-[9999] w-80 frosted-card !p-0 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-500"
           >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div
                  className="flex items-center gap-3 cursor-pointer group/profile"
                  onClick={() => onViewProfile?.(selectedDriver.id)}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-zinc-900 border-2 overflow-hidden flex items-center justify-center transition-all ${selectedDriver.online ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "border-white/10"} group-hover/profile:border-primary/50 transition-colors`}>
                    {getAvatarUrlLocal(selectedDriver.avatar_url) ? (
                      <img src={getAvatarUrlLocal(selectedDriver.avatar_url)!} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center font-black text-primary text-xl">{(selectedDriver.name || selectedDriver.username)?.charAt(0)}</div>
                    )}
                  </div>
                  <div>
                    <h4 className="font-unbounded text-sm font-black text-white uppercase tracking-tight italic group-hover/profile:text-primary transition-colors">{selectedDriver.name}</h4>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-0.5">{selectedDriver.role || 'Fahrer'}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedDriver(null)} className="p-2 hover:bg-white/5 rounded-xl text-slate-500 transition-colors group">
                  <X size={18} className="group-hover:rotate-90 transition-transform" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Status & Speed */}
                <div className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${selectedDriver.online ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]" : "bg-slate-600"}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{selectedDriver.online ? "In Fahrt" : "Außer Dienst"}</span>
                  </div>
                  {selectedDriver.online && (
                    <div className="flex items-center gap-2 text-primary">
                      <Gauge size={14} />
                      <span className="text-sm font-black italic tracking-tighter">{Math.round(selectedDriver.speed || 0)} <span className="text-[9px] not-italic text-slate-500">KM/H</span></span>
                    </div>
                  )}
                </div>

                {/* Server / Mode */}
                {selectedDriver.online && selectedDriver.server_name && (
                  <div className="flex items-center gap-2.5 p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                    <Globe size={14} className="text-primary" />
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-0.5">Server / Modus</p>
                      <p className="text-[10px] font-bold text-white leading-none">{selectedDriver.server_name}</p>
                    </div>
                  </div>
                )}

                {/* Vehicle Info */}
                {selectedDriver.online && (selectedDriver.brand || selectedDriver.model) && (
                  <div className="mt-2 text-[9px] text-slate-300 uppercase">
                    Fahrzeug: {selectedDriver.brand || ""}{selectedDriver.brand && selectedDriver.model ? " " : ""}{selectedDriver.model || "Unbekannt"}
                  </div>
                )}
                {/* Location */}
                <div className="flex items-start gap-3.5 p-4 bg-white/[0.02] border border-white/5 rounded-2xl relative overflow-hidden group/loc">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover/loc:bg-primary/10 transition-colors" />
                  <MapPin size={18} className="text-primary shrink-0 mt-0.5 relative z-10" />
                  <div className="min-w-0 relative z-10">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1.5">Aktuelle Position</p>
                    <p className="text-xs font-bold text-white leading-tight">
                      {selectedDriver.online
                        ? `${capitalize(selectedDriver.live_location?.city) || "Unbekannt"}${selectedDriver.live_location?.country ? `, ${capitalize(selectedDriver.live_location.country)}` : ""}`
                        : `${capitalize(selectedDriver.last_position?.city) || "Keine Daten"}${selectedDriver.last_position?.country ? `, ${capitalize(selectedDriver.last_position.country)}` : ""}`}
                    </p>
                  </div>
                </div>

                {/* Job Info */}
                {selectedDriver.online && selectedDriver.job ? (
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 rounded-2xl space-y-4">
                    <div className="flex items-center gap-2">
                      <Package size={14} className="text-primary" />
                      <p className="text-[10px] font-black text-primary uppercase tracking-widest">Fracht-Manifest</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-bold text-white leading-tight">{selectedDriver.job.cargo || "Fracht"}</p>
                      {selectedDriver.job.cargo_mass && (
                        <p className="text-[10px] font-black text-emerald-500/80 uppercase tracking-tighter italic">{selectedDriver.job.cargo_mass} Tonnen</p>
                      )}
                    </div>

                    <div className="pt-3.5 border-t border-white/10 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Herkunft</p>
                        <p className="text-[10px] font-bold text-white truncate">{selectedDriver.job.source || "Unbekannt"}</p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                        <ArrowRight size={12} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        <p className="text-[8px] font-black text-slate-600 uppercase mb-1">Zielort</p>
                        <p className="text-[10px] font-bold text-white truncate">{selectedDriver.job.destination || "Ziel unbekannt"}</p>
                      </div>
                    </div>
                  </div>
                ) : selectedDriver.online ? (
                  <div className="p-4 bg-white/[0.02] border border-white/5 border-dashed rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Keine aktive Fracht</p>
                  </div>
                ) : (
                  <div className="p-4 bg-white/[0.02] border border-white/5 border-dashed rounded-2xl text-center">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Kein Job</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="absolute top-24 right-6 z-30 w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center shadow-2xl transition-all hover:scale-110"
        >
          <Users size={20} />
        </button>
      )}

      <style>{`
        @keyframes map-marker-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .maplibregl-ctrl-bottom-right { margin-right: 20px; margin-bottom: 20px; }
        .maplibregl-ctrl-bottom-left { margin-left: 20px; margin-bottom: 20px; }
        .maplibregl-ctrl-attrib { display: none !important; }
        .maplibregl-ctrl-group { background: rgba(0,0,0,0.6) !important; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; }
        .maplibregl-ctrl-group button { border-color: rgba(255,255,255,0.05) !important; }
      `}</style>
    </div>
  );
};

export default Map;