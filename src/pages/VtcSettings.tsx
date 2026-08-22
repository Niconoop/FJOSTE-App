import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, ShieldCheck, ShieldOff, Save, RefreshCw, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

import { API_URL } from '../config';

const API = API_URL;

const itemVariants = {
  hidden: { opacity: 1, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 220,
      damping: 24
    }
  }
};

const VtcSettings = () => {
  const { token } = useAuth();
  const [vtcSettings, setVtcSettings] = useState<any>({
    name: "", motto: "", description: "", rules: "", discord: "", website: "", use_trucky_stats: false, about: "", requirements: ""
  });
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [savingVtc, setSavingVtc] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [syncingTrucky, setSyncingTrucky] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const safeGet = async (url: string) => {
      try { return (await axios.get(url, { headers: h })).data; }
      catch { return null; }
    };
    (async () => {
      const vtcData = await safeGet(`${API}/settings`);
      if (vtcData) {
        setVtcSettings((prev: any) => ({ ...prev, ...vtcData }));
        if (typeof vtcData.applications_open === 'boolean') {
          setApplicationsOpen(vtcData.applications_open);
        }
      }
    })();
  }, [token]);

  const saveVtcSettings = async () => {
    setSavingVtc(true);
    try {
      await axios.put(`${API}/settings`, vtcSettings, { headers: h });
      toast.success("VTC Einstellungen gespeichert");
    } catch { toast.error("Fehler beim Speichern"); }
    finally { setSavingVtc(false); }
  };

  const syncFromTrucky = async () => {
    setSyncingTrucky(true);
    try {
      const r = await axios.get(`${API}/settings`, { headers: h });
      if (r.data) setVtcSettings((prev: any) => ({ ...prev, ...r.data }));
      toast.success("Einstellungen neu geladen!");
    } catch { toast.error("Fehler beim Laden der Einstellungen"); }
    finally { setSyncingTrucky(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h1 className="font-unbounded text-2xl font-bold text-amber-400 uppercase tracking-tight italic">VTC Einstellungen</h1>
        </div>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Verwalte die globalen Einstellungen deiner VTC.</p>
      </div>

      <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="frosted-card p-8 backdrop-blur-xl shadow-xl space-y-8 hover-glow transition-all border-2 border-[#f59e0b]/20 bg-[#000000]">
        <div className="mb-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-amber-400 rounded-full" />
            <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest leading-none">Globale Optionen</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">Steuere die Sichtbarkeit und Datenquellen deiner Spedition.</p>
        </div>

        <motion.div variants={itemVariants} className="flex items-center justify-between p-6 backdrop-blur-xl bg-black/70 border-2 border-[#f59e0b]/20 rounded-3xl hover-glow transition-all">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${vtcSettings.use_trucky_stats ? "bg-primary/10 text-primary" : "bg-slate-500/10 text-slate-400"}`}>
              <BarChart3 size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-tight">Trucky Statistiken</p>
              <p className="text-xs text-slate-500 font-medium">{vtcSettings.use_trucky_stats ? "Daten werden von Trucky geladen." : "Eigene lokale Statistiken werden genutzt."}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              const next = !vtcSettings.use_trucky_stats;
              setVtcSettings({ ...vtcSettings, use_trucky_stats: next });
              try {
                await axios.put(`${API}/settings`, { ...vtcSettings, use_trucky_stats: next }, { headers: h });
                toast.success("Statistik-Modus geändert");
              } catch { toast.error("Fehler beim Speichern"); }
            }}
            className={`relative w-16 h-8 rounded-full transition-all duration-500 p-1 ${vtcSettings.use_trucky_stats ? "bg-primary text-black" : "bg-slate-700"}`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${vtcSettings.use_trucky_stats ? "translate-x-8" : "translate-x-0"}`} />
          </button>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center justify-between p-6 backdrop-blur-xl bg-black/70 border-2 border-[#f59e0b]/20 rounded-3xl hover-glow transition-all">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${applicationsOpen ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {applicationsOpen ? <ShieldCheck size={24} /> : <ShieldOff size={24} />}
            </div>
            <div>
              <p className="text-sm font-bold text-white uppercase tracking-tight">Öffentliche Bewerbungen</p>
              <p className="text-xs text-slate-500 font-medium">{applicationsOpen ? "Jeder kann sich aktuell bewerben." : "Bewerbungsphase aktuell geschlossen."}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              setToggling(true);
              try {
                const res = await axios.put(`${API}/settings/applications`, { open: !applicationsOpen }, { headers: h });
                setApplicationsOpen(res.data.open);
                toast.success(res.data.open ? "Bewerbungen geöffnet" : "Bewerbungen geschlossen");
              } catch { toast.error("Fehler"); }
              finally { setToggling(false); }
            }}
            disabled={toggling}
            className={`relative w-16 h-8 rounded-full transition-all duration-500 p-1 ${applicationsOpen ? "bg-emerald-500" : "bg-slate-700"} ${toggling ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-lg transition-transform duration-500 ${applicationsOpen ? "translate-x-8" : "translate-x-0"}`} />
          </button>
        </motion.div>

        {/* About & Requirements Inputs */}
        <motion.div variants={itemVariants} className="space-y-4 pt-6 border-t border-white/5">
          <h3 className="font-unbounded text-xs font-bold text-amber-400 uppercase tracking-widest">Inhalts-Overrides (Website & App)</h3>

          <button
            type="button"
            onClick={syncFromTrucky}
            disabled={syncingTrucky}
            className="w-full bg-black/40 hover:bg-black/60 text-primary py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-2 border-primary/20 hover-glow"
          >
            {syncingTrucky ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Daten von Trucky laden (Cache leeren)
          </button>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Über Uns (About Us)</label>
            <textarea
              value={vtcSettings.about || ""}
              onChange={e => setVtcSettings({ ...vtcSettings, about: e.target.value })}
              placeholder="Schreibe hier etwas über die Spedition..."
              className="w-full min-h-[120px] bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Voraussetzungen (Requirements - Eine pro Zeile)</label>
            <textarea
              value={vtcSettings.requirements || ""}
              onChange={e => setVtcSettings({ ...vtcSettings, requirements: e.target.value })}
              placeholder="z.B. Mindestalter 16 Jahre&#10;Aktivität auf Discord&#10;Freundliches Auftreten"
              className="w-full min-h-[120px] bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/50 outline-none transition-all"
            />
          </div>

          <button
            onClick={saveVtcSettings}
            disabled={savingVtc}
            className="w-full bg-primary hover:bg-primary/90 text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 hover-glow shadow-[0_0_20px_rgba(245, 158, 11,0.2)]"
          >
            {savingVtc ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            VTC Inhalts-Einstellungen Speichern
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default VtcSettings;
