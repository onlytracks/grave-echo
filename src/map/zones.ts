import type { Room } from "./dungeon-generator.ts";
import type { RoomGraph } from "./room-graph.ts";
import type { GameMap } from "./game-map.ts";
import { TileType } from "./game-map.ts";
import {
  makeForestFloor,
  makeForestWall,
  makeDungeonFloor,
  makeDungeonWall,
  makeBossFloor,
  makeBossWall,
} from "./tile-utils.ts";

export type ZoneType = "overworld" | "dungeon";

export interface Zone {
  type: ZoneType;
  name: string;
  rooms: number[];
  intensity: number;
  hasBoss: boolean;
}

const OVERWORLD_NAMES = [
  "Corrupted Forest",
  "Deeper Forest",
  "The Threshold's Edge",
];

const DUNGEON_NAMES = ["The Hollow Warren", "The Sunken Shrine"];

const BOSS_NAME = "The Warden's Gate";

export function assignZones(rooms: Room[], graph: RoomGraph): Zone[] {
  if (rooms.length === 0) return [];

  const critPath = graph.criticalPath;
  if (critPath.length === 0) return [makeSingleZone(rooms)];

  const maxDepth = Math.max(...rooms.map((r) => r.depth));
  if (maxDepth === 0) return [makeSingleZone(rooms)];

  const bossIdx = rooms.findIndex((r) => r.tag === "boss");
  const critSet = new Set(critPath);

  const zoneSpecs: {
    type: ZoneType;
    depthMin: number;
    depthMax: number;
    hasBoss: boolean;
  }[] = [];
  const depthSlice = maxDepth / 5;

  zoneSpecs.push({
    type: "overworld",
    depthMin: 0,
    depthMax: depthSlice,
    hasBoss: false,
  });
  zoneSpecs.push({
    type: "dungeon",
    depthMin: depthSlice,
    depthMax: depthSlice * 2,
    hasBoss: false,
  });
  zoneSpecs.push({
    type: "overworld",
    depthMin: depthSlice * 2,
    depthMax: depthSlice * 3,
    hasBoss: false,
  });
  zoneSpecs.push({
    type: "dungeon",
    depthMin: depthSlice * 3,
    depthMax: depthSlice * 4,
    hasBoss: false,
  });
  zoneSpecs.push({
    type: "dungeon",
    depthMin: depthSlice * 4,
    depthMax: maxDepth + 1,
    hasBoss: true,
  });

  const roomZone = new Map<number, number>();
  const zones: Zone[] = zoneSpecs.map((spec, i) => ({
    type: spec.type,
    name: getName(spec.type, spec.hasBoss, i),
    rooms: [],
    intensity: (i + 1) / zoneSpecs.length,
    hasBoss: spec.hasBoss,
  }));

  // Boss room always goes to boss zone
  if (bossIdx >= 0) {
    roomZone.set(bossIdx, 4);
    zones[4]!.rooms.push(bossIdx);
  }

  // Assign rooms by depth
  for (let ri = 0; ri < rooms.length; ri++) {
    if (roomZone.has(ri)) continue;
    const depth = rooms[ri]!.depth;

    let bestZone = 0;
    for (let zi = 0; zi < zoneSpecs.length; zi++) {
      const spec = zoneSpecs[zi]!;
      if (depth >= spec.depthMin && depth < spec.depthMax) {
        bestZone = zi;
        break;
      }
      if (zi === zoneSpecs.length - 1) bestZone = zi;
    }

    roomZone.set(ri, bestZone);
    zones[bestZone]!.rooms.push(ri);
  }

  // Remove empty zones
  const nonEmpty = zones.filter((z) => z.rooms.length > 0);

  // Recalculate intensities for non-empty zones
  for (let i = 0; i < nonEmpty.length; i++) {
    nonEmpty[i]!.intensity = (i + 1) / nonEmpty.length;
  }

  return nonEmpty;
}

function getName(type: ZoneType, hasBoss: boolean, index: number): string {
  if (hasBoss) return BOSS_NAME;
  if (type === "overworld") {
    const owIdx = Math.floor(index / 2);
    return (
      OVERWORLD_NAMES[owIdx] ?? OVERWORLD_NAMES[OVERWORLD_NAMES.length - 1]!
    );
  }
  const dIdx = Math.floor((index - 1) / 2);
  return DUNGEON_NAMES[dIdx] ?? DUNGEON_NAMES[DUNGEON_NAMES.length - 1]!;
}

function makeSingleZone(rooms: Room[]): Zone {
  return {
    type: "overworld",
    name: OVERWORLD_NAMES[0]!,
    rooms: rooms.map((_, i) => i),
    intensity: 0.5,
    hasBoss: rooms.some((r) => r.tag === "boss"),
  };
}

export function applyZoneThemes(
  map: GameMap,
  rooms: Room[],
  zones: Zone[],
  rng: () => number,
): void {
  // Build room-to-zone lookup
  const roomToZone = new Map<number, Zone>();
  for (const zone of zones) {
    for (const ri of zone.rooms) {
      roomToZone.set(ri, zone);
    }
  }

  // Build floor coord to room index lookup for themed corridors
  const floorToRoom = new Map<string, number>();
  for (let ri = 0; ri < rooms.length; ri++) {
    for (const f of rooms[ri]!.floors) {
      floorToRoom.set(`${f.x},${f.y}`, ri);
    }
  }

  // Theme room tiles
  for (let ri = 0; ri < rooms.length; ri++) {
    const zone = roomToZone.get(ri);
    if (!zone) continue;

    const room = rooms[ri]!;
    for (const f of room.floors) {
      const themed = getThemedFloor(zone, rng);
      map.setTile(f.x, f.y, themed);
    }

    // Theme walls surrounding this room
    for (const f of room.floors) {
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ] as const) {
        const wx = f.x + dx;
        const wy = f.y + dy;
        const tile = map.getTile(wx, wy);
        if (tile && tile.type === TileType.Wall) {
          const themed = getThemedWall(zone, rng);
          map.setTile(wx, wy, themed);
        }
      }
    }
  }

  // Theme corridor tiles (floors not in any room)
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      if (!tile || !tile.walkable) continue;
      if (floorToRoom.has(`${x},${y}`)) continue;

      // Find nearest room to determine zone
      const zone = findNearestZone(x, y, rooms, roomToZone);
      if (zone) {
        const themed = getThemedFloor(zone, rng);
        map.setTile(x, y, themed);
      }
    }
  }

  // Theme corridor walls
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y);
      if (!tile || tile.type !== TileType.Wall) continue;

      // Check if adjacent to a themed floor
      let nearestZone: Zone | undefined;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const adj = map.getTile(nx, ny);
        if (adj && adj.walkable) {
          const ri = floorToRoom.get(`${nx},${ny}`);
          if (ri !== undefined) {
            nearestZone = roomToZone.get(ri);
            break;
          }
        }
      }
      if (nearestZone) {
        const themed = getThemedWall(nearestZone, rng);
        map.setTile(x, y, themed);
      }
    }
  }
}

function getThemedFloor(zone: Zone, rng: () => number) {
  if (zone.hasBoss) return makeBossFloor(rng);
  if (zone.type === "overworld") return makeForestFloor(rng);
  return makeDungeonFloor(rng);
}

function getThemedWall(zone: Zone, rng: () => number) {
  if (zone.hasBoss) return makeBossWall(rng);
  if (zone.type === "overworld") return makeForestWall(rng, zone.intensity);
  return makeDungeonWall(rng);
}

function findNearestZone(
  x: number,
  y: number,
  rooms: Room[],
  roomToZone: Map<number, Zone>,
): Zone | undefined {
  let bestDist = Infinity;
  let bestZone: Zone | undefined;

  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri]!;
    const cx = room.x + room.width / 2;
    const cy = room.y + room.height / 2;
    const dist = (x - cx) ** 2 + (y - cy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      bestZone = roomToZone.get(ri);
    }
  }

  return bestZone;
}

export function getZoneForRoom(
  roomIndex: number,
  zones: Zone[],
): Zone | undefined {
  for (const zone of zones) {
    if (zone.rooms.includes(roomIndex)) return zone;
  }
  return undefined;
}
