import type { World, Entity } from "../world.ts";
import type { MessageLog } from "./messages.ts";
import { entityName } from "./entity-name.ts";

export function isHostile(world: World, a: Entity, b: Entity): boolean {
  const factionA = world.getComponent(a, "Faction");
  const factionB = world.getComponent(b, "Faction");
  if (!factionA || !factionB) return false;
  if (factionA.factionId === "neutral" || factionB.factionId === "neutral")
    return false;
  return factionA.factionId !== factionB.factionId;
}

export function attack(
  world: World,
  attacker: Entity,
  defender: Entity,
  messages: MessageLog,
  rng: () => number = Math.random,
): void {
  const attackerStats = world.getComponent(attacker, "Stats");
  const defenderStats = world.getComponent(defender, "Stats");
  const defenderHealth = world.getComponent(defender, "Health");
  if (!attackerStats || !defenderStats || !defenderHealth) return;

  const equipment = world.getComponent(attacker, "Equipment");
  const weaponEntity = equipment?.weapon ?? null;
  const weapon =
    weaponEntity !== null
      ? world.getComponent(weaponEntity, "Weapon")
      : undefined;
  const baseDamage = weapon ? weapon.damage : attackerStats.strength;

  const variance = Math.floor(rng() * 3) - 1; // -1, 0, or 1
  let damage = Math.max(1, baseDamage - defenderStats.defense + variance);

  const isCrit = rng() < 0.05;
  if (isCrit) damage *= 2;

  const hpBefore = defenderHealth.current;
  defenderHealth.current -= damage;

  const attackerDisplay = getDisplayName(world, attacker);
  const defenderDisplay = getDisplayName(world, defender);
  const critText = isCrit ? " (CRITICAL!)" : "";
  messages.add(
    `${attackerDisplay} attacks ${defenderDisplay} for ${damage} damage${critText}`,
  );

  const atkName = entityName(world, attacker);
  const defName = entityName(world, defender);
  const attackerHealth = world.getComponent(attacker, "Health");
  const atkHp = attackerHealth
    ? `${attackerHealth.current}/${attackerHealth.max}`
    : "?";
  const defHp = `${defenderHealth.current}/${defenderHealth.max}`;
  messages.add(
    `[combat] ${atkName}[hp=${atkHp} str=${attackerStats.strength} def=${attackerStats.defense} spd=${attackerStats.speed}] → ${defName}[hp=${defHp} str=${defenderStats.strength} def=${defenderStats.defense} spd=${defenderStats.speed}] | dmg=${damage}${isCrit ? " crit" : ""} (base=${baseDamage} var=${variance}) hp: ${hpBefore}→${defenderHealth.current}`,
    "debug",
  );

  const turnActor = world.getComponent(attacker, "TurnActor");
  if (turnActor) {
    turnActor.hasActed = true;
    turnActor.movementRemaining = 0;
  }
}

function getDisplayName(world: World, entity: Entity): string {
  if (world.hasComponent(entity, "PlayerControlled")) return "You";
  const renderable = world.getComponent(entity, "Renderable");
  if (renderable) return `The ${renderable.char}`;
  return "Something";
}
