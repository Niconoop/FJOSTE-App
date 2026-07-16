import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, Crown, Shield, Calendar, User, Headphones, Wrench, Route, Coins, Megaphone, Search 
} from 'lucide-react';
import { apiService } from '../services/api';
import { getAvatarUrl } from '../config';

const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05 }
  }
};

const staggerChild = {
  hidden: { opacity: 1, y: 15, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 200, damping: 20 } }
};

function RoleIcon({ isOwner, roleName }: { isOwner: boolean; roleName: string }) {
  const name = (roleName || "").toLowerCase();
  const iconColor = isOwner && !name.includes("stv") ? "text-amber-400" : "text-slate-400";

  if (name.includes("stv") || name.includes("stellv")) {
    return <Crown className="w-4 h-4 text-slate-400 shrink-0" />;
  }
  if (isOwner || name.includes("inhaber")) {
    return <Crown className="w-4 h-4 text-amber-400 shrink-0" />;
  }
  if (name.includes("event")) {
    return <Calendar className={`w-4 h-4 ${iconColor} shrink-0`} />;
  }
  if (name.includes("moderat") || name.includes("support")) {
    return <Headphones className={`w-4 h-4 ${iconColor} shrink-0`} />;
  }
  if (name.includes("media") || name.includes("marketing")) {
    return <Megaphone className={`w-4 h-4 ${iconColor} shrink-0`} />;
  }
  if (name.includes("technik") || name.includes("dev")) {
    return <Wrench className={`w-4 h-4 ${iconColor} shrink-0`} />;
  }
  if (name.includes("fahrer") || name.includes("driver") || name.includes("trucker")) {
    return <User className={`w-4 h-4 ${iconColor} shrink-0`} />;
  }
  return <Shield className={`w-4 h-4 ${iconColor} shrink-0`} />;
}

const Team = ({ onViewProfile }: { onViewProfile: (id: string | number) => void }) => {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const getAvatarUrlLocal = (url?: string | null) => getAvatarUrl(url || undefined);

  useEffect(() => {
    apiService.getTeam()
      .then(r => {
        const raw = r.data?.data || r.data || [];
        const normalized = (Array.isArray(raw) ? raw : []).map(m => {
          const ms = m.mergedStats || {};
          return {
            ...m,
            total_driven_distance_km: ms.distance || m.total_driven_distance_km || 0,
            total_revenue: ms.revenue || m.total_revenue || 0,
            total_cargo_mass_t: ms.cargo || m.total_cargo_mass_t || 0,
            level: ms.level || m.level || 0,
            points: ms.points || m.points || 0
          };
        });
        setMembers(normalized);
      })
      .catch(() => setError("Team konnte nicht geladen werden"))
      .finally(() => setLoading(false));
  }, []);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const s = search.toLowerCase();
    return members.filter(m => (m.name || m.username)?.toLowerCase().includes(s));
  }, [members, search]);

  const groups = useMemo(() => {
    const grouped: any = {};
    filteredMembers.forEach(m => {
      const rn = m.role?.name || "Mitglied";
      if (!grouped[rn]) {
        let color = m.role?.color || "#f59e0b";
        const nameLower = rn.toLowerCase();
        if (nameLower === "inhaber" || nameLower === "owner") color = "#F59E0B";
        else if (nameLower.includes("stellv") || nameLower.includes("stv")) color = "#94A3B8";

        grouped[rn] = {
          name: rn,
          order: m.role?.order ?? 999,
          color: color,
          isOwner: nameLower === "inhaber" || nameLower === "owner",
          members: []
        };
      }
      grouped[rn].members.push(m);
    });
    return Object.values(grouped).sort((a: any, b: any) => a.order - b.order);
  }, [filteredMembers]);

  const totalKm = useMemo(() => members.reduce((s, m) => s + (m.total_driven_distance_km || 0), 0), [members]);
  const totalRev = useMemo(() => members.reduce((s, m) => s + (m.total_revenue || 0), 0), [members]);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="text-center mb-16">
        <span className="overline text-amber-400 mb-2 inline-block">VTC Familie</span>
        <h1 className="text-5xl sm:text-6xl font-bold tracking-tighter text-white mt-2">
          Unsere Mitglieder
        </h1>
        {!loading && (
          <div className="flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-6">
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              <Users className="w-3.5 h-3.5 text-[#f59e0b]" /> {members.length} Mitglieder
            </span>
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              <Route className="w-3.5 h-3.5 text-[#f59e0b]" /> {Math.round(totalKm).toLocaleString("de-DE")} km
            </span>
            <span className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-white/10">
              <Coins className="w-3.5 h-3.5 text-emerald-400" /> {Math.round(totalRev).toLocaleString("de-DE")} €
            </span>
          </div>
        )}
      </div>

      {/* Search Bar */}
      {!loading && (
        <div className="max-w-md mx-auto mb-16 flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Mitglied suchen..."
              className="w-full bg-white/[0.03] border border-white/10 hover:border-white/20 text-white placeholder:text-slate-600 rounded-full h-12 pl-12 pr-4 focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition-all outline-none text-sm font-medium backdrop-blur-sm"
            />
            <Search className="w-5 h-5 text-zinc-500 absolute left-4 top-[14px]" />
          </div>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="px-6 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-400 hover:text-white uppercase font-black tracking-wider transition-colors"
            >
              Leeren
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-12 animate-pulse"
          >
            {[1, 2].map(g => (
              <div key={g} className="mb-14">
                <div className="flex items-center gap-3 mb-8"><div className="w-1 h-4 bg-amber-400/30 rounded-full" /><div className="h-6 w-40 bg-zinc-950 rounded" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {[1, 2, 3, 4].map(i => (
                    <div key={i} className="bg-[#0b0b0c]/40 border border-zinc-900 rounded-2xl p-5 space-y-4 h-32" />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="frosted-card border border-white/5 rounded-2xl p-8 text-center max-w-md mx-auto"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            variants={staggerContainer}
            className="space-y-8"
          >
            {filteredMembers.length === 0 ? (
              <div className="text-center py-20 opacity-30 select-none">
                <Search className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                <p className="font-['Unbounded'] text-xs font-bold uppercase tracking-widest">Keine Mitglieder gefunden</p>
              </div>
            ) : (
              groups.map((group: any) => (
                <section key={group.name} className="mb-16">
                  {/* Left-Border Section Header */}
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-1 h-4 bg-amber-400 rounded-full" />
                    <RoleIcon isOwner={group.isOwner} roleName={group.name} />
                    <h2 className="text-base font-black text-white uppercase tracking-widest font-unbounded">
                      {group.name}
                    </h2>
                    <span className="text-xs text-zinc-500 font-bold ml-1">({group.members.length})</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {group.members.map((member: any) => (
                      <motion.div
                        key={member.id}
                        variants={staggerChild}
                        whileHover={{ y: -4, scale: 1.015 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => onViewProfile(member.id)}
                        className="group transition-all duration-300 border border-white/5 hover:border-amber-400/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)] p-5 cursor-pointer flex flex-col frosted-card rounded-2xl h-full space-y-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative shrink-0">
                            <div className="w-14 h-14 rounded-full border-2 border-zinc-800 group-hover:border-amber-400/50 transition-colors duration-300 overflow-hidden bg-zinc-950 flex items-center justify-center text-white font-bold text-lg">
                              {getAvatarUrlLocal(member.avatar_url) ? (
                                <img src={getAvatarUrlLocal(member.avatar_url)!} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <span>{member.name?.charAt(0)?.toUpperCase() || "?"}</span>
                              )}
                            </div>
                            {group.isOwner && (
                              <div className="absolute -bottom-1 -right-1 bg-zinc-950 border border-zinc-900 rounded-full p-1 shadow-md">
                                <Crown className="w-3.5 h-3.5 text-amber-400" />
                              </div>
                            )}
                          </div>

                          <div className="overflow-hidden">
                            <h3 className="text-base font-bold text-white truncate group-hover:text-amber-400 transition-colors duration-200">
                              {member.name}
                            </h3>
                            {member.role && (
                              <span
                                className={`text-xs font-semibold uppercase tracking-wider truncate block text-zinc-500 mt-0.5 ${group.isOwner ? "text-amber-400/80" : ""}`}
                              >
                                {member.role.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stats block at the bottom */}
                        <div className="w-full mt-auto pt-4 border-t border-zinc-900/60 flex items-center justify-between text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1 select-none">
                              <Route className="w-3 h-3 text-amber-400/70" /> Strecke
                            </span>
                            <span className="font-bold text-zinc-300">
                              {member.total_driven_distance_km ? `${Math.round(member.total_driven_distance_km).toLocaleString("de-DE")} km` : "0 km"}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 items-end">
                            <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black flex items-center gap-1 select-none">
                              <Coins className="w-3 h-3 text-amber-400/70" /> Umsatz
                            </span>
                            <span className="font-bold text-zinc-300">
                              {member.total_revenue ? `€${Math.round(member.total_revenue).toLocaleString("de-DE")}` : "€0"}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </section>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Team;

