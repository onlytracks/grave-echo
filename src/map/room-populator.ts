import type { World } from "../ecs/world.ts";
import type { Room } from "./dungeon-generator.ts";
import {
  createIronSword,
  createShortBow,
  createHealingPotion,
} from "../items/item-factory.ts";
import type { MessageLog } from "../ecs/systems/messages.ts";

export interface PopulatorConfig {
  difficulty: number;
}

type ItemFactory = (world: World, x: number, y: number) => number;

const ITEM_POOL: { factory: ItemFactory; weight: number }[] = [
  { factory: createIronSword, weight: 3 },
  { factory: createShortBow, weight: 3 },
  { factory: createHealingPotion, weight: 4 },
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
    carryCapacity: 30,
  });
  world.addComponent(player, "Equipment", { weapon: null });
  world.addComponent(player, "Senses", { vision: { range: 8 } });
  world.addComponent(player, "Awareness", {
    state: "idle",
    lastKnownTarget: null,
    alertDuration: 0,
    turnsWithoutTarget: 0,
  });
  return player;
}

function createGoblin(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
): number {
  const hp = Math.floor(8 + difficulty * 1.5);
  const str = Math.floor(3 + difficulty * 0.5);
  const def = Math.floor(1 + difficulty * 0.3);
  const goblin = world.createEntity();
  world.addComponent(goblin, "Position", { x, y });
  world.addComponent(goblin, "Renderable", {
    char: "g",
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
  return goblin;
}

function createBoss(
  world: World,
  x: number,
  y: number,
  player: number,
  difficulty: number,
): number {
  const hp = Math.floor(20 + difficulty * 3);
  const str = Math.floor(5 + difficulty);
  const def = Math.floor(3 + difficulty * 0.5);
  const boss = world.createEntity();
  world.addComponent(boss, "Position", { x, y });
  world.addComponent(boss, "Renderable", {
    char: "G",
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
  return boss;
}

export function populateRooms(
  world: World,
  rooms: Room[],
  config: PopulatorConfig,
  messages?: MessageLog,
  rng: () => number = Math.random,
): { player: number } {
  let playerEntity = -1;

  for (const room of rooms) {
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
            );
            messages?.add(
              `[spawn] G#${boss} at (${sp.x},${sp.y}) [boss]`,
              "debug",
            );
          } else {
            const goblin = createGoblin(
              world,
              sp.x,
              sp.y,
              playerEntity,
              config.difficulty,
            );
            messages?.add(
              `[spawn] g#${goblin} at (${sp.x},${sp.y}) [charger]`,
              "debug",
            );
          }
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
