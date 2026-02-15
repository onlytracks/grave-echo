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
