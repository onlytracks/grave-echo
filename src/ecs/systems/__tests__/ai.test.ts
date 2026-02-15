import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE, WALL_TILE } from "../../../map/game-map.ts";
import { processAI } from "../ai.ts";
import { resetAITurns } from "../turn.ts";
import type { Entity } from "../../world.ts";

function setup(opts?: {
  enemyPos?: { x: number; y: number };
  targetPos?: { x: number; y: number };
  speed?: number;
  mapSize?: number;
}) {
  const size = opts?.mapSize ?? 10;
  const world = new World();
  const map = new GameMap(size, size, FLOOR_TILE);

  const target = world.createEntity();
  const tPos = opts?.targetPos ?? { x: 5, y: 5 };
  world.addComponent(target, "Position", { ...tPos });
  world.addComponent(target, "Collidable", { blocksMovement: true });

  const speed = opts?.speed ?? 2;
  const enemy = world.createEntity();
  const ePos = opts?.enemyPos ?? { x: 1, y: 5 };
  world.addComponent(enemy, "Position", { ...ePos });
  world.addComponent(enemy, "Stats", { strength: 3, defense: 1, speed });
  world.addComponent(enemy, "TurnActor", {
    hasActed: false,
    movementRemaining: speed,
  });
  world.addComponent(enemy, "AIControlled", {
    pattern: "charger" as const,
    targetEntity: target,
  });
  world.addComponent(enemy, "Collidable", { blocksMovement: true });

  return { world, map, enemy, target };
}

describe("AI System — Charger", () => {
  test("moves toward target when path is clear", () => {
    const { world, map, enemy } = setup({
      enemyPos: { x: 1, y: 5 },
      targetPos: { x: 5, y: 5 },
    });
    resetAITurns(world);
    processAI(world, map);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBeGreaterThan(1);
  });

  test("stops when adjacent to target", () => {
    const { world, map, enemy } = setup({
      enemyPos: { x: 4, y: 5 },
      targetPos: { x: 5, y: 5 },
    });
    resetAITurns(world);
    processAI(world, map);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos).toEqual({ x: 4, y: 5 });
  });

  test("tries alternate axis when preferred is blocked", () => {
    const { world, map, enemy } = setup({
      enemyPos: { x: 3, y: 3 },
      targetPos: { x: 5, y: 3 },
      speed: 1,
    });
    // Wall blocking horizontal path
    map.setTile(4, 3, { ...WALL_TILE });
    resetAITurns(world);
    processAI(world, map);
    const pos = world.getComponent(enemy, "Position")!;
    // Should have tried vertical since horizontal is blocked
    expect(pos.x === 3).toBe(true);
  });

  test("doesn't move when completely blocked", () => {
    const { world, map, enemy } = setup({
      enemyPos: { x: 3, y: 3 },
      targetPos: { x: 5, y: 3 },
      speed: 2,
    });
    map.setTile(4, 3, { ...WALL_TILE });
    map.setTile(3, 2, { ...WALL_TILE });
    map.setTile(3, 4, { ...WALL_TILE });
    resetAITurns(world);
    processAI(world, map);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos).toEqual({ x: 3, y: 3 });
  });

  test("respects movement points", () => {
    const { world, map, enemy } = setup({
      enemyPos: { x: 1, y: 5 },
      targetPos: { x: 8, y: 5 },
      speed: 2,
    });
    resetAITurns(world);
    processAI(world, map);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos.x).toBe(3); // moved exactly 2 tiles
  });

  test("blocked by walls (uses MovementSystem)", () => {
    const { world, map, enemy } = setup({
      enemyPos: { x: 3, y: 5 },
      targetPos: { x: 7, y: 5 },
      speed: 3,
    });
    map.setTile(4, 5, { ...WALL_TILE });
    map.setTile(3, 4, { ...WALL_TILE });
    map.setTile(3, 6, { ...WALL_TILE });
    resetAITurns(world);
    processAI(world, map);
    const pos = world.getComponent(enemy, "Position")!;
    expect(pos).toEqual({ x: 3, y: 5 });
  });
});
