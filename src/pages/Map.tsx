import { useEffect, useState, useRef, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { RefreshCw, Truck, MapPin, Clock, Users, X, Map as MapIcon, ChevronRight, Gauge, Package, ArrowRight, Globe } from 'lucide-react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL, getAvatarUrl } from '../config';

const MAP_STYLE_DARK = {
  version: 8,
  sources: {
    "carto-dark": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png?lang=de",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png?lang=de",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png?lang=de",
      ],
      tileSize: 256,
      attribution: '&copy; CARTO &copy; OSM',
    },
  },
  layers: [{ id: "carto-base", type: "raster", source: "carto-dark" }],
};

const MAP_STYLE_LIGHT = {
  version: 8,
  sources: {
    "carto-light": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png?lang=de",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png?lang=de",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png?lang=de",
      ],
      tileSize: 256,
      attribution: '&copy; CARTO &copy; OSM',
    },
  },
  layers: [{ id: "carto-base", type: "raster", source: "carto-light" }],
};

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
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: (theme === 'light' ? MAP_STYLE_LIGHT : MAP_STYLE_DARK) as any,
      center: [12, 51],
      zoom: 4.5,
      attributionControl: false,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    mapRef.current = map;
    return () => map.remove();
  }, []);

  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setStyle(theme === 'light' ? MAP_STYLE_LIGHT : MAP_STYLE_DARK);
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
          mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 8, duration: 1500 });
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
      if (!loc || loc.lat == null || loc.lng == null) return;

      let lat = loc.lat;
      let lng = loc.lng;

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
        map.flyTo({ center: [lng, lat], zoom: 8, duration: 1500 });
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
                    mapRef.current.flyTo({ center: [loc.lng, loc.lat], zoom: 8, duration: 1500 });
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
