import { describe, expect, test } from "bun:test";
import { World } from "../../ecs/world.ts";
import {
  createRotwoodArcher,
  createThornbackGuardian,
  createBlightvinesSkulker,
  createHollowPatrol,
} from "../enemy-factory.ts";

function hasPotion(world: World, entity: number): boolean {
  const inv = world.getComponent(entity, "Inventory")!;
  return inv.items.some((id: number) => world.hasComponent(id, "Consumable"));
}

describe("enemy potion inventory", () => {
  test("rotwood archer gets potion when rng below threshold", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createRotwoodArcher(world, 0, 0, player, 1, 0, () => 0.1);
    expect(hasPotion(world, entity)).toBe(true);
  });

  test("rotwood archer has no potion when rng above threshold", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createRotwoodArcher(world, 0, 0, player, 1, 0, () => 0.9);
    expect(hasPotion(world, entity)).toBe(false);
  });

  test("thornback guardian always has potion", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createThornbackGuardian(world, 0, 0, player, 1, 0);
    expect(hasPotion(world, entity)).toBe(true);
  });

  test("blightvines skulker gets potion when rng below threshold", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createBlightvinesSkulker(
      world,
      0,
      0,
      player,
      1,
      0,
      () => 0.1,
    );
    expect(hasPotion(world, entity)).toBe(true);
  });

  test("blightvines skulker has no potion when rng above threshold", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createBlightvinesSkulker(
      world,
      0,
      0,
      player,
      1,
      0,
      () => 0.9,
    );
    expect(hasPotion(world, entity)).toBe(false);
  });

  test("hollow patrol gets potion when rng below threshold", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createHollowPatrol(
      world,
      0,
      0,
      player,
      1,
      0,
      undefined,
      () => 0.1,
    );
    expect(hasPotion(world, entity)).toBe(true);
  });

  test("hollow patrol has no potion when rng above threshold", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createHollowPatrol(
      world,
      0,
      0,
      player,
      1,
      0,
      undefined,
      () => 0.9,
    );
    expect(hasPotion(world, entity)).toBe(false);
  });

  test("potion in inventory has no Position component", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createThornbackGuardian(world, 0, 0, player, 1, 0);
    const inv = world.getComponent(entity, "Inventory")!;
    const potionId = inv.items.find((id: number) =>
      world.hasComponent(id, "Consumable"),
    )!;
    expect(world.getComponent(potionId, "Position")).toBeUndefined();
  });

  test("potion weight is included in inventory totalWeight", () => {
    const world = new World();
    const player = world.createEntity();
    const entity = createThornbackGuardian(world, 0, 0, player, 1, 0);
    const inv = world.getComponent(entity, "Inventory")!;
    const potionId = inv.items.find((id: number) =>
      world.hasComponent(id, "Consumable"),
    )!;
    const potionItem = world.getComponent(potionId, "Item")!;
    expect(inv.totalWeight).toBeGreaterThanOrEqual(potionItem.weight);
  });
});
