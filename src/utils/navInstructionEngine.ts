export interface LaneInfo {
  type: 'left' | 'slight-left' | 'straight-left' | 'straight' | 'straight-right' | 'slight-right' | 'right';
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
}

export interface InstructionResult {
  primary: NextManeuver | null;
  upcoming: Array<{ dir: 'left' | 'straight' | 'right'; distText: string }>;
}

export function buildLanes(
  laneCount: number,
  dir: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right',
  maneuverType: string
): LaneInfo[] {
  const count = Math.max(1, Math.min(5, laneCount));
  const lanes: LaneInfo[] = [];

  // 1. Straight maneuver (or no turn ahead): all lanes are clean straight arrows
  if (dir === 'straight' || maneuverType === 'straight') {
    for (let i = 0; i < count; i++) {
      lanes.push({ type: 'straight', active: true });
    }
    return lanes;
  }

  // 2. Highway exit / fork ("Ausfahrt nehmen" / "Rechts/Links halten")
  // The exit/fork lane allows continuing straight OR taking the branch -> combination arrow (straight-right / straight-left)
  if (maneuverType === 'highway-exit' || dir === 'slight-left' || dir === 'slight-right') {
    if (dir === 'slight-right' || dir === 'right') {
      for (let i = 0; i < count; i++) {
        if (i === count - 1) {
          lanes.push({ type: 'straight-right', active: true });
        } else {
          lanes.push({ type: 'straight', active: false });
        }
      }
    } else {
      for (let i = 0; i < count; i++) {
        if (i === 0) {
          lanes.push({ type: 'straight-left', active: true });
        } else {
          lanes.push({ type: 'straight', active: false });
        }
      }
    }
    return lanes;
  }

  // 3. Intersection Turns (Left turn "Links abbiegen" or Right turn "Rechts abbiegen")
  // Dedicated turn lanes MUST use pure turn arrows ('left' ↰ or 'right' ↱), NOT combination arrows!
  if (count === 1) {
    if (dir === 'left') {
      lanes.push({ type: 'left', active: true });
    } else if (dir === 'right') {
      lanes.push({ type: 'right', active: true });
    } else {
      lanes.push({ type: 'straight', active: true });
    }
    return lanes;
  }

  if (dir === 'left') {
    const activeLeftCount = count >= 4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      if (i < activeLeftCount) {
        lanes.push({ type: 'left', active: true });
      } else {
        lanes.push({ type: 'straight', active: false });
      }
    }
  } else if (dir === 'right') {
    const activeRightCount = count >= 4 ? 2 : 1;
    const activeStartIndex = count - activeRightCount;
    for (let i = 0; i < count; i++) {
      if (i >= activeStartIndex) {
        lanes.push({ type: 'right', active: true });
      } else {
        lanes.push({ type: 'straight', active: false });
      }
    }
  } else {
    for (let i = 0; i < count; i++) {
      lanes.push({ type: 'straight', active: true });
    }
  }

  return lanes;
}

export interface JSONTurnPoint {
  x: number;
  y: number;
  type?: 'turn' | 'highway-exit' | 'highway-entry' | 'roundabout';
  dir?: 'left' | 'straight' | 'right';
  absAngle?: number;
  coordIdx?: number;
}

export function generateNextInstruction(
  routeCoords: [number, number][],
  px: number,
  py: number,
  destName?: string | null,
  segmentLanes?: number[],
  jsonTurnPoints?: JSONTurnPoint[]
): InstructionResult {
  const result: InstructionResult = {
    primary: null,
    upcoming: [],
  };

  if (!routeCoords || routeCoords.length < 4) return result;

  let bestIdx = 0;
  let minDistSq = Infinity;
  for (let i = 0; i < routeCoords.length; i++) {
    const dx = routeCoords[i][0] - px;
    const dy = routeCoords[i][1] - py;
    const dSq = dx * dx + dy * dy;
    if (dSq < minDistSq) {
      minDistSq = dSq;
      bestIdx = i;
    }
  }

  interface DetectedTurn {
    idx: number;
    distMeters: number;
    deltaAngle: number;
    absAngle: number;
    dir: 'left' | 'straight' | 'right';
    type?: 'turn' | 'highway-exit' | 'highway-entry' | 'roundabout';
  }

  const detectedTurns: DetectedTurn[] = [];

  // Prioritize JSON map file data (nodes.json / roads.json / prefabs.json)
  if (jsonTurnPoints && jsonTurnPoints.length > 0) {
    for (const tp of jsonTurnPoints) {
      // Find nearest coordinate index for JSON turn point
      let tpIdx = tp.coordIdx ?? 0;
      if (tpIdx === 0) {
        let tpMinDistSq = Infinity;
        for (let j = 0; j < routeCoords.length; j++) {
          const dSq = (routeCoords[j][0] - tp.x) ** 2 + (routeCoords[j][1] - tp.y) ** 2;
          if (dSq < tpMinDistSq) {
            tpMinDistSq = dSq;
            tpIdx = j;
          }
        }
      }

      if (tpIdx > bestIdx) {
        // Calculate cumulative distance along polyline to this JSON turn point
        let dAlong = Math.sqrt(minDistSq);
        for (let k = bestIdx; k < tpIdx; k++) {
          dAlong += Math.hypot(
            routeCoords[k + 1][0] - routeCoords[k][0],
            routeCoords[k + 1][1] - routeCoords[k][1]
          );
        }

        detectedTurns.push({
          idx: tpIdx,
          distMeters: dAlong,
          deltaAngle: tp.absAngle ?? 30,
          absAngle: tp.absAngle ?? 30,
          dir: tp.dir || 'right',
          type: tp.type || 'turn',
        });
      }
    }
  }

  // Fallback angle detection if no JSON turn points exist
  if (detectedTurns.length === 0) {
    let cumDist = Math.sqrt(minDistSq);
    for (let i = bestIdx + 1; i < routeCoords.length - 3; i++) {
      const stepDist = Math.hypot(
        routeCoords[i][0] - routeCoords[i - 1][0],
        routeCoords[i][1] - routeCoords[i - 1][1]
      );
      cumDist += stepDist;

      const pPrev = routeCoords[i - 1];
      const pCurr = routeCoords[i];
      const pNext = routeCoords[Math.min(i + 3, routeCoords.length - 1)];

      const heading1 = Math.atan2(pCurr[1] - pPrev[1], pCurr[0] - pPrev[0]) * (180 / Math.PI);
      const heading2 = Math.atan2(pNext[1] - pCurr[1], pNext[0] - pCurr[0]) * (180 / Math.PI);

      let delta = heading2 - heading1;
      while (delta > 180) delta -= 360;
      while (delta < -180) delta += 360;

      const absDelta = Math.abs(delta);
      if (absDelta >= 22) {
        const dir: 'left' | 'straight' | 'right' = delta > 0 ? 'right' : 'left';
        if (
          detectedTurns.length === 0 ||
          cumDist - detectedTurns[detectedTurns.length - 1].distMeters > 30
        ) {
          detectedTurns.push({
            idx: i,
            distMeters: cumDist,
            deltaAngle: delta,
            absAngle: absDelta,
            dir,
            type: 'turn',
          });
        }
      }
    }
  }

  const currentLaneCount = segmentLanes && segmentLanes[bestIdx] ? Math.max(1, segmentLanes[bestIdx]) : 2;

  if (detectedTurns.length === 0) {
    let totalRemDist = 0;
    for (let i = bestIdx; i < routeCoords.length - 1; i++) {
      totalRemDist += Math.hypot(
        routeCoords[i + 1][0] - routeCoords[i][0],
        routeCoords[i + 1][1] - routeCoords[i][1]
      );
    }

    const distText = totalRemDist < 30
      ? 'Jetzt'
      : totalRemDist < 1000
      ? `${Math.round(totalRemDist / 50) * 50} m`
      : `${(totalRemDist / 1000).toFixed(1)} km`;

    result.primary = {
      actionText: 'Geradeaus weiterfahren',
      subText: undefined,
      distanceText: distText,
      type: 'straight',
      direction: 'straight',
      distanceMeters: totalRemDist,
      lanes: buildLanes(currentLaneCount, 'straight', 'straight'),
    };
    return result;
  }

  const nextTurn = detectedTurns[0];
  const dist = nextTurn.distMeters;

  const distText = dist < 25
    ? 'Jetzt'
    : dist < 200
    ? `${Math.round(dist / 10) * 10} m`
    : dist < 1000
    ? `${Math.round(dist / 50) * 50} m`
    : `${(dist / 1000).toFixed(1)} km`;

  // If the upcoming maneuver is more than 2.0 km away, the immediate current instruction is to keep driving straight on the highway
  if (dist > 2000) {
    result.primary = {
      actionText: 'Geradeaus weiterfahren',
      subText: undefined,
      distanceText: distText,
      type: 'straight',
      direction: 'straight',
      distanceMeters: dist,
      lanes: buildLanes(currentLaneCount, 'straight', 'straight'),
    };

    result.upcoming = detectedTurns.slice(0, 3).map((t) => {
      const d = t.distMeters;
      const dText = d < 1000 ? `${Math.round(d / 50) * 50} m` : `${(d / 1000).toFixed(1)} km`;
      return { dir: t.dir, distText: dText };
    });

    return result;
  }

  const dirWord = nextTurn.dir === 'right' ? 'rechts' : 'links';

  let actionText = '';
  let maneuverType: 'turn' | 'straight' | 'roundabout' | 'highway-exit' | 'u-turn' = 'turn';
  let maneuverDir: 'left' | 'slight-left' | 'straight' | 'slight-right' | 'right' = 'straight';

  if (nextTurn.type === 'roundabout') {
    actionText = 'Im Kreisverkehr...';
    maneuverType = 'roundabout';
    maneuverDir = nextTurn.dir === 'right' ? 'right' : 'left';
  } else if (nextTurn.type === 'highway-exit') {
    if (nextTurn.dir === 'left') {
      // Left lane split / staying on main highway
      actionText = 'Geradeaus weiterfahren';
      maneuverType = 'straight';
      maneuverDir = 'straight';
    } else {
      maneuverType = 'highway-exit';
      maneuverDir = 'slight-right';
      if (dist > 400) {
        actionText = `In ${distText} Abfahrt rechts nehmen`;
      } else {
        actionText = 'Abfahrt rechts nehmen';
      }
    }
  } else if (nextTurn.type === 'highway-entry') {
    maneuverType = 'highway-entry';
    maneuverDir = nextTurn.dir === 'right' ? 'slight-right' : 'slight-left';
    if (dist > 400) {
      actionText = `In ${distText} Auffahrt ${nextTurn.dir === 'right' ? 'rechts' : 'links'} nehmen`;
    } else {
      actionText = `Auffahrt ${nextTurn.dir === 'right' ? 'rechts' : 'links'} nehmen`;
    }
  } else if (nextTurn.type === 'turn') {
    if (nextTurn.absAngle >= 135) {
      actionText = 'Wenden';
      maneuverType = 'u-turn';
      maneuverDir = 'left';
    } else if (nextTurn.absAngle >= 65) {
      actionText = `Scharf ${dirWord} abbiegen`;
      maneuverType = 'turn';
      maneuverDir = nextTurn.dir === 'right' ? 'right' : 'left';
    } else if (nextTurn.absAngle >= 28) {
      actionText = `${dirWord === 'rechts' ? 'Rechts' : 'Links'} abbiegen`;
      maneuverType = 'turn';
      maneuverDir = nextTurn.dir === 'right' ? 'right' : 'left';
    } else {
      actionText = `Leicht ${dirWord} abbiegen`;
      maneuverType = 'turn';
      maneuverDir = nextTurn.dir === 'right' ? 'slight-right' : 'slight-left';
    }
  } else {
    // Fallback based on angle & direction
    if (nextTurn.dir === 'left' && nextTurn.absAngle < 28) {
      actionText = 'Geradeaus weiterfahren';
      maneuverType = 'straight';
      maneuverDir = 'straight';
    } else if (nextTurn.absAngle >= 28) {
      actionText = `${dirWord === 'rechts' ? 'Rechts' : 'Links'} abbiegen`;
      maneuverType = 'turn';
      maneuverDir = nextTurn.dir === 'right' ? 'right' : 'left';
    } else if (nextTurn.dir === 'right') {
      maneuverType = 'highway-exit';
      maneuverDir = 'slight-right';
      if (dist > 400) {
        actionText = `In ${distText} Ausfahrt rechts nehmen`;
      } else {
        actionText = 'Ausfahrt rechts nehmen';
      }
    } else {
      actionText = 'Geradeaus weiterfahren';
      maneuverType = 'straight';
      maneuverDir = 'straight';
    }
  }

  const lanes = buildLanes(currentLaneCount, maneuverDir, maneuverType);

  result.primary = {
    actionText,
    subText: undefined,
    distanceText: distText,
    type: maneuverType,
    direction: maneuverDir,
    distanceMeters: dist,
    lanes,
  };

  result.upcoming = detectedTurns.slice(1, 4).map((t) => {
    const d = t.distMeters;
    const dText = d < 1000 ? `${Math.round(d / 50) * 50} m` : `${(d / 1000).toFixed(1)} km`;
    return { dir: t.dir, distText: dText };
  });

  return result;
}
