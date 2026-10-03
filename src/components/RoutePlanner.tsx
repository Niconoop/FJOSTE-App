import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as pmtiles from 'pmtiles';
import { 
  X, MapPin, Trash2, ChevronUp, ChevronDown, Check, 
  Search, Camera, Loader2, Maximize2, Minimize2, 
  ArrowRight, Sparkles, Navigation, Plus, Flag,
  RotateCcw, CheckCircle2, Image as ImageIcon, Download
} from 'lucide-react';
import { toast } from 'sonner';

import { useTheme, hexToRgbValues } from '../context/ThemeContext';
import { API_URL } from '../config';
import { 
  projectLatLngToGame, 
  projectGameToLngLat, 
  projectGameToLatLng 
} from '../utils/projections';
import { smoothRouteCoords } from '../utils/routeSmoother';
import { 
  searchDestinations, 
  findCity, 
  findClosestCity,
  COMMON_CITIES,
  loadAllCities,
} from '../data/ets2Cities';
import type { DestinationSearchResult } from '../data/ets2Cities';

// PMTiles registration helper
let pmTilesProtocolAdded = false;
function addPmTilesProtocol() {
  if (pmTilesProtocolAdded) return;
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', (params: any, abortController: any) => protocol.tile(params, abortController));
  pmTilesProtocolAdded = true;
}

export interface RouteWaypoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  gx: number;
  gz: number;
}

export interface RoutePlannerProps {
  organizer?: string;
  eventTitle?: string;
  startDate?: string;
  server?: string;
  game?: string;
  startCity?: string;
  startCompany?: string;
  endCity?: string;
  endCompany?: string;
  isFullscreen: boolean;
  onToggleFullscreen: (fullscreen: boolean) => void;
  initialWaypoints?: RouteWaypoint[];
  onWaypointsChange?: (waypoints: RouteWaypoint[]) => void;
  onRouteGenerated?: (file: File, meta: {
    distanceKm: number;
    durationMinutes: number;
    startCity: string;
    endCity: string;
    startCompany?: string;
    endCompany?: string;
    waypoints: RouteWaypoint[];
  }) => void;
  generatedRouteMeta?: {
    distanceKm: number;
    durationMinutes: number;
    startCity: string;
    endCity: string;
    startCompany?: string;
    endCompany?: string;
  } | null;
  onExportImage?: (file: File, meta: any) => void;
  captureButtonText?: string;
  hideCloseButton?: boolean;
}

const getElectronAPI = () => {
  try {
    if (typeof window !== 'undefined') {
      // Prefer the contextBridge-exposed electronAPI (works with contextIsolation)
      const api = (window as any).electronAPI;
      if (api?.invoke) return api;
      // Fallback: direct require (only available without contextIsolation)
      const electron = (window as any).require ? (window as any).require('electron') : null;
      return electron?.ipcRenderer || null;
    }
  } catch {}
  return null;
};

function closestPointOnSegment(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number
): [number, number, number] {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const distSq = (px - ax) ** 2 + (py - ay) ** 2;
    return [ax, ay, distSq];
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  const distSq = (px - projX) ** 2 + (py - projY) ** 2;
  return [projX, projY, distSq];
}

function createRoutePlannerStyle(): maplibregl.StyleSpecification {
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
      exaggeration: 1.8,
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': '#06080e',
        },
      },
      {
        id: 'world-land',
        type: 'fill',
        source: 'world',
        'source-layer': 'land',
        paint: {
          'fill-color': '#0b111c',
        },
      },
      {
        id: 'world-water',
        type: 'fill',
        source: 'world',
        'source-layer': 'water',
        paint: {
          'fill-color': '#030508',
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
          'line-color': '#111827',
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 1.2,
            7, 3.8,
            11, 8.0,
            14, 15.0
          ],
          'line-opacity': 0.9,
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
            'freeway', '#2563eb',
            'divided', '#475569',
            'local', '#64748b',
            '#334155'
          ],
          'line-width': [
            'interpolate', ['linear'], ['zoom'],
            3, 0.8,
            7, 2.4,
            11, 5.0,
            14, 10.0
          ],
          'line-opacity': 0.85,
        },
      },
      {
        id: 'ets2-ferries',
        type: 'line',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'type'], 'ferry']],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 1.5,
          'line-dasharray': [2, 4],
          'line-opacity': 0.6,
        },
      },
      {
        id: 'ets2-cities-points',
        type: 'circle',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'Point'], ['==', ['get', 'type'], 'city']],
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            3, 2,
            5, 3,
            8, 4.5,
            11, 6
          ],
          'circle-color': '#ffffff',
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#090d16',
        },
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
          'text-size': [
            'interpolate', ['linear'], ['zoom'],
            3, 8.5,
            5, 11,
            8, 13.5,
            11, 16
          ],
          'text-anchor': 'left',
          'text-offset': [0.65, 0],
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'text-padding': 6,
          'text-transform': 'uppercase',
          'text-letter-spacing': 0.06,
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#06080e',
          'text-halo-width': 2.2,
        },
      },
    ],
  };
}

export const RoutePlanner = ({
  organizer = 'Open Pipe Club',
  eventTitle,
  startDate,
  server,
  game,
  startCity,
  startCompany,
  endCity,
  endCompany,
  isFullscreen,
  onToggleFullscreen,
  initialWaypoints,
  onWaypointsChange,
  onRouteGenerated,
  generatedRouteMeta,
  onExportImage,
  captureButtonText,
  hideCloseButton = false,
}: RoutePlannerProps) => {
  const { appearance, effectiveGlowColor } = useTheme();
  const accentColor = appearance?.accentColor || '#f59e0b';
  const accentRgb = hexToRgbValues(accentColor);
  const glowColor = effectiveGlowColor || accentColor;
  const glowRgb = hexToRgbValues(glowColor);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const waypointsRef = useRef<RouteWaypoint[]>([]);
  useEffect(() => {
    waypointsRef.current = waypoints;
  }, [waypoints]);
  const [distanceKm, setDistanceKm] = useState<number>(0);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);
  const [previewPending, setPreviewPending] = useState<{
    file: File;
    previewUrl: string;
    meta: {
      distanceKm: number;
      durationMinutes: number;
      startCity: string;
      endCity: string;
      startCompany?: string;
      endCompany?: string;
      waypoints: RouteWaypoint[];
    };
  } | null>(null);

  const [routeLngLatCoords, setRouteLngLatCoords] = useState<[number, number][]>([]);
  const [smoothedGameCoords, setSmoothedGameCoords] = useState<[number, number][]>([]);
  const [mapKey, setMapKey] = useState(0);
  const [mapLoaded, setMapLoaded] = useState(false);
  const savedCenterRef = useRef<[number, number] | null>(null);
  const savedZoomRef = useRef<number | null>(null);
  const wasPreviewOpenRef = useRef(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DestinationSearchResult[]>([]);

  // Escape key closes fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onToggleFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, onToggleFullscreen]);

  // Resize observer to handle smooth expansion and container resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const ro = new ResizeObserver(() => {
      mapRef.current?.resize();
    });
    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // Post-fullscreen transition resize trigger
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.resize();
    const t1 = setTimeout(() => mapRef.current?.resize(), 80);
    const t2 = setTimeout(() => mapRef.current?.resize(), 320);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isFullscreen]);

  // Initialize waypoints: load initialWaypoints if provided (e.g. from saved event), else lookup startCity/endCity
  const lastInitialWaypointsRef = useRef<string>('');
  const initializedCitiesRef = useRef(false);

  useEffect(() => {
    if (Array.isArray(initialWaypoints) && initialWaypoints.length > 0) {
      const key = JSON.stringify(initialWaypoints.map(w => w.id || `${w.gx}_${w.gz}`));
      if (key !== lastInitialWaypointsRef.current) {
        lastInitialWaypointsRef.current = key;
        setWaypoints(initialWaypoints);
        return;
      }
    }
    if (lastInitialWaypointsRef.current) return;
    if (initializedCitiesRef.current) return;

    const initialPts: RouteWaypoint[] = [];
    if (startCity) {
      const c1 = findCity(startCity);
      if (c1) {
        initialPts.push({
          id: `wp_init_1`,
          name: c1.realName || startCity,
          lat: c1.lat,
          lng: c1.lng,
          gx: c1.x,
          gz: c1.z,
        });
      }
    }
    if (endCity) {
      const c2 = findCity(endCity);
      if (c2) {
        initialPts.push({
          id: `wp_init_2`,
          name: c2.realName || endCity,
          lat: c2.lat,
          lng: c2.lng,
          gx: c2.x,
          gz: c2.z,
        });
      }
    }
    if (initialPts.length > 0) {
      setWaypoints(initialPts);
      initializedCitiesRef.current = true;
    }
  }, [initialWaypoints, startCity, endCity]);

  // Notify parent component of waypoint updates so they can be saved even without re-rendering screenshot
  useEffect(() => {
    onWaypointsChange?.(waypoints);
  }, [waypoints, onWaypointsChange]);

  // Search cities / companies
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const res = searchDestinations(searchQuery);
    setSearchResults(res.slice(0, 8));
  }, [searchQuery]);

  // Map initialization
  useEffect(() => {
    if (!mapContainerRef.current) return;

    addPmTilesProtocol();

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createRoutePlannerStyle(),
      center: savedCenterRef.current ?? [10.45, 51.16],
      zoom: savedZoomRef.current ?? 5.2,
      preserveDrawingBuffer: true, // Needed for canvas export
      attributionControl: false,
    });

    if (savedCenterRef.current) {
      map.setCenter(savedCenterRef.current);
      savedCenterRef.current = null;
    }
    if (savedZoomRef.current !== null) {
      map.setZoom(savedZoomRef.current);
      savedZoomRef.current = null;
    }

    map.on('load', () => {
      setMapLoaded(true);
      if (!map.getSource('planner-route')) {
        map.addSource('planner-route', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [],
          },
        });

        // Outer glow (radiant purple)
        map.addLayer({
          id: 'planner-route-glow',
          type: 'line',
          source: 'planner-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#a855f7',
            'line-width': 14,
            'line-blur': 6,
            'line-opacity': 0.8,
          },
        });

        // Casing
        map.addLayer({
          id: 'planner-route-casing',
          type: 'line',
          source: 'planner-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#060912',
            'line-width': 7,
            'line-opacity': 1.0,
          },
        });

        // Inner route line (bright purple / lilac)
        map.addLayer({
          id: 'planner-route-line',
          type: 'line',
          source: 'planner-route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': '#c084fc',
            'line-width': 5,
            'line-opacity': 1.0,
          },
        });
      }
    });

    // Road hover cursor styling
    map.on('mouseenter', 'ets2-roads', () => {
      map.getCanvas().style.cursor = 'pointer';
    });
    map.on('mouseleave', 'ets2-roads', () => {
      map.getCanvas().style.cursor = '';
    });

    // Map Click to place Waypoint (Strictly on roads)
    map.on('click', (e) => {
      // 1. Query for roads, ferries, or cities near the clicked point (24px click target tolerance)
      const tolerance = 24;
      const bbox: [maplibregl.PointLike, maplibregl.PointLike] = [
        [e.point.x - tolerance, e.point.y - tolerance],
        [e.point.x + tolerance, e.point.y + tolerance],
      ];

      const features = map.queryRenderedFeatures(bbox).filter(
        (f) =>
          f.layer &&
          (f.layer.id.includes('road') ||
            f.layer.id.includes('ferr') ||
            f.layer.id.includes('cit') ||
            f.source === 'ets2')
      );

      // Only allow waypoints on roads or cities
      if (features.length === 0) {
        toast.warning('Wegpunkte können nur auf Straßen platziert werden.');
        return;
      }

      let lat = e.lngLat.lat;
      let lng = e.lngLat.lng;

      // 2. Snap to the exact nearest road segment or city point
      let minDistanceSq = Infinity;
      let snappedLng = lng;
      let snappedLat = lat;

      for (const feat of features) {
        if (!feat.geometry) continue;

        if (feat.geometry.type === 'Point') {
          const coords = feat.geometry.coordinates as [number, number];
          const distSq = (lng - coords[0]) ** 2 + (lat - coords[1]) ** 2;
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
            snappedLng = coords[0];
            snappedLat = coords[1];
          }
        } else if (feat.geometry.type === 'LineString') {
          const coords = feat.geometry.coordinates as [number, number][];
          for (let i = 0; i < coords.length - 1; i++) {
            const [pLng, pLat, distSq] = closestPointOnSegment(
              lng, lat,
              coords[i][0], coords[i][1],
              coords[i + 1][0], coords[i + 1][1]
            );
            if (distSq < minDistanceSq) {
              minDistanceSq = distSq;
              snappedLng = pLng;
              snappedLat = pLat;
            }
          }
        } else if (feat.geometry.type === 'MultiLineString') {
          const multi = feat.geometry.coordinates as [number, number][][];
          for (const line of multi) {
            for (let i = 0; i < line.length - 1; i++) {
              const [pLng, pLat, distSq] = closestPointOnSegment(
                lng, lat,
                line[i][0], line[i][1],
                line[i + 1][0], line[i + 1][1]
              );
              if (distSq < minDistanceSq) {
                minDistanceSq = distSq;
                snappedLng = pLng;
                snappedLat = pLat;
              }
            }
          }
        }
      }

      if (minDistanceSq < Infinity) {
        lng = snappedLng;
        lat = snappedLat;
      }

      const [gx, gz] = projectLatLngToGame(lat, lng);

      // 3. Consecutive waypoint numbering using fresh waypointsRef
      const currentList = waypointsRef.current;
      const nextNum = currentList.length + 1;
      const nearest = findClosestCity(gx, gz);
      const name = nearest && nearest.distance < 30000 
        ? nearest.city.realName 
        : `Wegpunkt ${nextNum}`;

      const newWp: RouteWaypoint = {
        id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name,
        lat,
        lng,
        gx,
        gz,
      };

      waypointsRef.current = [...currentList, newWp];
      setWaypoints((prev) => [...prev, newWp]);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapKey]);

  // Keep route map lines consistently purple
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer('planner-route-glow')) {
      map.setPaintProperty('planner-route-glow', 'line-color', '#a855f7');
    }
    if (map.getLayer('planner-route-line')) {
      map.setPaintProperty('planner-route-line', 'line-color', '#c084fc');
    }
  }, [mapLoaded]);

  // Update HTML Markers on Map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    waypoints.forEach((wp, index) => {
      const isStart = index === 0;
      const isEnd = index === waypoints.length - 1 && waypoints.length > 1;

      const el = document.createElement('div');
      // Root marker anchor: NO transform or scale classes to avoid interfering with MapLibre coordinates
      el.className = 'route-wp-marker-anchor select-none';
      el.style.cursor = 'pointer';

      let badgeStyle = `background: rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.2); color: ${accentColor}; border: 1px solid rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.5);`;
      let label = isStart ? 'START' : isEnd ? 'ZIEL' : `${index}`;
      let dotColor = `background: ${accentColor}; box-shadow: 0 0 8px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.9);`;

      if (isStart) {
        badgeStyle = 'background: #10b981; color: #000; font-weight: 900;';
        label = 'START';
        dotColor = 'background: #10b981; box-shadow: 0 0 10px rgba(16, 185, 129, 0.9);';
      } else if (isEnd) {
        badgeStyle = 'background: #f43f5e; color: #fff; font-weight: 900;';
        label = 'ZIEL';
        dotColor = 'background: #f43f5e; box-shadow: 0 0 10px rgba(244, 63, 94, 0.9);';
      }

      el.innerHTML = `
        <div class="marker-container flex flex-col items-center pointer-events-auto" style="filter: drop-shadow(0 6px 16px rgba(0,0,0,0.8));">
          <div class="marker-chip" style="display: flex; align-items: center; gap: 6px; padding: 4px 10px 4px 6px; border-radius: 9999px; background: rgba(9, 13, 24, 0.95); backdrop-filter: blur(12px); border: 1.5px solid rgba(255, 255, 255, 0.18); box-shadow: inset 0 1px 1px rgba(255,255,255,0.15); transition: border-color 0.2s ease, box-shadow 0.2s ease;">
            <span style="${badgeStyle} padding: 2px 7px; border-radius: 9999px; font-size: 9px; font-weight: 900; letter-spacing: 0.05em; line-height: 1.2;">
              ${label}
            </span>
            <span style="font-size: 11px; font-weight: 800; color: #ffffff; letter-spacing: 0.02em; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">
              ${wp.name}
            </span>
          </div>
          <div class="marker-arrow" style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid rgba(9, 13, 24, 0.95); margin-top: -1px; transition: border-top-color 0.2s ease;"></div>
          <div class="marker-dot" style="width: 6px; height: 6px; border-radius: 50%; ${dotColor} margin-top: 1px;"></div>
        </div>
      `;

      // Interactive hover glow using the user's custom accent color
      const chip = el.querySelector('.marker-chip') as HTMLElement;
      const arrow = el.querySelector('.marker-arrow') as HTMLElement;
      if (chip && arrow) {
        el.addEventListener('mouseenter', () => {
          chip.style.borderColor = accentColor;
          chip.style.boxShadow = `0 0 20px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.6), inset 0 1px 1px rgba(255,255,255,0.3)`;
          arrow.style.borderTopColor = accentColor;
        });
        el.addEventListener('mouseleave', () => {
          chip.style.borderColor = 'rgba(255, 255, 255, 0.18)';
          chip.style.boxShadow = 'inset 0 1px 1px rgba(255,255,255,0.15)';
          arrow.style.borderTopColor = 'rgba(9, 13, 24, 0.95)';
        });
      }

      const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([wp.lng, wp.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

  }, [waypoints, mapLoaded, accentColor]);

  // Reinitialize map when preview modal closes so the editor is not gray/empty
  useEffect(() => {
    if (previewPending) {
      wasPreviewOpenRef.current = true;
      return;
    }
    if (wasPreviewOpenRef.current) {
      wasPreviewOpenRef.current = false;
      setMapLoaded(false);
      setMapKey((k) => k + 1);
    }
  }, [previewPending]);

  // Calculate Route whenever Waypoints change
  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2) {
      setDistanceKm(0);
      setDurationMinutes(0);
      setRouteLngLatCoords([]);
      setSmoothedGameCoords([]);
      if (mapRef.current?.getSource('planner-route')) {
        (mapRef.current.getSource('planner-route') as maplibregl.GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      return;
    }

    setIsCalculating(true);
    const electronAPI = getElectronAPI();

    try {
      let accumulatedDistanceMeters = 0;
      let accumulatedDurationSeconds = 0;
      const fullRouteGamePoints: [number, number][] = [];

      for (let i = 0; i < waypoints.length - 1; i++) {
        const start = waypoints[i];
        const end = waypoints[i + 1];

        let segmentPoints: [number, number][] = [];

        if (electronAPI) {
          try {
            const res = await electronAPI.invoke('get-route', start.gx, start.gz, end.gx, end.gz);

            if (res?.success && Array.isArray(res.coordinates) && res.coordinates.length >= 2) {
              segmentPoints = res.coordinates;
              accumulatedDistanceMeters += (res.distanceMeters || 0) * 19;
              accumulatedDurationSeconds += ((res.durationSeconds || 0));
            } else if (res && !res.success) {
              console.warn('[RoutePlanner] Route service returned failure:', res.error);
            }
          } catch (ipcErr) {
            console.warn('[RoutePlanner] Electron IPC route segment failed, falling back to straight line:', ipcErr);
          }
        }

        if (segmentPoints.length === 0) {
          const dx = end.gx - start.gx;
          const dz = end.gz - start.gz;
          const dist = Math.sqrt(dx * dx + dz * dz) * 19;
          accumulatedDistanceMeters += dist;

          const straightDuration = (dist / 1000) / 80 * 3600;
          accumulatedDurationSeconds += straightDuration;

          const steps = Math.max(8, Math.floor(dist / 8000));
          for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            segmentPoints.push([start.gx + dx * t, start.gz + dz * t]);
          }
        }

        if (fullRouteGamePoints.length > 0 && segmentPoints.length > 0) {
          fullRouteGamePoints.push(...segmentPoints.slice(1));
        } else {
          fullRouteGamePoints.push(...segmentPoints);
        }
      }

      // Smooth path
      const smoothed = smoothRouteCoords(fullRouteGamePoints);

      // Convert to LngLat
      const lngLatCoords: [number, number][] = [];
      smoothed.forEach(([gx, gz]) => {
        const coord = projectGameToLngLat(gx, gz);
        if (coord) {
          lngLatCoords.push(coord);
        }
      });

      setRouteLngLatCoords(lngLatCoords);
      setSmoothedGameCoords(smoothed);

      let actualDistanceMeters = 0;
      for (let i = 1; i < smoothed.length; i++) {
        const [gx1, gz1] = smoothed[i - 1];
        const [gx2, gz2] = smoothed[i];
        actualDistanceMeters += Math.hypot(gx2 - gx1, gz2 - gz1) * 19;
      }

      const totalKm = Math.round(actualDistanceMeters / 1000);
      setDistanceKm(totalKm);

      const totalMinutes = Math.round(accumulatedDurationSeconds / 60);
      setDurationMinutes(totalMinutes);

      // Update Map Line
      if (mapRef.current?.getSource('planner-route')) {
        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: lngLatCoords,
              },
              properties: {},
            },
          ],
        };
        (mapRef.current.getSource('planner-route') as maplibregl.GeoJSONSource).setData(geojson);
      }
    } catch (err) {
      console.error('[RoutePlanner] Route calculation failed:', err);
      toast.error('Routenberechnung fehlgeschlagen.');
    } finally {
      setIsCalculating(false);
    }
  }, [waypoints]);

  useEffect(() => {
    calculateRoute();
  }, [calculateRoute]);

  // Draw route line whenever coordinates or map readiness change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;
    const source = map.getSource('planner-route');
    if (!source) return;

    if (routeLngLatCoords.length < 2) {
      (source as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: [],
      });
      return;
    }

    (source as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeLngLatCoords,
          },
          properties: {},
        },
      ],
    });
  }, [routeLngLatCoords, mapLoaded]);

  // Fit bounds to entire route
  const fitToRoute = useCallback(() => {
    if (!mapRef.current) return;
    const pts = routeLngLatCoords.length > 0 ? routeLngLatCoords : waypoints.map((w) => [w.lng, w.lat] as [number, number]);
    if (pts.length === 0) return;

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
    pts.forEach(([lng, lat]) => {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    });

    const padding = isFullscreen 
      ? { top: 100, bottom: 100, left: 360, right: 100 }
      : { top: 40, bottom: 60, left: 50, right: 50 };

    mapRef.current.fitBounds(
      [[minLng, minLat], [maxLng, maxLat]],
      { padding, duration: 700 }
    );
  }, [routeLngLatCoords, waypoints, isFullscreen]);

  // Auto-fit to route whenever it updates (embedded mode only)
  useEffect(() => {
    if (!isFullscreen && routeLngLatCoords.length >= 2 && mapLoaded && mapRef.current) {
      const t = setTimeout(() => fitToRoute(), 100);
      return () => clearTimeout(t);
    }
  }, [routeLngLatCoords, isFullscreen, fitToRoute, mapLoaded]);

  // Add waypoint from search result
  const handleAddDestination = (res: DestinationSearchResult) => {
    const latLng = projectGameToLatLng(res.x, res.z);
    if (!latLng) {
      toast.error('Ort konnte nicht auf der Karte lokalisiert werden.');
      return;
    }

    const newWp: RouteWaypoint = {
      id: `wp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: res.title,
      lat: latLng[0],
      lng: latLng[1],
      gx: res.x,
      gz: res.z,
    };

    setWaypoints((prev) => [...prev, newWp]);
    setSearchQuery('');
    setSearchResults([]);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [latLng[1], latLng[0]], zoom: 7.2 });
    }
  };

  const moveWaypoint = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= waypoints.length) return;
    const list = [...waypoints];
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    setWaypoints(list);
  };

  const removeWaypoint = (index: number) => {
    setWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  const clearAllWaypoints = () => {
    setWaypoints([]);
    setRouteLngLatCoords([]);
    setSmoothedGameCoords([]);
    setDistanceKm(0);
    setDurationMinutes(0);
  };

  // --- HELPER FUNCTIONS FOR 4K POSTER GENERATION ---
  const loadCanvasImage = (src: string): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
      setTimeout(() => resolve(null), 2500);
    });
  };

  const formatPosterDate = (dStr?: string) => {
    const d = dStr ? new Date(dStr) : new Date();
    const valid = !isNaN(d.getTime()) ? d : new Date();
    const day = valid.getDate();
    const suffix = (day === 1 || day === 21 || day === 31) ? 'st' : (day === 2 || day === 22) ? 'nd' : (day === 3 || day === 23) ? 'rd' : 'th';
    const month = valid.toLocaleString('en-US', { month: 'long' });
    const year = valid.getFullYear();
    return `${day}${suffix} ${month} ${year}`;
  };

  const formatPosterTime = (dStr?: string) => {
    if (!dStr) return '17:00 UTC';
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return '17:00 UTC';
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm} UTC`;
  };

  const getConvoyMonthYear = (dStr?: string) => {
    const d = dStr ? new Date(dStr) : new Date();
    const valid = !isNaN(d.getTime()) ? d : new Date();
    return `${valid.toLocaleString('en-US', { month: 'long' }).toUpperCase()} ${valid.getFullYear()}`;
  };

  const drawCalendarIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size * 0.085;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const r = size * 0.15;
    const w = size * 0.82;
    const h = size * 0.78;
    const bx = x - w / 2;
    const by = y - h / 2 + size * 0.06;

    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + w - r, by);
    ctx.quadraticCurveTo(bx + w, by, bx + w, by + r);
    ctx.lineTo(bx + w, by + h - r);
    ctx.quadraticCurveTo(bx + w, by + h, bx + w - r, by + h);
    ctx.lineTo(bx + r, by + h);
    ctx.quadraticCurveTo(bx, by + h, bx, by + h - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx + w * 0.28, by - size * 0.1);
    ctx.lineTo(bx + w * 0.28, by + size * 0.06);
    ctx.moveTo(bx + w * 0.72, by - size * 0.1);
    ctx.lineTo(bx + w * 0.72, by + size * 0.06);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bx, by + h * 0.32);
    ctx.lineTo(bx + w, by + h * 0.32);
    ctx.stroke();

    const dotR = size * 0.038;
    for (let c = 0; c < 3; c++) {
      for (let r = 0; r < 2; r++) {
        const dotX = bx + w * 0.25 + c * (w * 0.25);
        const dotY = by + h * 0.52 + r * (h * 0.23);
        ctx.beginPath();
        ctx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  };

  const drawClockIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.09;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y, size * 0.42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - size * 0.24);
    ctx.moveTo(x, y);
    ctx.lineTo(x + size * 0.2, y);
    ctx.stroke();
    ctx.restore();
  };

  const drawDistanceIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size * 0.085;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Center sign pole
    ctx.beginPath();
    ctx.moveTo(x, y - size * 0.44);
    ctx.lineTo(x, y + size * 0.44);
    ctx.stroke();

    // Upper sign pointing right
    ctx.beginPath();
    ctx.moveTo(x - size * 0.06, y - size * 0.34);
    ctx.lineTo(x + size * 0.32, y - size * 0.34);
    ctx.lineTo(x + size * 0.44, y - size * 0.2);
    ctx.lineTo(x + size * 0.32, y - size * 0.06);
    ctx.lineTo(x - size * 0.06, y - size * 0.06);
    ctx.closePath();
    ctx.fill();

    // Lower sign pointing left
    ctx.beginPath();
    ctx.moveTo(x + size * 0.06, y + size * 0.06);
    ctx.lineTo(x - size * 0.32, y + size * 0.06);
    ctx.lineTo(x - size * 0.44, y + size * 0.2);
    ctx.lineTo(x - size * 0.32, y + size * 0.34);
    ctx.lineTo(x + size * 0.06, y + size * 0.34);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  };

  const drawTagIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 4);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = size * 0.085;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const w = size * 0.54;
    const h = size * 0.64;
    const tx = -w / 2;
    const ty = -h / 2;
    const tipH = size * 0.24;

    ctx.beginPath();
    ctx.moveTo(tx, ty + tipH);
    ctx.lineTo(0, ty);
    ctx.lineTo(tx + w, ty + tipH);
    ctx.lineTo(tx + w, ty + h);
    ctx.lineTo(tx, ty + h);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(0, ty + tipH * 0.8, size * 0.075, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawCheckeredBadge = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();

    const cols = 4;
    const cellSize = (r * 2) / cols;
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < cols; j++) {
        ctx.fillStyle = (i + j) % 2 === 0 ? '#ffffff' : '#0f172a';
        ctx.fillRect(cx - r + i * cellSize, cy - r + j * cellSize, cellSize, cellSize);
      }
    }
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  };

  // Generate 4K TruckersMP-Style Convoy Poster image and deliver to form
  const handleGenerateImage = async () => {
    if (!mapRef.current || !mapLoaded || waypoints.length < 2) {
      toast.error('Karte oder Route ist noch nicht bereit.');
      return;
    }

    setIsCapturing(true);

    const map = mapRef.current;
    const container = mapContainerRef.current;

    const prevWidth  = container?.style.width  ?? '';
    const prevHeight = container?.style.height ?? '';
    const prevPos    = container?.style.position ?? '';
    const prevLeft   = container?.style.left ?? '';
    const prevTop    = container?.style.top ?? '';
    const prevVis    = container?.style.visibility ?? '';
    const prevZIdx   = container?.style.zIndex ?? '';

    try {
      if (container) {
        container.style.position   = 'fixed';
        container.style.left       = '0';
        container.style.top        = '0';
        container.style.width      = '100vw';
        container.style.height     = '100vh';
        container.style.visibility = 'visible';
        container.style.zIndex     = '9999';
        map.resize();
      }

      // 1. Center map onto full route with proper poster margins
      let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
      const pts = routeLngLatCoords.length > 0 ? routeLngLatCoords : waypoints.map((w) => [w.lng, w.lat] as [number, number]);
      pts.forEach(([lng, lat]) => {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      });

      // Allow breathing room on top-right for event details card & bottom for lower-third cinema bar
      map.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: { top: 160, bottom: 200, left: 160, right: 420 }, duration: 0 }
      );

      // Temporarily hide MapLibre vector city layers during export snapshot
      // so they don't produce low-res Open Sans raster glyphs or double text under our 4K Unbounded typography
      const hadCityLayer = !!map.getLayer('ets2-cities');
      const hadCityPointLayer = !!map.getLayer('ets2-cities-points');
      if (hadCityLayer) {
        map.setLayoutProperty('ets2-cities', 'visibility', 'none');
      }
      if (hadCityPointLayer) {
        map.setLayoutProperty('ets2-cities-points', 'visibility', 'none');
      }
      map.triggerRepaint();

      // Preload background truck image, club logo, and all cities in parallel
      const [bgImg, logoImg, allLoadedCities] = await Promise.all([
        loadCanvasImage('/images/home.webp'),
        loadCanvasImage('/logo.png'),
        loadAllCities().catch(() => COMMON_CITIES),
      ]);

      // Wait for map render idle
      await new Promise<void>((resolve) => {
        map.once('idle', () => resolve());
        setTimeout(resolve, 800);
      });

      const mapCanvas = map.getCanvas();

      // Restore MapLibre vector city layers for the live interactive map
      if (hadCityLayer) {
        map.setLayoutProperty('ets2-cities', 'visibility', 'visible');
      }
      if (hadCityPointLayer) {
        map.setLayoutProperty('ets2-cities-points', 'visibility', 'visible');
      }
      map.triggerRepaint();
      const exportWidth = 3840;  // 4K
      const exportHeight = 2160; // 4K

      if (!mapCanvas || mapCanvas.width < 10 || mapCanvas.height < 10) {
        throw new Error('Karten-Canvas ist nicht bereit. Bitte versuche es erneut.');
      }

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = exportWidth;
      exportCanvas.height = exportHeight;
      const ctx = exportCanvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas Context konnte nicht erstellt werden.');
      }

      // Scale factor relative to 1920×1080 reference layout
      const S = exportWidth / 1920;

      // Helper: draw rounded rectangle
      const rr = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
      };

      // ── Step 1: Draw Cinematic Truck Backdrop (Darker & Moody, perfectly balanced) ──
      if (bgImg && bgImg.naturalWidth > 10) {
        const bgScale = Math.max(exportWidth / bgImg.naturalWidth, exportHeight / bgImg.naturalHeight);
        const bgW = bgImg.naturalWidth * bgScale;
        const bgH = bgImg.naturalHeight * bgScale;
        const bgX = (exportWidth - bgW) / 2;
        const bgY = (exportHeight - bgH) / 2;
        ctx.drawImage(bgImg, bgX, bgY, bgW, bgH);

        // Moody cinematic tint: truck and silhouette clearly visible without washed-out sky
        const darkGrad = ctx.createLinearGradient(0, 0, exportWidth, exportHeight);
        darkGrad.addColorStop(0, 'rgba(4, 7, 14, 0.52)');
        darkGrad.addColorStop(0.5, 'rgba(3, 5, 10, 0.46)');
        darkGrad.addColorStop(1, 'rgba(2, 4, 8, 0.70)');
        ctx.fillStyle = darkGrad;
        ctx.fillRect(0, 0, exportWidth, exportHeight);
      } else {
        ctx.fillStyle = '#06080e';
        ctx.fillRect(0, 0, exportWidth, exportHeight);
      }

      // ── Step 2 & 3: Masked Map Layer (100% visible on route, fading smoothly to 0% invisible) ──
      const scale = Math.max(exportWidth / mapCanvas.width, exportHeight / mapCanvas.height);
      const scaledW = mapCanvas.width * scale;
      const scaledH = mapCanvas.height * scale;
      const offsetX = (exportWidth - scaledW) / 2;
      const offsetY = (exportHeight - scaledH) / 2;

      // Container CSS dimensions matching MapLibre's CSS pixel projection space (vital for High-DPI screens)
      const cWidth = container?.clientWidth || map.getContainer().clientWidth || (mapCanvas.width / (window.devicePixelRatio || 1));
      const cHeight = container?.clientHeight || map.getContainer().clientHeight || (mapCanvas.height / (window.devicePixelRatio || 1));

      // Project function from map coordinates to 4K canvas pixels with exact DPI-independent accuracy
      const project = (lng: number, lat: number): [number, number] => {
        const p = map.project([lng, lat]);
        const px = (p.x / cWidth)  * scaledW + offsetX;
        const py = (p.y / cHeight) * scaledH + offsetY;
        return [px, py];
      };

      const projected = routeLngLatCoords.map(([lng, lat]) => project(lng, lat));

      if (routeLngLatCoords.length >= 2) {
        // 1. Offscreen canvas for map at full opacity
        const maskedMapCanvas = document.createElement('canvas');
        maskedMapCanvas.width = exportWidth;
        maskedMapCanvas.height = exportHeight;
        const mapCtx = maskedMapCanvas.getContext('2d')!;

        // Draw the full map onto offscreen canvas with full clarity (100% visible on corridor)
        mapCtx.drawImage(mapCanvas, offsetX, offsetY, scaledW, scaledH);

        // 2. Alpha mask canvas
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = exportWidth;
        maskCanvas.height = exportHeight;
        const mctx = maskCanvas.getContext('2d')!;

        mctx.lineCap = 'round';
        mctx.lineJoin = 'round';
        mctx.strokeStyle = '#ffffff';

        const strokeRoute = () => {
          mctx.beginPath();
          projected.forEach(([px, py], i) => {
            if (i === 0) mctx.moveTo(px, py);
            else mctx.lineTo(px, py);
          });
          mctx.stroke();
        };

        // Layer 1: Solid core (100% opaque, ZERO blur)
        // Generous width of 160 * S (320px in 4K) ensures that the entire route line,
        // highway curves, junctions and all road details stay 100% crystal-clear and NEVER get dimmed!
        mctx.filter = 'none';
        mctx.lineWidth = 160 * S;
        strokeRoute();

        // Layer 2: Inner soft blend corridor
        mctx.filter = `blur(${24 * S}px)`;
        mctx.lineWidth = 280 * S;
        strokeRoute();

        // Layer 3: Medium smooth scenic corridor revealing surrounding towns & roads
        mctx.filter = `blur(${60 * S}px)`;
        mctx.lineWidth = 450 * S;
        strokeRoute();

        // Layer 4: Wide atmospheric gradual fade out into deep black/scania backdrop
        mctx.filter = `blur(${110 * S}px)`;
        mctx.lineWidth = 680 * S;
        strokeRoute();

        // Apply alpha mask to map
        mapCtx.globalCompositeOperation = 'destination-in';
        mapCtx.drawImage(maskCanvas, 0, 0);

        // Draw masked map onto main canvas
        ctx.drawImage(maskedMapCanvas, 0, 0);

        // Layer 5: High-intensity neon route glow rendered in native 4K vector format
        // This completely eliminates any possibility of the route looking dim or washed out
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer ambient purple glow
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 24 * S;
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)';
        ctx.lineWidth = 9 * S;
        ctx.beginPath();
        projected.forEach(([px, py], i) => {
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Core bright neon purple line
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#f3e8ff';
        ctx.lineWidth = 3.5 * S;
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.drawImage(mapCanvas, offsetX, offsetY, scaledW, scaledH);
      }

      // Exact start & end positions on the actual purple route line
      const actualStartCoord: [number, number] = routeLngLatCoords.length > 0
        ? routeLngLatCoords[0]
        : (waypoints[0] ? [waypoints[0].lng, waypoints[0].lat] : [0, 0]);

      const actualEndCoord: [number, number] = routeLngLatCoords.length > 0
        ? routeLngLatCoords[routeLngLatCoords.length - 1]
        : (waypoints[waypoints.length - 1] ? [waypoints[waypoints.length - 1].lng, waypoints[waypoints.length - 1].lat] : [0, 0]);

      const [startPx, startPy] = project(actualStartCoord[0], actualStartCoord[1]);
      const [endPx, endPy] = project(actualEndCoord[0], actualEndCoord[1]);

      // City label resolver helper: resolves city name based on actual geographic coordinate and waypoint info
      const resolveCityLabel = (inputCity: string | undefined, coord: [number, number], wp?: { name?: string }) => {
        const wpName = (wp?.name || '').trim();
        const isGenericWp = /^wegpunkt\s*\d*$/i.test(wpName);
        const isDepot = /^(ai|posped|euroacres|transinet|itcc|bcp|sanbuilders|fcp|nbfc|tree-et|tradeaux|sellplan|kaarnso)$/i.test(wpName);

        // Find nearest city in ETS2 data to actual coordinate
        let nearestCity = '';
        let minD = Infinity;
        for (const c of COMMON_CITIES) {
          const d = Math.hypot(c.lng - coord[0], c.lat - coord[1]);
          if (d < minD) {
            minD = d;
            nearestCity = c.realName;
          }
        }

        // If the waypoint has a legitimate real city name, prioritize that
        if (wpName && !isGenericWp && !isDepot && wpName.length > 2) {
          return wpName.toUpperCase().replace(/\s*AM\s+.*$/, '');
        }

        // If inputCity is provided and reasonably close (< 2.0 degrees ~ 150km) to this pin, use inputCity
        if (inputCity && inputCity.trim()) {
          const cleanInput = inputCity.trim();
          if (nearestCity && cleanInput.toLowerCase() === nearestCity.toLowerCase()) {
            return cleanInput.toUpperCase().replace(/\s*AM\s+.*$/, '');
          }
          if (minD < 1.5) {
            return cleanInput.toUpperCase().replace(/\s*AM\s+.*$/, '');
          }
        }

        // Otherwise use nearest city from coordinates
        if (nearestCity && minD < 2.5) {
          return nearestCity.toUpperCase().replace(/\s*AM\s+.*$/, '');
        }

        return (inputCity || wpName || '').toUpperCase().replace(/\s*AM\s+.*$/, '');
      };

      const sCity = resolveCityLabel(startCity, actualStartCoord, waypoints[0]);
      const eCity = resolveCityLabel(endCity, actualEndCoord, waypoints[waypoints.length - 1]);

      // ── Step 4: Stylized Schematic City Nodes & Typography (Exact TruckersMP 4K Style) ──
      const citiesToRender: { name: string; px: number; py: number; dist: number; isCommon: boolean }[] = [];
      const cityPool = (allLoadedCities && allLoadedCities.length > 0) ? allLoadedCities : COMMON_CITIES;

      // 1. Gather all candidate cities that fall inside the export poster boundaries and near the illuminated corridor
      const margin = 40 * S;
      for (const c of cityPool) {
        const [cpx, cpy] = project(c.lng, c.lat);
        if (cpx < margin || cpx > exportWidth - margin || cpy < margin || cpy > exportHeight - margin) {
          continue;
        }

        // Calculate minimum distance to route line (or to start/end if route is short)
        let minD = Infinity;
        if (projected.length > 0) {
          for (let i = 0; i < projected.length; i += 3) {
            const d = Math.hypot(projected[i][0] - cpx, projected[i][1] - cpy);
            if (d < minD) minD = d;
          }
        } else {
          minD = Math.min(
            Math.hypot(cpx - startPx, cpy - startPy),
            Math.hypot(cpx - endPx, cpy - endPy)
          );
        }

        // Only show cities within the illuminated scenic corridor (~480 * S)
        if (minD > 480 * S) continue;

        // Skip cities directly beneath START or END pins if they correspond to the start/end city
        const distToStart = Math.hypot(cpx - startPx, cpy - startPy);
        const distToEnd = Math.hypot(cpx - endPx, cpy - endPy);
        const normName = c.realName.toLowerCase();
        if (distToStart < 65 * S || (distToStart < 120 * S && sCity && normName === sCity.toLowerCase())) {
          continue;
        }
        if (distToEnd < 65 * S || (distToEnd < 120 * S && eCity && normName === eCity.toLowerCase())) {
          continue;
        }

        const isCommon = COMMON_CITIES.some(cc => cc.gameName === c.gameName || cc.realName.toLowerCase() === normName);
        citiesToRender.push({
          name: c.realName.toUpperCase().replace(/\s*AM\s+.*$/, ''),
          px: cpx,
          py: cpy,
          dist: minD,
          isCommon,
        });
      }

      // Sort candidate cities: Common/major cities first, then closest to route
      citiesToRender.sort((a, b) => {
        if (a.isCommon !== b.isCommon) return a.isCommon ? -1 : 1;
        return a.dist - b.dist;
      });

      // 2. Collision avoidance and drawing
      interface BoundingBox {
        x: number;
        y: number;
        w: number;
        h: number;
      }
      const placedBoxes: BoundingBox[] = [];

      ctx.save();
      ctx.font = `800 ${12.5 * S}px "Unbounded", system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';

      for (const city of citiesToRender) {
        const textW = ctx.measureText(city.name).width;
        const boxX = city.px - 6 * S;
        const boxY = city.py - 12 * S;
        const boxW = 6 * S + 8.5 * S + textW + 12 * S;
        const boxH = 24 * S;

        // Check collision against already placed city labels
        const collides = placedBoxes.some(
          b => boxX < b.x + b.w && boxX + boxW > b.x && boxY < b.y + b.h && boxY + boxH > b.y
        );
        if (collides) continue;

        placedBoxes.push({ x: boxX, y: boxY, w: boxW, h: boxH });

        // Draw white circular node dot with dark border and shadow (exact TruckersMP design)
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 8 * S;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(city.px, city.py, 5.0 * S, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 1.8 * S;
        ctx.stroke();
        ctx.restore();

        // Draw city name in bold uppercase Unbounded font with crisp dark halo
        ctx.save();
        ctx.font = `800 ${12.5 * S}px "Unbounded", system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        const textX = city.px + 8.5 * S;
        const textY = city.py;

        ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
        ctx.shadowBlur = 8 * S;
        ctx.shadowOffsetY = 1 * S;
        ctx.strokeStyle = '#06080e';
        ctx.lineWidth = 3.5 * S;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(city.name, textX, textY);

        ctx.fillStyle = '#ffffff';
        ctx.fillText(city.name, textX, textY);
        ctx.restore();
      }
      ctx.restore();

      // ── Step 5: Unified Premium Navigation Pin Markers (START & END) ──
      const drawPinMarker = (
        type: 'start' | 'end',
        px: number,
        py: number,
        cityName: string
      ) => {
        const isStart = type === 'start';
        const label = isStart ? 'START' : 'END';

        // 1. Target anchor ring on the exact road coordinate
        ctx.save();
        const anchorColor = isStart ? '#22c55e' : '#f8fafc';
        ctx.shadowColor = anchorColor;
        ctx.shadowBlur = 16 * S;
        ctx.strokeStyle = anchorColor;
        ctx.lineWidth = 3 * S;
        ctx.beginPath();
        ctx.arc(px, py, 6.5 * S, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = anchorColor;
        ctx.beginPath();
        ctx.arc(px, py, 2.5 * S, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 2. Measure dimensions
        ctx.font = `900 ${12.5 * S}px "Unbounded", system-ui, sans-serif`;
        const labelW = ctx.measureText(label).width;

        ctx.font = `800 ${11.5 * S}px "Unbounded", system-ui, sans-serif`;
        const cityW = cityName ? ctx.measureText(cityName).width : 0;

        const iconSize = 20 * S;
        const padX = 10 * S;
        const gap = 8 * S;
        const badgeH = 34 * S;
        const pointerH = 7 * S;

        // Total badge width
        const badgeW = padX + iconSize + gap + labelW + (cityName ? gap + 1 * S + gap + cityW : 0) + padX;

        // Determine vertical placement: if too close to top edge, place below
        const placeBelow = py < 100 * S;
        const badgeY = placeBelow ? py + pointerH + 8 * S : py - badgeH - pointerH - 8 * S;

        // Clamp horizontal placement so badge stays on screen
        const badgeX = Math.max(20 * S, Math.min(exportWidth - badgeW - 20 * S, px - badgeW / 2));
        const pointerTipX = Math.max(badgeX + 14 * S, Math.min(badgeX + badgeW - 14 * S, px));

        // 3. Draw Badge Container & Pointer with Deep Drop Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 18 * S;
        ctx.shadowOffsetY = 4 * S;
        ctx.fillStyle = '#ffffff';

        ctx.beginPath();
        const r = badgeH / 2;
        ctx.moveTo(badgeX + r, badgeY);
        ctx.lineTo(badgeX + badgeW - r, badgeY);
        ctx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + r, r);
        ctx.lineTo(badgeX + badgeW, badgeY + badgeH - r);
        ctx.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX + badgeW - r, badgeY + badgeH, r);

        if (!placeBelow) {
          // Pointer pointing down
          ctx.lineTo(pointerTipX + 7 * S, badgeY + badgeH);
          ctx.lineTo(pointerTipX, py - 1 * S);
          ctx.lineTo(pointerTipX - 7 * S, badgeY + badgeH);
        }

        ctx.lineTo(badgeX + r, badgeY + badgeH);
        ctx.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY + badgeH - r, r);
        ctx.lineTo(badgeX, badgeY + r);
        ctx.arcTo(badgeX, badgeY, badgeX + r, badgeY, r);

        if (placeBelow) {
          // Pointer pointing up
          ctx.moveTo(badgeX + r, badgeY);
          ctx.lineTo(pointerTipX - 7 * S, badgeY);
          ctx.lineTo(pointerTipX, py + 1 * S);
          ctx.lineTo(pointerTipX + 7 * S, badgeY);
          ctx.lineTo(badgeX + badgeW - r, badgeY);
        }

        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Subtle crisp border
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1 * S;
        ctx.stroke();
        ctx.restore();

        // 4. Draw Icon
        const iconCenterX = badgeX + padX + iconSize / 2;
        const iconCenterY = badgeY + badgeH / 2;

        if (isStart) {
          // Green emerald circle with white play triangle
          ctx.save();
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.arc(iconCenterX, iconCenterY, iconSize / 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          const triSize = 4 * S;
          ctx.moveTo(iconCenterX - 1.5 * S, iconCenterY - triSize);
          ctx.lineTo(iconCenterX + 3.5 * S, iconCenterY);
          ctx.lineTo(iconCenterX - 1.5 * S, iconCenterY + triSize);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        } else {
          // Race checkered finish icon
          drawCheckeredBadge(ctx, iconCenterX, iconCenterY, iconSize / 2);
        }

        // 5. Text: START / END
        ctx.save();
        ctx.fillStyle = isStart ? '#15803d' : '#0f172a';
        ctx.font = `900 ${12.5 * S}px "Unbounded", system-ui, sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textStartX = badgeX + padX + iconSize + gap;
        ctx.fillText(label, textStartX, badgeY + badgeH / 2);

        // 6. City Name (if present)
        if (cityName) {
          // Vertical divider line
          const divX = textStartX + labelW + gap;
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.2)';
          ctx.lineWidth = 1.2 * S;
          ctx.beginPath();
          ctx.moveTo(divX, badgeY + 7 * S);
          ctx.lineTo(divX, badgeY + badgeH - 7 * S);
          ctx.stroke();

          // City text in sleek dark slate
          ctx.fillStyle = '#334155';
          ctx.font = `800 ${11.5 * S}px "Unbounded", system-ui, sans-serif`;
          ctx.fillText(cityName, divX + gap + 1 * S, badgeY + badgeH / 2);
        }
        ctx.restore();
      };

      if (waypoints.length > 0) {
        drawPinMarker('start', startPx, startPy, sCity);
      }

      if (waypoints.length > 1) {
        drawPinMarker('end', endPx, endPy, eCity);
      }

      // Intermediate numbered waypoints (if > 2)
      for (let i = 1; i < waypoints.length - 1; i++) {
        const wp = waypoints[i];
        const [wpx, wpy] = project(wp.lng, wp.lat);

        ctx.save();
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 18 * S;
        ctx.fillStyle = accentColor;
        ctx.beginPath();
        ctx.arc(wpx, wpy, 11 * S, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5 * S;
        ctx.stroke();

        ctx.fillStyle = '#000000';
        ctx.font = `900 ${11 * S}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), wpx, wpy);
        ctx.restore();
      }

      // ── Step 6: Top-Right Frosted Event Details Card (TruckersMP Style) ──
      const boxW = 460 * S;
      const boxH = 240 * S;
      const boxX = exportWidth - boxW - 50 * S;
      const boxY = 50 * S;
      const boxR = 22 * S;

      // Frosted container
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 24 * S;
      ctx.shadowOffsetY = 8 * S;
      ctx.fillStyle = 'rgba(10, 14, 24, 0.88)';
      rr(boxX, boxY, boxW, boxH, boxR);
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 1.5 * S;
      rr(boxX, boxY, boxW, boxH, boxR);
      ctx.stroke();

      // Glowing vertical accent bar along the LEFT SIDE of the card
      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 4 * S;
      ctx.lineCap = 'round';
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = 14 * S;
      ctx.beginPath();
      ctx.moveTo(boxX, boxY + 28 * S);
      ctx.lineTo(boxX, boxY + boxH - 28 * S);
      ctx.stroke();
      ctx.restore();

      // 4 Rows of Details
      const rowStartY = boxY + 44 * S;
      const rowSpacing = 48 * S;
      const iconX = boxX + 44 * S;
      const textX = boxX + 82 * S;

      // Row 1: 📅 Date
      drawCalendarIcon(ctx, iconX, rowStartY, 26 * S, accentColor);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = `800 ${18 * S}px "Unbounded", system-ui, sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatPosterDate(startDate), textX, rowStartY);

      // Row 2: ⏰ Time
      drawClockIcon(ctx, iconX, rowStartY + rowSpacing, 26 * S, accentColor);
      ctx.fillText(formatPosterTime(startDate), textX, rowStartY + rowSpacing);

      // Row 3: 🛣️ Distance
      const distanceMiles = Math.round(distanceKm * 0.621371);
      drawDistanceIcon(ctx, iconX, rowStartY + rowSpacing * 2, 26 * S, accentColor);
      ctx.fillText(`${distanceKm} km / ${distanceMiles} mi`, textX, rowStartY + rowSpacing * 2);

      // Row 4: 🏷️ Server / Game
      const serverDisplay = (server && server.trim()) || 'Base Game';
      drawTagIcon(ctx, iconX, rowStartY + rowSpacing * 3, 26 * S, accentColor);
      ctx.fillText(serverDisplay, textX, rowStartY + rowSpacing * 3);
      ctx.restore();

      // ── Step 7: Lower-Third Cinema Convoy Banner ──
      const barH = 155 * S;
      const barY = exportHeight - barH;

      const barGrad = ctx.createLinearGradient(0, barY - 50 * S, 0, exportHeight);
      barGrad.addColorStop(0, 'rgba(4, 6, 12, 0)');
      barGrad.addColorStop(0.35, 'rgba(4, 6, 12, 0.88)');
      barGrad.addColorStop(1, 'rgba(2, 3, 6, 0.98)');
      ctx.fillStyle = barGrad;
      ctx.fillRect(0, barY - 50 * S, exportWidth, barH + 50 * S);

      const lineGrad = ctx.createLinearGradient(50 * S, 0, exportWidth - 50 * S, 0);
      lineGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
      lineGrad.addColorStop(0.2, 'rgba(255,255,255,0.18)');
      lineGrad.addColorStop(0.8, 'rgba(255,255,255,0.18)');
      lineGrad.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5 * S;
      ctx.beginPath();
      ctx.moveTo(50 * S, barY);
      ctx.lineTo(exportWidth - 50 * S, barY);
      ctx.stroke();

      const titleLeftX = 60 * S;
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `900 ${36 * S}px "Unbounded", system-ui, sans-serif`;
      ctx.fillStyle = '#ffffff';
      ctx.fillText('OFFICIAL CONVOY', titleLeftX, barY + 62 * S);
      const offW = ctx.measureText('OFFICIAL CONVOY').width;

      const eventSub = (eventTitle && eventTitle.trim()) ? eventTitle.toUpperCase() : getConvoyMonthYear(startDate);
      ctx.fillStyle = accentColor;
      ctx.fillText(eventSub, titleLeftX + offW + 18 * S, barY + 62 * S);

      const clubName = (organizer && organizer.trim()) ? organizer.trim().toUpperCase() : 'OPEN PIPE CLUB';
      const imageStartCity = startCity || waypoints[0]?.name || 'START';
      const imageEndCity = endCity || waypoints[waypoints.length - 1]?.name || 'ZIEL';
      const imageStartCompany = startCompany || '';
      const imageEndCompany = endCompany || '';

      const subText = `${imageStartCity.toUpperCase()} ➔ ${imageEndCity.toUpperCase()}  •  ORGANIZED BY ${clubName}`;
      ctx.fillStyle = '#94a3b8';
      ctx.font = `700 ${14 * S}px "Unbounded", system-ui, sans-serif`;
      ctx.fillText(subText, titleLeftX, barY + 104 * S);
      ctx.restore();

      // Right: Open Pipe Club Branding
      if (logoImg && logoImg.naturalWidth > 10) {
        const logoH = 80 * S;
        const logoW = (logoImg.naturalWidth / logoImg.naturalHeight) * logoH;
        const logoX = exportWidth - 360 * S;
        const logoY = barY + 28 * S;
        ctx.drawImage(logoImg, logoX, logoY, logoW, logoH);

        ctx.save();
        ctx.textAlign = 'left';
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${18 * S}px "Unbounded", system-ui, sans-serif`;
        ctx.fillText('OPEN PIPE CLUB', logoX + logoW + 16 * S, barY + 64 * S);
        ctx.fillStyle = accentColor;
        ctx.font = `800 ${12 * S}px "Unbounded", system-ui, sans-serif`;
        ctx.fillText('COMMUNITY VTC', logoX + logoW + 16 * S, barY + 88 * S);
        ctx.restore();
      } else {
        ctx.save();
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ffffff';
        ctx.font = `900 ${24 * S}px "Unbounded", system-ui, sans-serif`;
        ctx.fillText('OPEN PIPE CLUB', exportWidth - 60 * S, barY + 64 * S);
        ctx.fillStyle = accentColor;
        ctx.font = `800 ${13 * S}px "Unbounded", system-ui, sans-serif`;
        ctx.fillText('OFFICIAL ROUTE MAP', exportWidth - 60 * S, barY + 90 * S);
        ctx.restore();
      }

      // Convert to Blob and File
      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
      });

      if (!blob) {
        throw new Error('Bild-Blob konnte nicht generiert werden.');
      }

      const fileName = `route_${Date.now()}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      const previewUrl = URL.createObjectURL(blob);

      // Show preview before confirming
      setPreviewPending({
        file,
        previewUrl,
        meta: {
          distanceKm,
          durationMinutes,
          startCity: imageStartCity,
          endCity: imageEndCity,
          startCompany: imageStartCompany,
          endCompany: imageEndCompany,
          waypoints,
        },
      });

      setIsCapturing(false);
    } catch (err: any) {
      console.error('Route export error:', err);
      toast.error(`Export fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
      setIsCapturing(false);
    } finally {
      if (container) {
        container.style.position = prevPos || '';
        container.style.left = prevLeft || '';
        container.style.top = prevTop || '';
        container.style.width = prevWidth || '';
        container.style.height = prevHeight || '';
        container.style.visibility = prevVis || '';
        container.style.zIndex = prevZIdx || '';
      }

      if (mapRef.current) {
        if (mapRef.current.getLayer('ets2-cities')) {
          mapRef.current.setLayoutProperty('ets2-cities', 'visibility', 'visible');
        }
        if (mapRef.current.getLayer('ets2-cities-points')) {
          mapRef.current.setLayoutProperty('ets2-cities-points', 'visibility', 'visible');
        }

        const c = mapRef.current.getCenter();
        savedCenterRef.current = [c.lng, c.lat];
        savedZoomRef.current = mapRef.current.getZoom();

        setTimeout(() => {
          mapRef.current?.resize();
        }, 100);
      }
    }
  };

  const handleDownloadImage = (file: File, meta: any) => {
    try {
      const sCity = meta.startCity || startCity || 'Start';
      const eCity = meta.endCity || endCity || 'Ziel';
      const rawTitle = (eventTitle || `${sCity}_nach_${eCity}`).trim();
      const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_\-\u00C0-\u017F]/g, '_');
      const filename = `OPC_${safeTitle}_4K_Route.jpg`;

      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);

      onExportImage?.(file, meta);
      toast.success('4K-Routenbild wird heruntergeladen!', {
        description: filename,
      });
    } catch (err: any) {
      toast.error(`Download fehlgeschlagen: ${err.message || 'Unbekannter Fehler'}`);
    }
  };

  const confirmPreview = () => {
    if (!previewPending) return;
    if (onRouteGenerated) {
      onRouteGenerated(previewPending.file, previewPending.meta);
    }
    if (onExportImage) {
      onExportImage(previewPending.file, previewPending.meta);
    }
    URL.revokeObjectURL(previewPending.previewUrl);
    setPreviewPending(null);
    if (isFullscreen && !hideCloseButton) onToggleFullscreen(false);
    toast.success('Routengrafik übernommen!');
  };

  const discardPreview = () => {
    if (!previewPending) return;
    URL.revokeObjectURL(previewPending.previewUrl);
    setPreviewPending(null);
  };

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  // -------------------------------------------------------------
  // ROUTE IMAGE PREVIEW MODAL
  // -------------------------------------------------------------
  if (previewPending) {
    const ph = Math.floor(previewPending.meta.durationMinutes / 60);
    const pm = previewPending.meta.durationMinutes % 60;
      return createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 md:p-8 bg-black/85 backdrop-blur-xl select-none"
          onClick={discardPreview}
        >
          <div
            className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-white/15 bg-[#0a0d16] shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="h-16 px-6 flex items-center justify-between shrink-0 border-b border-white/10 bg-black/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ImageIcon size={18} />
                </div>
                <div>
                  <h2 className="font-unbounded text-sm font-bold text-white uppercase tracking-wider">
                    Routenbild Vorschau
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Bitte prüfe das Bild vor der Übernahme</p>
                </div>
              </div>
              <button
                type="button"
                onClick={discardPreview}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Image Preview */}
            <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4 sm:p-6 bg-black/30">
              <div className="relative w-full max-w-4xl rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/50">
                <img
                  src={previewPending.previewUrl}
                  alt="Routenbild Vorschau"
                  className="w-full h-auto block max-h-[60vh] object-contain mx-auto"
                  style={{ imageRendering: 'auto' }}
                />
              </div>
            </div>

            {/* Route Meta + Actions Footer */}
            <div className="shrink-0 px-6 py-4 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Stats */}
              <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                  <MapPin size={12} className="text-amber-400" />
                  {previewPending.meta.startCity}
                  {previewPending.meta.startCompany ? ` (${previewPending.meta.startCompany})` : ''}
                  <span className="text-amber-400 mx-1">→</span>
                  {previewPending.meta.endCity}
                  {previewPending.meta.endCompany ? ` (${previewPending.meta.endCompany})` : ''}
                </span>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                  {previewPending.meta.distanceKm} km
                </span>
                <span className="text-[11px] font-bold text-slate-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                  {ph > 0 ? `${ph}h ${pm}m` : `${pm}m`} Fahrzeit
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={discardPreview}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                >
                  <RotateCcw size={13} />
                  Nochmal
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadImage(previewPending.file, previewPending.meta)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
                  title="Hochauflösendes 4K-Bild (3840x2160) herunterladen"
                >
                  <Download size={13} />
                  Bild herunterladen
                </button>
                {onRouteGenerated && (
                  <button
                    type="button"
                    onClick={confirmPreview}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    Übernehmen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      , document.body);
  }

  // -------------------------------------------------------------
  // FULLSCREEN / MODAL MODE
  // -------------------------------------------------------------
  if (isFullscreen) {
    return (
      <div className="w-full h-full flex flex-col bg-transparent select-none">
        {/* Fullscreen Navigation / Header Bar */}
        <div className="h-16 px-4 sm:px-6 border-b border-white/10 bg-black/50 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Navigation size={17} />
            </div>
            <div>
              <h2 className="font-unbounded text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                ETS2 Routenplaner
                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Routen-Generator
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 hidden sm:block">Klicke auf die Karte oder suche Städte/Firmen, um die Strecke zu planen.</p>
            </div>
          </div>

          {/* Stats Badges */}
          {waypoints.length >= 2 && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black text-slate-500">Distanz:</span>
                <span className="text-sm font-bold text-amber-400 font-unbounded">{distanceKm} km</span>
              </div>
              <div className="w-px h-4 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black text-slate-500">Fahrzeit:</span>
                <span className="text-xs font-bold text-slate-300">
                  {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateImage}
              disabled={isCapturing || isCalculating || waypoints.length < 2 || !mapLoaded}
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 0 25px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.45)`,
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white font-black text-xs uppercase tracking-wider transition-all hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              {isCapturing ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Rendern...
                </>
              ) : (
                <>
                  <Camera size={15} />
                  {captureButtonText || 'Route als Bild übernehmen'}
                </>
              )}
            </button>

            {!hideCloseButton && (
              <button
                type="button"
                onClick={() => onToggleFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/15 border border-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer ml-1"
                title="Modal schließen (Esc)"
              >
                <X size={15} />
                <span className="hidden sm:inline">Schließen</span>
              </button>
            )}
          </div>
        </div>

        {/* Fullscreen Map Area + Left Waypoints Panel */}
        <div className="relative flex-1 w-full overflow-hidden">
          <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

          {/* Left Floating Sidebar */}
          <div className="absolute top-4 left-4 z-20 w-80 max-h-[calc(100%-2rem)] flex flex-col rounded-[28px] bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-white/[0.08] space-y-3 bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} /> Wegpunkte
                </span>
                {waypoints.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllWaypoints}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={11} /> Alle leeren
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 focus-within:border-amber-500/50 transition-colors">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Stadt oder Firma suchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent border-none outline-none text-xs text-white placeholder:text-slate-500 w-full"
                  />
                  {searchQuery && (
                    <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-slate-400 hover:text-white">
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl bg-black/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1 no-scrollbar z-30">
                    {searchResults.map((res) => (
                      <button
                        key={`${res.title}_${res.x}_${res.z}`}
                        type="button"
                        onClick={() => handleAddDestination(res)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-500/20 text-xs text-white flex items-center justify-between group transition-colors"
                      >
                        <span className="truncate group-hover:text-amber-300">{res.title}</span>
                        <span className="text-[9px] uppercase font-bold text-slate-500 group-hover:text-amber-400/80 shrink-0 ml-2">{res.subtitle || 'Stadt'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Waypoints List */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 no-scrollbar max-h-[50vh]">
              {waypoints.length === 0 ? (
                <div className="py-8 text-center px-4">
                  <Navigation size={28} className="mx-auto text-slate-600 mb-2 opacity-60" />
                  <p className="text-xs font-bold text-slate-400">Keine Wegpunkte gesetzt</p>
                  <p className="text-[10px] text-slate-500 mt-1">Klicke auf beliebige Städte auf der Karte oder nutze die Suche oben.</p>
                </div>
              ) : (
                waypoints.map((wp, index) => {
                  const isStart = index === 0;
                  const isEnd = index === waypoints.length - 1 && waypoints.length > 1;

                  return (
                    <div
                      key={wp.id}
                      className="group flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center shrink-0 ${
                            isStart
                              ? 'bg-emerald-500 text-black'
                              : isEnd
                              ? 'bg-rose-500 text-white'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isStart ? 'S' : isEnd ? 'Z' : index + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-200 truncate">{wp.name}</span>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100">
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => moveWaypoint(index, 'up')}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
                            title="Nach oben verschieben"
                          >
                            <ChevronUp size={12} />
                          </button>
                        )}
                        {index < waypoints.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveWaypoint(index, 'down')}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10"
                            title="Nach unten verschieben"
                          >
                            <ChevronDown size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeWaypoint(index)}
                          className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-red-500/10"
                          title="Wegpunkt entfernen"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Waypoint Help Footer */}
            <div className="p-3 border-t border-white/[0.08] bg-white/[0.02]">
              <p className="text-[10px] text-slate-500 text-center font-medium">
                💡 Tipp: Klicke auf die Karte, um Zwischenstationen einzufügen.
              </p>
            </div>
          </div>

          {/* Fullscreen Floating Bottom Route Cockpit Bar */}
          {waypoints.length >= 2 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-auto flex items-center gap-4 px-5 py-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/15 shadow-[0_15px_40px_rgba(0,0,0,0.85)] transition-all hover:border-amber-500/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.25)]">
              {/* Start */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-500 text-black shadow-sm">
                  START
                </span>
                <span className="text-xs font-bold text-white max-w-[130px] truncate">
                  {startCity || waypoints[0]?.name}
                </span>
              </div>

              {/* Arrow */}
              <span className="text-amber-400 font-black text-sm">➔</span>

              {/* Intermediate waypoint count badge if > 2 */}
              {waypoints.length > 2 && (
                <span className="text-[10px] font-bold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded-lg">
                  +{waypoints.length - 2} Stopps
                </span>
              )}

              {/* Ziel */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-sm">
                  ZIEL
                </span>
                <span className="text-xs font-bold text-white max-w-[130px] truncate">
                  {endCity || waypoints[waypoints.length - 1]?.name}
                </span>
              </div>

              <div className="w-px h-6 bg-white/15 mx-1" />

              {/* Distanz */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/25">
                <span className="text-[9px] font-black uppercase text-amber-400">Distanz:</span>
                <span className="text-xs font-bold text-white font-unbounded">{distanceKm} km</span>
              </div>

              {/* Fahrzeit */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[9px] font-black uppercase text-slate-400">Fahrzeit:</span>
                <span className="text-xs font-bold text-white font-unbounded">
                  {hours > 0 ? `${hours}h ${mins}m` : `${mins}m`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // EMBEDDED MODE (Inside Event Creation Modal)
  // -------------------------------------------------------------
  return (
    <div className="space-y-2 select-none">
      {/* Header Bar: Title + Fullscreen Trigger */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Navigation size={13} />
          </div>
          <div>
            <label className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              Routenplaner & ETS2 Karte
              <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Interaktiv
              </span>
            </label>
          </div>
        </div>

        {/* Controls: Stats Badge */}
        <div className="flex items-center gap-2">
          {waypoints.length >= 2 && (
            <span className="text-[10px] font-bold font-unbounded text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
              {distanceKm} km {hours > 0 ? `• ${hours}h ${mins}m` : mins > 0 ? `• ${mins}m` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Embedded Map Container */}
      <div className="relative w-full h-[360px] sm:h-[400px] rounded-[28px] overflow-hidden bg-[#06080e] group shadow-inner">
        {/* The Map Canvas */}
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

        {/* Top-Left Search Bar Overlay */}
        <div className="absolute top-3 left-3 z-10 w-52 sm:w-64">
          <div className="relative">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-white/15 shadow-xl">
              <Search size={13} className="text-amber-400 shrink-0" />
              <input
                type="text"
                placeholder="Stadt / Firma suchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] text-white placeholder:text-slate-500 w-full"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSearchResults([]); }} className="text-slate-400 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Dropdown Suggestions */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-44 overflow-y-auto rounded-xl bg-black/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1 no-scrollbar z-30">
                {searchResults.map((res) => (
                  <button
                    key={`${res.title}_${res.x}_${res.z}`}
                    type="button"
                    onClick={() => handleAddDestination(res)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-amber-500/20 text-[11px] text-white flex items-center justify-between group transition-colors"
                  >
                    <span className="truncate group-hover:text-amber-300">{res.title}</span>
                    <span className="text-[8px] uppercase font-bold text-slate-500 group-hover:text-amber-400/80 shrink-0 ml-1">{res.subtitle || 'Stadt'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top-Right Quick Map Controls */}
        <div className="absolute top-3 right-3 z-10">
          <button
            type="button"
            onClick={() => onToggleFullscreen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/80 hover:bg-black border border-white/15 text-white hover:text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-xl cursor-pointer"
            title="In vergrößertem Modal öffnen"
          >
            <Maximize2 size={12} />
            <span>Großansicht</span>
          </button>
        </div>

        {/* Bottom Waypoint Chips Overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-10 pointer-events-none flex flex-wrap items-center gap-1.5">
          {waypoints.length === 0 ? (
            <div className="px-3.5 py-2 rounded-2xl bg-black/85 backdrop-blur-md border border-white/15 text-[11px] font-bold text-slate-300 pointer-events-auto flex items-center gap-2 shadow-xl">
              <MapPin size={13} className="text-amber-400" />
              Klicke auf die Karte oder suche einen Ort, um Wegpunkte zu setzen
            </div>
          ) : (
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5 pointer-events-auto no-scrollbar">
              {waypoints.map((wp, idx) => {
                const isStart = idx === 0;
                const isEnd = idx === waypoints.length - 1 && waypoints.length > 1;
                return (
                  <div
                    key={wp.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold border border-white/15 bg-[#0a0f1d]/90 backdrop-blur-md shadow-lg shrink-0 transition-all hover:border-amber-500/40"
                  >
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                        isStart
                          ? 'bg-emerald-500 text-black'
                          : isEnd
                          ? 'bg-rose-500 text-white'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isStart ? 'START' : isEnd ? 'ZIEL' : `${idx + 1}`}
                    </span>
                    <span className="truncate max-w-[95px] text-white font-bold">{wp.name}</span>
                    <button
                      type="button"
                      onClick={() => removeWaypoint(idx)}
                      className="text-slate-400 hover:text-red-400 p-0.5 rounded transition-colors"
                      title="Entfernen"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Action Strip below the map */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {waypoints.length > 0 && (
            <button
              type="button"
              onClick={clearAllWaypoints}
              className="text-[10px] font-bold text-red-400/80 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 size={11} /> Wegpunkte leeren
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleGenerateImage}
          disabled={isCapturing || isCalculating || waypoints.length < 2 || !mapLoaded}
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 25px rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.45)`,
          }}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-white font-black text-xs uppercase tracking-wider transition-all hover:brightness-110 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
        >
          {isCapturing ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Generiere 1080p Bild...
            </>
          ) : (
            <>
              <Camera size={14} />
              {captureButtonText || 'Route als Bild übernehmen'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
