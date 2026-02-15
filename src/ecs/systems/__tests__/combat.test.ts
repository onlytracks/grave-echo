import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE } from "../../../map/game-map.ts";
import { MessageLog } from "../messages.ts";
import { attack, isHostile } from "../combat.ts";
import { processHealth } from "../health.ts";
import { tryMove } from "../movement.ts";

function setupCombat() {
  const world = new World();
  const messages = new MessageLog();

  const attacker = world.createEntity();
  world.addComponent(attacker, "Position", { x: 1, y: 1 });
  world.addComponent(attacker, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(attacker, "Health", { current: 20, max: 20 });
  world.addComponent(attacker, "TurnActor", {
    hasActed: false,
    movementRemaining: 3,
    secondaryUsed: false,
  });
  world.addComponent(attacker, "Faction", { factionId: "player" });
  world.addComponent(attacker, "PlayerControlled", {});
  world.addComponent(attacker, "Collidable", { blocksMovement: true });
  world.addComponent(attacker, "Renderable", {
    char: "@",
    fg: "white",
    bg: "black",
  });

  const defender = world.createEntity();
  world.addComponent(defender, "Position", { x: 2, y: 1 });
  world.addComponent(defender, "Stats", { strength: 3, defense: 1, speed: 2 });
  world.addComponent(defender, "Health", { current: 8, max: 8 });
  world.addComponent(defender, "TurnActor", {
    hasActed: false,
    movementRemaining: 2,
    secondaryUsed: false,
  });
  world.addComponent(defender, "Faction", { factionId: "enemy" });
  world.addComponent(defender, "Collidable", { blocksMovement: true });
  world.addComponent(defender, "Renderable", {
    char: "g",
    fg: "red",
    bg: "black",
  });

  return { world, messages, attacker, defender };
}

describe("Combat System", () => {
  test("attack deals strength - defense ± 1 damage (minimum 1)", () => {
    const { world, messages, attacker, defender } = setupCombat();
    // rng returns 0.5 → variance = floor(0.5*3)-1 = 0, no crit
    attack(world, attacker, defender, messages, () => 0.5);
    const health = world.getComponent(defender, "Health")!;
    // 5 - 1 + 0 = 4
    expect(health.current).toBe(4);
  });

  test("critical hit deals double damage", () => {
    const { world, messages, attacker, defender } = setupCombat();
    let callCount = 0;
    const rng = () => {
      callCount++;
      if (callCount === 1) return 0.5; // variance = 0
      return 0.01; // crit (< 0.05)
    };
    attack(world, attacker, defender, messages, rng);
    const health = world.getComponent(defender, "Health")!;
    // (5 - 1 + 0) * 2 = 8
    expect(health.current).toBe(0);
  });

  test("damage reduces defender Health.current", () => {
    const { world, messages, attacker, defender } = setupCombat();
    attack(world, attacker, defender, messages, () => 0.5);
    const health = world.getComponent(defender, "Health")!;
    expect(health.current).toBeLessThan(8);
  });

  test("entity with Health <= 0 is destroyed by health system", () => {
    const { world, messages, attacker, defender } = setupCombat();
    world.getComponent(defender, "Health")!.current = 1;
    attack(world, attacker, defender, messages, () => 0.5);
    processHealth(world, messages);
    expect(world.getComponent(defender, "Position")).toBeUndefined();
  });

  test("same faction entities don't attack each other", () => {
    const { world, attacker, defender } = setupCombat();
    world.getComponent(defender, "Faction")!.factionId = "player";
    expect(isHostile(world, attacker, defender)).toBe(false);
  });

  test("hostile factions are hostile", () => {
    const { world, attacker, defender } = setupCombat();
    expect(isHostile(world, attacker, defender)).toBe(true);
  });

  test("neutral faction is not hostile to anyone", () => {
    const { world, attacker, defender } = setupCombat();
    world.getComponent(attacker, "Faction")!.factionId = "neutral";
    expect(isHostile(world, attacker, defender)).toBe(false);
  });

  test("attack sets TurnActor.hasActed = true", () => {
    const { world, messages, attacker, defender } = setupCombat();
    attack(world, attacker, defender, messages, () => 0.5);
    expect(world.getComponent(attacker, "TurnActor")!.hasActed).toBe(true);
  });

  test("bump into hostile triggers combat via tryMove", () => {
    const { world, messages, attacker, defender } = setupCombat();
    const map = new GameMap(5, 5, FLOOR_TILE);
    const result = tryMove(world, map, attacker, 2, 1, messages);
    expect(result).toBe("attacked");
    expect(world.getComponent(defender, "Health")!.current).toBeLessThan(8);
  });

  test("bump into non-hostile collidable blocks without combat", () => {
    const { world, messages, attacker, defender } = setupCombat();
    world.getComponent(defender, "Faction")!.factionId = "player";
    const map = new GameMap(5, 5, FLOOR_TILE);
    const result = tryMove(world, map, attacker, 2, 1, messages);
    expect(result).toBe("blocked");
    expect(world.getComponent(defender, "Health")!.current).toBe(8);
  });

  test("attack uses weapon damage when weapon is equipped", () => {
    const { world, messages, attacker, defender } = setupCombat();
    const sword = world.createEntity();
    world.addComponent(sword, "Item", {
      name: "Iron Sword",
      weight: 6,
      rarity: "common",
    });
    world.addComponent(sword, "Weapon", {
      damage: 10,
      range: 1,
      weaponType: "sword",
      attackType: "melee",
      defenseBonus: 0,
    });
    world.addComponent(attacker, "Inventory", {
      items: [sword],
      totalWeight: 6,
      carryCapacity: 30,
    });
    world.addComponent(attacker, "Equipment", {
      weapon: sword,
      armor: null,
      accessory1: null,
      accessory2: null,
    });

    // rng 0.5 → variance 0, no crit
    attack(world, attacker, defender, messages, () => 0.5);
    // weapon damage 10 - defense 1 + 0 = 9
    expect(world.getComponent(defender, "Health")!.current).toBe(-1);
  });

  test("attack uses Stats.strength when no weapon equipped (unarmed)", () => {
    const { world, messages, attacker, defender } = setupCombat();
    world.addComponent(attacker, "Equipment", {
      weapon: null,
      armor: null,
      accessory1: null,
      accessory2: null,
    });

    attack(world, attacker, defender, messages, () => 0.5);
    // strength 5 - defense 1 + 0 = 4
    expect(world.getComponent(defender, "Health")!.current).toBe(4);
  });
});
