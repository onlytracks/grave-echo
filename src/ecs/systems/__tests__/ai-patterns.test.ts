import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE, WALL_TILE } from "../../../map/game-map.ts";
import { MessageLog } from "../messages.ts";
import { processAI } from "../ai.ts";
import { resetAITurns } from "../turn.ts";
import {
  createShortBow,
  createIronSpear,
  createIronSword,
  createSwordAndShield,
} from "../../../items/item-factory.ts";

function setupBase(opts: {
  enemyPos: { x: number; y: number };
  targetPos: { x: number; y: number };
  pattern: "archer" | "guardian" | "skulker" | "patrol";
  speed?: number;
  mapSize?: number;
  patrolPath?: { x: number; y: number }[];
  awareness?: "idle" | "alert";
}) {
  const size = opts.mapSize ?? 20;
  const world = new World();
  const map = new GameMap(size, size, FLOOR_TILE);
  const messages = new MessageLog();

  const target = world.createEntity();
  world.addComponent(target, "Position", { ...opts.targetPos });
  world.addComponent(target, "Collidable", { blocksMovement: true });
  world.addComponent(target, "Health", { current: 20, max: 20 });
  world.addComponent(target, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(target, "Faction", { factionId: "player" });

  const speed = opts.speed ?? 2;
  const enemy = world.createEntity();
  world.addComponent(enemy, "Position", { ...opts.enemyPos });
  world.addComponent(enemy, "Stats", { strength: 3, defense: 1, speed });
  world.addComponent(enemy, "TurnActor", {
    hasActed: false,
    movementRemaining: speed,
    secondaryUsed: false,
  });
  world.addComponent(enemy, "AIControlled", {
    pattern: opts.pattern,
    targetEntity: target,
    patrolPath: opts.patrolPath,
    patrolIndex: 0,
  });
  world.addComponent(enemy, "Collidable", { blocksMovement: true });
  world.addComponent(enemy, "Faction", { factionId: "enemy" });
  world.addComponent(enemy, "Senses", { vision: { range: 10 } });
  world.addComponent(enemy, "Awareness", {
    state: opts.awareness ?? "alert",
    lastKnownTarget: null,
    alertDuration: 5,
    turnsWithoutTarget: 0,
  });
  world.addComponent(enemy, "Inventory", {
    items: [],
    totalWeight: 0,
    carryCapacity: 50,
  });
  world.addComponent(enemy, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });

  return { world, map, enemy, target, messages };
}

function equipWeapon(
  world: World,
  entity: number,
  createFn: (w: World, x: number, y: number) => number,
): number {
  const weapon = createFn(world, 0, 0);
  world.removeComponent(weapon, "Position");
  const inv = world.getComponent(entity, "Inventory")!;
  const equip = world.getComponent(entity, "Equipment")!;
  inv.items.push(weapon);
  equip.weapon = weapon;
  return weapon;
}

describe("AI System — Archer", () => {
  test("moves away when target is adjacent", () => {
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 5, y: 5 },
      targetPos: { x: 5, y: 6 },
      pattern: "archer",
      speed: 2,
    });
    equipWeapon(world, enemy, createShortBow);
    resetAITurns(world);
    processAI(world, map, messages);
    const pos = world.getComponent(enemy, "Position")!;
    const dist = Math.abs(pos.x - 5) + Math.abs(pos.y - 6);
    expect(dist).toBeGreaterThan(1);
  });

  test("attacks when target is in range with LOS", () => {
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 5, y: 5 },
      targetPos: { x: 5, y: 9 },
      pattern: "archer",
      speed: 2,
    });
    equipWeapon(world, enemy, createShortBow);
    resetAITurns(world);
    processAI(world, map, messages);
    const targetHealth = world.getComponent(target, "Health")!;
    expect(targetHealth.current).toBeLessThan(20);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBe(5);
    expect(pos.y).toBe(5);
  });

  test("closes distance when target is out of range", () => {
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 1, y: 1 },
      targetPos: { x: 15, y: 1 },
      pattern: "archer",
      speed: 2,
    });
    equipWeapon(world, enemy, createShortBow);
    resetAITurns(world);
    processAI(world, map, messages);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBeGreaterThan(1);
  });
});

describe("AI System — Guardian", () => {
  test("never moves from initial position", () => {
    const { world, map, enemy, messages } = setupBase({
      enemyPos: { x: 5, y: 5 },
      targetPos: { x: 10, y: 5 },
      pattern: "guardian",
    });
    equipWeapon(world, enemy, createIronSpear);
    resetAITurns(world);
    processAI(world, map, messages);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBe(5);
    expect(pos.y).toBe(5);
  });

  test("attacks when target enters weapon range", () => {
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 5, y: 5 },
      targetPos: { x: 5, y: 7 },
      pattern: "guardian",
    });
    equipWeapon(world, enemy, createIronSpear);
    resetAITurns(world);
    processAI(world, map, messages);
    const targetHealth = world.getComponent(target, "Health")!;
    expect(targetHealth.current).toBeLessThan(20);
  });

  test("does nothing when target is out of range", () => {
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 5, y: 5 },
      targetPos: { x: 10, y: 5 },
      pattern: "guardian",
    });
    equipWeapon(world, enemy, createIronSpear);
    resetAITurns(world);
    processAI(world, map, messages);
    const targetHealth = world.getComponent(target, "Health")!;
    expect(targetHealth.current).toBe(20);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBe(5);
    expect(pos.y).toBe(5);
  });
});

describe("AI System — Skulker", () => {
  test("calculates flanking position correctly", () => {
    const { world, map, enemy, messages } = setupBase({
      enemyPos: { x: 3, y: 5 },
      targetPos: { x: 5, y: 5 },
      pattern: "skulker",
      speed: 3,
    });
    equipWeapon(world, enemy, createIronSword);
    resetAITurns(world);
    processAI(world, map, messages);
    const debugMsgs = messages
      .getAllMessagesWithTurns()
      .filter((m) => m.category === "debug")
      .map((m) => m.text);
    const hasFlanking = debugMsgs.some(
      (m) => m.includes("flanking") || m.includes("direct approach"),
    );
    expect(hasFlanking).toBe(true);
  });

  test("only attacks once when bump-attacking during flank movement", () => {
    // Place skulker 2 tiles away so it takes the flanking path (not the
    // adjacent shortcut). With speed 3 it can flank to an adjacent tile
    // and bump-attack. The bug was a second attack after the bump because
    // the post-flank tryRangedAttack didn't check hasActed.
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 3, y: 5 },
      targetPos: { x: 5, y: 5 },
      pattern: "skulker",
      speed: 3,
    });
    equipWeapon(world, enemy, createIronSword);
    // Block flanking tiles except the one the skulker will bump through
    map.setTile(5, 4, { ...WALL_TILE });
    map.setTile(5, 6, { ...WALL_TILE });
    map.setTile(6, 5, { ...WALL_TILE });
    resetAITurns(world);
    processAI(world, map, messages);
    const targetHealth = world.getComponent(target, "Health")!;
    const damageTaken = 20 - targetHealth.current;
    const attackMsgs = messages
      .getAllMessagesWithTurns()
      .filter((m) => m.category === "gameplay" && m.text.includes("attacks"));
    expect(attackMsgs.length).toBe(1);
    expect(damageTaken).toBeGreaterThan(0);
  });

  test("falls back to charger when flanking blocked", () => {
    const { world, map, enemy, messages } = setupBase({
      enemyPos: { x: 3, y: 5 },
      targetPos: { x: 5, y: 5 },
      pattern: "skulker",
      speed: 3,
    });
    equipWeapon(world, enemy, createIronSword);
    // Block all tiles adjacent to target
    map.setTile(6, 5, { ...WALL_TILE });
    map.setTile(4, 5, { ...WALL_TILE });
    map.setTile(5, 4, { ...WALL_TILE });
    map.setTile(5, 6, { ...WALL_TILE });
    resetAITurns(world);
    processAI(world, map, messages);
    const debugMsgs = messages
      .getAllMessagesWithTurns()
      .filter((m) => m.category === "debug")
      .map((m) => m.text);
    const hasFallback = debugMsgs.some(
      (m) => m.includes("direct approach") || m.includes("moved"),
    );
    expect(hasFallback).toBe(true);
  });
});

describe("AI System — Patrol", () => {
  test("follows waypoints when idle", () => {
    const { world, map, enemy, messages } = setupBase({
      enemyPos: { x: 3, y: 5 },
      targetPos: { x: 15, y: 15 },
      pattern: "patrol",
      speed: 2,
      awareness: "idle",
      patrolPath: [
        { x: 3, y: 5 },
        { x: 7, y: 5 },
      ],
    });
    equipWeapon(world, enemy, createSwordAndShield);
    // Make target invisible (far away, set awareness to idle manually)
    const awareness = world.getComponent(enemy, "Awareness")!;
    awareness.state = "idle";
    awareness.turnsWithoutTarget = 10;
    resetAITurns(world);
    processAI(world, map, messages);
    const pos = world.getComponent(enemy, "Position")!;
    // Should have moved toward waypoint at (7,5)
    expect(pos.x).toBeGreaterThan(3);
  });

  test("switches to charger when alert", () => {
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 4, y: 5 },
      targetPos: { x: 5, y: 5 },
      pattern: "patrol",
      speed: 2,
      awareness: "alert",
      patrolPath: [
        { x: 1, y: 5 },
        { x: 10, y: 5 },
      ],
    });
    equipWeapon(world, enemy, createSwordAndShield);
    resetAITurns(world);
    processAI(world, map, messages);
    const targetHealth = world.getComponent(target, "Health")!;
    expect(targetHealth.current).toBeLessThan(20);
  });
});

describe("Enemy Equipment in Combat", () => {
  test("enemy weapon damage contributes to combat", () => {
    const { world, map, enemy, target, messages } = setupBase({
      enemyPos: { x: 4, y: 5 },
      targetPos: { x: 5, y: 5 },
      pattern: "guardian",
    });
    // Spear does 4 damage vs 2 defense = ~2-4 damage
    equipWeapon(world, enemy, createIronSpear);
    resetAITurns(world);
    processAI(world, map, messages);
    const targetHealth = world.getComponent(target, "Health")!;
    expect(targetHealth.current).toBeLessThan(20);
    // With weapon damage of 4 vs defense 2, min damage is 1
    expect(targetHealth.current).toBeLessThanOrEqual(19);
  });
});
