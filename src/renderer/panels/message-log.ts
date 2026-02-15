import type { Color, Renderer } from "../renderer.ts";
import type { Region } from "../layout.ts";

export function renderMessageLog(
  renderer: Renderer,
  region: Region,
  messages: readonly string[],
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height, "Log");

  const innerX = region.x + 2;
  const maxW = region.width - 3;
  const availableRows = region.height - 2;
  const startIdx = Math.max(0, messages.length - availableRows);
  const visible = messages.slice(startIdx);

  const bottomRow = region.y + region.height - 2;

  for (let i = 0; i < visible.length; i++) {
    const row = bottomRow - (visible.length - 1 - i);
    const age = visible.length - 1 - i;
    let color: Color = "white";
    if (age >= 3) color = "gray";
    else if (age >= 1) color = "yellow";

    renderer.drawText(innerX, row, visible[i]!.slice(0, maxW), color);
  }
}
