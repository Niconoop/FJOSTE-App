import { useState, useEffect, useRef } from 'react';
import { Monitor, Lock, Unlock, Sliders, SlidersHorizontal, RefreshCw, Check, Eye, EyeOff, LayoutTemplate } from 'lucide-react';
import { toast } from 'sonner';

interface Position {
  x: number;
  y: number;
}

interface Positions {
  [key: string]: Position;
}

interface WidgetSize {
  w: number; // width in pixels
  h: number; // height in pixels (0 = auto)
}

interface OverlaySettingsType {
  style: 'neon' | 'carbon' | 'minimal';
  layoutType: 'vertical' | 'horizontal' | 'grid';
  showLogo: boolean;
  showMainHud: boolean;
  showDrivers: boolean;
  showEvent: boolean;
  widgetOrder: string[];
  zoom: number;
  bgOpacity: number;
  widgetBlur: boolean;
  showGear: boolean;
  showSpeed: boolean;
  showFuel: boolean;
  showRemainingDistance: boolean;
  showETA: boolean;
  showCargo: boolean;
  showIncome: boolean;
  widgetSizes: Record<string, WidgetSize>;
  singleRowHud: boolean;
}

const DEFAULT_WIDGET_SIZES: Record<string, WidgetSize> = {
  logo: { w: 80, h: 80 },
  mainHud: { w: 384, h: 120 },
  event: { w: 288, h: 64 },
  drivers: { w: 192, h: 0 } // 0 = auto‑height (flex column)
};

const DEFAULT_SETTINGS: OverlaySettingsType = {
  style: 'neon',
  layoutType: 'vertical',
  showLogo: true,
  showMainHud: true,
  showDrivers: true,
  showEvent: true,
  widgetOrder: ['logo', 'mainHud', 'event', 'drivers'],
  zoom: 100,
  bgOpacity: 80,
  widgetBlur: false,
  showGear: true,
  showSpeed: true,
  showFuel: true,
  showRemainingDistance: true,
  showETA: true,
  showCargo: true,
  showIncome: true,
  widgetSizes: { ...DEFAULT_WIDGET_SIZES },
  singleRowHud: false
};

const OverlaySettings = () => {
  const [settings, setSettings] = useState<OverlaySettingsType>(() => {
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
      } catch (e) { }
    }
    return {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 }
    };
  });

  const [widgetSizes, setWidgetSizes] = useState<Record<string, WidgetSize>>(() => {
    const saved = localStorage.getItem('fjoste_overlay_widget_sizes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) { }
    }
    return { ...DEFAULT_WIDGET_SIZES };
  });

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [rpcActive, setRpcActive] = useState(false);

  // Resize handling state
  const [resizingWidget, setResizingWidget] = useState<string | null>(null);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const resizeStartSize = useRef<WidgetSize>({ w: 0, h: 0 });

  const previewRef = useRef<HTMLDivElement>(null);
  const [previewDims, setPreviewDims] = useState({ w: 480, h: 270 });

  // Custom Mouse Dragging State
  const [draggingWidget, setDraggingWidget] = useState<string | null>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const widgetStartPos = useRef({ x: 0, y: 0 });

  // Resize mouse events
  const onResizeStart = (e: React.MouseEvent, widgetKey: string) => {
    e.stopPropagation();
    setResizingWidget(widgetKey);
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    resizeStartSize.current = widgetSizes[widgetKey] ?? DEFAULT_WIDGET_SIZES[widgetKey];
  };

  useEffect(() => {
    if (!resizingWidget) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartPos.current.x;
      const dy = e.clientY - resizeStartPos.current.y;
      const defaultSize = DEFAULT_WIDGET_SIZES[resizingWidget] || { w: 40, h: 40 };
      // Minimum dimensions: 40px shrink allowed; maximum = default size when singleRowHud is active
      const MIN_WIDGET_W = 280;
      const minW = Math.max(MIN_WIDGET_W, settings.singleRowHud ? 40 : defaultSize.w);
      const minH = settings.singleRowHud ? 40 : defaultSize.h;
      const maxW = Infinity; // unlimited width even in single‑row mode
      const maxH = settings.singleRowHud ? defaultSize.h : Infinity;
      const newW = Math.min(maxW, Math.max(minW, resizeStartSize.current.w + dx));
      const newH = Math.min(maxH, Math.max(minH, resizeStartSize.current.h + dy));
      setWidgetSizes(prev => ({
        ...prev,
        [resizingWidget]: { w: newW, h: newH }
      }));
    };
    const onMouseUp = () => {
      setResizingWidget(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [resizingWidget]);

  // Update layout settings
  useEffect(() => {
    localStorage.setItem('fjoste_overlay_settings', JSON.stringify(settings));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-settings-changed', settings);
    } catch (e) { }
  }, [settings]);

  // Persist widget sizes and notify overlay
  useEffect(() => {
    localStorage.setItem('fjoste_overlay_widget_sizes', JSON.stringify(widgetSizes));
    try {
      const { ipcRenderer } = window.require('electron');
      // Merge widgetSizes into current settings payload
      ipcRenderer.send('overlay-settings-changed', { ...settings, widgetSizes });
    } catch (e) { }
  }, [widgetSizes, settings]);

  // Sync RPC status
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('rpc-get-status').then(setRpcActive).catch(() => { });
      const rpcListener = (_: any, status: boolean) => setRpcActive(status);
      ipcRenderer.on('rpc-active-changed', rpcListener);
      return () => {
        ipcRenderer.removeListener('rpc-active-changed', rpcListener);
      };
    } catch (e) { }
  }, []);

  // Sync overlay open / lock status
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('overlay-status').then(setIsOverlayOpen).catch(() => { });
      ipcRenderer.invoke('overlay-lock-status').then(setIsLocked).catch(() => { });

      const statusListener = (_: any, status: boolean) => setIsOverlayOpen(status);
      ipcRenderer.on('overlay-status-changed', statusListener);

      const lockListener = (_: any, locked: boolean) => setIsLocked(locked);
      ipcRenderer.on('overlay-lock-changed', lockListener);

      return () => {
        ipcRenderer.removeListener('overlay-status-changed', statusListener);
        ipcRenderer.removeListener('overlay-lock-changed', lockListener);
      };
    } catch (e) { }
  }, []);

  // Monitor preview element size to make coordinates calculation accurate
  useEffect(() => {
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      setPreviewDims({ w: rect.width, h: rect.height });
    }
    const handleResize = () => {
      if (previewRef.current) {
        const rect = previewRef.current.getBoundingClientRect();
        setPreviewDims({ w: rect.width, h: rect.height });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleOverlay = () => {
    setIsOverlayOpen(prev => !prev);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-toggle');
    } catch (e) {
      toast.error('Electron-Schnittstelle nicht verfügbar.');
    }
  };

  const toggleRpc = () => {
    const newState = !rpcActive;
    setRpcActive(newState);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('rpc-toggle', newState).catch(() => { });
    } catch (e) {
      toast.error('Electron-Schnittstelle nicht verfügbar.');
    }
  };

  const toggleLock = () => {
    const nextLock = !isLocked;
    setIsLocked(nextLock);
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-lock', nextLock);
    } catch (e) { }
  };

  const resetPositions = () => {
    const defaultPositions = {
      logo: { x: 40, y: 40 },
      mainHud: { x: 40, y: 130 },
      event: { x: 40, y: 310 },
      drivers: { x: 40, y: 440 }
    };
    const defaultSizes = { ...DEFAULT_WIDGET_SIZES };
    setPositions(defaultPositions);
    setWidgetSizes(defaultSizes);
    localStorage.setItem('fjoste_overlay_positions', JSON.stringify(defaultPositions));
    localStorage.setItem('fjoste_overlay_widget_sizes', JSON.stringify(defaultSizes));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-reset-positions');
      ipcRenderer.send('overlay-positions-updated', defaultPositions);
      ipcRenderer.send('overlay-settings-changed', { ...settings, widgetSizes: defaultSizes });
      toast.success('Widget-Positionen und Größen zurückgesetzt.');
    } catch (e) {
      toast.success('Widget-Positionen und Größen lokal zurückgesetzt.');
    }
  };

  const updateSetting = <K extends keyof OverlaySettingsType>(key: K, value: OverlaySettingsType[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const SW = window.screen.width || 1920;
  const SH = window.screen.height || 1080;

  const widgetLabels: Record<string, string> = {
    logo: 'Firmenlogo',
    mainHud: 'Haupt-HUD',
    event: 'Event-Widget',
    drivers: 'Fahrer Online'
  };

  // Custom Drag Event Handlers
  const handleMouseDown = (widget: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingWidget(widget);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    widgetStartPos.current = {
      x: positions[widget]?.x ?? 40,
      y: positions[widget]?.y ?? 40
    };
  };

  const isWidgetEnabled = (wName: string) => {
    if (wName === 'logo') return settings.showLogo;
    if (wName === 'mainHud') return settings.showMainHud;
    if (wName === 'event') return settings.showEvent;
    if (wName === 'drivers') return settings.showDrivers;
    return false;
  };

  useEffect(() => {
    if (!draggingWidget) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Calculate screen pixel change
      const dx = (e.clientX - dragStartPos.current.x) * (SW / w);
      const dy = (e.clientY - dragStartPos.current.y) * (SH / h);

      const rawLimitW = widgetSizes[draggingWidget]?.w || 100;
      const rawLimitH = widgetSizes[draggingWidget]?.h || 100;
      const zoomFactor = settings.zoom / 100;
      const limitW = rawLimitW * zoomFactor;
      const limitH = rawLimitH * zoomFactor;

      const rawNextX = widgetStartPos.current.x + dx;
      const rawNextY = widgetStartPos.current.y + dy;

      // Magnetic Snapping Logic
      const SNAP_THRESHOLD = 24; // Snapping radius in screen pixels
      const snapTargetsX = [
        0,                        // Left edge
        40,                       // Left margin
        (SW - limitW) / 2,        // Center
        SW - limitW - 40,         // Right margin
        SW - limitW               // Right edge
      ];
      const snapTargetsY = [
        0,                        // Top edge
        40,                       // Top margin
        (SH - limitH) / 2,        // Center
        SH - limitH - 40,         // Bottom margin
        SH - limitH               // Bottom edge
      ];

      let snappedX = rawNextX;
      for (const target of snapTargetsX) {
        if (Math.abs(rawNextX - target) < SNAP_THRESHOLD) {
          snappedX = target;
          break;
        }
      }

      let snappedY = rawNextY;
      for (const target of snapTargetsY) {
        if (Math.abs(rawNextY - target) < SNAP_THRESHOLD) {
          snappedY = target;
          break;
        }
      }

      // Constrain within screen boundaries
      const nextX = Math.max(0, Math.min(SW - limitW, snappedX));
      const nextY = Math.max(0, Math.min(SH - limitH, snappedY));

      const currentPos = positions[draggingWidget] || { x: 40, y: 40 };
      let resolvedX = currentPos.x;
      let resolvedY = currentPos.y;

      // Check collision on X axis (at current Y position)
      let collisionX = false;
      const zoomFactorX = settings.zoom / 100;
      for (const otherWidget of Object.keys(widgetSizes)) {
        if (otherWidget === draggingWidget) continue;
        if (!isWidgetEnabled(otherWidget)) continue;

        const otherPos = positions[otherWidget] || { x: 40, y: 40 };
        const otherW = widgetSizes[otherWidget].w * zoomFactorX;
        const otherH = widgetSizes[otherWidget].h * zoomFactorX;

        if (nextX < otherPos.x + otherW && nextX + limitW > otherPos.x &&
          resolvedY < otherPos.y + otherH && resolvedY + limitH > otherPos.y) {
          collisionX = true;
          break;
        }
      }
      if (!collisionX) {
        resolvedX = nextX;
      }

      // Check collision on Y axis (at resolved X position)
      let collisionY = false;
      const zoomFactorY = settings.zoom / 100;
      for (const otherWidget of Object.keys(widgetSizes)) {
        if (otherWidget === draggingWidget) continue;
        if (!isWidgetEnabled(otherWidget)) continue;

        const otherPos = positions[otherWidget] || { x: 40, y: 40 };
        const otherW = widgetSizes[otherWidget].w * zoomFactorY;
        const otherH = widgetSizes[otherWidget].h * zoomFactorY;

        if (resolvedX < otherPos.x + otherW && resolvedX + limitW > otherPos.x &&
          nextY < otherPos.y + otherH && nextY + limitH > otherPos.y) {
          collisionY = true;
          break;
        }
      }
      if (!collisionY) {
        resolvedY = nextY;
      }

      const updated = {
        ...positions,
        [draggingWidget]: {
          x: Math.round(resolvedX),
          y: Math.round(resolvedY)
        }
      };

      setPositions(updated);
      localStorage.setItem('fjoste_overlay_positions', JSON.stringify(updated));

      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('overlay-positions-updated', updated);
      } catch (err) { }
    };

    const handleMouseUp = () => {
      setDraggingWidget(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingWidget, positions, settings, widgetSizes]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-foreground tracking-tight">Overlay-Setup</h1>
          <p className="text-slate-500 text-xs mt-1">Passe dein In-Game Overlay und die Discord RPC an</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Left Column: Settings and Controls */}
        <div className="xl:col-span-2 space-y-6">
          {/* System Services Toggles */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-[10px] font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <Monitor size={14} className="text-primary" /> System-Dienste
            </h2>
            <div className="space-y-4">
              {/* Overlay Toggle Switch */}
              <label className="flex items-center justify-between py-1 cursor-pointer group">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">Spiele-Overlay</span>
                  <span className="text-[9px] text-slate-500">Zeigt HUD-Widgets im Spiel an</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={isOverlayOpen}
                    onChange={toggleOverlay}
                    className="sr-only peer"
                  />
                  <div className="switch-toggle" />
                </div>
              </label>

              {/* Discord RPC Toggle Switch */}
              <label className="flex items-center justify-between py-1 border-t border-white/5 pt-4 cursor-pointer group">
                <div>
                  <span className="text-xs text-slate-300 font-medium block">Discord Status (RPC)</span>
                  <span className="text-[9px] text-slate-500">Teilt deinen Fahr- & App-Status auf Discord</span>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={rpcActive}
                    onChange={toggleRpc}
                    className="sr-only peer"
                  />
                  <div className="switch-toggle" />
                </div>
              </label>
            </div>
          </div>

          {/* Style Presets */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-[10px] font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <LayoutTemplate size={14} className="text-primary" /> Design-Stil
            </h2>
            <div className="grid grid-cols-1 gap-3">
              {[
                {
                  id: 'neon',
                  title: 'Cyberpunk Neon',
                  desc: 'Leuchtendes Cyan/Magenta, weiche Glow-Effekte und dynamische abgerundete Balken.',
                  color: 'text-[#22D1EE]'
                },
                {
                  id: 'carbon',
                  title: 'Motorsport Carbon',
                  desc: 'Sportliche Carbonfaser-Optik, mattiertes Glas und bernsteinfarbene Akzente.',
                  color: 'text-amber-400'
                },
                {
                  id: 'minimal',
                  title: 'Minimal Clean',
                  desc: 'Dezente weiße Akzente, hochauflösendes Milchglas (Glassmorphic) und simple Formen.',
                  color: 'text-white'
                }
              ].map(preset => {
                const isSelected = settings.style === preset.id;
                const borderClass = isSelected
                  ? preset.id === 'neon' ? 'border-[#22D1EE] bg-[#22D1EE]/5'
                    : preset.id === 'carbon' ? 'border-amber-500 bg-amber-500/5'
                      : 'border-white bg-white/5'
                  : 'border-white/5 bg-black/30 hover:border-white/10';

                return (
                  <button
                    key={preset.id}
                    onClick={() => updateSetting('style', preset.id as any)}
                    className={`flex flex-col text-left p-4 rounded-2xl border transition-all relative overflow-hidden group cursor-pointer ${borderClass}`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-sm font-bold text-white">{preset.title}</span>
                      {isSelected && <Check size={14} className={preset.color} />}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">{preset.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Visibility and Zoom */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-[10px] font-bold text-foreground uppercase tracking-widest mb-6 flex items-center gap-2">
              <Sliders size={14} className="text-primary" /> Skalierung & Widgets
            </h2>

            <div className="space-y-6">
              {/* Zoom */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Overlay-Größe (Zoom)</span>
                  <span className="font-bold text-white tabular-nums">{settings.zoom}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={settings.zoom}
                  onChange={e => updateSetting('zoom', Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>50%</span>
                  <span>100%</span>
                  <span>150%</span>
                </div>
              </div>

              {/* Background Opacity */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Hintergrund-Deckkraft</span>
                  <span className="font-bold text-white tabular-nums">{settings.bgOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.bgOpacity}
                  onChange={e => updateSetting('bgOpacity', Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>10% (Transparent)</span>
                  <span>100% (Solid)</span>
                </div>
              </div>

              {/* Widget Blur Toggle */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <label className="flex items-center justify-between py-1 cursor-pointer group">
                  <div>
                    <span className="text-xs text-slate-300 font-medium block">Widgets Blur</span>
                    <span className="text-[9px] text-slate-500">Aktiviere 12px Blur für Widgets</span>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.widgetBlur}
                      onChange={() => updateSetting('widgetBlur', !settings.widgetBlur)}
                      className="sr-only peer"
                    />
                    <div className="switch-toggle" />
                  </div>
                </label>
              </div>

              {/* Widgets Visibility Toggles */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <h3 className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Widgets einblenden</h3>
                {[
                  { key: 'showLogo', label: 'FJOSTE Firmenlogo' },
                  { key: 'showMainHud', label: 'Haupt-HUD (Telemetriedaten)' },
                  { key: 'showEvent', label: 'Nächstes Event-Widget' },
                  { key: 'showDrivers', label: 'Online-Fahrer Liste' }
                ].map(item => {
                  const active = settings[item.key as keyof OverlaySettingsType] as boolean;
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between cursor-pointer group py-0.5"
                    >
                      <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => updateSetting(item.key as any, !active)}
                          className="sr-only peer"
                        />
                        <div className="switch-toggle" />
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* HUD Details */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-[10px] font-bold text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-primary" /> HUD Details
            </h2>
            <p className="text-[10px] text-slate-500 mb-4 uppercase tracking-wider leading-relaxed">
              Wähle die Werte für das Haupt-Widget:
            </p>

            <div className="space-y-3">
              {[
                { key: 'showSpeed', label: 'Geschwindigkeit (KM/H)' },
                { key: 'showGear', label: 'Gang-Anzeige' },
                { key: 'showFuel', label: 'Tank & Reichweite' },
                { key: 'showRemainingDistance', label: 'Rest-Kilometer (Navi)' },
                { key: 'showETA', label: 'Ankunftszeit (ETA)' },
                { key: 'showCargo', label: 'Fracht & Gewicht' },
                { key: 'showIncome', label: 'Einnahmen' },
                { key: 'singleRowHud', label: 'Einzelzeilen HUD' }
              ].map(item => {
                const active = settings[item.key as keyof OverlaySettingsType] as boolean;
                return (
                  <label
                    key={item.key}
                    className="flex items-center justify-between cursor-pointer group py-0.5"
                  >
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => updateSetting(item.key as any, !active)}
                        className="sr-only peer"
                      />
                      <div className="switch-toggle" />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Status & Interactive Simulator */}
        <div className="xl:col-span-3 space-y-6">
          {/* Status and Action Buttons */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-[10px] font-bold text-foreground uppercase tracking-widest mb-4">
              Status & Preview-Modus
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {isOverlayOpen ? 'Overlay läuft im Hintergrund' : 'Overlay ist geschlossen'}
                </p>
                <p className="text-[10px] text-slate-500 font-medium mt-1">
                  {isOverlayOpen
                    ? (isLocked ? 'Vorschau-Modus Inaktiv (wird nur im Spiel angezeigt)' : 'Vorschau-Modus Aktiv (sichtbar auf dem Desktop)')
                    : 'Starte das Overlay, um es zu positionieren'
                  }
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {isOverlayOpen && (
                  <button
                    onClick={toggleLock}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 active:scale-95 ${isLocked
                      ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                  >
                    {isLocked ? <Eye size={12} /> : <EyeOff size={12} />}
                    {isLocked ? 'Vorschau auf Desktop' : 'Vorschau ausblenden'}
                  </button>
                )}
                <button
                  onClick={resetPositions}
                  className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
                >
                  <RefreshCw size={12} />
                  Reset Layout
                </button>
              </div>
            </div>

            <div className="mt-4 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
              <p className="text-[11px] text-slate-300 leading-relaxed">
                💡 <strong>Desktop Vorschau:</strong> Aktiviere den Vorschau-Modus, um das transparente Overlay auf deinem Desktop sichtbar zu machen. Du kannst die Widgets dann im Simulator unten verschieben und siehst das Ergebnis sofort live an der echten Position.
              </p>
            </div>
          </div>

          {/* Interactive Screen Simulator */}
          <div className="glass-card hover-glow flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-unbounded text-xs font-bold text-foreground uppercase tracking-widest">
                Bildschirm-Simulator (Layout-Editor)
              </h2>
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-black px-2.5 py-1 rounded-lg border border-white/5 tabular-nums">
                Auflösung: {SW} x {SH} px
              </span>
            </div>

            {/* Simulated Desktop Box */}
            <div
              ref={previewRef}
              className="relative w-full aspect-video bg-black/90 rounded-2xl border-2 border-white/5 overflow-hidden shadow-[inset_0_4px_30px_rgba(0,0,0,0.9)]"
              style={{
                backgroundImage: 'radial-gradient(rgba(43, 161, 185, 0.08) 1px, transparent 1px)',
                backgroundSize: '20px 20px'
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                <span className="font-unbounded text-3xl font-black uppercase tracking-widest italic select-none">FJOSTE SCREEN</span>
              </div>

              {/* Visual Guidelines for Snap Targets (only visible when dragging) */}
              {draggingWidget && (
                <>
                  {/* Center lines */}
                  <div className="absolute inset-y-0 left-1/2 border-l border-primary/20 border-dashed pointer-events-none" />
                  <div className="absolute inset-x-0 top-1/2 border-t border-primary/20 border-dashed pointer-events-none" />

                  {/* Margins */}
                  <div className="absolute inset-y-0 border-l border-white/[0.04] border-dashed pointer-events-none" style={{ left: `${(40 / SW) * 100}%` }} />
                  <div className="absolute inset-y-0 border-r border-white/[0.04] border-dashed pointer-events-none" style={{ right: `${(40 / SW) * 100}%` }} />
                  <div className="absolute inset-x-0 border-t border-white/[0.04] border-dashed pointer-events-none" style={{ top: `${(40 / SH) * 100}%` }} />
                  <div className="absolute inset-x-0 border-b border-white/[0.04] border-dashed pointer-events-none" style={{ bottom: `${(40 / SH) * 100}%` }} />
                </>
              )}

              {/* Render simulated widgets */}
              {Object.keys(widgetSizes).map((widget) => {
                const size = widgetSizes[widget];
                const pos = positions[widget] || { x: 40, y: 40 };

                const isEnabled = isWidgetEnabled(widget);

                const scaleX = previewDims.w / SW;
                const scaleY = previewDims.h / SH;
                const zoomFactor = settings.zoom / 100;

                const wPreview = size.w * scaleX * zoomFactor;
                const hPreview = size.h * scaleY * zoomFactor;

                const xPreview = pos.x * scaleX;
                const yPreview = pos.y * scaleY;

                const themeStyles = {
                  neon: {
                    border: 'border-[#22D1EE]/40 bg-[#22D1EE]/5 shadow-[0_0_10px_rgba(34,209,238,0.1)]',
                    text: 'text-[#22D1EE]',
                    badge: 'bg-[#22D1EE]/10 text-[#22D1EE]'
                  },
                  carbon: {
                    border: 'border-amber-500/40 bg-amber-500/5 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
                    text: 'text-amber-400',
                    badge: 'bg-amber-500/10 text-amber-400'
                  },
                  minimal: {
                    border: 'border-white/30 bg-white/5 shadow-[0_0_10px_rgba(255,255,255,0.03)]',
                    text: 'text-white',
                    badge: 'bg-white/10 text-white'
                  }
                }[settings.style];

                return (
                  <div
                    key={widget}
                    onMouseDown={(e) => isEnabled && handleMouseDown(widget, e)}
                    className={`absolute rounded-xl border flex flex-col items-center justify-center p-2 select-none group ${isEnabled
                      ? `${themeStyles.border} cursor-grab active:cursor-grabbing hover:border-primary/80`
                      : 'border-dashed border-white/5 bg-white/[0.01] opacity-20 cursor-not-allowed'
                      }`}
                    style={{
                      left: 0,
                      top: 0,
                      transform: `translate3d(${xPreview}px, ${yPreview}px, 0)`,
                      width: wPreview,
                      height: hPreview,
                    }}
                  >
                    <span className={`text-[8px] font-black uppercase tracking-wider text-center ${isEnabled ? themeStyles.text : 'text-slate-500'}`}>
                      {widgetLabels[widget]}
                    </span>
                    {isEnabled && (
                      <>
                        <span className="text-[6.5px] font-bold text-slate-400 mt-1 tabular-nums bg-black/40 px-1 rounded">
                          x:{Math.round(pos.x)} y:{Math.round(pos.y)}
                        </span>
                        <div
                          className="absolute -right-1.5 -bottom-1.5 w-4 h-4 bg-primary cursor-se-resize rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => onResizeStart(e, widget)}
                        />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 text-[10px] text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Bewege die Widgets im virtuellen Bildschirm per Drag-and-drop.</span>
              <span className="font-bold text-slate-400 bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                Live-Sync aktiv
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlaySettings;
