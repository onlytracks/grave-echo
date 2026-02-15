import { World } from "./ecs/world.ts";
import { generateDungeon } from "./map/dungeon-generator.ts";
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

  const room1Center = {
    x: Math.floor(rooms[0]!.x + rooms[0]!.width / 2),
    y: Math.floor(rooms[0]!.y + rooms[0]!.height / 2),
  };

  const player = world.createEntity();
  world.addComponent(player, "Position", {
    x: room1Center.x,
    y: room1Center.y,
  });
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

  const r0 = rooms[0]!;
  createIronSword(world, r0.x + 1, r0.y + 1);
  if (rooms.length > 1) {
    const r1 = rooms[1]!;
    createShortBow(
      world,
      Math.floor(r1.x + r1.width / 2),
      Math.floor(r1.y + r1.height / 2) + 1,
    );
  }
  if (rooms.length > 2) {
    const r2 = rooms[2]!;
    createHealingPotion(
      world,
      Math.floor(r2.x + r2.width / 2),
      Math.floor(r2.y + r2.height / 2) + 1,
    );
  }

  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i]!;
    const cx = Math.floor(room.x + room.width / 2);
    const cy = Math.floor(room.y + room.height / 2);

    const goblin = world.createEntity();
    world.addComponent(goblin, "Position", { x: cx, y: cy });
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
