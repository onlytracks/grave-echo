import { describe, expect, test } from "bun:test";
import { generateDungeon } from "../dungeon-generator.ts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("Dungeon Generator", () => {
  const rng = seededRng(42);
  const { map, rooms } = generateDungeon(rng);

  test("map has correct dimensions", () => {
    expect(map.width).toBe(60);
    expect(map.height).toBe(40);
  });

  test("generates 5 rooms", () => {
    expect(rooms.length).toBe(5);
  });

  test("all room centers are walkable", () => {
    for (const room of rooms) {
      const cx = Math.floor(room.x + room.width / 2);
      const cy = Math.floor(room.y + room.height / 2);
      expect(map.isWalkable(cx, cy)).toBe(true);
    }
  });

  test("rooms have floor tiles", () => {
    for (const room of rooms) {
      for (let y = room.y; y < room.y + room.height; y++) {
        for (let x = room.x; x < room.x + room.width; x++) {
          expect(map.isWalkable(x, y)).toBe(true);
        }
      }
    }
  });

  test("rooms do not overlap (with 1 tile gap)", () => {
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i]!;
        const b = rooms[j]!;
        const overlaps = !(
          a.x + a.width + 1 <= b.x ||
          b.x + b.width + 1 <= a.x ||
          a.y + a.height + 1 <= b.y ||
          b.y + b.height + 1 <= a.y
        );
        expect(overlaps).toBe(false);
      }
    }
  });

  test("all rooms are connected via flood fill", () => {
    const centers = rooms.map((r) => ({
      x: Math.floor(r.x + r.width / 2),
      y: Math.floor(r.y + r.height / 2),
    }));

    const visited = new Set<string>();
    const queue = [centers[0]!];
    visited.add(`${centers[0]!.x},${centers[0]!.y}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const nx = x + dx!;
        const ny = y + dy!;
        const key = `${nx},${ny}`;
        if (!visited.has(key) && map.isWalkable(nx, ny)) {
          visited.add(key);
          queue.push({ x: nx, y: ny });
        }
      }
    }

    for (const center of centers) {
      expect(visited.has(`${center.x},${center.y}`)).toBe(true);
    }
  });

  test("map border is all walls", () => {
    for (let x = 0; x < map.width; x++) {
      expect(map.isWalkable(x, 0)).toBe(false);
      expect(map.isWalkable(x, map.height - 1)).toBe(false);
    }
    for (let y = 0; y < map.height; y++) {
      expect(map.isWalkable(0, y)).toBe(false);
      expect(map.isWalkable(map.width - 1, y)).toBe(false);
    }
  });

  test("deterministic with same seed", () => {
    const r1 = generateDungeon(seededRng(99));
    const r2 = generateDungeon(seededRng(99));
    expect(r1.rooms).toEqual(r2.rooms);
  });
});
