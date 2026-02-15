import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE, WALL_TILE } from "../../../map/game-map.ts";
import { tryMove } from "../movement.ts";

function makeTestMap(): GameMap {
  const map = new GameMap(5, 5, FLOOR_TILE);
  map.setTile(2, 0, { ...WALL_TILE });
  return map;
}

describe("tryMove", () => {
  test("entity moves to valid floor tile", () => {
    const world = new World();
    const map = makeTestMap();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 1, y: 1 });

    const result = tryMove(world, map, e, 2, 1);
    expect(result).toBe("moved");
    expect(world.getComponent(e, "Position")).toEqual({ x: 2, y: 1 });
  });

  test("entity cannot move into wall", () => {
    const world = new World();
    const map = makeTestMap();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 2, y: 1 });

    const result = tryMove(world, map, e, 2, 0);
    expect(result).toBe("blocked");
    expect(world.getComponent(e, "Position")).toEqual({ x: 2, y: 1 });
  });

  test("entity cannot move out of bounds", () => {
    const world = new World();
    const map = makeTestMap();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 0, y: 0 });

    const result = tryMove(world, map, e, -1, 0);
    expect(result).toBe("blocked");
    expect(world.getComponent(e, "Position")).toEqual({ x: 0, y: 0 });
  });

  test("entity cannot move into collidable entity", () => {
    const world = new World();
    const map = makeTestMap();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 1, y: 1 });

    const blocker = world.createEntity();
    world.addComponent(blocker, "Position", { x: 2, y: 1 });
    world.addComponent(blocker, "Collidable", { blocksMovement: true });

    const result = tryMove(world, map, e, 2, 1);
    expect(result).toBe("blocked");
    expect(world.getComponent(e, "Position")).toEqual({ x: 1, y: 1 });
  });

  test("entity can move into tile with non-blocking entity", () => {
    const world = new World();
    const map = makeTestMap();
    const e = world.createEntity();
    world.addComponent(e, "Position", { x: 1, y: 1 });

    const item = world.createEntity();
    world.addComponent(item, "Position", { x: 2, y: 1 });
    world.addComponent(item, "Collidable", { blocksMovement: false });

    const result = tryMove(world, map, e, 2, 1);
    expect(result).toBe("moved");
    expect(world.getComponent(e, "Position")).toEqual({ x: 2, y: 1 });
  });
});
