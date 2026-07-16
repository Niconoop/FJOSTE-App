import React, { useState, useEffect } from 'react';
import { Bot, Play, Square, Settings, Key, Clock, MessageSquare, Plus, Trash2, ShieldAlert, Volume2, VolumeX, Truck, Coffee } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const AfkBot = () => {
  const [running, setRunning] = useState(false);
  const [hotkey, setHotkey] = useState(() => localStorage.getItem('afk_hotkey') || 'F9');
  const [intervalSec, setIntervalSec] = useState(() => Number(localStorage.getItem('afk_interval')) || 60);
  const [activeTab, setActiveTab] = useState<'driving' | 'paused'>('driving');
  const [drivingTexts, setDrivingTexts] = useState<string[]>(() => {
    const saved = localStorage.getItem('afk_driving_texts');
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    const single = localStorage.getItem('afk_driving_text');
    if (single) return [single];
    return ['Fahre...', 'Auf Achse!', 'Immer weiter...'];
  });
  const [pausedTexts, setPausedTexts] = useState<string[]>(() => {
    const saved = localStorage.getItem('afk_paused_texts');
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    const single = localStorage.getItem('afk_paused_text');
    if (single) return [single];
    return ['Bin kurz AFK', 'Pause...', '/fix'];
  });
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('afk_sound_enabled') !== 'false');
  const [newText, setNewText] = useState('');

  useEffect(() => {
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
    const trimmedText = newText.trim();
    if (!trimmedText) return;

    if (trimmedText.length > 200) {
      toast.error("Die Nachricht darf maximal 200 Zeichen lang sein.");
      return;
    }

    if (activeTab === 'driving') {
      setDrivingTexts([...drivingTexts, trimmedText]);
    } else {
      setPausedTexts([...pausedTexts, trimmedText]);
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
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
      <div className="text-center mb-12">
        <span className="overline text-amber-400 mb-2 inline-block">Automatisierung</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white mt-2 flex items-center justify-center gap-3">
          <Bot className="text-amber-400" size={40} />
          Anti-AFK Bot
        </h1>
        <p className="text-zinc-400 text-sm mt-3">
          Automatische Chat-Nachrichten für ETS2 & TruckersMP
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* Left sidebar: Status + Hinweis */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
          <div className="frosted-card flex flex-col items-center text-center p-8 border border-white/5 bg-[#000000] border-2 border-[#f59e0b]/20">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${running ? 'bg-amber-400/20 text-amber-400 shadow-amber-400/30 animate-pulse' : 'bg-white/5 text-slate-500'}`}>
              <Bot size={48} />
            </div>
            <h2 className="font-unbounded font-black text-lg text-white uppercase italic tracking-widest mb-2">
              Status
            </h2>
            <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border mb-8 ${running ? 'bg-amber-400/10 border-amber-400/30 text-amber-400' : 'bg-zinc-900 border border-white/5 text-slate-400'}`}>
              {running ? 'Aktiviert' : 'Deaktiviert'}
            </span>

            <button
              onClick={toggleBot}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${running ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_30px_rgba(245,158,11,0.3)]' : 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]'}`}
            >
              {running ? <Square size={16} /> : <Play size={16} />}
              {running ? 'Bot Stoppen' : 'Bot Starten'}
            </button>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
            <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={16} />
            <p className="text-[10px] text-amber-200/70 leading-relaxed font-medium">
              Der Bot prüft vor jedem Senden, ob <b>Euro Truck Simulator 2</b> oder <b>TruckersMP</b> das aktive Fenster im Vordergrund ist.
              Ist dies nicht der Fall, wird der Tastendruck blockiert, um versehentliches Tippen in anderen Programmen zu verhindern!
            </p>
          </div>
        </div>

        {/* Right main: Configuration + Nachrichten-Pools */}
        <div className="lg:col-span-8 space-y-6">
          <div className="frosted-card space-y-8 border border-white/5 bg-[#000000] border-2 border-[#f59e0b]/20 p-6 md:p-8">
            <div className="flex items-center gap-2 border-b border-white/5 pb-4">
              <Settings size={18} className="text-amber-400" />
              <h2 className="font-unbounded font-bold text-sm text-white uppercase italic tracking-widest">
                Konfiguration
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Key size={11} className="text-amber-400/60" /> Hotkey
                </label>
                <div className="relative group">
                  <div className="relative">
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

                        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

                        let key = e.key;
                        if (key === ' ') key = 'Space';
                        if (key.length === 1) key = key.toUpperCase();

                        keys.push(key);
                        const newHotkey = keys.join('+');
                        setHotkey(newHotkey);
                      }}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-amber-400 text-center cursor-pointer focus:border-amber-400/40 outline-none transition-all duration-300"
                      placeholder="Taste drücken..."
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                      <Key size={14} className="text-slate-400" />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">Klicke in das Feld und drücke die gewünschte Taste (z.B. F9, F12 oder Strg+K).</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock size={11} className="text-amber-400/60" /> Intervall (Sekunden)
                </label>
                <input
                  type="number"
                  min="5"
                  value={intervalSec}
                  onChange={e => setIntervalSec(Number(e.target.value))}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-400/40 outline-none transition-all duration-300"
                />
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">Zeit zwischen zwei Nachrichten.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Volume2 size={11} className="text-amber-400/60" /> Sounds
                </label>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${soundEnabled ? 'bg-white/[0.03] border-amber-400/30 hover:bg-white/[0.05]' : 'bg-white/[0.02] border-white/10 opacity-60 hover:opacity-100'}`}
                >
                  {soundEnabled ? <Volume2 size={18} className="text-amber-400" /> : <VolumeX size={18} className="text-slate-500" />}
                  <div className="text-left">
                    <p className={`text-sm font-bold ${soundEnabled ? 'text-white' : 'text-slate-500'}`}>
                      {soundEnabled ? 'Aktiviert' : 'Deaktiviert'}
                    </p>
                  </div>
                </button>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-2">Start-/Stop Sounds abspielen.</p>
              </div>
            </div>
          </div>

          <div className="frosted-card space-y-4 border border-white/5 bg-[#000000] border-2 border-[#f59e0b]/20 p-6 md:p-8">
            <div className="flex items-center gap-2 pb-2">
              <MessageSquare size={16} className="text-amber-400" />
              <h3 className="font-unbounded font-bold text-xs text-white uppercase italic tracking-widest">
                Nachrichten-Pools
              </h3>
            </div>

            {/* Tabs */}
            <div className="flex bg-[#0b0b0c] p-1.5 rounded-full border border-zinc-900">
              <button
                type="button"
                onClick={() => setActiveTab('driving')}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'driving' ? 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-[#050507] shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                <Truck size={12} />
                Aktiv (Fahrt)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('paused')}
                className={`flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'paused' ? 'bg-gradient-to-r from-[#f59e0b] to-[#fbbf24] text-[#050507] shadow-md' : 'text-zinc-400 hover:text-white'}`}
              >
                <Coffee size={12} />
                Inaktiv (Stand {'>='} 2 Min.)
              </button>
            </div>

            <p className="text-[10px] text-zinc-400 font-medium">
              {activeTab === 'driving'
                ? 'Der Bot wählt zufällig eine dieser Nachrichten aus, wenn du fährst oder dich vor weniger als 2 Min. bewegt hast.'
                : 'Der Bot wählt zufällig eine dieser Nachrichten aus, wenn du dich seit mindestens 2 Min. (120 Sek.) nicht bewegt hast.'}
            </p>

            <div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newText}
                  maxLength={200}
                  onChange={e => setNewText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addText()}
                  className="flex-1 bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300"
                  placeholder={activeTab === 'driving' ? "Neue Aktiv-Nachricht..." : "Neue Inaktiv-Nachricht..."}
                />
                <button
                  onClick={addText}
                  disabled={!newText.trim() || newText.length > 200}
                  className="bg-amber-400/20 text-amber-400 border border-amber-400/30 px-4 rounded-xl hover:bg-amber-400 hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-amber-400/20 disabled:hover:text-amber-400"
                >
                  <Plus size={18} />
                </button>
              </div>
              <p className={`text-right text-[10px] mt-1.5 pr-2 font-bold uppercase tracking-widest ${newText.length > 200 ? 'text-red-500' : 'text-slate-500'}`}>
                {newText.length} / 200
              </p>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-2 no-scrollbar">
              {currentTexts.map((t, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-3 rounded-xl group hover:border-white/10 transition-all">
                  <span className="text-sm font-medium text-zinc-300">{t}</span>
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
        </div>
      </div>
    </div>
  );
};

export default AfkBot;
