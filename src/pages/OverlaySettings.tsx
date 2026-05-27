import { useState, useEffect } from 'react';
import { Monitor, Lock, Unlock, Play, Square, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const OverlaySettings = () => {
  const [isActive, setIsActive] = useState(false);
  const [rpcActive, setRpcActive] = useState(true);
  const [settings, setSettings] = useState({
    showSpeed: true,
    showFuel: true,
    showLimit: true,
    showDamage: true,
    showRest: true,
    showGear: true,
    showCargo: true,
    showArrival: true,
    showDrivers: true,
    driversPosition: 'top-right',
    opacity: 100
  });

  useEffect(() => {
    const { ipcRenderer } = window.require('electron');
    ipcRenderer.invoke('overlay-status').then(setIsActive);
    ipcRenderer.invoke('get-overlay-settings').then(setSettings);

    const statusListener = (_: any, active: boolean) => setIsActive(active);
    const settingsListener = (_: any, s: any) => setSettings(s);

    const rpcListener = (_: any, active: boolean) => setRpcActive(active);

    ipcRenderer.on('overlay-status-changed', statusListener);
    ipcRenderer.on('overlay-settings-changed', settingsListener);
    ipcRenderer.on('rpc-status', rpcListener);
    ipcRenderer.send('rpc-get-status');

    return () => {
      ipcRenderer.removeListener('overlay-status-changed', statusListener);
      ipcRenderer.removeListener('overlay-settings-changed', settingsListener);
      ipcRenderer.removeListener('rpc-status', rpcListener);
    };
  }, []);

  const toggleOverlay = () => {
    window.require('electron').ipcRenderer.send('toggle-overlay');
  };

  const updateSetting = (key: string, value: any) => {
    let newSettings = { ...settings, [key]: value } as any;
    
    // Prevent same position: swap if they collide
    if (key === 'position' && value === (settings as any).driversPosition) {
      newSettings.driversPosition = (settings as any).position || 'top-right';
    } else if (key === 'driversPosition' && value === (settings as any).position) {
      newSettings.position = (settings as any).driversPosition || 'top-left';
    }

    setSettings(newSettings);
    window.require('electron').ipcRenderer.send('update-overlay-settings', newSettings);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight">Ingame Overlay</h1>
        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest bg-black/40 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2">
          <Monitor size={12} />
          Overlay System
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Links: Status & Position */}
        <div className="space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-xl">
            <div className="flex items-center gap-4 mb-8">
              <div className={`p-4 rounded-[20px] ${isActive ? 'bg-primary/20 text-primary' : 'bg-slate-800 text-slate-500'} transition-all`}>
                <Monitor size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Status & Steuerung</h2>
                <p className="text-sm text-slate-400 mt-1">Verwalte dein Ingame Overlay und Discord RPC</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Overlay anzeigen</p>
                  <p className="text-[11px] text-slate-500">Blendet das HUD im Spiel ein</p>
                </div>
                <button
                  onClick={toggleOverlay}
                  className={`switch-toggle w-12 h-6 rounded-full transition-all relative ${isActive ? 'bg-primary' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${isActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>


              <div className="p-4 rounded-2xl bg-black/20 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">Discord RPC</p>
                  <p className="text-[11px] text-slate-500">Status in Discord anzeigen</p>
                </div>
                <button
                  onClick={() => {
                    const next = !rpcActive;
                    window.require('electron').ipcRenderer.send('rpc-toggle', next);
                    setRpcActive(next);
                  }}
                  className={`switch-toggle w-12 h-6 rounded-full transition-all relative ${rpcActive ? 'bg-primary' : 'bg-slate-800'}`}
                >
                  <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${rpcActive ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Transparenz</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deckkraft</span>
                <span className="text-sm font-black text-primary">{(settings as any).opacity || 100}%</span>
              </div>
              <input
                type="range"
                min="20"
                max="100"
                step="5"
                value={(settings as any).opacity || 100}
                onChange={(e) => updateSetting('opacity', parseInt(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">HUD Position</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'top-left', name: 'Oben L' },
                { id: 'top-center', name: 'Oben M' },
                { id: 'top-right', name: 'Oben R' },
                { id: 'bottom-left', name: 'Unten L' },
                { id: 'bottom-center', name: 'Unten M' },
                { id: 'bottom-right', name: 'Unten R' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => updateSetting('position', pos.id)}
                  className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${(settings as any).position === pos.id
                    ? 'bg-primary/20 border-primary/50 text-primary'
                    : (settings as any).driversPosition === pos.id ? 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-30' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20'
                    }`}
                >
                  {pos.name}
                </button>
              ))}
            </div>
          </div>

          {settings.showDrivers && (
            <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-xl">
              <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Fahrerliste Position</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'top-left', name: 'Oben L' },
                  { id: 'top-center', name: 'Oben M' },
                  { id: 'top-right', name: 'Oben R' },
                  { id: 'bottom-left', name: 'Unten L' },
                  { id: 'bottom-center', name: 'Unten M' },
                  { id: 'bottom-right', name: 'Unten R' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    onClick={() => updateSetting('driversPosition', pos.id)}
                    className={`p-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${(settings as any).driversPosition === pos.id
                      ? 'bg-primary/20 border-primary/50 text-primary'
                      : (settings as any).position === pos.id ? 'bg-white/5 border-white/10 text-white/20 cursor-not-allowed opacity-30' : 'bg-black/20 border-white/5 text-slate-500 hover:border-white/20'
                      }`}
                  >
                    {pos.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rechts: Layout & Sichtbarkeit */}
        <div className="space-y-6">
          <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">HUD Layout</h3>
            <div className="flex gap-4">
              {[
                { id: 'card', name: 'Kompakt', icon: Monitor },
                { id: 'horizontal', name: 'Horizontal', icon: Monitor },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateSetting('layout', item.id)}
                  className={`flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${(settings as any).layout === item.id
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-black/20 border-white/5 text-slate-500'
                    }`}
                >
                  <item.icon size={24} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{item.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-black/40 border border-white/5 rounded-[32px] p-8 backdrop-blur-xl shadow-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-widest mb-6">Sichtbare Elemente</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'showSpeed', name: 'Geschw.' },
                { id: 'showGear', name: 'Gang' },
                { id: 'showLimit', name: 'Limit' },
                { id: 'showFuel', name: 'Tank' },
                { id: 'showDamage', name: 'Schäden' },
                { id: 'showRest', name: 'Pause' },
                { id: 'showCargo', name: 'Fracht' },
                { id: 'showArrival', name: 'Ankunft' },
                { id: 'showDrivers', name: 'Fahrer' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateSetting(item.id, !settings[item.id as keyof typeof settings])}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${settings[item.id as keyof typeof settings]
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-black/20 border-white/5 text-slate-500'
                    }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-tight">{item.name}</span>
                  <div className={`w-3 h-3 rounded-full border-2 ${settings[item.id as keyof typeof settings] ? 'bg-primary border-primary' : 'border-slate-700'
                    }`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverlaySettings;
