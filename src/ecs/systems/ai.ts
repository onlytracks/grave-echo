import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { tryMove } from "./movement.ts";
import { attack } from "./combat.ts";
import { updateAwareness } from "./sensory.ts";
import { entityName } from "./entity-name.ts";
import { getEquippedWeaponInfo, validateAttack } from "./targeting.ts";

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

function moveToward(
  world: World,
  map: GameMap,
  entity: Entity,
  goalX: number,
  goalY: number,
  messages: MessageLog,
): void {
  const pos = world.getComponent(entity, "Position")!;
  const turnActor = world.getComponent(entity, "TurnActor")!;

  while (turnActor.movementRemaining > 0 && !turnActor.hasActed) {
    const dx = goalX - pos.x;
    const dy = goalY - pos.y;
    if (dx === 0 && dy === 0) break;

    const stepX = dx !== 0 ? Math.sign(dx) : 0;
    const stepY = dy !== 0 ? Math.sign(dy) : 0;

    let result: string = "blocked";
    if (Math.abs(dx) >= Math.abs(dy)) {
      result = tryMove(world, map, entity, pos.x + stepX, pos.y, messages);
      if (result === "blocked" && stepY !== 0) {
        result = tryMove(world, map, entity, pos.x, pos.y + stepY, messages);
      }
    } else {
      result = tryMove(world, map, entity, pos.x, pos.y + stepY, messages);
      if (result === "blocked" && stepX !== 0) {
        result = tryMove(world, map, entity, pos.x + stepX, pos.y, messages);
      }
    }

    if (result === "blocked" || result === "attacked") break;
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

  while (turnActor.movementRemaining > 0 && !turnActor.hasActed) {
    const dx = pos.x - fromX;
    const dy = pos.y - fromY;

    const awayX = dx !== 0 ? Math.sign(dx) : 0;
    const awayY = dy !== 0 ? Math.sign(dy) : 0;

    let result: string = "blocked";

    // Try moving directly away
    if (awayX !== 0) {
      result = tryMove(world, map, entity, pos.x + awayX, pos.y, messages);
    }
    if (result === "blocked" && awayY !== 0) {
      result = tryMove(world, map, entity, pos.x, pos.y + awayY, messages);
    }
    // Try perpendicular directions
    if (result === "blocked") {
      const perpDirs = [
        { x: 0, y: 1 },
        { x: 0, y: -1 },
        { x: 1, y: 0 },
        { x: -1, y: 0 },
      ].filter(
        (d) =>
          d.x !== -awayX && d.y !== -awayY && (d.x !== awayX || d.y !== awayY),
      );
      for (const d of perpDirs) {
        result = tryMove(
          world,
          map,
          entity,
          pos.x + d.x,
          pos.y + d.y,
          messages,
        );
        if (result !== "blocked") break;
      }
    }

    if (result === "blocked" || result === "attacked") break;
    moved = true;
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

    const newDist = Math.abs(pos.x - goal.x) + Math.abs(pos.y - goal.y);
    if (newDist <= 1 && ai.targetEntity !== null) {
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
      const nextWp = ai.patrolPath[ai.patrolIndex]!;
      messages.add(
        `[ai] ${name}: reached waypoint, next (${nextWp.x},${nextWp.y})`,
        "debug",
      );
      if (pos.x === nextWp.x && pos.y === nextWp.y) break;
      continue;
    }

    const dx = currentWp.x - pos.x;
    const dy = currentWp.y - pos.y;
    const stepX = dx !== 0 ? Math.sign(dx) : 0;
    const stepY = dy !== 0 ? Math.sign(dy) : 0;

    let result: string = "blocked";
    if (Math.abs(dx) >= Math.abs(dy)) {
      result = tryMove(world, map, entity, pos.x + stepX, pos.y, messages);
      if (result === "blocked" && stepY !== 0) {
        result = tryMove(world, map, entity, pos.x, pos.y + stepY, messages);
      }
    } else {
      result = tryMove(world, map, entity, pos.x, pos.y + stepY, messages);
      if (result === "blocked" && stepX !== 0) {
        result = tryMove(world, map, entity, pos.x + stepX, pos.y, messages);
      }
    }

    if (result === "blocked" || result === "attacked") break;
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
