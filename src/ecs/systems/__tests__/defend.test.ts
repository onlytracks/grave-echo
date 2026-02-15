import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { MessageLog } from "../messages.ts";
import { attack } from "../combat.ts";
import { getEffectiveStats } from "../stats.ts";
import { startPlayerTurn, resetAITurns } from "../turn.ts";

function setupDefend() {
  const world = new World();
  const messages = new MessageLog();

  const player = world.createEntity();
  world.addComponent(player, "Position", { x: 1, y: 1 });
  world.addComponent(player, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(player, "Health", { current: 20, max: 20 });
  world.addComponent(player, "TurnActor", {
    hasActed: false,
    movementRemaining: 3,
    secondaryUsed: false,
  });
  world.addComponent(player, "Faction", { factionId: "player" });
  world.addComponent(player, "PlayerControlled", {});
  world.addComponent(player, "Renderable", {
    char: "@",
    fg: "white",
    bg: "black",
  });

  const enemy = world.createEntity();
  world.addComponent(enemy, "Position", { x: 2, y: 1 });
  world.addComponent(enemy, "Stats", { strength: 4, defense: 1, speed: 2 });
  world.addComponent(enemy, "Health", { current: 10, max: 10 });
  world.addComponent(enemy, "TurnActor", {
    hasActed: false,
    movementRemaining: 2,
    secondaryUsed: false,
  });
  world.addComponent(enemy, "Faction", { factionId: "enemy" });
  world.addComponent(enemy, "AIControlled", {
    pattern: "charger",
    targetEntity: null,
  });
  world.addComponent(enemy, "Renderable", {
    char: "g",
    fg: "red",
    bg: "black",
  });

  return { world, messages, player, enemy };
}

describe("Defending", () => {
  describe("getEffectiveStats", () => {
    test("grants +2 defense when Defending is present", () => {
      const { world, player } = setupDefend();
      const before = getEffectiveStats(world, player)!;
      world.addComponent(player, "Defending", {});
      const after = getEffectiveStats(world, player)!;
      expect(after.defense).toBe(before.defense + 2);
      expect(after.strength).toBe(before.strength);
      expect(after.speed).toBe(before.speed);
    });
  });

  describe("attack of opportunity", () => {
    test("melee attack against defending entity triggers counter before main attack", () => {
      const { world, messages, player, enemy } = setupDefend();
      world.addComponent(player, "Defending", {});
      const rng = () => 0.5; // no crit, variance = 0

      attack(world, enemy, player, messages, rng);

      const log = messages.getRecent(10);
      const counterIdx = log.findIndex((m) => m.includes("counterattack"));
      const attackIdx = log.findIndex((m) => m.includes("The g attacks You"));
      expect(counterIdx).toBeGreaterThanOrEqual(0);
      expect(attackIdx).toBeGreaterThan(counterIdx);
    });

    test("ranged attack (dist > 1) does NOT trigger counter", () => {
      const { world, messages, player, enemy } = setupDefend();
      world.addComponent(player, "Defending", {});
      // Move enemy to range 3
      world.getComponent(enemy, "Position")!.x = 4;
      world.getComponent(enemy, "Position")!.y = 1;

      const rng = () => 0.5;
      attack(world, enemy, player, messages, rng);

      const log = messages.getRecent(10);
      const counterMsg = log.find((m) => m.includes("counterattack"));
      expect(counterMsg).toBeUndefined();
      expect(world.hasComponent(player, "Defending")).toBe(true);
    });

    test("reach attack (dist=2) does NOT trigger counter", () => {
      const { world, messages, player, enemy } = setupDefend();
      world.addComponent(player, "Defending", {});
      world.getComponent(enemy, "Position")!.x = 3;
      world.getComponent(enemy, "Position")!.y = 1;

      const rng = () => 0.5;
      attack(world, enemy, player, messages, rng);

      const log = messages.getRecent(10);
      const counterMsg = log.find((m) => m.includes("counterattack"));
      expect(counterMsg).toBeUndefined();
      expect(world.hasComponent(player, "Defending")).toBe(true);
    });

    test("counter that kills attacker prevents original attack", () => {
      const { world, messages, player, enemy } = setupDefend();
      world.addComponent(player, "Defending", {});
      // Give player massive strength so counter kills
      world.getComponent(player, "Stats")!.strength = 50;
      const rng = () => 0.5;

      const playerHpBefore = world.getComponent(player, "Health")!.current;
      attack(world, enemy, player, messages, rng);

      expect(world.getComponent(enemy, "Health")!.current).toBeLessThanOrEqual(
        0,
      );
      expect(world.getComponent(player, "Health")!.current).toBe(
        playerHpBefore,
      );
    });

    test("Defending removed after counter (one per stance)", () => {
      const { world, messages, player, enemy } = setupDefend();
      world.addComponent(player, "Defending", {});
      const rng = () => 0.5;

      attack(world, enemy, player, messages, rng);

      expect(world.hasComponent(player, "Defending")).toBe(false);
    });
  });

  describe("turn lifecycle", () => {
    test("Defending removed at player turn start", () => {
      const { world, player } = setupDefend();
      world.addComponent(player, "Defending", {});
      expect(world.hasComponent(player, "Defending")).toBe(true);

      startPlayerTurn(world);

      expect(world.hasComponent(player, "Defending")).toBe(false);
    });

    test("Defending removed at AI turn reset", () => {
      const { world, enemy } = setupDefend();
      world.addComponent(enemy, "Defending", {});
      expect(world.hasComponent(enemy, "Defending")).toBe(true);

      resetAITurns(world);

      expect(world.hasComponent(enemy, "Defending")).toBe(false);
    });
  });
});
