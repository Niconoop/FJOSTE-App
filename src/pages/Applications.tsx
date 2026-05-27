import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, UserX, ChevronDown, MessageSquare, Loader2, Clock, User as UserIcon, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

import { API_URL } from '../config';

const API = API_URL;

const ApplicationCard = ({ app, onAction }: any) => {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(false);

  const statusColors: any = { 
    pending: "text-amber-400 bg-amber-500/15 border-amber-500/20", 
    accepted: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20", 
    rejected: "text-red-400 bg-red-500/15 border-red-500/20" 
  };

  const handle = async (action: string) => {
    setActing(true);
    try {
      await onAction(app.id, action, note);
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="glass-card !p-0 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full text-left p-5 flex items-center gap-4 hover:bg-black/60 transition-colors hover-glow"
      >
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <UserIcon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-base font-bold text-white tracking-tight">{app.name}</h3>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${statusColors[app.status] || statusColors.pending}`}>
              {app.status === "pending" ? "Offen" : app.status === "accepted" ? "Angenommen" : "Abgelehnt"}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1"><Clock size={12} /> {app.age} Jahre</span>
            <span className="flex items-center gap-1"><MessageSquare size={12} /> {app.discord_id}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Eingegangen</p>
            <p className="text-xs font-bold text-white">{new Date(app.created_at).toLocaleDateString("de-DE")}</p>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }} 
            animate={{ height: "auto", opacity: 1 }} 
            exit={{ height: 0, opacity: 0 }} 
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Name</p>
                  <p className="text-sm font-bold text-white">{app.name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Alter</p>
                  <p className="text-sm font-bold text-white">{app.age}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Discord</p>
                  <p className="text-sm font-bold text-white">{app.discord_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">TruckersMP</p>
                  <p className="text-sm font-bold text-white">{app.truckersmp_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">VTC Erfahrung</p>
                  <p className="text-sm font-bold text-white">{app.vtc_experience}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Spielstunden</p>
                  <p className="text-sm font-bold text-white">{app.play_hours}</p>
                </div>
              </div>

              <div className="bg-black/80 rounded-xl p-4 border border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Warum FJOSTE?</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{app.why_us}</p>
              </div>

              {app.status === "pending" && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <textarea 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    placeholder="Notiz (optional, wird bei Ablehnung an Discord gesendet)" 
                    className="w-full bg-black/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-primary/30 outline-none min-h-[80px]"
                  />
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handle("accept")} 
                      disabled={acting} 
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover-glow shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      {acting ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                      Annehmen
                    </button>
                    <button 
                      onClick={() => handle("reject")} 
                      disabled={acting} 
                      className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover-glow"
                    >
                      <UserX size={16} />
                      Ablehnen
                    </button>
                  </div>
                </div>
              )}

              {app.status !== "pending" && (
                <div className="bg-black/80 rounded-xl p-4 border border-white/10 space-y-3">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bearbeitet von</p>
                    <p className="text-sm font-bold text-white">{app.handled_by}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bearbeitungsdatum</p>
                    <p className="text-sm font-bold text-white">{new Date(app.handled_at).toLocaleString("de-DE")}</p>
                  </div>
                  {app.note && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Notiz</p>
                      <p className="text-sm text-slate-300">{app.note}</p>
                    </div>
                  )}
                  {app.invite_code && (
                    <div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Einladungscode</p>
                      <code className="font-mono text-sm font-bold text-primary">{app.invite_code}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Applications = () => {
  const { token } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const loadApps = async () => {
    try {
      const r = await axios.get(`${API}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setApps(Array.isArray(r.data) ? r.data : []);
    } catch {} 
    finally { setLoading(false); }
  };

  useEffect(() => { loadApps(); }, [token]);

  const handleAction = async (id: string, action: string, note: string) => {
    try {
      await axios.put(`${API}/applications/${id}`, { action, note }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(action === "accept" ? "Bewerbung angenommen" : "Bewerbung abgelehnt");
      loadApps();
    } catch { toast.error("Fehler"); }
  };

  const filtered = apps.filter(a => filter === "all" || a.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "all", label: `Alle (${apps.length})` },
          { id: "pending", label: `Offen (${apps.filter(a => a.status === "pending").length})` },
          { id: "accepted", label: `Angenommen (${apps.filter(a => a.status === "accepted").length})` },
          { id: "rejected", label: `Abgelehnt (${apps.filter(a => a.status === "rejected").length})` }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover-glow ${filter === f.id ? "bg-primary text-black" : "bg-black text-slate-500 hover:text-white"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-black/60 rounded-2xl animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-widest">Keine Bewerbungen</p>
          </div>
        ) : filtered.map(app => (
          <ApplicationCard key={app.id} app={app} onAction={handleAction} />
        ))}
      </div>
    </div>
  );
};

export default Applications;
