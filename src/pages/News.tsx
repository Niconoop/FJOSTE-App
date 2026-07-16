import React, { useEffect, useState, useCallback } from 'react';
import { Newspaper, Clock, ExternalLink, Plus, X, Trash2, ImagePlus, Eye, Lock, ChevronDown, Loader2, Upload } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 }
  }
};

const staggerChild = {
  hidden: { opacity: 1, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return { day: '??', month: '???' };
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString("de-DE", { day: "2-digit" }),
    month: date.toLocaleDateString("de-DE", { month: "short" }).toUpperCase(),
  };
};

const NewsCard = ({ item, imageUrl, canDelete, onDelete }: any) => {
  const [expanded, setExpanded] = useState(false);
  const hasFullContent = item.content && item.excerpt && item.content !== item.excerpt;
  const preview = item.excerpt || item.content;
  const { day, month } = formatDate(item.created_at);

  return (
    <motion.article
      id={`news-${item.id}`}
      variants={staggerChild}
      className="bg-[#0b0b0c] rounded-2xl overflow-hidden group border border-zinc-900 transition-all duration-300 hover:border-amber-400/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)] flex flex-col h-full"
    >
      <div className="relative h-44 overflow-hidden shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black flex items-center justify-center">
            <Newspaper size={40} className="text-zinc-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0c] via-transparent to-black/30" />
        <div className="absolute top-4 left-4 bg-zinc-950/80 backdrop-blur-md rounded-xl w-14 h-14 flex flex-col items-center justify-center text-white border border-zinc-800 shadow-md">
          <span className="text-xl font-bold tracking-tighter leading-none">{day}</span>
          <span className="text-[9px] font-black uppercase text-amber-400 mt-0.5">{month}</span>
        </div>
        <div className="absolute top-4 right-4">
          {item.visibility === "internal" ? (
            <span className="text-[9px] font-black text-amber-400 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 uppercase tracking-widest border border-amber-500/20">
              <Lock size={10} /> Intern
            </span>
          ) : (
            <span className="text-[9px] font-black text-primary bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 uppercase tracking-widest border border-primary/20">
              <Eye size={10} /> Public
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-grow flex flex-col">
        <h3 className="text-base font-extrabold text-white group-hover:text-amber-400 transition-colors duration-200 uppercase tracking-wider mb-3 line-clamp-2">
          {item.title}
        </h3>

        {preview && !expanded && (
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-3">{preview}</p>
        )}

        <AnimatePresence>
          {expanded && hasFullContent && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="text-zinc-300 text-xs leading-relaxed whitespace-pre-wrap">{item.content}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {hasFullContent && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] font-black text-amber-400 uppercase tracking-widest mt-3 hover:underline self-start">
            {expanded ? "Weniger anzeigen" : "Weiterlesen"}
            <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        <div className="mt-auto pt-4">
          <div className="border-t border-zinc-900/60 pt-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Autor</p>
              <p className="text-xs font-bold text-white mt-1 truncate">{item.author || "Open Pipe Club"}</p>
            </div>
            {canDelete && (
              <button onClick={() => onDelete(item.id)} className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shrink-0">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
};

const News = ({ selectedId, onClearSelectedId, openCreate, onConsumeCreate }: any) => {
  const { token, user, isAdmin, hasRole } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const NEWS_ROLES = ["event team", "event-team", "modding team", "modding-team", "hr team", "hr-team", "personal team", "personal-team"];
  const canManageNews = isAdmin || hasRole(NEWS_ROLES);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<any>({});
  
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      const r = await axios.get(`${API_URL}/news`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = Array.isArray(r.data) ? r.data : [];
      setNews(data);
      
      data.forEach(item => {
        if (item.image_id && !imageUrls[item.image_id]) {
          axios.get(`${API_URL}/news/${item.image_id}/image`, { responseType: "blob" })
            .then(res => {
              const url = URL.createObjectURL(res.data);
              setImageUrls((prev: any) => ({ ...prev, [item.image_id]: url }));
            }).catch(() => {});
        }
      });
    } catch {} finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  useEffect(() => {
    if (openCreate) {
      setShowForm(true);
      onConsumeCreate?.();
    }
  }, [openCreate]);

  useEffect(() => {
    if (selectedId && !loading && news.length > 0) {
      setTimeout(() => {
        const el = document.getElementById(`news-${selectedId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-black');
          setTimeout(() => el.classList.remove('ring-2', 'ring-primary', 'ring-offset-4', 'ring-offset-black'), 4000);
        }
        onClearSelectedId?.();
      }, 500);
    }
  }, [selectedId, loading, news, onClearSelectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return toast.error("Titel und Inhalt sind Pflicht");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("content", content);
      if (excerpt) fd.append("excerpt", excerpt);
      fd.append("visibility", visibility);
      if (imageFile) fd.append("image", imageFile);

      await axios.post(`${API_URL}/news`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("News erfolgreich veröffentlicht!");
      setTitle(""); setContent(""); setExcerpt(""); setVisibility("public"); setImageFile(null);
      setShowForm(false);
      fetchNews();
    } catch { toast.error("Fehler beim Erstellen der News"); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (id: string | number) => {
    if (!(await confirm("News wirklich löschen?"))) return;
    try {
      await axios.delete(`${API_URL}/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("News gelöscht");
      setNews(news.filter(n => n.id !== id));
    } catch { toast.error("Fehler beim Löschen"); }
  };

  return (
    <>
    <ConfirmDialog />
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <span className="overline text-amber-400 mb-2 inline-block">Ankündigungen</span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-white mt-2">VTC News</h1>
        {!loading && <p className="text-zinc-400 text-sm mt-3">{news.length} {news.length === 1 ? "Beitrag" : "Beiträge"} in der Übersicht.</p>}
      </div>

      {canManageNews && (
        <div className="flex items-center justify-end mb-12">
          <button
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${showForm ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-400 text-black"}`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Abbrechen" : "News verfassen"}
          </button>
        </div>
      )}

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
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="frosted-card bg-zinc-950/95 w-full max-w-3xl !p-0 overflow-hidden shadow-2xl border border-white/10"
              onClick={e => e.stopPropagation()}
            >
               <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                  <div>
                    <h2 className="font-unbounded text-xs font-bold text-white uppercase italic tracking-widest">News verfassen</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 italic">News Management</p>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-2 text-slate-500 hover:text-white transition-colors"><X size={20} /></button>
               </div>

               <form onSubmit={handleCreate} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-300 ml-1 mb-2 block">Titel *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300" placeholder="z.B. Neues Firmen-Event" required />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-300 ml-1 mb-2 block">Inhalt *</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 min-h-[150px]" placeholder="Schreibe hier die Details..." required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1 mb-2 block">Kurzfassung (Optional)</label>
                    <input value={excerpt} onChange={e => setExcerpt(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300" placeholder="Wird in der Vorschau angezeigt" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300 ml-1 mb-2 block">Sichtbarkeit</label>
                    <div className="flex gap-2">
                       <button type="button" onClick={() => setVisibility("public")} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${visibility === "public" ? "bg-amber-400/10 border-amber-400/35 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "bg-white/[0.03] border-white/10 text-slate-400"}`}><Eye size={14} /> Public</button>
                       <button type="button" onClick={() => setVisibility("internal")} className={`flex-1 py-3 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${visibility === "internal" ? "bg-amber-400/10 border-amber-400/35 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "bg-zinc-900/50 border-zinc-700 text-slate-400"}`}><Lock size={14} /> Intern</button>
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-medium text-slate-300 ml-1 mb-2 block">Vorschaubild (Optional)</label>
                    <div className="relative h-40 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center group hover:border-amber-400/50 transition-all cursor-pointer overflow-hidden bg-white/[0.02]">
                       <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                       {imageFile ? <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" /> : <div className="text-center text-slate-500 font-bold text-[10px] uppercase tracking-widest"><Upload className="mx-auto mb-2 opacity-50 text-slate-400" /> Bild auswählen</div>}
                    </div>
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={submitting} 
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-black h-12 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                       {submitting ? <Loader2 className="animate-spin" size={18} /> : "News Veröffentlichen"}
                    </motion.button>
                  </div>
               </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
            Aktuelle Beiträge
          </h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-80 bg-[#0b0b0c] border border-zinc-900 rounded-2xl animate-pulse" />)}
          </div>
        ) : news.length === 0 ? (
          <div className="text-center py-16 frosted-card border-dashed border-zinc-800">
            <Newspaper size={40} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">Zurzeit sind keine News vorhanden.</p>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {news.map((item) => (
              <NewsCard
                key={item.id}
                item={item}
                imageUrl={item.image_id ? imageUrls[item.image_id] : null}
                canDelete={canManageNews}
                onDelete={handleDelete}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
    </>
  );
};

export default News;

