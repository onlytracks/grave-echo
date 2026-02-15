import type { World } from "../ecs/world.ts";

// --- Weapons ---

export function createIronSword(world: World, x: number, y: number): number {
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

export function createSwordAndShield(
  world: World,
  x: number,
  y: number,
): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "+", fg: "white", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Sword & Shield",
    weight: 7,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 4,
    range: 1,
    weaponType: "sword",
    attackType: "melee",
    defenseBonus: 2,
  });
  return e;
}

export function createBattleAxe(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "/", fg: "white", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Battle Axe",
    weight: 8,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 7,
    range: 1,
    weaponType: "axe",
    attackType: "melee",
    defenseBonus: 0,
  });
  return e;
}

export function createMaceAndShield(
  world: World,
  x: number,
  y: number,
): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "+", fg: "white", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Mace & Shield",
    weight: 6,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 4,
    range: 1,
    weaponType: "mace",
    attackType: "melee",
    defenseBonus: 2,
  });
  return e;
}

export function createIronSpear(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "|", fg: "white", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Iron Spear",
    weight: 5,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 4,
    range: 2,
    weaponType: "spear",
    attackType: "reach",
    defenseBonus: 0,
  });
  return e;
}

export function createHalberd(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "|", fg: "white", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Halberd",
    weight: 9,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 6,
    range: 2,
    weaponType: "halberd",
    attackType: "reach",
    defenseBonus: 0,
  });
  return e;
}

export function createShortBow(world: World, x: number, y: number): number {
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

export function createCrossbow(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "}", fg: "yellow", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Crossbow",
    weight: 6,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 5,
    range: 8,
    weaponType: "crossbow",
    attackType: "ranged",
    defenseBonus: 0,
  });
  return e;
}

export function createOakStaff(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", { char: "/", fg: "cyan", bg: "black" });
  world.addComponent(e, "Item", {
    name: "Oak Staff",
    weight: 3,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 4,
    range: 4,
    weaponType: "staff",
    attackType: "ranged",
    defenseBonus: 0,
  });
  return e;
}

export function createWand(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "-",
    fg: "magenta",
    bg: "black",
  });
  world.addComponent(e, "Item", { name: "Wand", weight: 2, rarity: "common" });
  world.addComponent(e, "Weapon", {
    damage: 3,
    range: 3,
    weaponType: "wand",
    attackType: "ranged",
    defenseBonus: 0,
  });
  return e;
}

// --- Armor ---

export function createLeatherArmor(world: World, x: number, y: number): number {
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

export function createChainmail(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "[",
    fg: "brightGreen",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Chainmail",
    weight: 10,
    rarity: "common",
  });
  world.addComponent(e, "Armor", {
    defense: 4,
    speedPenalty: 1,
    armorType: "medium",
  });
  return e;
}

export function createPlateArmor(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
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

// --- Accessories ---

export function createIronRing(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
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

export function createWardAmulet(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
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

export function createSwiftBoots(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
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

// --- Consumables ---

export function createHealingPotion(
  world: World,
  x: number,
  y: number,
): number {
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

export function createSpeedPotion(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "!",
    fg: "brightCyan",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Speed Potion",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Consumable", {
    effectType: "speed",
    power: 1,
    duration: 5,
    charges: 2,
    maxCharges: 2,
  });
  return e;
}

export function createStrengthPotion(
  world: World,
  x: number,
  y: number,
): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "!",
    fg: "brightYellow",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Strength Potion",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Consumable", {
    effectType: "strength",
    power: 2,
    duration: 5,
    charges: 2,
    maxCharges: 2,
  });
  return e;
}

export function createDefensePotion(
  world: World,
  x: number,
  y: number,
): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "!",
    fg: "brightBlue",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Defense Potion",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Consumable", {
    effectType: "defense",
    power: 2,
    duration: 5,
    charges: 2,
    maxCharges: 2,
  });
  return e;
}
