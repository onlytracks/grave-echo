import type { World } from "../ecs/world.ts";

export function createIronSword(world: World, x: number, y: number): number {
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

export function createShortBow(world: World, x: number, y: number): number {
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
    charges: 3,
    maxCharges: 3,
  });
  return e;
}
