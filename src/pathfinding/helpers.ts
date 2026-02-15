import type { World, Entity } from "../ecs/world.ts";
import type { GameMap } from "../map/game-map.ts";
import { findPath, type PathNode } from "./astar.ts";

export function makePassable(
  world: World,
  map: GameMap,
  entity: Entity,
  goalEntity: Entity | null,
): (x: number, y: number) => boolean {
  const blocked = new Set<string>();
  const blockers = world.query("Position", "Collidable");
  for (const other of blockers) {
    if (other === entity) continue;
    if (other === goalEntity) continue;
    const pos = world.getComponent(other, "Position")!;
    const col = world.getComponent(other, "Collidable")!;
    if (col.blocksMovement) blocked.add(`${pos.x},${pos.y}`);
  }

  return (x: number, y: number) => {
    if (!map.isWalkable(x, y)) return false;
    return !blocked.has(`${x},${y}`);
  };
}

export function makePassableFromBlockedSet(
  map: GameMap,
  blocked: Set<string>,
): (x: number, y: number) => boolean {
  return (x: number, y: number) => {
    if (!map.isWalkable(x, y)) return false;
    return !blocked.has(`${x},${y}`);
  };
}

export function buildBlockedSet(
  world: World,
  exclude?: Entity,
  excludeGoal?: Entity,
): Set<string> {
  const blocked = new Set<string>();
  const blockers = world.query("Position", "Collidable");
  for (const other of blockers) {
    if (other === exclude) continue;
    if (other === excludeGoal) continue;
    const pos = world.getComponent(other, "Position")!;
    const col = world.getComponent(other, "Collidable")!;
    if (col.blocksMovement) blocked.add(`${pos.x},${pos.y}`);
  }
  return blocked;
}

export function findRetreatPath(
  startX: number,
  startY: number,
  awayFromX: number,
  awayFromY: number,
  steps: number,
  isPassable: (x: number, y: number) => boolean,
): PathNode[] | null {
  let bestTile: PathNode | null = null;
  let bestDist = -Infinity;

  for (let dx = -steps; dx <= steps; dx++) {
    for (let dy = -steps; dy <= steps; dy++) {
      const manhattan = Math.abs(dx) + Math.abs(dy);
      if (manhattan === 0 || manhattan > steps) continue;
      const tx = startX + dx;
      const ty = startY + dy;
      if (!isPassable(tx, ty)) continue;
      const distFromThreat =
        Math.abs(tx - awayFromX) + Math.abs(ty - awayFromY);
      if (distFromThreat > bestDist) {
        bestDist = distFromThreat;
        bestTile = { x: tx, y: ty };
      }
    }
  }

  if (!bestTile) return null;
  return findPath(startX, startY, bestTile.x, bestTile.y, isPassable);
}

export function findPathToNearest(
  startX: number,
  startY: number,
  candidates: PathNode[],
  isPassable: (x: number, y: number) => boolean,
  maxSearchNodes?: number,
): PathNode[] | null {
  let bestPath: PathNode[] | null = null;

  for (const c of candidates) {
    const path = findPath(startX, startY, c.x, c.y, isPassable, maxSearchNodes);
    if (path && (bestPath === null || path.length < bestPath.length)) {
      bestPath = path;
    }
  }

  return bestPath;
}
