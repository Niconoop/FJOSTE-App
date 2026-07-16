import { useEffect, useState, useCallback } from 'react';
import { Upload, Trash2, Image as ImageIcon, Loader2, Pencil, Check, X, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 }
  }
};

const staggerChild = {
  hidden: { opacity: 1, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 20 } }
};

const Gallery = () => {
  const { token, user, isAdmin, hasRole } = useAuth();
  const { confirm, ConfirmDialog } = useConfirmDialog();
  const HR_ROLES = ["hr team", "hr-team", "personal team", "personal-team"];

  const canManageImage = (img: any) => {
    if (!user) return false;
    if (isAdmin) return true;
    if (hasRole(HR_ROLES)) return true;
    return img.uploaded_by === user.username;
  };

  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [dragActive, setDragActive] = useState(false);
  const [blobUrls, setBlobUrls] = useState<any>({});
  const [uploadCaption, setUploadCaption] = useState("");
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const showNextImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedImage || images.length === 0) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex === -1) return;
    const nextIndex = (currentIndex + 1) % images.length;
    setSelectedImage(images[nextIndex]);
  }, [selectedImage, images]);

  const showPrevImage = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedImage || images.length === 0) return;
    const currentIndex = images.findIndex(img => img.id === selectedImage.id);
    if (currentIndex === -1) return;
    const prevIndex = (currentIndex - 1 + images.length) % images.length;
    setSelectedImage(images[prevIndex]);
  }, [selectedImage, images]);

  useEffect(() => {
    if (!selectedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        showNextImage();
      } else if (e.key === 'ArrowLeft') {
        showPrevImage();
      } else if (e.key === 'Escape') {
        setSelectedImage(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, showNextImage, showPrevImage]);


  const fetchImages = useCallback(() => {
    setLoading(true);
    axios.get(`${API_URL}/gallery`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => setImages(Array.isArray(r.data) ? r.data : []))
      .catch(() => toast.error("Galerie konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  useEffect(() => {
    images.forEach(img => {
      if (!blobUrls[img.id]) {
        axios.get(`${API_URL}/gallery/image/${img.id}`, {
          responseType: "blob",
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(r => {
            const url = URL.createObjectURL(r.data);
            setBlobUrls((prev: any) => ({ ...prev, [img.id]: url }));
          })
          .catch(() => { });
      }
    });
  }, [images, token]);

  const handleUpload = async (files: File[]) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        if (uploadCaption.trim()) formData.append("caption", uploadCaption.trim());
        await axios.post(`${API_URL}/gallery/upload`, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`
          }
        });
      }
      toast.success(`${files.length} Bild(er) hochgeladen`);
      setUploadCaption("");
      fetchImages();
    } catch { toast.error("Upload fehlgeschlagen"); }
    finally { setUploading(false); }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm("Bild wirklich löschen?"))) return;
    try {
      await axios.delete(`${API_URL}/gallery/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Bild gelöscht");
      setBlobUrls((prev: any) => {
        const next = { ...prev };
        if (next[id]) { URL.revokeObjectURL(next[id]); delete next[id]; }
        return next;
      });
      fetchImages();
    } catch { toast.error("Löschen fehlgeschlagen"); }
  };

  const handleSaveCaption = async (id: string) => {
    try {
      await axios.put(`${API_URL}/gallery/${id}/caption`, { caption: captionDraft }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Bildunterschrift gespeichert");
      setEditingCaption(null);
      fetchImages();
    } catch { toast.error("Speichern fehlgeschlagen"); }
  };

  return (
    <>
    <ConfirmDialog />
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center mb-16">
        <span className="overline text-amber-400 mb-2 inline-block">Galerie</span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-white mt-2">Galerie</h1>
        {!loading && <p className="text-zinc-400 text-sm mt-3">{images.length} {images.length === 1 ? "Aufnahme" : "Aufnahmen"}.</p>}
      </div>

      <div className="flex items-center justify-end gap-3 mb-12">
        <input
          type="text"
          placeholder="Upload-Caption..."
          value={uploadCaption}
          onChange={e => setUploadCaption(e.target.value)}
          className="bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-amber-400/40 outline-none text-white hidden sm:block w-48"
        />
        <button
          onClick={() => (document.getElementById('file-upload') as any).click()}
          disabled={uploading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all bg-amber-400 text-black hover:bg-amber-500 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {uploading ? "Lädt..." : "Upload"}
        </button>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleUpload(Array.from(e.target.files))}
        />
      </div>

      <div>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest">
            Alle Aufnahmen
          </h2>
        </div>

        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="aspect-video bg-[#0b0b0c] border border-zinc-900 rounded-2xl animate-pulse" />)}
          </div>
        )}

        {!loading && images.length === 0 && (
          <div className="text-center py-16 frosted-card border-dashed border-zinc-800">
            <ImageIcon size={40} className="mx-auto mb-4 text-zinc-600" />
            <p className="text-zinc-400">Noch keine Bilder hochgeladen.</p>
          </div>
        )}

        {!loading && images.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {images.map((img) => (
              <motion.div
                key={img.id}
                variants={staggerChild}
                className="group bg-[#0b0b0c] rounded-2xl overflow-hidden border border-zinc-900 transition-all duration-300 hover:border-amber-400/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)] flex flex-col"
              >
                <div
                  className="relative aspect-video overflow-hidden cursor-pointer bg-black flex items-center justify-center shrink-0"
                  onClick={() => setSelectedImage(img)}
                >
                  {blobUrls[img.id] ? (
                    <img src={blobUrls[img.id]} className="w-full h-full object-cover group-hover:scale-105 opacity-90 group-hover:opacity-100 transition-all duration-500" />
                  ) : (
                    <Loader2 size={24} className="text-slate-700 animate-spin" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="p-3 rounded-full bg-white/10 backdrop-blur-md">
                      <Search size={20} className="text-white" />
                    </div>
                  </div>

                  {/* Uploader Badge */}
                  <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-[-10px] group-hover:translate-y-0">
                    <p className="text-[8px] font-black text-amber-400 uppercase tracking-widest italic flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse" />
                      {img.uploaded_by || 'Unbekannt'}
                    </p>
                  </div>
                </div>

                <div className="p-4 border-t border-zinc-900/60 flex items-start justify-between gap-2">
                  {editingCaption === img.id ? (
                    <div className="flex items-center gap-1 w-full">
                      <input
                        value={captionDraft}
                        onChange={e => setCaptionDraft(e.target.value)}
                        className="bg-white/10 border border-amber-400/20 rounded-lg px-2 py-1 text-[10px] text-white outline-none w-full"
                        autoFocus
                      />
                      <button onClick={() => handleSaveCaption(img.id)} className="p-1 text-emerald-400"><Check size={14} /></button>
                    </div>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate flex-1">
                      {img.caption || "Keine Unterschrift"}
                    </p>
                  )}
                  {canManageImage(img) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditingCaption(img.id); setCaptionDraft(img.caption || ""); }} className="p-1 text-slate-400 hover:text-amber-400"><Pencil size={12} /></button>
                      <button onClick={() => handleDelete(img.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Lightbox */}
      {createPortal(
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              {/* Left Navigation Button */}
              <button
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 hover:border-amber-400/50 rounded-full text-slate-200 hover:text-white shadow-lg transition-all duration-300 z-20"
                onClick={showPrevImage}
              >
                <ChevronLeft size={24} />
              </button>

              {/* Right Navigation Button */}
              <button
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 hover:border-amber-400/50 rounded-full text-slate-200 hover:text-white shadow-lg transition-all duration-300 z-20"
                onClick={showNextImage}
              >
                <ChevronRight size={24} />
              </button>

              <div
                className="relative bg-black backdrop-blur-2xl border-2 border-[#f59e0b]/20 w-[95vw] max-w-7xl p-2 rounded-xl shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute right-4 top-4 p-1.5 bg-white/10 backdrop-blur-xl border border-white/15 hover:bg-white/20 hover:border-amber-400/50 rounded-full text-white shadow-lg transition-all duration-300 z-10"
                  onClick={() => setSelectedImage(null)}
                >
                  <X size={14} />
                </button>
                <img
                  src={blobUrls[selectedImage.id]}
                  alt=""
                  className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
                />
                <div className="mt-4 text-center space-y-2 pb-2">
                  {selectedImage.caption && (
                    <p className="text-sm text-slate-300 px-4">
                      {selectedImage.caption}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 text-slate-500 font-black uppercase tracking-widest text-[10px] italic">
                    <span>Hochgeladen von</span>
                    <span className="text-primary">{selectedImage.uploaded_by || 'Unbekannt'}</span>
                    <span>•</span>
                    <span>{new Date(selectedImage.created_at).toLocaleDateString("de-DE")}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
    </>
  );
};

export default Gallery;

