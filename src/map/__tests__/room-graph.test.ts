import { describe, expect, test } from "bun:test";
import { generateDungeon } from "../dungeon-generator.ts";
import { buildRoomGraph, roomIntensity } from "../room-graph.ts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("Room Graph", () => {
  const { map, rooms, graph } = generateDungeon({ rng: seededRng(42) });

  test("graph has edges", () => {
    expect(graph.edges.length).toBeGreaterThan(0);
  });

  test("edges are pairs of valid room indices", () => {
    for (const [a, b] of graph.edges) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(rooms.length);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(rooms.length);
      expect(a).not.toBe(b);
    }
  });

  test("getNeighbors returns connected rooms", () => {
    const neighbors = graph.getNeighbors(0);
    expect(neighbors.length).toBeGreaterThan(0);
    for (const n of neighbors) {
      expect(graph.getNeighbors(n)).toContain(0);
    }
  });

  test("getDistance returns correct hop count", () => {
    expect(graph.getDistance(0, 0)).toBe(0);
    const neighbors = graph.getNeighbors(0);
    for (const n of neighbors) {
      expect(graph.getDistance(0, n)).toBe(1);
    }
  });

  test("all rooms are reachable from entry", () => {
    for (let i = 0; i < rooms.length; i++) {
      expect(graph.getDistance(0, i)).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("BFS Depth", () => {
  test("entry room has depth 0", () => {
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    expect(rooms[0]!.depth).toBe(0);
  });

  test("adjacent rooms have depth 1", () => {
    const { rooms, graph } = generateDungeon({ rng: seededRng(42) });
    const neighbors = graph.getNeighbors(0);
    for (const n of neighbors) {
      expect(rooms[n]!.depth).toBe(1);
    }
  });

  test("depth increases monotonically along shortest path", () => {
    const { rooms, graph } = generateDungeon({ rng: seededRng(42) });
    for (const [a, b] of graph.edges) {
      expect(Math.abs(rooms[a]!.depth - rooms[b]!.depth)).toBeLessThanOrEqual(
        1,
      );
    }
  });

  test("works across multiple seeds", () => {
    for (const seed of [1, 7, 42, 99, 123]) {
      const { rooms } = generateDungeon({ rng: seededRng(seed) });
      expect(rooms[0]!.depth).toBe(0);
      const maxDepth = Math.max(...rooms.map((r) => r.depth));
      expect(maxDepth).toBeGreaterThan(0);
    }
  });
});

describe("Intensity Curve", () => {
  test("intensity is 0 at depth 0", () => {
    expect(roomIntensity(0, 5)).toBe(0);
  });

  test("intensity is 1 at max depth", () => {
    expect(roomIntensity(5, 5)).toBe(1);
  });

  test("intensity increases with depth", () => {
    for (let d = 0; d < 10; d++) {
      expect(roomIntensity(d, 10)).toBeLessThanOrEqual(
        roomIntensity(d + 1, 10),
      );
    }
  });

  test("intensity is 0 when maxDepth is 0", () => {
    expect(roomIntensity(0, 0)).toBe(0);
  });

  test("rooms have intensity matching their depth", () => {
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    const maxDepth = Math.max(...rooms.map((r) => r.depth));
    for (const room of rooms) {
      expect(room.intensity).toBeCloseTo(
        roomIntensity(room.depth, maxDepth),
        5,
      );
    }
  });
});

describe("Boss Room", () => {
  test("boss room is at or near max depth", () => {
    for (const seed of [1, 7, 42, 99, 123]) {
      const { rooms } = generateDungeon({ rng: seededRng(seed) });
      const boss = rooms.find((r) => r.tag === "boss")!;
      const maxDepth = Math.max(...rooms.map((r) => r.depth));
      expect(boss.depth).toBeGreaterThanOrEqual(maxDepth - 1);
    }
  });
});

describe("Critical Path", () => {
  test("critical path starts at entry (room 0)", () => {
    const { graph } = generateDungeon({ rng: seededRng(42) });
    expect(graph.criticalPath[0]).toBe(0);
  });

  test("critical path ends at boss room", () => {
    const { rooms, graph } = generateDungeon({ rng: seededRng(42) });
    const lastIdx = graph.criticalPath[graph.criticalPath.length - 1]!;
    expect(rooms[lastIdx]!.tag).toBe("boss");
  });

  test("critical path rooms are connected", () => {
    const { graph } = generateDungeon({ rng: seededRng(42) });
    for (let i = 0; i < graph.criticalPath.length - 1; i++) {
      const from = graph.criticalPath[i]!;
      const to = graph.criticalPath[i + 1]!;
      expect(graph.getNeighbors(from)).toContain(to);
    }
  });

  test("critical path rooms are never empty", () => {
    for (const seed of [1, 7, 42, 99, 123]) {
      const { rooms, graph } = generateDungeon({ rng: seededRng(seed) });
      for (const idx of graph.criticalPath) {
        expect(rooms[idx]!.tag).not.toBe("empty");
      }
    }
  });

  test("works across multiple seeds", () => {
    for (const seed of [1, 7, 42, 99, 123, 456, 789]) {
      const { rooms, graph } = generateDungeon({ rng: seededRng(seed) });
      expect(graph.criticalPath.length).toBeGreaterThanOrEqual(2);
      expect(graph.criticalPath[0]).toBe(0);
      const lastIdx = graph.criticalPath[graph.criticalPath.length - 1]!;
      expect(rooms[lastIdx]!.tag).toBe("boss");
    }
  });
});

describe("Intensity-driven population", () => {
  test("deep combat rooms have more enemy spawns than shallow ones", () => {
    let deepEnemies = 0;
    let shallowEnemies = 0;
    let deepRooms = 0;
    let shallowRooms = 0;

    for (const seed of [1, 7, 42, 99, 123, 456, 789, 1000, 2000, 3000]) {
      const { rooms } = generateDungeon({ rng: seededRng(seed) });
      for (const room of rooms) {
        if (room.tag !== "combat") continue;
        const enemies = room.spawnPoints.filter(
          (sp) => sp.type === "enemy",
        ).length;
        if (room.intensity < 0.3) {
          shallowEnemies += enemies;
          shallowRooms++;
        } else if (room.intensity > 0.6) {
          deepEnemies += enemies;
          deepRooms++;
        }
      }
    }

    if (shallowRooms > 0 && deepRooms > 0) {
      const avgShallow = shallowEnemies / shallowRooms;
      const avgDeep = deepEnemies / deepRooms;
      expect(avgDeep).toBeGreaterThanOrEqual(avgShallow);
    }
  });
});
