import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { tryMove } from "./movement.ts";
import { attack } from "./combat.ts";
import { updateAwareness } from "./sensory.ts";
import { entityName } from "./entity-name.ts";
import { getEquippedWeaponInfo, validateAttack } from "./targeting.ts";
import { findPath, type PathNode } from "../../pathfinding/astar.ts";
import {
  makePassable,
  findRetreatPath as findRetreatPathHelper,
} from "../../pathfinding/helpers.ts";

function getDisplayName(world: World, entity: Entity): string {
  if (world.hasComponent(entity, "PlayerControlled")) return "You";
  const renderable = world.getComponent(entity, "Renderable");
  if (renderable) return `The ${renderable.char}`;
  return "Something";
}

function shouldDrinkPotion(world: World, entity: Entity): boolean {
  const ai = world.getComponent(entity, "AIControlled")!;
  if (!ai.canDrinkPotions) return false;
  if (ai.hasUsedPotion) return false;

  const health = world.getComponent(entity, "Health");
  if (!health || health.current / health.max > 0.4) return false;

  const inventory = world.getComponent(entity, "Inventory");
  if (!inventory) return false;

  return inventory.items.some((id) => {
    const c = world.getComponent(id, "Consumable");
    return c?.effectType === "heal";
  });
}

function drinkPotion(world: World, entity: Entity, messages: MessageLog): void {
  const health = world.getComponent(entity, "Health")!;
  const inventory = world.getComponent(entity, "Inventory")!;
  const ai = world.getComponent(entity, "AIControlled")!;

  const potionId = inventory.items.find((id) => {
    const c = world.getComponent(id, "Consumable");
    return c?.effectType === "heal";
  });
  if (!potionId) return;

  const consumable = world.getComponent(potionId, "Consumable")!;
  const healed = Math.min(consumable.power, health.max - health.current);
  health.current += healed;
  ai.hasUsedPotion = true;

  const name = entityName(world, entity);
  messages.add(
    `${getDisplayName(world, entity)} drinks a potion! (+${healed} HP)`,
  );
  messages.add(
    `[ai] ${name}: drank potion, healed ${healed}, hp=${health.current}/${health.max}`,
    "debug",
  );

  const turnActor = world.getComponent(entity, "TurnActor")!;
  turnActor.hasActed = true;
  turnActor.movementRemaining = 0;
}

function getGoal(
  world: World,
  entity: Entity,
): { x: number; y: number; source: string } | null {
  const ai = world.getComponent(entity, "AIControlled")!;
  const awareness = world.getComponent(entity, "Awareness");

  if (ai.targetEntity !== null) {
    const targetPos = world.getComponent(ai.targetEntity, "Position");
    if (targetPos) return { x: targetPos.x, y: targetPos.y, source: "target" };
  }

  if (awareness?.lastKnownTarget) {
    return {
      x: awareness.lastKnownTarget.x,
      y: awareness.lastKnownTarget.y,
      source: "last known",
    };
  }

  return null;
}

const PATH_RECOMPUTE_INTERVAL = 3;

function getOrComputePath(
  world: World,
  map: GameMap,
  entity: Entity,
  goalX: number,
  goalY: number,
  messages: MessageLog,
): PathNode[] | null {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;

  const needsRecompute =
    !ai.currentPath ||
    ai.currentPath.length === 0 ||
    ai.pathTargetX !== goalX ||
    ai.pathTargetY !== goalY ||
    (ai.pathAge ?? 0) >= PATH_RECOMPUTE_INTERVAL;

  if (!needsRecompute) {
    ai.pathAge = (ai.pathAge ?? 0) + 1;
    return ai.currentPath!;
  }

  const isPassable = makePassable(world, map, entity, ai.targetEntity);
  const path = findPath(pos.x, pos.y, goalX, goalY, isPassable);

  ai.currentPath = path ?? undefined;
  ai.pathTargetX = goalX;
  ai.pathTargetY = goalY;
  ai.pathAge = 0;

  return path;
}

function moveToward(
  world: World,
  map: GameMap,
  entity: Entity,
  goalX: number,
  goalY: number,
  messages: MessageLog,
): void {
  const turnActor = world.getComponent(entity, "TurnActor")!;
  const ai = world.getComponent(entity, "AIControlled")!;

  const path = getOrComputePath(world, map, entity, goalX, goalY, messages);
  if (!path || path.length === 0) return;

  while (turnActor.movementRemaining > 0 && !turnActor.hasActed) {
    const next = path[0];
    if (!next) break;

    const result = tryMove(world, map, entity, next.x, next.y, messages);
    if (result === "moved") {
      path.shift();
      if (ai.currentPath === path) {
        // Path modified in place; pathAge stays valid
      }
    } else if (result === "attacked") {
      break;
    } else {
      ai.currentPath = undefined;
      break;
    }
  }
}

function tryRangedAttack(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): boolean {
  const ai = world.getComponent(entity, "AIControlled")!;
  if (ai.targetEntity === null) return false;

  const validation = validateAttack(world, map, entity, ai.targetEntity);
  if (validation.valid) {
    attack(world, entity, ai.targetEntity, messages);
    return true;
  }
  return false;
}

function chargerBehavior(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const pos = world.getComponent(entity, "Position")!;
  const name = entityName(world, entity);
  const startX = pos.x;
  const startY = pos.y;

  const goal = getGoal(world, entity);
  if (!goal) return;

  if (tryRangedAttack(world, map, entity, messages)) {
    messages.add(
      `[ai] ${name}: ranged attack on target at (${goal.x},${goal.y})`,
      "debug",
    );
    return;
  }

  moveToward(world, map, entity, goal.x, goal.y, messages);

  if (pos.x !== startX || pos.y !== startY) {
    messages.add(
      `[ai] ${name}: moved (${startX},${startY})→(${pos.x},${pos.y}) toward ${goal.source} (${goal.x},${goal.y})`,
      "debug",
    );
  }
}

function archerBehavior(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;
  const turnActor = world.getComponent(entity, "TurnActor")!;
  const name = entityName(world, entity);
  const startX = pos.x;
  const startY = pos.y;

  const goal = getGoal(world, entity);
  if (!goal) return;

  const weapon = getEquippedWeaponInfo(world, entity);
  const dist = Math.abs(pos.x - goal.x) + Math.abs(pos.y - goal.y);

  if (dist <= 2 && ai.targetEntity !== null) {
    const retreated = retreatFrom(world, map, entity, goal.x, goal.y, messages);
    if ((retreated && pos.x !== startX) || pos.y !== startY) {
      messages.add(
        `[ai] ${name}: retreating from target (d=${dist}), moving (${startX},${startY})→(${pos.x},${pos.y})`,
        "debug",
      );
    }

    if (tryRangedAttack(world, map, entity, messages)) {
      messages.add(
        `[ai] ${name}: attacking target at range ${Math.abs(pos.x - goal.x) + Math.abs(pos.y - goal.y)}`,
        "debug",
      );
    }
    return;
  }

  if (ai.targetEntity !== null && dist <= weapon.range) {
    if (tryRangedAttack(world, map, entity, messages)) {
      messages.add(`[ai] ${name}: attacking target at range ${dist}`, "debug");
      return;
    }
  }

  moveToward(world, map, entity, goal.x, goal.y, messages);

  if (pos.x !== startX || pos.y !== startY) {
    messages.add(
      `[ai] ${name}: closing distance (${startX},${startY})→(${pos.x},${pos.y})`,
      "debug",
    );
  }

  if (!turnActor.hasActed && tryRangedAttack(world, map, entity, messages)) {
    messages.add(`[ai] ${name}: attacking after moving`, "debug");
  }
}

function retreatFrom(
  world: World,
  map: GameMap,
  entity: Entity,
  fromX: number,
  fromY: number,
  messages: MessageLog,
): boolean {
  const pos = world.getComponent(entity, "Position")!;
  const turnActor = world.getComponent(entity, "TurnActor")!;
  let moved = false;

  const isPassable = makePassable(world, map, entity, null);
  const retreatPath = findRetreatPathHelper(
    pos.x,
    pos.y,
    fromX,
    fromY,
    turnActor.movementRemaining + 2,
    isPassable,
  );

  if (!retreatPath || retreatPath.length === 0) return false;

  while (turnActor.movementRemaining > 0 && !turnActor.hasActed) {
    const next = retreatPath.shift();
    if (!next) break;

    const result = tryMove(world, map, entity, next.x, next.y, messages);
    if (result === "moved") {
      moved = true;
    } else {
      break;
    }
  }

  return moved;
}

function guardianBehavior(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;
  const name = entityName(world, entity);

  if (ai.targetEntity === null) {
    messages.add(`[ai] ${name}: holding position, no target`, "debug");
    return;
  }

  const targetPos = world.getComponent(ai.targetEntity, "Position");
  if (!targetPos) return;

  const dist = Math.abs(pos.x - targetPos.x) + Math.abs(pos.y - targetPos.y);

  if (tryRangedAttack(world, map, entity, messages)) {
    const weapon = getEquippedWeaponInfo(world, entity);
    messages.add(
      `[ai] ${name}: attacking target at range ${dist} (${weapon.attackType})`,
      "debug",
    );
    return;
  }

  messages.add(
    `[ai] ${name}: holding position, target out of range (d=${dist})`,
    "debug",
  );
}

function skulkerBehavior(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;
  const name = entityName(world, entity);
  const startX = pos.x;
  const startY = pos.y;

  const goal = getGoal(world, entity);
  if (!goal) return;

  const dist = Math.abs(pos.x - goal.x) + Math.abs(pos.y - goal.y);

  if (dist <= 1 && ai.targetEntity !== null) {
    if (tryRangedAttack(world, map, entity, messages)) {
      messages.add(`[ai] ${name}: attacking adjacent target`, "debug");
      return;
    }
    chargerBehavior(world, map, entity, messages);
    return;
  }

  const flank = findFlankingPosition(world, map, entity, goal.x, goal.y);
  if (flank) {
    messages.add(
      `[ai] ${name}: flanking toward (${flank.x},${flank.y}), opposite side of target`,
      "debug",
    );
    moveToward(world, map, entity, flank.x, flank.y, messages);

    if (pos.x !== startX || pos.y !== startY) {
      messages.add(
        `[ai] ${name}: moved (${startX},${startY})→(${pos.x},${pos.y})`,
        "debug",
      );
    }

    const turnActor = world.getComponent(entity, "TurnActor")!;
    const newDist = Math.abs(pos.x - goal.x) + Math.abs(pos.y - goal.y);
    if (newDist <= 1 && ai.targetEntity !== null && !turnActor.hasActed) {
      tryRangedAttack(world, map, entity, messages);
    }
    return;
  }

  messages.add(
    `[ai] ${name}: can't flank, falling back to direct approach`,
    "debug",
  );
  chargerBehavior(world, map, entity, messages);
}

function findFlankingPosition(
  world: World,
  map: GameMap,
  entity: Entity,
  targetX: number,
  targetY: number,
): { x: number; y: number } | null {
  const pos = world.getComponent(entity, "Position")!;

  const adjacent = [
    { x: targetX + 1, y: targetY },
    { x: targetX - 1, y: targetY },
    { x: targetX, y: targetY + 1 },
    { x: targetX, y: targetY - 1 },
  ];

  const walkable = adjacent.filter((p) => {
    if (!map.isWalkable(p.x, p.y)) return false;
    const blockers = world.query("Position", "Collidable");
    for (const b of blockers) {
      if (b === entity) continue;
      const bPos = world.getComponent(b, "Position")!;
      const col = world.getComponent(b, "Collidable")!;
      if (col.blocksMovement && bPos.x === p.x && bPos.y === p.y) return false;
    }
    return true;
  });

  if (walkable.length === 0) return null;

  walkable.sort((a, b) => {
    const distA = Math.abs(a.x - pos.x) + Math.abs(a.y - pos.y);
    const distB = Math.abs(b.x - pos.x) + Math.abs(b.y - pos.y);
    return distB - distA;
  });

  return walkable[0]!;
}

function patrolBehavior(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const awareness = world.getComponent(entity, "Awareness");
  const name = entityName(world, entity);

  if (awareness && awareness.state === "alert") {
    messages.add(`[ai] ${name}: alert! switching to chase`, "debug");
    chargerBehavior(world, map, entity, messages);
    return;
  }

  patrolIdle(world, map, entity, messages);
}

function patrolIdle(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;
  const turnActor = world.getComponent(entity, "TurnActor")!;
  const name = entityName(world, entity);

  if (!ai.patrolPath || ai.patrolPath.length === 0) return;

  const idx = ai.patrolIndex ?? 0;
  const waypoint = ai.patrolPath[idx]!;

  messages.add(
    `[ai] ${name}: patrolling toward waypoint (${waypoint.x},${waypoint.y})`,
    "debug",
  );

  const startX = pos.x;
  const startY = pos.y;

  while (turnActor.movementRemaining > 0 && !turnActor.hasActed) {
    const currentWp = ai.patrolPath[ai.patrolIndex ?? 0]!;
    if (pos.x === currentWp.x && pos.y === currentWp.y) {
      ai.patrolIndex = ((ai.patrolIndex ?? 0) + 1) % ai.patrolPath.length;
      ai.currentPath = undefined;
      const nextWp = ai.patrolPath[ai.patrolIndex]!;
      messages.add(
        `[ai] ${name}: reached waypoint, next (${nextWp.x},${nextWp.y})`,
        "debug",
      );
      if (pos.x === nextWp.x && pos.y === nextWp.y) break;
      continue;
    }

    const path = getOrComputePath(
      world,
      map,
      entity,
      currentWp.x,
      currentWp.y,
      messages,
    );
    if (!path || path.length === 0) break;

    const next = path[0];
    if (!next) break;

    const result = tryMove(world, map, entity, next.x, next.y, messages);
    if (result === "moved") {
      path.shift();
    } else {
      ai.currentPath = undefined;
      break;
    }
  }

  if (pos.x !== startX || pos.y !== startY) {
    messages.add(
      `[ai] ${name}: patrol moved (${startX},${startY})→(${pos.x},${pos.y})`,
      "debug",
    );
  }
}

function resumeNearestWaypoint(
  ai: { patrolPath?: { x: number; y: number }[]; patrolIndex?: number },
  x: number,
  y: number,
): void {
  if (!ai.patrolPath || ai.patrolPath.length === 0) return;
  let bestDist = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < ai.patrolPath.length; i++) {
    const wp = ai.patrolPath[i]!;
    const d = Math.abs(wp.x - x) + Math.abs(wp.y - y);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  ai.patrolIndex = bestIdx;
}

export function processAI(
  world: World,
  map: GameMap,
  messages: MessageLog,
): void {
  const aiEntities = world.query(
    "AIControlled",
    "TurnActor",
    "Position",
    "Stats",
  );
  for (const entity of aiEntities) {
    updateAwareness(world, map, entity, messages);

    const awareness = world.getComponent(entity, "Awareness");
    const ai = world.getComponent(entity, "AIControlled")!;

    if (awareness && awareness.state === "idle") {
      if (ai.pattern === "patrol") {
        patrolBehavior(world, map, entity, messages);
      } else {
        messages.add(
          `[ai] ${entityName(world, entity)}: idle, skipping`,
          "debug",
        );
      }

      if (ai.pattern === "patrol" && awareness.state === "idle") {
        resumeNearestWaypoint(
          ai,
          world.getComponent(entity, "Position")!.x,
          world.getComponent(entity, "Position")!.y,
        );
      }
      continue;
    }

    if (shouldDrinkPotion(world, entity)) {
      drinkPotion(world, entity, messages);
      continue;
    }

    switch (ai.pattern) {
      case "charger":
        chargerBehavior(world, map, entity, messages);
        break;
      case "archer":
        archerBehavior(world, map, entity, messages);
        break;
      case "guardian":
        guardianBehavior(world, map, entity, messages);
        break;
      case "skulker":
        skulkerBehavior(world, map, entity, messages);
        break;
      case "patrol":
        patrolBehavior(world, map, entity, messages);
        break;
    }
  }
}
