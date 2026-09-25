import type { NearbySemaphore } from '../components/GameMapWidget.types';

export type TrafficLightColor = 'red' | 'yellow' | 'red-yellow' | 'green' | 'blinking-yellow' | 'off';

export interface ApproachingTrafficLight {
  id: number;
  distance: number;       // meters to traffic light (0..100)
  state: number;          // raw state integer
  color: TrafficLightColor;
  label: string;          // German human-readable label
  timeRemaining?: number; // seconds remaining in current light phase
  x: number;
  z: number;
  heading?: number;
}

/**
 * State code to color & label mapping based on Prism3D / ETS2 engine:
 * 0  = off
 * 1  = orange_to_red (yellow before red)
 * 2  = red
 * 4  = orange_to_green (red-yellow before green)
 * 8  = green
 * 32 = sleep (blinking yellow)
 */
export function parseTrafficLightState(state: number): { color: TrafficLightColor; label: string } {
  switch (state) {
    case 2:
      return { color: 'red', label: 'Rot' };
    case 1:
      return { color: 'yellow', label: 'Gelb' };
    case 4:
      return { color: 'red-yellow', label: 'Rot-Gelb' };
    case 8:
      return { color: 'green', label: 'Grün' };
    case 32:
      return { color: 'blinking-yellow', label: 'Blinkend' };
    case 0:
    default:
      return { color: 'off', label: 'Aus' };
  }
}

/**
 * Detects if the truck is approaching a traffic light within maxDistance (default 100m).
 * Only returns the traffic light when it is IN FRONT of the vehicle in the driving corridor
 * AND controlling the vehicle's driving direction (rejects opposing/Gegenfahrbahn traffic lights).
 * Returns null immediately once the truck passes the traffic light or moves away from it.
 */
export function detectApproachingTrafficLight(
  semaphores: NearbySemaphore[] | undefined | null,
  truckX: number | undefined | null,
  truckZ: number | undefined | null,
  truckHeadingRad: number | undefined | null,
  truckBearingDeg?: number | null,
  maxDistance: number = 100
): ApproachingTrafficLight | null {
  if (!semaphores || semaphores.length === 0 || truckX == null || truckZ == null) {
    return null;
  }

  // Determine truck forward unit vector in Prism game coordinates:
  // In ETS2 Prism3D: +X is East, +Z is South.
  // Bearing in degrees: 0° = North (-Z), 90° = East (+X), 180° = South (+Z), 270° = West (-X).
  let fwdX = 0;
  let fwdZ = 0;

  if (truckBearingDeg != null && !isNaN(truckBearingDeg)) {
    const rad = (truckBearingDeg * Math.PI) / 180;
    fwdX = Math.sin(rad);
    fwdZ = -Math.cos(rad);
  } else if (truckHeadingRad != null && !isNaN(truckHeadingRad)) {
    // Standard SCS SDK heading turn fraction: -0.5 to 0.5
    // desiredBearing = -truckHeadingRad * 360
    const rad = -truckHeadingRad * 2 * Math.PI;
    fwdX = Math.sin(rad);
    fwdZ = -Math.cos(rad);
  } else {
    // Fallback: unable to determine heading
    return null;
  }

  let bestLight: ApproachingTrafficLight | null = null;
  let minDistance = maxDistance;
  const maxDistSq = maxDistance * maxDistance;

  for (const sem of semaphores) {
    // type 1 = traffic light (type 2 = gates/toll bar)
    if (sem.type !== 1) continue;

    const dx = sem.x - truckX;
    const dz = sem.z - truckZ;
    const distSq = dx * dx + dz * dz;

    // 1. Strict Distance Filter: Fast rejection before Math.sqrt!
    if (distSq <= 0 || distSq > maxDistSq) {
      continue;
    }

    const dist = Math.sqrt(distSq);

    // 2. Directional / Forward Dot Product:
    // dot > 0 means the semaphore is in front of the vehicle.
    // dot < 0 means the semaphore is behind the vehicle.
    const dot = dx * fwdX + dz * fwdZ;

    // Disappear when behind the vehicle (passed the stop line by more than 2m)
    if (dot < -2.0) {
      continue;
    }

    // 3. Traffic Light Heading / Lane Direction Alignment:
    // A traffic light for the player's driving lane must face the same direction as the player's vehicle
    // (i.e. traffic flow direction in Prism3D prefabs).
    // Opposing traffic lights (Gegenfahrbahn) point ~180° in the opposite direction.
    // Cross-traffic lights point ~90° perpendicular.
    // When turning at an intersection, Gegenfahrbahn traffic lights on the new road
    // or old road will have an opposing direction (dirDot < 0) and are strictly rejected!
    if (sem.heading != null && !isNaN(sem.heading)) {
      const semRad = -sem.heading;
      const semFwdX = Math.sin(semRad);
      const semFwdZ = -Math.cos(semRad);
      const dirDot = fwdX * semFwdX + fwdZ * semFwdZ;

      // dirDot = cos(angle). 0.60 corresponds to ~53° max angle deviation.
      // Gegenfahrbahn is around -1.0, cross traffic is around 0.0.
      if (dirDot < 0.60) {
        continue;
      }
    }

    // 4. Lateral Corridor & Angular Field of View (Lane Corridor Filter):
    // cosAngle = dot / dist.
    // lateralOffset = distance to the left (-) or right (+) of the vehicle's driving centerline.
    const lateralOffset = -dx * fwdZ + dz * fwdX;
    const latDist = Math.abs(lateralOffset);
    const cosAngle = dot / dist;

    // Reject lights that are clearly outside the lane / road corridor:
    if (dist > 25.0) {
      // Approaching from afar (25-100m): traffic light must be within +/- 45° and reasonable lateral distance
      if (cosAngle < 0.70 || latDist > Math.max(14, dist * 0.35)) {
        continue;
      }
    } else if (dist > 10.0) {
      // Medium proximity to intersection (10-25m): allow curbside poles or gantries
      if (cosAngle < 0.45 || latDist > 14.0) {
        continue;
      }
    } else {
      // Immediate stop line (< 10m): allow curbside poles, but ensure it's still near the driving corridor
      if (latDist > 10.0) {
        continue;
      }
    }

    // 5. Select closest valid traffic light in corridor
    if (dist < minDistance) {
      minDistance = dist;
      const { color, label } = parseTrafficLightState(sem.state);
      bestLight = {
        id: sem.id,
        distance: Math.round(dist),
        state: sem.state,
        color,
        label,
        timeRemaining: sem.timeRemaining != null && sem.timeRemaining > 0 ? Math.round(sem.timeRemaining * 10) / 10 : undefined,
        x: sem.x,
        z: sem.z,
        heading: sem.heading,
      };
    }
  }

  return bestLight;
}
