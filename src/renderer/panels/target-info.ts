import type { Renderer } from "../renderer.ts";
import type { World } from "../../ecs/world.ts";
import type { Region } from "../layout.ts";

export function renderTargetInfo(
  renderer: Renderer,
  world: World,
  region: Region,
  targetEntity: number | null,
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height, "Target");

  const innerX = region.x + 2;
  const maxW = region.width - 3;
  let row = region.y + 1;
  const maxRow = region.y + region.height - 1;

  if (targetEntity === null || !world.hasComponent(targetEntity, "Position")) {
    if (row < maxRow) {
      renderer.drawText(
        innerX,
        row,
        "No target selected".slice(0, maxW),
        "gray",
      );
    }
    return;
  }

  // Future: tab targeting will populate this path
}
