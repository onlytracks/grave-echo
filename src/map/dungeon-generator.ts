import { GameMap, FLOOR_TILE, WALL_TILE } from "./game-map.ts";

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DungeonResult {
  map: GameMap;
  rooms: Room[];
}

function roomCenter(room: Room): { x: number; y: number } {
  return {
    x: Math.floor(room.x + room.width / 2),
    y: Math.floor(room.y + room.height / 2),
  };
}

function roomsOverlap(a: Room, b: Room, gap: number): boolean {
  return !(
    a.x + a.width + gap <= b.x ||
    b.x + b.width + gap <= a.x ||
    a.y + a.height + gap <= b.y ||
    b.y + b.height + gap <= a.y
  );
}

function carveRoom(map: GameMap, room: Room): void {
  for (let y = room.y; y < room.y + room.height; y++) {
    for (let x = room.x; x < room.x + room.width; x++) {
      map.setTile(x, y, { ...FLOOR_TILE });
    }
  }
}

function carveCorridor(
  map: GameMap,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  horizontalFirst: boolean,
): void {
  if (horizontalFirst) {
    const stepX = x1 < x2 ? 1 : -1;
    for (let x = x1; x !== x2 + stepX; x += stepX) {
      map.setTile(x, y1, { ...FLOOR_TILE });
    }
    const stepY = y1 < y2 ? 1 : -1;
    for (let y = y1; y !== y2 + stepY; y += stepY) {
      map.setTile(x2, y, { ...FLOOR_TILE });
    }
  } else {
    const stepY = y1 < y2 ? 1 : -1;
    for (let y = y1; y !== y2 + stepY; y += stepY) {
      map.setTile(x1, y, { ...FLOOR_TILE });
    }
    const stepX = x1 < x2 ? 1 : -1;
    for (let x = x1; x !== x2 + stepX; x += stepX) {
      map.setTile(x, y2, { ...FLOOR_TILE });
    }
  }
}

function randInt(min: number, max: number, rng: () => number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function generateDungeon(
  rng: () => number = Math.random,
): DungeonResult {
  const mapW = 60;
  const mapH = 40;
  const map = new GameMap(mapW, mapH, WALL_TILE);
  const rooms: Room[] = [];
  const targetRooms = 5;
  const maxAttempts = 200;

  let attempts = 0;
  while (rooms.length < targetRooms && attempts < maxAttempts) {
    attempts++;
    const w = randInt(5, 10, rng);
    const h = randInt(5, 8, rng);
    const x = randInt(1, mapW - w - 1, rng);
    const y = randInt(1, mapH - h - 1, rng);
    const candidate: Room = { x, y, width: w, height: h };

    if (rooms.some((r) => roomsOverlap(r, candidate, 1))) continue;

    rooms.push(candidate);
    carveRoom(map, candidate);
  }

  for (let i = 0; i < rooms.length - 1; i++) {
    const a = roomCenter(rooms[i]!);
    const b = roomCenter(rooms[i + 1]!);
    carveCorridor(map, a.x, a.y, b.x, b.y, rng() < 0.5);
  }

  return { map, rooms };
}
