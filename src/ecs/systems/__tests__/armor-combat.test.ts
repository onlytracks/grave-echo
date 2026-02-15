import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { MessageLog } from "../messages.ts";
import { attack } from "../combat.ts";

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
  world.addComponent(attacker, "Renderable", {
    char: "@",
    fg: "white",
    bg: "black",
  });

  const defender = world.createEntity();
  world.addComponent(defender, "Position", { x: 2, y: 1 });
  world.addComponent(defender, "Stats", { strength: 3, defense: 1, speed: 2 });
  world.addComponent(defender, "Health", { current: 20, max: 20 });
  world.addComponent(defender, "TurnActor", {
    hasActed: false,
    movementRemaining: 2,
    secondaryUsed: false,
  });
  world.addComponent(defender, "Faction", { factionId: "enemy" });
  world.addComponent(defender, "Renderable", {
    char: "g",
    fg: "red",
    bg: "black",
  });

  return { world, messages, attacker, defender };
}

describe("Armor in Combat", () => {
  test("armor defense adds to total defense in damage formula", () => {
    const { world, messages, attacker, defender } = setupCombat();

    const armor = world.createEntity();
    world.addComponent(armor, "Armor", {
      defense: 3,
      speedPenalty: 0,
      armorType: "light",
    });
    world.addComponent(defender, "Equipment", {
      weapon: null,
      armor,
      accessory1: null,
      accessory2: null,
    });

    // rng 0.5 → variance 0, no crit
    attack(world, attacker, defender, messages, () => 0.5);
    // baseDmg 5 (strength, no weapon) - totalDef (1 base + 3 armor = 4) + 0 = 1
    expect(world.getComponent(defender, "Health")!.current).toBe(19);
  });

  test("weapon defense bonus adds to defender total defense", () => {
    const { world, messages, attacker, defender } = setupCombat();

    const shield = world.createEntity();
    world.addComponent(shield, "Weapon", {
      damage: 4,
      range: 1,
      weaponType: "sword",
      attackType: "melee",
      defenseBonus: 2,
    });
    world.addComponent(defender, "Equipment", {
      weapon: shield,
      armor: null,
      accessory1: null,
      accessory2: null,
    });

    // rng 0.5 → variance 0, no crit
    attack(world, attacker, defender, messages, () => 0.5);
    // baseDmg 5 - totalDef (1 base + 2 wpn defBonus = 3) + 0 = 2
    expect(world.getComponent(defender, "Health")!.current).toBe(18);
  });

  test("armor + weapon defense bonus stack", () => {
    const { world, messages, attacker, defender } = setupCombat();

    const armor = world.createEntity();
    world.addComponent(armor, "Armor", {
      defense: 2,
      speedPenalty: 0,
      armorType: "light",
    });
    const shield = world.createEntity();
    world.addComponent(shield, "Weapon", {
      damage: 4,
      range: 1,
      weaponType: "sword",
      attackType: "melee",
      defenseBonus: 2,
    });
    world.addComponent(defender, "Equipment", {
      weapon: shield,
      armor,
      accessory1: null,
      accessory2: null,
    });

    // rng 0.5 → variance 0, no crit
    attack(world, attacker, defender, messages, () => 0.5);
    // baseDmg 5 - totalDef (1 + 2 + 2 = 5) + 0 = 0, min 1
    expect(world.getComponent(defender, "Health")!.current).toBe(19);
  });
});
