import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { tryMove } from "./movement.ts";
import { updateAwareness } from "./sensory.ts";
import { entityName } from "./entity-name.ts";

function chargerBehavior(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;
  const turnActor = world.getComponent(entity, "TurnActor")!;
  const awareness = world.getComponent(entity, "Awareness");
  const name = entityName(world, entity);

  let goalX: number;
  let goalY: number;
  let goalSource: string;

  if (ai.targetEntity !== null) {
    const targetPos = world.getComponent(ai.targetEntity, "Position");
    if (targetPos) {
      goalX = targetPos.x;
      goalY = targetPos.y;
      goalSource = "target";
    } else {
      return;
    }
  } else if (awareness?.lastKnownTarget) {
    goalX = awareness.lastKnownTarget.x;
    goalY = awareness.lastKnownTarget.y;
    goalSource = "last known";
  } else {
    return;
  }

  const startX = pos.x;
  const startY = pos.y;

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

    if (result === "blocked") {
      messages.add(`[ai] ${name}: blocked at (${pos.x},${pos.y})`, "debug");
      break;
    }
    if (result === "attacked") {
      messages.add(
        `[ai] ${name}: bumped hostile at (${goalX},${goalY})`,
        "debug",
      );
      break;
    }
  }

  if (pos.x !== startX || pos.y !== startY) {
    messages.add(
      `[ai] ${name}: moved (${startX},${startY})→(${pos.x},${pos.y}) toward ${goalSource} (${goalX},${goalY})`,
      "debug",
    );
  }
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
    if (awareness && awareness.state === "idle") {
      messages.add(
        `[ai] ${entityName(world, entity)}: idle, skipping`,
        "debug",
      );
      continue;
    }

    const ai = world.getComponent(entity, "AIControlled")!;
    switch (ai.pattern) {
      case "charger":
        chargerBehavior(world, map, entity, messages);
        break;
    }
  }
}
