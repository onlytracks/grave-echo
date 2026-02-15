import { World } from "./ecs/world.ts";
import { buildTestRoom } from "./map/room-builder.ts";
import { AnsiRenderer } from "./renderer/ansi.ts";
import { enableRawMode, disableRawMode } from "./input/input-handler.ts";
import { Game } from "./game.ts";

function main(): void {
  const world = new World();
  const map = buildTestRoom();
  const renderer = new AnsiRenderer();

  const player = world.createEntity();
  world.addComponent(player, "Position", { x: 10, y: 7 });
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
  });
  world.addComponent(player, "Faction", { factionId: "player" });

  const goblin = world.createEntity();
  world.addComponent(goblin, "Position", { x: 3, y: 3 });
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
  });
  world.addComponent(goblin, "AIControlled", {
    pattern: "charger",
    targetEntity: player,
  });
  world.addComponent(goblin, "Collidable", { blocksMovement: true });
  world.addComponent(goblin, "Faction", { factionId: "enemy" });

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
