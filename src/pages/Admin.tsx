import { useState } from 'react';
import { Users, Key, Inbox, BarChart3, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Applications from './Applications';
import Reports from './Reports';
import UsersManagement from './UsersManagement';
import InviteCodes from './InviteCodes';
import VtcSettings from './VtcSettings';

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04
    }
  }
};

const itemVariants = {
  hidden: { opacity: 1, y: 12, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 220,
      damping: 24
    }
  }
};

const Admin = ({ onViewProfile }: { onViewProfile: (id: string | number) => void; onNavigate: (page: string) => void }) => {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState("users");

  const tabs = [
    { key: "users", label: "Benutzer", icon: Users },
    ...(isAdmin ? [{ key: "codes", label: "Einladungscodes", icon: Key }] : []),
    { key: "applications", label: "Bewerbungen", icon: Inbox },
    ...(isAdmin ? [{ key: "reports", label: "Berichte", icon: BarChart3 }] : []),
    ...(isAdmin ? [{ key: "vtc", label: "VTC Einstellungen", icon: Globe }] : []),
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      <motion.div variants={itemVariants} className="text-center mb-8">
        <span className="overline text-amber-400 mb-2 inline-block">Verwaltung</span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter text-white mt-2">Admin</h1>
        <p className="text-zinc-400 text-sm mt-3">Zentrale Verwaltung deines Unternehmens.</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex items-center justify-center w-fit mx-auto max-w-full gap-1 backdrop-blur-xl bg-zinc-900/50 rounded-2xl p-1.5 border-2 border-[#f59e0b]/20 overflow-x-auto no-scrollbar sticky top-0 z-10">
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              title={t.label}
              className={`px-3.5 sm:px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0 hover-glow ${
                active ? "bg-primary text-black shadow-[0_0_20px_rgba(245,158,11,0.3)]" : "text-slate-500 hover:text-white"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="hidden md:inline whitespace-nowrap">{t.label}</span>
            </button>
          );
        })}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 1, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
        >
          {tab === "users" && <UsersManagement onViewProfile={onViewProfile} />}
          {tab === "codes" && <InviteCodes />}
          {tab === "vtc" && <VtcSettings />}
          {tab === "applications" && <Applications />}
          {tab === "reports" && <Reports />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

export default Admin;

