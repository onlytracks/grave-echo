import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { MessageLog } from "../messages.ts";
import { processHealth } from "../health.ts";
import { createHealingPotion } from "../../../items/item-factory.ts";

function createEnemy(world: World, x: number, y: number) {
  const enemy = world.createEntity();
  world.addComponent(enemy, "Position", { x, y });
  world.addComponent(enemy, "Renderable", {
    char: "g",
    fg: "green",
    bg: "black",
  });
  world.addComponent(enemy, "Health", { current: 0, max: 10 });
  world.addComponent(enemy, "AIControlled", {
    pattern: "charger",
    targetEntity: null,
  });
  world.addComponent(enemy, "Faction", { factionId: "enemy" });
  world.addComponent(enemy, "Inventory", {
    items: [],
    totalWeight: 0,
    carryCapacity: 30,
  });
  world.addComponent(enemy, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });
  return enemy;
}

function createWeapon(world: World) {
  const e = world.createEntity();
  world.addComponent(e, "Renderable", { char: "/", fg: "white", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Iron Sword",
    weight: 6,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 5,
    range: 1,
    weaponType: "sword",
    attackType: "melee",
    defenseBonus: 0,
  });
  return e;
}

function createArmor(world: World) {
  const e = world.createEntity();
  world.addComponent(e, "Renderable", { char: "[", fg: "gray", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Chainmail",
    weight: 10,
    rarity: "common",
  });
  world.addComponent(e, "Armor", {
    defense: 3,
    speedPenalty: 1,
    armorType: "medium",
  });
  return e;
}

function createAccessory(world: World) {
  const e = world.createEntity();
  world.addComponent(e, "Renderable", { char: "=", fg: "gold", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Ring of Speed",
    weight: 1,
    rarity: "uncommon",
  });
  world.addComponent(e, "Accessory", {
    slot: "accessory",
    bonuses: [{ stat: "speed", value: 1 }],
  });
  return e;
}

function equipEnemy(
  world: World,
  enemy: number,
  items: {
    weapon?: number;
    armor?: number;
    accessory1?: number;
    accessory2?: number;
  },
) {
  const inv = world.getComponent(enemy, "Inventory")!;
  const equip = world.getComponent(enemy, "Equipment")!;

  for (const id of Object.values(items)) {
    if (id === undefined) continue;
    inv.items.push(id);
    const item = world.getComponent(id, "Item")!;
    inv.totalWeight += item.weight;
  }

  if (items.weapon !== undefined) equip.weapon = items.weapon;
  if (items.armor !== undefined) equip.armor = items.armor;
  if (items.accessory1 !== undefined) equip.accessory1 = items.accessory1;
  if (items.accessory2 !== undefined) equip.accessory2 = items.accessory2;
}

describe("enemy loot drops on death", () => {
  test("equipped weapon drops at enemy death position", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 3, 7);
    const weapon = createWeapon(world);
    equipEnemy(world, enemy, { weapon });

    processHealth(world, messages);

    const pos = world.getComponent(weapon, "Position");
    expect(pos).toBeDefined();
    expect(pos!.x).toBe(3);
    expect(pos!.y).toBe(7);
  });

  test("dropped item retains Renderable, Item, and Weapon components", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);
    const weapon = createWeapon(world);
    equipEnemy(world, enemy, { weapon });

    processHealth(world, messages);

    expect(world.getComponent(weapon, "Renderable")).toBeDefined();
    expect(world.getComponent(weapon, "Item")).toBeDefined();
    expect(world.getComponent(weapon, "Weapon")).toBeDefined();
  });

  test("enemy entity is destroyed after dropping items", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);
    const weapon = createWeapon(world);
    equipEnemy(world, enemy, { weapon });

    processHealth(world, messages);

    expect(world.getComponent(enemy, "Health")).toBeUndefined();
    expect(world.getComponent(enemy, "Position")).toBeUndefined();
  });

  test("weapon always drops (100% chance)", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);
    const weapon = createWeapon(world);
    equipEnemy(world, enemy, { weapon });

    // rng returns 1.0 (would fail any < threshold check)
    processHealth(world, messages, () => 1.0);

    expect(world.getComponent(weapon, "Position")).toBeDefined();
  });

  test("armor drops at 75% chance", () => {
    const world = new World();
    const messages = new MessageLog();

    // rng returns 0.5 — below 0.75 threshold, should drop
    const enemy1 = createEnemy(world, 5, 5);
    const armor1 = createArmor(world);
    equipEnemy(world, enemy1, { armor: armor1 });
    processHealth(world, messages, () => 0.5);
    expect(world.getComponent(armor1, "Position")).toBeDefined();

    // rng returns 0.9 — above 0.75 threshold, should NOT drop
    const world2 = new World();
    const messages2 = new MessageLog();
    const enemy2 = createEnemy(world2, 5, 5);
    const armor2 = createArmor(world2);
    equipEnemy(world2, enemy2, { armor: armor2 });
    processHealth(world2, messages2, () => 0.9);
    expect(world2.getComponent(armor2, "Position")).toBeUndefined();
  });

  test("accessory drops at 50% chance", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);
    const acc = createAccessory(world);
    equipEnemy(world, enemy, { accessory1: acc });

    processHealth(world, messages, () => 0.3);
    expect(world.getComponent(acc, "Position")).toBeDefined();
  });

  test("items that fail drop check are destroyed", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);
    const armor = createArmor(world);
    equipEnemy(world, enemy, { armor });

    // rng above 0.75 — armor won't drop
    processHealth(world, messages, () => 0.9);

    expect(world.getComponent(armor, "Position")).toBeUndefined();
    expect(world.getComponent(armor, "Item")).toBeUndefined();
  });

  test("player death does NOT drop items", () => {
    const world = new World();
    const messages = new MessageLog();

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 5, y: 5 });
    world.addComponent(player, "PlayerControlled", {});
    world.addComponent(player, "Health", { current: 0, max: 20 });
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

    const weapon = createWeapon(world);
    const inv = world.getComponent(player, "Inventory")!;
    const equip = world.getComponent(player, "Equipment")!;
    inv.items.push(weapon);
    equip.weapon = weapon;

    processHealth(world, messages);

    // Weapon should NOT have a Position (player items not dropped)
    expect(world.getComponent(weapon, "Position")).toBeUndefined();
  });

  test("enemy with empty inventory drops nothing", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);

    processHealth(world, messages);

    expect(world.getComponent(enemy, "Health")).toBeUndefined();
    const gameplay = messages.getMessagesWithTurns();
    expect(gameplay.some((m) => m.text.includes("dies!"))).toBe(true);
    expect(gameplay.some((m) => m.text.includes("dropped!"))).toBe(false);
  });

  test("gameplay message shown for weapon/armor drops", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);
    const weapon = createWeapon(world);
    const armor = createArmor(world);
    equipEnemy(world, enemy, { weapon, armor });

    processHealth(world, messages, () => 0.0);

    const gameplay = messages.getMessagesWithTurns();
    expect(gameplay.some((m) => m.text === "Iron Sword dropped!")).toBe(true);
    expect(gameplay.some((m) => m.text === "Chainmail dropped!")).toBe(true);
  });

  test("multiple items drop at same position", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 4, 6);
    const weapon = createWeapon(world);
    const armor = createArmor(world);
    equipEnemy(world, enemy, { weapon, armor });

    processHealth(world, messages, () => 0.0);

    const weaponPos = world.getComponent(weapon, "Position");
    const armorPos = world.getComponent(armor, "Position");
    expect(weaponPos).toEqual({ x: 4, y: 6 });
    expect(armorPos).toEqual({ x: 4, y: 6 });
  });

  test("consumables always drop regardless of rng", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 3, 3);
    const potion = createHealingPotion(world, 0, 0);
    world.removeComponent(potion, "Position");
    const inv = world.getComponent(enemy, "Inventory")!;
    inv.items.push(potion);
    const item = world.getComponent(potion, "Item")!;
    inv.totalWeight += item.weight;

    processHealth(world, messages, () => 1.0);

    const pos = world.getComponent(potion, "Position");
    expect(pos).toBeDefined();
    expect(pos!.x).toBe(3);
    expect(pos!.y).toBe(3);
  });

  test("dropped consumable retains full charges", () => {
    const world = new World();
    const messages = new MessageLog();
    const enemy = createEnemy(world, 5, 5);
    const potion = createHealingPotion(world, 0, 0);
    world.removeComponent(potion, "Position");
    const inv = world.getComponent(enemy, "Inventory")!;
    inv.items.push(potion);

    processHealth(world, messages);

    const consumable = world.getComponent(potion, "Consumable");
    expect(consumable).toBeDefined();
    expect(consumable!.charges).toBe(consumable!.maxCharges);
  });
});
