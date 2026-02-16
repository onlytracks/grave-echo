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
import { handlePlayerInput } from "../input.ts";
import { GameMap } from "../../../map/game-map.ts";

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
  world.addComponent(e, "Weapon", {
    damage: 5,
    range: 1,
    weaponType: "sword",
    attackType: "melee",
    defenseBonus: 0,
  });
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
  world.addComponent(e, "Weapon", {
    damage: 3,
    range: 6,
    weaponType: "bow",
    attackType: "ranged",
    defenseBonus: 0,
  });
  return e;
}

function createArmor(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
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

function createAccessory(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "°", fg: "cyan", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Ring of Strength",
    weight: 1,
    rarity: "uncommon",
  });
  world.addComponent(e, "Accessory", {
    slot: "accessory",
    bonuses: [{ stat: "strength", value: 2 }],
  });
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
    duration: 0,
    charges: 3,
    maxCharges: 3,
  });
  return e;
}

describe("Inventory System", () => {
  test("pickup adds item to inventory, removes Position but keeps Renderable", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);

    const result = pickup(world, player, sword, messages);
    expect(result).toBe(true);

    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items).toContain(sword);
    expect(inv.totalWeight).toBe(6);
    expect(world.getComponent(sword, "Position")).toBeUndefined();
    expect(world.getComponent(sword, "Renderable")).toBeDefined();
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

  test("drop removes item from inventory, adds Position; Renderable already present", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    const originalRenderable = {
      ...world.getComponent(sword, "Renderable")!,
    };
    pickup(world, player, sword, messages);

    drop(world, player, sword, messages);
    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items).not.toContain(sword);
    expect(inv.totalWeight).toBe(0);
    expect(world.getComponent(sword, "Position")).toEqual({ x: 5, y: 5 });
    const renderable = world.getComponent(sword, "Renderable");
    expect(renderable).toBeDefined();
    expect(renderable!.char).toBe(originalRenderable.char);
    expect(renderable!.fg).toBe(originalRenderable.fg);
  });

  test("dropped item has both Position and Renderable for map rendering", () => {
    const { world, messages, player } = setupWorld();
    const potion = createPotion(world, 5, 5);
    pickup(world, player, potion, messages);

    world.getComponent(player, "Position")!.x = 8;
    world.getComponent(player, "Position")!.y = 3;
    drop(world, player, potion, messages);

    expect(world.getComponent(potion, "Position")).toEqual({ x: 8, y: 3 });
    expect(world.getComponent(potion, "Renderable")).toBeDefined();
    const onMap = world.query("Position", "Renderable", "Item");
    expect(onMap).toContain(potion);
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

  test("pickup auto-equips weapon when no weapon equipped", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.weapon).toBe(sword);
  });

  test("pickup does not auto-equip when weapon already equipped", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    const bow = createBow(world, 5, 5);
    pickup(world, player, sword, messages);
    pickup(world, player, bow, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.weapon).toBe(sword);
  });

  test("pickup does not auto-equip non-equippable items", () => {
    const { world, messages, player } = setupWorld();
    const potion = createPotion(world, 5, 5);
    pickup(world, player, potion, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.weapon).toBeNull();
    expect(eq.armor).toBeNull();
    expect(eq.accessory1).toBeNull();
    expect(eq.accessory2).toBeNull();
  });

  test("pickup auto-equips armor when no armor equipped", () => {
    const { world, messages, player } = setupWorld();
    const armor = createArmor(world, 5, 5);
    pickup(world, player, armor, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.armor).toBe(armor);
  });

  test("pickup does not auto-equip armor when armor already equipped", () => {
    const { world, messages, player } = setupWorld();
    const armor1 = createArmor(world, 5, 5);
    const armor2 = createArmor(world, 5, 5);
    pickup(world, player, armor1, messages);
    pickup(world, player, armor2, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.armor).toBe(armor1);
  });

  test("pickup auto-equips accessory when slots are empty", () => {
    const { world, messages, player } = setupWorld();
    const acc = createAccessory(world, 5, 5);
    pickup(world, player, acc, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.accessory1).toBe(acc);
  });

  test("pickup auto-equips second accessory into accessory2", () => {
    const { world, messages, player } = setupWorld();
    const acc1 = createAccessory(world, 5, 5);
    const acc2 = createAccessory(world, 5, 5);
    pickup(world, player, acc1, messages);
    pickup(world, player, acc2, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.accessory1).toBe(acc1);
    expect(eq.accessory2).toBe(acc2);
  });

  test("pickup does not auto-equip accessory when both slots full", () => {
    const { world, messages, player } = setupWorld();
    const acc1 = createAccessory(world, 5, 5);
    const acc2 = createAccessory(world, 5, 5);
    const acc3 = createAccessory(world, 5, 5);
    pickup(world, player, acc1, messages);
    pickup(world, player, acc2, messages);
    pickup(world, player, acc3, messages);

    const eq = world.getComponent(player, "Equipment")!;
    expect(eq.accessory1).toBe(acc1);
    expect(eq.accessory2).toBe(acc2);
  });

  test("auto-equip messages appear in correct order", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);

    expect(messages.getMessages()).toEqual([
      "You pick up Iron Sword",
      "You equip Iron Sword",
    ]);
  });

  test("swapToNextWeapon cycles through weapons", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    const bow = createBow(world, 5, 5);
    pickup(world, player, sword, messages);
    // sword is auto-equipped since no weapon was equipped
    expect(world.getComponent(player, "Equipment")!.weapon).toBe(sword);
    pickup(world, player, bow, messages);

    swapToNextWeapon(world, player, messages);
    expect(world.getComponent(player, "Equipment")!.weapon).toBe(bow);

    swapToNextWeapon(world, player, messages);
    expect(world.getComponent(player, "Equipment")!.weapon).toBe(sword);

    swapToNextWeapon(world, player, messages);
    expect(world.getComponent(player, "Equipment")!.weapon).toBe(bow);
  });
});

describe("Inventory Debug Logging", () => {
  test("pickup emits debug message with entity IDs and weight", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);

    pickup(world, player, sword, messages);

    const all = messages.getAllMessagesWithTurns();
    const debugMsgs = all.filter((m) => m.category === "debug");
    expect(debugMsgs.length).toBeGreaterThanOrEqual(1);

    const pickupDebug = debugMsgs.find(
      (m) => m.text.includes("[inv]") && m.text.includes("picked up"),
    );
    expect(pickupDebug).toBeDefined();
    expect(pickupDebug!.text).toContain(`Iron Sword#${sword}`);
    expect(pickupDebug!.text).toContain("weight 0→6/30");
  });

  test("drop emits debug message with entity IDs and weight", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);
    drop(world, player, sword, messages);

    const all = messages.getAllMessagesWithTurns();
    const dropDebug = all.find(
      (m) => m.category === "debug" && m.text.includes("dropped"),
    );
    expect(dropDebug).toBeDefined();
    expect(dropDebug!.text).toContain(`Iron Sword#${sword}`);
    expect(dropDebug!.text).toContain("weight 6→0/30");
  });

  test("equip emits debug message with slot info", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);

    const all = messages.getAllMessagesWithTurns();
    const equipDebug = all.find(
      (m) => m.category === "debug" && m.text.includes("auto-equipped"),
    );
    expect(equipDebug).toBeDefined();
    expect(equipDebug!.text).toContain("weapon slot");
  });

  test("useConsumable emits debug message with HP details", () => {
    const { world, messages, player } = setupWorld();
    const potion = createPotion(world, 5, 5);
    pickup(world, player, potion, messages);
    useConsumable(world, player, potion, messages);

    const all = messages.getAllMessagesWithTurns();
    const useDebug = all.find(
      (m) =>
        m.category === "debug" &&
        m.text.includes("[inv]") &&
        m.text.includes("used"),
    );
    expect(useDebug).toBeDefined();
    expect(useDebug!.text).toContain("heal");
    expect(useDebug!.text).toContain("hp 12→20/20");
  });

  test("consumable depletion emits debug message", () => {
    const { world, messages, player } = setupWorld();
    const potion = createPotion(world, 5, 5);
    pickup(world, player, potion, messages);
    world.getComponent(potion, "Consumable")!.charges = 1;
    useConsumable(world, player, potion, messages);

    const all = messages.getAllMessagesWithTurns();
    const depleteDebug = all.find(
      (m) => m.category === "debug" && m.text.includes("depleted"),
    );
    expect(depleteDebug).toBeDefined();
    expect(depleteDebug!.text).toContain("0 charges");
  });

  test("pickup does not change gameplay messages", () => {
    const { world, messages, player } = setupWorld();
    const sword = createSword(world, 5, 5);
    pickup(world, player, sword, messages);

    expect(messages.getMessages()).toEqual([
      "You pick up Iron Sword",
      "You equip Iron Sword",
    ]);
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

describe("Pickup all items at position", () => {
  test("single 'e' press picks up all items at player position", () => {
    const { world, messages, player } = setupWorld();
    const map = new GameMap(10, 10);
    createSword(world, 5, 5);
    createBow(world, 5, 5);
    createPotion(world, 5, 5);

    const result = handlePlayerInput(world, map, { type: "pickup" }, messages);
    expect(result).toBe(true);

    const inv = world.getComponent(player, "Inventory")!;
    expect(inv.items.length).toBe(3);
  });

  test("picks up what fits, skips items over weight limit", () => {
    const { world, messages, player } = setupWorld();
    const map = new GameMap(10, 10);
    const inv = world.getComponent(player, "Inventory")!;
    inv.carryCapacity = 10;

    createSword(world, 5, 5); // weight 6
    createBow(world, 5, 5); // weight 4
    createPotion(world, 5, 5); // weight 1 — won't fit (6+4=10, at capacity)

    const result = handlePlayerInput(world, map, { type: "pickup" }, messages);
    expect(result).toBe(true);
    expect(inv.items.length).toBe(2);
    expect(inv.totalWeight).toBe(10);
  });

  test("no items at position shows 'Nothing to pick up here.'", () => {
    const { world, messages } = setupWorld();
    const map = new GameMap(10, 10);
    createSword(world, 3, 3); // different position

    const result = handlePlayerInput(world, map, { type: "pickup" }, messages);
    expect(result).toBe(false);
    expect(messages.getMessages()).toContain("Nothing to pick up here.");
  });
});
