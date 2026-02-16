import { describe, expect, test } from "bun:test";
import { World } from "../../world.ts";
import { getEffectiveStats, processBuffs } from "../stats.ts";
import { MessageLog } from "../messages.ts";

function setupEntity(world: World): number {
  const e = world.createEntity();
  world.addComponent(e, "Stats", { strength: 5, defense: 2, speed: 3 });
  world.addComponent(e, "Equipment", {
    weapon: null,
    armor: null,
    accessory1: null,
    accessory2: null,
  });
  world.addComponent(e, "Buffs", { active: [] });
  return e;
}

describe("getEffectiveStats", () => {
  test("returns base stats with no equipment or buffs", () => {
    const world = new World();
    const e = setupEntity(world);
    const stats = getEffectiveStats(world, e)!;
    expect(stats).toEqual({ strength: 5, defense: 2, speed: 3 });
  });

  test("includes armor defense and speed penalty", () => {
    const world = new World();
    const e = setupEntity(world);
    const armor = world.createEntity();
    world.addComponent(armor, "Armor", {
      defense: 4,
      speedPenalty: 1,
      armorType: "medium",
    });
    world.getComponent(e, "Equipment")!.armor = armor;

    const stats = getEffectiveStats(world, e)!;
    expect(stats.defense).toBe(6); // 2 + 4
    expect(stats.speed).toBe(2); // 3 - 1
  });

  test("heavy armor speed penalty floors at 0", () => {
    const world = new World();
    const e = setupEntity(world);
    world.getComponent(e, "Stats")!.speed = 1;
    const armor = world.createEntity();
    world.addComponent(armor, "Armor", {
      defense: 6,
      speedPenalty: 2,
      armorType: "heavy",
    });
    world.getComponent(e, "Equipment")!.armor = armor;

    const stats = getEffectiveStats(world, e)!;
    expect(stats.speed).toBe(0);
  });

  test("includes weapon defense bonus", () => {
    const world = new World();
    const e = setupEntity(world);
    const weapon = world.createEntity();
    world.addComponent(weapon, "Weapon", {
      damage: 4,
      range: 1,
      weaponType: "sword",
      attackType: "melee",
      defenseBonus: 2,
    });
    world.getComponent(e, "Equipment")!.weapon = weapon;

    const stats = getEffectiveStats(world, e)!;
    expect(stats.defense).toBe(4); // 2 + 2
  });

  test("includes accessory bonuses from both slots", () => {
    const world = new World();
    const e = setupEntity(world);

    const ring = world.createEntity();
    world.addComponent(ring, "Accessory", {
      slot: "accessory",
      bonuses: [{ stat: "strength", value: 1 }],
    });

    const boots = world.createEntity();
    world.addComponent(boots, "Accessory", {
      slot: "accessory",
      bonuses: [{ stat: "speed", value: 1 }],
    });

    const equip = world.getComponent(e, "Equipment")!;
    equip.accessory1 = ring;
    equip.accessory2 = boots;

    const stats = getEffectiveStats(world, e)!;
    expect(stats.strength).toBe(6); // 5 + 1
    expect(stats.speed).toBe(4); // 3 + 1
  });

  test("includes active buff values", () => {
    const world = new World();
    const e = setupEntity(world);
    world.getComponent(e, "Buffs")!.active = [
      { stat: "strength", value: 2, turnsRemaining: 3 },
      { stat: "defense", value: 2, turnsRemaining: 5 },
    ];

    const stats = getEffectiveStats(world, e)!;
    expect(stats.strength).toBe(7); // 5 + 2
    expect(stats.defense).toBe(4); // 2 + 2
  });

  test("sums all sources: base + armor + accessories + buffs", () => {
    const world = new World();
    const e = setupEntity(world);

    const armor = world.createEntity();
    world.addComponent(armor, "Armor", {
      defense: 2,
      speedPenalty: 0,
      armorType: "light",
    });

    const ring = world.createEntity();
    world.addComponent(ring, "Accessory", {
      slot: "accessory",
      bonuses: [{ stat: "defense", value: 1 }],
    });

    const weapon = world.createEntity();
    world.addComponent(weapon, "Weapon", {
      damage: 4,
      range: 1,
      weaponType: "sword",
      attackType: "melee",
      defenseBonus: 2,
    });

    const equip = world.getComponent(e, "Equipment")!;
    equip.armor = armor;
    equip.accessory1 = ring;
    equip.weapon = weapon;

    world.getComponent(e, "Buffs")!.active = [
      { stat: "defense", value: 1, turnsRemaining: 3 },
    ];

    const stats = getEffectiveStats(world, e)!;
    // base 2 + armor 2 + weapon defBonus 2 + accessory 1 + buff 1 = 8
    expect(stats.defense).toBe(8);
  });

  test("returns null for entity without Stats", () => {
    const world = new World();
    const e = world.createEntity();
    expect(getEffectiveStats(world, e)).toBeNull();
  });
});

describe("processBuffs", () => {
  test("decrements turnsRemaining each call", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "Buffs", {
      active: [{ stat: "strength", value: 2, turnsRemaining: 3 }],
    });

    processBuffs(world);
    expect(world.getComponent(e, "Buffs")!.active[0]!.turnsRemaining).toBe(2);
  });

  test("removes expired buffs", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "Buffs", {
      active: [
        { stat: "strength", value: 2, turnsRemaining: 1 },
        { stat: "defense", value: 1, turnsRemaining: 3 },
      ],
    });

    processBuffs(world);
    const buffs = world.getComponent(e, "Buffs")!;
    expect(buffs.active.length).toBe(1);
    expect(buffs.active[0]!.stat).toBe("defense");
  });

  test("buff fully expires after N turns", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "Buffs", {
      active: [{ stat: "speed", value: 1, turnsRemaining: 3 }],
    });

    processBuffs(world);
    processBuffs(world);
    processBuffs(world);
    expect(world.getComponent(e, "Buffs")!.active.length).toBe(0);
  });

  test("processBuffs accepts optional messages param (backward compatible)", () => {
    const world = new World();
    const e = world.createEntity();
    world.addComponent(e, "Buffs", {
      active: [{ stat: "strength", value: 2, turnsRemaining: 1 }],
    });

    processBuffs(world);
    expect(world.getComponent(e, "Buffs")!.active.length).toBe(0);
  });

  test("buff expiry emits debug message", () => {
    const world = new World();
    const messages = new MessageLog();
    const e = world.createEntity();
    world.addComponent(e, "Renderable", { char: "ϛ", fg: "red", bg: "black" });
    world.addComponent(e, "Buffs", {
      active: [{ stat: "strength", value: 2, turnsRemaining: 1 }],
    });

    processBuffs(world, messages);

    const all = messages.getAllMessagesWithTurns();
    expect(all.length).toBe(1);
    expect(all[0]!.category).toBe("debug");
    expect(all[0]!.text).toContain("[buff]");
    expect(all[0]!.text).toContain("strength +2 expired");
  });
});
