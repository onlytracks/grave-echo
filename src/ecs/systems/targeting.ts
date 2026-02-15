import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { isHostile, attack as performAttack } from "./combat.ts";
import { hasLineOfSight } from "./sensory.ts";
import type { AttackType } from "../components.ts";

export interface AttackValidation {
  valid: boolean;
  reason?: "no-target" | "out-of-range" | "no-los" | "not-cardinal" | "dead";
}

export function getVisibleHostiles(
  world: World,
  entity: Entity,
  visibleTiles: Set<string>,
): Entity[] {
  const pos = world.getComponent(entity, "Position");
  if (!pos) return [];

  const candidates = world.query("Position", "Faction", "Health");
  const hostiles: { entity: Entity; distance: number }[] = [];

  for (const other of candidates) {
    if (other === entity) continue;
    if (!isHostile(world, entity, other)) continue;
    const otherPos = world.getComponent(other, "Position")!;
    if (!visibleTiles.has(`${otherPos.x},${otherPos.y}`)) continue;
    const dist = Math.abs(otherPos.x - pos.x) + Math.abs(otherPos.y - pos.y);
    hostiles.push({ entity: other, distance: dist });
  }

  hostiles.sort((a, b) => a.distance - b.distance || a.entity - b.entity);
  return hostiles.map((h) => h.entity);
}

export function cycleTarget(
  world: World,
  entity: Entity,
  visibleTiles: Set<string>,
): void {
  const ts = world.getComponent(entity, "TargetSelection");
  if (!ts) return;

  const hostiles = getVisibleHostiles(world, entity, visibleTiles);
  if (hostiles.length === 0) {
    ts.targetEntity = null;
    return;
  }

  if (ts.targetEntity === null || !hostiles.includes(ts.targetEntity)) {
    ts.targetEntity = hostiles[0]!;
    return;
  }

  const idx = hostiles.indexOf(ts.targetEntity);
  ts.targetEntity = hostiles[(idx + 1) % hostiles.length]!;
}

export function clearStaleTarget(
  world: World,
  entity: Entity,
  visibleTiles: Set<string>,
): void {
  const ts = world.getComponent(entity, "TargetSelection");
  if (!ts || ts.targetEntity === null) return;

  const target = ts.targetEntity;
  const targetPos = world.getComponent(target, "Position");
  const targetHealth = world.getComponent(target, "Health");

  if (!targetPos || !targetHealth || targetHealth.current <= 0) {
    ts.targetEntity = null;
    return;
  }

  if (!visibleTiles.has(`${targetPos.x},${targetPos.y}`)) {
    ts.targetEntity = null;
    return;
  }

  if (!isHostile(world, entity, target)) {
    ts.targetEntity = null;
  }
}

export function getEquippedWeaponInfo(
  world: World,
  entity: Entity,
): { damage: number; range: number; attackType: AttackType } {
  const equipment = world.getComponent(entity, "Equipment");
  const weaponEntity = equipment?.weapon ?? null;
  if (weaponEntity !== null) {
    const weapon = world.getComponent(weaponEntity, "Weapon");
    if (weapon) {
      return {
        damage: weapon.damage,
        range: weapon.range,
        attackType: weapon.attackType,
      };
    }
  }
  return { damage: 0, range: 1, attackType: "melee" };
}

export function validateAttack(
  world: World,
  map: GameMap,
  attacker: Entity,
  target: Entity,
): AttackValidation {
  const attackerPos = world.getComponent(attacker, "Position");
  const targetPos = world.getComponent(target, "Position");
  const targetHealth = world.getComponent(target, "Health");

  if (!attackerPos || !targetPos) return { valid: false, reason: "no-target" };
  if (!targetHealth || targetHealth.current <= 0)
    return { valid: false, reason: "dead" };

  const weapon = getEquippedWeaponInfo(world, attacker);
  const dx = Math.abs(targetPos.x - attackerPos.x);
  const dy = Math.abs(targetPos.y - attackerPos.y);
  const manhattan = dx + dy;

  switch (weapon.attackType) {
    case "melee":
      if (manhattan > 1) return { valid: false, reason: "out-of-range" };
      return { valid: true };

    case "reach":
      if (manhattan > weapon.range)
        return { valid: false, reason: "out-of-range" };
      if (
        manhattan > 1 &&
        targetPos.x !== attackerPos.x &&
        targetPos.y !== attackerPos.y
      ) {
        return { valid: false, reason: "not-cardinal" };
      }
      if (
        manhattan > 1 &&
        !hasLineOfSight(
          map,
          attackerPos.x,
          attackerPos.y,
          targetPos.x,
          targetPos.y,
        )
      ) {
        return { valid: false, reason: "no-los" };
      }
      return { valid: true };

    case "ranged":
      if (manhattan > weapon.range)
        return { valid: false, reason: "out-of-range" };
      if (
        !hasLineOfSight(
          map,
          attackerPos.x,
          attackerPos.y,
          targetPos.x,
          targetPos.y,
        )
      ) {
        return { valid: false, reason: "no-los" };
      }
      return { valid: true };
  }
}

const ATTACK_FAIL_MESSAGES: Record<string, string> = {
  "out-of-range": "Target out of range.",
  "no-los": "No line of sight.",
  "not-cardinal": "Can't reach that angle.",
  dead: "Target is already dead.",
  "no-target": "No target selected.",
};

export function attemptRangedAttack(
  world: World,
  map: GameMap,
  attacker: Entity,
  messages: MessageLog,
): boolean {
  const ts = world.getComponent(attacker, "TargetSelection");
  if (!ts || ts.targetEntity === null) {
    messages.add("No target selected.");
    return false;
  }

  const validation = validateAttack(world, map, attacker, ts.targetEntity);
  if (!validation.valid) {
    messages.add(ATTACK_FAIL_MESSAGES[validation.reason!] ?? "Can't attack.");
    return false;
  }

  performAttack(world, attacker, ts.targetEntity, messages);
  return true;
}
