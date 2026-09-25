import React from 'react';
import type { NextManeuver } from '../utils/navInstructionEngine';

interface CarPlayNavOverlayProps {
  primary: NextManeuver | null;
  upcoming?: Array<{ dir: 'left' | 'straight' | 'right'; distText: string }>;
  accentColor?: string;
  fullWidth?: boolean;
}

const CarPlayNavOverlayComponent: React.FC<CarPlayNavOverlayProps> = ({
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

  const renderManeuverIcon = (
    type: string,
    direction: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right',
    roundaboutExit?: number,
    size = 16
  ) => {
    if (type === 'roundabout') {
      const exitNum = roundaboutExit || 1;
      return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <circle cx="16" cy="16" r="10" stroke="white" strokeWidth="2.8" strokeDasharray="48" strokeDashoffset="10" strokeLinecap="round" />
          <path d="M16 28v-4" stroke="white" strokeWidth="2.8" strokeLinecap="round" />
          <path d="M23 9l4-2-1 4" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
          <text x="16" y="20" fill="white" fontSize="12" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">
            {exitNum}
          </text>
        </svg>
      );
    }

    if (type === 'u-turn') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 14L5 10l4-4" />
          <path d="M5 10h10a5 5 0 0 1 5 5v5" />
        </svg>
      );
    }

    if (type === 'highway-exit') {
      const isR = direction === 'right' || direction === 'slight-right';
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d={isR ? "M7 20V4" : "M17 20V4"} stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" />
          {isR ? (
            <>
              <path d="M7 14c0-4 4-6 9-8" />
              <path d="M12 6h4v4" />
            </>
          ) : (
            <>
              <path d="M17 14c0-4-4-6-9-8" />
              <path d="M12 6H8v4" />
            </>
          )}
        </svg>
      );
    }

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

  const renderLaneArrow = (type: string, size = 18) => {
    // 1. Straight arrow (↑)
    if (type === 'straight') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="4" />
          <polyline points="6 10 12 4 18 10" />
        </svg>
      );
    }

    // 2. Highway Exit Right (slight-right ↗)
    if (type === 'slight-right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 20v-5c0-4 4-7 9-9l2-1" />
          <polyline points="14 4 20 4 20 10" />
        </svg>
      );
    }

    // 3. Highway Exit Left (slight-left ↖)
    if (type === 'slight-left') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 20v-5c0-4-4-7-9-9l-2-1" />
          <polyline points="10 4 4 4 4 10" />
        </svg>
      );
    }

    // 4. Combined Straight & Highway Exit Right (straight-right ↑↗)
    if (type === 'straight-right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="20" x2="8" y2="4" />
          <polyline points="4 8 8 4 12 8" />
          <path d="M8 13c3-1 7-2 11-5" />
          <polyline points="15 7 20 8 19 13" />
        </svg>
      );
    }

    // 5. Combined Straight & Highway Exit Left (straight-left ↖↑)
    if (type === 'straight-left') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="16" y1="20" x2="16" y2="4" />
          <polyline points="12 8 16 4 20 8" />
          <path d="M16 13c-3-1-7-2-11-5" />
          <polyline points="9 7 4 8 5 13" />
        </svg>
      );
    }

    // 6. Combined Straight & 90° Turn Right (straight-turn-right ↑↱)
    if (type === 'straight-turn-right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="7" y1="20" x2="7" y2="4" />
          <polyline points="3 8 7 4 11 8" />
          <path d="M7 16c0-2.5 1.5-4 4-4h8" />
          <polyline points="15 8.5 19 12 15 15.5" />
        </svg>
      );
    }

    // 7. Combined Straight & 90° Turn Left (straight-turn-left ↰↑)
    if (type === 'straight-turn-left') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="17" y1="20" x2="17" y2="4" />
          <polyline points="13 8 17 4 21 8" />
          <path d="M17 16c0-2.5-1.5-4-4-4H5" />
          <polyline points="9 8.5 5 12 9 15.5" />
        </svg>
      );
    }

    // 8. Right 90° Turn (right ↱)
    if (type === 'right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 20v-7c0-3 2-5 5-5h7" />
          <polyline points="15 4 20 8 15 12" />
        </svg>
      );
    }

    // 9. Left 90° Turn (left ↰)
    if (type === 'left') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 20v-7c0-3-2-5-5-5H5" />
          <polyline points="9 4 4 8 9 12" />
        </svg>
      );
    }

    // 10. Combined Left & Right Turn (left-right ↰↱)
    if (type === 'left-right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="16" />
          <path d="M12 16c0-2.5-1.5-4-4-4H4" />
          <polyline points="8 8.5 4 12 8 15.5" />
          <path d="M12 16c0-2.5 1.5-4 4-4h8" />
          <polyline points="16 8.5 20 12 16 15.5" />
        </svg>
      );
    }

    // 11. Combined All Directions: Straight, Left & Right (straight-left-right ↰↑↱)
    if (type === 'straight-left-right') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="20" x2="12" y2="4" />
          <polyline points="8 8 12 4 16 8" />
          <path d="M12 16c0-2.5-1.5-4-4-4H4" />
          <polyline points="8 8.5 4 12 8 15.5" />
          <path d="M12 16c0-2.5 1.5-4 4-4h8" />
          <polyline points="16 8.5 20 12 16 15.5" />
        </svg>
      );
    }

    // 12. U-Turn (u-turn ↶)
    if (type === 'u-turn') {
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V11a6 6 0 0 0-12 0v9" />
          <polyline points="2 15 6 20 10 15" />
        </svg>
      );
    }

    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="4" />
        <polyline points="6 10 12 4 18 10" />
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
              backgroundColor: iconBgColor === '#d97706' ? '#b45309' : '#1e3a8a',
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
              {renderManeuverIcon(maneuverType, dir, primary.roundaboutExit, 32)}
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
            {primary.subText && (
              <div
                className="gm-nav-chip-subtext"
                style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: 'rgba(255, 255, 255, 0.85)',
                  marginTop: '2px',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {primary.subText}
              </div>
            )}
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
              {renderManeuverIcon('turn', upcoming[0].dir, undefined, 18)}
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
              const isActive = lane.active;
              return (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <div style={{ width: '1px', height: '18px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                  )}
                  <div
                    className={`gm-nav-lane-arrow ${isActive ? 'gm-nav-lane-active' : ''}`}
                    style={{
                      color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.35)',
                      filter: isActive ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.95)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.6))' : 'none',
                      opacity: isActive ? 1 : 0.35,
                      transform: isActive ? 'scale(1.12)' : 'scale(1)',
                      transition: 'all 0.25s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0 3px',
                    }}
                  >
                    {renderLaneArrow(lane.type, 19)}
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

export const CarPlayNavOverlay = React.memo(CarPlayNavOverlayComponent);
