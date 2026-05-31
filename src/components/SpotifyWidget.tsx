import React, { useState, useEffect } from 'react';
import { Music, Play, Pause } from 'lucide-react';

interface SmtcData {
  title: string;
  artist: string;
  album: string;
  progress: number;
  duration: number;
  isPlaying: boolean;
  source: string;
  thumb: string; // base64 encoded album art
}

interface SpotifyWidgetProps {
  themeClasses: {
    card: string;
    textMuted: string;
    textActive: string;
    primaryAccent: string;
    borderAccent: string;
    barBg: string;
    barFill: string;
    glow: string;
  };
  isLocked?: boolean;
}

const SpotifyWidget: React.FC<SpotifyWidgetProps> = ({ themeClasses: c, isLocked = true }) => {
  const [data, setData] = useState<SmtcData | null>(null);

  useEffect(() => {
    let ipcRenderer: any = null;

    try {
      const electron = (window as any).require('electron');
      ipcRenderer = electron.ipcRenderer;
    } catch (e) {
      return;
    }

    const handler = (_event: any, newData: SmtcData) => {
      setData(newData?.title ? newData : null);
    };
    ipcRenderer.on('smtc-update', handler);

    ipcRenderer.invoke('get-smtc-media').then((d: SmtcData | null) => {
      if (d?.title) setData(d);
    }).catch(() => {});

    return () => {
      ipcRenderer.removeListener('smtc-update', handler);
    };
  }, []);

  const formatTime = (ms: number) => {
    if (!ms || ms <= 0) return '0:00';
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent =
    data && data.duration > 0 ? Math.min(100, (data.progress / data.duration) * 100) : 0;

  const getSourceName = (source: string) => {
    if (!source) return 'Musik';
    if (source.toLowerCase().includes('spotify')) return 'Spotify';
    if (source.toLowerCase().includes('chrome')) return 'Chrome';
    if (source.toLowerCase().includes('firefox')) return 'Firefox';
    if (source.toLowerCase().includes('msedge')) return 'Edge';
    if (source.toLowerCase().includes('youtube')) return 'YouTube';
    return source.split('!')[0].split('.').pop() || 'Musik';
  };

  const albumArtSrc = data?.thumb ? `data:image/jpeg;base64,${data.thumb}` : null;

  if (!data || !data.title) {
    return (
      <div className="flex-1 p-3 flex items-center justify-center gap-2 text-slate-500 text-[10px] uppercase font-bold tracking-wider">
        <Music size={12} />
        Kein Musik aktiv
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 flex flex-col gap-2 min-w-0 text-white">
      {/* Source label */}
      <div className="flex items-center gap-1.5">
        <Music size={9} className={c.textMuted} />
        <span className={`${c.textMuted} text-[8px] font-black uppercase tracking-widest`}>
          {getSourceName(data.source)}
        </span>
      </div>

      {/* Album Art + Track Info */}
      <div className="flex items-start gap-2.5">
        {/* Album Art */}
        {albumArtSrc ? (
          <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10 shadow-lg">
            <img
              src={albumArtSrc}
              alt={data.album}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-lg shrink-0 border border-white/10 bg-white/5 flex items-center justify-center">
            <Music size={18} className={c.textMuted} />
          </div>
        )}

        {/* Title / Artist / Play indicator */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-1 mb-0.5">
            {data.isPlaying ? (
              <Play size={9} className="text-emerald-400 fill-emerald-400 shrink-0" />
            ) : (
              <Pause size={9} className={`${c.textMuted} shrink-0`} />
            )}
            <p className={`${c.textActive} text-xs font-bold truncate leading-tight`}>
              {data.title}
            </p>
          </div>
          {data.artist && (
            <p className={`${c.textMuted} text-[9px] font-medium truncate`}>
              {data.artist}
            </p>
          )}
          {data.album && (
            <p className={`${c.textMuted} text-[8px] truncate opacity-50 mt-0.5`}>
              {data.album}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {data.duration > 0 && (
        <div className="space-y-0.5">
          <div className={`h-1 w-full rounded-full overflow-hidden ${c.barBg}`}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${c.barFill}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[8px] text-slate-400 font-medium">
            <span>{formatTime(data.progress)}</span>
            <span>{formatTime(data.duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyWidget;
