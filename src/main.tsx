import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.tsx'
import OverlayPage from './pages/Overlay'

const isOverlay = window.location.hash.startsWith('#overlay');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isOverlay ? (
      <OverlayPage />
    ) : (
      <AuthProvider>
        <App />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--glass-card-bg)',
              backdropFilter: 'blur(20px)',
              border: '2px solid var(--border)',
              color: 'var(--foreground)',
            },
            className: 'glass-card',
          }}
        />
      </AuthProvider>
    )}
  </StrictMode>,
)
