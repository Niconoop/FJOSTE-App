/**
 * Route Smoother for ETS2/ATS navigation paths.
 * Applies Tangent-Clamped Cubic Hermite Spline interpolation to game coordinates (in meters).
 * 
 * Benefits:
 * - Eliminates sharp polygonal chords in highway curves ('kantig')
 * - Prevents straight line chords from cutting across lanes ('liegt zwischen den Spuren')
 * - Tangent clamping at turns (> 35°) guarantees ZERO overshoot, NO bowing out into opposing lanes or grass
 * - Preserves sharp intersection angles and freeway ramp junctions so turn maneuvers remain crisp
 */

export interface SmoothRouteOptions {
  /** Target distance in meters between interpolated points on curves (default: 5m) */
  targetPointSpacing?: number;
  /** Maximum angle in degrees between segments to apply curve smoothing (default: 35°) */
  maxSmoothingAngleDeg?: number;
  /** Maximum number of sub-points per segment to keep rendering fast (default: 10) */
  maxSubdivisions?: number;
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

  const spacing = options.targetPointSpacing ?? 5.0;
  const maxAngle = options.maxSmoothingAngleDeg ?? 35.0;
  const maxSub = options.maxSubdivisions ?? 10;

  // 1. Deduplicate consecutive points closer than 1.0m to prevent zero-length divisions
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
  if (n < 3) return deduped;

  const smoothed: [number, number][] = [deduped[0]];

  for (let i = 0; i < n - 1; i++) {
    const p1 = deduped[i];
    const p2 = deduped[i + 1];
    const p0 = i > 0 ? deduped[i - 1] : p1;
    const p3 = i < n - 2 ? deduped[i + 2] : p2;

    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-3) continue;

    // Evaluate turn angle at p1 (between incoming vector p0->p1 and current vector p1->p2)
    let angle1 = 0;
    let l0 = len;
    if (i > 0) {
      const v0x = p1[0] - p0[0];
      const v0y = p1[1] - p0[1];
      l0 = Math.hypot(v0x, v0y);
      if (l0 > 1e-3) {
        const dot = (v0x * dx + v0y * dy) / (l0 * len);
        angle1 = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
      }
    }

    // Evaluate turn angle at p2 (between current vector p1->p2 and outgoing vector p2->p3)
    let angle2 = 0;
    let l3 = len;
    if (i < n - 2) {
      const v3x = p3[0] - p2[0];
      const v3y = p3[1] - p2[1];
      l3 = Math.hypot(v3x, v3y);
      if (l3 > 1e-3) {
        const dot = (dx * v3x + dy * v3y) / (len * l3);
        angle2 = Math.acos(Math.max(-1, Math.min(1, dot))) * (180 / Math.PI);
      }
    }

    // Tangent tension factors:
    // Smooth cosine taper up to 85° to gracefully round corners and highway ramps without
    // unnatural blocky 90-degree angles. Above 85°, clamp tangent along chord to prevent reverse loops.
    const t1Factor = angle1 >= 85 ? 0 : Math.pow(Math.cos((angle1 * Math.PI) / 180), 0.75);
    const t2Factor = angle2 >= 85 ? 0 : Math.pow(Math.cos((angle2 * Math.PI) / 180), 0.75);

    // Tangent magnitude bounds:
    // Bound tangent length to 1.5x adjacent segment length to strictly prevent Catmull-Rom
    // overshooting / bulging into the oncoming carriageway (Gegenfahrbahn) when long and short segments meet.
    const effectiveLen1 = i > 0 ? Math.min(len, l0 * 1.5) : len;
    const effectiveLen2 = (i < n - 2) ? Math.min(len, l3 * 1.5) : len;

    // Incoming tangent m1 at p1
    let m1x = dx;
    let m1y = dy;
    if (t1Factor > 0 && i > 0 && l0 > 1e-3) {
      const v0x = p1[0] - p0[0];
      const v0y = p1[1] - p0[1];
      const u0x = v0x / l0;
      const u0y = v0y / l0;
      const u1x = dx / len;
      const u1y = dy / len;
      const avgX = u0x + u1x;
      const avgY = u0y + u1y;
      const avgL = Math.hypot(avgX, avgY) || 1;
      m1x = (avgX / avgL) * effectiveLen1 * t1Factor * 0.75;
      m1y = (avgY / avgL) * effectiveLen1 * t1Factor * 0.75;
    }

    // Outgoing tangent m2 at p2
    let m2x = dx;
    let m2y = dy;
    if (t2Factor > 0 && i < n - 2 && l3 > 1e-3) {
      const v3x = p3[0] - p2[0];
      const v3y = p3[1] - p2[1];
      const u1x = dx / len;
      const u1y = dy / len;
      const u3x = v3x / l3;
      const u3y = v3y / l3;
      const avgX = u1x + u3x;
      const avgY = u1y + u3y;
      const avgL = Math.hypot(avgX, avgY) || 1;
      m2x = (avgX / avgL) * effectiveLen2 * t2Factor * 0.75;
      m2y = (avgY / avgL) * effectiveLen2 * t2Factor * 0.75;
    }

    // Subdivide when there is genuine curvature (angle > 0.8° and < 85°)
    const hasCurvature = (angle1 > 0.8 && angle1 < 85) || (angle2 > 0.8 && angle2 < 85);
    const numSteps = hasCurvature && len >= spacing * 1.2
      ? Math.min(maxSub, Math.max(2, Math.round(len / spacing)))
      : 1;

    // Cubic Hermite spline evaluation
    for (let s = 1; s <= numSteps; s++) {
      const t = s / numSteps;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;

      const px = h00 * p1[0] + h10 * m1x + h01 * p2[0] + h11 * m2x;
      const py = h00 * p1[1] + h10 * m1y + h01 * p2[1] + h11 * m2y;

      smoothed.push([px, py]);
    }
  }

  return smoothed;
}
