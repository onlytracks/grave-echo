import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { isHostile, attack as performAttack } from "./combat.ts";
import { hasLineOfSight } from "./sensory.ts";
import type { AttackType } from "../components.ts";
import { entityName } from "./entity-name.ts";

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
  messages?: MessageLog,
): void {
  const ts = world.getComponent(entity, "TargetSelection");
  if (!ts) return;

  const prev = ts.targetEntity;
  const hostiles = getVisibleHostiles(world, entity, visibleTiles);
  if (hostiles.length === 0) {
    ts.targetEntity = null;
    if (messages && prev !== null) {
      const name = entityName(world, entity);
      messages.add(
        `[target] ${name} target: ${entityName(world, prev)} → none`,
        "debug",
      );
    }
    return;
  }

  if (ts.targetEntity === null || !hostiles.includes(ts.targetEntity)) {
    ts.targetEntity = hostiles[0]!;
  } else {
    const idx = hostiles.indexOf(ts.targetEntity);
    ts.targetEntity = hostiles[(idx + 1) % hostiles.length]!;
  }

  if (messages && ts.targetEntity !== prev) {
    const name = entityName(world, entity);
    const prevName = prev !== null ? entityName(world, prev) : "none";
    const newTarget = ts.targetEntity;
    const newName = entityName(world, newTarget);
    const pos = world.getComponent(entity, "Position");
    const targetPos = world.getComponent(newTarget, "Position");
    let dist = 0;
    if (pos && targetPos) {
      dist = Math.abs(targetPos.x - pos.x) + Math.abs(targetPos.y - pos.y);
    }
    messages.add(
      `[target] ${name} target: ${prevName} → ${newName} (dist=${dist})`,
      "debug",
    );
  }
}

export function clearStaleTarget(
  world: World,
  entity: Entity,
  visibleTiles: Set<string>,
  messages?: MessageLog,
): void {
  const ts = world.getComponent(entity, "TargetSelection");
  if (!ts || ts.targetEntity === null) return;

  const target = ts.targetEntity;
  const targetPos = world.getComponent(target, "Position");
  const targetHealth = world.getComponent(target, "Health");
  const name = entityName(world, entity);

  if (!targetPos || !targetHealth || targetHealth.current <= 0) {
    if (messages) {
      const reason =
        !targetHealth || targetHealth.current <= 0 ? "dead" : "gone";
      messages.add(
        `[target] ${name} target ${entityName(world, target)} cleared: ${reason}`,
        "debug",
      );
    }
    ts.targetEntity = null;
    return;
  }

  if (!visibleTiles.has(`${targetPos.x},${targetPos.y}`)) {
    if (messages) {
      messages.add(
        `[target] ${name} target ${entityName(world, target)} cleared: out of sight`,
        "debug",
      );
    }
    ts.targetEntity = null;
    return;
  }

  if (!isHostile(world, entity, target)) {
    if (messages) {
      messages.add(
        `[target] ${name} target ${entityName(world, target)} cleared: not hostile`,
        "debug",
      );
    }
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

    const attackerName = entityName(world, attacker);
    const targetName = entityName(world, ts.targetEntity);
    const attackerPos = world.getComponent(attacker, "Position");
    const targetPos = world.getComponent(ts.targetEntity, "Position");
    if (attackerPos && targetPos) {
      const dist =
        Math.abs(targetPos.x - attackerPos.x) +
        Math.abs(targetPos.y - attackerPos.y);
      const weapon = getEquippedWeaponInfo(world, attacker);
      messages.add(
        `[combat] ${attackerName} attack failed: ${validation.reason} (target=${targetName} at (${targetPos.x},${targetPos.y}), dist=${dist}, range=${weapon.range})`,
        "debug",
      );
    }
    return false;
  }

  performAttack(world, attacker, ts.targetEntity, messages);
  return true;
}
