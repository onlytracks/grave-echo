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

export function renderGameGrid(
  renderer: Renderer,
  world: World,
  map: GameMap,
  region: { x: number; y: number; width: number; height: number },
  viewport: Viewport,
  visibleTiles: Set<string>,
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
        renderer.drawCell(innerX + dx, innerY + dy, tile.char, "gray", "black");
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
      renderer.drawCell(
        innerX + screenX,
        innerY + screenY,
        rend.char,
        rend.fg as Color,
        rend.bg as Color,
      );
    }
  }
}
