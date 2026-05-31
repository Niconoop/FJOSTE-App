import { useEffect, useState, useMemo, useCallback, Component } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, Plus, Trash2, Loader2, ChevronDown, Clock, Users, UserPlus, UserMinus, List, CalendarDays, ChevronLeft, ChevronRight, Upload, X as XIcon, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { API_URL, getAvatarUrl } from "../config";

const formatShort = (d: string) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
const formatLong = (d: string) => d ? new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

class ErrorBoundary extends Component<{ children: any }, { error: string | null }> {
  state = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div className="glass-card border-2 border-[#2ba1b9]/20 flex flex-col items-center justify-center py-16 text-center">
        <p className="text-red-400 font-bold text-sm mb-2">Fehler beim Laden der Events</p>
        <p className="text-slate-600 text-xs">{this.state.error}</p>
        <button onClick={() => this.setState({ error: null })} className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-slate-400 transition-all">Erneut versuchen</button>
      </div>
    );
    return this.props.children;
  }
}


const getAvatarUrlLocal = (url?: string | null) => getAvatarUrl(url || undefined);

const EventCard = ({ event, participants, isJoined, canDelete, onDelete, onJoin, onLeave, expandedDefault = false }: any) => {
  const [expanded, setExpanded] = useState(expandedDefault);
  const [acting, setActing] = useState(false);
  const isPast = event.start_date && new Date(event.start_date) < new Date();
  const partCount = participants?.length || 0;

  const handle = async (fn: any) => {
    setActing(true);
    try { await fn(event.id); } finally { setActing(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass-card !p-0 overflow-hidden group hover-glow border-2 border-[#2ba1b9]/20 ${isPast ? "opacity-60 grayscale-[0.5]" : ""}`}
    >
      {event.cover_url && (
        <div className="relative h-44 overflow-hidden bg-black">
          <img src={typeof event.cover_url === 'string' && event.cover_url.startsWith("http") ? event.cover_url : getAvatarUrlLocal(event.cover_url)!} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          {event.start_date && (
            <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md rounded-xl px-3 py-1.5 text-[10px] text-white font-black uppercase tracking-widest">
              <Clock className="w-3 h-3 inline mr-1.5 text-primary" />{formatShort(event.start_date)}
            </div>
          )}
        </div>
      )}

      <div className="p-5 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest mb-3">
          <span className={`px-2 py-0.5 rounded-full border ${event.is_custom ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-primary/10 text-primary border-primary/20"}`}>
            {event.is_custom ? "Manuell" : "Convoy"}
          </span>
          {event.game && (
            <span className="px-2 py-0.5 bg-white/5 text-slate-500 rounded-full border border-white/5">
              {typeof event.game === 'object' ? event.game.name : event.game}
            </span>
          )}
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-unbounded text-sm font-bold text-white group-hover:text-primary transition-colors leading-tight italic">
              {event.title}
            </h3>
            <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-3 font-bold uppercase tracking-tight">
               <span className="flex items-center gap-1"><MapPin size={12} className="text-primary" />{event.start_city || "TBD"}</span>
               <span className="flex items-center gap-1"><Users size={12} />{partCount}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
              {isJoined ? (
                <button onClick={() => handle(onLeave)} disabled={acting} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                  {acting ? <Loader2 size={16} className="animate-spin" /> : <UserMinus size={18} />}
                </button>
              ) : (
                <button onClick={() => handle(onJoin)} disabled={acting} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all">
                  {acting ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={18} />}
                </button>
              )}
              {canDelete && event.is_custom && expanded && (
                <button onClick={(e) => { e.stopPropagation(); onDelete(event.id); }} className="p-2 text-slate-600 hover:text-red-500 transition-all">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-700 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/5"
          >
            <div className="p-5 space-y-4">
               {event.information && <p className="text-xs text-slate-400 leading-relaxed font-medium">{event.information}</p>}
               
               <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest">
                  {event.server && (
                    <div className="space-y-1">
                      <p className="text-slate-600">Server</p>
                      <p className="text-white">
                        {typeof event.server === 'object' ? event.server.name : event.server}
                      </p>
                    </div>
                  )}
                  {event.game && (
                    <div className="space-y-1">
                      <p className="text-slate-600">Spiel</p>
                      <p className="text-white">
                        {typeof event.game === 'object' ? event.game.name : event.game}
                      </p>
                    </div>
                  )}
               </div>

               {event.route_url && (
                 <div className="pt-2">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">Route</p>
                   <img src={getAvatarUrlLocal(event.route_url)!} className="w-full rounded-xl border border-white/5 bg-black/40" />
                 </div>
               )}

               <div className="pt-2">
                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">Teilnehmer ({partCount})</p>
                 <div className="flex flex-wrap gap-2">
                    {participants.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-lg px-2 py-1">
                        <div className="w-4 h-4 rounded-full bg-slate-800 overflow-hidden">
                           {getAvatarUrlLocal(p.avatar_url) ? <img src={getAvatarUrlLocal(p.avatar_url)!} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-primary/20" />}
                        </div>
                        <span className="text-[10px] text-white font-bold">{p.username}</span>
                      </div>
                    ))}
                 </div>
               </div>

              <div className="pt-4 border-t border-white/5">
                {isJoined ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handle(onLeave); }} 
                    disabled={acting} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {acting ? <Loader2 size={14} className="animate-spin" /> : <UserMinus size={14} />}
                    Vom Event abmelden
                  </button>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handle(onJoin); }} 
                    disabled={acting} 
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    {acting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                    Am Event teilnehmen
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function Events({ selectedId, onClearSelectedId }: any) {
  const { token, user, isAdmin, hasRole } = useAuth();
  const EVENT_ROLES = ["event team", "event-team", "hr team", "hr-team", "personal team", "personal-team"];
  const canManageEvents = isAdmin || hasRole(EVENT_ROLES);
  const [events, setEvents] = useState<any[]>([]);
  const [rsvps, setRsvps] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("calendar");
  const [calMonth, setCalMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  
  const [showForm, setShowForm] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [form, setForm] = useState({ title: "", event_type: "Convoy", start_date: "", start_city: "", end_city: "", server: "", game: "ETS2", information: "" });
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [routeFile, setRouteFile] = useState<File | null>(null);
  const [pickerDate, setPickerDate] = useState(new Date());
  const [pickerTime, setPickerTime] = useState("18:00");

  useEffect(() => {
    if (showPickerModal && form.start_date) {
      const d = new Date(form.start_date);
      setPickerDate(d);
      setPickerTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }
  }, [showPickerModal, form.start_date]);

  const loadAll = useCallback(async () => {
    try {
      const h = { Authorization: `Bearer ${token}` };
      const [tr, cu, rs] = await Promise.all([
        axios.get(`${API_URL}/trucky/events`, { headers: h }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/events/custom`, { headers: h }).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/events/rsvps`, { headers: h }).catch(() => ({ data: {} })),
      ]);
      const all = [...(Array.isArray(tr.data) ? tr.data : []), ...(Array.isArray(cu.data) ? cu.data : [])];
      setEvents(all.sort((a, b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime()));
      setRsvps(rs.data || {});
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    try {
      const { ipcRenderer } = window.require('electron');
      if (ipcRenderer) {
        ipcRenderer.send('rpc-page-changed', 'events', { planning: showForm });
      }
    } catch (e) {}
  }, [showForm]);

  useEffect(() => {
    if (selectedId && !loading && events.length > 0) {
      const target = events.find(e => String(e.id) === String(selectedId));
      if (target) {
        setSelectedEvent(target);
      }
      onClearSelectedId?.();
    }
  }, [selectedId, loading, events, onClearSelectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.start_date) return toast.error("Titel und Datum sind Pflicht");
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (coverFile) fd.append("cover", coverFile);
      if (routeFile) fd.append("route", routeFile);
      
      await axios.post(`${API_URL}/events`, fd, { 
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } 
      });
      toast.success("Event erfolgreich geplant!");
      setShowForm(false);
      setForm({ title: "", event_type: "Convoy", start_date: "", start_city: "", end_city: "", server: "", game: "ETS2", information: "" });
      setCoverFile(null); setRouteFile(null);
      loadAll();
    } catch { toast.error("Fehler beim Erstellen des Events"); }
    finally { setSubmitting(false); }
  };

  const handleJoin = async (eid: string | number) => {
    try {
      await axios.post(`${API_URL}/events/${eid}/rsvp`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Angemeldet!");
      loadAll();
    } catch { toast.error("Fehler bei der Anmeldung"); }
  };

  const handleLeave = async (eid: string | number) => {
    try {
      await axios.delete(`${API_URL}/events/${eid}/rsvp`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Abgemeldet");
      loadAll();
    } catch { toast.error("Fehler bei der Abmeldung"); }
  };

  const handleDelete = async (eid: string | number) => {
    try {
      await axios.delete(`${API_URL}/events/${eid}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Event gelöscht");
      loadAll();
    } catch { toast.error("Fehler beim Löschen"); }
  };

  const isJoined = (eid: string | number) => (rsvps[eid] || []).some((p: any) => p.id === user?.user_id);

  const calendarData = useMemo(() => {
    const y = calMonth.getFullYear();
    const m = calMonth.getMonth();
    const firstDay = new Date(y, m, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const dayEvents = events.filter(ev => {
        const ed = new Date(ev.start_date);
        return ed.getFullYear() === y && ed.getMonth() === m && ed.getDate() === d;
      });
      const today = new Date();
      const isToday = new Date(y, m, d).toDateString() === today.toDateString();
      cells.push({ date, events: dayEvents, isToday });
    }
    return cells;
  }, [calMonth, events]);

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight italic">Termine</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Alle anstehenden Konvois & Events.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
            <button onClick={() => setView("list")} className={`p-2 rounded-lg transition-all ${view === "list" ? "bg-primary text-black" : "text-slate-500 hover:text-white"}`}><List size={18} /></button>
            <button onClick={() => setView("calendar")} className={`p-2 rounded-lg transition-all ${view === "calendar" ? "bg-primary text-black" : "text-slate-500 hover:text-white"}`}><CalendarDays size={18} /></button>
          </div>
          {canManageEvents && (
            <button onClick={() => setShowForm(!showForm)} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${showForm ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-primary text-black"}`}>
               {showForm ? <XIcon size={16} /> : <Plus size={16} />}
               {showForm ? "Abbrechen" : "Event planen"}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-[110] flex items-start justify-center p-6 pt-28 bg-black/90 backdrop-blur-xl overflow-y-auto"
            onClick={() => setShowForm(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="glass-card w-full max-w-3xl !p-0 overflow-hidden shadow-2xl border-2 border-[#2ba1b9]/20"
              onClick={e => e.stopPropagation()}
            >
               <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div>
                    <h2 className="font-unbounded text-xs font-bold text-white uppercase italic tracking-widest">Neues Event planen</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 italic">Event Management</p>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><XIcon size={20} /></button>
               </div>

               <form onSubmit={handleCreate} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Titel des Events *</label>
                   <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" required />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Startdatum & Uhrzeit *</label>
                   <div 
                     onClick={() => setShowPickerModal(true)}
                     className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus-within:border-primary/30 outline-none cursor-pointer flex items-center justify-between group hover:border-white/20 transition-all"
                   >
                     <span className={form.start_date ? "text-white" : "text-slate-500"}>
                       {form.start_date ? new Date(form.start_date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "Datum & Uhrzeit wählen..."}
                     </span>
                     <Calendar size={16} className="text-slate-500 group-hover:text-primary transition-colors" />
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Startstadt</label>
                   <input value={form.start_city} onChange={e => setForm({...form, start_city: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" placeholder="z.B. Hamburg" />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Zielstadt</label>
                   <input value={form.end_city} onChange={e => setForm({...form, end_city: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" placeholder="z.B. Berlin" />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Server</label>
                   <input value={form.server} onChange={e => setForm({...form, server: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" placeholder="Simulation 1" />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Spiel</label>
                   <select value={form.game} onChange={e => setForm({...form, game: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none">
                      <option value="ETS2">Euro Truck Simulator 2</option>
                      <option value="ATS">American Truck Simulator</option>
                   </select>
                 </div>

                 <div className="md:col-span-2 space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Zusätzliche Informationen</label>
                   <textarea value={form.information} onChange={e => setForm({...form, information: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none min-h-[100px]" placeholder="Details zum Treffpunkt, DLCs, etc." />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Titelbild (Optional)</label>
                   <div className="relative h-32 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center group hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
                      <input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {coverFile ? <img src={URL.createObjectURL(coverFile)} className="w-full h-full object-cover" /> : <div className="text-center text-slate-600 font-bold text-[10px] uppercase tracking-widest"><Upload className="mx-auto mb-2 opacity-50" /> Bild wählen</div>}
                   </div>
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Routenbild (Optional)</label>
                   <div className="relative h-32 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center group hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
                      <input type="file" accept="image/*" onChange={e => setRouteFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {routeFile ? <img src={URL.createObjectURL(routeFile)} className="w-full h-full object-cover" /> : <div className="text-center text-slate-600 font-bold text-[10px] uppercase tracking-widest"><Upload className="mx-auto mb-2 opacity-50" /> Bild wählen</div>}
                   </div>
                 </div>

                 <div className="md:col-span-2 pt-4">
                   <button disabled={submitting} className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase italic tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-3">
                      {submitting ? <Loader2 className="animate-spin" /> : <><Plus size={18} /> Event Veröffentlichen</>}
                   </button>
                 </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Picker Modal (Website Style) */}
      <AnimatePresence>
        {showPickerModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-xl"
            onClick={() => setShowPickerModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-sm !p-0 overflow-hidden shadow-2xl border-2 border-[#2ba1b9]/20"
              onClick={e => e.stopPropagation()}
            >
               <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div>
                    <h3 className="font-unbounded text-xs font-bold text-white uppercase tracking-widest italic">Zeitpunkt wählen</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 italic">Event Planung</p>
                  </div>
                  <button onClick={() => setShowPickerModal(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><XIcon size={18} /></button>
               </div>

               <div className="p-6 space-y-6">
                  {/* Month Selector */}
                  <div className="flex items-center justify-between">
                     <button 
                       onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() - 1, 1))}
                       className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500"
                     >
                       <ChevronLeft size={16} />
                     </button>
                     <p className="text-[10px] font-black text-white uppercase tracking-widest italic">
                       {pickerDate.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
                     </p>
                     <button 
                       onClick={() => setPickerDate(new Date(pickerDate.getFullYear(), pickerDate.getMonth() + 1, 1))}
                       className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500"
                     >
                       <ChevronRight size={16} />
                     </button>
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1">
                     {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map(d => (
                       <div key={d} className="text-center text-[8px] font-black text-slate-700 uppercase mb-1">{d}</div>
                     ))}
                     {(() => {
                       const y = pickerDate.getFullYear();
                       const m = pickerDate.getMonth();
                       const first = (new Date(y, m, 1).getDay() + 6) % 7;
                       const days = new Date(y, m + 1, 0).getDate();
                       const cells = [];
                       for(let i=0; i<first; i++) cells.push(<div key={`empty-${i}`} />);
                       for(let d=1; d<=days; d++) {
                         const isSelected = pickerDate.getDate() === d && pickerDate.getMonth() === m && pickerDate.getFullYear() === y;
                         cells.push(
                           <button 
                             key={d} 
                             onClick={() => setPickerDate(new Date(y, m, d))}
                             className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${isSelected ? "bg-primary text-black shadow-[0_0_15px_rgba(43,161,185,0.4)]" : "text-slate-400 hover:bg-white/5"}`}
                           >
                             {d}
                           </button>
                         );
                       }
                       return cells;
                     })()}
                  </div>

                  {/* Time Input */}
                  <div className="pt-4 border-t border-white/5">
                     <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block mb-3 italic">Uhrzeit (HH:mm)</label>
                     <div className="flex items-center gap-3">
                        <input 
                          type="time" 
                          value={pickerTime} 
                          onChange={e => setPickerTime(e.target.value)}
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/30 [color-scheme:dark]"
                        />
                        <div className="p-3 rounded-xl bg-primary/10 text-primary">
                           <Clock size={18} />
                        </div>
                     </div>
                  </div>

                  <button 
                    onClick={() => {
                      const [h, min] = pickerTime.split(":");
                      const finalDate = new Date(pickerDate);
                      finalDate.setHours(parseInt(h), parseInt(min), 0);
                      
                      const pad = (n: number) => String(n).padStart(2, '0');
                      const formatted = `${finalDate.getFullYear()}-${pad(finalDate.getMonth()+1)}-${pad(finalDate.getDate())}T${pad(finalDate.getHours())}:${pad(finalDate.getMinutes())}`;
                      
                      setForm({ ...form, start_date: formatted });
                      setShowPickerModal(false);
                    }}
                    className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] italic hover:bg-white transition-all shadow-xl"
                  >
                    Termin Übernehmen
                  </button>
               </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-black/40 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : view === "list" ? (
        <ErrorBoundary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {events.map(e => (
              <EventCard
                key={e.id ?? Math.random()}
                event={e}
                participants={rsvps[e.id] || []}
                isJoined={isJoined(e.id)}
                canDelete={canManageEvents}
                onDelete={handleDelete}
                onJoin={handleJoin}
                onLeave={handleLeave}
              />
            ))}
          </div>
        </ErrorBoundary>
      ) : (
        <div className="glass-card hover-glow shadow-2xl border-2 border-[#2ba1b9]/20">
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => {
                const d = new Date(calMonth);
                d.setMonth(d.getMonth() - 1);
                setCalMonth(d);
              }}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-500"
            >
              <ChevronLeft />
            </button>
            <h2 className="font-unbounded text-sm font-bold text-white uppercase tracking-widest italic">
              {calMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" })}
            </h2>
            <button
              onClick={() => {
                const d = new Date(calMonth);
                d.setMonth(d.getMonth() + 1);
                setCalMonth(d);
              }}
              className="p-2 hover:bg-white/5 rounded-xl text-slate-500"
            >
              <ChevronRight />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((d, idx) => (
              <div key={d} className={`text-center text-[9px] font-black uppercase mb-2 ${idx >= 5 ? "text-slate-400" : "text-slate-700"}`}>
                {d}
              </div>
            ))}
            {calendarData.map((cell, i) => {
              const isToday = cell && new Date().toDateString() === cell.date.toDateString();
              return (
                <div
                  key={i}
                  onClick={() => {
                    if (cell && canManageEvents) {
                      const d = cell.date;
                      const pad = (n: number) => String(n).padStart(2, '0');
                      const formatted = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T18:00`;
                      setForm({ ...form, start_date: formatted });
                      setShowForm(true);
                    }
                  }}
                  className={`min-h-[80px] p-2 rounded-xl border transition-all hover-glow cursor-pointer ${
                    cell 
                      ? `border-white/10 hover:border-primary/30 shadow-lg ${
                          isToday 
                            ? "bg-primary/10 border-primary/40 ring-1 ring-primary/20" 
                            : (i % 7 >= 5 ? "calendar-weekend" : "calendar-weekday")
                        }` 
                      : "border-transparent opacity-10"
                  }`}
                >
                  {cell && (
                    <>
                      <p className={`text-[10px] font-black mb-1 italic ${isToday ? "text-primary" : "text-slate-500"}`}>{cell.date.getDate()}</p>
                      <div className="space-y-1">
                        {cell.events.map((ev: any) => {
                          const cover = typeof ev.cover_url === 'string' && ev.cover_url.startsWith("http") 
                            ? ev.cover_url 
                            : ev.cover_url ? getAvatarUrlLocal(ev.cover_url) : null;
                          
                          return (
                            <div 
                              key={ev.id ?? Math.random()} 
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                              className="relative group rounded-lg overflow-hidden h-14 bg-slate-900 border border-white/5 cursor-pointer"
                              title={typeof ev.title === 'object' ? ev.title.name : ev.title}
                            >
                              {cover ? (
                                <img src={cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                  <ImageIcon size={14} className="text-primary/30" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                              
                              <div className="absolute inset-x-0 bottom-0 p-1.5 flex flex-col justify-end">
                                <p className="text-[7px] font-black text-white truncate leading-tight uppercase tracking-tighter">
                                  {typeof ev.title === 'object' ? ev.title.name : ev.title}
                                </p>
                                <div className="flex items-center justify-between gap-1 mt-0.5">
                                  <span className="text-[6px] text-primary font-black uppercase tracking-widest">
                                    {new Date(ev.start_date).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                                  </span>
                                  {ev.game && (
                                    <span className="text-[5px] text-slate-400 font-bold px-1 bg-white/5 rounded border border-white/5 truncate max-w-[30px]">
                                      {typeof ev.game === 'object' ? ev.game.name : ev.game}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Event Details Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center p-6 pt-28 bg-black/90 backdrop-blur-md overflow-y-auto"
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-xl relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
              >
                <XIcon size={24} />
              </button>
              
              <EventCard 
                event={selectedEvent} 
                participants={rsvps[selectedEvent.id] || []}
                isJoined={isJoined(selectedEvent.id)}
                canDelete={canManageEvents}
                onDelete={(id: any) => { handleDelete(id); setSelectedEvent(null); }}
                onJoin={handleJoin}
                onLeave={handleLeave}
                expandedDefault={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
