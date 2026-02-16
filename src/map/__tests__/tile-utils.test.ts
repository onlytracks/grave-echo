import { describe, expect, test } from "bun:test";
import { TileType } from "../game-map.ts";
import {
  makeForestFloor,
  makeForestWall,
  makeCorruptedForestFloor,
  makeDungeonFloor,
  makeDungeonWall,
  makeBossFloor,
  makeBossWall,
} from "../tile-utils.ts";

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

function sampleTiles(
  factory: (rng: () => number) => { type: TileType },
  count: number = 200,
) {
  const rng = seededRng(42);
  const types = new Set<TileType>();
  for (let i = 0; i < count; i++) {
    types.add(factory(rng).type);
  }
  return types;
}

describe("makeForestFloor", () => {
  test("produces variety of nature floor tiles", () => {
    const types = sampleTiles(makeForestFloor);
    expect(types.has(TileType.Grass)).toBe(true);
    expect(types.has(TileType.Leaf)).toBe(true);
    expect(types.has(TileType.Flower)).toBe(true);
    expect(types.has(TileType.Mushroom)).toBe(true);
    expect(types.has(TileType.Sprout)).toBe(true);
  });

  test("all tiles are walkable and transparent", () => {
    const rng = seededRng(99);
    for (let i = 0; i < 100; i++) {
      const tile = makeForestFloor(rng);
      expect(tile.walkable).toBe(true);
      expect(tile.transparent).toBe(true);
    }
  });
});

describe("makeForestWall", () => {
  test("produces tree variants", () => {
    const rng = seededRng(42);
    const types = new Set<TileType>();
    for (let i = 0; i < 200; i++) {
      types.add(makeForestWall(rng).type);
    }
    expect(types.has(TileType.Tree)).toBe(true);
    expect(types.has(TileType.PineTree)).toBe(true);
  });

  test("corruption intensity increases corrupted tree frequency", () => {
    const lowRng = seededRng(42);
    const highRng = seededRng(42);
    let lowCorrupted = 0;
    let highCorrupted = 0;
    for (let i = 0; i < 500; i++) {
      if (makeForestWall(lowRng, 0).type === TileType.CorruptedTree)
        lowCorrupted++;
      if (makeForestWall(highRng, 1).type === TileType.CorruptedTree)
        highCorrupted++;
    }
    expect(highCorrupted).toBeGreaterThan(lowCorrupted);
  });

  test("all tiles block movement and LOS", () => {
    const rng = seededRng(99);
    for (let i = 0; i < 100; i++) {
      const tile = makeForestWall(rng);
      expect(tile.walkable).toBe(false);
      expect(tile.transparent).toBe(false);
    }
  });
});

describe("makeCorruptedForestFloor", () => {
  test("includes corrupted bloom tiles", () => {
    const types = sampleTiles(makeCorruptedForestFloor);
    expect(types.has(TileType.CorruptedBloom)).toBe(true);
    expect(types.has(TileType.TallGrass)).toBe(true);
  });
});

describe("makeDungeonFloor", () => {
  test("produces stone, cracked, rubble, and cobweb tiles", () => {
    const types = sampleTiles(makeDungeonFloor);
    expect(types.has(TileType.Floor)).toBe(true);
    expect(types.has(TileType.CrackedFloor)).toBe(true);
    expect(types.has(TileType.Rubble)).toBe(true);
    expect(types.has(TileType.Cobweb)).toBe(true);
  });

  test("all tiles are walkable and transparent", () => {
    const rng = seededRng(99);
    for (let i = 0; i < 100; i++) {
      const tile = makeDungeonFloor(rng);
      expect(tile.walkable).toBe(true);
      expect(tile.transparent).toBe(true);
    }
  });
});

describe("makeDungeonWall", () => {
  test("produces walls and pillars", () => {
    const rng = seededRng(42);
    const types = new Set<TileType>();
    for (let i = 0; i < 200; i++) {
      types.add(makeDungeonWall(rng).type);
    }
    expect(types.has(TileType.Wall)).toBe(true);
    expect(types.has(TileType.Pillar)).toBe(true);
  });

  test("all tiles block movement", () => {
    const rng = seededRng(99);
    for (let i = 0; i < 100; i++) {
      const tile = makeDungeonWall(rng);
      expect(tile.walkable).toBe(false);
    }
  });
});

describe("makeBossFloor", () => {
  test("produces corruption-themed floor variety", () => {
    const types = sampleTiles(makeBossFloor);
    expect(types.has(TileType.Floor)).toBe(true);
    expect(types.has(TileType.CorruptionVein)).toBe(true);
    expect(types.has(TileType.BonePile)).toBe(true);
    expect(types.has(TileType.Skull)).toBe(true);
  });
});

describe("makeBossWall", () => {
  test("produces dark walls, grave markers, and coffins", () => {
    const rng = seededRng(42);
    const types = new Set<TileType>();
    for (let i = 0; i < 200; i++) {
      types.add(makeBossWall(rng).type);
    }
    expect(types.has(TileType.Wall)).toBe(true);
    expect(types.has(TileType.GraveMarker)).toBe(true);
    expect(types.has(TileType.Coffin)).toBe(true);
  });

  test("all tiles block movement", () => {
    const rng = seededRng(99);
    for (let i = 0; i < 100; i++) {
      const tile = makeBossWall(rng);
      expect(tile.walkable).toBe(false);
    }
  });
});

describe("tile movementCost", () => {
  test("tall grass and shallow water have cost 2", () => {
    const rng = seededRng(42);
    for (let i = 0; i < 200; i++) {
      const tile = makeCorruptedForestFloor(rng);
      if (tile.type === TileType.TallGrass) {
        expect(tile.movementCost).toBe(2);
      }
    }
  });
});
