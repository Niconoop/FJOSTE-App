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
      <div className="absolute top-0 left-0 right-0 h-16 drag z-20 flex justify-end items-center px-6">
        <div className="flex items-center gap-1 no-drag">
          <button
            onClick={() => { try { window.require('electron').ipcRenderer.send('window-minimize') } catch (e) { } }}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Minimieren"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => { try { window.require('electron').ipcRenderer.send('window-maximize') } catch (e) { } }}
            className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            title="Vollbild"
          >
            <Square size={16} />
          </button>
          <button
            onClick={() => { try { window.require('electron').ipcRenderer.send('window-close') } catch (e) { } }}
            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            title="Schließen"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <AnimatedBackground />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-10">
          <img src="logo.png" alt="FJOSTE Logo" className="w-40 h-40 object-contain mx-auto mb-6 drop-shadow-[0_0_40px_rgba(43,161,185,0.6)]" />
          <h1 className="font-unbounded text-3xl font-black text-white uppercase tracking-tighter italic">FJOSTE App</h1>
          <p className="text-slate-500 font-medium mt-2">Drivers Hub • Tracker</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card !p-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-2 block">Benutzername</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
                  placeholder="Benutzernamen eingeben"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 mb-2 block">Passwort</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-primary/50 focus:bg-white/[0.05] transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => toast("Passwort vergessen?", { description: "Bitte wende dich an die Personalabteilung oder einen Administrator im Discord, um dein Passwort zurücksetzen zu lassen." })} className="text-xs text-slate-500 hover:text-primary transition-colors">
                  Passwort vergessen?
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-primary hover:bg-primary/90 text-black font-black uppercase tracking-widest py-4 rounded-2xl shadow-[0_0_20px_rgba(34,209,238,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isSubmitting ? <Loader2 size={24} className="animate-spin mx-auto" /> : <div className="flex items-center justify-center gap-2"><LogIn size={20} /> Anmelden</div>}
          </button>

          <p className="text-center text-xs text-slate-500 font-medium">
            Du hast keinen Account?{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-primary hover:underline"
            >
              Registrieren
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
