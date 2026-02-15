import type { World, Entity } from "../world.ts";

export interface EffectiveStats {
  strength: number;
  defense: number;
  speed: number;
}

export function getEffectiveStats(
  world: World,
  entity: Entity,
): EffectiveStats | null {
  const base = world.getComponent(entity, "Stats");
  if (!base) return null;

  let str = base.strength;
  let def = base.defense;
  let spd = base.speed;

  const equipment = world.getComponent(entity, "Equipment");
  if (equipment) {
    const armorEntity = equipment.armor;
    if (armorEntity !== null) {
      const armor = world.getComponent(armorEntity, "Armor");
      if (armor) {
        def += armor.defense;
        spd -= armor.speedPenalty;
      }
    }

    const weaponEntity = equipment.weapon;
    if (weaponEntity !== null) {
      const weapon = world.getComponent(weaponEntity, "Weapon");
      if (weapon) {
        def += weapon.defenseBonus;
      }
    }

    for (const slot of [equipment.accessory1, equipment.accessory2]) {
      if (slot === null) continue;
      const acc = world.getComponent(slot, "Accessory");
      if (!acc) continue;
      for (const bonus of acc.bonuses) {
        if (bonus.stat === "strength") str += bonus.value;
        if (bonus.stat === "defense") def += bonus.value;
        if (bonus.stat === "speed") spd += bonus.value;
      }
    }
  }

  const buffs = world.getComponent(entity, "Buffs");
  if (buffs) {
    for (const buff of buffs.active) {
      if (buff.stat === "strength") str += buff.value;
      if (buff.stat === "defense") def += buff.value;
      if (buff.stat === "speed") spd += buff.value;
    }
  }

  return { strength: str, defense: def, speed: Math.max(0, spd) };
}

export function processBuffs(world: World): void {
  const entities = world.query("Buffs");
  for (const entity of entities) {
    const buffs = world.getComponent(entity, "Buffs")!;
    buffs.active = buffs.active.filter((b) => {
      b.turnsRemaining--;
      return b.turnsRemaining > 0;
    });
  }
}
