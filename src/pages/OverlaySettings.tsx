import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Monitor, Lock, Unlock, Sliders, Layout, SlidersHorizontal, ArrowUp, ArrowDown, Eye, EyeOff, RefreshCw, Sparkles, Check } from 'lucide-react';
import { toast } from 'sonner';

interface OverlaySettingsType {
  style: 'neon' | 'retro' | 'minimal';
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
  showGear: true,
  showSpeed: true,
  showFuel: true,
  showRemainingDistance: true,
  showETA: true,
  showCargo: true,
  showIncome: true
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

  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [rpcActive, setRpcActive] = useState(false); // RPC status


  useEffect(() => {
    localStorage.setItem('fjoste_overlay_settings', JSON.stringify(settings));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-settings-changed', settings);
    } catch (e) {
      // Not in electron env
    }
  }, [settings]);

  // Fetch RPC status and listen for changes
  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.invoke('rpc-status').then(setRpcActive).catch(() => { });
      const rpcListener = (_: any, status: boolean) => setRpcActive(status);
      ipcRenderer.on('rpc-status-changed', rpcListener);
      return () => {
        ipcRenderer.removeListener('rpc-status-changed', rpcListener);
      };
    } catch (e) { }
  }, []);

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

  const toggleOverlay = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-toggle');
    } catch (e) {
      toast.error('Electron-Schnittstelle nicht verfügbar.');
    }
  };

  const toggleRpc = () => {
    try {
      const { ipcRenderer } = window.require('electron');
      const newState = !rpcActive;
      ipcRenderer.invoke('rpc-toggle', newState).then(setRpcActive).catch(() => { });
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
    localStorage.setItem('fjoste_overlay_positions', JSON.stringify(defaultPositions));
    try {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('overlay-reset-positions');
      toast.success('Widget-Positionen zurückgesetzt.');
    } catch (e) {
      toast.success('Widget-Positionen lokal zurückgesetzt.');
    }
  };

  const updateSetting = <K extends keyof OverlaySettingsType>(key: K, value: OverlaySettingsType[K]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...settings.widgetOrder];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOrder.length) return;

    // Swap
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIndex];
    newOrder[targetIndex] = temp;

    updateSetting('widgetOrder', newOrder);
  };

  const widgetDisplayNames: Record<string, string> = {
    logo: 'FJOSTE Firmenlogo',
    mainHud: 'Haupt-HUD (Telemetriedaten)',
    event: 'Nächstes Event-Widget',
    drivers: 'Online-Fahrer Liste'
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-foreground tracking-tight">Overlay-Setup</h1>
          <p className="text-slate-500 text-xs mt-1">Passe das ETS2 Overlay an deine Wünsche an</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleOverlay}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 active:scale-95 ${isOverlayOpen
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20'
                : 'bg-primary/10 border-primary/20 text-primary hover:bg-primary/20'
              }`}
          >
            <Monitor size={14} />
            {isOverlayOpen ? 'Overlay schließen' : 'Overlay starten'}
          </button>
          <button
            onClick={toggleRpc}
            className={`ml-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 active:scale-95 ${rpcActive
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-gray-500/10 border-gray-500/20 text-gray-400 hover:bg-gray-500/20'
              }`}
          >
            {rpcActive ? 'RPC deaktivieren' : 'RPC aktivieren'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Quick Actions & Presets */}
        <div className="space-y-6 lg:col-span-2">
          {/* Quick status card */}
          <div className="glass-card hover-glow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl" />
            <h2 className="font-unbounded text-xs font-bold text-foreground uppercase tracking-widest mb-6">Status & Steuerung</h2>

            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${isOverlayOpen ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-slate-700'}`} />
                <div>
                  <p className="text-sm font-bold text-white leading-tight">
                    {isOverlayOpen ? 'Overlay ist aktiv' : 'Overlay ist inaktiv'}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {isOverlayOpen
                      ? `${isLocked ? 'Gesperrt (Durchklickbar)' : 'Entsperrt (Verschiebbar)'}`
                      : 'Starte das Overlay, um es zu konfigurieren'
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {isOverlayOpen && (
                  <button
                    onClick={toggleLock}
                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 active:scale-95 ${isLocked
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                      }`}
                  >
                    {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    {isLocked ? 'Entsperren' : 'Sperren'}
                  </button>
                )}
                <button
                  onClick={resetPositions}
                  className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 active:scale-95"
                >
                  <RefreshCw size={12} />
                  Reset
                </button>
              </div>
            </div>

            {isOverlayOpen && (
              <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  💡 <strong>Tipp zum Positionieren:</strong> Entsperre das Overlay, um es mit der Maus an die gewünschte Stelle auf deinem Bildschirm zu ziehen und zu skalieren. Klicke dann auf <strong>Sperren</strong> oder drücke <strong>Ctrl+Shift+L</strong>, um es unsichtbar für Mausklicks zu machen. So stört es dich nicht beim Spielen.
                </p>
              </div>
            )}
          </div>

          {/* Style Presets */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-xs font-bold text-foreground uppercase tracking-widest mb-6">Style-Presets</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Neon preset */}
              <button
                onClick={() => updateSetting('style', 'neon')}
                className={`flex flex-col text-left p-5 rounded-2xl border transition-all relative overflow-hidden group ${settings.style === 'neon'
                    ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(43,161,185,0.15)]'
                    : 'border-white/5 bg-black/40 hover:border-white/10'
                  }`}
              >
                <div className="absolute top-0 right-0 w-12 h-12 bg-primary/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Cyberpunk</span>
                <span className="text-sm font-bold text-white mb-2">Futuristische Neon</span>
                <p className="text-[10px] text-slate-400 leading-normal mb-4">Leuchtendes Cyan/Magenta, weiche Glow-Effekte und dynamische, abgerundete Bars.</p>
                <div className="mt-auto flex items-center gap-1.5 text-[9px] font-bold text-primary">
                  {settings.style === 'neon' ? <Check size={12} /> : null}
                  {settings.style === 'neon' ? 'Ausgewählt' : 'Aktivieren'}
                </div>
              </button>

              {/* Retro preset */}
              <button
                onClick={() => updateSetting('style', 'retro')}
                className={`flex flex-col text-left p-5 rounded-2xl border transition-all relative overflow-hidden group ${settings.style === 'retro'
                    ? 'border-green-500 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.15)]'
                    : 'border-white/5 bg-black/40 hover:border-white/10'
                  }`}
              >
                <div className="absolute top-0 right-0 w-12 h-12 bg-green-500/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Terminal</span>
                <span className="text-sm font-bold text-white mb-2">Retro Digital</span>
                <p className="text-[10px] text-slate-400 leading-normal mb-4">Monochromer Green-Screen, scharfe Ecken, Monospace Schriftart und feine Scanlines.</p>
                <div className="mt-auto flex items-center gap-1.5 text-[9px] font-bold text-green-400">
                  {settings.style === 'retro' ? <Check size={12} /> : null}
                  {settings.style === 'retro' ? 'Ausgewählt' : 'Aktivieren'}
                </div>
              </button>

              {/* Minimal preset */}
              <button
                onClick={() => updateSetting('style', 'minimal')}
                className={`flex flex-col text-left p-5 rounded-2xl border transition-all relative overflow-hidden group ${settings.style === 'minimal'
                    ? 'border-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.08)]'
                    : 'border-white/5 bg-black/40 hover:border-white/10'
                  }`}
              >
                <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-full blur-xl group-hover:scale-125 transition-transform" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Clean</span>
                <span className="text-sm font-bold text-white mb-2">Minimalistisch Clean</span>
                <p className="text-[10px] text-slate-400 leading-normal mb-4">Dezente weiße Akzente, hochauflösendes Milchglas (Glassmorphic) und simple Icons.</p>
                <div className="mt-auto flex items-center gap-1.5 text-[9px] font-bold text-white">
                  {settings.style === 'minimal' ? <Check size={12} /> : null}
                  {settings.style === 'minimal' ? 'Ausgewählt' : 'Aktivieren'}
                </div>
              </button>
            </div>
          </div>

        </div>


        {/* Right column: HUD details, size/scaling */}
        <div className="space-y-6">
          {/* Zoom and Scaling */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-xs font-bold text-foreground uppercase tracking-widest mb-6">Widgets anordnen & einblenden</h2>

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Overlay Zoom</span>
                  <span className="font-bold text-foreground tabular-nums">{settings.zoom}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={settings.zoom}
                  onChange={e => updateSetting('zoom', Number(e.target.value))}
                  className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
                  <span>50%</span>
                  <span>100%</span>
                  <span>150%</span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-white/5">
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
                <div className="flex justify-between text-[9px] text-slate-500 font-bold uppercase">
                  <span>10% (Transparent)</span>
                  <span>100% (Solid)</span>
                </div>
              </div>
            </div>
          </div>

          {/* HUD Details Customization */}
          <div className="glass-card hover-glow">
            <h2 className="font-unbounded text-xs font-bold text-foreground uppercase tracking-widest mb-6">HUD Details</h2>
            <p className="text-[10px] text-slate-500 mb-6 uppercase tracking-wider leading-relaxed">
              Wähle aus, welche Telemetriedaten auf dem Hauptwidget angezeigt werden:
            </p>

            <div className="space-y-3.5">
              {[
                { key: 'showSpeed', label: 'Geschwindigkeit' },
                { key: 'showGear', label: 'Gang-Anzeige' },
                { key: 'showFuel', label: 'Tank & Reichweite' },
                { key: 'showRemainingDistance', label: 'Rest-Kilometer' },
                { key: 'showETA', label: 'Ankunftszeit (ETA)' },
                { key: 'showCargo', label: 'Fracht & Gewicht' },
                { key: 'showIncome', label: 'Fracht-Einnahmen' }
              ].map(item => {
                const active = settings[item.key as keyof OverlaySettingsType] as boolean;
                return (
                  <label
                    key={item.key}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <span className="text-xs text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => updateSetting(item.key as any, !active)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-primary/5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white peer-checked:after:border-white" />
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlaySettings;
