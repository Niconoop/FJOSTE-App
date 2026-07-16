import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Trash2, Loader2 } from 'lucide-react';
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

const InviteCodes = () => {
  const { token } = useAuth();
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const h = { Authorization: `Bearer ${token}` };

  const loadCodes = async () => {
    try {
      const r = await axios.get(`${API}/management/invite-codes`, { headers: h });
      setCodes(r.data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { loadCodes(); }, [token]);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const r = await axios.post(`${API}/management/invite-codes`, {}, { headers: h });
      toast.success(`Code erstellt: ${r.data.code}`);
      loadCodes();
    } catch { toast.error("Fehler beim Generieren"); }
    finally { setGenerating(false); }
  };

  const deleteCode = async (code: string) => {
    try {
      await axios.delete(`${API}/management/invite-codes/${code}`, { headers: h });
      toast.success("Code gelöscht");
      loadCodes();
    } catch { toast.error("Fehler"); }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h1 className="font-unbounded text-2xl font-bold text-amber-400 uppercase tracking-tight italic">Einladungscodes</h1>
        </div>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Generiere Codes für neue Mitglieder.</p>
      </div>

      <div className="frosted-card p-8 backdrop-blur-xl shadow-xl border-2 border-[#f59e0b]/20 bg-[#000000]">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-1 h-4 bg-amber-400 rounded-full" />
              <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest leading-none">Aktive Codes</h2>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">Jeder Code kann einmal von einem neuen Mitglied eingelöst werden.</p>
          </div>
          <button onClick={generateCode} disabled={generating} className="bg-amber-400 hover:bg-amber-500 text-black px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover-glow shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            {generating ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
            Neuer Code
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="backdrop-blur-xl bg-black/70 border-2 border-[#f59e0b]/20 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5" />
                  <div className="space-y-2">
                    <div className="h-4 bg-white/5 rounded w-28" />
                    <div className="h-3 bg-white/5 rounded w-20" />
                  </div>
                </div>
                <div className="w-8 h-8 rounded-lg bg-white/5" />
              </div>
            ))}
          </div>
        ) : codes.length === 0 ? (
          <div className="text-center py-12 opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-widest">Keine Einladungscodes vorhanden</p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.04 } } }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {codes.map(c => (
              <motion.div key={c.code} variants={itemVariants} className="backdrop-blur-xl bg-black/70 border-2 border-[#f59e0b]/20 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/60 transition-all hover-glow">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.used ? "bg-black/60" : "bg-primary/10 shadow-[0_0_15px_rgba(245, 158, 11,0.1)]"}`}>
                    <Key size={18} className={c.used ? "text-slate-600" : "text-primary"} />
                  </div>
                  <div>
                    <p className={`font-mono text-lg font-black tracking-widest ${c.used ? "text-slate-600 line-through" : "text-white"}`}>{c.code}</p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.used ? `Verwendet von ${c.used_by_name || 'unbekannt'}` : "Offen & Bereit"}</p>
                  </div>
                </div>
                {!c.used && <button onClick={() => deleteCode(c.code)} className="p-2 text-slate-700 hover:text-red-500 transition-all"><Trash2 size={16} /></button>}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default InviteCodes;
