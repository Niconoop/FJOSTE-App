import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Crown, Shield, Calendar, User, Headphones, Wrench, Route, Coins } from 'lucide-react';
import { apiService } from '../services/api';
import { getAvatarUrl } from '../config';

const roleIcon = (name: string) => {
  const n = (name || "").toLowerCase();
  if (n.includes("stv") || n.includes("stellv")) return Crown;
  if (n.includes("inhaber") || n.includes("owner")) return Crown;
  if (n.includes("event")) return Calendar;
  if (n.includes("moderat") || n.includes("support")) return Headphones;
  if (n.includes("technik") || n.includes("dev")) return Wrench;
  if (n.includes("fahrer") || n.includes("driver")) return User;
  return Shield;
};

const Team = ({ onViewProfile }: { onViewProfile: (id: string | number) => void }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiService.getTeam().then(r => {
      const data = r.data?.data || r.data || [];
      setMembers(Array.isArray(data) ? data : []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const grouped: any = {};
  members.forEach(m => {
    const rn = m.role?.name || "Mitglied";
    if (!grouped[rn]) {
      let color = m.role?.color || "#22D1EE";
      const nameLower = rn.toLowerCase();
      if (nameLower === "inhaber" || nameLower === "owner") color = "#F59E0B"; // Gold
      else if (nameLower.includes("stellv") || nameLower.includes("stv")) color = "#94A3B8"; // Silver
      
      grouped[rn] = { 
        name: rn, 
        order: m.role?.order ?? 999, 
        color: color, 
        isOwner: nameLower === "inhaber" || nameLower === "owner",
        isDeputy: nameLower.includes("stellv") || nameLower.includes("stv"),
        members: [] 
      };
    }
    grouped[rn].members.push(m);
  });
  
  const groups = Object.values(grouped).sort((a: any, b: any) => a.order - b.order);
  const totalKm = members.reduce((s, m) => s + (m.total_driven_distance_km || 0), 0);
  const totalRev = members.reduce((s, m) => s + (m.total_revenue || 0), 0);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-unbounded text-2xl font-bold text-white tracking-tight">Team</h1>
        {!loading && (
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5"><Users className="w-3 h-3 text-primary" /> {members.length} Mitglieder</span>
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5"><Route className="w-3 h-3 text-primary" /> {Math.round(totalKm).toLocaleString("de-DE")} km</span>
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5"><Coins className="w-3 h-3 text-emerald-400" /> {(totalRev / 1000).toFixed(0)}k $</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <div key={i} className="h-24 bg-black/40 rounded-[24px] animate-pulse" />)}
        </div>
      ) : groups.map((g: any) => {
        const Icon = roleIcon(g.name);
        return (
          <div key={g.name} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${g.color}15` }}>
                <Icon className="w-4 h-4" style={{ color: g.color }} />
              </div>
              <h2 className="font-unbounded text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: g.color }}>
                {g.name} <span className="text-slate-600 ml-1">({g.members.length})</span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {g.members.map((m: any) => (
                <motion.div 
                  key={m.id} 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onViewProfile(m.id)}
                  className="flex items-center gap-4 glass-card !p-4 hover-glow transition-all cursor-pointer group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-black border-2 border-[#2ba1b9]/20 flex items-center justify-center text-white font-black shrink-0 overflow-hidden group-hover:border-primary transition-colors">
                    {getAvatarUrl(m.avatar_url) ? <img src={getAvatarUrl(m.avatar_url)!} className="w-full h-full object-cover" /> : m.name?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate mb-1">{m.name}</p>
                    <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-tighter italic">
                      <span className="text-primary">Lv.{m.mergedStats?.level || m.level || 1}</span>
                      <span className="text-slate-400 flex items-center gap-1">
                        <Route className="w-2.5 h-2.5" />
                        {(m.mergedStats?.distance || m.total_driven_distance_km || 0).toLocaleString("de-DE")} km
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-[9px] font-bold text-slate-600">
                      <span className="text-emerald-500/80">
                        {((m.mergedStats?.revenue || m.total_revenue || 0) / 1000).toFixed(0)}k $
                      </span>
                      <span>
                        {Math.round(m.mergedStats?.cargo || m.total_cargo_mass_t || 0)} T
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Team;
