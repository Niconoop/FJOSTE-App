import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Newspaper, Plus, X, Trash2, Eye, Lock, ChevronDown, Loader2, Upload, Pencil } from 'lucide-react';
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

const NewsCard = ({ item, imageUrl, canDelete, onDelete, onEdit }: any) => {
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
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit?.(item)} title="Bearbeiten" className="p-2 text-zinc-700 hover:text-amber-400 hover:bg-amber-400/10 rounded-xl transition-all shrink-0">
                  <Pencil size={16} />
                </button>
                <button onClick={() => onDelete(item.id)} className="p-2 text-zinc-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all shrink-0">
                  <Trash2 size={16} />
                </button>
              </div>
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
  const NEWS_ROLES = [
    "admin", "management", "inhaber", "projektleitung", "leitung", "leader", "co-leader",
    "event team", "event-team", "modding team", "modding-team", "hr team", "hr-team", 
    "personal team", "personal-team", "media team", "media-team", "presse"
  ];
  const canManageNews = isAdmin || hasRole(NEWS_ROLES);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrls, setImageUrls] = useState<any>({});
  
  const [showForm, setShowForm] = useState(false);
  const [editingNews, setEditingNews] = useState<any>(null);
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

  const openEdit = (item: any) => {
    setEditingNews(item);
    setTitle(item.title || "");
    setContent(item.content || "");
    setExcerpt(item.excerpt || "");
    setVisibility(item.visibility || "public");
    setImageFile(null);
    setShowForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews || !title.trim() || !content.trim()) return toast.error("Titel und Inhalt sind Pflicht");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("title", title);
      fd.append("content", content);
      if (excerpt) fd.append("excerpt", excerpt);
      fd.append("visibility", visibility);
      if (imageFile) fd.append("image", imageFile);

      await axios.put(`${API_URL}/news/${editingNews.id}`, fd, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("News aktualisiert!");
      setTitle(""); setContent(""); setExcerpt(""); setVisibility("public"); setImageFile(null);
      setEditingNews(null);
      setShowForm(false);
      fetchNews();
    } catch { toast.error("Fehler beim Aktualisieren der News"); }
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
              onClick={() => { setShowForm(!showForm); if (showForm) { setEditingNews(null); setImageFile(null); } }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${showForm ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-400 text-black"}`}
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Abbrechen" : "News verfassen"}
            </button>
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {showForm && (
            <motion.div
              key="news-create-modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] flex items-start justify-center p-4 sm:p-6 pt-24 sm:pt-28 bg-black/80 backdrop-blur-xl overflow-y-auto"
              onClick={() => setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
                className="frosted-card w-full max-w-3xl flex flex-col overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="relative p-5 sm:p-6 md:p-8 pb-5 sm:pb-6 bg-gradient-to-b from-amber-400/5 to-transparent border-b border-white/5 shrink-0">
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
                      <Newspaper size={20} className="text-amber-400" />
                    </div>
                    <div>
                      <h2 className="font-unbounded text-xs sm:text-sm font-bold text-white uppercase tracking-widest">{editingNews ? "News bearbeiten" : "News verfassen"}</h2>
                      <p className="text-[10px] sm:text-xs text-slate-500 font-medium mt-0.5">Erstelle einen Beitrag für dein Team.</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={editingNews ? handleUpdate : handleCreate} className="p-5 sm:p-6 md:p-8 pt-4 sm:pt-6 space-y-4 sm:space-y-5 flex-1 min-h-0 overflow-y-auto no-scrollbar">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titel *</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300" placeholder="z.B. Neues Firmen-Event" required />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inhalt *</label>
                    <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300 min-h-[120px] sm:min-h-[150px]" placeholder="Schreibe hier die Details..." required />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kurzfassung</label>
                      <input value={excerpt} onChange={e => setExcerpt(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300" placeholder="Wird in der Vorschau angezeigt" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sichtbarkeit</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setVisibility("public")} className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${visibility === "public" ? "bg-amber-400/10 border-amber-400/35 text-amber-400" : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20"}`}><Eye size={14} /> Public</button>
                        <button type="button" onClick={() => setVisibility("internal")} className={`flex-1 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${visibility === "internal" ? "bg-amber-400/10 border-amber-400/35 text-amber-400" : "bg-white/[0.03] border-white/10 text-slate-400 hover:border-white/20"}`}><Lock size={14} /> Intern</button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vorschaubild</label>
                    <label className="group relative flex flex-col items-center justify-center gap-2 h-28 sm:h-32 rounded-xl border border-dashed border-white/10 cursor-pointer hover:border-amber-400/30 hover:bg-amber-400/[0.02] transition-all duration-300 bg-white/[0.02] overflow-hidden">
                      <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="hidden" />
                      {imageFile ? <img src={URL.createObjectURL(imageFile)} className="absolute inset-0 w-full h-full object-cover" /> : (editingNews?.image_id ? <img src={`${API_URL}/news/${editingNews.image_id}/image`} className="absolute inset-0 w-full h-full object-cover" /> : <><Upload size={20} className="text-slate-500 group-hover:text-amber-400/70 transition-colors" /><span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bild auswählen</span></>)}
                      <div className="relative z-10 flex items-center justify-center">
                      </div>
                    </label>
                  </div>

                  <div className="pt-2">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-400 text-black h-12 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {submitting ? <><Loader2 className="animate-spin" size={18} /> {editingNews ? "Speichere..." : "Veröffentlichen..."}</> : (editingNews ? "Änderungen speichern" : "News Veröffentlichen")}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        , document.body
       )}

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
            Aktuelle Beiträge
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-amber-400" size={32} />
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
                onEdit={openEdit}
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
