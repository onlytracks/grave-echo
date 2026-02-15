import { describe, expect, test } from "bun:test";
import { GameMap, TileType, WALL_TILE, FLOOR_TILE } from "../game-map.ts";
import { buildTestRoom } from "../room-builder.ts";

describe("GameMap", () => {
  test("isInBounds returns true for valid coords", () => {
    const map = new GameMap(10, 10);
    expect(map.isInBounds(0, 0)).toBe(true);
    expect(map.isInBounds(9, 9)).toBe(true);
    expect(map.isInBounds(5, 5)).toBe(true);
  });

  test("isInBounds returns false for invalid coords", () => {
    const map = new GameMap(10, 10);
    expect(map.isInBounds(-1, 0)).toBe(false);
    expect(map.isInBounds(0, -1)).toBe(false);
    expect(map.isInBounds(10, 0)).toBe(false);
    expect(map.isInBounds(0, 10)).toBe(false);
  });

  test("isWalkable returns true for floor, false for wall", () => {
    const map = new GameMap(5, 5, FLOOR_TILE);
    expect(map.isWalkable(2, 2)).toBe(true);
    map.setTile(2, 2, { ...WALL_TILE });
    expect(map.isWalkable(2, 2)).toBe(false);
  });

  test("getTile returns undefined for out-of-bounds", () => {
    const map = new GameMap(5, 5);
    expect(map.getTile(-1, 0)).toBeUndefined();
    expect(map.getTile(5, 0)).toBeUndefined();
  });
});

describe("buildTestRoom", () => {
  test("has walls on all borders", () => {
    const map = buildTestRoom();
    for (let x = 0; x < map.width; x++) {
      expect(map.getTile(x, 0)?.type).toBe(TileType.Wall);
      expect(map.getTile(x, map.height - 1)?.type).toBe(TileType.Wall);
    }
    for (let y = 0; y < map.height; y++) {
      expect(map.getTile(0, y)?.type).toBe(TileType.Wall);
      expect(map.getTile(map.width - 1, y)?.type).toBe(TileType.Wall);
    }
  });

  test("has walkable interior", () => {
    const map = buildTestRoom();
    expect(map.isWalkable(1, 1)).toBe(true);
    expect(map.isWalkable(10, 10)).toBe(true);
  });

  test("is 20x15", () => {
    const map = buildTestRoom();
    expect(map.width).toBe(20);
    expect(map.height).toBe(15);
  });
});
