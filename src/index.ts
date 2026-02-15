import { World } from "./ecs/world.ts";
import { generateDungeon } from "./map/dungeon-generator.ts";
import { populateRooms } from "./map/room-populator.ts";
import { AnsiRenderer } from "./renderer/ansi.ts";
import { enableRawMode, disableRawMode } from "./input/input-handler.ts";
import { Game } from "./game.ts";
import { MessageLog } from "./ecs/systems/messages.ts";

function main(): void {
  const world = new World();
  const { map, rooms } = generateDungeon();
  const renderer = new AnsiRenderer();
  const messages = new MessageLog();

  messages.add(
    `[spawn] Dungeon generated: ${rooms.length} rooms, ${map.width}x${map.height}`,
    "debug",
  );

  const tagSummary = rooms.map((r, i) => `${i}:${r.tag}`).join(", ");
  messages.add(`[spawn] Room tags: ${tagSummary}`, "debug");

  populateRooms(world, rooms, { difficulty: 1 }, messages);

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

  const game = new Game(world, map, renderer, messages);
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
