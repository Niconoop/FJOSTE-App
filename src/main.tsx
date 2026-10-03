import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, DEFAULT_APPEARANCE, applyThemeCssVariables } from './context/ThemeContext'
import './index.css'
import App from './App.tsx'
import OverlayPage from './pages/Overlay'
import CarPlayPage from './pages/CarPlay'

// Apply saved theme immediately to documentElement to avoid any color flicker
try {
  const savedTheme = localStorage.getItem('openpipeclub_app_appearance');
  if (savedTheme) {
    applyThemeCssVariables({ ...DEFAULT_APPEARANCE, ...JSON.parse(savedTheme) });
  } else {
    applyThemeCssVariables(DEFAULT_APPEARANCE);
  }
} catch (e) {}

function getRouteType(): 'carplay' | 'overlay' | 'app' {
  const hash = window.location.hash.toLowerCase();
  const path = window.location.pathname.toLowerCase();
  const search = window.location.search.toLowerCase();

  if (
    window.location.port === '8383' ||
    hash === '#overlay-carplay' ||
    hash === '#carplay' ||
    hash === '#/carplay' ||
    hash === '#/overlay-carplay' ||
    path.endsWith('/carplay') ||
    path.endsWith('/overlay-carplay') ||
    search.includes('carplay')
  ) {
    return 'carplay';
  }

  if (
    hash.startsWith('#overlay') ||
    path.endsWith('/overlay') ||
    search.includes('overlay')
  ) {
    return 'overlay';
  }

  return 'app';
}

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

function MainApp() {
  const [route, setRoute] = React.useState<'carplay' | 'overlay' | 'app'>(() => getRouteType());

  React.useEffect(() => {
    const handleLocationChange = () => {
      setRoute(getRouteType());
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  if (route === 'carplay') {
    return (
      <ThemeProvider>
        <ErrorBoundary>
          <CarPlayPage />
        </ErrorBoundary>
      </ThemeProvider>
    );
  }

  if (route === 'overlay') {
    return (
      <ThemeProvider>
        <OverlayPage />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MainApp />
  </StrictMode>,
)

