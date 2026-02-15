import { describe, expect, test } from "bun:test";
import { findRetreatPath, findPathToNearest } from "../helpers.ts";

function makeGridPassable(
  width: number,
  height: number,
  walls: Set<string> = new Set(),
): (x: number, y: number) => boolean {
  return (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return !walls.has(`${x},${y}`);
  };
}

describe("findRetreatPath", () => {
  test("moves away from threat", () => {
    const isPassable = makeGridPassable(20, 20);
    const path = findRetreatPath(5, 5, 3, 5, 3, isPassable);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(0);
    const dest = path![path!.length - 1]!;
    const startDist = Math.abs(5 - 3) + Math.abs(5 - 5);
    const endDist = Math.abs(dest.x - 3) + Math.abs(dest.y - 5);
    expect(endDist).toBeGreaterThan(startDist);
  });

  test("returns null when completely surrounded", () => {
    const walls = new Set(["4,5", "6,5", "5,4", "5,6"]);
    const isPassable = makeGridPassable(10, 10, walls);
    const path = findRetreatPath(5, 5, 3, 5, 3, isPassable);
    expect(path).toBeNull();
  });
});

describe("findPathToNearest", () => {
  test("finds shortest path to nearest candidate", () => {
    const isPassable = makeGridPassable(20, 20);
    const candidates = [
      { x: 10, y: 10 },
      { x: 2, y: 0 },
      { x: 15, y: 15 },
    ];
    const path = findPathToNearest(0, 0, candidates, isPassable);
    expect(path).not.toBeNull();
    expect(path![path!.length - 1]).toEqual({ x: 2, y: 0 });
  });

  test("returns null when no candidates reachable", () => {
    const walls = new Set(["1,0", "0,1"]);
    const isPassable = makeGridPassable(3, 3, walls);
    const path = findPathToNearest(0, 0, [{ x: 2, y: 2 }], isPassable);
    expect(path).toBeNull();
  });
});
