import type { World, Entity } from "../ecs/world.ts";
import type { Renderer } from "../renderer/renderer.ts";
import type { Region } from "../renderer/layout.ts";
import type { InputEvent } from "../input/input-handler.ts";
import type { MessageLog } from "../ecs/systems/messages.ts";
import { drop, equip, unequip } from "../ecs/systems/inventory.ts";

export interface InventoryScreenState {
  cursorIndex: number;
  items: Entity[];
}

export function createInventoryScreenState(
  world: World,
  player: Entity,
): InventoryScreenState {
  const inventory = world.getComponent(player, "Inventory");
  return {
    cursorIndex: 0,
    items: inventory ? [...inventory.items] : [],
  };
}

export type InventoryAction = "close" | "none";

export function handleInventoryInput(
  world: World,
  player: Entity,
  state: InventoryScreenState,
  event: InputEvent,
  messages: MessageLog,
): InventoryAction {
  if (event.type === "inventory" || event.type === "quit") {
    return "close";
  }

  if (event.type === "move") {
    if (event.direction === "up" && state.cursorIndex > 0) {
      state.cursorIndex--;
    } else if (
      event.direction === "down" &&
      state.cursorIndex < state.items.length - 1
    ) {
      state.cursorIndex++;
    }
    return "none";
  }

  if (event.type === "unknown") return "none";

  return "none";
}

export function handleInventoryKey(
  world: World,
  player: Entity,
  state: InventoryScreenState,
  key: number,
  messages: MessageLog,
): InventoryAction {
  // 'd' = 0x64 — drop
  if (key === 0x64 && state.items.length > 0) {
    const itemEntity = state.items[state.cursorIndex]!;
    drop(world, player, itemEntity, messages);
    state.items.splice(state.cursorIndex, 1);
    if (state.items.length === 0) {
      return "close";
    }
    if (state.cursorIndex >= state.items.length) {
      state.cursorIndex = state.items.length - 1;
    }
    return "none";
  }

  // 'e' = 0x65 — equip/unequip
  if (key === 0x65 && state.items.length > 0) {
    const itemEntity = state.items[state.cursorIndex]!;
    const equipment = world.getComponent(player, "Equipment");
    const weapon = world.getComponent(itemEntity, "Weapon");

    if (!weapon) {
      messages.add("Cannot equip that item.");
      return "none";
    }

    if (equipment && equipment.weapon === itemEntity) {
      unequip(world, player, messages);
    } else {
      equip(world, player, itemEntity, messages);
    }
    return "none";
  }

  return "none";
}

export function renderInventoryScreen(
  renderer: Renderer,
  world: World,
  player: Entity,
  state: InventoryScreenState,
  region: Region,
): void {
  const boxW = Math.min(40, region.width - 2);
  const boxH = Math.min(state.items.length + 8, region.height - 2);
  const boxX = region.x + Math.floor((region.width - boxW) / 2);
  const boxY = region.y + Math.floor((region.height - boxH) / 2);

  renderer.drawBox(boxX, boxY, boxW, boxH, "Inventory");

  const cx = boxX + 2;
  const innerW = boxW - 4;
  let row = boxY + 1;

  const inventory = world.getComponent(player, "Inventory");
  const equipment = world.getComponent(player, "Equipment");

  if (state.items.length === 0) {
    renderer.drawText(cx + 2, row + 1, "(empty)", "gray");
    row += 3;
    renderer.drawText(cx, row, "[Esc] close", "gray");
    return;
  }

  for (let i = 0; i < state.items.length; i++) {
    const itemEntity = state.items[i]!;
    const item = world.getComponent(itemEntity, "Item");
    if (!item) continue;

    const isSelected = i === state.cursorIndex;
    const isEquipped = equipment?.weapon === itemEntity;
    const consumable = world.getComponent(itemEntity, "Consumable");

    const cursor = isSelected ? "> " : "  ";
    const equippedTag = isEquipped ? " [E]" : "";
    const chargesTag =
      consumable && consumable.charges > 1 ? ` x${consumable.charges}` : "";
    const weightStr = `${item.weight}wt`;

    const nameStr = `${cursor}${item.name}${equippedTag}${chargesTag}`;
    const padding = Math.max(1, innerW - nameStr.length - weightStr.length);
    const line = nameStr + " ".repeat(padding) + weightStr;

    const fg = isSelected ? "brightYellow" : "gray";
    renderer.drawText(cx, row, line.slice(0, innerW), fg);
    row++;
  }

  row++;
  if (inventory) {
    renderer.drawText(
      cx,
      row,
      `Weight: ${inventory.totalWeight}/${inventory.carryCapacity}`,
      "white",
    );
    row++;
  }

  row++;
  renderer.drawText(cx, row, "[d]rop [e]quip [Esc] close", "gray");
}
