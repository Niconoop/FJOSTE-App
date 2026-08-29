import React from 'react';
import type { NextManeuver } from '../utils/navInstructionEngine';

interface CarPlayNavOverlayProps {
  primary: NextManeuver | null;
  upcoming?: Array<{ dir: 'left' | 'straight' | 'right'; distText: string }>;
  accentColor?: string;
  fullWidth?: boolean;
}

export const CarPlayNavOverlay: React.FC<CarPlayNavOverlayProps> = ({
  primary,
  upcoming = [],
  accentColor = '#2563eb',
  fullWidth = false,
}) => {
  if (!primary) return null;

  const dir = primary.direction;
  const maneuverType = primary.type || 'turn';

  // Determine icon block background color (No green accents, strictly blue or amber for roundabouts)
  let iconBgColor = '#2563eb'; // Default Royal Blue
  if (maneuverType === 'roundabout' || maneuverType === 'u-turn') {
    iconBgColor = '#d97706'; // Amber / Orange
  } else {
    iconBgColor = '#2563eb'; // Royal Blue for turns, exits, entries
  }

  const renderArrow = (direction: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right', size = 16) => {
    if (direction === 'left') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 11L5 7l4-4" />
          <path d="M5 7h11a4 4 0 0 1 4 4v7" />
        </svg>
      );
    }
    if (direction === 'slight-left') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 6L4 8l2 5" />
          <path d="M4 8h10a4 4 0 0 1 4 4v6" />
        </svg>
      );
    }
    if (direction === 'right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 11l4-4-4-4" />
          <path d="M19 7H8a4 4 0 0 0-4 4v7" />
        </svg>
      );
    }
    if (direction === 'slight-right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 6l5 2-2 5" />
          <path d="M20 8H10a4 4 0 0 0-4 4v6" />
        </svg>
      );
    }
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    );
  };

  return (
    <div
      id="cp-carplay-nav-wrapper"
      style={{
        position: 'absolute',
        top: fullWidth ? '0px' : '12px',
        left: fullWidth ? '0px' : 'auto',
        right: fullWidth ? '0px' : '12px',
        zIndex: 999999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '0px',
        pointerEvents: 'none',
        maxWidth: fullWidth ? 'none' : '440px',
        width: fullWidth ? '100%' : 'calc(100% - 24px)',
        isolation: 'isolate',
      }}
    >
      <style>{`
        #cp-carplay-nav-wrapper {
          z-index: 999999 !important;
        }
        #cp-carplay-nav-banner {
          background: #1d4ed8 !important;
          background-color: #1d4ed8 !important;
          opacity: 1 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          ${fullWidth ? 'border: none !important; border-bottom: 2px solid #2563eb !important; border-radius: 0 0 24px 24px !important; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.8) !important;' : 'border: 2px solid #2563eb !important; border-radius: 22px !important; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95) !important;'}
        }
        #cp-carplay-nav-banner .gm-nav-chip-content {
          background: #1d4ed8 !important;
          background-color: #1d4ed8 !important;
          opacity: 1 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
        }
        #cp-carplay-nav-banner .gm-nav-chip-upcoming {
          background: #1d4ed8 !important;
          background-color: #1d4ed8 !important;
          opacity: 1 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
        }
        #cp-carplay-nav-banner .gm-nav-chip-lanes {
          background: #0e1833 !important;
          background-color: #0e1833 !important;
          opacity: 1 !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
        }
      `}</style>
      <div
        id="cp-carplay-nav-banner"
        className="gm-nav-chip"
        style={{
          background: '#1d4ed8',
          backgroundColor: '#1d4ed8',
          opacity: 1,
          boxShadow: fullWidth ? '0 20px 40px rgba(0,0,0,0.8)' : '0 25px 60px rgba(0,0,0,0.95)',
          borderRadius: fullWidth ? '0 0 24px 24px' : '22px',
          overflow: 'hidden',
          minWidth: fullWidth ? 'auto' : '320px',
          maxWidth: fullWidth ? 'none' : '440px',
          width: '100%',
          color: '#ffffff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
          pointerEvents: 'auto',
          border: fullWidth ? 'none' : '2px solid #2563eb',
          borderBottom: '2px solid #2563eb',
          position: 'relative',
          isolation: 'isolate',
        }}
      >
        {/* Top Accent Color Bar */}
        <div style={{ height: '4px', backgroundColor: '#60a5fa', width: '100%' }} />

        <div
          className="gm-nav-chip-content"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: '#1d4ed8',
            backgroundColor: '#1d4ed8',
            opacity: 1,
          }}
        >
          {/* Contrast Icon Box */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '64px',
              padding: '10px 12px',
              borderRadius: '16px',
              backgroundColor: '#1e3a8a',
              boxShadow: '0 6px 16px rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <div
              className="gm-nav-chip-icon"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
              }}
            >
              {renderArrow(dir, 32)}
            </div>
            <div
              className="gm-nav-chip-dist"
              style={{
                fontSize: '18px',
                fontWeight: '800',
                letterSpacing: '-0.5px',
                marginTop: '4px',
                color: '#ffffff',
                textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
              }}
            >
              {primary.distanceText || '350 m'}
            </div>
          </div>

          <div className="gm-nav-chip-center" style={{ flex: 1 }}>
            <div
              className="gm-nav-chip-street"
              style={{
                fontSize: '21px',
                fontWeight: '800',
                lineHeight: '1.25',
                letterSpacing: '-0.3px',
                color: '#ffffff',
                textShadow: '0 2px 4px rgba(0,0,0,0.6)',
              }}
            >
              {primary.actionText || 'Geradeaus weiterfahren'}
            </div>
          </div>
        </div>

        {upcoming && upcoming.length > 0 && (
          <div
            className="gm-nav-chip-upcoming"
            style={{
              background: '#1d4ed8',
              backgroundColor: '#1d4ed8',
              opacity: 1,
              padding: '10px 20px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '600', fontSize: '15px' }}>Dann</span>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderArrow(upcoming[0].dir, 18)}
            </div>
            <span style={{ color: '#ffffff', fontWeight: '700', fontSize: '17px' }}>{upcoming[0].distText}</span>
          </div>
        )}

        {primary.lanes && primary.lanes.length > 0 && (
          <div
            className="gm-nav-chip-lanes"
            style={{
              background: '#0e1833',
              backgroundColor: '#0e1833',
              opacity: 1,
              padding: '10px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            {primary.lanes.map((lane, idx) => {
              const isCurrent = lane.type === 'straight';
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                  )}
                  <div
                    className={`gm-nav-lane-arrow ${lane.active ? 'gm-nav-lane-active' : ''}`}
                    style={{
                      color: isCurrent ? '#ffffff' : lane.active ? '#fbbf24' : 'rgba(255, 255, 255, 0.35)',
                      filter: isCurrent ? 'none' : lane.active ? 'drop-shadow(0 0 8px rgba(251, 191, 36, 0.95))' : 'none',
                      opacity: isCurrent ? 0.7 : lane.active ? 1 : 0.35,
                      transform: isCurrent ? 'scale(1)' : lane.active ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.25s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                    }}
                  >
                    {renderArrow(lane.type, 16)}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
