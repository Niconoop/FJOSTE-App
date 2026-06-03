import { useEffect, useState, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RefreshCw, Truck, MapPin, Clock, Users, X, Map as MapIcon, ChevronRight, Gauge, Package, ArrowRight, Globe } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, getAvatarUrl } from '../config';
import * as proj4 from 'proj4';
import * as pmtiles from 'pmtiles';

// Register PMTiles protocol once
let pmTilesProtocolAdded = false;
function addPmTilesProtocol() {
  if (pmTilesProtocolAdded) return;
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol('pmtiles', protocol.tile);
  pmTilesProtocolAdded = true;
}

const PROXY_BASE = `${API_URL}/map/proxy`;

function createEts2Style(isLight: boolean): maplibregl.StyleSpecification {
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
      {
        id: 'background',
        type: 'background',
        paint: {
          'background-color': isLight ? '#f1f3f5' : '#0a0b0d',
        },
      },
      {
        id: 'world-water',
        type: 'fill',
        source: 'world',
        'source-layer': 'water',
        paint: {
          'fill-color': isLight ? '#c4d7ec' : '#060708',
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
              0, '#060708',  // water
              1, '#0a0b0d',  // land
              2, '#14171f',  // road surface
              3, '#050507',  // building
              '#0a0b0d',
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
        paint: {
          'fill-color': isLight ? '#cbd5e1' : '#14171f',
          'fill-opacity': 0.9
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
              'freeway', '#ff8c00',  // Dark Orange
              'divided', '#e5a93b',  // Gold / Muted Yellow
              'local', '#384556',    // Dark grey-blue
              'train', '#11161b',    // Black
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
      {
        id: 'ets2-ferries',
        type: 'line',
        source: 'ets2',
        'source-layer': 'ets2',
        filter: ['all', ['==', ['geometry-type'], 'LineString'], ['==', ['get', 'type'], 'ferry']],
        paint: {
          'line-color': isLight ? '#0ea5e9' : '#2ba1b9',
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
          'line-color': isLight ? '#94a3b8' : '#1a1f29',
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
          'line-color': isLight ? '#94a3b8' : '#1a1f29',
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

const Map = ({ onViewProfile, initialSelectedId, onClearInitialId, theme }: { onViewProfile?: (id: string | number) => void, initialSelectedId?: string | number | null, onClearInitialId?: () => void, theme?: string }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapData, setMapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const getAvatarUrlLocal = (url?: string) => getAvatarUrl(url);

  const capitalize = (str?: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const fetchData = useCallback(async () => {
    try {
      const [mapRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/trucky/live-map`),
        axios.get(`${API_URL}/management/users`).catch(() => ({ data: [] }))
      ]);

      const liveData = Array.isArray(mapRes.data) ? mapRes.data : [];
      const fjosteUsers = Array.isArray(usersRes.data) ? usersRes.data : [];

      // Merge: Use fjosteUsers as base to include everyone
      const merged = fjosteUsers.map((u: any) => {
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

      // Add live users that might not be in fjosteUsers
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
      attributionControl: false,
    });
    map.setMinZoom(4.5);
    map.setMaxZoom(14);
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    const updateMapStyle = () => {
      if (mapRef.current) {
        const isLight = theme === 'light' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches);
        mapRef.current.setStyle(createEts2Style(isLight));
      }
    };

    updateMapStyle();

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
            mapRef.current.flyTo({ center: [lng, lat], zoom: 12, duration: 1500 });
          }
        }
      }
      onClearInitialId?.();
    }
  }, [initialSelectedId, mapData, onClearInitialId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const seenPositions: { [key: string]: number } = {};

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

      const borderColor = member.online ? "#10b981" : (member.role_color || "#22D1EE");

      const el = document.createElement("div");
      el.className = "map-marker";
      const isSelected = selectedDriver?.id === member.id;
      const avatarUrl = getAvatarUrl(member.avatar_url);
      el.style.cssText = `width:42px;height:42px;border-radius:50%;border:3px solid ${borderColor};background:${avatarUrl ? `url(${avatarUrl}) center/cover` : "#1a1a2e"};box-shadow:0 0 20px ${borderColor}40;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:${isSelected ? 10 : 1};${member.online ? "animation:pulse 2s infinite;" : ""}`;

      if (!avatarUrl) {
        el.innerHTML = '<svg width="18" height="18" fill="white" viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4z"/></svg>';
      }

      el.addEventListener("click", () => {
        setSelectedDriver(member);
        map.flyTo({ center: [lng, lat], zoom: 12, duration: 1500 });
      });

      const marker = new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.push(marker);
    });
  }, [mapData, selectedDriver]);

  const onlineCount = mapData.filter(m => m.online).length;

  return (
    <div className="flex h-[calc(100vh-140px)] glass-card !p-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="flex-1 relative">
        <div ref={mapContainer} className="w-full h-full" />

        {/* Map Overlays */}
        <div className="absolute top-6 left-6 z-30 flex flex-col gap-2">
          <div className="glass-card !p-4 backdrop-blur-xl shadow-2xl">
            <h3 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest mb-1">Live Karte</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-tighter">{onlineCount} Fahrer aktiv</span>
            </div>
          </div>

          <button
            onClick={() => { setLoading(true); fetchData(); }}
            className="glass-card !w-10 !h-10 !p-0 backdrop-blur-xl flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div className={`w-80 border-l-2 border-[#2ba1b9]/20 bg-[#000000] backdrop-blur-2xl flex flex-col shrink-0 transition-all duration-500 z-30 ${sidebarOpen ? "mr-0" : "-mr-80"}`}>
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h2 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest">Fahrer ({mapData.length})</h2>
          <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/5 rounded-lg text-slate-500">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {mapData.map(m => {
            const hasPos = (m.online && m.live_location) || m.last_position;
            const loc = m.online ? m.live_location : m.last_position;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setSelectedDriver(m);
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
                className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all border ${selectedDriver?.id === m.id ? "bg-primary/10 border-primary/20" : "bg-black/60 border-transparent hover:bg-white/5"}`}
              >
                <div className="relative">
                  <div className={`w-10 h-10 rounded-full bg-black border-2 overflow-hidden flex items-center justify-center transition-all ${m.online ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)] animate-[pulse_2s_infinite]" : "border-white/10"}`}>
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
        </div>
      </div>

      {/* Driver Detail Card */}
      <AnimatePresence>
        {selectedDriver && (
          <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            style={{ right: sidebarOpen ? "340px" : "24px" }}
            className="absolute bottom-6 z-[40] w-80 glass-card !p-0 border-primary/20 shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-500"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div
                  className="flex items-center gap-3 cursor-pointer group/profile"
                  onClick={() => onViewProfile?.(selectedDriver.id)}
                >
                  <div className={`w-14 h-14 rounded-2xl bg-black border-2 overflow-hidden flex items-center justify-center transition-all ${selectedDriver.online ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "border-white/10"} group-hover/profile:border-primary/50 transition-colors`}>
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
                <div className="flex items-start gap-3.5 p-4 bg-black/60 border border-white/5 rounded-2xl relative overflow-hidden group/loc">
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
          className="absolute top-6 right-6 z-20 w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center shadow-2xl transition-all hover:scale-110"
        >
          <Users size={20} />
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(16, 185, 129, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .maplibregl-ctrl-bottom-right { margin-right: 20px; margin-bottom: 20px; }
        .maplibregl-ctrl-attrib { display: none !important; }
        .maplibregl-ctrl-group { background: rgba(0,0,0,0.6) !important; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 12px !important; }
        .maplibregl-ctrl-group button { border-color: rgba(255,255,255,0.05) !important; }
      `}</style>
    </div>
  );
};

export default Map;