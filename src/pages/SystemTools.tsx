import { Server, Database, ExternalLink, ChevronRight } from 'lucide-react';

const SystemTools = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-1">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-amber-400 rounded-full" />
          <h1 className="font-unbounded text-2xl font-bold text-amber-400 uppercase tracking-tight italic">System-Tools</h1>
        </div>
        <p className="text-slate-500 font-medium mt-1 uppercase text-[10px] tracking-widest">Direkter Zugriff auf die Server- und Datenbank-Infrastruktur von Open Pipe Club.</p>
      </div>

      <div className="frosted-card p-8 backdrop-blur-xl shadow-xl hover-glow transition-all border-2 border-[#f59e0b]/20 bg-[#000000]">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-4 bg-amber-400 rounded-full" />
            <h2 className="font-unbounded text-sm font-bold text-amber-400 uppercase tracking-widest leading-none">Infrastruktur</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">Server, Datenbanken & interne Verwaltung.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="https://pm2.openpipeclub.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-5 p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-amber-400/50 transition-all group hover-glow"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Server size={24} className="text-[#f59e0b]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-tight group-hover:text-primary transition-colors">Server Manager</h3>
                <ExternalLink size={12} className="text-slate-600 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PM2 Prozesse überwachen & verwalten</p>
              <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-2">pm2.openpipeclub.com</p>
            </div>
          </a>

          <a
            href="https://db.openpipeclub.com/_/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-5 p-6 bg-black/40 border border-emerald-500/20 rounded-2xl hover:border-emerald-500/50 transition-all group hover-glow"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Database size={24} className="text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-tight group-hover:text-emerald-400 transition-colors">Datenbank Panel</h3>
                <ExternalLink size={12} className="text-slate-600 group-hover:text-emerald-400 transition-colors" />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PocketBase Verwaltungsoberfläche</p>
              <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-2">db.openpipeclub.com</p>
            </div>
          </a>

          <div
            onClick={() => onNavigate('database')}
            className="flex items-start gap-5 p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-amber-400/50 hover:bg-amber-400/5 transition-all group cursor-pointer hover-glow"
          >
            <div className="w-14 h-14 rounded-2xl bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Database size={24} className="text-[#f59e0b]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-unbounded text-sm font-bold text-white uppercase tracking-tight group-hover:text-[#f59e0b] transition-colors">Interne Datenbank</h3>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-[#f59e0b] transition-colors" />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Integrierten Datenbank-Viewer öffnen</p>
              <p className="text-[9px] font-bold text-slate-700 uppercase tracking-widest mt-2">Direkt im Drivers Hub verwalten</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemTools;
