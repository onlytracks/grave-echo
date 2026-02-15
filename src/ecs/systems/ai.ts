import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { tryMove } from "./movement.ts";

function chargerBehavior(
  world: World,
  map: GameMap,
  entity: Entity,
  messages: MessageLog,
): void {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;
  const turnActor = world.getComponent(entity, "TurnActor")!;

  if (ai.targetEntity === null) return;
  const targetPos = world.getComponent(ai.targetEntity, "Position");
  if (!targetPos) return;

  while (turnActor.movementRemaining > 0 && !turnActor.hasActed) {
    const dx = targetPos.x - pos.x;
    const dy = targetPos.y - pos.y;

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
    const ai = world.getComponent(entity, "AIControlled")!;
    switch (ai.pattern) {
      case "charger":
        chargerBehavior(world, map, entity, messages);
        break;
    }
  }
}
