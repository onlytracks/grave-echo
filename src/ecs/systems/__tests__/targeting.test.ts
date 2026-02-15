import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE, WALL_TILE } from "../../../map/game-map.ts";
import { MessageLog } from "../messages.ts";
import {
  cycleTarget,
  clearStaleTarget,
  validateAttack,
  attemptRangedAttack,
  getVisibleHostiles,
} from "../targeting.ts";
import { processAI } from "../ai.ts";
import { resetAITurns } from "../turn.ts";
import { parseInput } from "../../../input/input-handler.ts";

function createMap(size = 20): GameMap {
  return new GameMap(size, size, FLOOR_TILE);
}

function createPlayer(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "PlayerControlled", {});
  world.addComponent(e, "Faction", { factionId: "player" });
  world.addComponent(e, "Health", { current: 20, max: 20 });
  world.addComponent(e, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(e, "TurnActor", {
    hasActed: false,
    movementRemaining: 3,
    secondaryUsed: false,
  });
  world.addComponent(e, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });
  world.addComponent(e, "TargetSelection", { targetEntity: null });
  world.addComponent(e, "Collidable", { blocksMovement: true });
  world.addComponent(e, "Renderable", { char: "@", fg: "white", bg: "black" });
  return e;
}

function createEnemy(world: World, x: number, y: number): number {
  const e = world.createEntity();
  world.addComponent(e, "Position", { x, y });
  world.addComponent(e, "Faction", { factionId: "enemy" });
  world.addComponent(e, "Health", { current: 10, max: 10 });
  world.addComponent(e, "Stats", { strength: 3, defense: 1, speed: 2 });
  world.addComponent(e, "Collidable", { blocksMovement: true });
  world.addComponent(e, "Renderable", { char: "g", fg: "red", bg: "black" });
  return e;
}

function equipWeapon(
  world: World,
  entity: number,
  opts: {
    damage: number;
    range: number;
    attackType: "melee" | "reach" | "ranged";
    weaponType?: string;
  },
): number {
  const w = world.createEntity();
  world.addComponent(w, "Weapon", {
    damage: opts.damage,
    range: opts.range,
    weaponType: (opts.weaponType ?? "sword") as "sword",
    attackType: opts.attackType,
    defenseBonus: 0,
  });
  world.addComponent(w, "Item", {
    name: "Test Weapon",
    weight: 5,
    rarity: "common",
  });
  const equip = world.getComponent(entity, "Equipment")!;
  equip.weapon = w;
  return w;
}

function visibleSetFrom(...positions: [number, number][]): Set<string> {
  const s = new Set<string>();
  for (const [x, y] of positions) s.add(`${x},${y}`);
  return s;
}

describe("Targeting — cycleTarget", () => {
  test("selects nearest hostile when no current target", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const far = createEnemy(world, 8, 5); // distance 3
    const near = createEnemy(world, 6, 5); // distance 1
    const visible = visibleSetFrom([5, 5], [6, 5], [8, 5]);

    cycleTarget(world, player, visible);
    expect(world.getComponent(player, "TargetSelection")!.targetEntity).toBe(
      near,
    );
  });

  test("cycles to next target", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const near = createEnemy(world, 6, 5);
    const far = createEnemy(world, 8, 5);
    const visible = visibleSetFrom([5, 5], [6, 5], [8, 5]);

    cycleTarget(world, player, visible);
    expect(world.getComponent(player, "TargetSelection")!.targetEntity).toBe(
      near,
    );

    cycleTarget(world, player, visible);
    expect(world.getComponent(player, "TargetSelection")!.targetEntity).toBe(
      far,
    );
  });

  test("wraps around to first target after last", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const near = createEnemy(world, 6, 5);
    const far = createEnemy(world, 8, 5);
    const visible = visibleSetFrom([5, 5], [6, 5], [8, 5]);

    cycleTarget(world, player, visible);
    cycleTarget(world, player, visible);
    cycleTarget(world, player, visible);
    expect(world.getComponent(player, "TargetSelection")!.targetEntity).toBe(
      near,
    );
  });

  test("clears target when no hostiles visible", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    createEnemy(world, 8, 5);
    const visible = visibleSetFrom([5, 5]); // enemy not visible

    cycleTarget(world, player, visible);
    expect(
      world.getComponent(player, "TargetSelection")!.targetEntity,
    ).toBeNull();
  });

  test("resets to nearest when current target no longer visible", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const e1 = createEnemy(world, 6, 5);
    const e2 = createEnemy(world, 7, 5);

    const ts = world.getComponent(player, "TargetSelection")!;
    ts.targetEntity = e2;

    // e2 no longer visible
    const visible = visibleSetFrom([5, 5], [6, 5]);
    cycleTarget(world, player, visible);
    expect(ts.targetEntity).toBe(e1);
  });

  test("sorts by distance then entity ID for stability", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const e1 = createEnemy(world, 7, 5); // distance 2
    const e2 = createEnemy(world, 5, 7); // distance 2
    const visible = visibleSetFrom([5, 5], [7, 5], [5, 7]);

    const hostiles = getVisibleHostiles(world, player, visible);
    // Same distance → sorted by entity ID
    expect(hostiles[0]).toBe(e1);
    expect(hostiles[1]).toBe(e2);
  });
});

describe("Targeting — clearStaleTarget", () => {
  test("clears target when entity is dead", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 5);
    const ts = world.getComponent(player, "TargetSelection")!;
    ts.targetEntity = enemy;

    world.getComponent(enemy, "Health")!.current = 0;
    clearStaleTarget(world, player, visibleSetFrom([5, 5], [6, 5]));
    expect(ts.targetEntity).toBeNull();
  });

  test("clears target when entity no longer visible", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 5);
    const ts = world.getComponent(player, "TargetSelection")!;
    ts.targetEntity = enemy;

    clearStaleTarget(world, player, visibleSetFrom([5, 5]));
    expect(ts.targetEntity).toBeNull();
  });

  test("keeps valid target", () => {
    const world = new World();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 5);
    const ts = world.getComponent(player, "TargetSelection")!;
    ts.targetEntity = enemy;

    clearStaleTarget(world, player, visibleSetFrom([5, 5], [6, 5]));
    expect(ts.targetEntity).toBe(enemy);
  });
});

describe("Targeting — validateAttack", () => {
  test("melee: adjacent target is valid", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 5);
    equipWeapon(world, player, { damage: 5, range: 1, attackType: "melee" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(true);
  });

  test("melee: non-adjacent target fails", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 7, 5);
    equipWeapon(world, player, { damage: 5, range: 1, attackType: "melee" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("out-of-range");
  });

  test("ranged: in range + LOS is valid", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 10, 5);
    equipWeapon(world, player, { damage: 3, range: 6, attackType: "ranged" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(true);
  });

  test("ranged: out of range fails", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 15, 5);
    equipWeapon(world, player, { damage: 3, range: 6, attackType: "ranged" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("out-of-range");
  });

  test("ranged: no LOS fails", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 10, 5);
    map.setTile(7, 5, { ...WALL_TILE });
    equipWeapon(world, player, { damage: 3, range: 6, attackType: "ranged" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("no-los");
  });

  test("reach: cardinal target at range 2 is valid", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 7, 5);
    equipWeapon(world, player, { damage: 4, range: 2, attackType: "reach" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(true);
  });

  test("reach: diagonal target at range 2 fails", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 6);
    equipWeapon(world, player, { damage: 4, range: 2, attackType: "reach" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("not-cardinal");
  });

  test("reach: adjacent (range 1) works regardless of direction", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 5);
    equipWeapon(world, player, { damage: 4, range: 2, attackType: "reach" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(true);
  });

  test("reach: out of range fails", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 8, 5);
    equipWeapon(world, player, { damage: 4, range: 2, attackType: "reach" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("out-of-range");
  });

  test("unarmed (no weapon): adjacent is valid", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 5);

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(true);
  });

  test("unarmed (no weapon): non-adjacent fails", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 7, 5);

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("out-of-range");
  });

  test("dead target fails", () => {
    const world = new World();
    const map = createMap();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 6, 5);
    world.getComponent(enemy, "Health")!.current = 0;
    equipWeapon(world, player, { damage: 5, range: 1, attackType: "melee" });

    const result = validateAttack(world, map, player, enemy);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("dead");
  });
});

describe("Targeting — attemptRangedAttack", () => {
  test("ranged attack succeeds and deals damage", () => {
    const world = new World();
    const map = createMap();
    const messages = new MessageLog();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 10, 5);
    equipWeapon(world, player, { damage: 3, range: 6, attackType: "ranged" });
    world.getComponent(player, "TargetSelection")!.targetEntity = enemy;

    const result = attemptRangedAttack(world, map, player, messages);
    expect(result).toBe(true);
    expect(world.getComponent(enemy, "Health")!.current).toBeLessThan(10);
  });

  test("fails with no target selected", () => {
    const world = new World();
    const map = createMap();
    const messages = new MessageLog();
    const player = createPlayer(world, 5, 5);

    const result = attemptRangedAttack(world, map, player, messages);
    expect(result).toBe(false);
    expect(messages.getMessages()).toContain("No target selected.");
  });

  test("fails when target out of range", () => {
    const world = new World();
    const map = createMap();
    const messages = new MessageLog();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 15, 5);
    equipWeapon(world, player, { damage: 3, range: 6, attackType: "ranged" });
    world.getComponent(player, "TargetSelection")!.targetEntity = enemy;

    const result = attemptRangedAttack(world, map, player, messages);
    expect(result).toBe(false);
    expect(messages.getMessages()).toContain("Target out of range.");
  });

  test("fails when no LOS", () => {
    const world = new World();
    const map = createMap();
    const messages = new MessageLog();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 10, 5);
    map.setTile(7, 5, { ...WALL_TILE });
    equipWeapon(world, player, { damage: 3, range: 6, attackType: "ranged" });
    world.getComponent(player, "TargetSelection")!.targetEntity = enemy;

    const result = attemptRangedAttack(world, map, player, messages);
    expect(result).toBe(false);
    expect(messages.getMessages()).toContain("No line of sight.");
  });

  test("sets hasActed on attacker", () => {
    const world = new World();
    const map = createMap();
    const messages = new MessageLog();
    const player = createPlayer(world, 5, 5);
    const enemy = createEnemy(world, 10, 5);
    equipWeapon(world, player, { damage: 3, range: 6, attackType: "ranged" });
    world.getComponent(player, "TargetSelection")!.targetEntity = enemy;

    attemptRangedAttack(world, map, player, messages);
    expect(world.getComponent(player, "TurnActor")!.hasActed).toBe(true);
  });
});

describe("Targeting — AI ranged attacks", () => {
  test("AI with ranged weapon attacks at range instead of closing", () => {
    const world = new World();
    const map = createMap();
    const messages = new MessageLog();

    const target = world.createEntity();
    world.addComponent(target, "Position", { x: 10, y: 5 });
    world.addComponent(target, "Collidable", { blocksMovement: true });
    world.addComponent(target, "Health", { current: 20, max: 20 });
    world.addComponent(target, "Stats", { strength: 5, defense: 2, speed: 3 });
    world.addComponent(target, "Faction", { factionId: "player" });

    const enemy = world.createEntity();
    world.addComponent(enemy, "Position", { x: 5, y: 5 });
    world.addComponent(enemy, "Stats", { strength: 3, defense: 1, speed: 2 });
    world.addComponent(enemy, "TurnActor", {
      hasActed: false,
      movementRemaining: 2,
      secondaryUsed: false,
    });
    world.addComponent(enemy, "AIControlled", {
      pattern: "charger" as const,
      targetEntity: target,
    });
    world.addComponent(enemy, "Collidable", { blocksMovement: true });
    world.addComponent(enemy, "Faction", { factionId: "enemy" });
    world.addComponent(enemy, "Equipment", {
      weapon: null,
      armor: null,
      accessory1: null,
      accessory2: null,
    });

    const bow = world.createEntity();
    world.addComponent(bow, "Weapon", {
      damage: 3,
      range: 6,
      weaponType: "bow",
      attackType: "ranged",
      defenseBonus: 0,
    });
    world.addComponent(bow, "Item", {
      name: "Short Bow",
      weight: 4,
      rarity: "common",
    });
    world.getComponent(enemy, "Equipment")!.weapon = bow;

    resetAITurns(world);
    processAI(world, map, messages);

    const enemyPos = world.getComponent(enemy, "Position")!;
    // Should have attacked from range, not moved
    expect(enemyPos.x).toBe(5);
    expect(world.getComponent(target, "Health")!.current).toBeLessThan(20);
  });
});

describe("Input — parseInput", () => {
  test("Tab maps to cycleTarget", () => {
    const result = parseInput(Buffer.from([0x09]));
    expect(result).toEqual({ type: "cycleTarget" });
  });

  test("Space maps to attack", () => {
    const result = parseInput(Buffer.from([0x20]));
    expect(result).toEqual({ type: "attack" });
  });
});
