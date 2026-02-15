import type { Color, Renderer } from "../renderer.ts";
import type { World, Entity } from "../../ecs/world.ts";
import type { GameMap } from "../../map/game-map.ts";

function entityPriority(world: World, entity: Entity): number {
  if (world.hasComponent(entity, "PlayerControlled")) return 3;
  if (world.hasComponent(entity, "AIControlled")) return 2;
  if (world.hasComponent(entity, "Item")) return 1;
  return 0;
}

export interface Viewport {
  x: number;
  y: number;
}

function getLosTiles(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): { x: number; y: number }[] {
  const tiles: { x: number; y: number }[] = [];
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let cx = x0;
  let cy = y0;

  while (cx !== x1 || cy !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }
    if (cx === x1 && cy === y1) break;
    tiles.push({ x: cx, y: cy });
  }
  return tiles;
}

export function renderGameGrid(
  renderer: Renderer,
  world: World,
  map: GameMap,
  region: { x: number; y: number; width: number; height: number },
  viewport: Viewport,
  visibleTiles: Set<string>,
  targetEntity?: number | null,
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height);

  const innerX = region.x + 1;
  const innerY = region.y + 1;
  const innerW = region.width - 2;
  const innerH = region.height - 2;

  for (let dy = 0; dy < innerH; dy++) {
    for (let dx = 0; dx < innerW; dx++) {
      const mapX = viewport.x + dx;
      const mapY = viewport.y + dy;
      const key = `${mapX},${mapY}`;
      const tile = map.getTile(mapX, mapY);
      if (!tile) continue;

      if (visibleTiles.has(key)) {
        renderer.drawCell(
          innerX + dx,
          innerY + dy,
          tile.char,
          tile.fg as Color,
          tile.bg as Color,
        );
      } else if (map.isExplored(mapX, mapY)) {
        renderer.drawCell(
          innerX + dx,
          innerY + dy,
          tile.char,
          "darkGray",
          "black",
        );
      }
    }
  }

  const entities = world
    .query("Position", "Renderable")
    .sort((a, b) => entityPriority(world, a) - entityPriority(world, b));
  for (const entity of entities) {
    const pos = world.getComponent(entity, "Position")!;
    const rend = world.getComponent(entity, "Renderable")!;

    if (!visibleTiles.has(`${pos.x},${pos.y}`)) continue;

    const screenX = pos.x - viewport.x;
    const screenY = pos.y - viewport.y;
    if (screenX >= 0 && screenX < innerW && screenY >= 0 && screenY < innerH) {
      const isTarget =
        targetEntity !== null &&
        targetEntity !== undefined &&
        entity === targetEntity;
      renderer.drawCell(
        innerX + screenX,
        innerY + screenY,
        rend.char,
        isTarget ? "brightWhite" : (rend.fg as Color),
        isTarget ? "red" : (rend.bg as Color),
      );
    }
  }

  if (targetEntity !== null && targetEntity !== undefined) {
    const playerEntities = world.query("PlayerControlled", "Position");
    const targetPos = world.getComponent(targetEntity, "Position");
    if (playerEntities.length > 0 && targetPos) {
      const playerPos = world.getComponent(playerEntities[0]!, "Position")!;
      const losTiles = getLosTiles(
        playerPos.x,
        playerPos.y,
        targetPos.x,
        targetPos.y,
      );
      for (const tile of losTiles) {
        const sx = tile.x - viewport.x;
        const sy = tile.y - viewport.y;
        if (sx >= 0 && sx < innerW && sy >= 0 && sy < innerH) {
          const mapTile = map.getTile(tile.x, tile.y);
          const ch = mapTile?.char ?? "·";
          renderer.drawCell(innerX + sx, innerY + sy, ch, "darkGray", "red");
        }
      }
    }
  }
}
