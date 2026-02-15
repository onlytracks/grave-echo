import { describe, expect, test } from "bun:test";
import { World } from "../../ecs/world.ts";
import { generateDungeon } from "../dungeon-generator.ts";
import { populateRooms } from "../room-populator.ts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

describe("Room Populator", () => {
  test("creates player entity", () => {
    const world = new World();
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    const { player } = populateRooms(
      world,
      rooms,
      { difficulty: 1 },
      undefined,
      seededRng(42),
    );
    expect(player).toBeGreaterThanOrEqual(0);
    expect(world.getComponent(player, "PlayerControlled")).toBeTruthy();
    expect(world.getComponent(player, "Position")).toBeTruthy();
  });

  test("player is placed in entry room", () => {
    const world = new World();
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    const entry = rooms[0]!;
    const { player } = populateRooms(
      world,
      rooms,
      { difficulty: 1 },
      undefined,
      seededRng(42),
    );
    const pos = world.getComponent(player, "Position")!;
    const inEntry = entry.floors.some((f) => f.x === pos.x && f.y === pos.y);
    expect(inEntry).toBe(true);
  });

  test("creates enemies in combat rooms", () => {
    const world = new World();
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    populateRooms(world, rooms, { difficulty: 1 }, undefined, seededRng(42));

    const enemies = world.query("AIControlled");
    expect(enemies.length).toBeGreaterThan(0);
  });

  test("no enemies in entry room", () => {
    const world = new World();
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    populateRooms(world, rooms, { difficulty: 1 }, undefined, seededRng(42));

    const entry = rooms[0]!;
    const enemies = world.query("AIControlled");
    for (const e of enemies) {
      const pos = world.getComponent(e, "Position")!;
      const inEntry = entry.floors.some((f) => f.x === pos.x && f.y === pos.y);
      expect(inEntry).toBe(false);
    }
  });

  test("creates items", () => {
    const world = new World();
    const { rooms } = generateDungeon({ rng: seededRng(42) });
    populateRooms(world, rooms, { difficulty: 1 }, undefined, seededRng(42));

    const items = world.query("Item");
    expect(items.length).toBeGreaterThan(0);
  });

  test("difficulty scales enemy stats", () => {
    const worldLow = new World();
    const worldHigh = new World();
    const { rooms: r1 } = generateDungeon({ rng: seededRng(42) });
    const { rooms: r2 } = generateDungeon({ rng: seededRng(42) });

    populateRooms(worldLow, r1, { difficulty: 1 }, undefined, seededRng(42));
    populateRooms(worldHigh, r2, { difficulty: 5 }, undefined, seededRng(42));

    const lowEnemies = worldLow.query("AIControlled");
    const highEnemies = worldHigh.query("AIControlled");

    if (lowEnemies.length > 0 && highEnemies.length > 0) {
      const lowHp = worldLow.getComponent(lowEnemies[0]!, "Health")!;
      const highHp = worldHigh.getComponent(highEnemies[0]!, "Health")!;
      expect(highHp.max).toBeGreaterThan(lowHp.max);
    }
  });
});
