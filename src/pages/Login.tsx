import { useState } from 'react';
import { motion } from 'framer-motion';
import { LogIn, Loader2, User as UserIcon, Lock, X, Minus, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { toast } from 'sonner';

const Login = ({ onSwitchToRegister }: { onSwitchToRegister: () => void }) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(username, password);
      toast.success("Erfolgreich angemeldet!");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Login fehlgeschlagen. Prüfe deine Zugangsdaten.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-6 bg-[#000000]">
      <div className="absolute top-0 left-0 right-0 h-16 z-20 flex justify-end items-center px-6">
        <div className="absolute inset-0 -z-10" style={{ WebkitAppRegion: 'drag' }} />
        <div className="flex items-center gap-1">
          <button
            onClick={() => { try { (window as any).electronAPI.minimizeWindow() } catch (e) {} }}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Minimieren"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => { try { (window as any).electronAPI.maximizeWindow() } catch (e) {} }}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Vollbild"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => { try { (window as any).electronAPI.closeWindow() } catch (e) {} }}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 1, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src="logo.png" alt="Open Pipe Club Logo" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg" />
          <h1 className="text-3xl font-bold tracking-tighter text-white font-unbounded">
            Drivers Hub Login
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Melde dich an, um fortzufahren.</p>
        </div>

        <form onSubmit={handleSubmit} className="frosted-card !rounded-[24px] !p-8 space-y-6 border-2 border-[#f59e0b]/20 bg-[#000000]">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <UserIcon size={11} className="text-amber-400/60" /> Benutzername
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-400 transition-colors">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300"
                  placeholder="Dein Benutzername"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Lock size={11} className="text-amber-400/60" /> Passwort
                </label>
                <button type="button" onClick={() => toast("Passwort vergessen?", { description: "Bitte wende dich an die Personalabteilung oder einen Administrator im Discord, um dein Passwort zurücksetzen zu lassen." })} className="text-[9px] font-black text-slate-500 hover:text-amber-400 uppercase tracking-widest transition-colors">
                  Passwort vergessen?
                </button>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-amber-400 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:border-amber-400/40 focus:bg-white/[0.05] outline-none transition-all duration-300"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-black rounded-2xl py-3.5 font-black text-[10px] uppercase tracking-widest hover:shadow-[0_0_30px_rgba(245,158,11,0.3)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={16} /> Anmelden</>}
          </motion.button>

          <div className="text-center pt-6 border-t border-white/5">
            <p className="text-xs text-slate-500 font-medium">
              Du hast keinen Account?{' '}
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest text-[10px] transition-colors"
              >
                Jetzt registrieren
              </button>
            </p>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
