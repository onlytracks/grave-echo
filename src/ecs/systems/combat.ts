import type { World, Entity } from "../world.ts";
import type { MessageLog } from "./messages.ts";

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

  defenderHealth.current -= damage;

  const attackerName = getEntityName(world, attacker);
  const defenderName = getEntityName(world, defender);
  const critText = isCrit ? " (CRITICAL!)" : "";
  messages.add(
    `${attackerName} attacks ${defenderName} for ${damage} damage${critText}`,
  );

  const turnActor = world.getComponent(attacker, "TurnActor");
  if (turnActor) {
    turnActor.hasActed = true;
    turnActor.movementRemaining = 0;
  }
}

function getEntityName(world: World, entity: Entity): string {
  if (world.hasComponent(entity, "PlayerControlled")) return "You";
  const renderable = world.getComponent(entity, "Renderable");
  if (renderable) return `The ${renderable.char}`;
  return "Something";
}
