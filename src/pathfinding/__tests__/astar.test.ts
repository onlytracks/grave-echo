import { describe, expect, test } from "bun:test";
import { findPath } from "../astar.ts";

const allPassable = () => true;

function makeGridPassable(
  width: number,
  height: number,
  walls: Set<string>,
): (x: number, y: number) => boolean {
  return (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return false;
    return !walls.has(`${x},${y}`);
  };
}

describe("findPath", () => {
  test("open grid returns straight line", () => {
    const isPassable = makeGridPassable(10, 10, new Set());
    const path = findPath(0, 0, 4, 0, isPassable);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(4);
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 0 });
  });

  test("same start and goal returns empty path", () => {
    const path = findPath(3, 3, 3, 3, allPassable);
    expect(path).toEqual([]);
  });

  test("navigates around a wall", () => {
    const walls = new Set(["3,0", "3,1", "3,2", "3,3"]);
    const isPassable = makeGridPassable(10, 10, walls);
    const path = findPath(0, 0, 5, 0, isPassable);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(5);
    expect(path![path!.length - 1]).toEqual({ x: 5, y: 0 });
    for (const node of path!) {
      expect(walls.has(`${node.x},${node.y}`)).toBe(false);
    }
  });

  test("navigates L-shaped corridor", () => {
    // Corridor: (0,0)->(4,0) then (4,0)->(4,4)
    // Everything else is wall
    const passable = new Set<string>();
    for (let x = 0; x <= 4; x++) passable.add(`${x},0`);
    for (let y = 0; y <= 4; y++) passable.add(`4,${y}`);

    const isPassable = (x: number, y: number) => passable.has(`${x},${y}`);
    const path = findPath(0, 0, 4, 4, isPassable);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(8);
    expect(path![path!.length - 1]).toEqual({ x: 4, y: 4 });
  });

  test("returns null when no path exists (fully walled)", () => {
    const walls = new Set(["1,0", "1,1", "1,2", "0,2"]);
    const isPassable = makeGridPassable(3, 3, walls);
    const path = findPath(0, 0, 2, 2, isPassable);
    expect(path).toBeNull();
  });

  test("returns null when maxSearchNodes exceeded", () => {
    const isPassable = makeGridPassable(100, 100, new Set());
    const path = findPath(0, 0, 99, 99, isPassable, 10);
    expect(path).toBeNull();
  });

  test("path excludes start position", () => {
    const isPassable = makeGridPassable(10, 10, new Set());
    const path = findPath(2, 2, 4, 2, isPassable);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual({ x: 3, y: 2 });
    expect(path![1]).toEqual({ x: 4, y: 2 });
  });

  test("adjacent goal returns single step", () => {
    const isPassable = makeGridPassable(10, 10, new Set());
    const path = findPath(3, 3, 4, 3, isPassable);
    expect(path).toEqual([{ x: 4, y: 3 }]);
  });

  test("4-directional only (no diagonals)", () => {
    const isPassable = makeGridPassable(10, 10, new Set());
    const path = findPath(0, 0, 1, 1, isPassable);
    expect(path).not.toBeNull();
    expect(path!.length).toBe(2);
  });
});
