import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import { tryMove } from "./movement.ts";

function chargerBehavior(world: World, map: GameMap, entity: Entity): void {
  const ai = world.getComponent(entity, "AIControlled")!;
  const pos = world.getComponent(entity, "Position")!;
  const turnActor = world.getComponent(entity, "TurnActor")!;

  if (ai.targetEntity === null) return;
  const targetPos = world.getComponent(ai.targetEntity, "Position");
  if (!targetPos) return;

  while (turnActor.movementRemaining > 0) {
    const dx = targetPos.x - pos.x;
    const dy = targetPos.y - pos.y;

    if (dx === 0 && dy === 0) break;
    if (Math.abs(dx) <= 1 && Math.abs(dy) <= 1) break;

    const stepX = dx !== 0 ? Math.sign(dx) : 0;
    const stepY = dy !== 0 ? Math.sign(dy) : 0;

    let moved = false;
    if (Math.abs(dx) >= Math.abs(dy)) {
      moved = tryMove(world, map, entity, pos.x + stepX, pos.y);
      if (!moved && stepY !== 0) {
        moved = tryMove(world, map, entity, pos.x, pos.y + stepY);
      }
    } else {
      moved = tryMove(world, map, entity, pos.x, pos.y + stepY);
      if (!moved && stepX !== 0) {
        moved = tryMove(world, map, entity, pos.x + stepX, pos.y);
      }
    }

    if (!moved) break;
  }
}

export function processAI(world: World, map: GameMap): void {
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
        chargerBehavior(world, map, entity);
        break;
    }
  }
}
