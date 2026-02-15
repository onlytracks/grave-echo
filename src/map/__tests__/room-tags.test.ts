import { describe, expect, test } from "bun:test";
import {
  generateDungeon,
  assignRoomTags,
  generateSpawnPoints,
  type Room,
} from "../dungeon-generator.ts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("Room Tags", () => {
  const rng = seededRng(42);
  const { map, rooms } = generateDungeon({ rng: seededRng(42) });

  test("room 0 is always 'entry'", () => {
    expect(rooms[0]!.tag).toBe("entry");
  });

  test("every room has a tag", () => {
    for (const room of rooms) {
      expect(room.tag).toBeTruthy();
      expect(
        ["entry", "combat", "loot", "boss", "transition", "empty"].includes(
          room.tag,
        ),
      ).toBe(true);
    }
  });

  test("exactly one boss room exists", () => {
    const bossRooms = rooms.filter((r) => r.tag === "boss");
    expect(bossRooms.length).toBe(1);
  });

  test("boss room is not room 0", () => {
    expect(rooms[0]!.tag).not.toBe("boss");
  });

  test("deterministic with same seed", () => {
    const r1 = generateDungeon({ rng: seededRng(99) });
    const r2 = generateDungeon({ rng: seededRng(99) });
    expect(r1.rooms.map((r) => r.tag)).toEqual(r2.rooms.map((r) => r.tag));
  });

  test("works with various seeds", () => {
    for (const seed of [1, 7, 42, 99, 123, 456, 789]) {
      const { rooms: r } = generateDungeon({ rng: seededRng(seed) });
      expect(r[0]!.tag).toBe("entry");
      expect(r.filter((rm) => rm.tag === "boss").length).toBe(1);
      for (const room of r) {
        expect(room.tag).toBeTruthy();
      }
    }
  });
});

describe("Spawn Points", () => {
  test("entry room has a player spawn", () => {
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    const entry = rooms[0]!;
    const playerSpawns = entry.spawnPoints.filter((sp) => sp.type === "player");
    expect(playerSpawns.length).toBe(1);
  });

  test("no player spawns outside entry room", () => {
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    for (let i = 1; i < rooms.length; i++) {
      const playerSpawns = rooms[i]!.spawnPoints.filter(
        (sp) => sp.type === "player",
      );
      expect(playerSpawns.length).toBe(0);
    }
  });

  test("spawn points are on walkable floor tiles", () => {
    const { map, rooms } = generateDungeon({ rng: seededRng(42) });
    for (const room of rooms) {
      for (const sp of room.spawnPoints) {
        expect(map.isWalkable(sp.x, sp.y)).toBe(true);
        const isFloor = room.floors.some((f) => f.x === sp.x && f.y === sp.y);
        expect(isFloor).toBe(true);
      }
    }
  });

  test("combat rooms have enemy spawns", () => {
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    const combatRooms = rooms.filter((r) => r.tag === "combat");
    for (const room of combatRooms) {
      const enemies = room.spawnPoints.filter((sp) => sp.type === "enemy");
      expect(enemies.length).toBeGreaterThanOrEqual(1);
    }
  });

  test("boss room has enemy spawn", () => {
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    const bossRoom = rooms.find((r) => r.tag === "boss")!;
    const enemies = bossRoom.spawnPoints.filter((sp) => sp.type === "enemy");
    expect(enemies.length).toBeGreaterThanOrEqual(1);
  });

  test("entry room has no enemy spawns", () => {
    for (const seed of [1, 42, 99, 123]) {
      const { rooms } = generateDungeon({ rng: seededRng(seed) });
      const entry = rooms[0]!;
      const enemies = entry.spawnPoints.filter((sp) => sp.type === "enemy");
      expect(enemies.length).toBe(0);
    }
  });

  test("loot rooms have item spawns", () => {
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    const lootRooms = rooms.filter((r) => r.tag === "loot");
    for (const room of lootRooms) {
      const items = room.spawnPoints.filter((sp) => sp.type === "item");
      expect(items.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("spawn points consistent with same seed", () => {
    const r1 = generateDungeon({ rng: seededRng(42) });
    const r2 = generateDungeon({ rng: seededRng(42) });
    for (let i = 0; i < r1.rooms.length; i++) {
      expect(r1.rooms[i]!.spawnPoints).toEqual(r2.rooms[i]!.spawnPoints);
    }
  });
});
