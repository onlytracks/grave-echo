import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";

export function tryMove(
  world: World,
  map: GameMap,
  entity: Entity,
  targetX: number,
  targetY: number,
): boolean {
  if (!map.isWalkable(targetX, targetY)) return false;

  const blockers = world.query("Position", "Collidable");
  for (const other of blockers) {
    if (other === entity) continue;
    const pos = world.getComponent(other, "Position")!;
    const col = world.getComponent(other, "Collidable")!;
    if (col.blocksMovement && pos.x === targetX && pos.y === targetY) {
      return false;
    }
  }

  const position = world.getComponent(entity, "Position");
  if (position) {
    position.x = targetX;
    position.y = targetY;
  }
  return true;
}
