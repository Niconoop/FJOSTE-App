import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Download,
  Trash2,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  MapPin,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  MAP_DOWNLOAD_TARGETS,
  type MapDownloadTarget,
  type CachedFileInfo,
  getCachedFilesList,
  deleteMapTileBlob,
  clearAllCachedFiles,
  downloadMapTileWithProgress,
} from '../utils/mapTileCache';

interface OfflineMapsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OfflineMapsModal: React.FC<OfflineMapsModalProps> = ({ isOpen, onClose }) => {
  const [cachedFiles, setCachedFiles] = useState<Record<string, CachedFileInfo>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ loaded: number; total: number; percent: number }>({
    loaded: 0,
    total: 0,
    percent: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  const loadStatus = async () => {
    try {
      const list = await getCachedFilesList();
      setCachedFiles(list);
    } catch (err) {
      console.error('Error fetching cache list:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStatus();
      setErrorMsg(null);
    }
  }, [isOpen]);

  const handleDownloadSingle = async (target: MapDownloadTarget) => {
    if (downloadingId) return;
    setErrorMsg(null);
    setDownloadingId(target.id);
    setProgress({ loaded: 0, total: 0, percent: 0 });

    const controller = new AbortController();
    setAbortController(controller);

    try {
      await downloadMapTileWithProgress(
        target.filename,
        prog => setProgress(prog),
        controller.signal,
      );
      await loadStatus();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg(`Fehler beim Herunterladen von ${target.name}: ${err.message || 'Netzwerkfehler'}`);
      }
    } finally {
      setDownloadingId(null);
      setAbortController(null);
    }
  };

  const handleDownloadAllCore = async () => {
    if (downloadingId) return;
    setErrorMsg(null);

    const queue = MAP_DOWNLOAD_TARGETS.filter(t => t.category === 'core' || t.category === 'hq');
    for (const target of queue) {
      if (cachedFiles[target.filename]) continue;
      setDownloadingId(target.id);
      setProgress({ loaded: 0, total: 0, percent: 0 });

      const controller = new AbortController();
      setAbortController(controller);

      try {
        await downloadMapTileWithProgress(
          target.filename,
          prog => setProgress(prog),
          controller.signal,
        );
        await loadStatus();
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setErrorMsg(`Fehler bei ${target.name}: ${err.message}`);
          break;
        }
      }
    }
    setDownloadingId(null);
    setAbortController(null);
  };

  const handleDelete = async (filename: string) => {
    await deleteMapTileBlob(filename);
    await loadStatus();
  };

  const handleClearAll = async () => {
    if (window.confirm('Möchtest du wirklich alle lokal gespeicherten Offline-Karten löschen?')) {
      await clearAllCachedFiles();
      await loadStatus();
    }
  };

  const totalCachedBytes = Object.values(cachedFiles).reduce((sum, f) => sum + f.size, 0);
  const totalCachedMb = (totalCachedBytes / (1024 * 1024)).toFixed(1);
  const coreHqCount = MAP_DOWNLOAD_TARGETS.filter(t => t.category === 'core' || t.category === 'hq').length;
  const cachedCoreHqCount = MAP_DOWNLOAD_TARGETS.filter(
    t => (t.category === 'core' || t.category === 'hq') && cachedFiles[t.filename],
  ).length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-zinc-950/90 border border-white/10 rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="relative p-6 pb-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                <HardDrive size={20} />
              </div>
              <div>
                <h3 className="font-unbounded font-black text-white text-base tracking-tight uppercase">
                  Offline-Karten Speicher
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Lade Vektorkarten & HQs direkt auf dein Gerät für blitzschnelles Laden ohne Serverabfragen.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Quick Summary Banner */}
          <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Lokal Belegt
                </p>
                <p className="text-base font-black text-white font-mono">{totalCachedMb} MB</p>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Basis + HQs
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`text-sm font-black ${
                      cachedCoreHqCount === coreHqCount ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {cachedCoreHqCount} / {coreHqCount} bereit
                  </span>
                  {cachedCoreHqCount === coreHqCount && (
                    <CheckCircle2 size={15} className="text-emerald-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadAllCore}
                disabled={downloadingId !== null || cachedCoreHqCount === coreHqCount}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Basis + HQs Laden</span>
              </button>
              {totalCachedBytes > 0 && (
                <button
                  onClick={handleClearAll}
                  disabled={downloadingId !== null}
                  className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                  title="Alle Offline-Karten löschen"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Active Download Progress */}
          {downloadingId && (
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1.5">
                <div className="flex items-center gap-2">
                  <RefreshCw size={13} className="animate-spin" />
                  <span>
                    Lade herunter:{' '}
                    {MAP_DOWNLOAD_TARGETS.find(t => t.id === downloadingId)?.name}...
                  </span>
                </div>
                <span>{progress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full bg-amber-400 transition-all duration-150"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-amber-200/70 mt-1">
                <span>
                  {(progress.loaded / (1024 * 1024)).toFixed(1)} MB von{' '}
                  {(progress.total / (1024 * 1024)).toFixed(1)} MB
                </span>
                {abortController && (
                  <button
                    onClick={() => abortController.abort()}
                    className="text-rose-400 hover:underline cursor-pointer"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error notice */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/20 border-b border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* List of files */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {MAP_DOWNLOAD_TARGETS.map(target => {
              const isCached = Boolean(cachedFiles[target.filename]);
              const cachedInfo = cachedFiles[target.filename];
              const isCurrentlyDownloading = downloadingId === target.id;

              return (
                <div
                  key={target.id}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isCached
                      ? 'bg-emerald-500/[0.04] border-emerald-500/30'
                      : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        target.category === 'hq'
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : target.category === '3d'
                          ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {target.category === 'hq' ? (
                        <MapPin size={18} />
                      ) : (
                        <Layers size={18} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-white">{target.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">
                          ~{target.approxSizeMb} MB
                        </span>
                        {isCached && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[9px] font-black text-emerald-400 flex items-center gap-1">
                            <Check size={10} />
                            Offline Bereit
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        {target.description}
                      </p>
                      {cachedInfo && (
                        <p className="text-[9px] font-mono text-slate-500 mt-1">
                          Gespeichert: {(cachedInfo.size / (1024 * 1024)).toFixed(1)} MB • Zuletzt
                          aktualisiert:{' '}
                          {new Date(cachedInfo.updatedAt).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isCached ? (
                      <button
                        onClick={() => handleDelete(target.filename)}
                        disabled={downloadingId !== null}
                        className="p-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-xl transition-all cursor-pointer"
                        title="Vom Gerät entfernen"
                      >
                        <Trash2 size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleDownloadSingle(target)}
                        disabled={downloadingId !== null}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all disabled:opacity-40 cursor-pointer"
                      >
                        <Download size={14} />
                        <span>Laden</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <div className="p-4 border-t border-white/10 bg-black/40 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              💡 Gespeicherte Kacheln werden von der App automatisch bevorzugt verwendet.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs transition-colors cursor-pointer"
            >
              Schließen
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
