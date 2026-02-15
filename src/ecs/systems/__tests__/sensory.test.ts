import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE, WALL_TILE } from "../../../map/game-map.ts";
import {
  hasLineOfSight,
  computeVisibleTiles,
  updateAwareness,
  updatePlayerAwareness,
  computePlayerFOW,
} from "../sensory.ts";

function makeOpenMap(w: number, h: number): GameMap {
  return new GameMap(w, h, FLOOR_TILE);
}

function makeWalledMap(w: number, h: number): GameMap {
  const map = new GameMap(w, h, FLOOR_TILE);
  for (let x = 0; x < w; x++) {
    map.setTile(x, 0, { ...WALL_TILE });
    map.setTile(x, h - 1, { ...WALL_TILE });
  }
  for (let y = 0; y < h; y++) {
    map.setTile(0, y, { ...WALL_TILE });
    map.setTile(w - 1, y, { ...WALL_TILE });
  }
  return map;
}

describe("hasLineOfSight", () => {
  test("clear line between two floor tiles returns true", () => {
    const map = makeOpenMap(10, 10);
    expect(hasLineOfSight(map, 1, 1, 5, 1)).toBe(true);
  });

  test("wall blocking the path returns false", () => {
    const map = makeOpenMap(10, 10);
    map.setTile(3, 1, { ...WALL_TILE });
    expect(hasLineOfSight(map, 1, 1, 5, 1)).toBe(false);
  });

  test("adjacent tiles always have LOS", () => {
    const map = makeOpenMap(10, 10);
    expect(hasLineOfSight(map, 5, 5, 5, 6)).toBe(true);
    expect(hasLineOfSight(map, 5, 5, 6, 5)).toBe(true);
    expect(hasLineOfSight(map, 5, 5, 6, 6)).toBe(true);
  });

  test("same tile returns true", () => {
    const map = makeOpenMap(10, 10);
    expect(hasLineOfSight(map, 3, 3, 3, 3)).toBe(true);
  });

  test("diagonal lines blocked by walls", () => {
    const map = makeOpenMap(10, 10);
    map.setTile(3, 3, { ...WALL_TILE });
    expect(hasLineOfSight(map, 1, 1, 5, 5)).toBe(false);
  });

  test("edge of vision range is visible if unblocked", () => {
    const map = makeOpenMap(20, 20);
    expect(hasLineOfSight(map, 5, 5, 13, 5)).toBe(true);
  });
});

describe("computeVisibleTiles", () => {
  test("open room: all tiles within range are visible", () => {
    const map = makeOpenMap(20, 20);
    const visible = computeVisibleTiles(map, 10, 10, 3);
    expect(visible.has("10,10")).toBe(true);
    expect(visible.has("11,10")).toBe(true);
    expect(visible.has("13,10")).toBe(true);
    expect(visible.has("10,13")).toBe(true);
  });

  test("wall blocks tiles behind it", () => {
    const map = makeOpenMap(20, 20);
    map.setTile(12, 10, { ...WALL_TILE });
    const visible = computeVisibleTiles(map, 10, 10, 5);
    expect(visible.has("12,10")).toBe(true); // wall itself is visible
    expect(visible.has("13,10")).toBe(false); // behind wall
  });

  test("vision doesn't extend beyond range", () => {
    const map = makeOpenMap(30, 30);
    const visible = computeVisibleTiles(map, 15, 15, 3);
    expect(visible.has("19,15")).toBe(false); // 4 tiles away
    expect(visible.has("15,19")).toBe(false);
  });

  test("returns set of coordinate strings", () => {
    const map = makeOpenMap(10, 10);
    const visible = computeVisibleTiles(map, 5, 5, 1);
    for (const key of visible) {
      expect(key).toMatch(/^\d+,\d+$/);
    }
  });
});

describe("updateAwareness", () => {
  function setupWorld() {
    const world = new World();
    const map = makeOpenMap(20, 20);

    const enemy = world.createEntity();
    world.addComponent(enemy, "Position", { x: 5, y: 5 });
    world.addComponent(enemy, "Faction", { factionId: "enemy" });
    world.addComponent(enemy, "Senses", { vision: { range: 6 } });
    world.addComponent(enemy, "Awareness", {
      state: "idle",
      lastKnownTarget: null,
      alertDuration: 3,
      turnsWithoutTarget: 0,
    });
    world.addComponent(enemy, "AIControlled", {
      pattern: "charger",
      targetEntity: null,
    });

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 8, y: 5 });
    world.addComponent(player, "Faction", { factionId: "player" });

    return { world, map, enemy, player };
  }

  test("entity detects hostile in vision range → state becomes alert", () => {
    const { world, map, enemy, player } = setupWorld();
    updateAwareness(world, map, enemy);
    const awareness = world.getComponent(enemy, "Awareness")!;
    expect(awareness.state).toBe("alert");
    expect(awareness.lastKnownTarget).toEqual({ x: 8, y: 5 });
    const ai = world.getComponent(enemy, "AIControlled")!;
    expect(ai.targetEntity).toBe(player);
  });

  test("entity doesn't detect hostile out of range → stays idle", () => {
    const { world, map, enemy } = setupWorld();
    world.getComponent(world.query("Faction")[1]!, "Position")!.x = 15;
    updateAwareness(world, map, enemy);
    const awareness = world.getComponent(enemy, "Awareness")!;
    expect(awareness.state).toBe("idle");
  });

  test("entity loses sight of hostile → turnsWithoutTarget increments", () => {
    const { world, map, enemy } = setupWorld();
    updateAwareness(world, map, enemy);
    expect(world.getComponent(enemy, "Awareness")!.state).toBe("alert");

    // move player out of sight
    const players = world.query("Faction");
    const player = players.find(
      (e) => world.getComponent(e, "Faction")!.factionId === "player",
    )!;
    world.getComponent(player, "Position")!.x = 19;

    updateAwareness(world, map, enemy);
    expect(world.getComponent(enemy, "Awareness")!.turnsWithoutTarget).toBe(1);
    expect(world.getComponent(enemy, "Awareness")!.state).toBe("alert");
  });

  test("turnsWithoutTarget exceeds alertDuration → state becomes idle", () => {
    const { world, map, enemy } = setupWorld();
    updateAwareness(world, map, enemy); // alert

    const players = world.query("Faction");
    const player = players.find(
      (e) => world.getComponent(e, "Faction")!.factionId === "player",
    )!;
    world.getComponent(player, "Position")!.x = 19;

    for (let i = 0; i < 4; i++) {
      updateAwareness(world, map, enemy);
    }
    expect(world.getComponent(enemy, "Awareness")!.state).toBe("idle");
    expect(world.getComponent(enemy, "Awareness")!.lastKnownTarget).toBeNull();
  });

  test("re-detecting hostile resets turnsWithoutTarget to 0", () => {
    const { world, map, enemy } = setupWorld();
    const awareness = world.getComponent(enemy, "Awareness")!;
    awareness.state = "alert";
    awareness.turnsWithoutTarget = 2;

    updateAwareness(world, map, enemy);
    expect(awareness.turnsWithoutTarget).toBe(0);
    expect(awareness.state).toBe("alert");
  });

  test("wall between entity and hostile → no detection", () => {
    const { world, map, enemy } = setupWorld();
    map.setTile(7, 5, { ...WALL_TILE });
    updateAwareness(world, map, enemy);
    const awareness = world.getComponent(enemy, "Awareness")!;
    expect(awareness.state).toBe("idle");
  });
});

describe("computePlayerFOW", () => {
  test("visible tiles are marked as explored on the map", () => {
    const world = new World();
    const map = makeOpenMap(20, 20);

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 10, y: 10 });
    world.addComponent(player, "PlayerControlled", {});
    world.addComponent(player, "Senses", { vision: { range: 3 } });

    const visible = computePlayerFOW(world, map);
    expect(visible.has("10,10")).toBe(true);
    expect(map.isExplored(10, 10)).toBe(true);
    expect(map.isExplored(11, 10)).toBe(true);
  });

  test("player can't see around corners", () => {
    const world = new World();
    const map = makeOpenMap(20, 20);
    // wall at 12,10
    map.setTile(12, 10, { ...WALL_TILE });

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 10, y: 10 });
    world.addComponent(player, "PlayerControlled", {});
    world.addComponent(player, "Senses", { vision: { range: 5 } });

    const visible = computePlayerFOW(world, map);
    expect(visible.has("12,10")).toBe(true); // wall visible
    expect(visible.has("13,10")).toBe(false); // behind wall
  });

  test("previously explored tiles remain explored after moving away", () => {
    const world = new World();
    const map = makeOpenMap(30, 30);

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 5, y: 5 });
    world.addComponent(player, "PlayerControlled", {});
    world.addComponent(player, "Senses", { vision: { range: 3 } });

    computePlayerFOW(world, map);
    expect(map.isExplored(5, 5)).toBe(true);
    expect(map.isExplored(7, 5)).toBe(true);

    // move player far away
    world.getComponent(player, "Position")!.x = 25;
    world.getComponent(player, "Position")!.y = 25;
    computePlayerFOW(world, map);

    // original location still explored
    expect(map.isExplored(5, 5)).toBe(true);
    expect(map.isExplored(7, 5)).toBe(true);
    // new location also explored
    expect(map.isExplored(25, 25)).toBe(true);
  });
});

describe("updatePlayerAwareness", () => {
  function setupPlayerAwarenessWorld() {
    const world = new World();
    const map = makeOpenMap(20, 20);

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 5, y: 5 });
    world.addComponent(player, "PlayerControlled", {});
    world.addComponent(player, "Faction", { factionId: "player" });
    world.addComponent(player, "Senses", { vision: { range: 8 } });
    world.addComponent(player, "Awareness", {
      state: "idle",
      lastKnownTarget: null,
      alertDuration: 0,
      turnsWithoutTarget: 0,
    });

    return { world, map, player };
  }

  function addEnemy(
    world: World,
    x: number,
    y: number,
    visionRange: number = 6,
  ) {
    const enemy = world.createEntity();
    world.addComponent(enemy, "Position", { x, y });
    world.addComponent(enemy, "Faction", { factionId: "enemy" });
    world.addComponent(enemy, "Senses", { vision: { range: visionRange } });
    world.addComponent(enemy, "Awareness", {
      state: "idle",
      lastKnownTarget: null,
      alertDuration: 3,
      turnsWithoutTarget: 0,
    });
    return enemy;
  }

  test("enemy within its vision range with LOS alerts the player", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    addEnemy(world, 8, 5, 6); // d=3, vis=6 → can sense player
    const visible = computeVisibleTiles(map, 5, 5, 8);
    updatePlayerAwareness(world, map, visible);
    const awareness = world.getComponent(player, "Awareness")!;
    expect(awareness.state).toBe("alert");
  });

  test("enemy outside its own vision range does NOT alert player", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    addEnemy(world, 12, 5, 6); // d=7, vis=6 → can't sense player
    const visible = computeVisibleTiles(map, 5, 5, 8);
    updatePlayerAwareness(world, map, visible);
    const awareness = world.getComponent(player, "Awareness")!;
    expect(awareness.state).toBe("idle");
  });

  test("no feedback loop: player visible to player but not to enemy stays idle", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    // Enemy at d=7 with vis=6, player has vis=8 → player sees enemy but enemy can't see player
    const enemy = addEnemy(world, 12, 5, 6);
    world.getComponent(enemy, "Awareness")!.state = "alert"; // enemy is alert from prior turn
    const visible = computeVisibleTiles(map, 5, 5, 8);
    updatePlayerAwareness(world, map, visible);
    const awareness = world.getComponent(player, "Awareness")!;
    expect(awareness.state).toBe("idle");
  });

  test("player goes idle immediately when stepping out of enemy vision", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    addEnemy(world, 8, 5, 6); // d=3, can sense
    const visible1 = computeVisibleTiles(map, 5, 5, 8);
    updatePlayerAwareness(world, map, visible1);
    expect(world.getComponent(player, "Awareness")!.state).toBe("alert");

    // Move player out of enemy vision range (d=7 > vis=6)
    world.getComponent(player, "Position")!.x = 1;
    const visible2 = computeVisibleTiles(map, 1, 5, 8);
    updatePlayerAwareness(world, map, visible2);
    expect(world.getComponent(player, "Awareness")!.state).toBe("idle");
  });

  test("wall between enemy and player blocks sensing → player stays idle", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    addEnemy(world, 8, 5, 6); // d=3, vis=6
    map.setTile(7, 5, { ...WALL_TILE }); // wall blocks LOS
    const visible = computeVisibleTiles(map, 5, 5, 8);
    updatePlayerAwareness(world, map, visible);
    const awareness = world.getComponent(player, "Awareness")!;
    expect(awareness.state).toBe("idle");
  });

  test("player transitions back to idle when sensing enemy dies", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    const enemy = addEnemy(world, 8, 5, 6);
    const visible = computeVisibleTiles(map, 5, 5, 8);
    updatePlayerAwareness(world, map, visible);
    expect(world.getComponent(player, "Awareness")!.state).toBe("alert");

    world.destroyEntity(enemy);
    updatePlayerAwareness(world, map, visible);
    expect(world.getComponent(player, "Awareness")!.state).toBe("idle");
  });

  test("neutral faction enemy does not alert player", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    const neutral = world.createEntity();
    world.addComponent(neutral, "Position", { x: 6, y: 5 });
    world.addComponent(neutral, "Faction", { factionId: "neutral" });
    world.addComponent(neutral, "Senses", { vision: { range: 6 } });
    const visible = computeVisibleTiles(map, 5, 5, 8);
    updatePlayerAwareness(world, map, visible);
    const awareness = world.getComponent(player, "Awareness")!;
    expect(awareness.state).toBe("idle");
  });

  test("computePlayerFOW also updates player awareness", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    addEnemy(world, 8, 5, 6); // d=3, vis=6 → can sense
    computePlayerFOW(world, map);
    const awareness = world.getComponent(player, "Awareness")!;
    expect(awareness.state).toBe("alert");
  });

  test("idle enemy in vision goes alert → player goes alert via computePlayerFOW", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    const enemy = addEnemy(world, 8, 5, 6);
    world.addComponent(enemy, "AIControlled", {
      pattern: "charger",
      targetEntity: null,
    });

    computePlayerFOW(world, map);

    const enemyAwareness = world.getComponent(enemy, "Awareness")!;
    expect(enemyAwareness.state).toBe("alert");

    const playerAwareness = world.getComponent(player, "Awareness")!;
    expect(playerAwareness.state).toBe("alert");
  });

  test("gameplay messages on alert transitions", () => {
    const { world, map, player } = setupPlayerAwarenessWorld();
    const { MessageLog } = require("../messages.ts");
    const messages = new MessageLog();
    const enemy = addEnemy(world, 8, 5, 6);
    const visible = computeVisibleTiles(map, 5, 5, 8);

    updatePlayerAwareness(world, map, visible, messages);
    const allMsgs = messages.getAllMessagesWithTurns();
    const gameplay = allMsgs.filter(
      (m: { category: string }) => m.category === "gameplay",
    );
    expect(gameplay.length).toBe(1);
    expect(gameplay[0].text).toBe("You sense danger nearby!");

    // Move out of range → idle transition
    world.getComponent(player, "Position")!.x = 1;
    const visible2 = computeVisibleTiles(map, 1, 5, 8);
    updatePlayerAwareness(world, map, visible2, messages);
    const allMsgs2 = messages.getAllMessagesWithTurns();
    const gameplay2 = allMsgs2.filter(
      (m: { category: string }) => m.category === "gameplay",
    );
    expect(gameplay2.length).toBe(2);
    expect(gameplay2[1].text).toBe("The threat has passed.");
  });
});

describe("AI gating", () => {
  test("idle AI entity does not move", () => {
    const world = new World();
    const map = makeOpenMap(20, 20);

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 15, y: 5 });
    world.addComponent(player, "Faction", { factionId: "player" });

    const enemy = world.createEntity();
    world.addComponent(enemy, "Position", { x: 5, y: 5 });
    world.addComponent(enemy, "Faction", { factionId: "enemy" });
    world.addComponent(enemy, "Senses", { vision: { range: 6 } });
    world.addComponent(enemy, "Awareness", {
      state: "idle",
      lastKnownTarget: null,
      alertDuration: 3,
      turnsWithoutTarget: 0,
    });
    world.addComponent(enemy, "AIControlled", {
      pattern: "charger",
      targetEntity: null,
    });
    world.addComponent(enemy, "TurnActor", {
      hasActed: false,
      movementRemaining: 2,
      secondaryUsed: false,
    });
    world.addComponent(enemy, "Stats", {
      strength: 3,
      defense: 1,
      speed: 2,
    });
    world.addComponent(enemy, "Collidable", { blocksMovement: true });

    const { processAI } = require("../ai.ts");
    const { MessageLog } = require("../messages.ts");
    const messages = new MessageLog();
    processAI(world, map, messages);

    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBe(5); // didn't move
    expect(pos.y).toBe(5);
  });

  test("alert AI entity moves toward target", () => {
    const world = new World();
    const map = makeOpenMap(20, 20);

    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 8, y: 5 });
    world.addComponent(player, "Faction", { factionId: "player" });
    world.addComponent(player, "Collidable", { blocksMovement: true });
    world.addComponent(player, "Health", { current: 20, max: 20 });
    world.addComponent(player, "Stats", {
      strength: 5,
      defense: 2,
      speed: 3,
    });

    const enemy = world.createEntity();
    world.addComponent(enemy, "Position", { x: 5, y: 5 });
    world.addComponent(enemy, "Faction", { factionId: "enemy" });
    world.addComponent(enemy, "Senses", { vision: { range: 6 } });
    world.addComponent(enemy, "Awareness", {
      state: "idle",
      lastKnownTarget: null,
      alertDuration: 3,
      turnsWithoutTarget: 0,
    });
    world.addComponent(enemy, "AIControlled", {
      pattern: "charger",
      targetEntity: null,
    });
    world.addComponent(enemy, "TurnActor", {
      hasActed: false,
      movementRemaining: 2,
      secondaryUsed: false,
    });
    world.addComponent(enemy, "Stats", {
      strength: 3,
      defense: 1,
      speed: 2,
    });
    world.addComponent(enemy, "Collidable", { blocksMovement: true });

    const { processAI } = require("../ai.ts");
    const { MessageLog } = require("../messages.ts");
    const messages = new MessageLog();
    processAI(world, map, messages);

    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBeGreaterThan(5); // moved toward player
  });
});
