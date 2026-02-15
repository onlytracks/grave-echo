import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { MessageLog } from "../messages.ts";
import { pickup, equip, isEquipped, useConsumable } from "../inventory.ts";
import { startPlayerTurn } from "../turn.ts";

function setupWorld() {
  const world = new World();
  const messages = new MessageLog();

  const player = world.createEntity();
  world.addComponent(player, "Position", { x: 5, y: 5 });
  world.addComponent(player, "PlayerControlled", {});
  world.addComponent(player, "Health", { current: 12, max: 20 });
  world.addComponent(player, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(player, "TurnActor", {
    hasActed: false,
    movementRemaining: 3,
    secondaryUsed: false,
  });
  world.addComponent(player, "Inventory", {
    items: [],
    totalWeight: 0,
    carryCapacity: 30,
  });
  world.addComponent(player, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });
  world.addComponent(player, "Buffs", { active: [] });

  return { world, messages, player };
}

function createArmor(world: World): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x: 5, y: 5 });
  world.addComponent(e, "Renderable", { char: "[", fg: "green", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Leather Armor",
    weight: 5,
    rarity: "common",
  });
  world.addComponent(e, "Armor", {
    defense: 2,
    speedPenalty: 0,
    armorType: "light",
  });
  return e;
}

function createHeavyArmor(world: World): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x: 5, y: 5 });
  world.addComponent(e, "Renderable", {
    char: "[",
    fg: "brightWhite",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Plate Armor",
    weight: 15,
    rarity: "common",
  });
  world.addComponent(e, "Armor", {
    defense: 6,
    speedPenalty: 2,
    armorType: "heavy",
  });
  return e;
}

function createRing(world: World): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x: 5, y: 5 });
  world.addComponent(e, "Renderable", { char: "°", fg: "yellow", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Iron Ring",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Accessory", {
    slot: "accessory",
    bonuses: [{ stat: "strength", value: 1 }],
  });
  return e;
}

function createAmulet(world: World): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x: 5, y: 5 });
  world.addComponent(e, "Renderable", { char: '"', fg: "cyan", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Ward Amulet",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Accessory", {
    slot: "accessory",
    bonuses: [{ stat: "defense", value: 1 }],
  });
  return e;
}

function createBoots(world: World): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x: 5, y: 5 });
  world.addComponent(e, "Renderable", { char: "{", fg: "yellow", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Swift Boots",
    weight: 2,
    rarity: "common",
  });
  world.addComponent(e, "Accessory", {
    slot: "accessory",
    bonuses: [{ stat: "speed", value: 1 }],
  });
  return e;
}

describe("Equip Armor", () => {
  test("equip armor goes to armor slot", () => {
    const { world, messages, player } = setupWorld();
    const armor = createArmor(world);
    pickup(world, player, armor, messages);
    equip(world, player, armor, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.armor).toBe(armor);
    expect(eq.weapon).toBeNull();
  });

  test("heavy armor reduces movement on turn start", () => {
    const { world, messages, player } = setupWorld();
    const armor = createHeavyArmor(world);
    pickup(world, player, armor, messages);
    equip(world, player, armor, messages);

    startPlayerTurn(world);
    const turn = world.getComponent(player, "TurnActor")!;
    // speed 3 - speedPenalty 2 = 1
    expect(turn.movementRemaining).toBe(1);
  });
});

describe("Equip Accessories", () => {
  test("first accessory goes to accessory1 slot", () => {
    const { world, messages, player } = setupWorld();
    const ring = createRing(world);
    pickup(world, player, ring, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.accessory1).toBe(ring);
    expect(eq.accessory2).toBeNull();
  });

  test("second accessory fills accessory2 slot", () => {
    const { world, messages, player } = setupWorld();
    const ring = createRing(world);
    const amulet = createAmulet(world);
    pickup(world, player, ring, messages);
    pickup(world, player, amulet, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.accessory1).toBe(ring);
    expect(eq.accessory2).toBe(amulet);
  });

  test("third accessory replaces accessory1 when both full", () => {
    const { world, messages, player } = setupWorld();
    const ring = createRing(world);
    const amulet = createAmulet(world);
    const boots = createBoots(world);
    pickup(world, player, ring, messages);
    pickup(world, player, amulet, messages);
    pickup(world, player, boots, messages);
    equip(world, player, ring, messages);
    equip(world, player, amulet, messages);
    equip(world, player, boots, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.accessory1).toBe(boots);
    expect(eq.accessory2).toBe(amulet);
  });
});

describe("Equipment with all 4 slots populated", () => {
  test("all slots can be filled simultaneously", () => {
    const { world, messages, player } = setupWorld();

    const sword = world.createEntity();
    world.addComponent(sword, "Position", { x: 5, y: 5 });
    world.addComponent(sword, "Item", {
      name: "Sword",
      weight: 6,
      rarity: "common",
    });
    world.addComponent(sword, "Weapon", {
      damage: 5,
      range: 1,
      weaponType: "sword",
      attackType: "melee",
      defenseBonus: 0,
    });

    const armor = createArmor(world);
    const ring = createRing(world);
    const amulet = createAmulet(world);

    pickup(world, player, sword, messages);
    pickup(world, player, armor, messages);
    pickup(world, player, ring, messages);
    pickup(world, player, amulet, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.weapon).toBe(sword);
    expect(eq.armor).toBe(armor);
    expect(eq.accessory1).toBe(ring);
    expect(eq.accessory2).toBe(amulet);
  });

  test("isEquipped returns true for all equipped items", () => {
    const { world, messages, player } = setupWorld();

    const sword = world.createEntity();
    world.addComponent(sword, "Position", { x: 5, y: 5 });
    world.addComponent(sword, "Item", {
      name: "Sword",
      weight: 6,
      rarity: "common",
    });
    world.addComponent(sword, "Weapon", {
      damage: 5,
      range: 1,
      weaponType: "sword",
      attackType: "melee",
      defenseBonus: 0,
    });

    const armor = createArmor(world);
    const ring = createRing(world);

    pickup(world, player, sword, messages);
    pickup(world, player, armor, messages);
    pickup(world, player, ring, messages);

    equip(world, player, armor, messages);
    equip(world, player, ring, messages);

    expect(isEquipped(world, player, sword)).toBe(true);
    expect(isEquipped(world, player, armor)).toBe(true);
    expect(isEquipped(world, player, ring)).toBe(true);
  });
});

describe("Buff Consumables", () => {
  test("buff consumable applies temporary buff", () => {
    const { world, messages, player } = setupWorld();

    const potion = world.createEntity();
    world.addComponent(potion, "Position", { x: 5, y: 5 });
    world.addComponent(potion, "Item", {
      name: "Strength Potion",
      weight: 1,
      rarity: "common",
    });
    world.addComponent(potion, "Consumable", {
      effectType: "strength",
      power: 2,
      duration: 5,
      charges: 2,
      maxCharges: 2,
    });

    pickup(world, player, potion, messages);
    useConsumable(world, player, potion, messages);

    const buffs = world.getComponent(player, "Buffs")!;
    expect(buffs.active.length).toBe(1);
    expect(buffs.active[0]!.stat).toBe("strength");
    expect(buffs.active[0]!.value).toBe(2);
    expect(buffs.active[0]!.turnsRemaining).toBe(5);
  });
});
