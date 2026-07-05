import { useEffect, useState, useCallback } from 'react';
import { Upload, Trash2, Image as ImageIcon, Loader2, Pencil, Check, X, Search, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiService } from '../services/api';
import { toast } from 'sonner';
import axios from 'axios';
import { API_URL } from '../config';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

import { useAuth } from '../context/AuthContext';

const Gallery = () => {
  const { token, user, isAdmin, hasRole } = useAuth();
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
    if (!window.confirm("Bild wirklich löschen?")) return;
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
    <div className="space-y-8 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight">Galerie</h1>
          <p className="text-slate-500 font-medium mt-1">Das visuelle Archiv deiner VTC • {images.length} Aufnahmen</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Upload-Caption..."
            value={uploadCaption}
            onChange={e => setUploadCaption(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:border-primary/30 outline-none text-white hidden sm:block w-48"
          />
          <button
            onClick={() => (document.getElementById('file-upload') as any).click()}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
          >
            <Plus size={16} />
            Upload
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
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <div key={i} className="h-48 bg-black/40 rounded-3xl animate-pulse" />)}
        </div>
      )}

      {!loading && images.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 glass-card">
          <ImageIcon size={48} className="text-slate-700 mb-4" />
          <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">Noch keine Bilder hochgeladen</p>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <div
                className="glass-card !p-0 overflow-hidden cursor-pointer hover-glow transition-all aspect-video flex items-center justify-center bg-black/40"
                onClick={() => setSelectedImage(img)}
              >
                {blobUrls[img.id] ? (
                  <img src={blobUrls[img.id]} className="w-full h-full object-cover group-hover:scale-105 brightness-75 group-hover:brightness-100 transition-all duration-700" />
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
                  <p className="text-[8px] font-black text-primary uppercase tracking-widest italic flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                    {img.uploaded_by || 'Unbekannt'}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-start justify-between gap-2 px-1">
                {editingCaption === img.id ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      value={captionDraft}
                      onChange={e => setCaptionDraft(e.target.value)}
                      className="bg-white/10 border border-primary/20 rounded-lg px-2 py-1 text-[10px] text-white outline-none w-full"
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setEditingCaption(img.id); setCaptionDraft(img.caption || ""); }} className="p-1 text-slate-400 hover:text-primary"><Pencil size={12} /></button>
                    <button onClick={() => handleDelete(img.id)} className="p-1 text-slate-400 hover:text-red-500"><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {createPortal(
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] lightbox-backdrop flex items-center justify-center p-4"
              onClick={() => setSelectedImage(null)}
            >
              {/* Left Navigation Button */}
              <button
                className="absolute left-6 top-1/2 -translate-y-1/2 p-3 lightbox-btn border border-white/10 hover:border-primary rounded-full text-slate-300 hover:text-white shadow-[0_0_8px_rgba(43,161,185,0.2)] hover:shadow-[0_0_15px_rgba(43,161,185,0.5)] transition-all duration-300 z-20"
                onClick={showPrevImage}
              >
                <ChevronLeft size={24} />
              </button>

              {/* Right Navigation Button */}
              <button
                className="absolute right-6 top-1/2 -translate-y-1/2 p-3 lightbox-btn border border-white/10 hover:border-primary rounded-full text-slate-300 hover:text-white shadow-[0_0_8px_rgba(43,161,185,0.2)] hover:shadow-[0_0_15px_rgba(43,161,185,0.5)] transition-all duration-300 z-20"
                onClick={showNextImage}
              >
                <ChevronRight size={24} />
              </button>

              <div
                className="relative bg-black backdrop-blur-2xl border-2 border-[#2ba1b9]/20 w-[95vw] max-w-7xl p-2 rounded-xl shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className="absolute right-4 top-4 p-1.5 lightbox-btn border border-primary/30 hover:border-primary rounded-full text-white shadow-[0_0_8px_rgba(43,161,185,0.35)] hover:shadow-[0_0_15px_rgba(43,161,185,0.6)] transition-all duration-300 z-10"
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
  );
};

export default Gallery;
