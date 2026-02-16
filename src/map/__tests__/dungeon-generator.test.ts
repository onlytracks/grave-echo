import { describe, expect, test } from "bun:test";
import { generateDungeon, roomCenter } from "../dungeon-generator.ts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("Dungeon Generator", () => {
  describe("default config (150×100)", () => {
    const rng = seededRng(42);
    const { map, rooms } = generateDungeon(rng);

    test("map has correct dimensions", () => {
      expect(map.width).toBe(150);
      expect(map.height).toBe(100);
    });

    test("generates target room count", () => {
      expect(rooms.length).toBeGreaterThanOrEqual(5);
      expect(rooms.length).toBeLessThanOrEqual(20);
    });

    test("all room centers are walkable", () => {
      for (const room of rooms) {
        const c = roomCenter(room);
        expect(map.isWalkable(c.x, c.y)).toBe(true);
      }
    });

    test("all room floor tiles are walkable", () => {
      for (const room of rooms) {
        for (const f of room.floors) {
          expect(map.isWalkable(f.x, f.y)).toBe(true);
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
      const centers = rooms.map((r) => roomCenter(r));
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
  });

  describe("custom config", () => {
    test("accepts custom dimensions", () => {
      const { map, rooms } = generateDungeon({
        width: 60,
        height: 40,
        roomCount: 5,
        rng: seededRng(42),
      });
      expect(map.width).toBe(60);
      expect(map.height).toBe(40);
      expect(rooms.length).toBeGreaterThanOrEqual(3);
    });

    test("rooms have floors array", () => {
      const { rooms } = generateDungeon({ rng: seededRng(42) });
      for (const room of rooms) {
        expect(room.floors.length).toBeGreaterThan(0);
      }
    });

    test("room sizes vary", () => {
      const { rooms } = generateDungeon({
        roomCount: 12,
        rng: seededRng(99),
      });
      const areas = rooms.map((r) => r.width * r.height);
      const minArea = Math.min(...areas);
      const maxArea = Math.max(...areas);
      expect(maxArea).toBeGreaterThan(minArea * 1.5);
    });
  });

  test("deterministic with same seed", () => {
    const r1 = generateDungeon(seededRng(99));
    const r2 = generateDungeon(seededRng(99));
    expect(r1.rooms).toEqual(r2.rooms);
  });

  test("backward compat: rng function as sole argument", () => {
    const { map } = generateDungeon(seededRng(42));
    expect(map.width).toBe(150);
    expect(map.height).toBe(100);
  });
});
