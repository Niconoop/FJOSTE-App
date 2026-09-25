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

/**
 * Converts SCS SDK telemetry orientation heading into ETS2 world Cartesian angle (radians in [-PI, PI]).
 * In SCS SDK: heading is in unit circle [0.0, 1.0) where 0=North (-Z), 0.25=West (-X), 0.5=South (+Z), 0.75=East (+X).
 * In ETS2 Cartesian space: angle 0 points East (+X), PI/2 points South (+Z), PI points West (-X), -PI/2 points North (-Z).
 */
export function scsHeadingToCartesianAngle(h: number): number {
  if (h == null || isNaN(h)) return 0;
  let norm = h;
  if (Math.abs(norm) <= 1.0) {
    norm = ((norm % 1.0) + 1.0) % 1.0;
    const theta = (0.5 - norm) * Math.PI * 2 + Math.PI / 2;
    return ((theta % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  }
  return ((h % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
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

  withinRadius(x: number, y: number, maxDist = 50): SectorNode[] {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);
    const maxDistSq = maxDist * maxDist;
    const result: SectorNode[] = [];

    for (let dx = -maxRadius; dx <= maxRadius; dx++) {
      for (let dy = -maxRadius; dy <= maxRadius; dy++) {
        const key = `${cx + dx},${cy + dy}`;
        const nodes = this.sectors.get(key);
        if (!nodes) continue;

        for (const node of nodes) {
          const ddx = node.x - x;
          const ddy = node.y - y;
          const distSq = ddx * ddx + ddy * ddy;
          if (distSq <= maxDistSq) {
            result.push(node);
          }
        }
      }
    }

    return result;
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

    const top = candidates.slice(0, 10);
    const truckHeading = scsHeadingToCartesianAngle(heading);

    let best: SectorNode | null = null;
    let bestScore = Infinity;

    for (const node of top) {
      const delta = Math.abs(((node.rotation - truckHeading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      // Strongly penalize opposite-direction nodes (> 90 degrees) to prevent snapping to Gegenfahrbahn
      const alignmentPenalty = delta > (Math.PI / 2) ? 10000 + delta * 3000 : delta * 600;
      const score = node.dist + alignmentPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }

    return best || candidates[0];
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
  type: 'roundabout' | 'highway-exit' | 'highway-entry' | 'turn' | 'road';
  token: string;
  path: string;
  nodeCount?: number;
  prefabUid?: string;
}

export interface PrefabDescNavCurve {
  start: { x: number; y: number; rotation: number };
  end: { x: number; y: number; rotation: number };
  nextLines: number[];
}

export interface PrefabDescNode {
  inputLanes: number[];
  outputLanes: number[];
  x: number;
  y: number;
  rotation: number;
}

export interface PrefabDesc {
  token: string;
  path: string;
  nodes: PrefabDescNode[];
  navCurves: PrefabDescNavCurve[];
}

export interface PrefabItem {
  uid: string;
  token: string;
  originNodeIndex: number;
  nodeUids: string[];
}

let cachedGraph: {
  data: GraphData;
  nodes: NodeInfo[];
  spatialIndex: SpatialIndex;
  roads: Map<string, RoadInfo>;
  nodeLUT: Map<string, NodeInfo>;
  nodePrefabMap: Map<string, PrefabMetadata>;
  prefabsByUid: Map<string, PrefabItem>;
  prefabDescsByToken: Map<string, PrefabDesc>;
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
  const prefabDescsByToken = new Map<string, PrefabDesc>();
  let descPath = path.join(mapDataDir, `${map}-prefabDescriptions.json`);
  if (!fs.existsSync(descPath)) {
    const alt = path.join(mapDataDir, `${map}-prefab-descriptions.json`);
    if (fs.existsSync(alt)) descPath = alt;
  }
  if (fs.existsSync(descPath)) {
    try {
      const rawDescs = JSON.parse(fs.readFileSync(descPath, 'utf8'));
      for (const d of rawDescs) {
        if (d && d.token) {
          const tokenStr = String(d.token);
          if (d.path) {
            prefabDescriptionsMap.set(tokenStr, String(d.path));
          }
          prefabDescsByToken.set(tokenStr, {
            token: tokenStr,
            path: String(d.path || ''),
            nodes: Array.isArray(d.nodes) ? d.nodes.map((n: any) => ({
              inputLanes: Array.isArray(n.inputLanes) ? n.inputLanes : [],
              outputLanes: Array.isArray(n.outputLanes) ? n.outputLanes : [],
              x: Number(n.x) || 0,
              y: Number(n.y) || 0,
              rotation: Number(n.rotation) || 0,
            })) : [],
            navCurves: Array.isArray(d.navCurves) ? d.navCurves.map((c: any) => ({
              start: { x: Number(c.start?.x) || 0, y: Number(c.start?.y) || 0, rotation: Number(c.start?.rotation) || 0 },
              end: { x: Number(c.end?.x) || 0, y: Number(c.end?.y) || 0, rotation: Number(c.end?.rotation) || 0 },
              nextLines: Array.isArray(c.nextLines) ? c.nextLines : [],
            })) : [],
          });
        }
      }
      console.log(`[route-service] Loaded ${prefabDescsByToken.size} prefab descriptions with navCurves from ${descPath}`);
    } catch (e: any) {
      console.error('[route-service] Failed to parse prefabDescriptions:', e.message);
    }
  }

  const prefabsByUid = new Map<string, PrefabItem>();
  const nodePrefabMap = new Map<string, PrefabMetadata>();
  const prefabsPath = path.join(mapDataDir, `${map}-prefabs.json`);
  if (fs.existsSync(prefabsPath)) {
    try {
      const rawPrefabs = JSON.parse(fs.readFileSync(prefabsPath, 'utf8'));
      for (const pf of rawPrefabs) {
        if (pf && pf.uid && pf.token && Array.isArray(pf.nodeUids)) {
          const uidStr = normalizeUid(pf.uid);
          const token = String(pf.token);
          const pfPath = prefabDescriptionsMap.get(token) || token;
          const nodeUidsNorm = pf.nodeUids.map(normalizeUid);
          const metadata: PrefabMetadata = {
            type,
            token,
            path: pfPath,
            nodeCount: nodeUidsNorm.length,
            prefabUid: uidStr
          };

          prefabsByUid.set(uidStr, {
            uid: uidStr,
            token,
            originNodeIndex: Number(pf.originNodeIndex) || 0,
            nodeUids: nodeUidsNorm,
          });

          for (const nUid of nodeUidsNorm) {
            nodePrefabMap.set(nUid, metadata);
          }
        }
      }
      console.log(`[route-service] Mapped ${nodePrefabMap.size} nodes to ${prefabsByUid.size} prefabs from ${prefabsPath}`);
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

  console.log(`[route-service] Loaded ${nodes.length} nodes, ${graphData.graph.size} graph entries, ${roads.size} roads, ${prefabsByUid.size} prefabs, ${prefabDescsByToken.size} descs`);

  cachedGraph = { data: graphData, nodes, spatialIndex, roads, nodeLUT, nodePrefabMap, prefabsByUid, prefabDescsByToken };
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
  const truckHeading = heading != null ? scsHeadingToCartesianAngle(heading) : undefined;
  const faDelta = truckHeading != null
    ? Math.abs(((startNode.rotation - truckHeading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI)
    : 0;
  const isBackwardMoreAligned = truckHeading != null && faDelta > Math.PI / 2;

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

    const truckHeading = heading != null ? scsHeadingToCartesianAngle(heading) : undefined;
    if (truckHeading != null && current.uid === startUid && startNode) {
      const faDelta = Math.abs(((startNode.rotation - truckHeading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
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

function clampTangentAngle(rot: number, chordAngle: number): number {
  let delta = rot - chordAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  // Natural clamp: avoid backward loops without inverting tangent
  const maxDev = (85 * Math.PI) / 180;
  if (delta > maxDev) return chordAngle + maxDev;
  if (delta < -maxDev) return chordAngle - maxDev;
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
  const startRot = clampTangentAngle(start.rotation, chordAngle);
  const endRot = clampTangentAngle(end.rotation, chordAngle);

  // Dynamic step count based on both distance AND curvature
  // Samples a point every ~10 meters with extra density on sharp curves
  if (steps == null) {
    const deltaRot = Math.abs(startRot - endRot);
    const distSteps = Math.ceil(dist / 10);
    const curveSteps = Math.ceil(deltaRot * 16);
    steps = Math.min(64, Math.max(4, distSteps, curveSteps));
  }
  if (steps < 1) steps = 1;

  // Tangent scaling with curvature damping to strictly eliminate overshooting or bulging
  const deltaRot = Math.abs(startRot - chordAngle) + Math.abs(endRot - chordAngle);
  const curvatureDamping = Math.max(0.3, Math.min(0.5, 0.5 - (deltaRot / (Math.PI * 2)) * 0.2));
  const tangentScale = dist * curvatureDamping;
  const m0: [number, number] = [Math.cos(startRot) * tangentScale, Math.sin(startRot) * tangentScale];
  const m1: [number, number] = [Math.cos(endRot) * tangentScale, Math.sin(endRot) * tangentScale];

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

// --- Prefab Junction & Interchange Geometry ---

function rotateRight<T>(arr: readonly T[], count: number): T[] {
  if (arr.length === 0 || count === 0) return arr.slice();
  const c = ((count % arr.length) + arr.length) % arr.length;
  return arr.slice(-c).concat(arr.slice(0, -c));
}

function rotatePoint(px: number, py: number, rad: number, cx: number, cy: number): [number, number] {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}

function toMapPosition(
  px: number,
  py: number,
  prefabItem: PrefabItem,
  prefabDesc: PrefabDesc,
  nodeLUT: Map<string, NodeInfo>,
): [number, number] {
  const prefabOrigin = prefabDesc.nodes[prefabItem.originNodeIndex];
  const originUid = normalizeUid(prefabItem.nodeUids[0]);
  const originNode = nodeLUT.get(originUid);
  if (!prefabOrigin || !originNode) return [px, py];

  const originX = originNode.x;
  const originY = originNode.y;
  const prefabStartX = originX - prefabOrigin.x;
  const prefabStartY = originY - prefabOrigin.y;
  const rot = originNode.rotation - prefabOrigin.rotation;

  return rotatePoint(px + prefabStartX, py + prefabStartY, rot, originX, originY);
}

function getCurvePaths(prefabDesc: PrefabDesc, inputLaneIndex: number): { endingNodeIndex: number; curvePathIndices: number[] }[] {
  const endingCurveIndexToNodeIndex = new Map<number, number>();
  for (let nodeIndex = 0; nodeIndex < prefabDesc.nodes.length; nodeIndex++) {
    const node = prefabDesc.nodes[nodeIndex];
    for (const outputLane of node.outputLanes) {
      endingCurveIndexToNodeIndex.set(outputLane, nodeIndex);
    }
  }

  const prefix = (curvePath: { endingNodeIndex: number; curvePathIndices: number[] }, curveIndex: number) => ({
    endingNodeIndex: curvePath.endingNodeIndex,
    curvePathIndices: [curveIndex, ...curvePath.curvePathIndices],
  });

  const seenIndices = new Set<number>();
  const getPaths = (curveIndex: number): { endingNodeIndex: number; curvePathIndices: number[] }[] => {
    if (seenIndices.has(curveIndex)) return [];
    seenIndices.add(curveIndex);

    if (endingCurveIndexToNodeIndex.has(curveIndex)) {
      return [{ endingNodeIndex: endingCurveIndexToNodeIndex.get(curveIndex)!, curvePathIndices: [] }];
    }

    const ending: { endingNodeIndex: number; curvePathIndices: number[] }[] = [];
    const curve = prefabDesc.navCurves[curveIndex];
    if (curve && Array.isArray(curve.nextLines)) {
      for (const next of curve.nextLines) {
        ending.push(...getPaths(next).map(p => prefix(p, next)));
      }
    }
    return ending;
  };

  return getPaths(inputLaneIndex).map(p => prefix(p, inputLaneIndex));
}

function getPrefabCurvePoints(
  sNode: NodeInfo,
  eNode: NodeInfo,
  sharedPrefabUid: string | undefined,
  prefabsByUid: Map<string, PrefabItem>,
  prefabDescsByToken: Map<string, PrefabDesc>,
  nodeLUT: Map<string, NodeInfo>,
): [number, number][] | null {
  let prefabItem: PrefabItem | undefined;
  if (sharedPrefabUid) {
    prefabItem = prefabsByUid.get(sharedPrefabUid);
  }
  if (!prefabItem) {
    // Search across forward/backward item references of adjacent nodes
    for (const itemUid of [sNode.forwardItemUid, sNode.backwardItemUid, eNode.forwardItemUid, eNode.backwardItemUid]) {
      if (itemUid && itemUid !== '0' && prefabsByUid.has(itemUid)) {
        const candidate = prefabsByUid.get(itemUid)!;
        const normUids = candidate.nodeUids.map(normalizeUid);
        if (normUids.includes(sNode.uid) && normUids.includes(eNode.uid)) {
          prefabItem = candidate;
          break;
        }
      }
    }
  }

  if (!prefabItem) return null;

  const prefabDesc = prefabDescsByToken.get(prefabItem.token);
  if (!prefabDesc || !prefabDesc.navCurves || prefabDesc.navCurves.length === 0) return null;

  const targetNodeUids = rotateRight(prefabItem.nodeUids.map(normalizeUid), prefabItem.originNodeIndex);
  const startNodeIndex = targetNodeUids.indexOf(sNode.uid);
  const endNodeIndex = targetNodeUids.indexOf(eNode.uid);

  if (startNodeIndex < 0 || endNodeIndex < 0 || startNodeIndex >= prefabDesc.nodes.length) {
    return null;
  }

  const sDescNode = prefabDesc.nodes[startNodeIndex];
  if (!sDescNode || !sDescNode.inputLanes || sDescNode.inputLanes.length === 0) {
    return null;
  }

  // Find curve path leading to endNodeIndex
  let chosenCurveIndices: number[] | null = null;
  for (const inputLane of sDescNode.inputLanes) {
    const paths = getCurvePaths(prefabDesc, inputLane);
    const match = paths.find(p => p.endingNodeIndex === endNodeIndex);
    if (match && match.curvePathIndices.length > 0) {
      chosenCurveIndices = match.curvePathIndices;
      break;
    }
  }

  if (!chosenCurveIndices || chosenCurveIndices.length === 0) {
    return null;
  }

  // Sample Hermite spline points along the connected navCurve chain
  const points: [number, number][] = [];
  for (const ci of chosenCurveIndices) {
    const curve = prefabDesc.navCurves[ci];
    if (!curve) continue;

    const curveSpline = toSplinePoints(
      { x: curve.start.x, y: curve.start.y, rotation: curve.start.rotation },
      { x: curve.end.x, y: curve.end.y, rotation: curve.end.rotation },
    );

    for (let k = 0; k < curveSpline.length; k++) {
      const mapped = toMapPosition(curveSpline[k][0], curveSpline[k][1], prefabItem, prefabDesc, nodeLUT);
      if (points.length === 0) {
        points.push(mapped);
      } else {
        const last = points[points.length - 1];
        if (Math.hypot(mapped[0] - last[0], mapped[1] - last[1]) > 0.1) {
          points.push(mapped);
        }
      }
    }
  }

  return points.length >= 2 ? points : null;
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

/**
 * Checks if a given node represents a true intersection with 3 or more connected roads.
 * A node is an intersection if:
 * 1. It directly has 3 or more unique connected neighbor nodes in the road graph, OR
 * 2. It belongs to an intersection prefab that connects 3 or more roads (T-junction, crossroads, interchange, roundabout).
 */
export function isNodeIntersection(
  nodeUid: string,
  graph: Map<string, Neighbors>,
  nodePrefabMap: Map<string, PrefabMetadata>,
  prefabsByUid?: Map<string, PrefabItem>
): boolean {
  // 1. Direct graph degree (number of connected paths in road graph)
  const neighbors = graph.get(nodeUid);
  if (neighbors) {
    const unique = new Set<string>();
    for (const n of neighbors.forward) unique.add(n.nodeUid);
    for (const n of neighbors.backward) unique.add(n.nodeUid);
    if (unique.size >= 3) return true;
  }

  // 2. Prefab with 3 or more connected roads (crossroads, T-junction, interchange, roundabout)
  const meta = nodePrefabMap.get(nodeUid);
  if (meta) {
    if (meta.nodeCount != null && meta.nodeCount >= 3) return true;
    if (meta.prefabUid && prefabsByUid) {
      const pf = prefabsByUid.get(meta.prefabUid);
      if (pf && pf.nodeUids.length >= 3) return true;
    }
  }

  return false;
}

/**
 * Checks if there is an actual intersection node (with 3 or more roads) within a search radius of (x, y).
 */
export function hasIntersectionNearPoint(
  x: number,
  y: number,
  spatialIndex: SpatialIndex,
  graph: Map<string, Neighbors>,
  nodePrefabMap: Map<string, PrefabMetadata>,
  prefabsByUid: Map<string, PrefabItem>,
  radius = 45
): boolean {
  const nearbyNodes = spatialIndex.withinRadius(x, y, radius);
  for (const n of nearbyNodes) {
    if (isNodeIntersection(n.uid, graph, nodePrefabMap, prefabsByUid)) {
      return true;
    }
  }
  return false;
}

/**
 * Filters a list of candidate turn points against the ETS2 map nodes.
 * Guarantees that turn instructions are ONLY generated if there is an actual intersection with 3 or more roads.
 */
export function verifyTurnPointsWithNodes(
  turnPoints: TurnPointInfo[],
  mapDataDir: string,
  map: 'europe' | 'usa' = 'europe'
): TurnPointInfo[] {
  if (!turnPoints || turnPoints.length === 0) return [];

  let graphContext = cachedGraph;
  if (!graphContext) {
    try {
      loadGraph(mapDataDir, map);
      graphContext = cachedGraph;
    } catch (e: any) {
      console.warn('[route-service] Failed to load graph in verifyTurnPointsWithNodes:', e.message);
      return turnPoints;
    }
    if (!graphContext) return turnPoints;
  }

  const { spatialIndex, data, nodePrefabMap, prefabsByUid } = graphContext;

  return turnPoints.filter(tp => {
    // Roundabouts are always multi-branch junction prefabs with multiple exits
    if (tp.type === 'roundabout') return true;

    // Check if within 45m there is an actual node with >= 3 connected roads
    return hasIntersectionNearPoint(tp.x, tp.y, spatialIndex, data.graph, nodePrefabMap, prefabsByUid, 45);
  });
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
    const { data: graphData, spatialIndex, nodes, roads, nodeLUT, nodePrefabMap, prefabsByUid, prefabDescsByToken } = loadGraph(mapDataDir);

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

    let result = findRoutePath(effectiveSource.uid, effectiveDest.uid, graphData.graph, nodeLUT, heading);
    if (!result || result.path.length < 2) {
      console.log('[route-service] Directional A* found no path, trying robust fallback A*...');
      result = findRoutePathFallback(effectiveSource.uid, effectiveDest.uid, graphData.graph, nodeLUT, heading);
    }
    if (!result || result.path.length < 2) {
      console.warn('[route-service] No path found, falling back to straight line');
      return {
        success: true,
        coordinates: [[sourceX, sourceZ], [destX, destZ]],
        distanceMeters: heuristic({ x: sourceX, y: sourceZ }, { x: destX, y: destZ }),
        durationSeconds: 0,
      };
    }

    // Build coordinates array starting cleanly from vehicle projected position along road
    const coordinates: [number, number][] = [];
    const segmentLanes: number[] = [];
    const turnPoints: Array<{ x: number; y: number; bearing: number; type?: TurnPointInfo['type']; dir?: 'left' | 'straight' | 'right'; absAngle?: number; coordIdx?: number }> = [];

    const appendSegmentPoints = (pts: [number, number][], laneCount: number) => {
      if (!pts || pts.length === 0) return;
      if (coordinates.length === 0) {
        // First segment: project sourceX, sourceZ onto the segment to prevent 90-degree lateral hooks
        let bestDistSq = Infinity;
        let bestK = 0;
        let bestProjX = pts[0][0];
        let bestProjZ = pts[0][1];

        for (let k = 0; k < pts.length - 1; k++) {
          const ax = pts[k][0], az = pts[k][1];
          const bx = pts[k + 1][0], bz = pts[k + 1][1];
          const dx = bx - ax, dz = bz - az;
          const lenSq = dx * dx + dz * dz;
          let t = 0;
          if (lenSq > 1e-6) {
            t = Math.max(0, Math.min(1, ((sourceX - ax) * dx + (sourceZ - az) * dz) / lenSq));
          }
          const px = ax + t * dx;
          const pz = az + t * dz;
          const dSq = (sourceX - px) * (sourceX - px) + (sourceZ - pz) * (sourceZ - pz);
          if (dSq < bestDistSq) {
            bestDistSq = dSq;
            bestK = k;
            bestProjX = px;
            bestProjZ = pz;
          }
        }

        // If vehicle is farther than 45m away (depot / yard), connect from truck to projected road point
        if (bestDistSq > 45 * 45) {
          coordinates.push([sourceX, sourceZ]);
          segmentLanes.push(laneCount);
        }
        coordinates.push([bestProjX, bestProjZ]);
        segmentLanes.push(laneCount);

        for (let j = bestK + 1; j < pts.length; j++) {
          const pt = pts[j];
          const last = coordinates[coordinates.length - 1];
          if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 0.1) {
            coordinates.push(pt);
            segmentLanes.push(laneCount);
          }
        }
      } else {
        for (let j = 1; j < pts.length; j++) {
          const pt = pts[j];
          const last = coordinates[coordinates.length - 1];
          if (!last || Math.hypot(pt[0] - last[0], pt[1] - last[1]) > 0.1) {
            coordinates.push(pt);
            segmentLanes.push(laneCount);
          }
        }
      }
    };

    for (let i = 0; i < result.path.length - 1; i++) {
      const sUid = result.path[i];
      const eUid = result.path[i + 1];
      const sNode = nodeLUT.get(sUid);
      const eNode = nodeLUT.get(eUid);

      if (!sNode || !eNode) {
        if (eNode) {
          appendSegmentPoints([[eNode.x, eNode.y]], 2);
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

      // Graph-based turn detection: compare road items of current and next segments
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

            const forwardNeighbors = graphData.graph.get(sNode.uid)?.forward || [];
            const backwardNeighbors = graphData.graph.get(sNode.uid)?.backward || [];
            const allConnectedNeighbors = Array.from(new Set([...forwardNeighbors.map(n => n.nodeUid), ...backwardNeighbors.map(n => n.nodeUid)]));
            const uniqueNeighborNodes = allConnectedNeighbors.filter(uid => uid !== prevUid);

            // Crucial check: verify that this node or its prefab is actually an intersection with 3 or more connected roads!
            const isIntersection = isNodeIntersection(sNode.uid, graphData.graph, nodePrefabMap, prefabsByUid);

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

              if (straightNeighborUid === eNode.uid && minCandidateDelta < 28) {
                isTakingStraightPath = true;
              }
            }

            const isRoundabout = sPrefabMeta?.type === 'roundabout';
            const isPrefabExit = (sPrefabMeta?.type === 'highway-exit' || isExit) && isIntersection;
            const isPrefabEntry = (sPrefabMeta?.type === 'highway-entry' || isEntry) && isIntersection;

            const isSameRoadContinuation = prevRoadInfo && roadInfo && prevSharedItemUid && sharedItemUid && prevSharedItemUid === sharedItemUid;

            // An instruction MUST only be generated if the node is actually an intersection with 3 or more roads!
            const isSignificantTurn = isIntersection && !isSameRoadContinuation && (
              isRoundabout
                ? deltaDeg >= 12
                : (isPrefabExit || isPrefabEntry)
                  ? deltaDeg >= 15
                  : (!isTakingStraightPath && deltaDeg >= 18)
            );

            if (isSignificantTurn) {
              const lastTp = turnPoints[turnPoints.length - 1];
              if (!lastTp || Math.hypot(sNode.x - lastTp.x, sNode.y - lastTp.y) > 75) {
                const mathAngleDeg = Math.atan2(dyOut, dxOut) * (180 / Math.PI);
                const iconRotate = (90 - mathAngleDeg + 360) % 360;

                const signedDelta = ((headingOut - headingIn) * (180 / Math.PI) + 540) % 360 - 180;
                const turnDir: 'left' | 'straight' | 'right' = signedDelta > 0 ? 'right' : 'left';

                let maneuverType: TurnPointInfo['type'] = 'turn';
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
                  coordIdx: Math.max(0, coordinates.length - 1),
                });
              }
            }
          }
        }
      }

      if (roadInfo) {
        const isForwardTraversal = roadInfo.startNodeUid === sNode.uid;
        const canonicalStart = isForwardTraversal ? sNode : eNode;
        const canonicalEnd   = isForwardTraversal ? eNode : sNode;

        let roadPoints = toSplinePoints(
          { x: canonicalStart.x, y: canonicalStart.y, rotation: canonicalStart.rotation },
          { x: canonicalEnd.x,   y: canonicalEnd.y,   rotation: canonicalEnd.rotation   },
        );

        if (!isForwardTraversal) {
          roadPoints = roadPoints.reverse();
        }

        appendSegmentPoints(roadPoints, roadLaneCount);
      } else {
        // Prefab intersection / junction: check for exact navCurves
        const prefabPoints = getPrefabCurvePoints(sNode, eNode, sharedItemUid, prefabsByUid, prefabDescsByToken, nodeLUT);
        if (prefabPoints && prefabPoints.length >= 2) {
          appendSegmentPoints(prefabPoints, 2);
        } else {
          // Fallback: Hermite spline between sNode and eNode
          const dist = Math.hypot(eNode.x - sNode.x, eNode.y - sNode.y);
          if (dist > 5 && dist < 500) {
            const deltaRot = Math.abs(sNode.rotation - eNode.rotation);
            const steps = Math.min(32, Math.max(6, Math.ceil(dist / 10), Math.ceil(deltaRot * 12)));
            const fallbackPoints = toSplinePoints(
              { x: sNode.x, y: sNode.y, rotation: sNode.rotation },
              { x: eNode.x, y: eNode.y, rotation: eNode.rotation },
              steps
            );
            appendSegmentPoints(fallbackPoints, 2);
          } else {
            appendSegmentPoints([[sNode.x, sNode.y], [eNode.x, eNode.y]], 2);
          }
        }
      }
    }

    // Append final destination position if not already at end
    const lastCoord = coordinates[coordinates.length - 1];
    if (!lastCoord || Math.hypot(destX - lastCoord[0], destZ - lastCoord[1]) > 0.5) {
      coordinates.push([destX, destZ]);
      segmentLanes.push(2);
    }

    // Use true road centerline geometry without artificial lateral offset,
    // guaranteeing that the route sits 100% dead-center on the rendered MapLibre ets2-roads layer.
    const finalCoordinates = coordinates;

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
