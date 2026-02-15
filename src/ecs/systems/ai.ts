import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { tryMove } from "./movement.ts";
import { updateAwareness } from "./sensory.ts";

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

  let goalX: number;
  let goalY: number;

  if (ai.targetEntity !== null) {
    const targetPos = world.getComponent(ai.targetEntity, "Position");
    if (targetPos) {
      goalX = targetPos.x;
      goalY = targetPos.y;
    } else {
      return;
    }
  } else if (awareness?.lastKnownTarget) {
    goalX = awareness.lastKnownTarget.x;
    goalY = awareness.lastKnownTarget.y;
  } else {
    return;
  }

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

    if (result === "blocked") break;
    if (result === "attacked") break;
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
    updateAwareness(world, map, entity);

    const awareness = world.getComponent(entity, "Awareness");
    if (awareness && awareness.state === "idle") continue;

    const ai = world.getComponent(entity, "AIControlled")!;
    switch (ai.pattern) {
      case "charger":
        chargerBehavior(world, map, entity, messages);
        break;
    }
  }
}
