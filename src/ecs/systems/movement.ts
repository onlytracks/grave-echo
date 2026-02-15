import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { MessageLog } from "./messages.ts";
import { isHostile, attack } from "./combat.ts";

export type MoveResult = "moved" | "blocked" | "attacked";

export function tryMove(
  world: World,
  map: GameMap,
  entity: Entity,
  targetX: number,
  targetY: number,
  messages?: MessageLog,
): MoveResult {
  const turnActor = world.getComponent(entity, "TurnActor");
  if (turnActor && turnActor.movementRemaining <= 0) return "blocked";

  if (!map.isWalkable(targetX, targetY)) return "blocked";

  const blockers = world.query("Position", "Collidable");
  for (const other of blockers) {
    if (other === entity) continue;
    const pos = world.getComponent(other, "Position")!;
    const col = world.getComponent(other, "Collidable")!;
    if (col.blocksMovement && pos.x === targetX && pos.y === targetY) {
      if (messages && isHostile(world, entity, other)) {
        attack(world, entity, other, messages);
        return "attacked";
      }
      return "blocked";
    }
  }

  const position = world.getComponent(entity, "Position");
  if (position) {
    position.x = targetX;
    position.y = targetY;
    if (turnActor) turnActor.movementRemaining--;
  }
  return "moved";
}
