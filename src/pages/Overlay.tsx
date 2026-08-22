import React, { useState, useEffect, useRef } from 'react';
import { Lock, Unlock, Calendar, Users, Package, Gauge, Fuel, MapPin, Clock, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import { API_URL, getAvatarUrl } from '../config';
import SpotifyWidget from '../components/SpotifyWidget';
import GameMapWidget, { type GameMapWidgetHandle } from '../components/GameMapWidget';
import { loadAllCities, findCity, findClosestCity } from '../data/ets2Cities';

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
  activeProcess?: string;
  gameType?: number;
  posX?: number;
  posY?: number;
  posZ?: number;
  heading?: number;
  parkBrake?: boolean;
  blinkerLeftActive?: boolean;
  blinkerRightActive?: boolean;
  blinkerLeftOn?: boolean;
  blinkerRightOn?: boolean;
  lightsBeamLow?: boolean;
  lightsBeamHigh?: boolean;
  lightsHazard?: boolean;
  lightsBeacon?: boolean;
  fuelWarning?: boolean;
  airPressureWarning?: boolean;
  oilPressureWarning?: boolean;
  waterTemperatureWarning?: boolean;
  batteryVoltageWarning?: boolean;
}

interface Settings {
  style: 'neon' | 'carbon' | 'minimal' | 'custom';
  layoutType: 'vertical' | 'horizontal' | 'grid';
  showLogo: boolean;
  showMainHud: boolean;
  showDrivers: boolean;
  showEvent: boolean;
  showSpotify: boolean;
  showGameMap: boolean;
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
  widgetSizes?: Record<string, { w: number, h: number }>;
  singleRowHud?: boolean;
  customAccentColor?: string;
  trafficJamNotify?: boolean;
  trafficServer?: string;
  showTacho?: boolean;
  tachoDesign?: 'modern' | 'classic' | 'racing' | 'custom';
  tachoWidgetPositions?: Record<string, Position>;
  tachoWidgetSizes?: Record<string, { w: number, h: number }>;
  tachoEnabledWidgets?: Record<string, boolean>;
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
  showSpotify: true,
  showGameMap: true,
  widgetOrder: ['logo', 'mainHud', 'event', 'drivers', 'spotify', 'gameMap'],
  zoom: 100,
  bgOpacity: 0,
  showGear: true,
  showSpeed: true,
  showFuel: true,
  showRemainingDistance: true,
  showETA: true,
  showCargo: true,
  showIncome: true,
  widgetSizes: {
    logo: { w: 80, h: 80 },
    mainHud: { w: 384, h: 120 },
    event: { w: 288, h: 64 },
    drivers: { w: 192, h: 0 },
    spotify: { w: 280, h: 140 },
    gameMap: { w: 300, h: 200 }
  },
  singleRowHud: false,
  customAccentColor: '#f59e0b',
  blockCollisions: true,
  cityEntryNotify: true,
  trafficJamNotify: true,
  trafficServer: 'sim1',
  tachoDesign: 'modern',
  tachoWidgetPositions: {
    analogSpeed: { x: 40, y: 65 },
    analogRpm: { x: 734, y: 65 },
    digitalSpeed: { x: 362, y: 160 },
    digitalRpm: { x: 272, y: 70 },
    indicators: { x: 387, y: 15 },
    cargoStats: { x: 20, y: 20 },
    damageStats: { x: 20, y: 240 },
    routeDetails: { x: 764, y: 20 },
    fuelStats: { x: 764, y: 240 },
    jobFooter: { x: 50, y: 320 }
  },
  tachoWidgetSizes: {
    analogSpeed: { w: 250, h: 250 },
    analogRpm: { w: 250, h: 250 },
    digitalSpeed: { w: 300, h: 130 },
    digitalRpm: { w: 480, h: 70 },
    indicators: { w: 250, h: 40 },
    cargoStats: { w: 240, h: 200 },
    damageStats: { w: 240, h: 100 },
    routeDetails: { w: 240, h: 200 },
    fuelStats: { w: 240, h: 100 },
    jobFooter: { w: 924, h: 45 }
  },
  tachoEnabledWidgets: {
    analogSpeed: false,
    analogRpm: false,
    digitalSpeed: true,
    digitalRpm: true,
    indicators: true,
    cargoStats: true,
    damageStats: true,
    routeDetails: true,
    fuelStats: true,
    jobFooter: false
  }
};

const getWidgetDefaultSize = (widget: string, singleRowHud: boolean) => {
  if (widget === 'mainHud') {
    return singleRowHud ? { w: 680, h: 52 } : { w: 384, h: 120 };
  }
  const defaults: Record<string, { w: number, h: number }> = {
    logo: { w: 80, h: 80 },
    event: { w: 288, h: 64 },
    drivers: { w: 192, h: 0 },
    spotify: { w: 280, h: 140 },
    gameMap: { w: 300, h: 200 }
  };
  return defaults[widget] || { w: 80, h: 80 };
};

const OverlayPage: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<Settings>(() => {
    let base = DEFAULT_SETTINGS;
    const saved = localStorage.getItem('openpipeclub_overlay_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.widgetOrder && Array.isArray(parsed.widgetOrder)) {
          const missing = DEFAULT_SETTINGS.widgetOrder.filter(w => !parsed.widgetOrder.includes(w));
          parsed.widgetOrder = [...parsed.widgetOrder, ...missing];
        }
        base = { ...DEFAULT_SETTINGS, ...parsed };
      } catch (e) { }
    }

    // Merge correct sizes
    const isSingle = base.singleRowHud || false;
    const sizeKey = isSingle ? 'openpipeclub_overlay_widget_sizes_single' : 'openpipeclub_overlay_widget_sizes';
    const savedSizes = localStorage.getItem(sizeKey);
    if (savedSizes) {
      try {
        base.widgetSizes = { ...DEFAULT_SETTINGS.widgetSizes, ...JSON.parse(savedSizes) };
      } catch (e) { }
    }
    return base;
  });

  const [positions, setPositions] = useState<Positions>(() => {
    const savedSettings = localStorage.getItem('openpipeclub_overlay_settings');
    let isSingle = false;
    if (savedSettings) {
      try {
        isSingle = !!JSON.parse(savedSettings).singleRowHud;
      } catch (e) { }
    }
    const posKey = isSingle ? 'openpipeclub_overlay_positions_single' : 'openpipeclub_overlay_positions';
    const saved = localStorage.getItem(posKey);
    const defaultPositions = {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 },
      spotify: { x: 40, y: 580 },
      gameMap: { x: 40, y: 740 }
    };
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...defaultPositions, ...parsed };
        }
      } catch (e) { }
    }
    // Default layout positions
    return defaultPositions;
  });

  // Use batched telemetry updates via requestAnimationFrame
  const telemetry = useTelemetry({ connected: false } as Telemetry);

  useEffect(() => {
    if (!telemetry.jobActive) {
      mapWidgetRef.current?.clearRoute();
    }
  }, [telemetry.jobActive]);

  const [isLocked, setIsLocked] = useState(true);
  const [onlineDrivers, setOnlineDrivers] = useState<OnlineDriver[]>([]);
  const [nextEvent, setNextEvent] = useState<NextEvent | null>(null);

  // Overlay Notification State & Refs
  interface OverlayNotification {
    id: string;
    type: 'city' | 'traffic';
    title: string;
    message: string;
  }

  const [overlayNotify, setOverlayNotify] = useState<OverlayNotification | null>(null);
  const lastCityGameNameRef = useRef<string | null>(null);
  const lastWarnedTrafficJamsRef = useRef<Record<string, number>>({});
  const trafficDataRef = useRef<any[]>([]);
  const mapWidgetRef = useRef<GameMapWidgetHandle>(null);

  // Load cities once
  useEffect(() => {
    loadAllCities();
  }, []);

  // Poll traffic data for notifications
  useEffect(() => {
    const fetchTrafficForOverlay = async () => {
      if (settings.cityEntryNotify === false && settings.trafficJamNotify === false) return;
      try {
        const server = settings.trafficServer || 'sim1';
        const res = await axios.get(`${API_URL}/trucky/traffic?server=${server}&game=ets2`);
        if (Array.isArray(res.data?.response)) {
          trafficDataRef.current = res.data.response;
        }
      } catch (e) { }
    };

    fetchTrafficForOverlay();
    const interval = setInterval(fetchTrafficForOverlay, 25000);
    return () => clearInterval(interval);
  }, [settings.cityEntryNotify, settings.trafficJamNotify, settings.trafficServer]);

  // Telemetry position check for City Entry & Traffic Jam Warning
  useEffect(() => {
    if (!telemetry || !telemetry.connected || telemetry.posX == null || telemetry.posZ == null) return;
    if (telemetry.posX === 0 && telemetry.posZ === 0) return;

    const px = telemetry.posX;
    const pz = telemetry.posZ;

    // 1. City Entry Check
    if (settings.cityEntryNotify !== false) {
      const closest = findClosestCity(px, pz, 3000);
      if (closest && closest.city) {
        const cityKey = closest.city.gameName.toLowerCase();
        if (lastCityGameNameRef.current !== cityKey) {
          lastCityGameNameRef.current = cityKey;

          let playersInCity = 0;
          trafficDataRef.current.forEach((countryItem: any) => {
            (countryItem.locations || []).forEach((loc: any) => {
              const matchedCity = findCity(loc.name);
              if (matchedCity && matchedCity.gameName.toLowerCase() === cityKey) {
                playersInCity = Math.max(playersInCity, loc.players || 0);
              }
            });
          });

          setOverlayNotify({
            id: `city-${Date.now()}`,
            type: 'city',
            title: `Stadt betreten: ${closest.city.realName}`,
            message: `${playersInCity} ${playersInCity === 1 ? 'Spieler' : 'Spieler'} in der Stadt (${closest.city.country.toUpperCase()})`
          });

          setTimeout(() => {
            setOverlayNotify(current => current?.id.startsWith('city-') ? null : current);
          }, 6000);
        }
      }
    }

    // 2. Traffic Jam Proximity Warning
    if (settings.trafficJamNotify !== false && trafficDataRef.current.length > 0) {
      const SPECIAL_ROAD_COORDS: Record<string, [number, number]> = {
        "alpen road": [47.263, 11.395],
        "c-d road": [51.050, 4.350],
        "cd road": [51.050, 4.350],
        "calais - duisburg": [51.050, 4.350],
      };

      const now = Date.now();
      trafficDataRef.current.forEach((countryItem: any) => {
        (countryItem.locations || []).forEach((loc: any) => {
          if (loc.trafficJams > 0 || loc.severity === 'Congested' || loc.severity === 'Heavy' || loc.severity === 'Jam') {
            let gameX: number | null = null;
            let gameZ: number | null = null;

            const locLower = (loc.name || '').toLowerCase().trim();
            if (SPECIAL_ROAD_COORDS[locLower]) {
              const city = findCity(loc.name);
              if (city) { gameX = city.x; gameZ = city.z; }
            } else {
              const city = findCity(loc.name);
              if (city) { gameX = city.x; gameZ = city.z; }
            }

            if (gameX != null && gameZ != null) {
              const dx = gameX - px;
              const dz = gameZ - pz;
              const dist = Math.sqrt(dx * dx + dz * dz);

              if (dist <= 4000) {
                const lastWarned = lastWarnedTrafficJamsRef.current[loc.name] || 0;
                if (now - lastWarned > 180000) { // Warn once every 3 minutes per location
                  lastWarnedTrafficJamsRef.current[loc.name] = now;

                  const cleanName = loc.name.replace(/\s*\((City|Road)\)/i, '');
                  setOverlayNotify({
                    id: `traffic-${Date.now()}`,
                    type: 'traffic',
                    title: `⚠️ Stau-Warnung: ${cleanName}`,
                    message: `${loc.playersInvolvedInTrafficJams || loc.players} Spieler im Stau (${loc.severity})`
                  });

                  setTimeout(() => {
                    setOverlayNotify(current => current?.id.startsWith('traffic-') ? null : current);
                  }, 7000);
                }
              }
            }
          }
        });
      });
    }
  }, [telemetry?.posX, telemetry?.posZ, telemetry?.connected, settings.cityEntryNotify, settings.trafficJamNotify]);

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
      ipcRenderer.invoke('overlay-lock-status').then(setIsLocked).catch(() => { });

      const settingsListener = (_: any, newSettings: Settings) => {
        let merged = { ...DEFAULT_SETTINGS, ...newSettings };
        if (merged.widgetOrder && Array.isArray(merged.widgetOrder)) {
          const missing = DEFAULT_SETTINGS.widgetOrder.filter(w => !merged.widgetOrder.includes(w));
          merged.widgetOrder = [...merged.widgetOrder, ...missing];
        }
        setSettings(merged);
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
          drivers: { x: 40, y: 440 },
          spotify: { x: 40, y: 580 },
          gameMap: { x: 40, y: 740 }
        });
      };
      ipcRenderer.on('overlay-positions-reset', resetListener);

      const positionsListener = (_: any, newPositions: Positions) => {
        setPositions(prev => ({ ...prev, ...newPositions }));
      };
      ipcRenderer.on('overlay-positions-updated', positionsListener);

      // Pull the current overlay state explicitly. The main process also pushes
      // this during `did-finish-load`, but that fires before these listeners are
      // registered (React mounts afterwards) — on a cold start that push is
      // missed. Requesting it here guarantees a correctly configured overlay
      // on every launch, no matter the bundle cache state.
      ipcRenderer.invoke('overlay-get-state').then((state: any) => {
        if (!state) return;
        if (typeof state.lock === 'boolean') setIsLocked(state.lock);
        if (state.settings) settingsListener(_, state.settings);
        if (state.positions) setPositions((prev: Positions) => ({ ...prev, ...state.positions }));
      }).catch(() => { });

      return () => {
        ipcRenderer.removeListener('overlay-settings-updated', settingsListener);
        ipcRenderer.removeListener('overlay-lock-changed', lockListener);
        ipcRenderer.removeListener('overlay-positions-reset', resetListener);
        ipcRenderer.removeListener('overlay-positions-updated', positionsListener);
      };
    } catch (e) { }
  }, []);

  // Fallback listener for localStorage settings sync in standard web browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'openpipeclub_overlay_settings') {
        try {
          const newSettings = JSON.parse(e.newValue || '');
          if (newSettings) {
            // Correctly load and merge the active widget sizes for the current singleRowHud setting
            const isSingle = newSettings.singleRowHud || false;
            const sizeKey = isSingle ? 'openpipeclub_overlay_widget_sizes_single' : 'openpipeclub_overlay_widget_sizes';
            const savedSizes = localStorage.getItem(sizeKey);
            if (savedSizes) {
              try {
                newSettings.widgetSizes = JSON.parse(savedSizes);
              } catch (err) { }
            }
            setSettings(prev => ({ ...prev, ...newSettings }));
          }
        } catch (err) { }
      } else if (e.key === 'openpipeclub_overlay_widget_sizes' || e.key === 'openpipeclub_overlay_widget_sizes_single') {
        // Also listen to widget size changes directly
        const isSingle = settings.singleRowHud || false;
        const activeKey = isSingle ? 'openpipeclub_overlay_widget_sizes_single' : 'openpipeclub_overlay_widget_sizes';
        if (e.key === activeKey) {
          try {
            const newSizes = JSON.parse(e.newValue || '');
            if (newSizes) {
              setSettings(prev => ({ ...prev, widgetSizes: newSizes }));
            }
          } catch (err) { }
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [settings.singleRowHud]);

  // Load/switch positions when singleRowHud changes in Overlay page
  useEffect(() => {
    const isSingle = settings.singleRowHud || false;
    const posKey = isSingle ? 'openpipeclub_overlay_positions_single' : 'openpipeclub_overlay_positions';

    const savedPos = localStorage.getItem(posKey);
    let resolvedPos = {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 },
      spotify: { x: 40, y: 580 },
      gameMap: { x: 40, y: 740 }
    };
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        if (parsed && typeof parsed === 'object') {
          resolvedPos = parsed;
        }
      } catch (e) { }
    }
    setPositions(resolvedPos);
  }, [settings.singleRowHud]);

  // Listen to job notifications
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      const jobEventListener = (_: any, event: any) => {
        console.log("Overlay: Notification erhalten", event);
        let title = '';
        let content = '';

        if (event.type === 'system') {
          title = `🔔 ${event.title || 'System'}`;
          content = event.content || '';
        } else {
          title = event.type === 'start' ? 'Job Gestartet' : event.type === 'delivered' ? 'Job Abgeliefert' : event.type === 'cancelled' ? 'Job Abgebrochen' : event.type === 'resumed' ? 'Job Fortgesetzt' : title;
          content = event.type === 'start'
            ? `${event.cargo} von ${event.source} nach ${event.dest}`
            : `Fahrt beendet. Status: ${event.type === 'delivered' ? 'Erfolgreich' : 'Abgebrochen'}`;
        }

        // Trigger visual toast notifications
        if (event.type === 'system') {
          toast(event.title || 'System-Meldung', {
            description: event.content || '',
            duration: 5000,
            className: 'custom-toast toast-resumed frosted-card',
          });
        } else if (event.type === 'start' || event.type === 'delivered') {
          const toastClass = event.type === 'start' ? 'toast-start' : 'toast-resumed';
          toast.success(title, {
            description: content,
            duration: 5000,
            className: `custom-toast ${toastClass} frosted-card`,
          });
        } else if (event.type === 'cancelled') {
          toast.error(title, {
            description: content,
            duration: 5000,
            className: 'custom-toast toast-cancelled frosted-card',
          });
        } else if (event.type === 'resumed') {
          toast.info(title, {
            description: content,
            duration: 5000,
            className: 'custom-toast frosted-card',
          });
        }

        if (event.type !== 'system' && event.type !== 'chat' && event.type !== 'chat_group') {
          // Play sound for real-time notifications
          const audio = new Audio('sounds/start.mp3');
          audio.volume = 0.15;
          audio.play().catch(() => { });
        }
      };

      ipcRenderer.on('job-notification', jobEventListener);
      return () => {
        ipcRenderer.removeListener('job-notification', jobEventListener);
      };
    } catch (e) {
      console.warn("Electron IPC not available in Overlay");
    }
  }, []);

  // Fetch online drivers list (if enabled)
  useEffect(() => {
    if (!settings.showDrivers) return;

    const fetchOnlineDrivers = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const [mapRes, usersRes] = await Promise.all([
          axios.get(`${API_URL}/live-map`, { headers }).catch(() => ({ data: [] })),
          axios.get(`${API_URL}/management/users`, { headers }).catch(() => ({ data: [] }))
        ]);
        const liveData = Array.isArray(mapRes.data) ? mapRes.data : [];
        const users = Array.isArray(usersRes.data) ? usersRes.data : [];

        const active = users
          .filter((u: any) => u !== null && u !== undefined)
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
      } catch (e) { }
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
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await axios.get(`${API_URL}/events`, { headers }).catch(() => ({ data: [] }));
        const all = Array.isArray(res.data) ? res.data : [];
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const upcoming = all
          .filter((e: any) => e && e.start_date && new Date(e.start_date) >= startOfToday)
          .sort((a: any, b: any) => {
            const timeA = new Date(a.start_date).getTime();
            const timeB = new Date(b.start_date).getTime();
            return timeA - timeB;
          });

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
      const isSingle = settings.singleRowHud || false;
      const posKey = isSingle ? 'openpipeclub_overlay_positions_single' : 'openpipeclub_overlay_positions';
      localStorage.setItem(posKey, JSON.stringify(updated));
      return updated;
    });
  };

  // UI styling classes based on theme selection
  const getThemeClasses = () => {
    switch (settings.style) {
      case 'carbon':
        return {
          card: 'border border-amber-500/20 rounded-3xl text-slate-200 select-none backdrop-blur-md relative overflow-hidden',
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
          card: 'border border-white/10 rounded-2xl text-slate-200 select-none backdrop-blur-md relative overflow-hidden',
          textMuted: 'text-slate-500',
          textActive: 'text-white',
          primaryAccent: 'bg-white',
          borderAccent: 'border-white/20',
          barBg: 'bg-white/10',
          barFill: 'bg-white',
          glow: ''
        };
      case 'custom':
        return {
          card: 'border border-[var(--custom-border)] rounded-3xl text-slate-200 select-none backdrop-blur-md relative overflow-hidden',
          textMuted: 'text-slate-500',
          textActive: 'text-[var(--custom-accent)] font-bold drop-shadow-[0_0_6px_var(--custom-glow)]',
          primaryAccent: 'bg-[var(--custom-accent)]',
          borderAccent: 'border-[var(--custom-border)]',
          barBg: 'bg-white/5 border border-white/5',
          barFill: 'bg-[var(--custom-accent)] shadow-[0_0_12px_var(--custom-glow)]',
          glow: 'shadow-[0_0_15px_var(--custom-glow-subtle)]'
        };
      case 'neon':
      default:
        return {
          card: 'border border-[#f59e0b]/30 rounded-3xl text-slate-200 select-none backdrop-blur-md relative overflow-hidden',
          textMuted: 'text-slate-500',
          textActive: 'text-[#f59e0b]',
          primaryAccent: 'bg-primary',
          borderAccent: 'border-[#f59e0b]/20',
          barBg: 'bg-white/5 border border-white/5',
          barFill: 'bg-gradient-to-r from-primary to-[#0ea5e9] shadow-[0_0_12px_rgba(245, 158, 11,0.4)]',
          glow: 'shadow-[0_0_15px_rgba(245, 158, 11,0.3)]'
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
        alt="Open Pipe Club"
        className="h-16 w-16 object-contain opacity-80 filter drop-shadow-[0_0_8px_rgba(245, 158, 11,0.4)]"
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

    if (settings.singleRowHud) {
      return (
        <div className="flex-1 px-3 py-1 flex flex-row items-center justify-between gap-3 min-w-0 h-full select-none">
          {/* Section 1: Speed, Speed Limit, CC, Gear */}
          <div className="flex items-center gap-2.5 shrink-0">
            {settings.showSpeed && (
              <div className="flex items-baseline gap-0.5">
                <span className="font-unbounded text-xl font-black text-white leading-none tracking-tighter">
                  {Math.round(speed)}
                </span>
                <span className={`text-[7px] font-black uppercase tracking-wider ${c.textMuted}`}>KM/H</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              {speedLimit > 0 && (
                <div className="w-4 h-4 rounded-full border border-red-500 bg-white flex items-center justify-center font-black text-[8px] text-black">
                  {Math.round(speedLimit)}
                </div>
              )}
              {cruiseControl > 0 && (
                <span className="text-[7px] font-black uppercase tracking-tight text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.5 rounded">
                  CC {Math.round(cruiseControl)}
                </span>
              )}
            </div>

            {settings.showGear && (
              <span className="font-unbounded text-[9px] font-black text-white leading-none bg-white/10 px-1.5 py-0.5 rounded-md">
                {gearText}
              </span>
            )}
          </div>

          {/* Section 2: RPM Bar */}
          <div className="flex-1 max-w-[120px] px-3 shrink-0 flex items-center h-5">
            <div className="h-1.5 w-full rounded-full overflow-hidden bg-white/5 border border-white/5 relative">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (rpm / 2000) * 100)}%`,
                  backgroundColor: rpm > 1700 ? '#ef4444' : rpm > 1500 ? '#fbbf24' : '#f59e0b'
                }}
              />
            </div>
          </div>

          {/* Section 3: Cargo Manifest */}
          {settings.showCargo && cargo && cargo.toLowerCase() !== 'none' && (
            <div className="flex items-center gap-2 px-3 shrink-0 text-[9px] min-w-0 max-w-[180px] h-5">
              <Package size={11} className="text-primary shrink-0" />
              <span className="font-bold text-white truncate">{cargo}</span>
              {cargoMass && (
                <span className={`${c.textMuted} font-black shrink-0`}>{Math.round(cargoMass)}t</span>
              )}
              {settings.showIncome && income > 0 && (
                <span className="text-emerald-400 font-bold shrink-0">{income.toLocaleString('de-DE')} $</span>
              )}
            </div>
          )}

          {/* Section 4: Fuel & Navigation */}
          {(settings.showFuel || (settings.showRemainingDistance && navDistance > 0)) && (
            <div className="flex items-center gap-3 pl-3 shrink-0 text-[9px] h-5">
              {settings.showFuel && (
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col text-left">
                    <span className={`${c.textMuted} font-bold text-[7px] uppercase leading-none mb-0.5`}>Tank</span>
                    <span className="text-white font-bold leading-none">{Math.round(fuelRange)} km</span>
                  </div>
                  <div className={`h-1 w-8 rounded-full overflow-hidden ${c.barBg}`}>
                    <div
                      className={`h-full rounded-full ${c.barFill}`}
                      style={{ width: `${Math.min(100, Math.max(0, fuel * 0.1))}%` }}
                    />
                  </div>
                </div>
              )}

              {settings.showRemainingDistance && navDistance > 0 && (
                <div className="flex flex-col text-right justify-center">
                  <div className="flex items-center gap-1 justify-end">
                    <span className={`${c.textMuted} font-bold text-[7px] uppercase leading-none`}>Ziel</span>
                    <span className="text-white font-bold leading-none">{formatDistance(navDistance)}</span>
                  </div>
                  <div className="text-[7.5px] font-medium text-slate-400 mt-0.5">
                    noch {formatRemainingTime(realNavTime)} {settings.showETA && `(ETA ${formatETA(realNavTime)})`}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

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
                  backgroundColor: rpm > 1700 ? '#ef4444' : rpm > 1500 ? '#fbbf24' : '#f59e0b'
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

  const renderSpotify = () => {
    return <SpotifyWidget themeClasses={c} isLocked={isLocked} />;
  };

  const renderGameMap = () => {
    const mapW = settings.widgetSizes?.gameMap?.w || 300;
    const mapH = settings.widgetSizes?.gameMap?.h || 200;
    return (
      <GameMapWidget
        ref={mapWidgetRef}
        gameX={telemetry?.posX}
        gameY={telemetry?.posZ}
        heading={telemetry?.heading}
        source={(telemetry?.jobActive && telemetry?.source) || undefined}
        dest={(telemetry?.jobActive && telemetry?.dest) || undefined}
        navDistance={(telemetry?.jobActive && telemetry?.navDistance) || undefined}
        connected={(telemetry?.connected && telemetry?.jobActive) || false}
        accentColor={
          settings.style === 'carbon' ? '#f59e0b' :
            settings.style === 'minimal' ? '#ffffff' :
              settings.style === 'custom' ? (settings.customAccentColor || '#f59e0b') :
                '#f59e0b'
        }
        width={mapW}
        height={mapH}
      />
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
        pointerEvents: 'none',
        transition: 'opacity 0.2s ease-in-out'
      }}
    >
      {/* Visual Alignment Grid (only visible when unlocked) */}
      {!isLocked && (
        <div className="absolute inset-0 pointer-events-none opacity-20" style={{
          backgroundImage: 'radial-gradient(rgba(245, 158, 11, 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }} />
      )}

      {/* Aurora style is purely CSS-driven via absolute positioned pseudo elements */}

      {/* Setup Mode Info Banner */}
      {!isLocked && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-[#f59e0b]/30 px-4 py-2 rounded-xl text-center shadow-lg z-50 pointer-events-none">
          <p className="text-[10px] font-black uppercase tracking-widest text-[#f59e0b] flex items-center gap-2 justify-center">
            <Unlock size={12} className="animate-pulse" /> Vorschaumodus
          </p>
        </div>
      )}

      {/* Top Overlay Notification Banner (City Entry & Traffic Jam Warning) */}
      <AnimatePresence>
        {overlayNotify && (
          <motion.div
            key={overlayNotify.id}
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[99999] pointer-events-auto"
          >
            <div className={`px-5 py-3 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-3.5 ${
              overlayNotify.type === 'traffic'
                ? 'bg-zinc-950/95 border-red-500/50 text-white shadow-[0_10px_30px_rgba(239,68,68,0.35)]'
                : 'bg-zinc-950/95 border-amber-500/50 text-white shadow-[0_10px_30px_rgba(245,158,11,0.35)]'
            }`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                overlayNotify.type === 'traffic' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                {overlayNotify.type === 'traffic' ? <AlertTriangle size={20} className="animate-pulse" /> : <MapPin size={20} />}
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  {overlayNotify.title}
                </h4>
                <p className="text-[11px] font-bold text-slate-300">
                  {overlayNotify.message}
                </p>
              </div>
              <button
                onClick={() => setOverlayNotify(null)}
                className="ml-2 p-1 text-slate-500 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Widgets */}
      {settings.widgetOrder.map((widget) => {
        const isEnabled =
          widget === 'logo' ? settings.showLogo :
            widget === 'mainHud' ? settings.showMainHud :
              widget === 'event' ? (settings.showEvent && (nextEvent || !isLocked)) :
                widget === 'spotify' ? settings.showSpotify :
                  widget === 'gameMap' ? settings.showGameMap :
                    settings.showDrivers;

        if (!isEnabled) return null;

        let content = null;
        let dimensions = 'w-auto h-auto';
        if (widget === 'logo') {
          content = renderLogo();
          dimensions = '';
        } else if (widget === 'mainHud') {
          content = renderMainHud();
          dimensions = '';
        } else if (widget === 'event') {
          content = renderEvent();
          dimensions = '';
        } else if (widget === 'spotify') {
          content = renderSpotify();
          dimensions = '';
        } else if (widget === 'drivers') {
          content = renderDrivers();
          dimensions = '';
        } else if (widget === 'gameMap') {
          content = renderGameMap();
          dimensions = '';
        }

        const widgetX = positions[widget]?.x !== undefined ? positions[widget].x : 40;
        const widgetY = positions[widget]?.y !== undefined ? positions[widget].y : 40;

        return (
          <motion.div
            key={widget}
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
              className={`${dimensions} ${c.card} ${!isLocked ? 'border-dashed border-primary/50' : isLocked && settings.bgOpacity === 0 ? 'border-none shadow-none' : 'border-solid'}`}
              style={{
                // Apply stored widget dimensions if available
                width: settings.widgetSizes?.[widget]?.w
                  ? `${settings.widgetSizes[widget].w}px`
                  : `${getWidgetDefaultSize(widget, settings.singleRowHud || false).w}px`,
                height: settings.widgetSizes?.[widget]?.h
                  ? `${settings.widgetSizes[widget].h}px`
                  : getWidgetDefaultSize(widget, settings.singleRowHud || false).h > 0
                    ? `${getWidgetDefaultSize(widget, settings.singleRowHud || false).h}px`
                    : undefined,
                transform: `scale(${settings.zoom / 100})`,
                transformOrigin: 'top left',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: settings.bgOpacity > 0 ? `rgba(0, 0, 0, ${settings.bgOpacity / 100})` : 'transparent',
                boxShadow: isLocked && settings.bgOpacity === 0 ? 'none' : undefined,
                border: isLocked && settings.bgOpacity === 0 ? 'none' : undefined,
                // Custom accent properties
                '--custom-accent': settings.customAccentColor || '#f59e0b',
                '--custom-border': `${settings.customAccentColor || '#f59e0b'}33`,
                '--custom-glow': `${settings.customAccentColor || '#f59e0b'}80`,
                '--custom-glow-subtle': `${settings.customAccentColor || '#f59e0b'}26`,
              } as React.CSSProperties}
            >

              {/* Acrylic Noise Overlay */}
              <div className="acrylic-noise" />
              {/* Carbon Fiber Pattern Overlay */}
              {settings.style === 'carbon' && <div className="carbon-pattern" />}
              {/* Grab handle overlay (only visible when unlocked) */}
              {!isLocked && (
                <div className="absolute inset-0 bg-primary/[0.02] border border-[#f59e0b]/20 rounded-[inherit] pointer-events-none group-hover:border-[#f59e0b]/40 transition-colors" />
              )}
              {content}
            </div>
          </motion.div>
        );
      })}

      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(13, 15, 23, 0.35)',
            backdropFilter: 'blur(24px) saturate(210%) contrast(105%)',
            WebkitBackdropFilter: 'blur(24px) saturate(210%) contrast(105%)',
            border: '1px solid rgba(255, 255, 255, 0.13)',
            color: '#f8fafc',
            boxShadow: 'none',
          },
          className: 'custom-toast',
        }}
      />

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
          opacity: 0.55;
          pointer-events: none;
          background-color: rgba(18, 18, 18, 0.4);
          background-image: 
            linear-gradient(45deg, #090909 25%, transparent 25%, transparent 75%, #090909 75%, #090909),
            linear-gradient(45deg, #090909 25%, transparent 25%, transparent 75%, #090909 75%, #090909),
            linear-gradient(to right, #2a2a2a, #161616, #2a2a2a);
          background-size: 6px 6px, 6px 6px, 6px 6px;
          background-position: 0px 0px, 3px 3px, 0px 0px;
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