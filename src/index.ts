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
  world.addComponent(player, "Awareness", {
    state: "idle",
    lastKnownTarget: null,
    alertDuration: 0,
    turnsWithoutTarget: 0,
  });
  messages.add(`[spawn] Player at (${spawn.x},${spawn.y})`, "debug");

  const itemFactories = [createIronSword, createShortBow, createHealingPotion];
  for (let i = 0; i < itemFactories.length && i < rooms.length; i++) {
    const room = rooms[i]!;
    const c = roomCenter(room);
    const floor =
      room.floors.find((f) => f.x === c.x + 1 && f.y === c.y) ??
      room.floors.find((f) => f.x !== c.x || f.y !== c.y) ??
      room.floors[0]!;
    const entity = itemFactories[i]!(world, floor.x, floor.y);
    const item = world.getComponent(entity, "Item")!;
    const weapon = world.getComponent(entity, "Weapon");
    const consumable = world.getComponent(entity, "Consumable");
    let detail = `${item.weight} wt`;
    if (weapon) detail = `${weapon.damage} dmg, ${detail}`;
    if (consumable)
      detail = `${consumable.charges}/${consumable.maxCharges} charges`;
    messages.add(
      `[spawn] ${item.name} at (${floor.x},${floor.y}) [${detail}]`,
      "debug",
    );
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
    messages.add(
      `[spawn] g#${goblin} at (${c.x},${c.y}) [charger, 8hp]`,
      "debug",
    );
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
