import { GameMap, FLOOR_TILE, WALL_TILE } from "./game-map.ts";
import { assignWallCharacters } from "./tile-utils.ts";
import { buildRoomGraph, type RoomGraph } from "./room-graph.ts";
import { assignZones, applyZoneThemes, type Zone } from "./zones.ts";

export type RoomTag =
  | "entry"
  | "combat"
  | "loot"
  | "boss"
  | "transition"
  | "empty";

export interface SpawnPoint {
  x: number;
  y: number;
  type: "player" | "enemy" | "item";
}

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  floors: { x: number; y: number }[];
  tag: RoomTag;
  spawnPoints: SpawnPoint[];
  depth: number;
  intensity: number;
  zoneIndex: number;
}

export interface DungeonConfig {
  width: number;
  height: number;
  roomCount: number;
  roomMinSize: number;
  roomMaxSize: number;
  rng: () => number;
}

export interface DungeonResult {
  map: GameMap;
  rooms: Room[];
  zones: Zone[];
  graph: RoomGraph;
}

const DEFAULT_CONFIG: DungeonConfig = {
  width: 150,
  height: 100,
  roomCount: 16,
  roomMinSize: 5,
  roomMaxSize: 14,
  rng: Math.random,
};

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function roomCenter(room: Room): { x: number; y: number } {
  const cx = Math.floor(room.x + room.width / 2);
  const cy = Math.floor(room.y + room.height / 2);
  if (
    room.floors.length > 0 &&
    !room.floors.some((f) => f.x === cx && f.y === cy)
  ) {
    let best = room.floors[0]!;
    let bestDist = Infinity;
    for (const f of room.floors) {
      const d = (f.x - cx) ** 2 + (f.y - cy) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = f;
      }
    }
    return { x: best.x, y: best.y };
  }
  return { x: cx, y: cy };
}

function roomsOverlap(a: Room, b: Room, gap: number): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

type SizeCategory = "small" | "medium" | "large";

function pickSizeCategory(rng: () => number): SizeCategory {
  const roll = rng();
  if (roll < 0.4) return "small";
  if (roll < 0.8) return "medium";
  return "large";
}

function rollDimensions(
  category: SizeCategory,
  rng: () => number,
): { w: number; h: number } {
  switch (category) {
    case "small":
      return { w: randInt(5, 6, rng), h: randInt(5, 6, rng) };
    case "medium":
      return { w: randInt(7, 10, rng), h: randInt(7, 8, rng) };
    case "large":
      return { w: randInt(11, 14, rng), h: randInt(9, 12, rng) };
  }
}

type RoomShape = "rectangular" | "l-shaped" | "circular" | "cross";

function pickRoomShape(rng: () => number): RoomShape {
  const roll = rng();
  if (roll < 0.5) return "rectangular";
  if (roll < 0.7) return "l-shaped";
  if (roll < 0.9) return "circular";
  return "cross";
}

function generateRectangularFloors(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number }[] {
  const floors: { x: number; y: number }[] = [];
  for (let fy = y; fy < y + h; fy++) {
    for (let fx = x; fx < x + w; fx++) {
      floors.push({ x: fx, y: fy });
    }
  }
  return floors;
}

function generateLShapedFloors(
  x: number,
  y: number,
  w: number,
  h: number,
  rng: () => number,
): { x: number; y: number }[] {
  const splitW = Math.max(3, Math.floor(w * (0.4 + rng() * 0.2)));
  const splitH = Math.max(3, Math.floor(h * (0.4 + rng() * 0.2)));

  const floors = new Set<string>();
  const add = (fx: number, fy: number) => {
    floors.add(`${fx},${fy}`);
  };

  // Horizontal arm (full width, partial height)
  for (let fy = y; fy < y + splitH; fy++) {
    for (let fx = x; fx < x + w; fx++) {
      add(fx, fy);
    }
  }
  // Vertical arm (partial width, full height)
  for (let fy = y; fy < y + h; fy++) {
    for (let fx = x; fx < x + splitW; fx++) {
      add(fx, fy);
    }
  }

  return [...floors].map((s) => {
    const [px, py] = s.split(",").map(Number);
    return { x: px!, y: py! };
  });
}

function generateCircularFloors(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number }[] {
  const floors: { x: number; y: number }[] = [];
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2 - 0.5;
  const ry = h / 2 - 0.5;

  for (let fy = y; fy < y + h; fy++) {
    for (let fx = x; fx < x + w; fx++) {
      const dx = (fx + 0.5 - cx) / rx;
      const dy = (fy + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1.0) {
        floors.push({ x: fx, y: fy });
      }
    }
  }
  return floors;
}

function generateCrossFloors(
  x: number,
  y: number,
  w: number,
  h: number,
): { x: number; y: number }[] {
  const floors: { x: number; y: number }[] = [];
  const armW = Math.max(2, Math.floor(w / 3));
  const armH = Math.max(2, Math.floor(h / 3));
  const hStart = x + Math.floor((w - armW) / 2);
  const vStart = y + Math.floor((h - armH) / 2);

  for (let fy = y; fy < y + h; fy++) {
    for (let fx = x; fx < x + w; fx++) {
      const inVertical = fx >= hStart && fx < hStart + armW;
      const inHorizontal = fy >= vStart && fy < vStart + armH;
      if (inVertical || inHorizontal) {
        floors.push({ x: fx, y: fy });
      }
    }
  }
  return floors;
}

function generateRoomFloors(
  x: number,
  y: number,
  w: number,
  h: number,
  shape: RoomShape,
  rng: () => number,
): { x: number; y: number }[] {
  switch (shape) {
    case "rectangular":
      return generateRectangularFloors(x, y, w, h);
    case "l-shaped":
      return generateLShapedFloors(x, y, w, h, rng);
    case "circular":
      return generateCircularFloors(x, y, w, h);
    case "cross":
      return generateCrossFloors(x, y, w, h);
  }
}

function carveRoom(map: GameMap, room: Room): void {
  for (const f of room.floors) {
    map.setTile(f.x, f.y, { ...FLOOR_TILE });
  }
}

function carveLineH(
  map: GameMap,
  x1: number,
  x2: number,
  y: number,
  width: number,
): void {
  const step = x1 < x2 ? 1 : -1;
  for (let x = x1; x !== x2 + step; x += step) {
    for (let dy = 0; dy < width; dy++) {
      map.setTile(x, y + dy, { ...FLOOR_TILE });
    }
  }
}

function carveLineV(
  map: GameMap,
  y1: number,
  y2: number,
  x: number,
  width: number,
): void {
  const step = y1 < y2 ? 1 : -1;
  for (let y = y1; y !== y2 + step; y += step) {
    for (let dx = 0; dx < width; dx++) {
      map.setTile(x + dx, y, { ...FLOOR_TILE });
    }
  }
}

function carveLCorridor(
  map: GameMap,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  horizontalFirst: boolean,
  width: number = 1,
): void {
  if (horizontalFirst) {
    carveLineH(map, x1, x2, y1, width);
    carveLineV(map, y1, y2, x2, width);
  } else {
    carveLineV(map, y1, y2, x1, width);
    carveLineH(map, x1, x2, y2, width);
  }
}

type CorridorStyle = "l" | "winding" | "wide";

function pickCorridorStyle(rng: () => number): CorridorStyle {
  const roll = rng();
  if (roll < 0.4) return "l";
  if (roll < 0.75) return "winding";
  return "wide";
}

function carveCorridor(
  map: GameMap,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  style: CorridorStyle,
  rng: () => number,
): void {
  switch (style) {
    case "l":
      carveLCorridor(map, x1, y1, x2, y2, rng() < 0.5);
      break;
    case "winding": {
      const waypoints = randInt(1, 2, rng);
      let cx = x1;
      let cy = y1;
      for (let i = 0; i < waypoints; i++) {
        const t = (i + 1) / (waypoints + 1);
        const wpX = Math.floor(x1 + (x2 - x1) * t + randInt(-4, 4, rng));
        const wpY = Math.floor(y1 + (y2 - y1) * t + randInt(-4, 4, rng));
        const clampedX = Math.max(1, Math.min(map.width - 2, wpX));
        const clampedY = Math.max(1, Math.min(map.height - 2, wpY));
        carveLCorridor(map, cx, cy, clampedX, clampedY, rng() < 0.5);
        cx = clampedX;
        cy = clampedY;
      }
      carveLCorridor(map, cx, cy, x2, y2, rng() < 0.5);
      break;
    }
    case "wide":
      carveLCorridor(map, x1, y1, x2, y2, rng() < 0.5, randInt(2, 3, rng));
      break;
  }
}

function floodFill(map: GameMap, startX: number, startY: number): Set<string> {
  const visited = new Set<string>();
  const queue = [{ x: startX, y: startY }];
  visited.add(`${startX},${startY}`);

  while (queue.length > 0) {
    const { x, y } = queue.shift()!;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && map.isWalkable(nx, ny)) {
        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return visited;
}

function ensureConnectivity(
  map: GameMap,
  rooms: Room[],
  rng: () => number,
): void {
  if (rooms.length === 0) return;
  const start = roomCenter(rooms[0]!);
  const visited = floodFill(map, start.x, start.y);

  for (let i = 1; i < rooms.length; i++) {
    const center = roomCenter(rooms[i]!);
    if (!visited.has(`${center.x},${center.y}`)) {
      const prev = roomCenter(rooms[0]!);
      carveLCorridor(map, prev.x, prev.y, center.x, center.y, rng() < 0.5);
      const newVisited = floodFill(map, start.x, start.y);
      for (const key of newVisited) visited.add(key);
    }
  }
}

function addDeadEnds(map: GameMap, rooms: Room[], config: DungeonConfig): void {
  const rng = config.rng;
  const count = randInt(1, 3, rng);

  for (let i = 0; i < count; i++) {
    const sourceRoom = rooms[randInt(0, rooms.length - 1, rng)]!;
    const center = roomCenter(sourceRoom);

    const angle = rng() * Math.PI * 2;
    const length = randInt(4, 8, rng);
    const endX = Math.floor(center.x + Math.cos(angle) * length);
    const endY = Math.floor(center.y + Math.sin(angle) * length);

    const clampedX = Math.max(3, Math.min(config.width - 4, endX));
    const clampedY = Math.max(3, Math.min(config.height - 4, endY));

    carveLCorridor(map, center.x, center.y, clampedX, clampedY, rng() < 0.5);

    const deadEndSize = randInt(3, 4, rng);
    const roomX = Math.max(1, clampedX - Math.floor(deadEndSize / 2));
    const roomY = Math.max(1, clampedY - Math.floor(deadEndSize / 2));
    const safeX = Math.min(roomX, config.width - deadEndSize - 1);
    const safeY = Math.min(roomY, config.height - deadEndSize - 1);

    const floors = generateRectangularFloors(
      safeX,
      safeY,
      deadEndSize,
      deadEndSize,
    );
    for (const f of floors) {
      map.setTile(f.x, f.y, { ...FLOOR_TILE });
    }
  }
}

function getInteriorFloors(
  room: Room,
  map: GameMap,
): { x: number; y: number }[] {
  return room.floors.filter((f) => {
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ] as const) {
      if (!map.isWalkable(f.x + dx, f.y + dy)) return false;
    }
    return true;
  });
}

export function assignRoomTags(
  rooms: Room[],
  graph: RoomGraph,
  rng: () => number,
): void {
  if (rooms.length === 0) return;

  rooms[0]!.tag = "entry";

  if (rooms.length === 1) return;

  const adj = graph.adjacency;

  let bossIdx = -1;
  let maxDepth = -1;
  for (let i = 1; i < rooms.length; i++) {
    const area = rooms[i]!.floors.length;
    const depth = rooms[i]!.depth;
    const score = area * 2 + depth * 10;
    if (score > maxDepth) {
      maxDepth = score;
      bossIdx = i;
    }
  }
  rooms[bossIdx]!.tag = "boss";

  const criticalSet = new Set(graph.criticalPath);

  const smallThreshold = Math.floor(
    (rooms.reduce((sum, r) => sum + r.floors.length, 0) / rooms.length) * 0.6,
  );

  let lootCount = 0;
  const maxLoot = Math.min(2, Math.floor((rooms.length - 2) / 3) + 1);

  for (let i = 1; i < rooms.length; i++) {
    if (i === bossIdx) continue;

    const intensity = rooms[i]!.intensity;
    const onCritPath = criticalSet.has(i);
    const isDeadEnd = (adj.get(i)?.size ?? 0) <= 1;
    const isSmall = rooms[i]!.floors.length < smallThreshold;

    if (onCritPath) {
      if (isSmall && (adj.get(i)?.size ?? 0) >= 2) {
        rooms[i]!.tag = "transition";
      } else {
        rooms[i]!.tag = "combat";
      }
      continue;
    }

    if (isDeadEnd && lootCount < maxLoot && intensity < 0.6) {
      rooms[i]!.tag = "loot";
      lootCount++;
      continue;
    }

    if (intensity < 0.3 && lootCount < maxLoot && rng() < 0.4) {
      rooms[i]!.tag = "loot";
      lootCount++;
      continue;
    }

    if (isSmall && (adj.get(i)?.size ?? 0) >= 2) {
      rooms[i]!.tag = "transition";
      continue;
    }

    if (intensity < 0.2 && !onCritPath && rng() < 0.3) {
      rooms[i]!.tag = "empty";
      continue;
    }

    rooms[i]!.tag = "combat";
  }
}

function pickSpawnPositions(
  floors: { x: number; y: number }[],
  count: number,
  rng: () => number,
  exclude: Set<string> = new Set(),
): { x: number; y: number }[] {
  const available = floors.filter((f) => !exclude.has(`${f.x},${f.y}`));
  if (available.length === 0) return [];

  const result: { x: number; y: number }[] = [];
  const used = new Set<string>();

  for (let i = 0; i < Math.min(count, available.length); i++) {
    let best: { x: number; y: number } | null = null;
    let bestMinDist = -1;

    const candidates = Math.min(8, available.length);
    for (let c = 0; c < candidates; c++) {
      const idx = Math.floor(rng() * available.length);
      const f = available[idx]!;
      const key = `${f.x},${f.y}`;
      if (used.has(key)) continue;

      let minDist = Infinity;
      for (const prev of result) {
        const d = Math.abs(f.x - prev.x) + Math.abs(f.y - prev.y);
        if (d < minDist) minDist = d;
      }
      if (result.length === 0) minDist = 0;

      if (minDist > bestMinDist) {
        bestMinDist = minDist;
        best = f;
      }
    }

    if (best) {
      result.push(best);
      used.add(`${best.x},${best.y}`);
    }
  }
  return result;
}

export function generateSpawnPoints(
  rooms: Room[],
  map: GameMap,
  rng: () => number,
): void {
  for (const room of rooms) {
    room.spawnPoints = [];
    const interior = getInteriorFloors(room, map);
    const usable = interior.length >= 3 ? interior : room.floors;
    const center = roomCenter(room);
    const used = new Set<string>();

    switch (room.tag) {
      case "entry": {
        room.spawnPoints.push({ x: center.x, y: center.y, type: "player" });
        used.add(`${center.x},${center.y}`);
        const itemSpots = pickSpawnPositions(
          usable,
          randInt(1, 2, rng),
          rng,
          used,
        );
        for (const s of itemSpots)
          room.spawnPoints.push({ ...s, type: "item" });
        break;
      }
      case "combat": {
        const minEnemies =
          room.intensity < 0.3 ? 1 : room.intensity < 0.6 ? 1 : 2;
        const maxEnemies =
          room.intensity < 0.3 ? 2 : room.intensity < 0.6 ? 3 : 3;
        const enemyCount = randInt(minEnemies, maxEnemies, rng);
        const enemySpots = pickSpawnPositions(usable, enemyCount, rng, used);
        for (const s of enemySpots) {
          room.spawnPoints.push({ ...s, type: "enemy" });
          used.add(`${s.x},${s.y}`);
        }
        const itemChance =
          room.intensity < 0.3 ? 0.6 : room.intensity < 0.6 ? 0.4 : 0.2;
        if (rng() < itemChance) {
          const itemSpots = pickSpawnPositions(usable, 1, rng, used);
          for (const s of itemSpots)
            room.spawnPoints.push({ ...s, type: "item" });
        }
        break;
      }
      case "loot": {
        const baseItems =
          room.intensity < 0.3 ? 2 : room.intensity < 0.6 ? 3 : 4;
        const itemCount = randInt(baseItems, baseItems + 1, rng);
        const itemSpots = pickSpawnPositions(usable, itemCount, rng, used);
        for (const s of itemSpots) {
          room.spawnPoints.push({ ...s, type: "item" });
          used.add(`${s.x},${s.y}`);
        }
        if (rng() < 0.3) {
          const guardSpot = pickSpawnPositions(usable, 1, rng, used);
          for (const s of guardSpot)
            room.spawnPoints.push({ ...s, type: "enemy" });
        }
        break;
      }
      case "boss": {
        room.spawnPoints.push({ x: center.x, y: center.y, type: "enemy" });
        used.add(`${center.x},${center.y}`);
        const rewardSpots = pickSpawnPositions(
          usable,
          randInt(1, 2, rng),
          rng,
          used,
        );
        for (const s of rewardSpots)
          room.spawnPoints.push({ ...s, type: "item" });
        break;
      }
      case "transition":
      case "empty": {
        if (rng() < 0.3) {
          const spot = pickSpawnPositions(usable, 1, rng, used);
          for (const s of spot) room.spawnPoints.push({ ...s, type: "item" });
        }
        break;
      }
    }
  }
}

export function generateDungeon(
  configOrRng?: Partial<DungeonConfig> | (() => number),
): DungeonResult {
  let config: DungeonConfig;
  if (typeof configOrRng === "function") {
    config = { ...DEFAULT_CONFIG, rng: configOrRng };
  } else {
    config = { ...DEFAULT_CONFIG, ...configOrRng };
  }

  const { width, height, roomCount, rng } = config;
  const map = new GameMap(width, height, WALL_TILE);
  const rooms: Room[] = [];
  const maxAttempts = roomCount * 50;

  let attempts = 0;
  while (rooms.length < roomCount && attempts < maxAttempts) {
    attempts++;
    const category = pickSizeCategory(rng);
    const { w, h } = rollDimensions(category, rng);
    const x = randInt(1, width - w - 1, rng);
    const y = randInt(1, height - h - 1, rng);

    const candidate: Room = {
      x,
      y,
      width: w,
      height: h,
      floors: [],
      tag: "empty",
      spawnPoints: [],
      depth: 0,
      intensity: 0,
      zoneIndex: -1,
    };

    if (rooms.some((r) => roomsOverlap(r, candidate, 1))) continue;

    const shape = pickRoomShape(rng);
    candidate.floors = generateRoomFloors(x, y, w, h, shape, rng);
    rooms.push(candidate);
    carveRoom(map, candidate);
  }

  for (let i = 0; i < rooms.length - 1; i++) {
    const a = roomCenter(rooms[i]!);
    const b = roomCenter(rooms[i + 1]!);
    const style = pickCorridorStyle(rng);
    carveCorridor(map, a.x, a.y, b.x, b.y, style, rng);
  }

  addDeadEnds(map, rooms, config);
  ensureConnectivity(map, rooms, rng);

  const graph = buildRoomGraph(rooms, map);
  assignRoomTags(rooms, graph, rng);

  // Rebuild critical path after boss tag assignment
  const bossIdx = rooms.findIndex((r) => r.tag === "boss");
  if (bossIdx > 0) {
    graph.criticalPath.length = 0;
    const path = (() => {
      const prev = new Map<number, number>();
      const visited = new Set<number>([0]);
      const queue = [0];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur === bossIdx) break;
        for (const neighbor of graph.adjacency.get(cur)!) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            prev.set(neighbor, cur);
            queue.push(neighbor);
          }
        }
      }
      const p: number[] = [];
      let c = bossIdx;
      while (c !== 0) {
        p.unshift(c);
        c = prev.get(c)!;
      }
      p.unshift(0);
      return p;
    })();
    graph.criticalPath.push(...path);
  }

  const zones = assignZones(rooms, graph);

  // Set zoneIndex on each room
  for (let zi = 0; zi < zones.length; zi++) {
    for (const ri of zones[zi]!.rooms) {
      rooms[ri]!.zoneIndex = zi;
    }
  }

  generateSpawnPoints(rooms, map, rng);
  applyZoneThemes(map, rooms, zones, rng);
  assignWallCharacters(map);
  return { map, rooms, zones, graph };
}
