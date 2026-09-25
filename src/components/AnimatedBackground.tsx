import React from 'react';
import { useTheme, hexToRgbValues } from '../context/ThemeContext';

interface AnimatedBackgroundProps {
  activePage?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ activePage }) => {
  const isHidden = activePage === 'map';
  const { appearance, effectiveGlowColor } = useTheme();

  if (isHidden) return null;

  const { r, g, b } = hexToRgbValues(effectiveGlowColor);
  const factor = (appearance.glowIntensity || 90) / 100;
  const isCustomImage = appearance.backgroundType === 'custom' && !!appearance.customBgImage;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#050608] select-none">
      {/* Custom Background Image Mode */}
      {isCustomImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-300 pointer-events-none"
            style={{
              backgroundImage: `url(${appearance.customBgImage})`,
              filter: appearance.bgBlur > 0 ? `blur(${appearance.bgBlur}px)` : 'none',
              transform: appearance.bgBlur > 0 ? 'scale(1.06)' : 'none',
            }}
          />
          {/* Customizable Dark Dimming Overlay */}
          <div
            className="absolute inset-0 pointer-events-none transition-colors duration-300"
            style={{
              backgroundColor: `rgba(0, 0, 0, ${(appearance.bgDim || 65) / 100})`,
            }}
          />
          {/* Subtle Ambient Accent Glow at top */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[90vw] h-[350px] rounded-full pointer-events-none opacity-60"
            style={{
              background: `radial-gradient(ellipse at top, rgba(${r}, ${g}, ${b}, ${0.12 * factor}) 0%, transparent 70%)`,
              filter: 'blur(70px)',
            }}
          />
        </>
      ) : (
        /* Atmospheric Glow Mode (keeps classic look, customized glow color) */
        <>
          {/* Primary Cabin Glow (Header Top Center) */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[450px] rounded-full pointer-events-none opacity-90 transition-all duration-500"
            style={{
              background: `radial-gradient(ellipse at top, rgba(${r}, ${g}, ${b}, ${0.22 * factor}) 0%, rgba(${Math.round(r * 0.85)}, ${Math.round(g * 0.65)}, ${Math.round(b * 0.2)}, ${0.08 * factor}) 50%, transparent 80%)`,
              filter: 'blur(70px)',
            }}
          />

          {/* Warm Ambient Glow (Top-Right) */}
          <div
            className="absolute -top-[15%] -right-[10%] w-[55vw] h-[55vw] max-w-[850px] max-h-[850px] rounded-full pointer-events-none transition-all duration-500"
            style={{
              background: `radial-gradient(circle, rgba(${r}, ${g}, ${b}, ${0.16 * factor}) 0%, rgba(${r}, ${g}, ${b}, ${0.03 * factor}) 50%, transparent 75%)`,
              filter: 'blur(80px)',
            }}
          />

          {/* Highway Headlight Mist Illumination (Bottom-Left) */}
          <div
            className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[900px] rounded-full pointer-events-none transition-all duration-500"
            style={{
              background: `radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(${r}, ${g}, ${b}, ${0.05 * factor}) 45%, transparent 75%)`,
              filter: 'blur(85px)',
            }}
          />

          {/* Rear Truck Taillight Soft Red Accent Glow (Bottom-Right) */}
          <div
            className="absolute -bottom-[15%] -right-[10%] w-[45vw] h-[45vw] max-w-[700px] rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.015) 50%, transparent 75%)',
              filter: 'blur(90px)',
            }}
          />
        </>
      )}

      {/* Smooth Dark Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(3, 4, 6, 0.85) 100%)',
        }}
      />
    </div>
  );
};