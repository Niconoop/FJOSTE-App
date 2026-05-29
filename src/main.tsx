import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          style: {
            background: 'rgba(10, 10, 10, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f8fafc',
          },
          className: 'glass-card',
        }}
      />
    </AuthProvider>
  </StrictMode>,
)
