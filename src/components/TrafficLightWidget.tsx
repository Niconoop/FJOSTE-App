import React from 'react';
import type { ApproachingTrafficLight } from '../utils/trafficLightDetector';

interface TrafficLightWidgetProps {
  trafficLight: ApproachingTrafficLight | null;
  compact?: boolean;
  variant?: 'large' | 'compact';
}

/**
 * Pure 2D Flat Anthracite Traffic Light (Ampel) component:
 * - Slightly larger, bold 2D design for instant readability from the driver's seat
 * - Anthracite plastic chassis (#202227 with #333742 border)
 * - Three distinct colored lenses (Red, Yellow, Green):
 *   Always visible in their signature colors, brightly illuminated when active
 * - Zero 3D reflections or specular glass effects
 * - Fixed width and tabular numbers for stable, jitter-free positioning
 */
const TrafficLightWidgetComponent: React.FC<TrafficLightWidgetProps> = ({
  trafficLight,
  compact = false,
  variant = 'large',
}) => {
  if (!trafficLight) return null;

  const { color, label, distance, timeRemaining } = trafficLight;

  const isRed = color === 'red' || color === 'red-yellow';
  const isYellow = color === 'yellow' || color === 'red-yellow' || color === 'blinking-yellow';
  const isGreen = color === 'green';

  if (variant === 'large') {
    return (
      <div className="pointer-events-none select-none flex flex-col items-center gap-2 w-[76px]">
        {/* Pure 2D Anthracite Housing (Bigger size: 76px width, 44px lenses) */}
        <div className="w-[76px] bg-[#202227] border-[2.5px] border-[#333742] rounded-[24px] p-2.5 flex flex-col items-center justify-between gap-2.5 shadow-2xl">
          {/* RED LENS (Top) */}
          <div
            className={`w-11 h-11 rounded-full transition-all duration-150 flex items-center justify-center ${
              isRed
                ? 'bg-[#ef4444] border-2 border-[#fecaca] shadow-[0_0_16px_rgba(239,68,68,0.75)]'
                : 'bg-[#ef4444]/25 border border-[#ef4444]/40'
            }`}
          />

          {/* YELLOW LENS (Middle) */}
          <div
            className={`w-11 h-11 rounded-full transition-all duration-150 flex items-center justify-center ${
              isYellow
                ? color === 'blinking-yellow'
                  ? 'bg-[#eab308] border-2 border-[#fef08a] shadow-[0_0_16px_rgba(234,179,8,0.75)] animate-pulse'
                  : 'bg-[#eab308] border-2 border-[#fef08a] shadow-[0_0_16px_rgba(234,179,8,0.75)]'
                : 'bg-[#eab308]/25 border border-[#eab308]/40'
            }`}
          />

          {/* GREEN LENS (Bottom) */}
          <div
            className={`w-11 h-11 rounded-full transition-all duration-150 flex items-center justify-center ${
              isGreen
                ? 'bg-[#22c55e] border-2 border-[#bbf7d0] shadow-[0_0_16px_rgba(34,197,94,0.75)]'
                : 'bg-[#22c55e]/25 border border-[#22c55e]/40'
            }`}
          />
        </div>

        {/* Flat Anthracite Info Badge - Bigger typography & fixed width */}
        <div className="w-[76px] bg-[#202227] border border-[#333742] rounded-xl py-1 px-1 flex items-center justify-center gap-1 font-mono text-xs font-black text-white tabular-nums shadow-lg">
          <span
            className={
              isRed
                ? 'text-red-400'
                : isGreen
                ? 'text-emerald-400'
                : isYellow
                ? 'text-amber-400'
                : 'text-zinc-400'
            }
          >
            {timeRemaining != null && timeRemaining > 0 ? `${Math.round(timeRemaining)}s` : label}
          </span>
          <span className="text-zinc-500 text-[10px]">•</span>
          <span className="text-zinc-200">{distance}m</span>
        </div>
      </div>
    );
  }

  // Compact Flat 2D Anthracite Variant (Vertically aligned)
  return (
    <div
      className={`pointer-events-none select-none flex flex-col items-center gap-1.5 w-[58px] ${
        compact ? 'scale-90 origin-top-right' : ''
      }`}
    >
      {/* 3 Vertical Colored Lenses in Anthracite Chassis */}
      <div className="w-[58px] bg-[#202227] border-2 border-[#333742] rounded-[18px] p-2 flex flex-col items-center justify-between gap-2 shadow-xl">
        {/* RED LENS (Top) */}
        <div
          className={`w-[28px] h-[28px] rounded-full transition-all duration-150 ${
            isRed
              ? 'bg-[#ef4444] border-2 border-[#fecaca] shadow-[0_0_12px_rgba(239,68,68,0.85)]'
              : 'bg-[#ef4444]/25 border border-[#ef4444]/40'
          }`}
        />
        {/* YELLOW LENS (Middle) */}
        <div
          className={`w-[28px] h-[28px] rounded-full transition-all duration-150 ${
            isYellow
              ? color === 'blinking-yellow'
                ? 'bg-[#eab308] border-2 border-[#fef08a] shadow-[0_0_12px_rgba(234,179,8,0.85)] animate-pulse'
                : 'bg-[#eab308] border-2 border-[#fef08a] shadow-[0_0_12px_rgba(234,179,8,0.85)]'
              : 'bg-[#eab308]/25 border border-[#eab308]/40'
          }`}
        />
        {/* GREEN LENS (Bottom) */}
        <div
          className={`w-[28px] h-[28px] rounded-full transition-all duration-150 ${
            isGreen
              ? 'bg-[#22c55e] border-2 border-[#bbf7d0] shadow-[0_0_12px_rgba(34,197,94,0.85)]'
              : 'bg-[#22c55e]/25 border border-[#22c55e]/40'
          }`}
        />
      </div>

      {/* Stacked Vertical Info Badge */}
      <div className="w-[58px] bg-[#202227] border border-[#333742] rounded-xl py-1 px-1 flex flex-col items-center justify-center font-mono tabular-nums shadow">
        <span
          className={`text-xs font-black leading-none ${
            isRed
              ? 'text-red-400'
              : isGreen
              ? 'text-emerald-400'
              : isYellow
              ? 'text-amber-400'
              : 'text-zinc-400'
          }`}
        >
          {timeRemaining != null && timeRemaining > 0 ? `${Math.round(timeRemaining)}s` : label}
        </span>
        <span className="text-[9px] font-bold text-zinc-300 mt-0.5 leading-none">
          {distance}m
        </span>
      </div>
    </div>
  );
};

export const TrafficLightWidget = React.memo(TrafficLightWidgetComponent, (prev, next) => {
  if (prev.compact !== next.compact || prev.variant !== next.variant) return false;
  if (!prev.trafficLight && !next.trafficLight) return true;
  if (!prev.trafficLight || !next.trafficLight) return false;
  const p = prev.trafficLight;
  const n = next.trafficLight;
  return (
    p.id === n.id &&
    p.state === n.state &&
    p.distance === n.distance &&
    p.timeRemaining === n.timeRemaining &&
    p.color === n.color &&
    p.label === n.label
  );
});
