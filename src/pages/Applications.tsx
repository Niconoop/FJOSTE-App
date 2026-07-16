import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserCheck, UserX, ChevronDown, MessageSquare, Loader2, Clock, User as UserIcon, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import axios from 'axios';

import { API_URL } from '../config';

const API = API_URL;

const staggerChild = {
  hidden: { opacity: 1, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 20 } }
};

const InfoItem = ({ label, value }: any) => (
  <div>
    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-sm font-bold text-white">{value || "N/A"}</p>
  </div>
);

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
    <motion.div variants={staggerChild} className="frosted-card !p-0 overflow-hidden border border-white/5 shadow-xl bg-[#000000] border-2 border-[#f59e0b]/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-5 flex items-center gap-4 hover:bg-white/[0.02] transition-colors hover-glow"
      >
        <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
          <UserIcon className="w-6 h-6 text-amber-400" />
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
            {app.truckersmp_info && <span className="flex items-center gap-1 text-amber-400/70"><UserIcon size={12} /> TMP</span>}
            {app.trucklinemp_info && <span className="flex items-center gap-1 text-amber-400/70"><UserIcon size={12} /> TLMP</span>}
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
                <InfoItem label="Name" value={app.name} />
                <InfoItem label="Alter" value={app.age} />
                <InfoItem label="Discord" value={app.discord_id} />
                <InfoItem label="Steam ID" value={app.steam_id} />
                <InfoItem label="VTC Erfahrung" value={app.vtc_experience} />
                <InfoItem label="Spielstunden" value={app.play_hours} />
              </div>

              {(app.truckersmp_info || app.trucklinemp_info) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  {/* TruckersMP Info */}
                  {app.truckersmp_info && (
                    <div className="bg-black/50 rounded-xl p-4 border border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          {app.truckersmp_info.avatar && (
                            <img src={app.truckersmp_info.avatar} alt="TMP Avatar" className="w-10 h-10 rounded-lg border border-white/10 shrink-0" />
                          )}
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest select-none">TruckersMP Info</p>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Name</span>
                            <span className="text-white font-extrabold">{app.truckersmp_info.name || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">ID</span>
                            <span className="text-white font-extrabold">{app.truckersmp_info.id || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Rang</span>
                            <span className="text-white font-extrabold" style={{ color: app.truckersmp_info.groupColor }}>
                              {app.truckersmp_info.groupName || "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Registriert seit</span>
                            <span className="text-white font-extrabold">
                              {app.truckersmp_info.joinDate ? new Date(app.truckersmp_info.joinDate).toLocaleDateString("de-DE") : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Aktuelle Spedition</span>
                            <span className="text-white font-extrabold">
                              {app.truckersmp_info.vtc?.name || "Keine"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Banns</span>
                            <span className={`font-extrabold ${app.truckersmp_info.banned ? "text-red-400" : "text-emerald-400"}`}>
                              {app.truckersmp_info.banned ? `JA (Aktiv)` : `NEIN (${app.truckersmp_info.bansCount || 0} Bans gesamt)`}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Patreon</span>
                            <span className="text-white font-extrabold">
                              {app.truckersmp_info.patreon?.isPatron ? "JA (Aktiv)" : "NEIN"}
                            </span>
                          </div>
                        </div>

                        {/* VTC Verlauf */}
                        {app.truckersmp_info.vtcHistory && app.truckersmp_info.vtcHistory.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">VTC Verlauf (TruckersMP)</p>
                            <div className="space-y-1 text-[11px] max-h-24 overflow-y-auto pr-1">
                              {app.truckersmp_info.vtcHistory.map((h: any, i: number) => (
                                <div key={i} className="flex justify-between text-slate-400">
                                  <span className="font-semibold">{h.name}</span>
                                  <span className="text-slate-600 text-[10px]">
                                    {h.joinDate ? new Date(h.joinDate).toLocaleDateString("de-DE") : "N/A"} - {h.leftDate ? new Date(h.leftDate).toLocaleDateString("de-DE") : "Heute"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Achievements */}
                      {app.truckersmp_info.achievements && app.truckersmp_info.achievements.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Achievements ({app.truckersmp_info.achievements.length})</p>
                          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                            {app.truckersmp_info.achievements.map((ach: any, i: number) => (
                              <span key={i} className="text-[10px] bg-white/5 border border-white/10 text-slate-400 px-1.5 py-0.5 rounded font-medium" title={ach.description}>
                                {ach.title}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Truckline MP Info */}
                  {app.trucklinemp_info && (
                    <div className="bg-black/50 rounded-xl p-4 border border-white/5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-3 mb-4">
                          {app.trucklinemp_info.user?.image && (
                            <img src={app.trucklinemp_info.user.image} alt="TLMP Avatar" className="w-10 h-10 rounded-lg border border-white/10 shrink-0" />
                          )}
                          <p className="text-xs font-black text-amber-400 uppercase tracking-widest select-none">Truckline MP Info</p>
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Name</span>
                            <span className="text-white font-extrabold">{app.trucklinemp_info.user?.name || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">ID</span>
                            <span className="text-white font-extrabold">{app.trucklinemp_info.user?.webId || "N/A"}</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Rang</span>
                            <span className="text-white font-extrabold">
                              {app.trucklinemp_info.user?.staffRoles?.[0]?.name || "Spieler"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Registriert seit</span>
                            <span className="text-white font-extrabold">
                              {app.trucklinemp_info.user?.createdAt ? new Date(app.trucklinemp_info.user.createdAt).toLocaleDateString("de-DE") : "N/A"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Aktuelle Spedition</span>
                            <span className="text-white font-extrabold">
                              {app.trucklinemp_info.user?.vtc?.name || "Keine"}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Banns</span>
                            <span className="text-white font-extrabold">NEIN</span>
                          </div>
                          <div className="flex justify-between border-b border-white/5 pb-1">
                            <span className="text-slate-500 font-bold uppercase">Patreon</span>
                            <span className="text-white font-extrabold">NEIN</span>
                          </div>
                        </div>
                      </div>

                      {/* System Rollen / Staff Roles */}
                      {app.trucklinemp_info.user?.staffRoles && app.trucklinemp_info.user.staffRoles.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">System Rollen</p>
                          <div className="flex flex-wrap gap-1">
                            {app.trucklinemp_info.user.staffRoles.map((role: any, i: number) => (
                              <span key={i} className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider text-white shadow-sm" style={{ backgroundColor: role.color || '#3f3f46' }}>
                                {role.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Warum Open Pipe Club?</p>
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{app.why_us}</p>
              </div>

              {app.status === "pending" && (
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Notiz (optional, wird bei Ablehnung an Discord gesendet)"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 outline-none transition-all duration-300 min-h-[80px]"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handle("accept")}
                      disabled={acting}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover-glow shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                    >
                      {acting ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                      Annehmen
                    </button>
                    <button
                      onClick={() => handle("reject")}
                      disabled={acting}
                      className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2 hover-glow"
                    >
                      <UserX size={16} />
                      Ablehnen
                    </button>
                  </div>
                </div>
              )}

              {app.status !== "pending" && (
                <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 space-y-3">
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
    </motion.div>
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
    } catch { }
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h1 className="font-unbounded text-2xl font-bold text-amber-400 uppercase tracking-tight italic">Bewerbungen</h1>
        </div>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Verwalte die Bewerbungen neuer Fahrer für dein VTC.</p>
      </div>

      <div className="flex items-center gap-1 bg-black/40 backdrop-blur-xl p-1 rounded-xl border-2 border-[#f59e0b]/20 w-fit">
        {[
          { id: "all", label: `Alle (${apps.length})` },
          { id: "pending", label: `Offen (${apps.filter(a => a.status === "pending").length})` },
          { id: "accepted", label: `Angenommen (${apps.filter(a => a.status === "accepted").length})` },
          { id: "rejected", label: `Abgelehnt (${apps.filter(a => a.status === "rejected").length})` }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 hover-glow ${filter === f.id ? "bg-primary text-black shadow-md" : "text-slate-400 hover:text-white"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
        className="space-y-4"
      >
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="frosted-card !p-0 overflow-hidden border-2 border-[#f59e0b]/20 animate-pulse">
              <div className="w-full text-left p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-4 bg-white/5 rounded w-1/3" />
                  <div className="h-3 bg-white/5 rounded w-2/3" />
                </div>
                <div className="h-3 bg-white/5 rounded w-16 shrink-0 hidden sm:block" />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 opacity-30">
            <p className="text-[10px] font-bold uppercase tracking-widest">Keine Bewerbungen</p>
          </div>
        ) : filtered.map(app => (
          <ApplicationCard key={app.id} app={app} onAction={handleAction} />
        ))}
      </motion.div>
    </div>
  );
};

export default Applications;
