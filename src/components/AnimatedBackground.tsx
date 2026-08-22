import React from 'react';

interface AnimatedBackgroundProps {
  activePage?: string;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({ activePage }) => {
  const isHidden = activePage === 'map';

  if (isHidden) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0 bg-[#050608] select-none">
      {/* Primary Dutch Amber Poppy Cabin Glow (Header Top Center) */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[450px] rounded-full pointer-events-none opacity-90"
        style={{
          background: 'radial-gradient(ellipse at top, rgba(245, 158, 11, 0.2) 0%, rgba(234, 88, 12, 0.07) 50%, transparent 80%)',
          filter: 'blur(70px)'
        }}
      />

      {/* Warm Amber Double-Burner Ambient Glow (Top-Right) */}
      <div 
        className="absolute -top-[15%] -right-[10%] w-[55vw] h-[55vw] max-w-[850px] max-h-[850px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.03) 50%, transparent 75%)',
          filter: 'blur(80px)'
        }}
      />

      {/* Highway Headlight Mist Illumination (Bottom-Left) */}
      <div 
        className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[900px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(245, 158, 11, 0.04) 45%, transparent 75%)',
          filter: 'blur(85px)'
        }}
      />

      {/* Rear Truck Taillight Soft Red Accent Glow (Bottom-Right) */}
      <div 
        className="absolute -bottom-[15%] -right-[10%] w-[45vw] h-[45vw] max-w-[700px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.015) 50%, transparent 75%)',
          filter: 'blur(90px)'
        }}
      />

      {/* Smooth Dark Vignette */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(3, 4, 6, 0.85) 100%)'
        }}
      />
    </div>
  );
};