import React, { useEffect, useState, useCallback } from 'react';
import { Newspaper, Clock, ExternalLink, Plus, X, Trash2, ImagePlus, Eye, Lock, ChevronDown, Loader2, Upload } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const NewsCard = ({ item, imageUrl, canDelete, onDelete }: any) => {
  const [expanded, setExpanded] = useState(false);
  const hasFullContent = item.content && item.excerpt && item.content !== item.excerpt;

  return (
    <motion.article
      id={`news-${item.id}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card bg-black/40 !p-0 overflow-hidden group hover-glow shadow-xl transition-all flex flex-col"
    >
      {imageUrl && (
        <div className="h-48 overflow-hidden relative">
          <img src={imageUrl} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute top-3 right-3">
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
      )}

      <div className="p-6 flex-1 flex flex-col">
        {!imageUrl && (
          <div className="flex items-center gap-2 mb-4">
             {item.visibility === "internal" ? (
               <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded uppercase tracking-widest border border-amber-500/20 flex items-center gap-1"><Lock size={10} /> Intern</span>
             ) : (
               <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-widest border border-primary/20 flex items-center gap-1"><Eye size={10} /> Public</span>
             )}
          </div>
        )}

        <h3 className="font-unbounded text-lg font-bold text-white group-hover:text-primary transition-colors mb-3 leading-tight italic">
          {item.title}
        </h3>

        <p className="text-sm text-slate-400 leading-relaxed mb-4 font-medium">
          {expanded ? item.content : (item.excerpt || (item.content?.length > 150 ? item.content.slice(0, 150) + "..." : item.content))}
        </p>

        {hasFullContent && (
          <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-[10px] font-black text-primary uppercase tracking-widest mb-6 hover:underline">
            {expanded ? "Weniger anzeigen" : "Weiterlesen"}
            <ChevronDown size={12} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        )}

        <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-3">

              <div>
                 <p className="text-[10px] font-black text-white uppercase tracking-tight">{item.author || "FJOSTE TEAM"}</p>
                 <p className="text-[9px] font-bold text-slate-600 uppercase">{new Date(item.created_at).toLocaleDateString("de-DE")}</p>
              </div>
           </div>
           {canDelete && (
             <button onClick={() => onDelete(item.id)} className="p-2 text-slate-700 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                <Trash2 size={16} />
             </button>
           )}
        </div>
      </div>
    </motion.article>
  );
};

const News = ({ selectedId, onClearSelectedId }: any) => {
  const { token, user, isAdmin, hasRole } = useAuth();
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
      
      // Load images
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
    if (!window.confirm("News wirklich löschen?")) return;
    try {
      await axios.delete(`${API_URL}/news/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("News gelöscht");
      setNews(news.filter(n => n.id !== id));
    } catch { toast.error("Fehler beim Löschen"); }
  };

  return (
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between gap-6">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight italic">VTC News</h1>
          <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Offizielle Ankündigungen und Updates.</p>
        </div>
        {canManageNews && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${showForm ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-primary text-black"}`}
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Abbrechen" : "News verfassen"}
          </button>
        )}
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
              className="glass-card bg-black/95 w-full max-w-3xl !p-0 overflow-hidden shadow-2xl border border-white/10"
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
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Titel *</label>
                   <input value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" placeholder="z.B. Neues Firmen-Event" required />
                 </div>

                 <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Inhalt *</label>
                   <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none min-h-[150px]" placeholder="Schreibe hier die Details..." required />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">Kurzfassung (Optional)</label>
                   <input value={excerpt} onChange={e => setExcerpt(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-primary/30 outline-none" placeholder="Wird in der Vorschau angezeigt" />
                 </div>

                 <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sichtbarkeit</label>
                   <div className="flex gap-2">
                      <button type="button" onClick={() => setVisibility("public")} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${visibility === "public" ? "bg-primary/10 border-primary/30 text-primary" : "bg-black/40 border-white/10 text-slate-600"}`}><Eye size={14} /> Public</button>
                      <button type="button" onClick={() => setVisibility("internal")} className={`flex-1 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${visibility === "internal" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" : "bg-black/40 border-white/10 text-slate-600"}`}><Lock size={14} /> Intern</button>
                   </div>
                 </div>

                 <div className="space-y-2 md:col-span-2">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vorschaubild (Optional)</label>
                   <div className="relative h-40 rounded-xl border-2 border-dashed border-white/10 flex items-center justify-center group hover:border-primary/30 transition-all cursor-pointer overflow-hidden">
                      <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                      {imageFile ? <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" /> : <div className="text-center text-slate-600 font-bold text-[10px] uppercase tracking-widest"><Upload className="mx-auto mb-2 opacity-50" /> Bild auswählen</div>}
                   </div>
                 </div>

                 <div className="md:col-span-2 pt-4">
                   <button disabled={submitting} className="w-full bg-primary text-black py-4 rounded-2xl font-black uppercase italic tracking-widest text-xs hover:bg-white transition-all flex items-center justify-center gap-3">
                      {submitting ? <Loader2 className="animate-spin" /> : "News Veröffentlichen"}
                   </button>
                 </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          [1,2,3,4].map(i => <div key={i} className="h-64 bg-black/40 rounded-3xl animate-pulse" />)
        ) : news.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 opacity-20">
             <Newspaper size={48} className="mx-auto mb-4" />
             <p className="font-unbounded text-xs font-bold uppercase tracking-widest">Keine News gefunden</p>
          </div>
        ) : news.map((item) => (
          <NewsCard
            key={item.id}
            item={item}
            imageUrl={item.image_id ? imageUrls[item.image_id] : null}
            canDelete={canManageNews}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default News;
