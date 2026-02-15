import { World } from "./ecs/world.ts";
import { generateDungeon, roomCenter } from "./map/dungeon-generator.ts";
import { AnsiRenderer } from "./renderer/ansi.ts";
import { enableRawMode, disableRawMode } from "./input/input-handler.ts";
import { Game } from "./game.ts";
import {
  createIronSword,
  createShortBow,
  createHealingPotion,
} from "./items/item-factory.ts";

function main(): void {
  const world = new World();
  const { map, rooms } = generateDungeon();
  const renderer = new AnsiRenderer();

  const spawn = roomCenter(rooms[0]!);

  const player = world.createEntity();
  world.addComponent(player, "Position", { x: spawn.x, y: spawn.y });
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

  const itemFactories = [createIronSword, createShortBow, createHealingPotion];
  for (let i = 0; i < itemFactories.length && i < rooms.length; i++) {
    const room = rooms[i]!;
    const c = roomCenter(room);
    const floor =
      room.floors.find((f) => f.x === c.x + 1 && f.y === c.y) ??
      room.floors.find((f) => f.x !== c.x || f.y !== c.y) ??
      room.floors[0]!;
    itemFactories[i]!(world, floor.x, floor.y);
  }

  for (let i = 1; i < rooms.length; i++) {
    const c = roomCenter(rooms[i]!);

    const goblin = world.createEntity();
    world.addComponent(goblin, "Position", { x: c.x, y: c.y });
    world.addComponent(goblin, "Renderable", {
      char: "g",
      fg: "red",
      bg: "black",
    });
    world.addComponent(goblin, "Health", { current: 8, max: 8 });
    world.addComponent(goblin, "Stats", { strength: 3, defense: 1, speed: 2 });
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
  }

  enableRawMode();
  renderer.init();

  const shutdown = () => {
    renderer.shutdown();
    disableRawMode();
  };

  process.on("SIGINT", () => {
    shutdown();
    process.exit(0);
  });

  const game = new Game(world, map, renderer);
  game
    .run()
    .then(shutdown)
    .catch((err) => {
      shutdown();
      console.error(err);
      process.exit(1);
    });
}

main();
