import { describe, it, expect } from "bun:test";
import { World } from "../../ecs/world.ts";
import {
  createSwapWeaponScreenState,
  handleSwapWeaponKey,
} from "../swap-weapon-screen.ts";

function makePlayer(world: World): number {
  const player = world.createEntity();
  world.addComponent(player, "PlayerControlled", true);
  world.addComponent(player, "Position", { x: 5, y: 5 });
  world.addComponent(player, "Inventory", {
    items: [],
    carryCapacity: 50,
    totalWeight: 0,
  });
  world.addComponent(player, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });
  return player;
}

function makeWeapon(world: World, name: string, damage = 4, range = 1): number {
  const e = world.createEntity();
  world.addComponent(e, "Item", { name, weight: 2 });
  world.addComponent(e, "Weapon", {
    damage,
    range,
    weaponType: "sword",
    attackType: "melee",
    defenseBonus: 0,
  });
  return e;
}

describe("createSwapWeaponScreenState", () => {
  it("returns null with no weapons in inventory", () => {
    const world = new World();
    const player = makePlayer(world);
    expect(createSwapWeaponScreenState(world, player)).toBeNull();
  });

  it("returns null with only the equipped weapon", () => {
    const world = new World();
    const player = makePlayer(world);
    const sword = makeWeapon(world, "Iron Sword");
    world.getComponent(player, "Inventory")!.items.push(sword);
    world.getComponent(player, "Equipment")!.weapon = sword;

    expect(createSwapWeaponScreenState(world, player)).toBeNull();
  });

  it("returns state with unequipped weapon in inventory", () => {
    const world = new World();
    const player = makePlayer(world);
    const sword = makeWeapon(world, "Iron Sword");
    world.getComponent(player, "Inventory")!.items.push(sword);

    const state = createSwapWeaponScreenState(world, player);
    expect(state).not.toBeNull();
    expect(state!.weapons).toEqual([sword]);
    expect(state!.equippedWeapon).toBeNull();
  });

  it("lists all weapons and tracks equipped", () => {
    const world = new World();
    const player = makePlayer(world);
    const sword = makeWeapon(world, "Iron Sword");
    const bow = makeWeapon(world, "Hunting Bow", 3, 6);
    const spear = makeWeapon(world, "Oak Spear", 5, 2);
    const inv = world.getComponent(player, "Inventory")!;
    inv.items.push(sword, bow, spear);
    world.getComponent(player, "Equipment")!.weapon = sword;

    const state = createSwapWeaponScreenState(world, player);
    expect(state).not.toBeNull();
    expect(state!.weapons).toEqual([sword, bow, spear]);
    expect(state!.equippedWeapon).toBe(sword);
  });

  it("returns null when player has no Inventory", () => {
    const world = new World();
    const player = world.createEntity();
    world.addComponent(player, "PlayerControlled", true);
    expect(createSwapWeaponScreenState(world, player)).toBeNull();
  });

  it("filters out non-weapon items", () => {
    const world = new World();
    const player = makePlayer(world);
    const sword = makeWeapon(world, "Iron Sword");
    const potion = world.createEntity();
    world.addComponent(potion, "Item", { name: "Potion", weight: 1 });
    world.addComponent(potion, "Consumable", {
      effectType: "heal",
      power: 10,
      duration: 0,
      charges: 1,
      maxCharges: 1,
    });
    const inv = world.getComponent(player, "Inventory")!;
    inv.items.push(potion, sword);

    const state = createSwapWeaponScreenState(world, player);
    expect(state).not.toBeNull();
    expect(state!.weapons).toEqual([sword]);
  });
});

describe("handleSwapWeaponKey", () => {
  const weapons = [10, 20, 30];
  const state = { weapons, equippedWeapon: 10 };

  it("returns 'cancel' for Escape", () => {
    expect(handleSwapWeaponKey(0x1b, state)).toBe("cancel");
  });

  it("returns correct entity for valid number key", () => {
    expect(handleSwapWeaponKey(0x32, state)).toBe(20); // '2'
    expect(handleSwapWeaponKey(0x33, state)).toBe(30); // '3'
  });

  it("returns 'cancel' when selecting equipped weapon", () => {
    expect(handleSwapWeaponKey(0x31, state)).toBe("cancel"); // '1' = equipped
  });

  it("returns null for out-of-range number", () => {
    expect(handleSwapWeaponKey(0x34, state)).toBeNull();
    expect(handleSwapWeaponKey(0x39, state)).toBeNull();
  });

  it("returns null for non-number, non-escape keys", () => {
    expect(handleSwapWeaponKey(0x61, state)).toBeNull(); // 'a'
    expect(handleSwapWeaponKey(0x0d, state)).toBeNull(); // Enter
  });
});
