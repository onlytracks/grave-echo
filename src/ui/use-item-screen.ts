import type { World, Entity } from "../ecs/world.ts";
import type { Renderer } from "../renderer/renderer.ts";
import type { Region } from "../renderer/layout.ts";

export interface UseItemScreenState {
  consumables: Entity[];
}

export function createUseItemScreenState(
  world: World,
  player: Entity,
): UseItemScreenState | null {
  const inventory = world.getComponent(player, "Inventory");
  if (!inventory) return null;
  const consumables = inventory.items.filter((id) =>
    world.hasComponent(id, "Consumable"),
  );
  if (consumables.length === 0) return null;
  return { consumables };
}

export function handleUseItemKey(
  key: number,
  state: UseItemScreenState,
): Entity | null | "cancel" {
  if (key === 0x1b) return "cancel";
  if (key >= 0x31 && key <= 0x39) {
    const index = key - 0x31;
    if (index < state.consumables.length) return state.consumables[index]!;
    return null;
  }
  return null;
}

function formatEffect(
  effectType: string,
  power: number,
  duration: number,
): string {
  if (effectType === "heal") return `+${power} HP`;
  return `+${power} ${effectType.slice(0, 3)} ${duration}t`;
}

export function renderUseItemScreen(
  renderer: Renderer,
  world: World,
  state: UseItemScreenState,
  region: Region,
): void {
  const maxItems = Math.min(state.consumables.length, 9);
  const boxH = maxItems + 4;

  let maxLineLen = 0;
  const lines: string[] = [];
  for (let i = 0; i < maxItems; i++) {
    const entity = state.consumables[i]!;
    const item = world.getComponent(entity, "Item");
    const consumable = world.getComponent(entity, "Consumable");
    if (!item || !consumable) continue;
    const effect = formatEffect(
      consumable.effectType,
      consumable.power,
      consumable.duration,
    );
    const line = `${i + 1}. ${item.name} x${consumable.charges}  ${effect}`;
    lines.push(line);
    if (line.length > maxLineLen) maxLineLen = line.length;
  }

  const boxW = Math.min(Math.max(maxLineLen + 6, 24), region.width - 2);
  const boxX = region.x + Math.floor((region.width - boxW) / 2);
  const boxY = region.y + Math.floor((region.height - boxH) / 2);

  for (let y = boxY; y < boxY + boxH; y++) {
    for (let x = boxX; x < boxX + boxW; x++) {
      renderer.drawCell(x, y, " ", "white", "black");
    }
  }

  renderer.drawBox(boxX, boxY, boxW, boxH, "Use Item");

  const cx = boxX + 2;
  const innerW = boxW - 4;
  let row = boxY + 1;

  for (const line of lines) {
    renderer.drawText(cx, row, line.slice(0, innerW), "white");
    row++;
  }

  row++;
  const maxN = Math.min(maxItems, 9);
  const footer = `[1-${maxN}] use  [Esc] cancel`;
  renderer.drawText(cx, row, footer.slice(0, innerW), "gray");
}
