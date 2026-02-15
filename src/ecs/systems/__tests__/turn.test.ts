import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE } from "../../../map/game-map.ts";
import { tryMove } from "../movement.ts";
import {
  startPlayerTurn,
  endPlayerTurn,
  isPlayerTurnOver,
  resetIdleTurn,
} from "../turn.ts";

function setupPlayerWorld() {
  const world = new World();
  const map = new GameMap(10, 10, FLOOR_TILE);
  const player = world.createEntity();
  world.addComponent(player, "Position", { x: 5, y: 5 });
  world.addComponent(player, "PlayerControlled", {});
  world.addComponent(player, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(player, "TurnActor", {
    hasActed: false,
    movementRemaining: 3,
    secondaryUsed: false,
  });
  return { world, map, player };
}

describe("Turn System", () => {
  test("player with speed 3 can move 3 times", () => {
    const { world, map, player } = setupPlayerWorld();
    startPlayerTurn(world);

    expect(tryMove(world, map, player, 6, 5)).toBe("moved");
    expect(tryMove(world, map, player, 7, 5)).toBe("moved");
    expect(tryMove(world, map, player, 8, 5)).toBe("moved");
    expect(world.getComponent(player, "TurnActor")!.movementRemaining).toBe(0);
  });

  test("4th move is blocked when speed is 3", () => {
    const { world, map, player } = setupPlayerWorld();
    startPlayerTurn(world);

    tryMove(world, map, player, 6, 5);
    tryMove(world, map, player, 7, 5);
    tryMove(world, map, player, 8, 5);
    expect(tryMove(world, map, player, 9, 5)).toBe("blocked");
    expect(world.getComponent(player, "Position")).toEqual({ x: 8, y: 5 });
  });

  test("ending turn resets movement for next turn", () => {
    const { world, map, player } = setupPlayerWorld();
    startPlayerTurn(world);

    tryMove(world, map, player, 6, 5);
    tryMove(world, map, player, 7, 5);
    endPlayerTurn(world);
    startPlayerTurn(world);

    expect(world.getComponent(player, "TurnActor")!.movementRemaining).toBe(3);
    expect(world.getComponent(player, "TurnActor")!.hasActed).toBe(false);
  });

  test("pass ends the turn", () => {
    const { world } = setupPlayerWorld();
    startPlayerTurn(world);
    expect(isPlayerTurnOver(world)).toBe(false);

    endPlayerTurn(world);
    expect(isPlayerTurnOver(world)).toBe(true);
  });

  test("hasActed prevents further primary actions", () => {
    const { world, player } = setupPlayerWorld();
    startPlayerTurn(world);
    endPlayerTurn(world);

    const turnActor = world.getComponent(player, "TurnActor")!;
    expect(turnActor.hasActed).toBe(true);
    expect(turnActor.movementRemaining).toBe(0);
  });
});

describe("resetIdleTurn", () => {
  function setupIdleWorld(awarenessState: "idle" | "alert") {
    const world = new World();
    const map = new GameMap(10, 10, FLOOR_TILE);
    const player = world.createEntity();
    world.addComponent(player, "Position", { x: 5, y: 5 });
    world.addComponent(player, "PlayerControlled", {});
    world.addComponent(player, "Stats", { strength: 5, defense: 2, speed: 3 });
    world.addComponent(player, "TurnActor", {
      hasActed: false,
      movementRemaining: 3,
      secondaryUsed: false,
    });
    world.addComponent(player, "Awareness", {
      state: awarenessState,
      lastKnownTarget: null,
      alertDuration: 0,
      turnsWithoutTarget: 0,
    });
    return { world, map, player };
  }

  test("resets turn economy after action when player is idle", () => {
    const { world, map, player } = setupIdleWorld("idle");
    startPlayerTurn(world);

    tryMove(world, map, player, 6, 5);
    tryMove(world, map, player, 7, 5);
    expect(world.getComponent(player, "TurnActor")!.movementRemaining).toBe(1);

    resetIdleTurn(world);
    const turnActor = world.getComponent(player, "TurnActor")!;
    expect(turnActor.movementRemaining).toBe(3);
    expect(turnActor.hasActed).toBe(false);
    expect(turnActor.secondaryUsed).toBe(false);
  });

  test("does NOT reset turn economy when player is alerted", () => {
    const { world, map, player } = setupIdleWorld("alert");
    startPlayerTurn(world);

    tryMove(world, map, player, 6, 5);
    tryMove(world, map, player, 7, 5);
    expect(world.getComponent(player, "TurnActor")!.movementRemaining).toBe(1);

    resetIdleTurn(world);
    const turnActor = world.getComponent(player, "TurnActor")!;
    expect(turnActor.movementRemaining).toBe(1);
  });

  test("idle turn never auto-completes from exhausted actions", () => {
    const { world, map, player } = setupIdleWorld("idle");
    startPlayerTurn(world);

    tryMove(world, map, player, 6, 5);
    tryMove(world, map, player, 7, 5);
    tryMove(world, map, player, 8, 5);
    expect(world.getComponent(player, "TurnActor")!.movementRemaining).toBe(0);

    resetIdleTurn(world);
    expect(isPlayerTurnOver(world)).toBe(false);
    expect(world.getComponent(player, "TurnActor")!.movementRemaining).toBe(3);
  });
});
