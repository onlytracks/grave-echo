import { describe, expect, test } from "bun:test";
import { generateDungeon } from "../dungeon-generator.ts";
import { assignZones, getZoneForRoom } from "../zones.ts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("Zone System", () => {
  const rng = seededRng(42);
  const { rooms, zones, graph } = generateDungeon({ rng });

  test("zones are created", () => {
    expect(zones.length).toBeGreaterThanOrEqual(1);
  });

  test("each room belongs to exactly one zone", () => {
    const roomToZoneCount = new Map<number, number>();
    for (const zone of zones) {
      for (const ri of zone.rooms) {
        roomToZoneCount.set(ri, (roomToZoneCount.get(ri) ?? 0) + 1);
      }
    }

    for (let i = 0; i < rooms.length; i++) {
      expect(roomToZoneCount.get(i)).toBe(1);
    }
  });

  test("all rooms are assigned to a zone", () => {
    const allRoomIndices = new Set<number>();
    for (const zone of zones) {
      for (const ri of zone.rooms) {
        allRoomIndices.add(ri);
      }
    }
    for (let i = 0; i < rooms.length; i++) {
      expect(allRoomIndices.has(i)).toBe(true);
    }
  });

  test("zone intensity increases from first to last", () => {
    for (let i = 1; i < zones.length; i++) {
      expect(zones[i]!.intensity).toBeGreaterThan(zones[i - 1]!.intensity);
    }
  });

  test("boss zone contains the boss room", () => {
    const bossIdx = rooms.findIndex((r) => r.tag === "boss");
    if (bossIdx >= 0) {
      const bossZone = zones.find((z) => z.hasBoss);
      expect(bossZone).toBeTruthy();
      expect(bossZone!.rooms).toContain(bossIdx);
    }
  });

  test("zones alternate overworld and dungeon types", () => {
    if (zones.length >= 2) {
      expect(zones[0]!.type).toBe("overworld");
      expect(zones[1]!.type).toBe("dungeon");
    }
  });

  test("getZoneForRoom returns correct zone", () => {
    for (let zi = 0; zi < zones.length; zi++) {
      for (const ri of zones[zi]!.rooms) {
        const zone = getZoneForRoom(ri, zones);
        expect(zone).toBe(zones[zi]);
      }
    }
  });

  test("rooms have zoneIndex set", () => {
    for (let i = 0; i < rooms.length; i++) {
      expect(rooms[i]!.zoneIndex).toBeGreaterThanOrEqual(0);
    }
  });

  test("DungeonResult includes zones", () => {
    const result = generateDungeon({ rng: seededRng(99) });
    expect(result.zones).toBeDefined();
    expect(Array.isArray(result.zones)).toBe(true);
    expect(result.zones.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Zone assignment with various seeds", () => {
  for (const seed of [1, 42, 99, 256, 1000]) {
    test(`seed ${seed}: all rooms assigned, no overlaps`, () => {
      const { rooms, zones } = generateDungeon({ rng: seededRng(seed) });

      const assigned = new Set<number>();
      for (const zone of zones) {
        for (const ri of zone.rooms) {
          expect(assigned.has(ri)).toBe(false);
          assigned.add(ri);
        }
      }
      expect(assigned.size).toBe(rooms.length);
    });
  }
});
