import fs from 'node:fs';
import path from 'node:path';

// --- Types ---

export interface NodeInfo {
  uid: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  forwardItemUid: string;
  backwardItemUid: string;
}

export interface RoadInfo {
  startNodeUid: string;
  endNodeUid: string;
  roadLookToken?: string;
  lanesLeft?: number;
  lanesRight?: number;
}

export interface Neighbor {
  nodeUid: string;
  distance: number;
  duration: number;
  direction: 'forward' | 'backward';
  dlcGuard: number;
}

export interface Neighbors {
  forward: Neighbor[];
  backward: Neighbor[];
}

// --- Coordinate projection (matches upstream maps projectGameToLatLng) ---

const earthRadiusMeters = 6_370_997;
const lengthOfDegree = (earthRadiusMeters * Math.PI) / 180;

const ets2DefData = {
  mapProjection: 'lambert_conic',
  standardParalel1: 37,
  standardParalel2: 65,
  mapOrigin: [50, 15],
  mapOffset: [16660, 4150],
  mapFactor: [-0.000171570875, 0.0001729241463],
} as const;

function gameToLcc(gx: number, gz: number): [number, number] | null {
  if (gx == null || gz == null) return null;

  let x = gx;
  let y = gz;

  const sx = Math.floor(x / 4000);
  const sy = Math.floor(y / 4000);
  x -= ets2DefData.mapOffset[0];
  y -= ets2DefData.mapOffset[1];

  const ukScaleFactor = 0.75;
  const calais = [-31100, -5500];
  const isUk = sx <= -8 && sy <= -2 && !(sx === -8 && sy === -2);
  if (isUk) {
    x = (x + calais[0] / 2) * ukScaleFactor;
    y = (y + calais[1] / 2) * ukScaleFactor;
  }

  return [
    x * ets2DefData.mapFactor[1] * lengthOfDegree,
    y * ets2DefData.mapFactor[0] * lengthOfDegree,
  ];
}

export interface GraphData {
  graph: Map<string, Neighbors>;
  serviceAreas: Map<string, unknown>;
}

export interface TurnPointInfo {
  x: number;
  y: number;
  bearing: number;
  type?: 'turn' | 'highway-exit' | 'highway-entry' | 'roundabout';
  dir?: 'left' | 'straight' | 'right';
  absAngle?: number;
  coordIdx?: number;
}

export interface RouteResult {
  success: boolean;
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  turnPoints?: TurnPointInfo[];
  segmentLanes?: number[];
}

// --- Spatial index for nearest-node search ---

const SECTOR_SIZE = 2000;

interface SectorNode {
  uid: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
}

class SpatialIndex {
  private sectors = new Map<string, SectorNode[]>();

  insert(node: SectorNode) {
    const key = `${Math.floor(node.x / SECTOR_SIZE)},${Math.floor(node.y / SECTOR_SIZE)}`;
    const arr = this.sectors.get(key) || [];
    arr.push(node);
    this.sectors.set(key, arr);
  }

  nearest(x: number, y: number, maxDist = 5000): SectorNode | null {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);

    let best: SectorNode | null = null;
    let bestDist = maxDist * maxDist;

    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      for (let dy = -maxRadius; dy <= maxRadius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const nodes = this.sectors.get(key);
        if (!nodes) continue;

        for (const node of nodes) {
          const ddx = node.x - x;
          const ddy = node.y - y;
          const dist = ddx * ddx + ddy * ddy;
          if (dist < bestDist) {
            bestDist = dist;
            best = node;
          }
        }
      }
    }

    return best;
  }

  nearestInGraph(x: number, y: number, graph: Map<string, Neighbors>, maxDist = 20000): SectorNode | null {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);

    let best: SectorNode | null = null;
    let bestDist = maxDist * maxDist;

    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      for (let dy = -maxRadius; dy <= maxRadius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const nodes = this.sectors.get(key);
        if (!nodes) continue;

        for (const node of nodes) {
          if (!graph.has(node.uid)) continue;
          const ddx = node.x - x;
          const ddy = node.y - y;
          const dist = ddx * ddx + ddy * ddy;
          if (dist < bestDist) {
            bestDist = dist;
            best = node;
          }
        }
      }
    }

    return best;
  }

  nearestWithHeading(x: number, y: number, heading: number, graph: Map<string, Neighbors> | null, maxDist = 5000): SectorNode | null {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);

    const candidates: SectorNode[] = [];
    const seen = new Set<string>();

    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      for (let dy = -maxRadius; dy <= maxRadius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const nodes = this.sectors.get(key);
        if (!nodes) continue;

        for (const node of nodes) {
          if (seen.has(node.uid)) continue;
          seen.add(node.uid);
          if (graph && !graph.has(node.uid)) continue;
          const ddx = node.x - x;
          const ddy = node.y - y;
          const dist = Math.sqrt(ddx * ddx + ddy * ddy);
          if (dist <= maxDist) {
            candidates.push({ ...node, dist });
          }
        }
      }
    }

    if (candidates.length === 0) return null;

    if (candidates.length === 1) return candidates[0];

    candidates.sort((a, b) => a.dist - b.dist);

    const top = candidates.slice(0, 5);
    const normalizedHeading = ((heading % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    let best: SectorNode | null = null;
    let bestScore = Infinity;

    for (const node of top) {
      let delta = ((node.rotation - normalizedHeading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2);
      if (delta > Math.PI) delta = Math.PI * 2 - delta;
      const score = node.dist + delta * 1200;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }

    return best;
  }
}

// --- Binary Heap for A* priority queue ---

class BinaryHeap<T> {
  private data: T[] = [];
  private comparator: (a: T, b: T) => number;

  constructor(comparator: (a: T, b: T) => number) {
    this.comparator = comparator;
  }

  get length(): number {
    return this.data.length;
  }

  push(value: T) {
    this.data.push(value);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(idx: number) {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.comparator(this.data[idx], this.data[parentIdx]) < 0) {
        [this.data[idx], this.data[parentIdx]] = [this.data[parentIdx], this.data[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  private sinkDown(idx: number) {
    const length = this.data.length;
    while (true) {
      let smallest = idx;
      const left = idx * 2 + 1;
      const right = idx * 2 + 2;

      if (left < length && this.comparator(this.data[left], this.data[smallest]) < 0) {
        smallest = left;
      }
      if (right < length && this.comparator(this.data[right], this.data[smallest]) < 0) {
        smallest = right;
      }
      if (smallest !== idx) {
        [this.data[idx], this.data[smallest]] = [this.data[smallest], this.data[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

// --- Graph loader ---

export interface PrefabMetadata {
  type: 'roundabout' | 'highway-exit' | 'turn' | 'road';
  token: string;
  path: string;
}

let cachedGraph: {
  data: GraphData;
  nodes: NodeInfo[];
  spatialIndex: SpatialIndex;
  roads: Map<string, RoadInfo>;
  nodeLUT: Map<string, NodeInfo>;
  nodePrefabMap: Map<string, PrefabMetadata>;
} | null = null;

function normalizeUid(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return val.toString(16);
  return '0';
}

function classifyPrefabPath(pathStr: string): 'roundabout' | 'highway-exit' | 'highway-entry' | 'turn' | 'road' {
  const p = pathStr.toLowerCase();
  if (p.includes('roundabout')) {
    return 'roundabout';
  }
  if (
    p.includes('highway_exit') ||
    p.includes('hw_exit') ||
    p.includes('exit') ||
    p.includes('offramp') ||
    p.includes('fork')
  ) {
    return 'highway-exit';
  }
  if (
    p.includes('ramp') ||
    p.includes('onramp') ||
    p.includes('entry') ||
    p.includes('join') ||
    p.includes('merge')
  ) {
    return 'highway-entry';
  }
  if (
    p.includes('junction') ||
    p.includes('crossroad') ||
    p.includes('t_junc') ||
    p.includes('x_junc') ||
    p.includes('y_junc') ||
    p.includes('/cross_') ||
    p.includes('_cross_') ||
    p.includes('intersection')
  ) {
    return 'turn';
  }
  return 'road';
}

function parseGraphData(json: string): GraphData {
  const raw = JSON.parse(json);

  const graph = new Map<string, Neighbors>();
  if (raw.graph && Array.isArray(raw.graph)) {
    for (const entry of raw.graph) {
      const [nid, neighbors] = entry;
      // Ensure neighbor nodeUid values are strings (they already are from JSON)
      graph.set(nid, neighbors);
    }
  }

  const serviceAreas = new Map<string, unknown>();
  if (raw.serviceAreas && Array.isArray(raw.serviceAreas)) {
    for (const entry of raw.serviceAreas) {
      const [nid, area] = entry;
      serviceAreas.set(nid, area);
    }
  }

  return { graph, serviceAreas };
}

function loadGraph(mapDataDir: string, map: 'europe' | 'usa' = 'europe'): {
  data: GraphData;
  nodes: NodeInfo[];
  spatialIndex: SpatialIndex;
  roads: Map<string, RoadInfo>;
} {
  if (cachedGraph) return cachedGraph;

  const graphPath = path.join(mapDataDir, `${map}-graph.json`);
  const nodesPath = path.join(mapDataDir, `${map}-nodes.json`);

  if (!fs.existsSync(graphPath)) {
    throw new Error(`Graph file not found: ${graphPath}`);
  }
  if (!fs.existsSync(nodesPath)) {
    throw new Error(`Nodes file not found: ${nodesPath}`);
  }

  const graphJson = fs.readFileSync(graphPath, 'utf8');
  const graphData = parseGraphData(graphJson);

  const nodesJson = fs.readFileSync(nodesPath, 'utf8');
  const nodesArray: unknown[] = JSON.parse(nodesJson);

  const nodes: NodeInfo[] = (nodesArray as Array<Record<string, unknown>>).map((n) => ({
    uid: normalizeUid(n.uid),
    x: n.x as number,
    y: n.y as number,
    z: n.z as number,
    rotation: typeof n.rotation === 'number' ? n.rotation : 0,
    forwardItemUid: normalizeUid(n.forwardItemUid),
    backwardItemUid: normalizeUid(n.backwardItemUid),
  }));

  let roadLooksPath = path.join(mapDataDir, `${map}-roadLooks.json`);
  if (!fs.existsSync(roadLooksPath)) {
    const alt = path.join(mapDataDir, `${map}-road-looks.json`);
    if (fs.existsSync(alt)) roadLooksPath = alt;
  }
  const roadLooksMap = new Map<string, { lanesLeft: number; lanesRight: number }>();
  if (fs.existsSync(roadLooksPath)) {
    try {
      const roadLooksJson = fs.readFileSync(roadLooksPath, 'utf8');
      const rawLooks = JSON.parse(roadLooksJson);
      for (const look of rawLooks) {
        if (look && look.token) {
          const left = Array.isArray(look.lanesLeft) ? look.lanesLeft.length : 1;
          const right = Array.isArray(look.lanesRight) ? look.lanesRight.length : 1;
          roadLooksMap.set(String(look.token), { lanesLeft: left, lanesRight: right });
        }
      }
      console.log(`[route-service] Loaded ${roadLooksMap.size} roadLooks from ${roadLooksPath}`);
    } catch (e: any) {
      console.error('[route-service] Failed to parse roadLooks:', e.message);
    }
  }

  const roadsPath = path.join(mapDataDir, `${map}-roads.json`);
  const roads = new Map<string, RoadInfo>();
  if (fs.existsSync(roadsPath)) {
    try {
      const roadsJson = fs.readFileSync(roadsPath, 'utf8');
      const rawRoads = JSON.parse(roadsJson);
      for (const r of rawRoads) {
        const rUid = normalizeUid(r.uid);
        const lookToken = r.roadLookToken ? String(r.roadLookToken) : undefined;
        const lookInfo = lookToken ? roadLooksMap.get(lookToken) : undefined;
        roads.set(rUid, {
          startNodeUid: normalizeUid(r.startNodeUid),
          endNodeUid: normalizeUid(r.endNodeUid),
          roadLookToken: lookToken,
          lanesLeft: lookInfo?.lanesLeft ?? 1,
          lanesRight: lookInfo?.lanesRight ?? 1,
        });
      }
      console.log(`[route-service] Loaded ${roads.size} roads from ${roadsPath}`);
    } catch (e: any) {
      console.error('[route-service] Failed to parse roads:', e.message);
    }
  } else {
    console.warn(`[route-service] Roads file not found: ${roadsPath}`);
  }

  const prefabDescriptionsMap = new Map<string, string>();
  let descPath = path.join(mapDataDir, `${map}-prefabDescriptions.json`);
  if (!fs.existsSync(descPath)) {
    const alt = path.join(mapDataDir, `${map}-prefab-descriptions.json`);
    if (fs.existsSync(alt)) descPath = alt;
  }
  if (fs.existsSync(descPath)) {
    try {
      const rawDescs = JSON.parse(fs.readFileSync(descPath, 'utf8'));
      for (const d of rawDescs) {
        if (d && d.token && d.path) {
          prefabDescriptionsMap.set(String(d.token), String(d.path));
        }
      }
      console.log(`[route-service] Loaded ${prefabDescriptionsMap.size} prefab descriptions from ${descPath}`);
    } catch (e: any) {
      console.error('[route-service] Failed to parse prefabDescriptions:', e.message);
    }
  }

  const nodePrefabMap = new Map<string, PrefabMetadata>();
  const prefabsPath = path.join(mapDataDir, `${map}-prefabs.json`);
  if (fs.existsSync(prefabsPath)) {
    try {
      const rawPrefabs = JSON.parse(fs.readFileSync(prefabsPath, 'utf8'));
      for (const pf of rawPrefabs) {
        if (pf && pf.token && Array.isArray(pf.nodeUids)) {
          const token = String(pf.token);
          const pfPath = prefabDescriptionsMap.get(token) || token;
          const type = classifyPrefabPath(pfPath);
          const metadata: PrefabMetadata = { type, token, path: pfPath };
          for (const nUid of pf.nodeUids) {
            nodePrefabMap.set(normalizeUid(nUid), metadata);
          }
        }
      }
      console.log(`[route-service] Mapped ${nodePrefabMap.size} nodes to prefabs from ${prefabsPath}`);
    } catch (e: any) {
      console.error('[route-service] Failed to parse prefabs:', e.message);
    }
  }

  const spatialIndex = new SpatialIndex();
  const nodeLUT = new Map<string, NodeInfo>();
  for (const node of nodes) {
    spatialIndex.insert({
      uid: node.uid,
      x: node.x,
      y: node.y,
      z: node.z,
      rotation: node.rotation,
    });
    nodeLUT.set(node.uid, node);
  }

  console.log(`[route-service] Loaded ${nodes.length} nodes, ${graphData.graph.size} graph entries, ${roads.size} roads, ${nodePrefabMap.size} prefab nodes`);

  cachedGraph = { data: graphData, nodes, spatialIndex, roads, nodeLUT, nodePrefabMap };
  return cachedGraph;
}

function clearCache() {
  cachedGraph = null;
}

// --- A* Routing with binary heap ---

interface RouteResultInternal {
  path: string[];
  distance: number;
  duration: number;
}

interface PathState {
  nodeUid: string;
  direction: 'forward' | 'backward';
}

function findRoutePath(
  startUid: string,
  endUid: string,
  graph: Map<string, Neighbors>,
  nodeLUT: Map<string, NodeInfo>,
  heading?: number,
): RouteResultInternal | null {
  if (!graph.has(startUid)) {
    console.warn('[route-service] start node not in graph:', startUid);
    return null;
  }
  if (!graph.has(endUid)) {
    console.warn('[route-service] end node not in graph:', endUid);
    return null;
  }

  const startNode = nodeLUT.get(startUid);
  const endNode = nodeLUT.get(endUid);
  if (!startNode || !endNode) {
    console.warn('[route-service] start or end node not in nodeLUT');
    return null;
  }

  const openSet = new BinaryHeap<PathState>((a, b) => {
    const fa = fScore.get(`${a.nodeUid}:${a.direction}`) ?? Infinity;
    const fb = fScore.get(`${b.nodeUid}:${b.direction}`) ?? Infinity;
    return fa - fb;
  });

  const stateKey = (s: PathState) => `${s.nodeUid}:${s.direction}`;
  const gScore = new Map<string, number>();
  const fScore = new Map<string, number>();
  const cameFrom = new Map<string, { state: PathState; edgeDist: number }>();

  const h = (n: NodeInfo) => {
    const dx = n.x - endNode.x;
    const dy = n.y - endNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const h0 = h(startNode);

  // Push both forward and backward initial states to openSet
  const faDelta = heading != null
    ? Math.abs(((startNode.rotation - heading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI)
    : 0;
  const isBackwardMoreAligned = heading != null && faDelta > Math.PI / 2;

  const fwdState: PathState = { nodeUid: startUid, direction: 'forward' };
  const bwdState: PathState = { nodeUid: startUid, direction: 'backward' };

  const fwdKey = stateKey(fwdState);
  const bwdKey = stateKey(bwdState);

  gScore.set(fwdKey, isBackwardMoreAligned ? 50000 : 0);
  gScore.set(bwdKey, isBackwardMoreAligned ? 0 : 50000);

  fScore.set(fwdKey, (gScore.get(fwdKey)!) + h0);
  fScore.set(bwdKey, (gScore.get(bwdKey)!) + h0);

  openSet.push(fwdState);
  openSet.push(bwdState);

  let iterations = 0;
  const MAX_ITERATIONS = 500000;

  while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const current = openSet.pop()!;
    const curKey = stateKey(current);

    if (current.nodeUid === endUid) {
      // Reconstruct path
      const routePath: string[] = [endUid];
      let currKey = curKey;
      let totalDist = 0;

      while (cameFrom.has(currKey)) {
        const edge = cameFrom.get(currKey)!;
        totalDist += edge.edgeDist;
        currKey = stateKey(edge.state);
        routePath.unshift(edge.state.nodeUid);
      }

      console.log(`[route-service] Truckermudgeon A* found path in ${iterations} iterations, ${routePath.length} nodes`);
      return {
        path: routePath,
        distance: totalDist,
        duration: totalDist / 15,
      };
    }

    const neighborsObj = graph.get(current.nodeUid);
    if (!neighborsObj) continue;

    // Follow truckermudgeon directional search: forward direction uses forward edges, backward uses backward edges
    const neighborsInDir = current.direction === 'forward' ? neighborsObj.forward : neighborsObj.backward;
    const currentG = gScore.get(curKey) ?? Infinity;

    for (const neighbor of neighborsInDir) {
      const neighborState: PathState = {
        nodeUid: neighbor.nodeUid,
        direction: neighbor.direction,
      };
      const nKey = stateKey(neighborState);
      const tentativeG = currentG + neighbor.distance;

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, { state: current, edgeDist: neighbor.distance });
        gScore.set(nKey, tentativeG);

        const targetNode = nodeLUT.get(neighbor.nodeUid);
        const fVal = tentativeG + (targetNode ? h(targetNode) : 0);
        fScore.set(nKey, fVal);

        openSet.push(neighborState);
      }
    }
  }

  // Fallback: If directional search yielded no path, try bi-directional fallback
  console.warn(`[route-service] Directional search exhausted after ${iterations} iterations, running fallback...`);
  return findRoutePathFallback(startUid, endUid, graph, nodeLUT, heading);
}

function findRoutePathFallback(
  startUid: string,
  endUid: string,
  graph: Map<string, Neighbors>,
  nodeLUT: Map<string, NodeInfo>,
  heading?: number,
): RouteResultInternal | null {
  const startNode = nodeLUT.get(startUid);
  const endNode = nodeLUT.get(endUid);
  if (!startNode || !endNode) return null;

  const openSet = new BinaryHeap<{ uid: string; f: number }>((a, b) => a.f - b.f);
  const gScore = new Map<string, number>();
  const cameFrom = new Map<string, string>();
  const closed = new Set<string>();

  const h = (n: NodeInfo) => Math.sqrt((n.x - endNode.x) ** 2 + (n.y - endNode.y) ** 2);

  gScore.set(startUid, 0);
  openSet.push({ uid: startUid, f: h(startNode) });

  let iterations = 0;
  while (openSet.length > 0 && iterations < 500000) {
    iterations++;
    const current = openSet.pop()!;
    if (current.uid === endUid) {
      const routePath: string[] = [endUid];
      let curr = endUid;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr)!;
        routePath.unshift(curr);
      }
      return { path: routePath, distance: gScore.get(endUid)!, duration: 0 };
    }

    if (closed.has(current.uid)) continue;
    closed.add(current.uid);

    const neighborsObj = graph.get(current.uid);
    if (!neighborsObj) continue;

    let neighbors = [...neighborsObj.forward, ...neighborsObj.backward];

    if (heading != null && current.uid === startUid && startNode) {
      const faDelta = Math.abs(((startNode.rotation - heading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const preferForward = faDelta <= Math.PI / 2;
      neighbors = preferForward ? neighborsObj.forward : neighborsObj.backward;
    }

    for (const neighbor of neighbors) {
      if (closed.has(neighbor.nodeUid)) continue;
      const tentativeG = (gScore.get(current.uid) ?? Infinity) + neighbor.distance;
      if (tentativeG < (gScore.get(neighbor.nodeUid) ?? Infinity)) {
        cameFrom.set(neighbor.nodeUid, current.uid);
        gScore.set(neighbor.nodeUid, tentativeG);
        const targetNode = nodeLUT.get(neighbor.nodeUid);
        openSet.push({ uid: neighbor.nodeUid, f: tentativeG + (targetNode ? h(targetNode) : 0) });
      }
    }
  }

  return null;
}

function heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// --- Hermite spline interpolation (matches truckermudgeon/maps geom.ts) ---

function getValidTangent(rot: number, chordAngle: number): number {
  let delta = rot - chordAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  if (Math.abs(delta) > Math.PI / 2) {
    rot += Math.PI;
    delta = rot - chordAngle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
  }
  const maxDev = Math.PI / 6;
  if (delta > maxDev) rot = chordAngle + maxDev;
  if (delta < -maxDev) rot = chordAngle - maxDev;
  return rot;
}

function toSplinePoints(
  start: { x: number; y: number; rotation: number },
  end: { x: number; y: number; rotation: number },
  steps?: number,
): [number, number][] {
  const p0: [number, number] = [start.x, start.y];
  const p1: [number, number] = [end.x, end.y];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 0.1) return [p0, p1];

  const chordAngle = Math.atan2(dy, dx);
  const startRot = getValidTangent(start.rotation, chordAngle);
  const endRot = getValidTangent(end.rotation, chordAngle);

  // Dynamic step count based on angle difference, matching reference
  if (steps == null) {
    steps = Math.min(
      8,
      Math.floor(Math.abs(Math.tan(startRot - endRot)) * 20) + 1,
    );
  }
  if (steps < 1) steps = 1;

  // Cubic Hermite interpolation tangent vectors aligned with road direction
  const m0: [number, number] = [Math.cos(startRot) * dist, Math.sin(startRot) * dist];
  const m1: [number, number] = [Math.cos(endRot) * dist, Math.sin(endRot) * dist];

  const res: [number, number][] = [];
  for (let i = 0; i < steps + 1; i++) {
    const t = i / steps;
    const t2 = t * t;
    const t3 = t2 * t;

    const h00 = 2 * t3 - 3 * t2 + 1;
    const h10 = t3 - 2 * t2 + t;
    const h01 = -2 * t3 + 3 * t2;
    const h11 = t3 - t2;

    const rx = h00 * p0[0] + h10 * m0[0] + h01 * p1[0] + h11 * m1[0];
    const ry = h00 * p0[1] + h10 * m0[1] + h01 * p1[1] + h11 * m1[1];
    res.push([rx, ry]);
  }
  return res;
}

/**
 * Offsets a polyline laterally to the right of travel direction by `offsetMeters`.
 * Shifting points from the road centerline onto the vehicle's actual driving carriageway
 * prevents the route line from cutting into the center median or oncoming lanes in curves.
 */
function smoothPolyline(pts: [number, number][], passes = 2): [number, number][] {
  if (pts.length < 3) return pts;
  let curr = pts;
  for (let pass = 0; pass < passes; pass++) {
    const next: [number, number][] = [curr[0]];
    for (let i = 1; i < curr.length - 1; i++) {
      const pPrev = curr[i - 1];
      const pCurr = curr[i];
      const pNext = curr[i + 1];
      next.push([
        0.25 * pPrev[0] + 0.5 * pCurr[0] + 0.25 * pNext[0],
        0.25 * pPrev[1] + 0.5 * pCurr[1] + 0.25 * pNext[1],
      ]);
    }
    next.push(curr[curr.length - 1]);
    curr = next;
  }
  return curr;
}

/**
 * Offsets a polyline laterally to the right of travel direction by `offsetMeters`.
 * Uses a macro-heading window (+-3 points) to calculate smooth, continuous normal vectors,
 * eliminating finite difference noise, miter spikes, and zigzag/wavy artifacts.
 */
function offsetPolylineRight(points: [number, number][], offsetMeters: number): [number, number][] {
  if (points.length < 2 || offsetMeters === 0) return points;

  const rawOffset: [number, number][] = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    // Windowed tangent over +-3 points (~25m span) for smooth macro-heading
    const idxPrev = Math.max(0, i - 3);
    const idxNext = Math.min(n - 1, i + 3);

    const dx = points[idxNext][0] - points[idxPrev][0];
    const dy = points[idxNext][1] - points[idxPrev][1];
    const len = Math.hypot(dx, dy);

    let nx = 0;
    let ny = 0;

    if (len > 0.001) {
      // Invert Y in ETS2 game space where +Z points South: right-hand normal is (-dy, dx)
      nx = -dy / len;
      ny = dx / len;
    }

    rawOffset.push([
      points[i][0] + offsetMeters * nx,
      points[i][1] + offsetMeters * ny,
    ]);
  }

  // 2-pass 1-2-1 Gaussian smoothing to guarantee silk-smooth, flowing polyline curves
  return smoothPolyline(rawOffset, 2);
}

// --- Public API ---

export function getRouteServiceStatus(mapDataDir: string | null): { available: boolean; error?: string } {
  if (!mapDataDir) {
    return { available: false, error: 'No map data directory configured' };
  }

  try {
    loadGraph(mapDataDir);
  } catch (e) {
    return { available: false, error: (e as Error).message };
  }
  return { available: true };
}

export function getRoute(
  sourceX: number,
  sourceZ: number,
  destX: number,
  destZ: number,
  mapDataDir: string,
  heading?: number,
): RouteResult | null {
  try {
    const { data: graphData, spatialIndex, nodes, roads, nodeLUT, nodePrefabMap } = loadGraph(mapDataDir);

    let sourceNode = heading != null
      ? spatialIndex.nearestWithHeading(sourceX, sourceZ, heading, graphData.graph, 20000)
      : (spatialIndex.nearestInGraph(sourceX, sourceZ, graphData.graph, 20000) || spatialIndex.nearest(sourceX, sourceZ, 20000));
    const destNode = spatialIndex.nearestInGraph(destX, destZ, graphData.graph, 20000) || spatialIndex.nearest(destX, destZ, 20000);

    console.log('[route-service] nearest source', sourceX, sourceZ, '->', sourceNode?.uid, sourceNode?.x, sourceNode?.y, 'heading', heading);
    console.log('[route-service] nearest dest', destX, destZ, '->', destNode?.uid, destNode?.x, destNode?.y);

    if (!sourceNode || !destNode) {
      console.warn('[route-service] No nodes found within 20000m of source or dest');
      return null;
    }

    const sourceInGraph = graphData.graph.has(sourceNode.uid);
    const destInGraph = graphData.graph.has(destNode.uid);
    console.log('[route-service] source in graph:', sourceInGraph, 'dest in graph:', destInGraph);

    const effectiveSource = sourceInGraph ? sourceNode : spatialIndex.nearestInGraph(sourceX, sourceZ, graphData.graph, 20000);
    const effectiveDest = destInGraph ? destNode : spatialIndex.nearestInGraph(destX, destZ, graphData.graph, 20000);

    if (!effectiveSource || !effectiveDest) {
      console.warn('[route-service] No graph nodes found within 20000m of source or dest');
      return null;
    }

    console.log('[route-service] effective source', effectiveSource.uid, effectiveSource.x, effectiveSource.y);
    console.log('[route-service] effective dest', effectiveDest.uid, effectiveDest.x, effectiveDest.y);

    if (effectiveSource.uid === effectiveDest.uid) {
      return {
        success: true,
        coordinates: [[sourceX, sourceZ], [destX, destZ]],
        distanceMeters: 0,
        durationSeconds: 0,
      };
    }

    const result = findRoutePath(effectiveSource.uid, effectiveDest.uid, graphData.graph, nodeLUT, heading);
    if (!result || result.path.length < 2) {
      console.warn('[route-service] No path found, falling back to straight line');
      return {
        success: true,
        coordinates: [[sourceX, sourceZ], [destX, destZ]],
        distanceMeters: heuristic({ x: sourceX, y: sourceZ }, { x: destX, y: destZ }),
        durationSeconds: 0,
      };
    }

    // Build coordinates array starting from player position
    const coordinates: [number, number][] = [[sourceX, sourceZ]];
    const segmentLanes: number[] = [2];
    const turnPoints: Array<{ x: number; y: number; bearing: number }> = [];

    for (let i = 0; i < result.path.length - 1; i++) {
      const sUid = result.path[i];
      const eUid = result.path[i + 1];
      const sNode = nodeLUT.get(sUid);
      const eNode = nodeLUT.get(eUid);

      if (!sNode || !eNode) {
        // Fallback: just add endpoint
        if (eNode) {
          coordinates.push([eNode.x, eNode.y]);
          segmentLanes.push(2);
        }
        continue;
      }

      // Find shared road item between adjacent nodes
      const sItems = [sNode.forwardItemUid, sNode.backwardItemUid].filter(uid => uid !== '0');
      const eItems = [eNode.forwardItemUid, eNode.backwardItemUid].filter(uid => uid !== '0');
      const sharedItemUid = sItems.find(uid => eItems.includes(uid));

      const roadInfo = sharedItemUid ? roads.get(sharedItemUid) : undefined;
      const isForward = roadInfo ? roadInfo.startNodeUid === sNode.uid : true;
      const roadLaneCount = roadInfo
        ? Math.max(1, isForward ? (roadInfo.lanesRight || 1) : (roadInfo.lanesLeft || 1))
        : 1;

      // Graph-based turn detection: compare the road item of the current
      // segment (i-1 → i) with the road item of the next segment (i → i+1).
      // If they differ, the route changes roads at this node → turn/intersection.
      // If there is no road item (prefab intersection), it's always a turn.
      // Graph-based turn detection: generate turnPoints at prefab junctions, road changes, and sharp turns
      if (i > 0) {
        const prevUid = result.path[i - 1];
        const prevNode = nodeLUT.get(prevUid);
        if (prevNode) {
          const prevItems = [prevNode.forwardItemUid, prevNode.backwardItemUid].filter(uid => uid !== '0');
          const prevSharedItemUid = prevItems.find(uid => sItems.includes(uid));
          const prevRoadInfo = prevSharedItemUid ? roads.get(prevSharedItemUid) : undefined;

          const dxIn = sNode.x - prevNode.x;
          const dyIn = sNode.y - prevNode.y;
          const dxOut = eNode.x - sNode.x;
          const dyOut = eNode.y - sNode.y;

          const lenIn = Math.hypot(dxIn, dyIn);
          const lenOut = Math.hypot(dxOut, dyOut);

          if (lenIn > 0.1 && lenOut > 0.1) {
            const headingIn = Math.atan2(dyIn, dxIn);
            const headingOut = Math.atan2(dyOut, dxOut);
            const deltaDeg = Math.abs(((headingOut - headingIn) * (180 / Math.PI) + 540) % 360 - 180);

            const isPrefabJunction = !prevRoadInfo || !roadInfo;
            const sPrefabMeta = nodePrefabMap.get(sNode.uid) || nodePrefabMap.get(eNode.uid);
            const isExit = (prevRoadInfo && (prevRoadInfo.lanesRight >= 2 || prevRoadInfo.lanesLeft >= 2) && (!roadInfo || roadLaneCount === 1)) ||
              (isPrefabJunction && deltaDeg >= 8 && deltaDeg < 28 && roadLaneCount === 1);
            const isEntry = (prevRoadInfo && (prevRoadInfo.lanesRight < 2 && prevRoadInfo.lanesLeft < 2) && roadInfo && (roadInfo.lanesRight >= 2 || roadInfo.lanesLeft >= 2)) ||
              (isPrefabJunction && deltaDeg >= 8 && deltaDeg < 28 && roadInfo && roadLaneCount >= 2);

            const uniqueNeighborNodes = Array.from(new Set([...(graphData.graph.get(sNode.uid)?.forward || []).map(n => n.nodeUid), ...(graphData.graph.get(sNode.uid)?.backward || []).map(n => n.nodeUid)])).filter(uid => uid !== prevUid);

            // Decision Vector Method: Analyze all candidate outgoing paths from sNode
            let isTakingStraightPath = false;
            if (uniqueNeighborNodes.length >= 2) {
              let minCandidateDelta = Infinity;
              let straightNeighborUid: string | null = null;

              for (const nUid of uniqueNeighborNodes) {
                const candidateNode = nodeLUT.get(nUid);
                if (!candidateNode) continue;
                const cDx = candidateNode.x - sNode.x;
                const cDy = candidateNode.y - sNode.y;
                if (Math.hypot(cDx, cDy) < 0.1) continue;

                const candidateHeading = Math.atan2(cDy, cDx);
                const candidateDelta = Math.abs(((candidateHeading - headingIn) * (180 / Math.PI) + 540) % 360 - 180);

                if (candidateDelta < minCandidateDelta) {
                  minCandidateDelta = candidateDelta;
                  straightNeighborUid = nUid;
                }
              }

              // If the route chose the straightest outgoing path and its angle is small, the driver is continuing straight
              if (straightNeighborUid === eNode.uid && minCandidateDelta < 28) {
                isTakingStraightPath = true;
              }
            }

            const isRoundabout = sPrefabMeta?.type === 'roundabout';
            const isPrefabExit = sPrefabMeta?.type === 'highway-exit' || isExit;
            const isPrefabEntry = sPrefabMeta?.type === 'highway-entry' || isEntry;

            const isSameRoadContinuation = prevRoadInfo && roadInfo && prevSharedItemUid && sharedItemUid && prevSharedItemUid === sharedItemUid;
            const isMultiBranchJunction = uniqueNeighborNodes.length >= 2;

            // A turn ONLY occurs if the route takes a branch OTHER than the straight-through path, or at an exit/roundabout
            const isSignificantTurn = !isSameRoadContinuation && (
              isRoundabout
                ? deltaDeg >= 12
                : (isPrefabExit || isPrefabEntry)
                  ? deltaDeg >= 15
                  : (isMultiBranchJunction && !isTakingStraightPath && deltaDeg >= 18)
            );

            if (isSignificantTurn) {
              const lastTp = turnPoints[turnPoints.length - 1];
              if (!lastTp || Math.hypot(sNode.x - lastTp.x, sNode.y - lastTp.y) > 75) {
                const mathAngleDeg = Math.atan2(dyOut, dxOut) * (180 / Math.PI);
                const iconRotate = (90 - mathAngleDeg + 360) % 360;

                const signedDelta = ((headingOut - headingIn) * (180 / Math.PI) + 540) % 360 - 180;
                const turnDir: 'left' | 'straight' | 'right' = signedDelta > 0 ? 'right' : 'left';

                let maneuverType: 'turn' | 'highway-exit' | 'highway-entry' | 'roundabout' = 'turn';
                if (sPrefabMeta && sPrefabMeta.type !== 'road') {
                  maneuverType = sPrefabMeta.type;
                } else if (isPrefabExit) {
                  maneuverType = 'highway-exit';
                } else if (isPrefabEntry) {
                  maneuverType = 'highway-entry';
                }

                turnPoints.push({
                  x: sNode.x,
                  y: sNode.y,
                  bearing: iconRotate,
                  type: maneuverType,
                  dir: turnDir,
                  absAngle: deltaDeg,
                  coordIdx: coordinates.length - 1,
                });
              }
            }
          }
        }
      }

      if (roadInfo) {
        // Road found: use Hermite spline curve (matches reference roadLineString)
        const splineStart = roadInfo.startNodeUid === sNode.uid ? sNode : eNode;
        const splineEnd = roadInfo.endNodeUid === eNode.uid ? eNode : sNode;

        let roadPoints = toSplinePoints(
          { x: splineStart.x, y: splineStart.y, rotation: splineStart.rotation },
          { x: splineEnd.x, y: splineEnd.y, rotation: splineEnd.rotation },
        );

        // Reverse if we're traversing the road in the opposite direction
        if (splineStart.uid !== sNode.uid) {
          roadPoints = roadPoints.reverse();
        }

        // Skip first point (duplicate of previous segment's last point)
        for (let j = 1; j < roadPoints.length; j++) {
          coordinates.push(roadPoints[j]);
          segmentLanes.push(roadLaneCount);
        }
      } else {
        // Prefab/intersection curve: use Hermite spline between sNode and eNode for smooth junction turns
        const dist = Math.hypot(eNode.x - sNode.x, eNode.y - sNode.y);
        if (dist > 15 && dist < 300) {
          const prefabPoints = toSplinePoints(
            { x: sNode.x, y: sNode.y, rotation: sNode.rotation },
            { x: eNode.x, y: eNode.y, rotation: eNode.rotation },
            Math.min(8, Math.max(3, Math.floor(dist / 25)))
          );
          for (let j = 1; j < prefabPoints.length; j++) {
            coordinates.push(prefabPoints[j]);
            segmentLanes.push(2);
          }
        } else {
          coordinates.push([eNode.x, eNode.y]);
          segmentLanes.push(2);
        }
      }
    }

    // Append final destination position
    coordinates.push([destX, destZ]);
    segmentLanes.push(2);

    // Apply right-side lateral offset ONCE to the entire continuous route polyline
    // Shifting the whole route +4.2m to the right keeps it in your driving lane on highways
    // while maintaining 100% smooth, unbroken continuity across all node boundaries.
    const finalCoordinates = offsetPolylineRight(coordinates, 4.2);

    console.log('[route-service] route found:', finalCoordinates.length, 'points,', turnPoints.length, 'turn points,', result.distance.toFixed(0), 'm');

    return {
      success: true,
      coordinates: finalCoordinates,
      distanceMeters: result.distance,
      durationSeconds: result.duration || result.distance / 15,
      turnPoints,
      segmentLanes,
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error('[route-service] Route calculation failed:', error.message);
    return null;
  }
}

export function invalidateRouteCache() {
  clearCache();
}
