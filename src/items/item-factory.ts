import type { World } from "../ecs/world.ts";

// --- Weapons ---

export function createIronSword(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "\u{F04E5}",
    fg: "brightCyan",
    bg: "black",
  });
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
  world.addComponent(e, "Renderable", {
    char: "\u{F18BE}",
    fg: "brightCyan",
    bg: "black",
  });
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
  world.addComponent(e, "Renderable", {
    char: "\u{F1842}",
    fg: "white",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Battle Axe",
    weight: 8,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 6,
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
  world.addComponent(e, "Renderable", {
    char: "\u{F1843}",
    fg: "white",
    bg: "black",
  });
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
  world.addComponent(e, "Renderable", {
    char: "\u{F1845}",
    fg: "white",
    bg: "black",
  });
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
  world.addComponent(e, "Renderable", {
    char: "\u{F08C8}",
    fg: "white",
    bg: "black",
  });
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
  world.addComponent(e, "Renderable", {
    char: "\u{F1841}",
    fg: "brightYellow",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Short Bow",
    weight: 4,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 4,
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
  world.addComponent(e, "Renderable", {
    char: "\u{F1841}",
    fg: "brightYellow",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Crossbow",
    weight: 6,
    rarity: "common",
  });
  world.addComponent(e, "Weapon", {
    damage: 6,
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
  world.addComponent(e, "Renderable", {
    char: "\u{F1844}",
    fg: "cyan",
    bg: "black",
  });
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
    char: "\u{F0AD0}",
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
  world.addComponent(e, "Renderable", {
    char: "\u{F0893}",
    fg: "green",
    bg: "black",
  });
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
    char: "\u{F0893}",
    fg: "brightGreen",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Chainmail",
    weight: 8,
    rarity: "common",
  });
  world.addComponent(e, "Armor", {
    defense: 3,
    speedPenalty: 0,
    armorType: "medium",
  });
  return e;
}

export function createPlateArmor(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "\u{F0893}",
    fg: "brightWhite",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Plate Armor",
    weight: 12,
    rarity: "common",
  });
  world.addComponent(e, "Armor", {
    defense: 6,
    speedPenalty: 1,
    armorType: "heavy",
  });
  return e;
}

// --- Accessories ---

export function createIronRing(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "\u{1AAD}",
    fg: "yellow",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Iron Ring",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Accessory", {
    slot: "accessory",
    bonuses: [{ stat: "strength", value: 2 }],
  });
  return e;
}

export function createWardAmulet(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "\u{0920}",
    fg: "cyan",
    bg: "black",
  });
  world.addComponent(e, "Item", {
    name: "Ward Amulet",
    weight: 1,
    rarity: "common",
  });
  world.addComponent(e, "Accessory", {
    slot: "accessory",
    bonuses: [{ stat: "defense", value: 2 }],
  });
  return e;
}

export function createSwiftBoots(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "\u{16C3}",
    fg: "yellow",
    bg: "black",
  });
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
    char: "\u{13A3}",
    fg: "brightGreen",
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
    charges: 2,
    maxCharges: 2,
  });
  return e;
}

export function createSpeedPotion(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Renderable", {
    char: "\u{13A3}",
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
    char: "\u{13A3}",
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
    char: "\u{13A3}",
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
