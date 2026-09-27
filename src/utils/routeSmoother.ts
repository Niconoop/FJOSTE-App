/**
 * Route Smoother for ETS2/ATS navigation paths.
 * Applies Convex-Hull Quadratic Bézier Fillet smoothing to game coordinates (in meters).
 * 
 * Benefits:
 * - Strictly respects the convex hull (Zero overshoot, zero oscillation, no Runge phenomenon)
 * - Eliminates sharp Z-steps, chicanes, and bulging into oncoming lanes or grass
 * - Eliminates 25m-50m polygonal chords ('kantig') by gently rounding highway bends
 * - Preserves straight road sections clean and straight (fast rendering, zero lateral drift)
 * - Preserves sharp intersection angles (> 85°) and freeway exits so turn maneuvers remain crisp
 */

export interface SmoothRouteOptions {
  /** Target distance in meters between interpolated points on curves (default: 5m) */
  targetPointSpacing?: number;
  /** Maximum angle in degrees between segments to apply curve smoothing (default: 85°) */
  maxSmoothingAngleDeg?: number;
  /** Minimum angle in degrees to apply curve smoothing (default: 1.0°) */
  minSmoothingAngleDeg?: number;
}

/**
 * Smooths an array of 2D coordinates [gx, gz] (in ETS2 meter space).
 */
export function smoothRouteCoords(
  coords: [number, number][],
  options: SmoothRouteOptions = {}
): [number, number][] {
  if (!coords || coords.length < 3) {
    return coords ? [...coords] : [];
  }

  const maxAngle = options.maxSmoothingAngleDeg ?? 85.0;
  const minAngle = options.minSmoothingAngleDeg ?? 1.0;

  // 1. Deduplicate consecutive points closer than 1.5m to eliminate zero-length divisions and micro-jitter
  const deduped: [number, number][] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = coords[i];
    const d = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    if (d >= 1.5) {
      deduped.push(curr);
    }
  }

  const n = deduped.length;
  if (n < 3) return deduped;

  const result: [number, number][] = [deduped[0]];

  for (let i = 1; i < n - 1; i++) {
    const pPrev = deduped[i - 1];
    const pCurr = deduped[i];
    const pNext = deduped[i + 1];

    const v1x = pCurr[0] - pPrev[0];
    const v1y = pCurr[1] - pPrev[1];
    const l1 = Math.hypot(v1x, v1y);

    const v2x = pNext[0] - pCurr[0];
    const v2y = pNext[1] - pCurr[1];
    const l2 = Math.hypot(v2x, v2y);

    if (l1 < 1e-3 || l2 < 1e-3) {
      result.push(pCurr);
      continue;
    }

    const u1x = v1x / l1;
    const u1y = v1y / l1;
    const u2x = v2x / l2;
    const u2y = v2y / l2;

    const dot = u1x * u2x + u1y * u2y;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);

    // If nearly straight (< minAngle) or sharp intersection (> maxAngle), keep original vertex
    if (angle < minAngle || angle > maxAngle) {
      result.push(pCurr);
      continue;
    }

    // Proportional fillet radius: up to 42% of adjacent segment lengths (capped at 45m on freeways)
    // Ensures adjacent fillets never overlap (0.42 + 0.42 < 1.0) and guarantees strict convex-hull containment
    const maxRadius = Math.min(l1 * 0.42, l2 * 0.42, 45.0);

    // Start point of fillet arc along incoming segment
    const startX = pCurr[0] - u1x * maxRadius;
    const startY = pCurr[1] - u1y * maxRadius;

    // End point of fillet arc along outgoing segment
    const endX = pCurr[0] + u2x * maxRadius;
    const endY = pCurr[1] + u2y * maxRadius;

    result.push([startX, startY]);

    // Subdivide along quadratic Bézier curve: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const steps = angle > 35 ? 6 : (angle > 15 ? 4 : (angle > 5 ? 3 : 2));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const oneMinusT = 1 - t;
      const bx = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * pCurr[0] + t * t * endX;
      const by = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * pCurr[1] + t * t * endY;
      result.push([bx, by]);
    }

    result.push([endX, endY]);
  }

  result.push(deduped[n - 1]);
  return result;
}

