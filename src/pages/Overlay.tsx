import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Calendar, Users, Package } from 'lucide-react';
import { motion } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import axios from 'axios';
import { API_URL, getAvatarUrl } from '../config';

interface Telemetry {
  connected: boolean;
  gameVersion: number;
  speed: number;
  speedLimit: number;
  cruiseControl: number;
  gear: number;
  rpm: number;
  fuel: number;
  fuelRange: number;
  cargo: string;
  cargoMass: number;
  source: string;
  dest: string;
  navDistance: number;
  navTime: number;
  income: number;
  brand: string;
  model: string;
  wearTruck: number;
  wearCargo: number;
  paused: boolean;
  activeTitle?: string;
  gameType?: number;
}

interface Settings {
  style: 'neon' | 'carbon' | 'minimal';
  layoutType: 'vertical' | 'horizontal' | 'grid';
  showLogo: boolean;
  showMainHud: boolean;
  showDrivers: boolean;
  showEvent: boolean;
  widgetOrder: string[];
  zoom: number;
  bgOpacity: number;
  showGear: boolean;
  showSpeed: boolean;
  showFuel: boolean;
  showRemainingDistance: boolean;
  showETA: boolean;
  showCargo: boolean;
  showIncome: boolean;
}

interface Position {
  x: number;
  y: number;
}

interface Positions {
  [key: string]: Position;
}

interface OnlineDriver {
  name: string;
  online: boolean;
  speed: number;
  destination: string;
  city: string;
  avatar_url?: string;
}

interface NextEvent {
  title: string;
  date: string;
  server: string;
}

// Hook to batch telemetry updates via requestAnimationFrame
function useTelemetry(initialTelemetry: Telemetry): Telemetry {
  const [telemetry, setTelemetry] = useState<Telemetry>(initialTelemetry);
  const pendingRef = useRef<Telemetry | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      const listener = (_: any, data: Telemetry) => {
        pendingRef.current = data;
        if (!rafRef.current) {
          rafRef.current = requestAnimationFrame(() => {
            if (pendingRef.current) {
              setTelemetry(pendingRef.current);
            }
            pendingRef.current = null;
            rafRef.current = null;
          });
        }
      };
      ipcRenderer.on('telemetry-update', listener);
      return () => {
        ipcRenderer.removeListener('telemetry-update', listener);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    } catch (e) {
      // Fallback: no Electron IPC (e.g., during dev preview)
    }
  }, []);

  return telemetry;
}

const DEFAULT_SETTINGS: Settings = {
  style: 'neon',
  layoutType: 'vertical',
  showLogo: true,
  showMainHud: true,
  showDrivers: true,
  showEvent: true,
  widgetOrder: ['logo', 'mainHud', 'event', 'drivers'],
  zoom: 100,
  bgOpacity: 80,
  showGear: true,
  showSpeed: true,
  showFuel: true,
  showRemainingDistance: true,
  showETA: true,
  showCargo: true,
  showIncome: true
};

const MOCK_TELEMETRY: Telemetry = {
  connected: true,
  gameVersion: 1,
  speed: 82.4,
  speedLimit: 80,
  cruiseControl: 80,
  gear: 12,
  rpm: 1250,
  fuel: 380,
  fuelRange: 940,
  cargo: 'Bagger (Liebherr)',
  cargoMass: 24.5,
  source: 'Berlin',
  dest: 'München',
  navDistance: 452000,
  navTime: 23200,
  income: 38500,
  brand: 'Scania',
  model: 'S 580 V8',
  wearTruck: 1.2,
  wearCargo: 0,
  paused: false
};

const OverlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<Settings>(() => {
    const saved = localStorage.getItem('fjoste_overlay_settings');
    if (saved) {
      try {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  const [positions, setPositions] = useState<Positions>(() => {
    const saved = localStorage.getItem('fjoste_overlay_positions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch (e) {}
    }
    // Default layout positions
    return {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 }
    };
  });

  // Use batched telemetry updates; fallback to mock data when not connected
  const telemetry = useTelemetry(MOCK_TELEMETRY);

  const [isLocked, setIsLocked] = useState(true);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);

  // Absolute forced transparency on body, html, and root elements, and prevent right-click context menu
  useEffect(() => {
    document.documentElement.classList.add('is-overlay');
    document.documentElement.classList.remove('light');
    document.body?.classList.add('is-overlay-body');

    const elements = [document.body, document.documentElement, document.getElementById('root')];
    elements.forEach(el => {
      if (el) {
        el.style.setProperty('background', 'transparent', 'important');
        el.style.setProperty('background-color', 'transparent', 'important');
        el.style.setProperty('background-image', 'none', 'important');
      }
    });

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // IPC listeners for settings and lock updates
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('overlay-lock-status').then(setIsLocked).catch(() => {});
      
      const settingsListener = (_: any, newSettings: Settings) => {
        setSettings(newSettings);
      };
      ipcRenderer.on('overlay-settings-updated', settingsListener);

      const lockListener = (_: any, locked: boolean) => {
        setIsLocked(locked);
      };
      ipcRenderer.on('overlay-lock-changed', lockListener);

      const resetListener = () => {
        setPositions({
          logo: { x: 40, y: 40 },
          mainHud: { x: 40, y: 130 },
          event: { x: 40, y: 310 },
          drivers: { x: 40, y: 440 }
        });
      };
      ipcRenderer.on('overlay-positions-reset', resetListener);

      return () => {
        ipcRenderer.removeListener('overlay-settings-updated', settingsListener);
        ipcRenderer.removeListener('overlay-lock-changed', lockListener);
        ipcRenderer.removeListener('overlay-positions-reset', resetListener);
      };
    } catch (e) {}
  }, []);

  // Fetch online drivers list (if enabled)
  useEffect(() => {
    if (!settings.showDrivers) return;

    const fetchOnlineDrivers = async () => {
      try {
        const [mapRes, usersRes] = await Promise.all([
          axios.get(`${API_URL}/trucky/live-map`),
          axios.get(`${API_URL}/management/users`).catch(() => ({ data: [] }))
        ]);
        const liveData = Array.isArray(mapRes.data) ? mapRes.data : [];
        const users = Array.isArray(usersRes.data) ? usersRes.data : [];

        const active = users
          .map((u: any) => {
            const live = liveData.find((l: any) => l && (l.id == u.id || (l.trucky_id && l.trucky_id == u.trucky_driver_id)));
            return {
              name: u.username || u.name,
              online: !!live?.online,
              speed: live?.speed || 0,
              destination: live?.job?.destination || live?.dest || 'Auf Achse',
              city: live?.live_location?.city || live?.source || '',
              avatar_url: u.avatar_url || live?.avatar_url
            };
          })
          .filter((d: any) => d.online);
        setOnlineDrivers(active.slice(0, 5));
      } catch (e) {}
    };

    fetchOnlineDrivers();
    const interval = setInterval(fetchOnlineDrivers, 30000);
    return () => clearInterval(interval);
  }, [settings.showDrivers]);

  // Fetch upcoming event (if enabled)
  useEffect(() => {
    if (!settings.showEvent) return;

    const fetchEvent = async () => {
      try {
        const [res1, res2] = await Promise.all([
          axios.get(`${API_URL}/trucky/events`).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/events/custom`).catch(() => ({ data: [] }))
        ]);
        const all = [
          ...(Array.isArray(res1.data) ? res1.data : []),
          ...(Array.isArray(res2.data) ? res2.data : [])
        ];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const upcoming = all
          .filter((e: any) => e.start_date && new Date(e.start_date) >= startOfToday)
          .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());
        
        if (upcoming.length > 0) {
          const e = upcoming[0];
          setNextEvent({
            title: typeof e.title === 'object' ? (e.title.name || '') : (e.title || ''),
            date: new Date(e.start_date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + ' Uhr',
            server: typeof e.server === 'object' ? (e.server.name || 'TruckersMP') : (e.server || 'TruckersMP')
          });
        } else {
          setNextEvent(null);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchEvent();
    const interval = setInterval(fetchEvent, 60000);
    return () => clearInterval(interval);
  }, [settings.showEvent]);

  const handleDragEnd = (widget: string, _event: any, info: PanInfo) => {
    setPositions(prev => {
      const currentX = prev[widget]?.x !== undefined ? prev[widget].x : 40;
      const currentY = prev[widget]?.y !== undefined ? prev[widget].y : 40;

      // Restrict widget position coordinates to the screen viewport
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;

      // Keep at least a part of the widget visible so it can't get lost off-screen
      const nextX = Math.max(0, Math.min(screenWidth - 80, currentX + info.offset.x));
      const nextY = Math.max(0, Math.min(screenHeight - 40, currentY + info.offset.y));

      const updated = {
        ...prev,
        [widget]: {
          x: nextX,
          y: nextY
        }
      };
      localStorage.setItem('fjoste_overlay_positions', JSON.stringify(updated));
      return updated;
    });
  };

  // UI styling classes based on theme selection
  const getThemeClasses = () => {
    switch (settings.style) {
      case 'carbon':
        return {
          card: 'backdrop-blur-[35px] backdrop-saturate-[130%] border border-amber-500/20 rounded-3xl text-slate-200 select-none shadow-[0_20px_50px_rgba(0,0,0,0.85)] relative overflow-hidden',
          textMuted: 'text-slate-500',
          textActive: 'text-amber-400 font-bold drop-shadow-[0_0_6px_rgba(245,158,11,0.35)]',
          primaryAccent: 'bg-amber-500',
          borderAccent: 'border-amber-500/20',
          barBg: 'bg-black/30 border border-white/5',
          barFill: 'bg-gradient-to-r from-amber-500 to-orange-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]',
          glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]'
        };
      case 'minimal':
        return {
          card: 'backdrop-blur-[35px] backdrop-saturate-[130%] border border-white/10 rounded-2xl text-slate-200 select-none shadow-2xl relative overflow-hidden',
          textMuted: 'text-slate-500',
          textActive: 'text-white',
          primaryAccent: 'bg-white',
          borderAccent: 'border-white/20',
          barBg: 'bg-white/10',
          barFill: 'bg-white',
          glow: ''
        };
      case 'neon':
      default:
        return {
          card: 'backdrop-blur-[45px] backdrop-saturate-[140%] border-2 border-[#2ba1b9]/30 rounded-3xl text-slate-200 select-none shadow-[0_15px_50px_rgba(0,0,0,0.8)] relative overflow-hidden',
          textMuted: 'text-slate-500',
          textActive: 'text-[#22D1EE]',
          primaryAccent: 'bg-primary',
          borderAccent: 'border-[#2ba1b9]/20',
          barBg: 'bg-white/5 border border-white/5',
          barFill: 'bg-gradient-to-r from-primary to-[#0ea5e9] shadow-[0_0_12px_rgba(43,161,185,0.4)]',
          glow: 'shadow-[0_0_15px_rgba(43,161,185,0.3)]'
        };
    }
  };

  const c = getThemeClasses();

  const formatDistance = (meters: number) => {
    if (isNaN(meters)) return '0 km';
    return `${Math.round(meters / 1000)} km`;
  };

  const formatETA = (secRemaining: number) => {
    if (isNaN(secRemaining) || secRemaining <= 0) return '--:--';
    const now = new Date();
    const etaDate = new Date(now.getTime() + secRemaining * 1000);
    return etaDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  };

  const formatRemainingTime = (secRemaining: number) => {
    if (isNaN(secRemaining) || secRemaining <= 0) return '0 Min';
    const totalMinutes = Math.round(secRemaining / 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hrs > 0) {
      return `${hrs} Std ${mins} Min`;
    }
    return `${mins} Min`;
  };

  const renderLogo = () => (
    <div className="flex-1 flex items-center justify-center p-2">
      <img 
        src="logo.png" 
        alt="FJOSTE" 
        className="h-16 w-16 object-contain opacity-80 filter drop-shadow-[0_0_8px_rgba(43,161,185,0.4)]" 
      />
    </div>
  );

  const renderMainHud = () => {
    let gearText = 'N';
    const gear = telemetry?.gear || 0;
    if (gear > 0) gearText = `D${gear}`;
    else if (gear < 0) gearText = `R${Math.abs(gear)}`;

    const maxFuel = 600;
    const fuel = telemetry?.fuel || 0;
    const fuelRange = telemetry?.fuelRange || 0;
    const fuelPercent = Math.min(100, Math.max(0, (fuel / (fuelRange > 0 ? fuel / (fuelRange / 1000) : maxFuel)) * 100));

    const speed = telemetry?.speed || 0;
    const speedLimit = telemetry?.speedLimit || 0;
    const cruiseControl = telemetry?.cruiseControl || 0;
    const rpm = telemetry?.rpm || 0;
    const cargo = telemetry?.cargo || '';
    const cargoMass = telemetry?.cargoMass || 0;
    const income = telemetry?.income || 0;
    const navDistance = telemetry?.navDistance || 0;
    const navTime = telemetry?.navTime || 0;

    const isATS = telemetry?.gameType === 2;
    const timeScale = isATS ? 20 : 19;
    const realNavTime = navTime / timeScale;

    return (
      <div className="flex-1 p-3 flex flex-col justify-between gap-2 min-w-0">
        {/* Speed, Gear, RPM */}
        <div className="flex items-center justify-between gap-4">
          {settings.showSpeed && (
            <div className="flex items-baseline gap-1">
              <span className="font-unbounded text-2xl font-black text-white leading-none tracking-tighter">
                {Math.round(speed)}
              </span>
              <span className={`text-[8px] font-black uppercase tracking-wider ${c.textMuted}`}>KM/H</span>
            </div>
          )}

          {/* RPM Bar */}
          <div className="flex-1 max-w-xs px-2">
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/5 border border-white/5 relative">
              <div 
                className="h-full rounded-full transition-all duration-300"
                style={{ 
                  width: `${Math.min(100, (rpm / 2000) * 100)}%`,
                  backgroundColor: rpm > 1700 ? '#ef4444' : rpm > 1500 ? '#fbbf24' : '#2ba1b9' 
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {speedLimit > 0 && (
              <div className="w-5 h-5 rounded-full border-2 border-red-500 bg-white flex items-center justify-center font-black text-[9px] text-black">
                {Math.round(speedLimit)}
              </div>
            )}
            
            {cruiseControl > 0 && (
              <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded">
                CC {Math.round(cruiseControl)}
              </span>
            )}

            {settings.showGear && (
              <span className="font-unbounded text-xs font-black text-white leading-none bg-white/10 px-2 py-1 rounded-lg">
                {gearText}
              </span>
            )}
          </div>
        </div>

        {/* Cargo manifest details */}
        {settings.showCargo && cargo && cargo.toLowerCase() !== 'none' && (
          <div className="p-1.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3 text-[9px] min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Package size={11} className="text-primary shrink-0" />
              <span className="font-bold text-white truncate">{cargo}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {cargoMass && (
                <span className={`${c.textMuted} font-black italic`}>{Math.round(cargoMass)}t</span>
              )}
              {settings.showIncome && income > 0 && (
                <span className="text-emerald-400 font-bold">{income.toLocaleString('de-DE')} $</span>
              )}
            </div>
          </div>
        )}

        {/* Navigation & Fuel status */}
        <div className="grid grid-cols-2 gap-4 text-[9px]">
          {settings.showFuel && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className={`${c.textMuted} flex items-center gap-1 uppercase font-bold text-[8px]`}>Tank</span>
                <span className="text-white font-bold">{Math.round(fuelRange)} km</span>
              </div>
              <div className={`h-1 w-full rounded-full overflow-hidden ${c.barBg}`}>
                <div 
                  className={`h-full rounded-full ${c.barFill}`} 
                  style={{ width: `${Math.min(100, Math.max(0, fuel * 0.1))}%` }} 
                />
              </div>
            </div>
          )}

          {settings.showRemainingDistance && navDistance > 0 && (
            <div className="space-y-0.5 text-right">
              <div className="flex items-center justify-between">
                <span className={`${c.textMuted} flex items-center gap-1 uppercase font-bold text-[8px]`}>Ziel</span>
                <span className="text-white font-bold">{formatDistance(navDistance)}</span>
              </div>
              <div className="text-[8px] font-medium text-slate-400">
                noch {formatRemainingTime(realNavTime)} {settings.showETA && `(ETA ${formatETA(realNavTime)})`}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEvent = () => {
    if (!nextEvent) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-[10px] uppercase font-bold tracking-wider p-3">
          Keine anstehenden Events
        </div>
      );
    }
    return (
      <div className="flex-1 p-3 flex items-center gap-3 min-w-0">
        <div className="p-2 rounded-xl bg-amber-500/10 shrink-0">
          <Calendar size={14} className="text-amber-500" />
        </div>
        <div className="min-w-0 text-left">
          <p className={`${c.textMuted} text-[8px] font-black uppercase tracking-widest leading-none mb-1`}>Nächstes Event</p>
          <p className="text-xs font-bold text-white truncate leading-tight">{nextEvent.title}</p>
          <p className="text-[9px] text-slate-400 font-medium leading-none mt-1">{nextEvent.date} • {nextEvent.server}</p>
        </div>
      </div>
    );
  };

  const renderDrivers = () => {
    if (onlineDrivers.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-[10px] uppercase font-bold tracking-wider p-3">
          Keine Fahrer online
        </div>
      );
    }
    return (
      <div className="flex-1 p-3 flex flex-col gap-1.5 min-w-0">
        <div className="flex items-center justify-between border-b border-white/5 pb-1">
          <span className="text-white font-bold uppercase tracking-widest text-[8px] flex items-center gap-1"><Users size={10} /> Fahrer Online ({onlineDrivers.length})</span>
        </div>
        <div className="space-y-1">
          {onlineDrivers.map((d, i) => {
            const avatar = getAvatarUrl(d.avatar_url);
            return (
              <div key={i} className="flex items-center justify-between gap-4 p-1 hover:bg-white/[0.02] rounded-lg text-[9px]">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-white/10">
                    {avatar ? (
                      <img src={avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-[8px] font-bold text-slate-400">{d.name.charAt(0)}</span>
                    )}
                  </div>
                  <span className="font-bold text-slate-300 truncate">{d.name}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[8px] text-primary">{d.city}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const shouldShowOverlay = () => {
    // If we are in Setup Mode (unlocked), always show the overlay
    if (!isLocked) return true;

    // If locked, check telemetry data
    if (!telemetry || !telemetry.connected || telemetry.gameVersion === 0) {
      return false;
    }

    // Check if game is in foreground
    const activeTitle = (telemetry.activeTitle || '').toLowerCase();
    const isGameActive = 
      activeTitle.includes('euro truck simulator 2') || 
      activeTitle.includes('american truck simulator') || 
      activeTitle.includes('truckersmp');

    return isGameActive;
  };

  const hideWidgets = isLocked && telemetry && telemetry.paused;
  const showContent = shouldShowOverlay();

  return (
    <div 
      ref={containerRef}
      className="w-screen h-screen overflow-hidden relative select-none"
      style={{
        background: isLocked ? 'transparent' : 'rgba(0, 0, 0, 0.15)',
        willChange: 'transform, opacity',
        opacity: showContent ? 1 : 0,
        pointerEvents: showContent ? 'auto' : 'none',
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      {/* Visual Alignment Grid (only visible when unlocked) */}
      {!isLocked && (
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'radial-gradient(rgba(43, 161, 185, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
      )}

      {/* Aurora style is purely CSS-driven via absolute positioned pseudo elements */}

      {/* Setup Mode Info Banner */}
      {!isLocked && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-[#2ba1b9]/30 px-4 py-2 rounded-xl text-center shadow-lg z-50 pointer-events-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#22D1EE] flex items-center gap-2 justify-center">
            <Unlock size={12} className="animate-pulse" /> Setup-Modus: Widgets verschiebbar
          </p>
          <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
            Sperren mit Strg+Shift+L oder im Hub
          </p>
        </div>
      )}

      {/* Widgets */}
      {settings.widgetOrder.map((widget) => {
        const isEnabled = 
          widget === 'logo' ? settings.showLogo :
          widget === 'mainHud' ? settings.showMainHud :
          widget === 'event' ? (settings.showEvent && (nextEvent || !isLocked)) :
          settings.showDrivers;

        if (!isEnabled) return null;

        let content = null;
        let dimensions = 'w-auto h-auto';
        if (widget === 'logo') {
          content = renderLogo();
          dimensions = 'w-20 h-20 flex items-center justify-center';
        } else if (widget === 'mainHud') {
          content = renderMainHud();
          dimensions = 'w-96 min-h-[120px]';
        } else if (widget === 'event') {
          content = renderEvent();
          dimensions = 'w-72 h-16';
        } else if (widget === 'drivers') {
          content = renderDrivers();
          dimensions = 'w-48 h-auto flex flex-col';
        }

        const widgetX = positions[widget]?.x !== undefined ? positions[widget].x : 40;
        const widgetY = positions[widget]?.y !== undefined ? positions[widget].y : 40;

        return (
          <motion.div
            key={widget}
            drag={!isLocked}
            dragElastic={0}
            dragMomentum={false}
            onDragEnd={(event, info) => handleDragEnd(widget, event, info)}
            className="absolute"
            animate={{ opacity: hideWidgets ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            style={{
              left: 0,
              top: 0,
              x: widgetX,
              y: widgetY,
              zIndex: widget === 'logo' ? 10 : 20,
              transition: 'none', // Remove any CSS transition that lags dragging
              pointerEvents: hideWidgets ? 'none' : 'auto',
            }}
          >
            <div
              className={`${dimensions} ${c.card} ${!isLocked ? 'cursor-grab active:cursor-grabbing border-dashed border-primary/50' : 'border-solid'}`}
              style={{
                transform: `scale(${settings.zoom / 100})`,
                transformOrigin: 'top left',
                backgroundColor: `rgba(0, 0, 0, ${settings.bgOpacity / 100})`,
              }}
            >
              {/* Acrylic Noise Overlay */}
              <div className="acrylic-noise" />
              {/* Carbon Fiber Pattern Overlay */}
              {settings.style === 'carbon' && <div className="carbon-pattern" />}
              {/* Grab handle overlay (only visible when unlocked) */}
              {!isLocked && (
                <div className="absolute inset-0 bg-primary/[0.02] border border-[#22D1EE]/20 rounded-[inherit] pointer-events-none group-hover:border-[#22D1EE]/40 transition-colors" />
              )}
              {content}
            </div>
          </motion.div>
        );
      })}

      <style>{`
        .acrylic-noise {
          position: absolute;
          inset: 0;
          z-index: -5;
          opacity: 0.022;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }
        .carbon-pattern {
          position: absolute;
          inset: 0;
          z-index: -4;
          opacity: 0.08;
          pointer-events: none;
          background-color: #000;
          background-image: 
            linear-gradient(45deg, #111 25%, transparent 25%), 
            linear-gradient(-45deg, #111 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, #111 75%), 
            linear-gradient(-45deg, transparent 75%, #111 75%);
          background-size: 8px 8px;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default OverlayPage;
