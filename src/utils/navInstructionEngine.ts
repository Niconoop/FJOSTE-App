export interface LaneInfo {
  type:
    | 'left'
    | 'slight-left'
    | 'straight-left'
    | 'straight-turn-left'
    | 'straight'
    | 'straight-right'
    | 'straight-turn-right'
    | 'slight-right'
    | 'right'
    | 'left-right'
    | 'straight-left-right'
    | 'u-turn';
  active: boolean;
}

export interface NextManeuver {
  actionText: string;
  subText?: string;
  distanceText: string;
  type: 'turn' | 'straight' | 'roundabout' | 'highway-exit' | 'highway-entry' | 'u-turn';
  direction: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right';
  distanceMeters: number;
  lanes: LaneInfo[];
  roundaboutExit?: number;
}

export interface InstructionResult {
  primary: NextManeuver | null;
  upcoming: Array<{ dir: 'left' | 'straight' | 'right'; distText: string }>;
}

export interface JSONTurnPoint {
  x: number;
  y: number;
  type?: 'turn' | 'highway-exit' | 'highway-entry' | 'roundabout' | 'u-turn';
  dir?: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right';
  absAngle?: number;
  coordIdx?: number;
  roadName?: string;
  roundaboutExit?: number;
  distAlong?: number;
  endDistAlong?: number;
}

// Threshold constants for maneuver detection
const CURVE_RATE_MAX = 0.40; // deg per meter, max rate to consider a highway curve
const TURN_RATE_MIN = 1.1;   // deg per meter, min rate to consider a sharp turn
const TURN_ANGLE_MIN = 20;   // degrees, min angle delta for a turn
const EXIT_RATE_MAX = 1.35;  // deg per meter, upper bound for exits/forks
const EXIT_ANGLE_MIN = 16;   // degrees, min angle for exits/forks

/**
 * Builds realistic lane indicators for CarPlay navigation.
 * Far away maneuvers keep lanes straight to avoid distracting the driver.
 */
/**
 * Builds realistic lane indicators for CarPlay navigation.
 * Accurately models multi-lane situations:
 * - Highway exits (Ausfahrt): straight through lanes with dedicated exit ramps (↗ / slight-right) and optional split lanes (↑↗ / straight-right).
 * - Multi-lane turns: single or double turn lanes (↱ or ↰) alongside through lanes (↑).
 * - Far-away maneuvers maintain straight through-lanes to avoid distracting the driver.
 */
export function buildLanes(
  laneCount: number,
  dir: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right',
  maneuverType: string,
  distanceMeters?: number,
  speedLimit?: number,
  currentSpeed?: number,
  absAngle?: number,
  roadType?: string
): LaneInfo[] {
  let effectiveCount = laneCount;
  if (!effectiveCount || effectiveCount <= 0) {
    if (roadType === 'freeway') {
      effectiveCount = 3; // Autobahn: 3 lanes in our driving direction
    } else if (roadType === 'divided') {
      effectiveCount = 2; // Kraftfahrstraße / 2-spurig in our driving direction
    } else if (roadType === 'local') {
      effectiveCount = 1; // Landstraße / Stadtverkehr: genau 1 Fahrspur in unsere Fahrtrichtung!
    } else if (maneuverType === 'highway-exit') {
      effectiveCount = (speedLimit != null && speedLimit >= 90) ? 3 : 2;
    } else if (speedLimit != null && speedLimit >= 90) {
      effectiveCount = 3;
    } else if (speedLimit != null && speedLimit > 80) {
      effectiveCount = 2;
    } else {
      effectiveCount = 1; // Standard-Landstraße: 1 Fahrspur in unsere Fahrtrichtung!
    }
  }
  effectiveCount = Math.max(1, Math.min(5, effectiveCount));

  const lanes: LaneInfo[] = [];

  // If the maneuver is still far away (> 450m for turns, > 850m for exits),
  // or it is straight, keep all lanes straight and active.
  const isFar = distanceMeters != null && (
    (maneuverType === 'highway-exit' && distanceMeters > 850) ||
    (maneuverType === 'turn' && distanceMeters > 450) ||
    (maneuverType === 'roundabout' && distanceMeters > 300)
  );

  if (dir === 'straight' || maneuverType === 'straight' || isFar) {
    for (let i = 0; i < effectiveCount; i++) {
      lanes.push({ type: 'straight', active: true });
    }
    return lanes;
  }

  // 1. Single lane in player's driving direction: EXACTLY ONE ARROW!
  if (effectiveCount === 1) {
    if (maneuverType === 'highway-exit' || dir === 'slight-right') {
      lanes.push({ type: 'slight-right', active: true });
    } else if (dir === 'slight-left') {
      lanes.push({ type: 'slight-left', active: true });
    } else if (dir === 'right') {
      lanes.push({ type: 'right', active: true });
    } else if (dir === 'left') {
      lanes.push({ type: 'left', active: true });
    } else {
      lanes.push({ type: 'straight', active: true });
    }
    return lanes;
  }

  // 2. Highway Exit / Ausfahrt / Autobahngabelung (2+ lanes)
  if (maneuverType === 'highway-exit' || dir === 'slight-right' || dir === 'slight-left') {
    const isRight = dir === 'right' || dir === 'slight-right';
    const twoLanesExit = effectiveCount >= 3 && (absAngle == null || absAngle >= 22);

    if (isRight) {
      if (effectiveCount === 2) {
        lanes.push({ type: 'straight', active: false });
        lanes.push({ type: 'slight-right', active: true });
      } else if (effectiveCount === 3) {
        if (twoLanesExit) {
          // Left lane straight, middle lane can straight or exit, right lane exit only
          lanes.push({ type: 'straight', active: false });
          lanes.push({ type: 'straight-right', active: true });
          lanes.push({ type: 'slight-right', active: true });
        } else {
          // Left 2 lanes straight, rightmost 1 lane exits
          lanes.push({ type: 'straight', active: false });
          lanes.push({ type: 'straight', active: false });
          lanes.push({ type: 'slight-right', active: true });
        }
      } else { // 4+ lanes
        for (let i = 0; i < effectiveCount - 2; i++) {
          lanes.push({ type: 'straight', active: false });
        }
        lanes.push({ type: 'straight-right', active: true });
        lanes.push({ type: 'slight-right', active: true });
      }
    } else { // Left exit / fork
      if (effectiveCount === 1) {
        lanes.push({ type: 'slight-left', active: true });
      } else if (effectiveCount === 2) {
        lanes.push({ type: 'slight-left', active: true });
        lanes.push({ type: 'straight', active: false });
      } else if (effectiveCount === 3) {
        if (twoLanesExit) {
          lanes.push({ type: 'slight-left', active: true });
          lanes.push({ type: 'straight-left', active: true });
          lanes.push({ type: 'straight', active: false });
        } else {
          lanes.push({ type: 'slight-left', active: true });
          lanes.push({ type: 'straight', active: false });
          lanes.push({ type: 'straight', active: false });
        }
      } else {
        lanes.push({ type: 'slight-left', active: true });
        lanes.push({ type: 'straight-left', active: true });
        for (let i = 0; i < effectiveCount - 2; i++) {
          lanes.push({ type: 'straight', active: false });
        }
      }
    }
    return lanes;
  }

  // 2. Roundabout
  if (maneuverType === 'roundabout') {
    if (effectiveCount === 1) {
      lanes.push({ type: 'straight', active: true });
    } else if (effectiveCount === 2) {
      lanes.push({ type: 'straight-left', active: true });
      lanes.push({ type: 'straight-right', active: true });
    } else {
      lanes.push({ type: 'left', active: false });
      lanes.push({ type: 'straight', active: true });
      lanes.push({ type: 'straight-right', active: true });
    }
    return lanes;
  }

  // 3. U-Turn
  if (maneuverType === 'u-turn' || (absAngle != null && absAngle >= 135)) {
    lanes.push({ type: 'u-turn', active: true });
    for (let i = 1; i < effectiveCount; i++) {
      lanes.push({ type: 'straight', active: false });
    }
    return lanes;
  }

  // 4. Multi-lane Intersection Turns (Abbiegen)
  if (dir === 'right') {
    if (effectiveCount === 1) {
      const isComb = absAngle == null || absAngle < 75;
      lanes.push({ type: isComb ? 'straight-turn-right' : 'right', active: true });
    } else if (effectiveCount === 2) {
      // 2-lane road: Left lane straight/left, Right lane is combined Straight & Right turn
      lanes.push({ type: 'straight', active: false });
      lanes.push({ type: 'straight-turn-right', active: true });
    } else if (effectiveCount === 3) {
      const twoTurn = absAngle != null && absAngle >= 55;
      if (twoTurn) {
        lanes.push({ type: 'straight', active: false });
        lanes.push({ type: 'straight-turn-right', active: true });
        lanes.push({ type: 'right', active: true });
      } else {
        lanes.push({ type: 'straight-turn-left', active: false });
        lanes.push({ type: 'straight', active: false });
        lanes.push({ type: 'straight-turn-right', active: true });
      }
    } else { // 4+ lanes
      lanes.push({ type: 'left', active: false });
      for (let i = 0; i < effectiveCount - 3; i++) {
        lanes.push({ type: 'straight', active: false });
      }
      lanes.push({ type: 'straight-turn-right', active: true });
      lanes.push({ type: 'right', active: true });
    }
    return lanes;
  }

  if (dir === 'left') {
    if (effectiveCount === 1) {
      const isComb = absAngle == null || absAngle < 75;
      lanes.push({ type: isComb ? 'straight-turn-left' : 'left', active: true });
    } else if (effectiveCount === 2) {
      // 2-lane road: Left lane is combined Straight & Left turn, Right lane straight/right
      lanes.push({ type: 'straight-turn-left', active: true });
      lanes.push({ type: 'straight', active: false });
    } else if (effectiveCount === 3) {
      const twoTurn = absAngle != null && absAngle >= 55;
      if (twoTurn) {
        lanes.push({ type: 'left', active: true });
        lanes.push({ type: 'straight-turn-left', active: true });
        lanes.push({ type: 'straight', active: false });
      } else {
        lanes.push({ type: 'straight-turn-left', active: true });
        lanes.push({ type: 'straight', active: false });
        lanes.push({ type: 'straight-turn-right', active: false });
      }
    } else { // 4+ lanes
      lanes.push({ type: 'left', active: true });
      lanes.push({ type: 'straight-left', active: true });
      for (let i = 0; i < effectiveCount - 3; i++) {
        lanes.push({ type: 'straight', active: false });
      }
      lanes.push({ type: 'straight-turn-right', active: false });
    }
    return lanes;
  }

  // Fallback
  for (let i = 0; i < effectiveCount; i++) {
    lanes.push({ type: 'straight', active: true });
  }
  return lanes;
}

/**
 * Format distances into automotive-grade navigation text
 */
export function formatDist(d: number): string {
  if (d <= 25) return 'Jetzt';
  if (d < 200) return `${Math.round(d / 10) * 10} m`;
  if (d < 1000) return `${Math.round(d / 50) * 50} m`;
  return `${(d / 1000).toFixed(1)} km`;
}

/**
 * Extracts true driving maneuvers from raw polyline coordinates (in ETS2 meter units [x, z]).
 *
 * Distinguishes between:
 * 1. Highway curves (k < 0.40 deg/m) -> Filtered out! Never generates fake turn warnings.
 * 2. Highway exits / forks (0.45 <= k < 1.35 deg/m, angle 16-45 deg) -> highway-exit.
 * 3. Sharp intersection turns (k >= 1.1 deg/m, angle >= 42 deg) -> turn.
 * 4. Roundabouts (sustained circular curvature spanning 18-180m) -> roundabout with exit count.
 */
export function extractTurnsFromRouteCoords(routeCoords: [number, number][]): JSONTurnPoint[] {
  if (!routeCoords || routeCoords.length < 4) return [];

  const N = routeCoords.length;
  const cumDist: number[] = new Array(N);
  cumDist[0] = 0;
  for (let i = 1; i < N; i++) {
    const dx = routeCoords[i][0] - routeCoords[i - 1][0];
    const dy = routeCoords[i][1] - routeCoords[i - 1][1];
    cumDist[i] = cumDist[i - 1] + Math.hypot(dx, dy);
  }

  const totalLen = cumDist[N - 1];
  if (totalLen < 20) return [];

  const getPointAtDist = (d: number): [number, number] => {
    if (d <= 0) return routeCoords[0];
    if (d >= totalLen) return routeCoords[N - 1];
    let low = 0;
    let high = N - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (cumDist[mid] < d) low = mid + 1;
      else high = mid - 1;
    }
    const idx = Math.max(1, low);
    const d0 = cumDist[idx - 1];
    const d1 = cumDist[idx];
    const segLen = d1 - d0;
    if (segLen <= 0.001) return routeCoords[idx];
    const t = (d - d0) / segLen;
    return [
      routeCoords[idx - 1][0] + t * (routeCoords[idx][0] - routeCoords[idx - 1][0]),
      routeCoords[idx - 1][1] + t * (routeCoords[idx][1] - routeCoords[idx - 1][1]),
    ];
  };

  const getAngleDeltaAt = (d: number, W: number): number => {
    const pBack = getPointAtDist(d - W);
    const pFwd = getPointAtDist(d + W);
    const pCurr = getPointAtDist(d);

    const vInX = pCurr[0] - pBack[0];
    const vInY = pCurr[1] - pBack[1];
    const vOutX = pFwd[0] - pCurr[0];
    const vOutY = pFwd[1] - pCurr[1];

    const hIn = Math.atan2(vInY, vInX) * (180 / Math.PI);
    const hOut = Math.atan2(vOutY, vOutX) * (180 / Math.PI);

    let delta = hOut - hIn;
    while (delta > 180) delta -= 360;
    while (delta < -180) delta += 360;
    return delta;
  };

  // 1. Detect Roundabouts
  // Roundabouts exhibit continuous curvature (in Continental Europe: counter-clockwise, delta < 0 in ETS2 X-East, Z-South)
  const roundabouts: Array<{
    startDist: number;
    endDist: number;
    entryPt: [number, number];
    exitNum: number;
    totalAngle: number;
  }> = [];

  const rbSampleStep = 2.5;
  const rbWindow = 8;
  let curRb: Array<{ d: number; delta: number; rate: number }> = [];

  for (let d = 10; d < totalLen - 10; d += rbSampleStep) {
    const delta = getAngleDeltaAt(d, rbWindow);
    const rate = Math.abs(delta) / (rbWindow * 2);

    const isRbSample = delta < -6 && rate >= 0.65 && rate <= 4.5;
    if (isRbSample) {
      curRb.push({ d, delta, rate });
    } else {
      if (curRb.length >= 6) {
        const startDist = curRb[0].d;
        const endDist = curRb[curRb.length - 1].d;
        const span = endDist - startDist;
        if (span >= 16 && span <= 180) {
          const avgRate = curRb.reduce((sum, s) => sum + s.rate, 0) / curRb.length;
          const arcAngleDeg = avgRate * span;

          let exitNum = 1;
          if (arcAngleDeg >= 145) exitNum = 4;
          else if (arcAngleDeg >= 100) exitNum = 3;
          else if (arcAngleDeg >= 55) exitNum = 2;
          else exitNum = 1;

          roundabouts.push({
            startDist,
            endDist,
            entryPt: getPointAtDist(startDist),
            exitNum,
            totalAngle: Math.round(arcAngleDeg),
          });
        }
      }
      curRb = [];
    }
  }

  // 2. Scan for individual maneuvers (turns, exits, forks)
  const tightW = 8;
  const medW = 16;

  interface RawManeuver {
    idx: number;
    dist: number;
    deltaTight: number;
    deltaMed: number;
    rateTight: number;
    rateMed: number;
    isSharpTurn: boolean;
  }

  const rawManeuvers: RawManeuver[] = [];

  for (let i = 1; i < N - 1; i++) {
    const dCurr = cumDist[i];
    if (dCurr < 10 || dCurr > totalLen - 10) continue;

    // Skip points within detected roundabouts (including exit buffer)
    const inRb = roundabouts.some(rb => dCurr >= rb.startDist - 10 && dCurr <= rb.endDist + 20);
    if (inRb) continue;

    const deltaTight = getAngleDeltaAt(dCurr, tightW);
    const deltaMed = getAngleDeltaAt(dCurr, medW);

    const rateTight = Math.abs(deltaTight) / (tightW * 2);
    const rateMed = Math.abs(deltaMed) / (medW * 2);

    // CRITICAL FILTER:
    // Highway curves have rate < CURVE_RATE_MAX deg/m (radius > 140m) -> Skipped!
    // Sharp intersection turns: rateTight >= TURN_RATE_MIN deg/m and deltaTight >= TURN_ANGLE_MIN deg.
    // Exits and ramp forks: rateMed >= 0.45 deg/m, deltaMed >= EXIT_ANGLE_MIN deg, and rateMed < EXIT_RATE_MAX.
    const isSharpTurn = Math.abs(deltaTight) >= TURN_ANGLE_MIN && rateTight >= TURN_RATE_MIN;
    const isExitOrFork = Math.abs(deltaMed) >= EXIT_ANGLE_MIN && rateMed >= 0.45 && rateMed < EXIT_RATE_MAX;

    if (isSharpTurn || isExitOrFork) {
      rawManeuvers.push({
        idx: i,
        dist: dCurr,
        deltaTight,
        deltaMed,
        rateTight,
        rateMed,
        isSharpTurn,
      });
    }
  }

  const turnPoints: JSONTurnPoint[] = [];

  // Add roundabouts
  for (const rb of roundabouts) {
    turnPoints.push({
      x: rb.entryPt[0],
      y: rb.entryPt[1],
      type: 'roundabout',
      dir: 'left',
      absAngle: rb.totalAngle,
      roundaboutExit: rb.exitNum,
      distAlong: rb.startDist,
      endDistAlong: rb.endDist,
    });
  }

  // Cluster and classify individual maneuvers
  let cluster: RawManeuver[] = [];

  const flushCluster = (c: RawManeuver[]) => {
    if (c.length === 0) return;
    let apex = c[0];
    for (let j = 1; j < c.length; j++) {
      if (Math.max(c[j].rateTight, c[j].rateMed) > Math.max(apex.rateTight, apex.rateMed)) {
        apex = c[j];
      }
    }

    const angleAtApex = getAngleDeltaAt(apex.dist, 14);
    const absAngle = Math.abs(angleAtApex);
    if (absAngle < 16) return;

    // In ETS2 (X East, Z South): delta > 0 is RIGHT, delta < 0 is LEFT
    const isRight = angleAtApex > 0;
    let type: 'turn' | 'highway-exit' | 'highway-entry' | 'roundabout' | 'u-turn' = 'turn';
    let dir: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right' = isRight ? 'right' : 'left';

    if (absAngle >= 140) {
      type = 'u-turn';
      dir = 'left';
    } else if (absAngle >= 42 && apex.isSharpTurn) {
      type = 'turn';
      dir = isRight ? 'right' : 'left';
    } else if (absAngle >= 16 && absAngle < 45) {
      type = 'highway-exit';
      dir = isRight ? 'slight-right' : 'slight-left';
    } else {
      type = 'turn';
      dir = isRight ? 'right' : 'left';
    }

    turnPoints.push({
      x: routeCoords[apex.idx][0],
      y: routeCoords[apex.idx][1],
      type,
      dir,
      absAngle: Math.round(absAngle),
      distAlong: apex.dist,
      coordIdx: apex.idx,
    });
  };

  for (const m of rawManeuvers) {
    if (cluster.length === 0) {
      cluster.push(m);
    } else {
      const prev = cluster[cluster.length - 1];
      const sameSign = (prev.deltaMed > 0 && m.deltaMed > 0) || (prev.deltaMed < 0 && m.deltaMed < 0);
      if (sameSign && (m.dist - prev.dist) < 35) {
        cluster.push(m);
      } else {
        flushCluster(cluster);
        cluster = [m];
      }
    }
  }
  flushCluster(cluster);

  // Chronological sort by distance along the route
  turnPoints.sort((a, b) => (a.distAlong ?? 0) - (b.distAlong ?? 0));
  return turnPoints;
}

/**
 * Generates turn-by-turn navigation instructions for CarPlay
 */
export function generateNextInstruction(
  routeCoords: [number, number][],
  px: number,
  py: number,
  destName?: string | null,
  segmentLanes?: number[],
  jsonTurnPoints?: JSONTurnPoint[],
  playerHeading?: number,
  speedLimit?: number,
  currentSpeed?: number,
  roadType?: string
): InstructionResult {
  const result: InstructionResult = {
    primary: null,
    upcoming: [],
  };

  if (!routeCoords || routeCoords.length < 2) return result;

  const N = routeCoords.length;

  // 1. Find nearest coordinate index to player (with heading alignment disambiguation)
  let bestIdx = 0;
  let minDistSq = Infinity;
  for (let i = 0; i < N; i++) {
    const dx = routeCoords[i][0] - px;
    const dy = routeCoords[i][1] - py;
    let distSq = dx * dx + dy * dy;

    // If player heading is provided, penalize points moving in opposite direction
    // (prevents snapping to the wrong carriageway on dual carriage / highway interchanges)
    if (playerHeading != null && i < N - 1) {
      const segDx = routeCoords[i + 1][0] - routeCoords[i][0];
      const segDy = routeCoords[i + 1][1] - routeCoords[i][1];
      const segBearing = (Math.atan2(segDx, -segDy) * 180 / Math.PI + 360) % 360;
      let angleDiff = Math.abs(segBearing - playerHeading);
      while (angleDiff > 180) angleDiff = 360 - angleDiff;
      if (angleDiff > 90) {
        distSq += 2500; // 50m penalty
      }
    }

    if (distSq < minDistSq) {
      minDistSq = distSq;
      bestIdx = i;
    }
  }

  // 2. Cumulative distance along polyline from bestIdx to end
  const cumDist: number[] = new Array(N);
  cumDist[0] = 0;
  for (let i = 1; i < N; i++) {
    cumDist[i] = cumDist[i - 1] + Math.hypot(
      routeCoords[i][0] - routeCoords[i - 1][0],
      routeCoords[i][1] - routeCoords[i - 1][1]
    );
  }
  const totalLen = cumDist[N - 1];
  const playerDistAlong = cumDist[bestIdx];
  const totalRemDist = Math.max(0, totalLen - playerDistAlong);

  const currentLaneCount = segmentLanes && segmentLanes[bestIdx] ? segmentLanes[bestIdx] : 0;

  // 3. Destination reached check (< 35m)
  if (totalRemDist <= 35) {
    result.primary = {
      actionText: 'Ziel erreicht',
      subText: destName ? `Sie haben ${destName} erreicht` : 'Sie haben Ihr Ziel erreicht',
      distanceText: 'Jetzt',
      type: 'straight',
      direction: 'straight',
      distanceMeters: totalRemDist,
      lanes: buildLanes(currentLaneCount, 'straight', 'straight', totalRemDist, speedLimit, currentSpeed, undefined, roadType),
    };
    return result;
  }

  // 4. Resolve turn points
  let turnPoints = jsonTurnPoints;
  if (turnPoints === undefined) {
    turnPoints = extractTurnsFromRouteCoords(routeCoords);
  }

  interface DetectedTurn {
    idx: number;
    distMeters: number;
    deltaAngle: number;
    absAngle: number;
    dir: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right';
    type: 'turn' | 'highway-exit' | 'highway-entry' | 'roundabout' | 'u-turn' | 'straight';
    roundaboutExit?: number;
  }

  const detectedTurns: DetectedTurn[] = [];

  for (const tp of turnPoints) {
    let tpIdx = tp.coordIdx;
    if (tpIdx == null || tpIdx < 0 || tpIdx >= N) {
      let tpMinDistSq = Infinity;
      let foundIdx = 0;
      for (let j = 0; j < N; j++) {
        const dSq = (routeCoords[j][0] - tp.x) ** 2 + (routeCoords[j][1] - tp.y) ** 2;
        if (dSq < tpMinDistSq) {
          tpMinDistSq = dSq;
          foundIdx = j;
        }
      }
      tpIdx = foundIdx;
    }

    const tpDistAlong = tp.distAlong != null ? tp.distAlong : cumDist[tpIdx];
    const relDist = tpDistAlong - playerDistAlong;

    // PASS-THROUGH BUFFER:
    // Prevents maneuvers from jumping away too early while the vehicle is still steering through the turn!
    // - Standard Turns & U-turns: stay active until player is at least 22m PAST the apex (relDist < -22)
    // - Highway exits: stay active until player is at least 30m onto the ramp (relDist < -30)
    // - Roundabouts: stay active until player has cleared the exit (playerDistAlong > endDist + 18)
    if (tp.type === 'roundabout') {
      const rbEnd = tp.endDistAlong != null ? tp.endDistAlong : (tpDistAlong + 40);
      if (playerDistAlong > rbEnd + 18) {
        continue; // Roundabout fully cleared
      }
    } else if (tp.type === 'highway-exit') {
      if (relDist < -30) {
        continue; // Highway exit fully cleared
      }
    } else {
      if (relDist < -22) {
        continue; // Turn fully cleared
      }
    }

    // While in the execution phase (relDist <= 0), distance is clamped to 0 ('Jetzt')
    const displayDist = Math.max(0, relDist);

    detectedTurns.push({
      idx: tpIdx,
      distMeters: displayDist,
      deltaAngle: tp.absAngle ?? 30,
      absAngle: tp.absAngle ?? 30,
      dir: tp.dir || 'right',
      type: tp.type || 'turn',
      roundaboutExit: tp.roundaboutExit,
    });
  }

  detectedTurns.sort((a, b) => a.distMeters - b.distMeters);

  // If no upcoming turns detected: drive straight towards destination
  if (detectedTurns.length === 0) {
    result.primary = {
      actionText: 'Dem Straßenverlauf folgen',
      subText: destName ? `Richtung ${destName}` : undefined,
      distanceText: formatDist(totalRemDist),
      type: 'straight',
      direction: 'straight',
      distanceMeters: totalRemDist,
      lanes: buildLanes(currentLaneCount, 'straight', 'straight', totalRemDist, speedLimit, currentSpeed, undefined, roadType),
    };
    return result;
  }

  const nextTurn = detectedTurns[0];
  const dist = nextTurn.distMeters;
  const distText = formatDist(dist);

  // If next maneuver is far (> 1500 m): drive straight, preview upcoming maneuver
  if (dist > 1500) {
    result.primary = {
      actionText: 'Dem Straßenverlauf folgen',
      subText: destName ? `Richtung ${destName}` : undefined,
      distanceText: distText,
      type: 'straight',
      direction: 'straight',
      distanceMeters: dist,
      lanes: buildLanes(currentLaneCount, 'straight', 'straight', dist, speedLimit, currentSpeed, undefined, roadType),
    };

    result.upcoming = detectedTurns.slice(0, 3).map((t) => ({
      dir: (t.dir === 'slight-left' ? 'left' : t.dir === 'slight-right' ? 'right' : t.dir) as 'left' | 'straight' | 'right',
      distText: formatDist(t.distMeters),
    }));

    return result;
  }

  // Active maneuver formulation
  const isRight = nextTurn.dir === 'right' || nextTurn.dir === 'slight-right';
  const dirWord = isRight ? 'rechts' : 'links';
  const dirWordCap = isRight ? 'Rechts' : 'Links';

  let actionText = '';
  let maneuverType: 'turn' | 'straight' | 'roundabout' | 'highway-exit' | 'highway-entry' | 'u-turn' = nextTurn.type as any;
  let maneuverDir: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right' = nextTurn.dir;

  if (nextTurn.type === 'roundabout') {
    maneuverType = 'roundabout';
    maneuverDir = 'left';
    const exitStr = nextTurn.roundaboutExit ? `${nextTurn.roundaboutExit}.` : 'nächste';
    if (dist < 25) {
      actionText = `Jetzt die ${exitStr} Ausfahrt nehmen`;
    } else if (dist <= 250) {
      actionText = `Im Kreisverkehr die ${exitStr} Ausfahrt nehmen`;
    } else {
      actionText = `In ${distText} Kreisverkehr (${exitStr} Ausfahrt)`;
    }
  } else if (nextTurn.type === 'highway-exit' || (roadType === 'freeway' && (nextTurn.dir === 'slight-right' || nextTurn.dir === 'right') && nextTurn.absAngle < 60)) {
    maneuverType = 'highway-exit';
    maneuverDir = isRight ? 'slight-right' : 'slight-left';
    if (dist < 25) {
      actionText = `Jetzt Ausfahrt ${dirWord} nehmen`;
    } else if (dist <= 350) {
      actionText = `Ausfahrt ${dirWord} nehmen`;
    } else {
      actionText = `In ${distText} Ausfahrt ${dirWord} nehmen`;
    }
  } else if (nextTurn.type === 'highway-entry') {
    maneuverType = 'highway-entry';
    maneuverDir = isRight ? 'slight-right' : 'slight-left';
    if (dist < 25) {
      actionText = `Jetzt auf Autobahn auffahren`;
    } else if (dist <= 350) {
      actionText = `Auf Autobahn auffahren`;
    } else {
      actionText = `In ${distText} auf Autobahn auffahren`;
    }
  } else if (nextTurn.absAngle >= 135) {
    maneuverType = 'u-turn';
    maneuverDir = 'left';
    actionText = dist < 25 ? 'Jetzt wenden' : (dist <= 250 ? 'Bitte wenden' : `In ${distText} wenden`);
  } else if (nextTurn.absAngle >= 115) {
    maneuverType = 'turn';
    maneuverDir = isRight ? 'right' : 'left';
    if (dist < 25) {
      actionText = `Jetzt scharf ${dirWord} abbiegen`;
    } else if (dist <= 250) {
      actionText = `Scharf ${dirWord} abbiegen`;
    } else {
      actionText = `In ${distText} scharf ${dirWord} abbiegen`;
    }
  } else if (nextTurn.absAngle >= 28) {
    maneuverType = 'turn';
    maneuverDir = isRight ? 'right' : 'left';
    if (dist < 25) {
      actionText = `Jetzt ${dirWord} abbiegen`;
    } else if (dist <= 250) {
      actionText = `${dirWordCap} abbiegen`;
    } else {
      actionText = `In ${distText} ${dirWord} abbiegen`;
    }
  } else {
    maneuverType = 'highway-exit';
    maneuverDir = isRight ? 'slight-right' : 'slight-left';
    if (dist < 25) {
      actionText = `Jetzt ${dirWord} halten`;
    } else if (dist <= 300) {
      actionText = `${dirWordCap} halten`;
    } else {
      actionText = `In ${distText} ${dirWord} halten`;
    }
  }

  result.primary = {
    actionText,
    subText: destName ? `Richtung ${destName}` : undefined,
    distanceText: distText,
    type: maneuverType,
    direction: maneuverDir,
    distanceMeters: dist,
    lanes: buildLanes(currentLaneCount, maneuverDir, maneuverType, dist, speedLimit, currentSpeed, nextTurn.absAngle, roadType),
    roundaboutExit: nextTurn.roundaboutExit,
  };

  result.upcoming = detectedTurns.slice(1, 4).map((t) => ({
    dir: (t.dir === 'slight-left' ? 'left' : t.dir === 'slight-right' ? 'right' : t.dir) as 'left' | 'straight' | 'right',
    distText: formatDist(t.distMeters),
  }));

  return result;
}
