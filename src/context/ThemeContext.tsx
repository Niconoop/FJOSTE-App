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

  root.style.setProperty('--primary', settings.accentColor);
  root.style.setProperty('--color-primary', settings.accentColor);
  root.style.setProperty('--color-amber-300', settings.accentColor);
  root.style.setProperty('--color-amber-400', settings.accentColor);
  root.style.setProperty('--color-amber-500', settings.accentColor);
  root.style.setProperty('--color-amber-600', settings.accentColor);
  root.style.setProperty('--app-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
  root.style.setProperty('--app-glow-rgb', `${glowRgb.r}, ${glowRgb.g}, ${glowRgb.b}`);
  root.style.setProperty('--primary-glow', `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, 0.35)`);
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
      console.warn('Failed to persist appearance settings:', e);
    }
  }, [appearance]);

  const updateAppearance = (updates: Partial<AppAppearanceSettings>) => {
    setAppearance(prev => {
      const next = { ...prev, ...updates };
      if (updates.accentColor && next.syncGlowWithAccent) {
        next.glowColor = updates.accentColor;
      }
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
