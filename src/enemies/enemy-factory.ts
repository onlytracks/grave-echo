import type { World } from "../ecs/world.ts";
import type { AIControlled } from "../ecs/components.ts";
import {
  createShortBow,
  createIronSpear,
  createChainmail,
  createIronSword,
  createSwordAndShield,
  createHealingPotion,
} from "../items/item-factory.ts";

interface EnemyConfig {
  x: number;
  y: number;
  player: number;
  difficulty: number;
  intensity?: number;
}

function equipWeapon(world: World, enemy: number, weaponId: number): void {
  world.removeComponent(weaponId, "Position");
  const inventory = world.getComponent(enemy, "Inventory")!;
  const equipment = world.getComponent(enemy, "Equipment")!;
  inventory.items.push(weaponId);
  const item = world.getComponent(weaponId, "Item");
  if (item) inventory.totalWeight += item.weight;
  equipment.weapon = weaponId;
}

function equipArmor(world: World, enemy: number, armorId: number): void {
  world.removeComponent(armorId, "Position");
  const inventory = world.getComponent(enemy, "Inventory")!;
  const equipment = world.getComponent(enemy, "Equipment")!;
  inventory.items.push(armorId);
  const item = world.getComponent(armorId, "Item");
  if (item) inventory.totalWeight += item.weight;
  equipment.armor = armorId;
}

function givePotion(world: World, enemy: number): void {
  const potion = createHealingPotion(world, 0, 0);
  world.removeComponent(potion, "Position");
  const inventory = world.getComponent(enemy, "Inventory")!;
  inventory.items.push(potion);
  const item = world.getComponent(potion, "Item");
  if (item) inventory.totalWeight += item.weight;
}

function createBaseEnemy(
  world: World,
  config: EnemyConfig,
  opts: {
    char: string;
    fg: string;
    hp: number;
    str: number;
    def: number;
    speed: number;
    vision: number;
    alertDuration: number;
    ai: AIControlled;
  },
): number {
  const scale = 1 + (config.intensity ?? 0) * 0.5;
  const hp = Math.floor((opts.hp + config.difficulty * 1.5) * scale);
  const str = Math.floor((opts.str + config.difficulty * 0.5) * scale);
  const def = Math.floor((opts.def + config.difficulty * 0.3) * scale);

  const entity = world.createEntity();
  world.addComponent(entity, "Position", { x: config.x, y: config.y });
  world.addComponent(entity, "Renderable", {
    char: opts.char,
    fg: opts.fg,
    bg: "black",
  });
  world.addComponent(entity, "Health", { current: hp, max: hp });
  world.addComponent(entity, "Stats", {
    strength: str,
    defense: def,
    speed: opts.speed,
  });
  world.addComponent(entity, "TurnActor", {
    hasActed: false,
    movementRemaining: opts.speed,
    secondaryUsed: false,
  });
  world.addComponent(entity, "AIControlled", opts.ai);
  world.addComponent(entity, "Collidable", { blocksMovement: true });
  world.addComponent(entity, "Faction", { factionId: "enemy" });
  world.addComponent(entity, "Senses", { vision: { range: opts.vision } });
  world.addComponent(entity, "Awareness", {
    state: "idle",
    lastKnownTarget: null,
    alertDuration: opts.alertDuration,
    turnsWithoutTarget: 0,
  });
  world.addComponent(entity, "Inventory", {
    items: [],
    totalWeight: 0,
    carryCapacity: 50,
  });
  world.addComponent(entity, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });

  return entity;
}

export function createRotwoodArcher(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
  intensity: number = 0,
  rng: () => number = Math.random,
): number {
  const entity = createBaseEnemy(
    world,
    { x, y, player, difficulty, intensity },
    {
      char: "a",
      fg: "brightYellow",
      hp: 6,
      str: 2,
      def: 1,
      speed: 2,
      vision: 7,
      alertDuration: 4,
      ai: { pattern: "archer", targetEntity: player },
    },
  );

  const bow = createShortBow(world, 0, 0);
  equipWeapon(world, entity, bow);

  if (rng() < 0.25) givePotion(world, entity);

  return entity;
}

export function createThornbackGuardian(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
  intensity: number = 0,
): number {
  const entity = createBaseEnemy(
    world,
    { x, y, player, difficulty, intensity },
    {
      char: "\u{040B}",
      fg: "brightGreen",
      hp: 15,
      str: 4,
      def: 4,
      speed: 1,
      vision: 5,
      alertDuration: 3,
      ai: { pattern: "guardian", targetEntity: player, canDrinkPotions: true },
    },
  );

  const spear = createIronSpear(world, 0, 0);
  equipWeapon(world, entity, spear);

  const armor = createChainmail(world, 0, 0);
  equipArmor(world, entity, armor);

  givePotion(world, entity);

  return entity;
}

export function createBlightvinesSkulker(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
  intensity: number = 0,
  rng: () => number = Math.random,
): number {
  const entity = createBaseEnemy(
    world,
    { x, y, player, difficulty, intensity },
    {
      char: "\u{03DB}",
      fg: "green",
      hp: 7,
      str: 4,
      def: 1,
      speed: 3,
      vision: 6,
      alertDuration: 6,
      ai: { pattern: "skulker", targetEntity: player },
    },
  );

  const sword = createIronSword(world, 0, 0);
  equipWeapon(world, entity, sword);

  if (rng() < 0.25) givePotion(world, entity);

  return entity;
}

export function createHollowPatrol(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
  intensity: number = 0,
  patrolPath?: { x: number; y: number }[],
  rng: () => number = Math.random,
): number {
  const entity = createBaseEnemy(
    world,
    { x, y, player, difficulty, intensity },
    {
      char: "\u{020E}",
      fg: "gray",
      hp: 10,
      str: 3,
      def: 2,
      speed: 2,
      vision: 6,
      alertDuration: 5,
      ai: {
        pattern: "patrol",
        targetEntity: player,
        patrolPath: patrolPath ?? [{ x, y }],
        patrolIndex: 0,
      },
    },
  );

  const weapon = createSwordAndShield(world, 0, 0);
  equipWeapon(world, entity, weapon);

  if (rng() < 0.3) givePotion(world, entity);

  return entity;
}
