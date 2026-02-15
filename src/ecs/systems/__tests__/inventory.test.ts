import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { MessageLog } from "../messages.ts";
import {
  pickup,
  drop,
  equip,
  unequip,
  swapToNextWeapon,
  useConsumable,
} from "../inventory.ts";
import { getEncumbrancePenalty } from "../turn.ts";

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
  world.addComponent(player, "Equipment", { weapon: null });

  return { world, messages, player };
}

function createSword(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "/", fg: "white", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Iron Sword",
    weight: 6,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", { damage: 5, range: 1, weaponType: "sword" });
  return e;
}

function createBow(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: ")", fg: "yellow", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Short Bow",
    weight: 4,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", { damage: 3, range: 6, weaponType: "bow" });
  return e;
}

function createPotion(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "!",
    fg: "brightRed",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Healing Potion",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Consumable", {
    effectType: "heal",
    power: 8,
    charges: 3,
    maxCharges: 3,
  });
  return e;
}

describe("Inventory System", () => {
  test("pickup adds item to inventory, removes Position/Renderable", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);

    const result = pickup(world, player, sword, messages);
    expect(result).toBe(true);

    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items).toContain(sword);
    expect(inv.totalWeight).toBe(6);
    expect(world.getComponent(sword, "Position")).toBeUndefined();
    expect(world.getComponent(sword, "Renderable")).toBeUndefined();
  });

  test("pickup fails when over carry capacity", () => {
    const { world, messages, player } = setupWorld();
    const inv = world.getComponent(player, "Inventory")!;
    inv.totalWeight = 28;

    const sword = createSword(world, 5, 5);
    const result = pickup(world, player, sword, messages);
    expect(result).toBe(false);
    expect(inv.items.length).toBe(0);
    expect(world.getComponent(sword, "Position")).toBeDefined();
  });

  test("drop removes item from inventory, adds Position/Renderable", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);

    drop(world, player, sword, messages);
    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items).not.toContain(sword);
    expect(inv.totalWeight).toBe(0);
    expect(world.getComponent(sword, "Position")).toEqual({ x: 5, y: 5 });
    expect(world.getComponent(sword, "Renderable")).toBeDefined();
  });

  test("equip sets Equipment.weapon", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);

    equip(world, player, sword, messages);
    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.weapon).toBe(sword);
  });

  test("equip swaps: old weapon stays in inventory, new one equips", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    const bow = createBow(world, 5, 5);
    pickup(world, player, sword, messages);
    pickup(world, player, bow, messages);

    equip(world, player, sword, messages);
    equip(world, player, bow, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.weapon).toBe(bow);
    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items).toContain(sword);
    expect(inv.items).toContain(bow);
  });

  test("unequip moves weapon from Equipment to inventory", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);
    equip(world, player, sword, messages);

    unequip(world, player, messages);
    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.weapon).toBeNull();
    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items).toContain(sword);
  });

  test("useConsumable heals and decrements charges", () => {
    const { world, messages, player } = setupWorld();
    const potion = createPotion(world, 5, 5);
    pickup(world, player, potion, messages);

    const result = useConsumable(world, player, potion, messages);
    expect(result).toBe(true);
    expect(world.getComponent(player, "Health")!.current).toBe(20);
    expect(world.getComponent(potion, "Consumable")!.charges).toBe(2);
  });

  test("useConsumable caps heal at max HP", () => {
    const { world, messages, player } = setupWorld();
    world.getComponent(player, "Health")!.current = 19;
    const potion = createPotion(world, 5, 5);
    pickup(world, player, potion, messages);

    useConsumable(world, player, potion, messages);
    expect(world.getComponent(player, "Health")!.current).toBe(20);
  });

  test("useConsumable removes item at 0 charges", () => {
    const { world, messages, player } = setupWorld();
    const potion = createPotion(world, 5, 5);
    pickup(world, player, potion, messages);
    world.getComponent(potion, "Consumable")!.charges = 1;

    useConsumable(world, player, potion, messages);
    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items).not.toContain(potion);
    expect(world.getComponent(potion, "Item")).toBeUndefined();
  });

  test("weight updates correctly on pickup/drop", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    const bow = createBow(world, 5, 5);

    pickup(world, player, sword, messages);
    expect(world.getComponent(player, "Inventory")!.totalWeight).toBe(6);

    pickup(world, player, bow, messages);
    expect(world.getComponent(player, "Inventory")!.totalWeight).toBe(10);

    drop(world, player, sword, messages);
    expect(world.getComponent(player, "Inventory")!.totalWeight).toBe(4);
  });

  test("swapToNextWeapon cycles through weapons", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    const bow = createBow(world, 5, 5);
    pickup(world, player, sword, messages);
    pickup(world, player, bow, messages);

    swapToNextWeapon(world, player, messages);
    expect(world.getComponent(player, "Equipment")!.weapon).toBe(sword);

    swapToNextWeapon(world, player, messages);
    expect(world.getComponent(player, "Equipment")!.weapon).toBe(bow);

    swapToNextWeapon(world, player, messages);
    expect(world.getComponent(player, "Equipment")!.weapon).toBe(sword);
  });
});

describe("Encumbrance", () => {
  test("no penalty at 0-50%", () => {
    const { world, player } = setupWorld();
    world.getComponent(player, "Inventory")!.totalWeight = 15;
    expect(getEncumbrancePenalty(world, player)).toBe(0);
  });

  test("-1 penalty at 50-75%", () => {
    const { world, player } = setupWorld();
    world.getComponent(player, "Inventory")!.totalWeight = 16;
    expect(getEncumbrancePenalty(world, player)).toBe(1);
  });

  test("-2 penalty at 75-100%", () => {
    const { world, player } = setupWorld();
    world.getComponent(player, "Inventory")!.totalWeight = 23;
    expect(getEncumbrancePenalty(world, player)).toBe(2);
  });

  test("cannot move at >100%", () => {
    const { world, player } = setupWorld();
    world.getComponent(player, "Inventory")!.totalWeight = 31;
    expect(getEncumbrancePenalty(world, player)).toBe(Infinity);
  });

  test("no penalty without Inventory component", () => {
    const { world, player } = setupWorld();
    world.removeComponent(player, "Inventory");
    expect(getEncumbrancePenalty(world, player)).toBe(0);
  });
});
