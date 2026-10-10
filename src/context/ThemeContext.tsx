import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppAppearanceSettings {
  accentColor: string;
  backgroundType: 'glow' | 'custom';
  glowColor: string;
  syncGlowWithAccent: boolean;
  glowIntensity: number; // 30 - 100
  customBgImage: string; // URL or base64 data URL
  bgDim: number; // 10 - 90
  bgBlur: number; // 0 - 25
}

export const DEFAULT_APPEARANCE: AppAppearanceSettings = {
  accentColor: '#f59e0b',
  backgroundType: 'glow',
  glowColor: '#f59e0b',
  syncGlowWithAccent: true,
  glowIntensity: 90,
  customBgImage: '',
  bgDim: 65,
  bgBlur: 0,
};

interface ThemeContextType {
  appearance: AppAppearanceSettings;
  updateAppearance: (updates: Partial<AppAppearanceSettings>) => void;
  resetAppearance: () => void;
  effectiveGlowColor: string;
}

const STORAGE_KEY = 'openpipeclub_app_appearance';

export const hexToRgbValues = (hex: string): { r: number; g: number; b: number } => {
  let cleaned = hex.replace(/^#/, '');
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }
  if (cleaned.length !== 6) {
    return { r: 245, g: 158, b: 11 };
  }
  const r = parseInt(cleaned.substring(0, 2), 16);
  const g = parseInt(cleaned.substring(2, 4), 16);
  const b = parseInt(cleaned.substring(4, 6), 16);
  return {
    r: isNaN(r) ? 245 : r,
    g: isNaN(g) ? 158 : g,
    b: isNaN(b) ? 11 : b,
  };
};

export const applyThemeCssVariables = (settings: AppAppearanceSettings) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  const accentRgb = hexToRgbValues(settings.accentColor);
  const effectiveGlow = settings.syncGlowWithAccent ? settings.accentColor : settings.glowColor;
  const glowRgb = hexToRgbValues(effectiveGlow);

  // Compute optimal contrast foreground color (white on dark accents like purple/blue, black on bright accents like yellow/amber)
  const luminance = (0.299 * accentRgb.r + 0.587 * accentRgb.g + 0.114 * accentRgb.b) / 255;
  const primaryForeground = luminance > 0.55 ? '#020617' : '#ffffff';

  root.style.setProperty('--primary', settings.accentColor);
  root.style.setProperty('--primary-foreground', primaryForeground);
  root.style.setProperty('--color-primary', settings.accentColor);
  root.style.setProperty('--color-amber-300', settings.accentColor);
  root.style.setProperty('--color-amber-400', settings.accentColor);
  root.style.setProperty('--color-amber-500', settings.accentColor);
  root.style.setProperty('--color-amber-600', settings.accentColor);
  root.style.setProperty('--app-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
  const glowAlpha = (settings.glowIntensity || 90) / 100;
  root.style.setProperty('--primary-glow', `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${(0.45 * glowAlpha).toFixed(2)})`);
  root.style.setProperty('--primary-glow-strong', `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${(0.85 * glowAlpha).toFixed(2)})`);
  root.style.setProperty('--primary-glow-subtle', `rgba(${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}, ${(0.2 * glowAlpha).toFixed(2)})`);
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appearance, setAppearance] = useState<AppAppearanceSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_APPEARANCE, ...parsed };
      }
    } catch (e) {
      console.warn('Failed to load appearance settings from localStorage:', e);
    }
    return DEFAULT_APPEARANCE;
  });

  const effectiveGlowColor = appearance.syncGlowWithAccent
    ? appearance.accentColor
    : appearance.glowColor;

  useEffect(() => {
    applyThemeCssVariables(appearance);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance));
    } catch (e) {
      try {
        // If 6.5MB image exceeds localStorage quota (5MB limit in Chromium), save without image
        const safeData = { ...appearance, customBgImage: '' };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
      } catch (e2) {}
    }
  }, [appearance]);

  // Synchronize appearance changes across Electron processes and web windows
  useEffect(() => {
    try {
      const electron = typeof window !== 'undefined' && (window as any).require ? (window as any).require('electron') : null;
      if (electron?.ipcRenderer) {
        electron.ipcRenderer.invoke('get-app-appearance').then((data: any) => {
          if (data && typeof data === 'object' && (data.customBgImage || data.accentColor)) {
            setAppearance(prev => ({
              ...prev,
              ...data,
              customBgImage: data.customBgImage || prev.customBgImage,
            }));
            applyThemeCssVariables({ ...DEFAULT_APPEARANCE, ...data });
          }
        }).catch(() => {});

        const listener = (_: any, data: any) => {
          if (data && typeof data === 'object') {
            setAppearance(prev => {
              const nextBg = data.customBgImage || prev.customBgImage;
              if (
                prev.customBgImage === nextBg &&
                prev.accentColor === data.accentColor &&
                prev.bgBlur === data.bgBlur &&
                prev.bgDim === data.bgDim &&
                prev.backgroundType === data.backgroundType &&
                prev.glowColor === data.glowColor &&
                prev.glowIntensity === data.glowIntensity
              ) {
                return prev;
              }
              return { ...prev, ...data, customBgImage: nextBg };
            });
            applyThemeCssVariables({ ...DEFAULT_APPEARANCE, ...data });
          }
        };
        electron.ipcRenderer.on('app-appearance-updated', listener);
        return () => {
          electron.ipcRenderer.removeListener('app-appearance-updated', listener);
        };
      } else if (typeof window !== 'undefined') {
        // Web mode fallback: fetch appearance from server state
        const apiPort = window.location.port === '5173' ? '8383' : (window.location.port || '8383');
        const apiBase = `${window.location.protocol}//${window.location.hostname}:${apiPort}`;
        fetch(`${apiBase}/api/carplay/state`)
          .then(res => res.json())
          .then(data => {
            if (data?.appearance && typeof data.appearance === 'object') {
              setAppearance(prev => ({
                ...prev,
                ...data.appearance,
                customBgImage: data.appearance.customBgImage || prev.customBgImage,
              }));
              applyThemeCssVariables({ ...DEFAULT_APPEARANCE, ...data.appearance });
            }
          })
          .catch(() => {});
      }
    } catch (err) {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // Never erase an existing custom background in memory when localStorage has safeData without the heavy image
          setAppearance(prev => {
            const nextBg = (parsed.customBgImage && parsed.customBgImage.trim() !== '')
              ? parsed.customBgImage
              : prev.customBgImage;
            return { ...prev, ...parsed, customBgImage: nextBg };
          });
          applyThemeCssVariables({ ...DEFAULT_APPEARANCE, ...parsed });
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const updateAppearance = (updates: Partial<AppAppearanceSettings>) => {
    setAppearance(prev => {
      const next = { ...prev, ...updates };
      if (updates.accentColor && next.syncGlowWithAccent) {
        next.glowColor = updates.accentColor;
      }
      try {
        const electron = typeof window !== 'undefined' && (window as any).require ? (window as any).require('electron') : null;
        if (electron?.ipcRenderer) {
          electron.ipcRenderer.send('save-app-appearance', next);
        }
      } catch (err) {}
      return next;
    });
  };

  const resetAppearance = () => {
    setAppearance(DEFAULT_APPEARANCE);
  };

  return (
    <ThemeContext.Provider
      value={{
        appearance,
        updateAppearance,
        resetAppearance,
        effectiveGlowColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
};
