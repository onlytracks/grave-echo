import type { World } from "../ecs/world.ts";
import type { Room } from "./dungeon-generator.ts";
import type { Zone } from "./zones.ts";
import {
  createIronSword,
  createSwordAndShield,
  createBattleAxe,
  createMaceAndShield,
  createIronSpear,
  createHalberd,
  createShortBow,
  createCrossbow,
  createOakStaff,
  createWand,
  createLeatherArmor,
  createChainmail,
  createPlateArmor,
  createIronRing,
  createWardAmulet,
  createSwiftBoots,
  createHealingPotion,
  createSpeedPotion,
  createStrengthPotion,
  createDefensePotion,
} from "../items/item-factory.ts";
import {
  createRotwoodArcher,
  createThornbackGuardian,
  createBlightvinesSkulker,
  createHollowPatrol,
} from "../enemies/enemy-factory.ts";
import type { MessageLog } from "../ecs/systems/messages.ts";

export interface PopulatorConfig {
  difficulty: number;
}

type ItemFactory = (world: World, x: number, y: number) => number;

const ITEM_POOL: { factory: ItemFactory; weight: number }[] = [
  // Weapons (weight 2 each)
  { factory: createIronSword, weight: 2 },
  { factory: createSwordAndShield, weight: 2 },
  { factory: createBattleAxe, weight: 2 },
  { factory: createMaceAndShield, weight: 2 },
  { factory: createIronSpear, weight: 2 },
  { factory: createHalberd, weight: 2 },
  { factory: createShortBow, weight: 2 },
  { factory: createCrossbow, weight: 2 },
  { factory: createOakStaff, weight: 2 },
  { factory: createWand, weight: 2 },
  // Armor (weight 3 each)
  { factory: createLeatherArmor, weight: 3 },
  { factory: createChainmail, weight: 3 },
  { factory: createPlateArmor, weight: 3 },
  // Accessories (weight 2 each)
  { factory: createIronRing, weight: 2 },
  { factory: createWardAmulet, weight: 2 },
  { factory: createSwiftBoots, weight: 2 },
  // Consumables
  { factory: createHealingPotion, weight: 3 },
  { factory: createSpeedPotion, weight: 2 },
  { factory: createStrengthPotion, weight: 2 },
  { factory: createDefensePotion, weight: 2 },
];

function pickItem(rng: () => number): ItemFactory {
  const totalWeight = ITEM_POOL.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * totalWeight;
  for (const entry of ITEM_POOL) {
    roll -= entry.weight;
    if (roll <= 0) return entry.factory;
  }
  return ITEM_POOL[0]!.factory;
}

function createPlayer(world: World, x: number, y: number): number {
  const player = world.createEntity();
  world.addComponent(player, "Position", { x, y });
  world.addComponent(player, "Renderable", {
    char: "@",
    fg: "brightWhite",
    bg: "black",
  });
  world.addComponent(player, "PlayerControlled", {});
  world.addComponent(player, "Collidable", { blocksMovement: true });
  world.addComponent(player, "Health", { current: 20, max: 20 });
  world.addComponent(player, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(player, "TurnActor", {
    hasActed: false,
    movementRemaining: 3,
    secondaryUsed: false,
  });
  world.addComponent(player, "Faction", { factionId: "player" });
  world.addComponent(player, "Inventory", {
    items: [],
    totalWeight: 0,
    carryCapacity: 40,
  });
  world.addComponent(player, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });
  world.addComponent(player, "Buffs", { active: [] });
  world.addComponent(player, "Senses", { vision: { range: 8 } });
  world.addComponent(player, "Awareness", {
    state: "idle",
    lastKnownTarget: null,
    alertDuration: 0,
    turnsWithoutTarget: 0,
  });
  world.addComponent(player, "TargetSelection", { targetEntity: null });
  return player;
}

function createGoblin(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
  intensity: number = 0,
  rng: () => number = Math.random,
): number {
  const scale = 1 + intensity * 0.5;
  const hp = Math.floor((8 + difficulty * 1.5) * scale);
  const str = Math.floor((3 + difficulty * 0.5) * scale);
  const def = Math.floor((1 + difficulty * 0.3) * scale);
  const goblin = world.createEntity();
  world.addComponent(goblin, "Position", { x, y });
  world.addComponent(goblin, "Renderable", {
    char: "\u{0121}",
    fg: "red",
    bg: "black",
  });
  world.addComponent(goblin, "Health", { current: hp, max: hp });
  world.addComponent(goblin, "Stats", {
    strength: str,
    defense: def,
    speed: 2,
  });
  world.addComponent(goblin, "TurnActor", {
    hasActed: false,
    movementRemaining: 2,
    secondaryUsed: false,
  });
  world.addComponent(goblin, "AIControlled", {
    pattern: "charger",
    targetEntity: player,
  });
  world.addComponent(goblin, "Collidable", { blocksMovement: true });
  world.addComponent(goblin, "Faction", { factionId: "enemy" });
  world.addComponent(goblin, "Senses", { vision: { range: 6 } });
  world.addComponent(goblin, "Awareness", {
    state: "idle",
    lastKnownTarget: null,
    alertDuration: 5,
    turnsWithoutTarget: 0,
  });
  world.addComponent(goblin, "Inventory", {
    items: [],
    totalWeight: 0,
    carryCapacity: 50,
  });
  world.addComponent(goblin, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });

  const weapon = createIronSword(world, 0, 0);
  world.removeComponent(weapon, "Position");
  const inv = world.getComponent(goblin, "Inventory")!;
  const equip = world.getComponent(goblin, "Equipment")!;
  inv.items.push(weapon);
  const itemComp = world.getComponent(weapon, "Item");
  if (itemComp) inv.totalWeight += itemComp.weight;
  equip.weapon = weapon;

  if (rng() < 0.3) {
    const potion = createHealingPotion(world, 0, 0);
    world.removeComponent(potion, "Position");
    inv.items.push(potion);
    const potionItem = world.getComponent(potion, "Item");
    if (potionItem) inv.totalWeight += potionItem.weight;
  }

  return goblin;
}

function createBoss(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
  intensity: number = 1,
  _rng: () => number = Math.random,
): number {
  const scale = 1 + intensity * 0.5;
  const hp = Math.floor((20 + difficulty * 3) * scale);
  const str = Math.floor((5 + difficulty) * scale);
  const def = Math.floor((2 + difficulty * 0.5) * scale);
  const boss = world.createEntity();
  world.addComponent(boss, "Position", { x, y });
  world.addComponent(boss, "Renderable", {
    char: "\u{0120}",
    fg: "brightRed",
    bg: "black",
  });
  world.addComponent(boss, "Health", { current: hp, max: hp });
  world.addComponent(boss, "Stats", { strength: str, defense: def, speed: 2 });
  world.addComponent(boss, "TurnActor", {
    hasActed: false,
    movementRemaining: 2,
    secondaryUsed: false,
  });
  world.addComponent(boss, "AIControlled", {
    pattern: "charger",
    targetEntity: player,
    canDrinkPotions: true,
  });
  world.addComponent(boss, "Collidable", { blocksMovement: true });
  world.addComponent(boss, "Faction", { factionId: "enemy" });
  world.addComponent(boss, "Senses", { vision: { range: 8 } });
  world.addComponent(boss, "Awareness", {
    state: "idle",
    lastKnownTarget: null,
    alertDuration: 8,
    turnsWithoutTarget: 0,
  });
  world.addComponent(boss, "Inventory", {
    items: [],
    totalWeight: 0,
    carryCapacity: 50,
  });
  world.addComponent(boss, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });

  const weapon = createBattleAxe(world, 0, 0);
  world.removeComponent(weapon, "Position");
  const inv = world.getComponent(boss, "Inventory")!;
  const equip = world.getComponent(boss, "Equipment")!;
  inv.items.push(weapon);
  const itemComp = world.getComponent(weapon, "Item");
  if (itemComp) inv.totalWeight += itemComp.weight;
  equip.weapon = weapon;

  const potion = createHealingPotion(world, 0, 0);
  world.removeComponent(potion, "Position");
  inv.items.push(potion);
  const potionItem = world.getComponent(potion, "Item");
  if (potionItem) inv.totalWeight += potionItem.weight;

  return boss;
}

function generatePatrolPath(room: Room): { x: number; y: number }[] {
  if (room.floors.length < 2) return [room.floors[0]!];
  const sorted = [...room.floors].sort((a, b) => a.x - b.x || a.y - b.y);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  return [
    { x: first.x, y: first.y },
    { x: last.x, y: last.y },
  ];
}

function spawnEnemyByContext(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
  intensity: number,
  tag: string,
  enemyIndex: number,
  rng: () => number,
  room: Room,
): number {
  if (tag === "loot") {
    return createThornbackGuardian(world, x, y, player, difficulty, intensity);
  }

  if (tag === "transition") {
    const path = generatePatrolPath(room);
    return createHollowPatrol(
      world,
      x,
      y,
      player,
      difficulty,
      intensity,
      path,
      rng,
    );
  }

  if (tag === "combat") {
    if (intensity < 0.3) {
      return createGoblin(world, x, y, player, difficulty, intensity, rng);
    }

    if (intensity < 0.6) {
      const roll = rng();
      if (enemyIndex === 0) {
        return createGoblin(world, x, y, player, difficulty, intensity, rng);
      }
      if (roll < 0.5) {
        return createRotwoodArcher(
          world,
          x,
          y,
          player,
          difficulty,
          intensity,
          rng,
        );
      }
      return createBlightvinesSkulker(
        world,
        x,
        y,
        player,
        difficulty,
        intensity,
        rng,
      );
    }

    if (enemyIndex === 0) {
      return createThornbackGuardian(
        world,
        x,
        y,
        player,
        difficulty,
        intensity,
      );
    }
    if (enemyIndex === 1) {
      return createRotwoodArcher(
        world,
        x,
        y,
        player,
        difficulty,
        intensity,
        rng,
      );
    }
    return createBlightvinesSkulker(
      world,
      x,
      y,
      player,
      difficulty,
      intensity,
      rng,
    );
  }

  return createGoblin(world, x, y, player, difficulty, intensity, rng);
}

export function populateRooms(
  world: World,
  rooms: Room[],
  config: PopulatorConfig,
  messages?: MessageLog,
  rng: () => number = Math.random,
  zones: Zone[] = [],
): { player: number } {
  let playerEntity = -1;
  let enemyIndex = 0;

  // Build room-to-zone lookup
  const roomToZone = new Map<number, Zone>();
  for (const zone of zones) {
    for (const ri of zone.rooms) {
      roomToZone.set(ri, zone);
    }
  }

  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri]!;
    const zone = roomToZone.get(ri);

    for (const sp of room.spawnPoints) {
      switch (sp.type) {
        case "player": {
          playerEntity = createPlayer(world, sp.x, sp.y);
          messages?.add(`[spawn] Player at (${sp.x},${sp.y})`, "debug");
          break;
        }
        case "enemy": {
          if (playerEntity === -1) break;
          if (room.tag === "boss") {
            const boss = createBoss(
              world,
              sp.x,
              sp.y,
              playerEntity,
              config.difficulty,
              room.intensity,
              rng,
            );
            messages?.add(
              `[spawn] G#${boss} at (${sp.x},${sp.y}) [boss, intensity=${room.intensity.toFixed(2)}, zone=${zone?.name ?? "?"}]`,
              "debug",
            );
          } else {
            const zoneDifficulty = zone
              ? config.difficulty * (0.8 + zone.intensity * 0.4)
              : config.difficulty;
            const enemy = spawnEnemyByContext(
              world,
              sp.x,
              sp.y,
              playerEntity,
              zoneDifficulty,
              room.intensity,
              room.tag,
              enemyIndex,
              rng,
              room,
            );
            const renderable = world.getComponent(enemy, "Renderable");
            const ai = world.getComponent(enemy, "AIControlled");
            messages?.add(
              `[spawn] ${renderable?.char ?? "?"}#${enemy} at (${sp.x},${sp.y}) [${ai?.pattern ?? "?"}, intensity=${room.intensity.toFixed(2)}, zone=${zone?.name ?? "?"}]`,
              "debug",
            );
          }
          enemyIndex++;
          break;
        }
        case "item": {
          const factory = pickItem(rng);
          const entity = factory(world, sp.x, sp.y);
          const item = world.getComponent(entity, "Item")!;
          messages?.add(`[spawn] ${item.name} at (${sp.x},${sp.y})`, "debug");
          break;
        }
      }
    }
  }

  if (playerEntity === -1) {
    throw new Error("No player spawn point found in any room");
  }

  return { player: playerEntity };
}
