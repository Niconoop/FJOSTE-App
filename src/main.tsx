import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.tsx'
import OverlayPage from './pages/Overlay'
import CarPlayPage from './pages/CarPlay'

const isOverlay = window.location.hash.startsWith('#overlay');
const isCarPlay = window.location.hash === '#overlay-carplay';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("CarPlay ErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-black text-white p-6 flex flex-col items-center justify-center text-center font-sans border-2 border-rose-500/50 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center mb-4 text-2xl font-black">
            ⚠️
          </div>
          <h2 className="text-lg font-black uppercase tracking-wider text-rose-400">CarPlay Display Fehler</h2>
          <p className="text-xs text-zinc-300 mt-2 max-w-md font-mono bg-zinc-900/90 p-3 rounded-xl border border-zinc-800 break-all">
            {this.state.error?.toString() || 'Ein unerwarteter Fehler ist aufgetreten.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all shadow-lg"
          >
            Neu Laden
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCarPlay ? (
      <ErrorBoundary>
        <CarPlayPage />
      </ErrorBoundary>
    ) : isOverlay ? (
      <OverlayPage />
    ) : (
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: 'custom-toast',
            },
          }}
        />
      </AuthProvider>
    )}
  </StrictMode>,
)
