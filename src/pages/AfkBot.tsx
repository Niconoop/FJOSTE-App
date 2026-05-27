import React, { useState, useEffect } from 'react';
import { Bot, Play, Square, Settings, Key, Clock, MessageSquare, Plus, Trash2, ShieldAlert, Volume2, VolumeX, Truck, Coffee } from 'lucide-react';
import { toast } from 'sonner';

const AfkBot = () => {
  const [running, setRunning] = useState(false);
  const [hotkey, setHotkey] = useState(() => localStorage.getItem('afk_hotkey') || 'F9');
  const [intervalSec, setIntervalSec] = useState(() => Number(localStorage.getItem('afk_interval')) || 60);
  const [activeTab, setActiveTab] = useState<'driving' | 'paused'>('driving');
  const [drivingTexts, setDrivingTexts] = useState<string[]>(() => {
    const saved = localStorage.getItem('afk_driving_texts');
    if (saved) return JSON.parse(saved);
    const old = localStorage.getItem('afk_texts');
    return old ? JSON.parse(old) : ['Fahre...', 'Auf Achse!', 'Immer weiter...'];
  });
  const [pausedTexts, setPausedTexts] = useState<string[]>(() => {
    const saved = localStorage.getItem('afk_paused_texts');
    if (saved) return JSON.parse(saved);
    const old = localStorage.getItem('afk_texts');
    return old ? JSON.parse(old) : ['Bin kurz AFK', 'Pause...', '/fix'];
  });
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('afk_sound_enabled') !== 'false');
  const [newText, setNewText] = useState('');

  useEffect(() => {
    // Save settings to localStorage
    localStorage.setItem('afk_hotkey', hotkey);
    localStorage.setItem('afk_interval', intervalSec.toString());
    localStorage.setItem('afk_driving_texts', JSON.stringify(drivingTexts));
    localStorage.setItem('afk_paused_texts', JSON.stringify(pausedTexts));
    localStorage.setItem('afk_sound_enabled', soundEnabled.toString());

    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    if (ipc) {
      ipc.send('afk-configure', {
        interval: intervalSec * 1000,
        drivingTexts: drivingTexts,
        pausedTexts: pausedTexts,
        hotkey: hotkey
      });

      const handleStatusChange = (_e: any, status: boolean) => {
        setRunning(status);
        if (status) toast.success("ANTI-AFK Bot gestartet!");
        else toast.info("ANTI-AFK Bot gestoppt.");
      };

      ipc.on('afk-status-changed', handleStatusChange);
      ipc.invoke('afk-status').then(setRunning);

      return () => ipc.removeListener('afk-status-changed', handleStatusChange);
    }
  }, [intervalSec, drivingTexts, pausedTexts, hotkey, soundEnabled]);

  const toggleBot = () => {
    const ipc = window.require ? window.require('electron').ipcRenderer : null;
    ipc?.send('afk-toggle');
  };

  const addText = () => {
    if (!newText.trim()) return;
    if (activeTab === 'driving') {
      setDrivingTexts([...drivingTexts, newText.trim()]);
    } else {
      setPausedTexts([...pausedTexts, newText.trim()]);
    }
    setNewText('');
  };

  const removeText = (idx: number) => {
    if (activeTab === 'driving') {
      setDrivingTexts(drivingTexts.filter((_, i) => i !== idx));
    } else {
      setPausedTexts(pausedTexts.filter((_, i) => i !== idx));
    }
  };

  const currentTexts = activeTab === 'driving' ? drivingTexts : pausedTexts;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div>
        <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight italic flex items-center gap-3">
          <Bot className="text-primary" size={28} />
          Anti-AFK Bot
        </h1>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">
          Automatische Chat-Nachrichten für ETS2 & TruckersMP
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Status Card */}
        <div className="glass-card md:col-span-1 flex flex-col items-center justify-center text-center p-8 border-primary/20">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${running ? 'bg-primary/20 text-primary shadow-primary/30 animate-pulse' : 'bg-white/5 text-slate-500'}`}>
            <Bot size={48} />
          </div>
          <h2 className="font-unbounded font-black text-lg text-white uppercase italic tracking-widest mb-2">
            Status
          </h2>
          <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-8 ${running ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-black border-white/10 text-slate-400'}`}>
            {running ? 'Aktiviert' : 'Deaktiviert'}
          </span>

          <button
            onClick={toggleBot}
            className={`w-full py-4 rounded-xl font-black uppercase italic tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${running ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:bg-red-400' : 'bg-primary text-black shadow-[0_0_20px_rgba(43,161,185,0.4)] hover:bg-white'}`}
          >
            {running ? <Square size={16} /> : <Play size={16} />}
            {running ? 'Bot Stoppen' : 'Bot Starten'}
          </button>
        </div>

        {/* Configuration */}
        <div className="glass-card md:col-span-2 space-y-8">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Settings size={18} className="text-primary" />
            <h2 className="font-unbounded font-bold text-sm text-white uppercase italic tracking-widest">
              Konfiguration
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Key size={12} /> Hotkey (Klicken zum Ändern)
              </label>
              <div className="relative group">
                <input
                  type="text"
                  readOnly
                  value={hotkey}
                  onKeyDown={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const keys = [];
                    if (e.ctrlKey || e.metaKey) keys.push('CommandOrControl');
                    if (e.shiftKey) keys.push('Shift');
                    if (e.altKey) keys.push('Alt');
                    
                    // Ignore modifier-only presses
                    if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
                    
                    let key = e.key;
                    // Handle function keys and other special keys
                    if (key === ' ') key = 'Space';
                    if (key.length === 1) key = key.toUpperCase();
                    
                    keys.push(key);
                    const newHotkey = keys.join('+');
                    setHotkey(newHotkey);
                  }}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-black text-primary text-center cursor-pointer focus:border-primary/50 focus:ring-2 focus:ring-primary/10 outline-none transition-all"
                  placeholder="Taste drücken..."
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                  <Key size={14} className="text-slate-400" />
                </div>
              </div>
              <p className="text-[9px] text-slate-600">Klicke in das Feld und drücke die gewünschte Taste (z.B. F9, F12 oder Strg+K).</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Clock size={12} /> Intervall (Sekunden)
              </label>
              <input
                type="number"
                min="5"
                value={intervalSec}
                onChange={e => setIntervalSec(Number(e.target.value))}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:border-primary/50 outline-none"
              />
              <p className="text-[9px] text-slate-600">Zeit zwischen zwei Nachrichten.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Volume2 size={12} /> Sounds
              </label>
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${soundEnabled ? 'bg-primary/10 border-primary/30 hover:bg-primary/20' : 'bg-black border-white/10 opacity-60 hover:opacity-100'}`}
              >
                {soundEnabled ? <Volume2 size={18} className="text-primary" /> : <VolumeX size={18} className="text-slate-500" />}
                <div className="text-left">
                  <p className={`text-xs font-black uppercase tracking-tight ${soundEnabled ? 'text-white' : 'text-slate-500'}`}>
                    {soundEnabled ? 'Aktiviert' : 'Deaktiviert'}
                  </p>
                </div>
              </button>
              <p className="text-[9px] text-slate-600">Start-/Stop Sounds abspielen.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <MessageSquare size={12} /> Nachrichten-Pools
              </label>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('driving')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'driving' ? 'bg-primary text-black shadow-lg shadow-primary/10' : 'text-slate-400 hover:text-white'}`}
              >
                <Truck size={12} />
                Beim Fahren
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paused')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'paused' ? 'bg-primary text-black shadow-lg shadow-primary/10' : 'text-slate-400 hover:text-white'}`}
              >
                <Coffee size={12} />
                Pause / Stand
              </button>
            </div>

            <p className="text-[10px] text-slate-400">
              {activeTab === 'driving' 
                ? 'Der Bot wählt zufällig eine dieser Nachrichten aus, wenn du fährst (Geschwindigkeit > 1 km/h).' 
                : 'Der Bot wählt zufällig eine dieser Nachrichten aus, wenn dein Lkw steht oder das Spiel pausiert ist.'}
            </p>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addText()}
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none"
                placeholder={activeTab === 'driving' ? "Neue Fahr-Nachricht..." : "Neue Stand-Nachricht..."}
              />
              <button onClick={addText} className="bg-primary/20 text-primary border border-primary/30 px-4 rounded-xl hover:bg-primary hover:text-black transition-all">
                <Plus size={18} />
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {currentTexts.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between bg-black/40 border border-white/5 p-3 rounded-xl group hover:border-white/10 transition-colors">
                  <span className="text-sm font-medium text-slate-300">{t}</span>
                  <button onClick={() => removeText(idx)} className="text-slate-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              {currentTexts.length === 0 && (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  Keine Nachrichten definiert.
                </div>
              )}
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-amber-200/70 leading-relaxed font-medium">
              Der Bot prüft vor jedem Senden, ob <b>Euro Truck Simulator 2</b> oder <b>TruckersMP</b> das aktive Fenster im Vordergrund ist.
              Ist dies nicht der Fall, wird der Tastendruck blockiert, um versehentliches Tippen in anderen Programmen zu verhindern!
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AfkBot;
