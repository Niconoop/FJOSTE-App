import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck,
  Sun,
  Zap,
  Disc,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Power,
  Sliders,
  AlertTriangle,
  Flame,
  Wind,
  CheckCircle,
  Link as LinkIcon,
  Unlink,
  Gamepad2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';

interface Telemetry {
  connected: boolean;
  brand?: string;
  model?: string;
  speed?: number;
  rpm?: number;
  fuel?: number;
  wearTruck?: number;
  wearCargo?: number;
  cargo?: string;
  cargoMass?: number;
  parkBrake?: boolean;
  lightsBeamLow?: boolean;
  lightsBeamHigh?: boolean;
  lightsHazard?: boolean;
  lightsBeacon?: boolean;
  lightsParking?: boolean;
  blinkerLeftActive?: boolean;
  blinkerRightActive?: boolean;
  electricEnabled?: boolean;
  engineEnabled?: boolean;
  trailerAttached?: boolean;
  wipers?: boolean;
  [key: string]: any;
}

interface TruckSideViewProps {
  telemetry: Telemetry;
  isLight?: boolean;
  focusZone?: 'sidebar' | 'content';
  contentIndex?: number;
  onSendAction?: (action: string) => void;
  showHeader?: boolean;
}

interface KeyBinding {
  vk: number;
  label: string;
}

export const TruckSideView: React.FC<TruckSideViewProps> = ({
  telemetry,
  isLight = false,
  focusZone,
  contentIndex = 0,
  onSendAction,
  showHeader = true,
}) => {
  // Active Navigation Page (0: Blueprint & Übersicht, 1: Fahrwerk & Pneumatik, 2: Licht & Cockpit)
  const [activePage, setActivePage] = useState<number>(0);

  // Adaptive Trailer Detection
  const hasTrailer = Boolean(
    telemetry.trailerAttached ||
    (telemetry as any).trailerConnected ||
    Boolean((telemetry as any).trailerId && String((telemetry as any).trailerId).trim().length > 0) ||
    (telemetry.cargo && telemetry.cargo.trim().length > 0 && telemetry.cargo.toLowerCase() !== 'none') ||
    (telemetry.cargoMass && telemetry.cargoMass > 0)
  );

  // Local simulated suspension & axle states with sync
  const [truckSuspension, setTruckSuspension] = useState<'normal' | 'up' | 'down'>('normal');
  const [trailerSuspension, setTrailerSuspension] = useState<'normal' | 'up' | 'down'>('normal');
  const [liftAxleTruck, setLiftAxleTruck] = useState<boolean>(false);
  const [liftAxleTrailer, setLiftAxleTrailer] = useState<boolean>(false);

  // Dynamic Keybindings from ETS2 controls.sii
  const [bindings, setBindings] = useState<Record<string, KeyBinding>>({
    light: { vk: 0x4C, label: 'L' },
    highbeam: { vk: 0x4B, label: 'K' },
    flasher: { vk: 0x4A, label: 'J' },
    beacon: { vk: 0x4F, label: 'O' },
    hazard: { vk: 0x46, label: 'F' },
    liftaxle_truck: { vk: 0x55, label: 'U' },
    liftaxle_trailer: { vk: 0x55, label: 'U' },
    susp_up: { vk: 0x21, label: 'PageUp' },
    susp_down: { vk: 0x22, label: 'PageDown' },
    susp_reset: { vk: 0x24, label: 'Home' },
    trl_susp_up: { vk: 0x21, label: 'PageUp' },
    trl_susp_down: { vk: 0x22, label: 'PageDown' },
    trl_susp_reset: { vk: 0x24, label: 'Home' },
    parkingbrake: { vk: 0x20, label: 'Space' },
    wipers: { vk: 0x50, label: 'P' },
    engine: { vk: 0x45, label: 'E' },
    trailer_coupling: { vk: 0x54, label: 'T' },
  });
  const [isProfileSynced, setIsProfileSynced] = useState<boolean>(false);

  // Load user's actual game keybindings from controls.sii
  useEffect(() => {
    let isMounted = true;
    const fetchBindings = async () => {
      try {
        const api = (window as any).electronAPI;
        let res: any = null;
        if (api && typeof api.invoke === 'function') {
          res = await api.invoke('get-truck-bindings');
        } else if ((window as any).require) {
          const { ipcRenderer } = (window as any).require('electron');
          res = await ipcRenderer.invoke('get-truck-bindings');
        } else {
          // Web tablet client fallback
          const resp = await fetch('/api/carplay/truck-bindings');
          const json = await resp.json();
          if (json?.bindings) res = json.bindings;
        }

        if (isMounted && res && typeof res === 'object') {
          setBindings(prev => ({ ...prev, ...res }));
          setIsProfileSynced(true);
        }
      } catch (e) {
        // Fallback to defaults
      }
    };
    fetchBindings();
    return () => { isMounted = false; };
  }, []);

  // Long press for Headlights (Short click = Light on/off, Long press >= 500ms = High Beam)
  const [isHoldingLight, setIsHoldingLight] = useState<boolean>(false);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);
  const didTriggerHoldRef = useRef<boolean>(false);

  // Action dispatcher
  const triggerAction = (action: string) => {
    // 1. Electron IPC if available
    try {
      const api = (window as any).electronAPI;
      if (api && typeof api.invoke === 'function') {
        api.invoke('truck-control-action', action);
      } else if (api && typeof api.send === 'function') {
        api.send('truck-control-action', action);
      } else if ((window as any).require) {
        const { ipcRenderer } = (window as any).require('electron');
        ipcRenderer.invoke('truck-control-action', action);
      } else {
        // Fallback: Web fetch for tablet/browser CarPlay client
        fetch('/api/carplay/truck-action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        }).catch(() => {});
      }
    } catch (err) {
      // Local fallback
    }

    if (onSendAction) onSendAction(action);

    // Update local visual states
    if (action === 'liftaxle_truck') setLiftAxleTruck(prev => !prev);
    if (action === 'liftaxle_trailer') setLiftAxleTrailer(prev => !prev);
    if (action === 'susp_up') setTruckSuspension('up');
    if (action === 'susp_down') setTruckSuspension('down');
    if (action === 'susp_reset') setTruckSuspension('normal');
    if (action === 'trl_susp_up') setTrailerSuspension('up');
    if (action === 'trl_susp_down') setTrailerSuspension('down');
    if (action === 'trl_susp_reset') setTrailerSuspension('normal');
  };

  // Light Hold Handlers
  const handleLightPointerDown = () => {
    didTriggerHoldRef.current = false;
    setIsHoldingLight(true);
    setHoldProgress(0);
    holdStartTimeRef.current = Date.now();

    holdIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, Math.round((elapsed / 500) * 100));
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(holdIntervalRef.current!);
        holdIntervalRef.current = null;
      }
    }, 25);

    holdTimerRef.current = setTimeout(() => {
      didTriggerHoldRef.current = true;
      triggerAction('highbeam');
      setIsHoldingLight(false);
      setHoldProgress(0);
    }, 500);
  };

  const handleLightPointerUp = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setIsHoldingLight(false);
    setHoldProgress(0);

    if (!didTriggerHoldRef.current) {
      // Short click: normal light toggle
      triggerAction('light');
    }
  };

  const handleLightPointerCancel = () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    setIsHoldingLight(false);
    setHoldProgress(0);
  };

  // Suspension offsets for SVG rendering
  const truckYOffset = truckSuspension === 'up' ? -10 : truckSuspension === 'down' ? 10 : 0;
  const trailerYOffset = trailerSuspension === 'up' ? -10 : trailerSuspension === 'down' ? 10 : 0;
  const truckLiftAxleY = liftAxleTruck ? -14 : 0;
  const trailerLiftAxleY = liftAxleTrailer ? -14 : 0;

  // Active lighting & engine states directly synchronized with game telemetry
  const isLightOn = Boolean(telemetry.lightsBeamLow || telemetry.lightsParking);
  const isHighBeam = Boolean(telemetry.lightsBeamHigh);
  const isBeacon = Boolean(telemetry.lightsBeacon);
  const isHazard = Boolean(telemetry.lightsHazard);
  const isBlinker = Boolean(telemetry.blinkerLeftActive || telemetry.blinkerRightActive || telemetry.blinkerLeftOn || telemetry.blinkerRightOn || telemetry.lightsHazard);
  const isParkBrake = Boolean(telemetry.parkBrake);
  const isEngineOn = Boolean(telemetry.engineEnabled || (telemetry.rpm && telemetry.rpm > 50));
  const isWipers = Boolean(telemetry.wipers);

  // --- Hotkey / controller navigation (driven by CarPlay 'truck-nav' event) ---
  const rootRef = useRef<HTMLDivElement | null>(null);
  // navIndex: -1 = Header Tab Switcher is focused, 0..N = Content items are focused
  const [navIndex, setNavIndex] = useState<number>(0);
  const navIndexRef = useRef(0);
  navIndexRef.current = navIndex;

  const activePageRef = useRef(0);
  activePageRef.current = activePage;

  const getNavItems = (): HTMLElement[] => {
    const root = rootRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>('[data-truck-action], button:not([disabled]), div.cursor-pointer'))
      .filter(el => !el.closest('[data-tsv-header]') && el.offsetParent !== null);
  };

  useEffect(() => {
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent).detail as { dir: string; handled: boolean };
      if (!detail) return;
      const dir = detail.dir;
      const consume = () => { detail.handled = true; };

      // Direct Tab Switching (hotkeys next/prev, Tab, etc.)
      if (dir === 'next' || dir === 'next-tab') {
        consume();
        setActivePage(p => (p + 1) % 3);
        setNavIndex(0);
        return;
      }
      if (dir === 'prev' || dir === 'prev-tab') {
        consume();
        setActivePage(p => (p + 2) % 3);
        setNavIndex(0);
        return;
      }

      // When Header Tab Dock is focused (navIndex === -1)
      if (navIndexRef.current === -1) {
        if (dir === 'left') {
          if (activePageRef.current > 0) {
            consume();
            setActivePage(p => p - 1);
          } else {
            // Tab 0 leftmost -> allow CarPlay to exit to sidebar
            detail.handled = false;
          }
        } else if (dir === 'right') {
          if (activePageRef.current < 2) {
            consume();
            setActivePage(p => p + 1);
          }
        } else if (dir === 'down' || dir === 'enter') {
          consume();
          setNavIndex(0);
        }
        return;
      }

      // When Content items are focused (navIndex >= 0)
      const items = getNavItems();
      if (items.length === 0) {
        if (dir === 'up') {
          consume();
          setNavIndex(-1);
        }
        return;
      }

      const idx = Math.min(navIndexRef.current, items.length - 1);

      if (dir === 'up') {
        // At top row of page -> enter Header Tab Bar!
        if (idx === 0 || (activePageRef.current === 0 && idx < 4) || (activePageRef.current === 1 && idx < 3) || (activePageRef.current === 2 && idx < 2)) {
          consume();
          setNavIndex(-1);
        } else {
          consume();
          setNavIndex(Math.max(0, idx - 1));
        }
      } else if (dir === 'down') {
        consume();
        setNavIndex(Math.min(items.length - 1, idx + 1));
      } else if (dir === 'left') {
        if (idx === 0) {
          // Leftmost item -> allow CarPlay to exit to sidebar
          detail.handled = false;
        } else {
          consume();
          setNavIndex(idx - 1);
        }
      } else if (dir === 'right') {
        if (idx < items.length - 1) {
          consume();
          setNavIndex(idx + 1);
        }
      } else if (dir === 'enter') {
        consume();
        const el = items[idx];
        if (!el) return;
        const action = el.getAttribute('data-truck-action');
        if (action) {
          if (action === 'susp_reset_all') {
            triggerAction('susp_reset');
            triggerAction('trl_susp_reset');
          } else {
            triggerAction(action);
          }
        } else {
          const opts = { bubbles: true, cancelable: true } as any;
          el.dispatchEvent(new PointerEvent('pointerdown', opts));
          el.dispatchEvent(new PointerEvent('pointerup', opts));
          el.click();
        }
      }
    };

    window.addEventListener('truck-nav', onNav);
    return () => window.removeEventListener('truck-nav', onNav);
  }, []);

  useEffect(() => {
    const items = getNavItems();
    items.forEach(el => { el.style.outline = ''; el.style.outlineOffset = ''; });
    if (focusZone !== 'content') return;
    if (navIndex >= 0) {
      const el = items[Math.min(navIndex, items.length - 1)];
      if (el) {
        el.style.outline = '3px solid var(--primary, #0084ff)';
        el.style.outlineOffset = '2px';
        el.scrollIntoView({ block: 'nearest' });
      }
    }
  });

  return (
    <div ref={rootRef} className="w-full h-full flex flex-col justify-between overflow-hidden font-['Outfit',sans-serif]">
      {/* ============================================================ */}
      {/* UNIFIED HEADER WITH SEGMENTED DOCK (EXACT SETTINGS APP DESIGN) */}
      {/* ============================================================ */}
      {showHeader && (
        <div data-tsv-header className={`flex items-center justify-between pb-2 mb-2 ${isLight ? 'border-b border-slate-200' : 'border-b border-white/10'} shrink-0 relative z-30 gap-3`}>
          <div className="flex items-center gap-2.5 min-w-0 shrink-0">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isLight
                  ? 'bg-slate-100 border border-slate-200 text-slate-800 shadow-sm'
                  : 'bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-md shadow-cyan-500/25 text-white'
              }`}
            >
              <Sliders size={18} className="stroke-[2.2] drop-shadow-md" />
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
              isLight ? 'text-cyan-700 bg-cyan-100 border border-cyan-300' : 'text-cyan-300 bg-cyan-500/20 border border-cyan-500/30'
            }`}>
              {activePage + 1}/3
            </span>
            {isProfileSynced && (
              <span className={`flex items-center gap-1 text-[8.5px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0 ${
                isLight ? 'text-cyan-700 bg-cyan-100/80 border border-cyan-300' : 'text-cyan-300 bg-cyan-500/15 border border-cyan-500/30'
              }`}>
                <Gamepad2 size={10} className={isLight ? 'text-cyan-600' : 'text-cyan-400'} />
                SPIEL-TASTEN AKTIV
              </span>
            )}
          </div>

          {/* Segmented Page Switcher Dock */}
          <div
            data-tsv-dock
            className={`flex items-center gap-1.5 ${
              isLight ? 'bg-slate-100/90 border-slate-250 shadow-md text-slate-800' : 'bg-black/50 border-white/10 shadow-2xl text-white'
            } backdrop-blur-md border p-1 rounded-2xl shrink-0 transition-all relative z-30 ${
              focusZone === 'content' && navIndex === -1 ? 'ring-2 ring-primary ring-offset-2 ring-offset-black/50 shadow-[0_0_15px_var(--primary-glow)]' : ''
            }`}
          >
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActivePage(prev => (prev - 1 + 3) % 3); }}
              className={`w-7 h-7 rounded-lg ${
                isLight
                  ? 'bg-slate-200/70 hover:bg-primary/20 border-slate-300 text-slate-700 hover:text-primary'
                  : 'bg-white/[0.04] hover:bg-primary/20 border-white/[0.08] text-zinc-300 hover:text-primary'
              } active:scale-95 border flex items-center justify-center transition-all cursor-pointer group shrink-0`}
              title="Vorherige Seite (←)"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>

            <div className="flex items-center gap-1">
              {[
                { id: 0, label: 'Übersicht', num: '01', icon: Truck },
                { id: 1, label: 'Fahrwerk', num: '02', icon: Wind },
                { id: 2, label: 'Licht & Cockpit', num: '03', icon: Sun },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activePage === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setActivePage(tab.id); }}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-mono text-xs transition-all duration-200 cursor-pointer flex items-center gap-1.5 select-none shrink-0 ${
                      isActive
                        ? 'bg-primary text-white font-black shadow-[0_0_15px_var(--primary-glow)] scale-[1.02]'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent'
                        : 'text-zinc-400 hover:text-white hover:bg-white/[0.08] border border-transparent'
                    } ${
                      focusZone === 'content' && navIndex === -1 && isActive
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-black/40'
                        : ''
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: 'var(--primary, #0084ff)',
                            color: '#ffffff',
                            boxShadow: '0 0 15px var(--primary-glow, rgba(0, 132, 255, 0.45))',
                          }
                        : undefined
                    }
                  >
                    <Icon size={14} className={isActive ? 'text-white stroke-[2.4]' : isLight ? 'text-slate-500' : 'text-zinc-400'} />
                    <span className="font-black tracking-tight">{tab.label}</span>
                    <span
                      className={`text-[8.5px] px-1 py-0.2 rounded font-mono font-bold ${
                        isActive
                          ? 'bg-black/25 text-white'
                          : isLight
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      {tab.num}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setActivePage(prev => (prev + 1) % 3); }}
              className={`w-7 h-7 rounded-lg ${
                isLight
                  ? 'bg-slate-200/70 hover:bg-primary/20 border-slate-300 text-slate-700 hover:text-primary'
                  : 'bg-white/[0.04] hover:bg-primary/20 border-white/[0.08] text-zinc-300 hover:text-primary'
              } active:scale-95 border flex items-center justify-center transition-all cursor-pointer group shrink-0`}
              title="Nächste Seite (→)"
            >
              <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MULTI-PAGE CONTENT AREA WITH ANIMATEPRESENCE (NO OVERFLOW) */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* ============================================================ */}
          {/* SEITE 1: 01 ÜBERSICHT (BLUEPRINT & SCHNELLZUGRIFF) */}
          {/* ============================================================ */}
          {activePage === 0 && (
            <motion.div
              key="control-page-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col justify-between flex-1 min-h-0 overflow-hidden gap-2"
            >
              {/* TOP: BLUEPRINT VECTOR DISPLAY */}
              <div
                className={`flex-1 rounded-2xl border backdrop-blur-xl relative overflow-hidden flex items-center justify-center p-2 min-h-0 shadow-inner ${
                  isLight
                    ? 'bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200/80 border-slate-300/80 shadow-md'
                    : 'bg-black/70 border-white/10'
                }`}
              >
                {/* Subtle Ambient Blueprint Grid */}
                <div
                  className={`absolute inset-0 [background-size:24px_24px] pointer-events-none ${
                    isLight
                      ? 'bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] opacity-35'
                      : 'bg-[radial-gradient(#38bdf8_1px,transparent_1px)] opacity-15'
                  }`}
                />

                {/* Dynamic Light Beam Overlay (Halogen Low-Beam / Xenon High-Beam) */}
                {(isLightOn || isHighBeam) && (
                  <div
                    className={`absolute top-[48%] pointer-events-none blur-2xl transition-all duration-300 ${
                      hasTrailer ? 'right-0 w-[420px]' : 'right-[15%] w-[480px]'
                    } ${
                      isHighBeam
                        ? 'h-[140px] bg-gradient-to-r from-blue-400/50 via-cyan-300/30 to-transparent'
                        : 'h-[90px] bg-gradient-to-r from-amber-200/40 via-yellow-100/20 to-transparent'
                    }`}
                    style={{ transform: 'translate(60%, -50%) rotate(4deg)' }}
                  />
                )}

                {/* Dynamic Beacon Roof Flare */}
                {isBeacon && (
                  <div className="absolute top-[16%] right-[33%] w-36 h-36 bg-amber-500/35 rounded-full blur-2xl pointer-events-none animate-ping" />
                )}

                {/* SVG Blueprint */}
                <svg
                  viewBox={hasTrailer ? '0 0 980 320' : '0 0 680 320'}
                  className="w-full h-full max-h-[260px] select-none transition-all duration-500 overflow-visible"
                >
                  <defs>
                    {/* SCANIA 113H STREAMLINE BLUEPRINT GRADIENTS */}
                    <linearGradient id="scania113Cab" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#4f82bd" />
                      <stop offset="25%" stopColor="#4574aa" />
                      <stop offset="75%" stopColor="#376294" />
                      <stop offset="100%" stopColor="#2c517d" />
                    </linearGradient>
                    <linearGradient id="scaniaStripe" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#cbd5e1" />
                      <stop offset="30%" stopColor="#ffffff" />
                      <stop offset="70%" stopColor="#f1f5f9" />
                      <stop offset="100%" stopColor="#94a3b8" />
                    </linearGradient>
                    <linearGradient id="trailerBoxGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="15%" stopColor="#f8fafc" />
                      <stop offset="85%" stopColor="#e2e8f0" />
                      <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                    <linearGradient id="scaniaChrome" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#94a3b8" />
                      <stop offset="35%" stopColor="#f8fafc" />
                      <stop offset="70%" stopColor="#cbd5e1" />
                      <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                    <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#27272a" />
                      <stop offset="100%" stopColor="#09090b" />
                    </linearGradient>
                    <radialGradient id="scaniaClassicRim" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffffff" />
                      <stop offset="35%" stopColor="#cbd5e1" />
                      <stop offset="65%" stopColor="#64748b" />
                      <stop offset="88%" stopColor="#1e293b" />
                      <stop offset="100%" stopColor="#09090b" />
                    </radialGradient>
                  </defs>

                  {/* ROAD */}
                  <line x1="10" y1="280" x2={hasTrailer ? '970' : '670'} y2="280" stroke={isLight ? '#cbd5e1' : '#3f3f46'} strokeWidth="3" />
                  <line x1="20" y1="282" x2={hasTrailer ? '960' : '660'} y2="282" stroke={isLight ? '#94a3b8' : '#71717a'} strokeWidth="1" strokeDasharray="16,12" />

                  {/* ============================================================ */}
                  {/* OPTIONAL ADAPTIVE TRAILER (ONLY WHEN ATTACHED) */}
                  {/* When decoupled (solo), only the Scania 113H is displayed! */}
                  {/* ============================================================ */}
                  {hasTrailer && (
                    <g
                      id="trailer-group"
                      style={{
                        transform: `translate(30px, ${trailerYOffset}px)`,
                        transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                      }}
                    >
                      {/* MAIN WHITE/LIGHT GREY REFRIGERATED / DRY VAN BOX */}
                      <rect x="25" y="75" width="470" height="144" rx="2" fill="url(#trailerBoxGrad)" stroke="#94a3b8" strokeWidth="1.2" />

                      {/* TOP ALUMINUM ROOF RAIL & BOTTOM RUB RAIL */}
                      <rect x="23" y="73" width="474" height="6" rx="1" fill="#64748b" />
                      <rect x="23" y="217" width="474" height="6" rx="1" fill="#64748b" />

                      {/* 5 AMBER LED SIDE MARKER REFLECTORS ALONG BOTTOM RAIL */}
                      {[85, 185, 285, 385, 475].map(xMarker => (
                        <circle key={xMarker} cx={xMarker} cy="220" r="2.5" fill="#f59e0b" stroke="#78350f" strokeWidth="0.5" />
                      ))}

                      {/* REAR VERTICAL BULKHEAD POST & DOCK RUBBER BUFFERS */}
                      <rect x="22" y="73" width="6" height="150" fill="#475569" />
                      <rect x="18" y="208" width="5" height="18" rx="1" fill="#18181b" />
                      {/* Rear Vertical Tail Lamp */}
                      <rect x="19" y="216" width="4" height="16" rx="1" fill={isParkBrake ? '#ef4444' : '#b91c1c'} />
                      {isParkBrake && <circle cx="21" cy="224" r="6" fill="#ef4444" opacity="0.7" filter="blur(3px)" />}

                      {/* FRONT BULKHEAD CORNER POST & KINGPIN NECK */}
                      <rect x="492" y="73" width="5" height="148" fill="#475569" />

                      {/* TRAILER LOGO & TEXT WATERMARK */}
                      <text x="260" y="150" textAnchor="middle" fill="#0f172a" fillOpacity="0.75" fontSize="22" fontWeight="900" fontFamily="sans-serif" letterSpacing="4">
                        OPEN PIPE CLUB
                      </text>
                      <text x="260" y="170" textAnchor="middle" fill="#64748b" fillOpacity="0.85" fontSize="9.5" fontWeight="700" fontFamily="monospace" letterSpacing="2">
                        SCANIA 113H LOGISTICS • {telemetry.cargo?.toUpperCase() || 'BOX SEMI-TRAILER'}
                      </text>

                      {/* REAR UNDERRUN PROTECTION CRASH BAR (BEHIND WHEELS, LEFT) */}
                      <rect x="35" y="226" width="60" height="18" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="1" />
                      <line x1="38" y1="235" x2="92" y2="235" stroke="#94a3b8" strokeWidth="1.5" />

                      {/* CONTINUOUS CURVED DARK TRIPLE FENDER / MUDGUARD ARCH */}
                      <path
                        d="M 98 248 Q 98 225 125 225 L 245 225 Q 272 225 272 248"
                        fill="none"
                        stroke="#1e293b"
                        strokeWidth="6"
                        strokeLinecap="round"
                      />

                      {/* TRIPLE TRAILER AXLES AT REAR */}
                      {/* Axle 1 (Liftable with liftAxleTrailer) */}
                      <g style={{ transform: `translate(0px, ${trailerLiftAxleY}px)`, transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                        <circle cx="130" cy="255" r="24" fill="#09090b" stroke="#27272a" strokeWidth="4" />
                        <circle cx="130" cy="255" r="14" fill="url(#scaniaClassicRim)" />
                        {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => {
                          const rad = (angle * Math.PI) / 180;
                          const bx = 130 + 8.5 * Math.cos(rad);
                          const by = 255 + 8.5 * Math.sin(rad);
                          return <circle key={angle} cx={bx} cy={by} r="1" fill="#18181b" />;
                        })}
                        <circle cx="130" cy="255" r="5" fill="#18181b" />
                        {liftAxleTrailer && (
                          <text x="130" y="222" textAnchor="middle" fill="#0084ff" fontSize="8" fontWeight="bold" fontFamily="monospace">
                            ▲ LIFT
                          </text>
                        )}
                      </g>

                      {/* Axle 2 */}
                      <g>
                        <circle cx="185" cy="255" r="24" fill="#09090b" stroke="#27272a" strokeWidth="4" />
                        <circle cx="185" cy="255" r="14" fill="url(#scaniaClassicRim)" />
                        {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => {
                          const rad = (angle * Math.PI) / 180;
                          const bx = 185 + 8.5 * Math.cos(rad);
                          const by = 255 + 8.5 * Math.sin(rad);
                          return <circle key={angle} cx={bx} cy={by} r="1" fill="#18181b" />;
                        })}
                        <circle cx="185" cy="255" r="5" fill="#18181b" />
                      </g>

                      {/* Axle 3 */}
                      <g>
                        <circle cx="240" cy="255" r="24" fill="#09090b" stroke="#27272a" strokeWidth="4" />
                        <circle cx="240" cy="255" r="14" fill="url(#scaniaClassicRim)" />
                        {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => {
                          const rad = (angle * Math.PI) / 180;
                          const bx = 240 + 8.5 * Math.cos(rad);
                          const by = 255 + 8.5 * Math.sin(rad);
                          return <circle key={angle} cx={bx} cy={by} r="1" fill="#18181b" />;
                        })}
                        <circle cx="240" cy="255" r="5" fill="#18181b" />
                      </g>

                      {/* ENCLOSED AERODYNAMIC PALLET BOX / SIDE SKIRT (CENTER) */}
                      <rect x="275" y="224" width="168" height="26" rx="3" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="1.2" />
                      <line x1="278" y1="237" x2="440" y2="237" stroke="#cbd5e1" strokeWidth="1.5" />
                      <rect x="320" y="233" width="8" height="7" rx="1" fill="#475569" />
                      <rect x="390" y="233" width="8" height="7" rx="1" fill="#475569" />

                      {/* TELESCOPIC LANDING GEAR / STÜTZBEINE (FRONT) */}
                      <rect x="456" y="220" width="8" height="36" rx="1" fill="#334155" stroke="#1e293b" strokeWidth="1" />
                      <rect x="452" y="254" width="16" height="4" rx="1" fill="#475569" />
                      <line x1="464" y1="230" x2="470" y2="236" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
                    </g>
                  )}

                  {/* ============================================================ */}
                  {/* SCANIA 113H STREAMLINE 6x2 TRACTOR (EXACT 1:1 REPRODUCTION) */}
                  {/* Classic blue, dual silver stripes, sleeper window, green light */}
                  {/* ============================================================ */}
                  <g
                    id="scania-113h-group"
                    style={{
                      transform: `translate(${hasTrailer ? '515px' : '150px'}, ${truckYOffset}px)`,
                      transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  >
                    {/* CHASSIS FRAME (OPEN BLACK LADDER FRAME MATCHING PHOTO) */}
                    <rect x="15" y="215" width="355" height="18" rx="2" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
                    
                    {/* FIFTH WHEEL COUPLING (SATTELPLATTE) MOUNTED ABOVE BOGIE */}
                    <path d="M 85 215 L 125 215 L 120 203 L 90 203 Z" fill="#3f3f46" stroke="#52525b" strokeWidth="1.2" />
                    <rect x="100" y="201" width="10" height="4" rx="1" fill="#cbd5e1" />

                    {/* CYLINDRICAL DIESEL FUEL TANK WITH CHROME STRAPS (MATCHING PHOTO) */}
                    <rect x="162" y="222" width="76" height="28" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="1.2" />
                    {/* Chrome Tank Straps */}
                    <line x1="176" y1="222" x2="176" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
                    <line x1="222" y1="222" x2="222" y2="250" stroke="#cbd5e1" strokeWidth="1.5" />
                    {/* Chrome Diesel Cap */}
                    <circle cx="180" cy="227" r="3.5" fill="#f8fafc" stroke="#475569" strokeWidth="1" />

                    {/* BATTERY BOX & AIR TANKS (BETWEEN TANK AND FRONT WHEEL) */}
                    <rect x="242" y="223" width="38" height="24" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
                    <line x1="245" y1="230" x2="276" y2="230" stroke="#475569" strokeWidth="1" />

                    {/* EXHAUST MUFFLER & UNDERBODY TAILPIPE */}
                    <rect x="135" y="238" width="22" height="10" rx="3" fill="#27272a" />
                    <line x1="140" y1="248" x2="132" y2="254" stroke="#71717a" strokeWidth="3" strokeLinecap="round" />

                    {/* SEPARATE CURVED BLACK MUDGUARD ARCHES OVER 2 REAR WHEELS (1:1 FROM PHOTO) */}
                    {/* Mudguard 1 (Rear drive axle at cx = 65) */}
                    <path d="M 35 248 Q 65 218 95 248" fill="none" stroke="#18181b" strokeWidth="8" strokeLinecap="round" />
                    {/* Mudguard 2 (Middle lift axle at cx = 125) */}
                    <path d="M 98 248 Q 125 218 152 248" fill="none" stroke="#18181b" strokeWidth="8" strokeLinecap="round" />

                    {/* REAR MUDFLAP WITH ANTI-SPRAY GUARD */}
                    <rect x="32" y="235" width="5" height="35" rx="1" fill="#09090b" />
                    <line x1="33" y1="262" x2="36" y2="262" stroke="#e2e8f0" strokeWidth="1.5" />

                    {/* REAR TAILLIGHTS (GLOW BRIGHT RED ON HANDBREMSE/PARKBRAKE) */}
                    <rect x="29" y="220" width="5" height="16" rx="1.5" fill={isParkBrake ? '#ef4444' : '#7f1d1d'} />
                    {isParkBrake && <circle cx="31" cy="228" r="8" fill="#ef4444" opacity="0.8" filter="blur(3px)" />}

                    {/* REAR VERTICAL AIR INTAKE SNORKEL (CHIMNEY BEHIND CABIN IN PHOTO) */}
                    <rect x="168" y="78" width="9" height="138" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1.2" />
                    {/* Snorkel Top Mushroom Filter Cap */}
                    <ellipse cx="172.5" cy="74" rx="7.5" ry="4" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                    {/* Engine Active Exhaust Heat Shimmer (Synchronized to engine state) */}
                    {isEngineOn && (
                      <circle cx="172.5" cy="66" r="5" fill="#e2e8f0" opacity="0.3" className="animate-ping" />
                    )}

                    {/* ============================================================ */}
                    {/* MAIN SCANIA 113H CABIN (CLASSIC BLUE WITH DUAL SILVER STRIPES) */}
                    {/* ============================================================ */}
                    <path
                      d="
                        M 176 216 
                        L 176 86 
                        Q 177 80 185 80 
                        L 335 80 
                        Q 345 80 348 88 
                        L 368 140 
                        Q 370 148 370 160 
                        L 372 205 
                        Q 372 225 368 228 
                        L 350 228 
                        Q 346 200 320 200 
                        Q 290 200 286 228 
                        L 278 228 
                        L 176 216 
                        Z
                      "
                      fill="url(#scania113Cab)"
                      stroke="#1e3a5f"
                      strokeWidth="1.6"
                    />

                    {/* DUAL HORIZONTAL SILVER RALLY STRIPES (1:1 FROM PHOTO) */}
                    {/* Upper Silver Stripe */}
                    <rect x="176" y="153" width="194" height="5" fill="url(#scaniaStripe)" />
                    {/* Lower Silver Stripe */}
                    <rect x="176" y="161" width="194" height="4" fill="#cbd5e1" />

                    {/* SCANIA WORDMARK ON UPPER SILVER STRIPE */}
                    <rect x="350" y="153" width="18" height="5" fill="#0f172a" />
                    <text x="351" y="157" fill="#ffffff" fontSize="4.5" fontWeight="900" fontFamily="sans-serif" letterSpacing="0.5">
                      SCANIA
                    </text>

                    {/* 113H BADGE ON FRONT MASK (1:1 FROM PHOTO) */}
                    <rect x="358" y="174" width="14" height="7" rx="1" fill="#09090b" stroke="#475569" strokeWidth="0.5" />
                    <text x="360" y="179.5" fill="#ffffff" fontSize="5.5" fontWeight="900" fontFamily="sans-serif">
                      113H
                    </text>

                    {/* FRONT STEPPED GRILLE BARS */}
                    <line x1="365" y1="142" x2="371" y2="142" stroke="#09090b" strokeWidth="2.5" />
                    <line x1="366" y1="148" x2="372" y2="148" stroke="#09090b" strokeWidth="2.5" />
                    <line x1="367" y1="168" x2="373" y2="168" stroke="#09090b" strokeWidth="2.5" />
                    <line x1="368" y1="182" x2="374" y2="182" stroke="#09090b" strokeWidth="2.5" />

                    {/* MAIN DRIVER SIDE WINDOW (DARK TINT WITH BLACK RUBBER SEAL) */}
                    <path
                      d="
                        M 245 92 
                        L 336 92 
                        L 354 138 
                        L 245 138 
                        Z
                      "
                      fill="#0a0f1d"
                      stroke="#1e293b"
                      strokeWidth="2"
                    />
                    <path d="M 252 95 L 325 95 L 338 126 L 252 126 Z" fill="#38bdf8" fillOpacity="0.08" />
                    {/* Interior Driver Seat & Steering Wheel Silhouette */}
                    <circle cx="265" cy="112" r="6" fill="#1e293b" opacity="0.6" />
                    <line x1="332" y1="120" x2="326" y2="132" stroke="#334155" strokeWidth="3" opacity="0.6" />

                    {/* SLEEPER CAB REAR WINDOW (UNMISTAKABLE SILVER FRAME IN PHOTO!) */}
                    <rect x="194" y="98" width="38" height="44" rx="6" fill="#0f172a" stroke="#cbd5e1" strokeWidth="2" />
                    <rect x="198" y="102" width="30" height="36" rx="4" fill="#38bdf8" fillOpacity="0.06" />

                    {/* DOOR SHUTLINE & HORIZONTAL HANDLE */}
                    <line x1="238" y1="88" x2="238" y2="200" stroke="#254a75" strokeWidth="1.2" />
                    <rect x="230" y="146" width="16" height="5" rx="1.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="0.8" />
                    <rect x="232" y="147.5" width="10" height="2" fill="#e2e8f0" />

                    {/* BLACK SUNVISOR OVER WINDSHIELD (MATCHING PHOTO) */}
                    <path d="M 336 84 L 364 96 L 360 102 L 334 90 Z" fill="#09090b" stroke="#334155" strokeWidth="1" />

                    {/* ICONIC GREEN ROOF CLEARANCE LAMP ON SUNVISOR (1:1 FROM PHOTO) */}
                    <ellipse
                      cx="356"
                      cy="85"
                      rx="4.5"
                      ry="3.5"
                      fill={isLightOn ? '#22c55e' : '#15803d'}
                      stroke="#14532d"
                      strokeWidth="0.8"
                    />
                    {isLightOn && (
                      <circle cx="356" cy="85" r="9" fill="#22c55e" opacity="0.85" filter="blur(3px)" />
                    )}

                    {/* ROOF WARNING BEACON (SYNCHRONIZED WITH GAME LIGHTSBEACON) */}
                    <rect x="280" y="74" width="14" height="7" rx="3" fill={isBeacon ? '#f59e0b' : '#78350f'} stroke="#451a03" strokeWidth="0.8" />
                    {isBeacon && (
                      <circle cx="287" cy="77" r="8" fill="#f59e0b" opacity="0.9" filter="blur(3px)" />
                    )}

                    {/* RECTANGULAR HALOGEN HEADLIGHT CLUSTER */}
                    <rect
                      x="367"
                      y="188"
                      width="7"
                      height="15"
                      rx="1.5"
                      fill={isHighBeam ? '#60a5fa' : isLightOn ? '#fef08a' : '#27272a'}
                      stroke="#475569"
                      strokeWidth="0.8"
                    />
                    {isHighBeam ? (
                      <circle cx="370" cy="195" r="10" fill="#3b82f6" opacity="0.85" filter="blur(3px)" />
                    ) : isLightOn ? (
                      <circle cx="370" cy="195" r="8" fill="#fbbf24" opacity="0.8" filter="blur(3px)" />
                    ) : null}

                    {/* CORNER AMBER TURN SIGNAL INDICATOR (BLINKER SYNCHRONIZED) */}
                    <rect
                      x="369"
                      y="204"
                      width="5"
                      height="8"
                      rx="1"
                      fill={isBlinker ? '#f59e0b' : '#78350f'}
                      stroke="#451a03"
                      strokeWidth="0.8"
                    />
                    {isBlinker && (
                      <circle cx="371" cy="208" r="7" fill="#f59e0b" opacity="0.9" className="animate-ping" />
                    )}

                    {/* HEAVY BLACK FRONT BUMPER & BOARDING STEPS */}
                    <rect x="345" y="210" width="30" height="22" rx="3" fill="#18181b" stroke="#334155" strokeWidth="1" />
                    <line x1="335" y1="230" x2="330" y2="246" stroke="#475569" strokeWidth="2.5" />
                    <rect x="324" y="246" width="16" height="3" rx="1" fill="#cbd5e1" />

                    {/* BODY-COLORED BLUE CURVED FRONT WHEEL ARCH */}
                    <path d="M 285 228 Q 320 196 352 228" fill="none" stroke="#4172a8" strokeWidth="7" strokeLinecap="round" />

                    {/* ============================================================ */}
                    {/* SCANIA 6x2 HEAVY-DUTY WHEELS (1 FRONT, 2 REAR TANDEM AXLES) */}
                    {/* ============================================================ */}
                    {/* 1. REAR DRIVE AXLE (REARMOST AT CX = 65) */}
                    <g>
                      <circle cx="65" cy="255" r="25" fill="#09090b" stroke="#27272a" strokeWidth="4" />
                      <circle cx="65" cy="255" r="15" fill="url(#scaniaClassicRim)" />
                      {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => {
                        const rad = (angle * Math.PI) / 180;
                        const bx = 65 + 8.5 * Math.cos(rad);
                        const by = 255 + 8.5 * Math.sin(rad);
                        return <circle key={angle} cx={bx} cy={by} r="1" fill="#18181b" />;
                      })}
                      {/* Heavy Scania Planetary Hub Cap */}
                      <circle cx="65" cy="255" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                    </g>

                    {/* 2. MIDDLE TAG/LIFT AXLE (AT CX = 125, LIFTS ON LIFTAXLE) */}
                    <g style={{ transform: `translate(0px, ${truckLiftAxleY}px)`, transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                      <circle cx="125" cy="255" r="25" fill="#09090b" stroke="#27272a" strokeWidth="4" />
                      <circle cx="125" cy="255" r="15" fill="url(#scaniaClassicRim)" />
                      {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => {
                        const rad = (angle * Math.PI) / 180;
                        const bx = 125 + 8.5 * Math.cos(rad);
                        const by = 255 + 8.5 * Math.sin(rad);
                        return <circle key={angle} cx={bx} cy={by} r="1" fill="#18181b" />;
                      })}
                      <circle cx="125" cy="255" r="5" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                      {liftAxleTruck && (
                        <text x="125" y="220" textAnchor="middle" fill="#0084ff" fontSize="8.5" fontWeight="900" fontFamily="monospace">
                          ▲ LIFT
                        </text>
                      )}
                    </g>

                    {/* 3. FRONT STEER AXLE (AT CX = 320) */}
                    <g>
                      <circle cx="320" cy="255" r="25" fill="#09090b" stroke="#27272a" strokeWidth="4" />
                      <circle cx="320" cy="255" r="15" fill="url(#scaniaClassicRim)" />
                      {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map(angle => {
                        const rad = (angle * Math.PI) / 180;
                        const bx = 320 + 8.5 * Math.cos(rad);
                        const by = 255 + 8.5 * Math.sin(rad);
                        return <circle key={angle} cx={bx} cy={by} r="1" fill="#18181b" />;
                      })}
                      {/* Chrome Front Steer Cap */}
                      <circle cx="320" cy="255" r="5" fill="#e2e8f0" stroke="#0084ff" strokeWidth="1.2" />
                      <circle cx="320" cy="255" r="2" fill="#0084ff" />
                    </g>
                  </g>
                </svg>
              </div>

              {/* BOTTOM: 4 QUICK AUTOMOTIVE ACTION CARDS */}
              <div className="grid grid-cols-4 gap-2 shrink-0">
                {/* 1. Scheinwerfer & Fernlicht */}
                <div
                  data-truck-action="light"
                  onPointerDown={handleLightPointerDown}
                  onPointerUp={handleLightPointerUp}
                  onPointerCancel={handleLightPointerCancel}
                  className={`rounded-xl border p-2 shadow-md backdrop-blur-xl flex flex-col justify-between transition-all cursor-pointer select-none active:scale-95 relative overflow-hidden ${
                    isHighBeam
                      ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-1 ring-inset ring-blue-500'
                      : isLightOn
                      ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-inset ring-amber-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100 shadow-sm'
                      : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  {isHoldingLight && (
                    <div
                      className="absolute inset-x-0 bottom-0 bg-blue-500/40 h-1 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest truncate">
                      💡 SCHEINWERFER
                    </span>
                    <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-zinc-300'
                    }`}>
                      {bindings.light?.label} / {bindings.highbeam?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Sun size={18} className={isHighBeam ? 'text-blue-400 animate-pulse' : isLightOn ? 'text-amber-500' : isLight ? 'text-slate-400' : 'text-zinc-500'} />
                    <div className="min-w-0">
                      <div className={`text-[11px] font-black truncate ${
                        isLight && !isHighBeam && !isLightOn ? 'text-slate-900' : 'text-white'
                      }`}>
                        {isHighBeam ? 'FERNLICHT' : isLightOn ? 'ABBLENDLICHT' : 'LICHT AUS'}
                      </div>
                      <div className={`text-[8px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Hold: Fernlicht</div>
                    </div>
                  </div>
                </div>

                {/* 2. Beacon & Hazard */}
                <div
                  data-truck-action="beacon"
                  onClick={() => triggerAction('beacon')}
                  className={`rounded-xl border p-2 shadow-md backdrop-blur-xl flex flex-col justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    isBeacon
                      ? 'border-amber-500 bg-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.4)] ring-1 ring-inset ring-amber-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100 shadow-sm'
                      : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest truncate">
                      🚨 BEACON & WARN
                    </span>
                    <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-zinc-300'
                    }`}>
                      {bindings.beacon?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Flame size={18} className={isBeacon ? 'text-amber-500 animate-bounce' : isLight ? 'text-slate-400' : 'text-zinc-500'} />
                    <div className="min-w-0">
                      <div className={`text-[11px] font-black truncate ${
                        isLight && !isBeacon ? 'text-slate-900' : 'text-white'
                      }`}>
                        {isBeacon ? 'RUNDUM AN' : 'RUNDUM AUS'}
                      </div>
                      <div className={`text-[8px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Beacon-Dachleuchten</div>
                    </div>
                  </div>
                </div>

                {/* 3. Liftachsen */}
                <div
                  data-truck-action="liftaxle_truck"
                  onClick={() => triggerAction('liftaxle_truck')}
                  className={`rounded-xl border p-2 shadow-md backdrop-blur-xl flex flex-col justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    liftAxleTruck
                      ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-inset ring-cyan-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100 shadow-sm'
                      : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black text-cyan-600 uppercase tracking-widest truncate">
                      🔘 LIFTACHSE LKW
                    </span>
                    <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-zinc-300'
                    }`}>
                      {bindings.liftaxle_truck?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Disc size={18} className={liftAxleTruck ? 'text-cyan-500' : isLight ? 'text-slate-400' : 'text-zinc-500'} />
                    <div className="min-w-0">
                      <div className={`text-[11px] font-black truncate ${
                        isLight && !liftAxleTruck ? 'text-slate-900' : 'text-white'
                      }`}>
                        {liftAxleTruck ? 'ACHSE OBEN' : 'ACHSE UNTEN'}
                      </div>
                      <div className={`text-[8px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{liftAxleTruck ? 'Geliftet ▲' : 'Bodenkontakt ▼'}</div>
                    </div>
                  </div>
                </div>

                {/* 4. Feststellbremse & Motor */}
                <div
                  data-truck-action="parkingbrake"
                  onClick={() => triggerAction('parkingbrake')}
                  className={`rounded-xl border p-2 shadow-md backdrop-blur-xl flex flex-col justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    isParkBrake
                      ? 'border-rose-500 bg-rose-500/25 shadow-[0_0_15px_rgba(244,63,94,0.4)] ring-1 ring-inset ring-rose-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100 shadow-sm'
                      : 'bg-black/50 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-black text-rose-500 uppercase tracking-widest truncate">
                      🛑 HANDBREMSE
                    </span>
                    <span className={`text-[8px] font-mono px-1 py-0.2 rounded ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-zinc-300'
                    }`}>
                      {bindings.parkingbrake?.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Disc size={18} className={isParkBrake ? 'text-rose-500 animate-pulse' : isLight ? 'text-slate-400' : 'text-zinc-500'} />
                    <div className="min-w-0">
                      <div className={`text-[11px] font-black truncate ${
                        isLight && !isParkBrake ? 'text-slate-900' : 'text-white'
                      }`}>
                        {isParkBrake ? 'FESTGESTELLT' : 'GELÖST'}
                      </div>
                      <div className={`text-[8px] truncate ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>{isParkBrake ? 'Bremse aktiv' : 'Fahrbereit'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* SEITE 2: 02 FAHRWERK & PNEUMATIK (EXACT SETTINGS APP 2X2 GRID + BAR) */}
          {/* ============================================================ */}
          {activePage === 1 && (
            <motion.div
              key="control-page-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col justify-between flex-1 min-h-0 overflow-hidden gap-2"
            >
              {/* Upper 2x2 Grid for the 4 Option Boxes */}
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-hidden">
                {/* Box 1: Pneumatik Zugmaschine */}
                <div
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden ${
                    isLight ? 'bg-white/80 border-slate-200' : 'bg-black/40 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-mono font-black text-cyan-400 uppercase tracking-widest block truncate">
                      🛞 PNEUMATIK ZUGMASCHINE (LKW)
                    </span>
                    <span
                      className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        truckSuspension === 'up'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : truckSuspension === 'down'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      {truckSuspension === 'up' ? '+50MM GEHOBEN' : truckSuspension === 'down' ? '-50MM GESENKT' : 'FAHRHÖHE NORMAL'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
                    {[
                      { id: 'susp_up', action: 'susp_up', label: 'Heben', key: bindings.susp_up?.label, icon: ArrowUp, state: truckSuspension === 'up' },
                      { id: 'susp_reset', action: 'susp_reset', label: 'Normal', key: bindings.susp_reset?.label, icon: RefreshCw, state: truckSuspension === 'normal' },
                      { id: 'susp_down', action: 'susp_down', label: 'Senken', key: bindings.susp_down?.label, icon: ArrowDown, state: truckSuspension === 'down' },
                    ].map(btn => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          data-truck-action={btn.action}
                          onClick={() => triggerAction(btn.action)}
                          className={`p-1.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-center items-center h-full min-h-0 active:scale-95 ${
                            btn.state
                              ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-inset ring-cyan-500 text-cyan-300 font-black'
                              : isLight
                              ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                              : 'bg-black/50 border-white/10 hover:bg-white/[0.08] text-white'
                          }`}
                        >
                          <Icon size={18} className="mb-0.5" />
                          <span className="text-[10.5px] font-black uppercase tracking-wider block truncate w-full">
                            {btn.label}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-400 block truncate w-full">
                            ({btn.key})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Box 2: Pneumatik Auflieger */}
                <div
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden ${
                    isLight ? 'bg-white/80 border-slate-200' : 'bg-black/40 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-mono font-black text-blue-400 uppercase tracking-widest block truncate">
                      🚛 PNEUMATIK AUFLIEGER (TRAILER)
                    </span>
                    <span
                      className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        !hasTrailer
                          ? 'bg-white/5 text-zinc-500'
                          : trailerSuspension === 'up'
                          ? 'bg-blue-500/20 text-blue-300'
                          : trailerSuspension === 'down'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-white/10 text-zinc-300'
                      }`}
                    >
                      {!hasTrailer ? 'KEIN TRAILER' : trailerSuspension === 'up' ? '+50MM GEHOBEN' : trailerSuspension === 'down' ? '-50MM GESENKT' : 'FAHRHÖHE NORMAL'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 flex-1 min-h-0">
                    {[
                      { id: 'trl_susp_up', action: 'trl_susp_up', label: 'Heben', key: bindings.trl_susp_up?.label, icon: ArrowUp, state: trailerSuspension === 'up' },
                      { id: 'trl_susp_reset', action: 'trl_susp_reset', label: 'Normal', key: bindings.trl_susp_reset?.label, icon: RefreshCw, state: trailerSuspension === 'normal' },
                      { id: 'trl_susp_down', action: 'trl_susp_down', label: 'Senken', key: bindings.trl_susp_down?.label, icon: ArrowDown, state: trailerSuspension === 'down' },
                    ].map(btn => {
                      const Icon = btn.icon;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          disabled={!hasTrailer}
                          data-truck-action={btn.action}
                          onClick={() => triggerAction(btn.action)}
                          className={`p-1.5 rounded-xl text-center border transition-all cursor-pointer flex flex-col justify-center items-center h-full min-h-0 active:scale-95 ${
                            !hasTrailer
                              ? 'opacity-35 cursor-not-allowed bg-black/20 border-white/5 text-zinc-600'
                              : btn.state
                              ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-1 ring-inset ring-blue-500 text-blue-300 font-black'
                              : isLight
                              ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                              : 'bg-black/50 border-white/10 hover:bg-white/[0.08] text-white'
                          }`}
                        >
                          <Icon size={18} className="mb-0.5" />
                          <span className="text-[10.5px] font-black uppercase tracking-wider block truncate w-full">
                            {btn.label}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-400 block truncate w-full">
                            ({btn.key})
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Box 3: Liftachse Zugmaschine */}
                <div
                  data-truck-action="liftaxle_truck"
                  onClick={() => triggerAction('liftaxle_truck')}
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex items-center justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    liftAxleTruck
                      ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-inset ring-cyan-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100'
                      : 'bg-black/40 border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        liftAxleTruck
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                          : isLight
                          ? 'bg-slate-200 text-slate-600 border border-slate-300'
                          : 'bg-white/10 text-zinc-400 border border-white/10'
                      }`}
                    >
                      <Disc size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black font-mono tracking-tight truncate ${
                          isLight && !liftAxleTruck ? 'text-slate-900' : 'text-white'
                        }`}>
                          LIFTACHSE ZUGMASCHINE
                        </span>
                        <span
                          className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                            liftAxleTruck ? 'bg-cyan-500/20 text-cyan-500 border-cyan-400/40' : isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-white/10 text-zinc-400 border-white/10'
                          }`}
                        >
                          {liftAxleTruck ? 'GELIFTET ▲' : 'GESENKT ▼'}
                        </span>
                      </div>
                      <p className={`text-[9.5px] font-medium truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Vorlauf- / Nachlaufachse anheben • Taste: ({bindings.liftaxle_truck?.label})
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ml-2 ${
                      liftAxleTruck ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]' : isLight ? 'bg-slate-300' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        liftAxleTruck ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Box 4: Liftachse Auflieger */}
                <div
                  data-truck-action="liftaxle_trailer"
                  onClick={() => hasTrailer && triggerAction('liftaxle_trailer')}
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex items-center justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    !hasTrailer
                      ? 'opacity-35 cursor-not-allowed bg-black/20 border-white/5'
                      : liftAxleTrailer
                      ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-1 ring-inset ring-blue-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100'
                      : 'bg-black/40 border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        liftAxleTrailer
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                          : isLight
                          ? 'bg-slate-200 text-slate-600 border border-slate-300'
                          : 'bg-white/10 text-zinc-400 border border-white/10'
                      }`}
                    >
                      <Disc size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black font-mono tracking-tight truncate ${
                          isLight && !liftAxleTrailer ? 'text-slate-900' : 'text-white'
                        }`}>
                          LIFTACHSE AUFLIEGER (TRAILER)
                        </span>
                        <span
                          className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                            !hasTrailer
                              ? isLight ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white/5 text-zinc-500 border-white/10'
                              : liftAxleTrailer
                              ? 'bg-blue-500/20 text-blue-500 border-blue-400/40'
                              : isLight
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-white/10 text-zinc-400 border-white/10'
                          }`}
                        >
                          {!hasTrailer ? 'KEIN TRAILER' : liftAxleTrailer ? 'GELIFTET ▲' : 'GESENKT ▼'}
                        </span>
                      </div>
                      <p className={`text-[9.5px] font-medium truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Auflieger-Achse 1 entlasten • Taste: ({bindings.liftaxle_trailer?.label})
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ml-2 ${
                      liftAxleTrailer ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : isLight ? 'bg-slate-300' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        liftAxleTrailer ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Box 5: Bottom Standby Bar Style (Fahrwerks-Schnellreset) */}
              <div
                data-truck-action="susp_reset_all"
                onClick={() => {
                  triggerAction('susp_reset');
                  triggerAction('trl_susp_reset');
                }}
                className={`rounded-xl border p-2 sm:p-2.5 shadow-lg backdrop-blur-xl flex items-center justify-between transition-all cursor-pointer select-none shrink-0 ${
                  isLight
                    ? 'bg-slate-100/90 border-slate-250 hover:bg-slate-200'
                    : 'bg-black/40 border-white/10 hover:border-cyan-500/40 hover:bg-cyan-500/10'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white bg-gradient-to-tr from-cyan-600 to-blue-500 shadow-md shadow-cyan-500/20 shrink-0">
                    <RefreshCw size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black font-mono tracking-tight truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        PNEUMATIK-SCHNELLRESET: STANDARD-FAHRHÖHE WIEDERHERSTELLEN
                      </span>
                      <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                        isLight ? 'border-cyan-400 text-cyan-700 bg-cyan-100' : 'border-cyan-500/40 text-cyan-300 bg-cyan-500/20'
                      }`}>
                        TASTE ({bindings.susp_reset?.label})
                      </span>
                    </div>
                    <p className={`text-[10px] font-medium truncate mt-0.5 hidden sm:block ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                      Setzt die Luftfederung von Zugmaschine und Auflieger sofort per Druckluft auf neutrale Fahrhöhe zurück.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-black bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-500/25 shrink-0"
                >
                  WERKSEINSTELLUNG
                </button>
              </div>
            </motion.div>
          )}

          {/* ============================================================ */}
          {/* SEITE 3: 03 LICHT & COCKPIT-FUNKTIONEN (EXACT SETTINGS 2X2 GRID + BAR) */}
          {/* ============================================================ */}
          {activePage === 2 && (
            <motion.div
              key="control-page-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col justify-between flex-1 min-h-0 overflow-hidden gap-2"
            >
              {/* Upper 2x2 Grid for the 4 Option Boxes */}
              <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 overflow-hidden">
                {/* Box 1: Scheinwerfer & Fernlicht */}
                <div
                  data-truck-action="light"
                  onPointerDown={handleLightPointerDown}
                  onPointerUp={handleLightPointerUp}
                  onPointerCancel={handleLightPointerCancel}
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden cursor-pointer select-none relative active:scale-95 ${
                    isHighBeam
                      ? 'border-blue-500 bg-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.4)] ring-1 ring-inset ring-blue-500'
                      : isLightOn
                      ? 'border-amber-500 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-inset ring-amber-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100'
                      : 'bg-black/40 border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  {isHoldingLight && (
                    <div
                      className="absolute inset-x-0 bottom-0 bg-blue-500/50 h-1.5 transition-all duration-75"
                      style={{ width: `${holdProgress}%` }}
                    />
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-mono font-black text-amber-500 uppercase tracking-widest block truncate">
                      💡 SCHEINWERFER & FERNLICHT
                    </span>
                    <span
                      className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isHighBeam
                          ? 'bg-blue-500/20 text-blue-500'
                          : isLightOn
                          ? 'bg-amber-500/20 text-amber-600'
                          : isLight
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      {isHighBeam ? 'FERNLICHT AKTIV' : isLightOn ? 'ABBLENDLICHT' : 'AUS'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 my-auto">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        isHighBeam
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40 animate-pulse'
                          : isLightOn
                          ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                          : isLight
                          ? 'bg-slate-200 text-slate-500 border border-slate-300'
                          : 'bg-white/10 text-zinc-500 border border-white/10'
                      }`}
                    >
                      <Sun size={24} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-sm font-black font-mono ${
                        isLight && !isHighBeam && !isLightOn ? 'text-slate-900' : 'text-white'
                      }`}>
                        {isHighBeam ? 'FERNLICHT AN' : isLightOn ? 'ABBLENDLICHT AN' : 'SCHEINWERFER AUS'}
                      </div>
                      <p className={`text-[10px] font-mono mt-0.5 ${isLight ? 'text-slate-600' : 'text-zinc-400'}`}>
                        Klick: Licht ({bindings.light?.label}) • <strong>Gedrückt halten: Fernlicht ({bindings.highbeam?.label})</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Box 2: Rundumleuchte & Warnblinker */}
                <div
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex flex-col justify-between min-h-0 overflow-hidden ${
                    isLight ? 'bg-white/80 border-slate-200' : 'bg-black/40 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9.5px] font-mono font-black text-amber-500 uppercase tracking-widest block truncate">
                      🚨 SONDERSIGNAL & WARNBLINKER
                    </span>
                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded ${
                      isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-zinc-300'
                    }`}>
                      TASTEN: {bindings.beacon?.label} / {bindings.hazard?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 items-center">
                    <button
                      type="button"
                      data-truck-action="beacon"
                      onClick={() => triggerAction('beacon')}
                      className={`p-2 rounded-xl border flex flex-col justify-center items-center h-full transition-all cursor-pointer active:scale-95 ${
                        isBeacon
                          ? 'border-amber-500 bg-amber-500/25 shadow-[0_0_12px_rgba(245,158,11,0.35)] ring-1 ring-inset ring-amber-500 text-amber-500 font-black'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                          : 'bg-black/50 border-white/10 text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <Flame size={20} className={isBeacon ? 'animate-bounce' : isLight ? 'text-slate-400' : 'text-zinc-500'} />
                      <span className="text-xs font-black uppercase tracking-tight mt-1">RUNDUMLEUCHTE</span>
                      <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>({bindings.beacon?.label})</span>
                    </button>

                    <button
                      type="button"
                      data-truck-action="hazard"
                      onClick={() => triggerAction('hazard')}
                      className={`p-2 rounded-xl border flex flex-col justify-center items-center h-full transition-all cursor-pointer active:scale-95 ${
                        isHazard
                          ? 'border-rose-500 bg-rose-500/25 shadow-[0_0_12px_rgba(244,63,94,0.35)] ring-1 ring-inset ring-rose-500 text-rose-500 font-black animate-pulse'
                          : isLight
                          ? 'bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200'
                          : 'bg-black/50 border-white/10 text-white hover:bg-white/[0.08]'
                      }`}
                    >
                      <AlertTriangle size={20} className={isHazard ? 'text-rose-500' : isLight ? 'text-slate-400' : 'text-zinc-500'} />
                      <span className="text-xs font-black uppercase tracking-tight mt-1">WARNBLINKER</span>
                      <span className={`text-[8px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>({bindings.hazard?.label})</span>
                    </button>
                  </div>
                </div>

                {/* Box 3: Scheibenwischer */}
                <div
                  data-truck-action="wipers"
                  onClick={() => triggerAction('wipers')}
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex items-center justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    isWipers
                      ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.35)] ring-1 ring-inset ring-cyan-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100'
                      : 'bg-black/40 border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        isWipers
                          ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30'
                          : isLight
                          ? 'bg-slate-200 text-slate-600 border border-slate-300'
                          : 'bg-white/10 text-zinc-400 border border-white/10'
                      }`}
                    >
                      <Wind size={20} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black font-mono tracking-tight truncate ${
                          isLight && !isWipers ? 'text-slate-900' : 'text-white'
                        }`}>
                          SCHEIBENWISCHER
                        </span>
                        <span
                          className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                            isWipers
                              ? 'bg-cyan-500/20 text-cyan-600 border-cyan-400/40'
                              : isLight
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-white/10 text-zinc-400 border-white/10'
                          }`}
                        >
                          {isWipers ? 'WISCHER AKTIV' : 'WISCHER AUS'}
                        </span>
                      </div>
                      <p className={`text-[9.5px] font-medium truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        Scheibenreinigung & Intervall • Taste: ({bindings.wipers?.label})
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div
                    className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-200 shrink-0 ml-2 ${
                      isWipers ? 'bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.5)]' : isLight ? 'bg-slate-300' : 'bg-white/20'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        isWipers ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* Box 4: Aufliegerkopplung (Sattelplatte) */}
                <div
                  data-truck-action="trailer_coupling"
                  onClick={() => triggerAction('trailer_coupling')}
                  className={`rounded-xl border backdrop-blur-xl p-2.5 shadow-md flex items-center justify-between transition-all cursor-pointer select-none active:scale-95 ${
                    hasTrailer
                      ? 'border-blue-500 bg-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.35)] ring-1 ring-inset ring-blue-500'
                      : isLight
                      ? 'bg-white/80 border-slate-200 hover:bg-slate-100'
                      : 'bg-black/40 border-white/10 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        hasTrailer
                          ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                          : isLight
                          ? 'bg-slate-200 text-slate-600 border border-slate-300'
                          : 'bg-white/10 text-zinc-400 border border-white/10'
                      }`}
                    >
                      {hasTrailer ? <LinkIcon size={20} /> : <Unlink size={20} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black font-mono tracking-tight truncate ${
                          isLight && !hasTrailer ? 'text-slate-900' : 'text-white'
                        }`}>
                          SATTELKUPPLUNG
                        </span>
                        <span
                          className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded-full border shrink-0 ${
                            hasTrailer
                              ? 'bg-blue-500/20 text-blue-600 border-blue-400/40'
                              : isLight
                              ? 'bg-slate-200 text-slate-700 border-slate-300'
                              : 'bg-white/10 text-zinc-400 border-white/10'
                          }`}
                        >
                          {hasTrailer ? 'ANGEKUPPELT' : 'SOLO-FAHRT'}
                        </span>
                      </div>
                      <p className={`text-[9.5px] font-medium truncate mt-0.5 ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>
                        {hasTrailer ? 'Auflieger abkoppeln' : 'Auflieger ankuppeln'} • Taste: ({bindings.trailer_coupling?.label})
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black border transition-all ${
                      hasTrailer
                        ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400 shadow-md'
                        : isLight
                        ? 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300'
                        : 'bg-white/10 text-zinc-300 border-white/20'
                    }`}
                  >
                    {hasTrailer ? 'ABKUPPELN' : 'ANKUPPELN'}
                  </button>
                </div>
              </div>

              {/* Box 5: Bottom Standby Bar Style (Motor & Handbremse) */}
              <div className="grid grid-cols-2 gap-2 shrink-0">
                {/* Handbremse */}
                <div
                  data-truck-action="parkingbrake"
                  onClick={() => triggerAction('parkingbrake')}
                  className={`rounded-xl border p-2 sm:p-2.5 shadow-lg backdrop-blur-xl flex items-center justify-between transition-all cursor-pointer select-none ${
                    isParkBrake
                      ? 'border-rose-500 bg-rose-500/25 shadow-[0_0_15px_rgba(244,63,94,0.4)] ring-1 ring-inset ring-rose-500'
                      : isLight
                      ? 'bg-slate-100/90 border-slate-250 hover:bg-slate-200'
                      : 'bg-black/40 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isParkBrake ? 'bg-rose-600 text-white shadow-md animate-pulse' : isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      <Disc size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-black font-mono truncate ${isLight && !isParkBrake ? 'text-slate-900' : 'text-white'}`}>
                        FESTSTELLBREMSE
                      </div>
                      <div className={`text-[9.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Taste: ({bindings.parkingbrake?.label})</div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${
                      isParkBrake
                        ? 'bg-rose-500/30 text-rose-500 border-rose-400'
                        : isLight
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-white/10 text-zinc-400 border-white/10'
                    }`}
                  >
                    {isParkBrake ? 'ANGEZOGEN' : 'GELÖST'}
                  </span>
                </div>

                {/* Motor */}
                <div
                  data-truck-action="engine"
                  onClick={() => triggerAction('engine')}
                  className={`rounded-xl border p-2 sm:p-2.5 shadow-lg backdrop-blur-xl flex items-center justify-between transition-all cursor-pointer select-none ${
                    isEngineOn
                      ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-1 ring-inset ring-emerald-500'
                      : isLight
                      ? 'bg-slate-100/90 border-slate-250 hover:bg-slate-200'
                      : 'bg-black/40 border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isEngineOn ? 'bg-emerald-600 text-white shadow-md' : isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-zinc-400'
                      }`}
                    >
                      <Power size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-xs font-black font-mono truncate ${isLight && !isEngineOn ? 'text-slate-900' : 'text-white'}`}>
                        MOTOR ANLASSER
                      </div>
                      <div className={`text-[9.5px] font-mono ${isLight ? 'text-slate-500' : 'text-zinc-400'}`}>Taste: ({bindings.engine?.label})</div>
                    </div>
                  </div>
                  <span
                    className={`text-[9px] font-mono font-black px-2 py-0.5 rounded-full border ${
                      isEngineOn
                        ? 'bg-emerald-500/30 text-emerald-600 border-emerald-400'
                        : isLight
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-white/10 text-zinc-400 border-white/10'
                    }`}
                  >
                    {isEngineOn ? 'LÄUFT' : 'AUS'}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
