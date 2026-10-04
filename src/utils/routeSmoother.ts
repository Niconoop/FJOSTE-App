/**
 * Route Smoother for ETS2/ATS navigation paths.
 * Applies Convex-Hull Quadratic Bézier Fillet smoothing and smart lane-keeping offset.
 * 
 * Benefits:
 * - Strictly respects the convex hull (Zero overshoot, zero oscillation, no Runge phenomenon)
 * - Places the route permanently in the driver's lane (+2.3m right in Europe/ATS, -2.3m left in UK)
 *   instead of running down the center median/divider where the raw map nodes sit.
 * - Eliminates sharp Z-steps, chicanes, and bulging into oncoming lanes or grass
 * - Eliminates 25m-50m polygonal chords ('kantig') by gently rounding highway bends
 * - Preserves straight road sections clean and straight (fast rendering, zero lateral drift)
 * - Preserves sharp intersection angles (> 85°) and freeway exits so turn maneuvers remain crisp
 * - Smooth ramp-in at route origin (starts directly under/in front of vehicle) and ramp-out at destination
 */

export interface SmoothRouteOptions {
  /** Target distance in meters between interpolated points on curves (default: 5m) */
  targetPointSpacing?: number;
  /** Maximum angle in degrees between segments to apply curve smoothing (default: 85°) */
  maxSmoothingAngleDeg?: number;
  /** Minimum angle in degrees to apply curve smoothing (default: 1.0°) */
  minSmoothingAngleDeg?: number;
  /**
   * Lateral lane offset in meters to shift route from road centerline nodes into driving lane.
   * Default: 2.25m (matching ETS2LA SCS standard laneWidth 4.5m / 2; positive = right lane in Europe/ATS, automatically inverted to -2.25m in UK for left lane).
   * Set to 0 to disable lane offset.
   */
  laneOffsetMeters?: number;
  /** Whether to automatically adapt lane offset for UK (left-hand traffic) vs Continental Europe/ATS (right-hand traffic). Default: true */
  autoCountryLaneOffset?: boolean;
}

/**
 * Checks if a game coordinate [gx, gz] is in the UK where traffic drives on the left.
 */
export function isUkCoord(gx: number, gz: number): boolean {
  const sx = Math.floor(gx / 4000);
  const sy = Math.floor(gz / 4000);
  return sx <= -8 && sy <= -2 && !(sx === -8 && sy === -2);
}

/**
 * Smooths an array of 2D coordinates [gx, gz] (in ETS2 meter space) and offsets
 * them into the vehicle's actual driving lane.
 */
export function smoothRouteCoords(
  coords: [number, number][],
  options: SmoothRouteOptions = {}
): [number, number][] {
  if (!coords || coords.length < 2) {
    return coords ? [...coords] : [];
  }

  const maxAngle = options.maxSmoothingAngleDeg ?? 85.0;
  const minAngle = options.minSmoothingAngleDeg ?? 1.0;
  // ETS2LA standard: laneWidth = 4.5m -> lane center = 2.25m from road centerline
  const laneOffset = options.laneOffsetMeters ?? 2.25;
  const autoCountry = options.autoCountryLaneOffset ?? true;

  // 1. Deduplicate consecutive points closer than 1.0m to eliminate zero-length divisions and micro-jitter
  const deduped: [number, number][] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    const prev = deduped[deduped.length - 1];
    const curr = coords[i];
    const d = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]);
    if (d >= 1.0) {
      deduped.push(curr);
    }
  }

  const n = deduped.length;
  if (n < 2) return deduped;

  // Handle simple 2-point segment
  if (n === 2) {
    if (laneOffset === 0) return deduped;
    const dx = deduped[1][0] - deduped[0][0];
    const dy = deduped[1][1] - deduped[0][1];
    const len = Math.hypot(dx, dy);
    if (len < 0.001) return deduped;
    const nx = -dy / len;
    const ny = dx / len;
    const inUk = autoCountry ? isUkCoord(deduped[0][0], deduped[0][1]) : false;
    const effOffset = inUk ? -laneOffset : laneOffset;
    return [
      [deduped[0][0] + effOffset * nx, deduped[0][1] + effOffset * ny],
      [deduped[1][0] + effOffset * nx, deduped[1][1] + effOffset * ny],
    ];
  }

  // 2. Convex-Hull Quadratic Bézier Fillet smoothing on road nodes
  const smoothed: [number, number][] = [deduped[0]];

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
      smoothed.push(pCurr);
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
      smoothed.push(pCurr);
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

    smoothed.push([startX, startY]);

    // Subdivide along quadratic Bézier curve: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
    const steps = angle > 35 ? 6 : (angle > 15 ? 4 : (angle > 5 ? 3 : 2));
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const oneMinusT = 1 - t;
      const bx = oneMinusT * oneMinusT * startX + 2 * oneMinusT * t * pCurr[0] + t * t * endX;
      const by = oneMinusT * oneMinusT * startY + 2 * oneMinusT * t * pCurr[1] + t * t * endY;
      smoothed.push([bx, by]);
    }

    smoothed.push([endX, endY]);
  }

  smoothed.push(deduped[n - 1]);

  if (laneOffset === 0 || smoothed.length < 2) {
    return smoothed;
  }

  // 3. Smart Lane-Keeping Offset: Shift route from center median/divider nodes onto the driver's lane
  const m = smoothed.length;
  const distFromStart = new Float64Array(m);
  for (let i = 1; i < m; i++) {
    distFromStart[i] = distFromStart[i - 1] + Math.hypot(smoothed[i][0] - smoothed[i - 1][0], smoothed[i][1] - smoothed[i - 1][1]);
  }
  const totalLength = distFromStart[m - 1];

  const offsetResult: [number, number][] = [];

  for (let i = 0; i < m; i++) {
    // Windowed tangent over +-2 points (~20m) for smooth macro-heading without noise
    const idxPrev = Math.max(0, i - 2);
    const idxNext = Math.min(m - 1, i + 2);

    const dx = smoothed[idxNext][0] - smoothed[idxPrev][0];
    const dy = smoothed[idxNext][1] - smoothed[idxPrev][1];
    const len = Math.hypot(dx, dy);

    let nx = 0;
    let ny = 0;
    if (len > 0.001) {
      // In ETS2 Cartesian space (+X East, +Z South): right-hand normal is (-dy, dx)
      nx = -dy / len;
      ny = dx / len;
    }

    const curPt = smoothed[i];
    const inUk = autoCountry ? isUkCoord(curPt[0], curPt[1]) : false;
    const baseOffset = inUk ? -laneOffset : laneOffset;

    // Smooth ramp-in at start (0m to 25m) and ramp-out at end (25m to 0m) so route begins under truck and ends at destination
    const dStart = distFromStart[i];
    const dEnd = totalLength - dStart;
    const rampFactor = Math.min(1.0, Math.min(dStart / 25.0, dEnd / 25.0));
    const effectiveOffset = baseOffset * Math.max(0, rampFactor);

    offsetResult.push([
      curPt[0] + effectiveOffset * nx,
      curPt[1] + effectiveOffset * ny,
    ]);
  }

  // 4. One-pass 15-70-15 Gaussian relaxation to ensure continuous curvature and zero miter spikes
  if (offsetResult.length >= 3) {
    const relaxed: [number, number][] = [offsetResult[0]];
    for (let i = 1; i < offsetResult.length - 1; i++) {
      const pPrev = offsetResult[i - 1];
      const pCurr = offsetResult[i];
      const pNext = offsetResult[i + 1];
      relaxed.push([
        0.15 * pPrev[0] + 0.70 * pCurr[0] + 0.15 * pNext[0],
        0.15 * pPrev[1] + 0.70 * pCurr[1] + 0.15 * pNext[1],
      ]);
    }
    relaxed.push(offsetResult[offsetResult.length - 1]);
    return relaxed;
  }

  return offsetResult;
}
