import { describe, it, expect } from "bun:test";
import { World } from "../../ecs/world.ts";
import {
  createUseItemScreenState,
  handleUseItemKey,
} from "../use-item-screen.ts";

function makePlayer(world: World): number {
  const player = world.createEntity();
  world.addComponent(player, "PlayerControlled", true);
  world.addComponent(player, "Position", { x: 5, y: 5 });
  world.addComponent(player, "Inventory", {
    items: [],
    carryCapacity: 50,
    totalWeight: 0,
  });
  return player;
}

function makeConsumable(world: World, name: string): number {
  const e = world.createEntity();
  world.addComponent(e, "Item", { name, weight: 1 });
  world.addComponent(e, "Consumable", {
    effectType: "heal",
    power: 10,
    duration: 0,
    charges: 3,
    maxCharges: 3,
  });
  return e;
}

function makeWeapon(world: World, name: string): number {
  const e = world.createEntity();
  world.addComponent(e, "Item", { name, weight: 2 });
  world.addComponent(e, "Weapon", {
    damage: 5,
    range: 1,
    attackType: "melee",
    defenseBonus: 0,
  });
  return e;
}

describe("createUseItemScreenState", () => {
  it("returns null when no consumables in inventory", () => {
    const world = new World();
    const player = makePlayer(world);
    const weapon = makeWeapon(world, "Sword");
    world.getComponent(player, "Inventory")!.items.push(weapon);

    const state = createUseItemScreenState(world, player);
    expect(state).toBeNull();
  });

  it("returns null with empty inventory", () => {
    const world = new World();
    const player = makePlayer(world);
    expect(createUseItemScreenState(world, player)).toBeNull();
  });

  it("filters to only Consumable items", () => {
    const world = new World();
    const player = makePlayer(world);
    const potion = makeConsumable(world, "Health Potion");
    const sword = makeWeapon(world, "Sword");
    const elixir = makeConsumable(world, "Elixir");
    const inv = world.getComponent(player, "Inventory")!;
    inv.items.push(potion, sword, elixir);

    const state = createUseItemScreenState(world, player);
    expect(state).not.toBeNull();
    expect(state!.consumables).toEqual([potion, elixir]);
  });

  it("returns null when player has no Inventory", () => {
    const world = new World();
    const player = world.createEntity();
    world.addComponent(player, "PlayerControlled", true);
    expect(createUseItemScreenState(world, player)).toBeNull();
  });
});

describe("handleUseItemKey", () => {
  const entities = [10, 20, 30] as const;
  const state = { consumables: [10, 20, 30] };

  it("returns 'cancel' for Escape", () => {
    expect(handleUseItemKey(0x1b, state)).toBe("cancel");
  });

  it("returns correct entity for valid number key", () => {
    expect(handleUseItemKey(0x31, state)).toBe(10); // '1'
    expect(handleUseItemKey(0x32, state)).toBe(20); // '2'
    expect(handleUseItemKey(0x33, state)).toBe(30); // '3'
  });

  it("returns null for out-of-range number", () => {
    expect(handleUseItemKey(0x34, state)).toBeNull(); // '4' — only 3 items
    expect(handleUseItemKey(0x39, state)).toBeNull(); // '9'
  });

  it("returns null for non-number, non-escape keys", () => {
    expect(handleUseItemKey(0x61, state)).toBeNull(); // 'a'
    expect(handleUseItemKey(0x0d, state)).toBeNull(); // Enter
  });
});
