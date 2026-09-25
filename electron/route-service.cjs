var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// opc-app/electron/route-service.ts
var route_service_exports = {};
__export(route_service_exports, {
  getRoute: () => getRoute,
  getRouteServiceStatus: () => getRouteServiceStatus,
  hasIntersectionNearPoint: () => hasIntersectionNearPoint,
  invalidateRouteCache: () => invalidateRouteCache,
  isNodeIntersection: () => isNodeIntersection,
  scsHeadingToCartesianAngle: () => scsHeadingToCartesianAngle,
  verifyTurnPointsWithNodes: () => verifyTurnPointsWithNodes
});
module.exports = __toCommonJS(route_service_exports);
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);
var earthRadiusMeters = 6370997;
var lengthOfDegree = earthRadiusMeters * Math.PI / 180;
function scsHeadingToCartesianAngle(h) {
  if (h == null || isNaN(h)) return 0;
  let norm = h;
  if (Math.abs(norm) <= 1) {
    norm = (norm % 1 + 1) % 1;
    const theta = (0.5 - norm) * Math.PI * 2 + Math.PI / 2;
    return (theta % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
  }
  return (h % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI;
}
var SECTOR_SIZE = 2e3;
var SpatialIndex = class {
  sectors = /* @__PURE__ */ new Map();
  insert(node) {
    const key = `${Math.floor(node.x / SECTOR_SIZE)},${Math.floor(node.y / SECTOR_SIZE)}`;
    const arr = this.sectors.get(key) || [];
    arr.push(node);
    this.sectors.set(key, arr);
  }
  withinRadius(x, y, maxDist = 50) {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);
    const maxDistSq = maxDist * maxDist;
    const result = [];
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
  nearest(x, y, maxDist = 5e3) {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);
    let best = null;
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
  nearestInGraph(x, y, graph, maxDist = 2e4) {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);
    let best = null;
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
  nearestWithHeading(x, y, heading, graph, maxDist = 5e3) {
    const cx = Math.floor(x / SECTOR_SIZE);
    const cy = Math.floor(y / SECTOR_SIZE);
    const maxRadius = Math.ceil(maxDist / SECTOR_SIZE);
    const candidates = [];
    const seen = /* @__PURE__ */ new Set();
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
    let best = null;
    let bestScore = Infinity;
    for (const node of top) {
      const delta = Math.abs(((node.rotation - truckHeading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
      const alignmentPenalty = delta > Math.PI / 2 ? 1e4 + delta * 3e3 : delta * 600;
      const score = node.dist + alignmentPenalty;
      if (score < bestScore) {
        bestScore = score;
        best = node;
      }
    }
    return best || candidates[0];
  }
};
var BinaryHeap = class {
  data = [];
  comparator;
  constructor(comparator) {
    this.comparator = comparator;
  }
  get length() {
    return this.data.length;
  }
  push(value) {
    this.data.push(value);
    this.bubbleUp(this.data.length - 1);
  }
  pop() {
    if (this.data.length === 0) return void 0;
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this.sinkDown(0);
    }
    return top;
  }
  bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = idx - 1 >> 1;
      if (this.comparator(this.data[idx], this.data[parentIdx]) < 0) {
        [this.data[idx], this.data[parentIdx]] = [this.data[parentIdx], this.data[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }
  sinkDown(idx) {
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
};
var cachedGraph = null;
function normalizeUid(val) {
  if (typeof val === "string") return val;
  if (typeof val === "number") return val.toString(16);
  return "0";
}
function parseGraphData(json) {
  const raw = JSON.parse(json);
  const graph = /* @__PURE__ */ new Map();
  if (raw.graph && Array.isArray(raw.graph)) {
    for (const entry of raw.graph) {
      const [nid, neighbors] = entry;
      graph.set(nid, neighbors);
    }
  }
  const serviceAreas = /* @__PURE__ */ new Map();
  if (raw.serviceAreas && Array.isArray(raw.serviceAreas)) {
    for (const entry of raw.serviceAreas) {
      const [nid, area] = entry;
      serviceAreas.set(nid, area);
    }
  }
  return { graph, serviceAreas };
}
function loadGraph(mapDataDir, map = "europe") {
  if (cachedGraph) return cachedGraph;
  const graphPath = import_node_path.default.join(mapDataDir, `${map}-graph.json`);
  const nodesPath = import_node_path.default.join(mapDataDir, `${map}-nodes.json`);
  if (!import_node_fs.default.existsSync(graphPath)) {
    throw new Error(`Graph file not found: ${graphPath}`);
  }
  if (!import_node_fs.default.existsSync(nodesPath)) {
    throw new Error(`Nodes file not found: ${nodesPath}`);
  }
  const graphJson = import_node_fs.default.readFileSync(graphPath, "utf8");
  const graphData = parseGraphData(graphJson);
  const nodesJson = import_node_fs.default.readFileSync(nodesPath, "utf8");
  const nodesArray = JSON.parse(nodesJson);
  const nodes = nodesArray.map((n) => ({
    uid: normalizeUid(n.uid),
    x: n.x,
    y: n.y,
    z: n.z,
    rotation: typeof n.rotation === "number" ? n.rotation : 0,
    forwardItemUid: normalizeUid(n.forwardItemUid),
    backwardItemUid: normalizeUid(n.backwardItemUid)
  }));
  let roadLooksPath = import_node_path.default.join(mapDataDir, `${map}-roadLooks.json`);
  if (!import_node_fs.default.existsSync(roadLooksPath)) {
    const alt = import_node_path.default.join(mapDataDir, `${map}-road-looks.json`);
    if (import_node_fs.default.existsSync(alt)) roadLooksPath = alt;
  }
  const roadLooksMap = /* @__PURE__ */ new Map();
  if (import_node_fs.default.existsSync(roadLooksPath)) {
    try {
      const roadLooksJson = import_node_fs.default.readFileSync(roadLooksPath, "utf8");
      const rawLooks = JSON.parse(roadLooksJson);
      for (const look of rawLooks) {
        if (look && look.token) {
          const left = Array.isArray(look.lanesLeft) ? look.lanesLeft.length : 1;
          const right = Array.isArray(look.lanesRight) ? look.lanesRight.length : 1;
          roadLooksMap.set(String(look.token), { lanesLeft: left, lanesRight: right });
        }
      }
      console.log(`[route-service] Loaded ${roadLooksMap.size} roadLooks from ${roadLooksPath}`);
    } catch (e) {
      console.error("[route-service] Failed to parse roadLooks:", e.message);
    }
  }
  const roadsPath = import_node_path.default.join(mapDataDir, `${map}-roads.json`);
  const roads = /* @__PURE__ */ new Map();
  if (import_node_fs.default.existsSync(roadsPath)) {
    try {
      const roadsJson = import_node_fs.default.readFileSync(roadsPath, "utf8");
      const rawRoads = JSON.parse(roadsJson);
      for (const r of rawRoads) {
        const rUid = normalizeUid(r.uid);
        const lookToken = r.roadLookToken ? String(r.roadLookToken) : void 0;
        const lookInfo = lookToken ? roadLooksMap.get(lookToken) : void 0;
        roads.set(rUid, {
          startNodeUid: normalizeUid(r.startNodeUid),
          endNodeUid: normalizeUid(r.endNodeUid),
          roadLookToken: lookToken,
          lanesLeft: lookInfo?.lanesLeft ?? 1,
          lanesRight: lookInfo?.lanesRight ?? 1
        });
      }
      console.log(`[route-service] Loaded ${roads.size} roads from ${roadsPath}`);
    } catch (e) {
      console.error("[route-service] Failed to parse roads:", e.message);
    }
  } else {
    console.warn(`[route-service] Roads file not found: ${roadsPath}`);
  }
  const prefabDescriptionsMap = /* @__PURE__ */ new Map();
  const prefabDescsByToken = /* @__PURE__ */ new Map();
  let descPath = import_node_path.default.join(mapDataDir, `${map}-prefabDescriptions.json`);
  if (!import_node_fs.default.existsSync(descPath)) {
    const alt = import_node_path.default.join(mapDataDir, `${map}-prefab-descriptions.json`);
    if (import_node_fs.default.existsSync(alt)) descPath = alt;
  }
  if (import_node_fs.default.existsSync(descPath)) {
    try {
      const rawDescs = JSON.parse(import_node_fs.default.readFileSync(descPath, "utf8"));
      for (const d of rawDescs) {
        if (d && d.token) {
          const tokenStr = String(d.token);
          if (d.path) {
            prefabDescriptionsMap.set(tokenStr, String(d.path));
          }
          prefabDescsByToken.set(tokenStr, {
            token: tokenStr,
            path: String(d.path || ""),
            nodes: Array.isArray(d.nodes) ? d.nodes.map((n) => ({
              inputLanes: Array.isArray(n.inputLanes) ? n.inputLanes : [],
              outputLanes: Array.isArray(n.outputLanes) ? n.outputLanes : [],
              x: Number(n.x) || 0,
              y: Number(n.y) || 0,
              rotation: Number(n.rotation) || 0
            })) : [],
            navCurves: Array.isArray(d.navCurves) ? d.navCurves.map((c) => ({
              start: { x: Number(c.start?.x) || 0, y: Number(c.start?.y) || 0, rotation: Number(c.start?.rotation) || 0 },
              end: { x: Number(c.end?.x) || 0, y: Number(c.end?.y) || 0, rotation: Number(c.end?.rotation) || 0 },
              nextLines: Array.isArray(c.nextLines) ? c.nextLines : []
            })) : []
          });
        }
      }
      console.log(`[route-service] Loaded ${prefabDescsByToken.size} prefab descriptions with navCurves from ${descPath}`);
    } catch (e) {
      console.error("[route-service] Failed to parse prefabDescriptions:", e.message);
    }
  }
  const prefabsByUid = /* @__PURE__ */ new Map();
  const nodePrefabMap = /* @__PURE__ */ new Map();
  const prefabsPath = import_node_path.default.join(mapDataDir, `${map}-prefabs.json`);
  if (import_node_fs.default.existsSync(prefabsPath)) {
    try {
      const rawPrefabs = JSON.parse(import_node_fs.default.readFileSync(prefabsPath, "utf8"));
      for (const pf of rawPrefabs) {
        if (pf && pf.uid && pf.token && Array.isArray(pf.nodeUids)) {
          const uidStr = normalizeUid(pf.uid);
          const token = String(pf.token);
          const pfPath = prefabDescriptionsMap.get(token) || token;
          const nodeUidsNorm = pf.nodeUids.map(normalizeUid);
          const metadata = {
            type: pf.type || "prefab",
            token,
            path: pfPath,
            nodeCount: nodeUidsNorm.length,
            prefabUid: uidStr
          };
          prefabsByUid.set(uidStr, {
            uid: uidStr,
            token,
            originNodeIndex: Number(pf.originNodeIndex) || 0,
            nodeUids: nodeUidsNorm
          });
          for (const nUid of nodeUidsNorm) {
            nodePrefabMap.set(nUid, metadata);
          }
        }
      }
      console.log(`[route-service] Mapped ${nodePrefabMap.size} nodes to ${prefabsByUid.size} prefabs from ${prefabsPath}`);
    } catch (e) {
      console.error("[route-service] Failed to parse prefabs:", e.message);
    }
  }
  const spatialIndex = new SpatialIndex();
  const nodeLUT = /* @__PURE__ */ new Map();
  for (const node of nodes) {
    spatialIndex.insert({
      uid: node.uid,
      x: node.x,
      y: node.y,
      z: node.z,
      rotation: node.rotation
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
function findRoutePath(startUid, endUid, graph, nodeLUT, heading) {
  if (!graph.has(startUid)) {
    console.warn("[route-service] start node not in graph:", startUid);
    return null;
  }
  if (!graph.has(endUid)) {
    console.warn("[route-service] end node not in graph:", endUid);
    return null;
  }
  const startNode = nodeLUT.get(startUid);
  const endNode = nodeLUT.get(endUid);
  if (!startNode || !endNode) {
    console.warn("[route-service] start or end node not in nodeLUT");
    return null;
  }
  const openSet = new BinaryHeap((a, b) => {
    const fa = fScore.get(`${a.nodeUid}:${a.direction}`) ?? Infinity;
    const fb = fScore.get(`${b.nodeUid}:${b.direction}`) ?? Infinity;
    return fa - fb;
  });
  const stateKey = (s) => `${s.nodeUid}:${s.direction}`;
  const gScore = /* @__PURE__ */ new Map();
  const fScore = /* @__PURE__ */ new Map();
  const cameFrom = /* @__PURE__ */ new Map();
  const h = (n) => {
    const dx = n.x - endNode.x;
    const dy = n.y - endNode.y;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const h0 = h(startNode);
  const truckHeading = heading != null ? scsHeadingToCartesianAngle(heading) : void 0;
  const faDelta = truckHeading != null ? Math.abs(((startNode.rotation - truckHeading) % (Math.PI * 2) + Math.PI * 3) % (Math.PI * 2) - Math.PI) : 0;
  const isBackwardMoreAligned = truckHeading != null && faDelta > Math.PI / 2;
  const fwdState = { nodeUid: startUid, direction: "forward" };
  const bwdState = { nodeUid: startUid, direction: "backward" };
  const fwdKey = stateKey(fwdState);
  const bwdKey = stateKey(bwdState);
  gScore.set(fwdKey, isBackwardMoreAligned ? 5e4 : 0);
  gScore.set(bwdKey, isBackwardMoreAligned ? 0 : 5e4);
  fScore.set(fwdKey, gScore.get(fwdKey) + h0);
  fScore.set(bwdKey, gScore.get(bwdKey) + h0);
  openSet.push(fwdState);
  openSet.push(bwdState);
  let iterations = 0;
  const MAX_ITERATIONS = 5e5;
  while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    const current = openSet.pop();
    const curKey = stateKey(current);
    if (current.nodeUid === endUid) {
      const routePath = [endUid];
      let currKey = curKey;
      let totalDist = 0;
      while (cameFrom.has(currKey)) {
        const edge = cameFrom.get(currKey);
        totalDist += edge.edgeDist;
        currKey = stateKey(edge.state);
        routePath.unshift(edge.state.nodeUid);
      }
      console.log(`[route-service] Truckermudgeon A* found path in ${iterations} iterations, ${routePath.length} nodes`);
      return {
        path: routePath,
        distance: totalDist,
        duration: totalDist / 15
      };
    }
    const neighborsObj = graph.get(current.nodeUid);
    if (!neighborsObj) continue;
    const neighborsInDir = current.direction === "forward" ? neighborsObj.forward : neighborsObj.backward;
    const currentG = gScore.get(curKey) ?? Infinity;
    for (const neighbor of neighborsInDir) {
      const neighborState = {
        nodeUid: neighbor.nodeUid,
        direction: neighbor.direction
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
  console.warn(`[route-service] Directional search exhausted after ${iterations} iterations, running fallback...`);
  return findRoutePathFallback(startUid, endUid, graph, nodeLUT, heading);
}
function findRoutePathFallback(startUid, endUid, graph, nodeLUT, heading) {
  const startNode = nodeLUT.get(startUid);
  const endNode = nodeLUT.get(endUid);
  if (!startNode || !endNode) return null;
  const openSet = new BinaryHeap((a, b) => a.f - b.f);
  const gScore = /* @__PURE__ */ new Map();
  const cameFrom = /* @__PURE__ */ new Map();
  const closed = /* @__PURE__ */ new Set();
  const h = (n) => Math.sqrt((n.x - endNode.x) ** 2 + (n.y - endNode.y) ** 2);
  gScore.set(startUid, 0);
  openSet.push({ uid: startUid, f: h(startNode) });
  let iterations = 0;
  while (openSet.length > 0 && iterations < 5e5) {
    iterations++;
    const current = openSet.pop();
    if (current.uid === endUid) {
      const routePath = [endUid];
      let curr = endUid;
      while (cameFrom.has(curr)) {
        curr = cameFrom.get(curr);
        routePath.unshift(curr);
      }
      return { path: routePath, distance: gScore.get(endUid), duration: 0 };
    }
    if (closed.has(current.uid)) continue;
    closed.add(current.uid);
    const neighborsObj = graph.get(current.uid);
    if (!neighborsObj) continue;
    let neighbors = [...neighborsObj.forward, ...neighborsObj.backward];
    const truckHeading = heading != null ? scsHeadingToCartesianAngle(heading) : void 0;
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
function heuristic(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}
function clampTangentAngle(rot, chordAngle) {
  let delta = rot - chordAngle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  const maxDev = 85 * Math.PI / 180;
  if (delta > maxDev) return chordAngle + maxDev;
  if (delta < -maxDev) return chordAngle - maxDev;
  return rot;
}
function toSplinePoints(start, end, steps) {
  const p0 = [start.x, start.y];
  const p1 = [end.x, end.y];
  const dx = p1[0] - p0[0];
  const dy = p1[1] - p0[1];
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 0.1) return [p0, p1];
  const chordAngle = Math.atan2(dy, dx);
  const startRot = clampTangentAngle(start.rotation, chordAngle);
  const endRot = clampTangentAngle(end.rotation, chordAngle);
  if (steps == null) {
    const deltaRot2 = Math.abs(startRot - endRot);
    const distSteps = Math.ceil(dist / 10);
    const curveSteps = Math.ceil(deltaRot2 * 16);
    steps = Math.min(64, Math.max(4, distSteps, curveSteps));
  }
  if (steps < 1) steps = 1;
  const deltaRot = Math.abs(startRot - chordAngle) + Math.abs(endRot - chordAngle);
  const curvatureDamping = Math.max(0.3, Math.min(0.5, 0.5 - deltaRot / (Math.PI * 2) * 0.2));
  const tangentScale = dist * curvatureDamping;
  const m0 = [Math.cos(startRot) * tangentScale, Math.sin(startRot) * tangentScale];
  const m1 = [Math.cos(endRot) * tangentScale, Math.sin(endRot) * tangentScale];
  const res = [];
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
function rotateRight(arr, count) {
  if (arr.length === 0 || count === 0) return arr.slice();
  const c = (count % arr.length + arr.length) % arr.length;
  return arr.slice(-c).concat(arr.slice(0, -c));
}
function rotatePoint(px, py, rad, cx, cy) {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = px - cx;
  const dy = py - cy;
  return [cx + dx * cos - dy * sin, cy + dx * sin + dy * cos];
}
function toMapPosition(px, py, prefabItem, prefabDesc, nodeLUT) {
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
function getCurvePaths(prefabDesc, inputLaneIndex) {
  const endingCurveIndexToNodeIndex = /* @__PURE__ */ new Map();
  for (let nodeIndex = 0; nodeIndex < prefabDesc.nodes.length; nodeIndex++) {
    const node = prefabDesc.nodes[nodeIndex];
    for (const outputLane of node.outputLanes) {
      endingCurveIndexToNodeIndex.set(outputLane, nodeIndex);
    }
  }
  const prefix = (curvePath, curveIndex) => ({
    endingNodeIndex: curvePath.endingNodeIndex,
    curvePathIndices: [curveIndex, ...curvePath.curvePathIndices]
  });
  const seenIndices = /* @__PURE__ */ new Set();
  const getPaths = (curveIndex) => {
    if (seenIndices.has(curveIndex)) return [];
    seenIndices.add(curveIndex);
    if (endingCurveIndexToNodeIndex.has(curveIndex)) {
      return [{ endingNodeIndex: endingCurveIndexToNodeIndex.get(curveIndex), curvePathIndices: [] }];
    }
    const ending = [];
    const curve = prefabDesc.navCurves[curveIndex];
    if (curve && Array.isArray(curve.nextLines)) {
      for (const next of curve.nextLines) {
        ending.push(...getPaths(next).map((p) => prefix(p, next)));
      }
    }
    return ending;
  };
  return getPaths(inputLaneIndex).map((p) => prefix(p, inputLaneIndex));
}
function getPrefabCurvePoints(sNode, eNode, sharedPrefabUid, prefabsByUid, prefabDescsByToken, nodeLUT) {
  let prefabItem;
  if (sharedPrefabUid) {
    prefabItem = prefabsByUid.get(sharedPrefabUid);
  }
  if (!prefabItem) {
    for (const itemUid of [sNode.forwardItemUid, sNode.backwardItemUid, eNode.forwardItemUid, eNode.backwardItemUid]) {
      if (itemUid && itemUid !== "0" && prefabsByUid.has(itemUid)) {
        const candidate = prefabsByUid.get(itemUid);
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
  let chosenCurveIndices = null;
  for (const inputLane of sDescNode.inputLanes) {
    const paths = getCurvePaths(prefabDesc, inputLane);
    const match = paths.find((p) => p.endingNodeIndex === endNodeIndex);
    if (match && match.curvePathIndices.length > 0) {
      chosenCurveIndices = match.curvePathIndices;
      break;
    }
  }
  if (!chosenCurveIndices || chosenCurveIndices.length === 0) {
    return null;
  }
  const points = [];
  for (const ci of chosenCurveIndices) {
    const curve = prefabDesc.navCurves[ci];
    if (!curve) continue;
    const curveSpline = toSplinePoints(
      { x: curve.start.x, y: curve.start.y, rotation: curve.start.rotation },
      { x: curve.end.x, y: curve.end.y, rotation: curve.end.rotation }
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
function getRouteServiceStatus(mapDataDir) {
  if (!mapDataDir) {
    return { available: false, error: "No map data directory configured" };
  }
  try {
    loadGraph(mapDataDir);
  } catch (e) {
    return { available: false, error: e.message };
  }
  return { available: true };
}
function isNodeIntersection(nodeUid, graph, nodePrefabMap, prefabsByUid) {
  const neighbors = graph.get(nodeUid);
  if (neighbors) {
    const unique = /* @__PURE__ */ new Set();
    for (const n of neighbors.forward) unique.add(n.nodeUid);
    for (const n of neighbors.backward) unique.add(n.nodeUid);
    if (unique.size >= 3) return true;
  }
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
function hasIntersectionNearPoint(x, y, spatialIndex, graph, nodePrefabMap, prefabsByUid, radius = 45) {
  const nearbyNodes = spatialIndex.withinRadius(x, y, radius);
  for (const n of nearbyNodes) {
    if (isNodeIntersection(n.uid, graph, nodePrefabMap, prefabsByUid)) {
      return true;
    }
  }
  return false;
}
function verifyTurnPointsWithNodes(turnPoints, mapDataDir, map = "europe") {
  if (!turnPoints || turnPoints.length === 0) return [];
  let graphContext = cachedGraph;
  if (!graphContext) {
    try {
      loadGraph(mapDataDir, map);
      graphContext = cachedGraph;
    } catch (e) {
      console.warn("[route-service] Failed to load graph in verifyTurnPointsWithNodes:", e.message);
      return turnPoints;
    }
    if (!graphContext) return turnPoints;
  }
  const { spatialIndex, data, nodePrefabMap, prefabsByUid } = graphContext;
  return turnPoints.filter((tp) => {
    if (tp.type === "roundabout") return true;
    return hasIntersectionNearPoint(tp.x, tp.y, spatialIndex, data.graph, nodePrefabMap, prefabsByUid, 45);
  });
}
function getRoute(sourceX, sourceZ, destX, destZ, mapDataDir, heading) {
  try {
    const { data: graphData, spatialIndex, nodes, roads, nodeLUT, nodePrefabMap, prefabsByUid, prefabDescsByToken } = loadGraph(mapDataDir);
    let sourceNode = heading != null ? spatialIndex.nearestWithHeading(sourceX, sourceZ, heading, graphData.graph, 2e4) : spatialIndex.nearestInGraph(sourceX, sourceZ, graphData.graph, 2e4) || spatialIndex.nearest(sourceX, sourceZ, 2e4);
    const destNode = spatialIndex.nearestInGraph(destX, destZ, graphData.graph, 2e4) || spatialIndex.nearest(destX, destZ, 2e4);
    console.log("[route-service] nearest source", sourceX, sourceZ, "->", sourceNode?.uid, sourceNode?.x, sourceNode?.y, "heading", heading);
    console.log("[route-service] nearest dest", destX, destZ, "->", destNode?.uid, destNode?.x, destNode?.y);
    if (!sourceNode || !destNode) {
      console.warn("[route-service] No nodes found within 20000m of source or dest");
      return null;
    }
    const sourceInGraph = graphData.graph.has(sourceNode.uid);
    const destInGraph = graphData.graph.has(destNode.uid);
    console.log("[route-service] source in graph:", sourceInGraph, "dest in graph:", destInGraph);
    const effectiveSource = sourceInGraph ? sourceNode : spatialIndex.nearestInGraph(sourceX, sourceZ, graphData.graph, 2e4);
    const effectiveDest = destInGraph ? destNode : spatialIndex.nearestInGraph(destX, destZ, graphData.graph, 2e4);
    if (!effectiveSource || !effectiveDest) {
      console.warn("[route-service] No graph nodes found within 20000m of source or dest");
      return null;
    }
    console.log("[route-service] effective source", effectiveSource.uid, effectiveSource.x, effectiveSource.y);
    console.log("[route-service] effective dest", effectiveDest.uid, effectiveDest.x, effectiveDest.y);
    if (effectiveSource.uid === effectiveDest.uid) {
      return {
        success: true,
        coordinates: [[sourceX, sourceZ], [destX, destZ]],
        distanceMeters: 0,
        durationSeconds: 0
      };
    }
    let result = findRoutePath(effectiveSource.uid, effectiveDest.uid, graphData.graph, nodeLUT, heading);
    if (!result || result.path.length < 2) {
      console.log("[route-service] Directional A* found no path, trying robust fallback A*...");
      result = findRoutePathFallback(effectiveSource.uid, effectiveDest.uid, graphData.graph, nodeLUT, heading);
    }
    if (!result || result.path.length < 2) {
      console.warn("[route-service] No path found, falling back to straight line");
      return {
        success: true,
        coordinates: [[sourceX, sourceZ], [destX, destZ]],
        distanceMeters: heuristic({ x: sourceX, y: sourceZ }, { x: destX, y: destZ }),
        durationSeconds: 0
      };
    }
    const coordinates = [];
    const segmentLanes = [];
    const turnPoints = [];
    const appendSegmentPoints = (pts, laneCount) => {
      if (!pts || pts.length === 0) return;
      if (coordinates.length === 0) {
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
      const sItems = [sNode.forwardItemUid, sNode.backwardItemUid].filter((uid) => uid !== "0");
      const eItems = [eNode.forwardItemUid, eNode.backwardItemUid].filter((uid) => uid !== "0");
      const sharedItemUid = sItems.find((uid) => eItems.includes(uid));
      const roadInfo = sharedItemUid ? roads.get(sharedItemUid) : void 0;
      const isForward = roadInfo ? roadInfo.startNodeUid === sNode.uid : true;
      const roadLaneCount = roadInfo ? Math.max(1, isForward ? roadInfo.lanesRight || 1 : roadInfo.lanesLeft || 1) : 1;
      if (i > 0) {
        const prevUid = result.path[i - 1];
        const prevNode = nodeLUT.get(prevUid);
        if (prevNode) {
          const prevItems = [prevNode.forwardItemUid, prevNode.backwardItemUid].filter((uid) => uid !== "0");
          const prevSharedItemUid = prevItems.find((uid) => sItems.includes(uid));
          const prevRoadInfo = prevSharedItemUid ? roads.get(prevSharedItemUid) : void 0;
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
            const isExit = prevRoadInfo && (prevRoadInfo.lanesRight >= 2 || prevRoadInfo.lanesLeft >= 2) && (!roadInfo || roadLaneCount === 1) || isPrefabJunction && deltaDeg >= 8 && deltaDeg < 28 && roadLaneCount === 1;
            const isEntry = prevRoadInfo && (prevRoadInfo.lanesRight < 2 && prevRoadInfo.lanesLeft < 2) && roadInfo && (roadInfo.lanesRight >= 2 || roadInfo.lanesLeft >= 2) || isPrefabJunction && deltaDeg >= 8 && deltaDeg < 28 && roadInfo && roadLaneCount >= 2;
            const forwardNeighbors = graphData.graph.get(sNode.uid)?.forward || [];
            const backwardNeighbors = graphData.graph.get(sNode.uid)?.backward || [];
            const allConnectedNeighbors = Array.from(/* @__PURE__ */ new Set([...forwardNeighbors.map((n) => n.nodeUid), ...backwardNeighbors.map((n) => n.nodeUid)]));
            const uniqueNeighborNodes = allConnectedNeighbors.filter((uid) => uid !== prevUid);
            const isIntersection = isNodeIntersection(sNode.uid, graphData.graph, nodePrefabMap, prefabsByUid);
            let isTakingStraightPath = false;
            if (uniqueNeighborNodes.length >= 2) {
              let minCandidateDelta = Infinity;
              let straightNeighborUid = null;
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
            const isRoundabout = sPrefabMeta?.type === "roundabout";
            const isPrefabExit = (sPrefabMeta?.type === "highway-exit" || isExit) && isIntersection;
            const isPrefabEntry = (sPrefabMeta?.type === "highway-entry" || isEntry) && isIntersection;
            const isSameRoadContinuation = prevRoadInfo && roadInfo && prevSharedItemUid && sharedItemUid && prevSharedItemUid === sharedItemUid;
            const isSignificantTurn = isIntersection && !isSameRoadContinuation && (isRoundabout ? deltaDeg >= 12 : isPrefabExit || isPrefabEntry ? deltaDeg >= 15 : !isTakingStraightPath && deltaDeg >= 18);
            if (isSignificantTurn) {
              const lastTp = turnPoints[turnPoints.length - 1];
              if (!lastTp || Math.hypot(sNode.x - lastTp.x, sNode.y - lastTp.y) > 75) {
                const mathAngleDeg = Math.atan2(dyOut, dxOut) * (180 / Math.PI);
                const iconRotate = (90 - mathAngleDeg + 360) % 360;
                const signedDelta = ((headingOut - headingIn) * (180 / Math.PI) + 540) % 360 - 180;
                const turnDir = signedDelta > 0 ? "right" : "left";
                let maneuverType = "turn";
                if (sPrefabMeta && sPrefabMeta.type !== "road") {
                  maneuverType = sPrefabMeta.type;
                } else if (isPrefabExit) {
                  maneuverType = "highway-exit";
                } else if (isPrefabEntry) {
                  maneuverType = "highway-entry";
                }
                turnPoints.push({
                  x: sNode.x,
                  y: sNode.y,
                  bearing: iconRotate,
                  type: maneuverType,
                  dir: turnDir,
                  absAngle: deltaDeg,
                  coordIdx: Math.max(0, coordinates.length - 1)
                });
              }
            }
          }
        }
      }
      if (roadInfo) {
        const isForwardTraversal = roadInfo.startNodeUid === sNode.uid;
        const canonicalStart = isForwardTraversal ? sNode : eNode;
        const canonicalEnd = isForwardTraversal ? eNode : sNode;
        let roadPoints = toSplinePoints(
          { x: canonicalStart.x, y: canonicalStart.y, rotation: canonicalStart.rotation },
          { x: canonicalEnd.x, y: canonicalEnd.y, rotation: canonicalEnd.rotation }
        );
        if (!isForwardTraversal) {
          roadPoints = roadPoints.reverse();
        }
        appendSegmentPoints(roadPoints, roadLaneCount);
      } else {
        const prefabPoints = getPrefabCurvePoints(sNode, eNode, sharedItemUid, prefabsByUid, prefabDescsByToken, nodeLUT);
        if (prefabPoints && prefabPoints.length >= 2) {
          appendSegmentPoints(prefabPoints, 2);
        } else {
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
    const lastCoord = coordinates[coordinates.length - 1];
    if (!lastCoord || Math.hypot(destX - lastCoord[0], destZ - lastCoord[1]) > 0.5) {
      coordinates.push([destX, destZ]);
      segmentLanes.push(2);
    }
    const finalCoordinates = coordinates;
    console.log("[route-service] route found:", finalCoordinates.length, "points,", turnPoints.length, "turn points,", result.distance.toFixed(0), "m");
    return {
      success: true,
      coordinates: finalCoordinates,
      distanceMeters: result.distance,
      durationSeconds: result.duration || result.distance / 15,
      turnPoints,
      segmentLanes
    };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("[route-service] Route calculation failed:", error.message);
    return null;
  }
}
function invalidateRouteCache() {
  clearCache();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getRoute,
  getRouteServiceStatus,
  hasIntersectionNearPoint,
  invalidateRouteCache,
  isNodeIntersection,
  scsHeadingToCartesianAngle,
  verifyTurnPointsWithNodes
});
