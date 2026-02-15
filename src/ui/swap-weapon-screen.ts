import type { World, Entity } from "../ecs/world.ts";
import type { Renderer } from "../renderer/renderer.ts";
import type { Region } from "../renderer/layout.ts";

export interface SwapWeaponScreenState {
  weapons: Entity[];
  equippedWeapon: Entity | null;
}

export function createSwapWeaponScreenState(
  world: World,
  player: Entity,
): SwapWeaponScreenState | null {
  const inventory = world.getComponent(player, "Inventory");
  const equipment = world.getComponent(player, "Equipment");
  if (!inventory) return null;

  const weapons = inventory.items.filter((id) =>
    world.hasComponent(id, "Weapon"),
  );
  if (weapons.length === 0) return null;

  const equipped = equipment?.weapon ?? null;
  if (weapons.length === 1 && equipped === weapons[0]) return null;

  return {
    weapons,
    equippedWeapon: equipped,
  };
}

export function handleSwapWeaponKey(
  key: number,
  state: SwapWeaponScreenState,
): Entity | null | "cancel" {
  if (key === 0x1b) return "cancel";
  if (key >= 0x31 && key <= 0x39) {
    const index = key - 0x31;
    if (index < state.weapons.length) {
      const selected = state.weapons[index]!;
      if (selected === state.equippedWeapon) return "cancel";
      return selected;
    }
    return null;
  }
  return null;
}

export function renderSwapWeaponScreen(
  renderer: Renderer,
  world: World,
  state: SwapWeaponScreenState,
  region: Region,
): void {
  const maxItems = Math.min(state.weapons.length, 9);
  const boxH = maxItems + 5;

  let maxLineLen = 0;
  const lines: { text: string; isEquipped: boolean }[] = [];
  for (let i = 0; i < maxItems; i++) {
    const entity = state.weapons[i]!;
    const item = world.getComponent(entity, "Item");
    const weapon = world.getComponent(entity, "Weapon");
    if (!item || !weapon) continue;
    const equipped = entity === state.equippedWeapon;
    const tag = equipped ? " [E]" : "";
    const line = `${i + 1}. ${item.name}  ${weapon.damage}dmg r${weapon.range}${tag}`;
    lines.push({ text: line, isEquipped: equipped });
    if (line.length > maxLineLen) maxLineLen = line.length;
  }

  const equippedName =
    state.equippedWeapon !== null
      ? (world.getComponent(state.equippedWeapon, "Item")?.name ?? "weapon")
      : "none";
  const currentLine = `Currently: ${equippedName}`;
  if (currentLine.length > maxLineLen) maxLineLen = currentLine.length;

  const boxW = Math.min(Math.max(maxLineLen + 6, 28), region.width - 2);
  const boxX = region.x + Math.floor((region.width - boxW) / 2);
  const boxY = region.y + Math.floor((region.height - boxH) / 2);

  for (let y = boxY; y < boxY + boxH; y++) {
    for (let x = boxX; x < boxX + boxW; x++) {
      renderer.drawCell(x, y, " ", "white", "black");
    }
  }

  renderer.drawBox(boxX, boxY, boxW, boxH, "Swap Weapon");

  const cx = boxX + 2;
  const innerW = boxW - 4;
  let row = boxY + 1;

  for (const line of lines) {
    const color = line.isEquipped ? "brightYellow" : "white";
    renderer.drawText(cx, row, line.text.slice(0, innerW), color);
    row++;
  }

  row++;
  renderer.drawText(cx, row, currentLine.slice(0, innerW), "gray");
  row++;
  const maxN = Math.min(maxItems, 9);
  const footer = `[1-${maxN}] swap  [Esc] cancel`;
  renderer.drawText(cx, row, footer.slice(0, innerW), "gray");
}
