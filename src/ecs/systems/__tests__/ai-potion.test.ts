import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { GameMap, FLOOR_TILE } from "../../../map/game-map.ts";
import { MessageLog } from "../messages.ts";
import { processAI } from "../ai.ts";
import { resetAITurns } from "../turn.ts";
import {
  createIronSpear,
  createIronSword,
  createHealingPotion,
} from "../../../items/item-factory.ts";

function setupEnemy(opts: {
  pattern: "charger" | "archer" | "guardian" | "skulker" | "patrol";
  canDrinkPotions?: boolean;
  hpCurrent: number;
  hpMax: number;
  withPotion?: boolean;
}) {
  const world = new World();
  const map = new GameMap(20, 20, FLOOR_TILE);
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
    pattern: opts.pattern,
    targetEntity: target,
    canDrinkPotions: opts.canDrinkPotions,
  });
  world.addComponent(enemy, "Collidable", { blocksMovement: true });
  world.addComponent(enemy, "Faction", { factionId: "enemy" });
  world.addComponent(enemy, "Senses", { vision: { range: 10 } });
  world.addComponent(enemy, "Awareness", {
    state: "alert",
    lastKnownTarget: null,
    alertDuration: 5,
    turnsWithoutTarget: 0,
  });
  world.addComponent(enemy, "Health", {
    current: opts.hpCurrent,
    max: opts.hpMax,
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
  world.addComponent(enemy, "Renderable", {
    char: "\u{040B}",
    fg: "brightGreen",
    bg: "black",
  });

  const spear = createIronSpear(world, 0, 0);
  world.removeComponent(spear, "Position");
  const inv = world.getComponent(enemy, "Inventory")!;
  const equip = world.getComponent(enemy, "Equipment")!;
  inv.items.push(spear);
  equip.weapon = spear;

  let potionId: number | null = null;
  if (opts.withPotion !== false) {
    const potion = createHealingPotion(world, 0, 0);
    world.removeComponent(potion, "Position");
    inv.items.push(potion);
    potionId = potion;
  }

  return { world, map, enemy, target, messages, potionId };
}

describe("AI Potion Use", () => {
  test("guardian at 40% HP with potion drinks it", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 4,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const health = world.getComponent(enemy, "Health")!;
    expect(health.current).toBeGreaterThan(4);
  });

  test("guardian at 50% HP does NOT drink", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 5,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const health = world.getComponent(enemy, "Health")!;
    expect(health.current).toBe(5);
  });

  test("charger at 20% HP with potion does NOT drink (no canDrinkPotions)", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "charger",
      hpCurrent: 2,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const health = world.getComponent(enemy, "Health")!;
    expect(health.current).toBe(2);
  });

  test("boss charger with canDrinkPotions at 30% HP drinks", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "charger",
      canDrinkPotions: true,
      hpCurrent: 3,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const health = world.getComponent(enemy, "Health")!;
    expect(health.current).toBeGreaterThan(3);
  });

  test("drinking heals correct amount, caps at max HP", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 9,
      hpMax: 10,
      withPotion: true,
    });
    // Set HP to 40% of max (4/10)
    const health = world.getComponent(enemy, "Health")!;
    health.current = 4;

    resetAITurns(world);
    processAI(world, map, messages);

    expect(health.current).toBeLessThanOrEqual(health.max);
    expect(health.current).toBeGreaterThan(4);
  });

  test("drinking does NOT decrement potion charges", () => {
    const { world, map, enemy, messages, potionId } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 3,
      hpMax: 10,
      withPotion: true,
    });
    const consumable = world.getComponent(potionId!, "Consumable")!;
    const chargesBefore = consumable.charges;

    resetAITurns(world);
    processAI(world, map, messages);

    expect(consumable.charges).toBe(chargesBefore);
  });

  test("drinking sets hasActed=true and movementRemaining=0", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 3,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const turnActor = world.getComponent(enemy, "TurnActor")!;
    expect(turnActor.hasActed).toBe(true);
    expect(turnActor.movementRemaining).toBe(0);
  });

  test("hasUsedPotion prevents second drink in same alert phase", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 3,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const health = world.getComponent(enemy, "Health")!;
    const hpAfterFirst = health.current;
    health.current = 3;

    resetAITurns(world);
    processAI(world, map, messages);

    expect(health.current).toBe(3);
  });

  test("hasUsedPotion resets when entity returns to idle", () => {
    const { world, map, enemy, target, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 3,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const ai = world.getComponent(enemy, "AIControlled")!;
    expect(ai.hasUsedPotion).toBe(true);

    // Move target out of vision range so awareness transitions to idle
    world.getComponent(target, "Position")!.x = 19;
    world.getComponent(target, "Position")!.y = 19;
    const awareness = world.getComponent(enemy, "Awareness")!;
    awareness.turnsWithoutTarget = awareness.alertDuration + 1;
    resetAITurns(world);
    processAI(world, map, messages);

    expect(ai.hasUsedPotion).toBe(false);
  });

  test("guardian without potion does not drink", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 3,
      hpMax: 10,
      withPotion: false,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const health = world.getComponent(enemy, "Health")!;
    expect(health.current).toBe(3);
  });

  test("gameplay message appears when enemy drinks", () => {
    const { world, map, enemy, messages } = setupEnemy({
      pattern: "guardian",
      canDrinkPotions: true,
      hpCurrent: 3,
      hpMax: 10,
      withPotion: true,
    });
    resetAITurns(world);
    processAI(world, map, messages);

    const allMsgs = messages
      .getAllMessagesWithTurns()
      .filter((m) => m.category === "gameplay")
      .map((m) => m.text);
    const hasDrinkMsg = allMsgs.some((m) => m.includes("drinks a potion"));
    expect(hasDrinkMsg).toBe(true);
  });
});
