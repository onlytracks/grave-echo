import type { Color, Renderer } from "../renderer.ts";
import type { World } from "../../ecs/world.ts";
import type { Region } from "../layout.ts";

export function renderEquipment(
  renderer: Renderer,
  world: World,
  region: Region,
): void {
  renderer.drawBox(
    region.x,
    region.y,
    region.width,
    region.height,
    "Equipment",
  );

  const innerX = region.x + 2;
  const maxW = region.width - 3;
  let row = region.y + 1;
  const maxRow = region.y + region.height - 1;

  function line(text: string, color: Color = "white") {
    if (row >= maxRow) return;
    renderer.drawText(innerX, row, text.slice(0, maxW), color);
    row++;
  }

  const players = world.query("PlayerControlled");
  if (players.length === 0) {
    line("No player", "gray");
    return;
  }

  const pid = players[0]!;
  const equip = world.getComponent(pid, "Equipment");
  const inv = world.getComponent(pid, "Inventory");

  const weaponName =
    equip?.weapon !== null && equip?.weapon !== undefined
      ? (world.getComponent(equip.weapon, "Item")?.name ?? "?")
      : "---";
  line(`Weapon: ${weaponName}`);
  line("Armor:  ---", "gray");
  line("Acc 1:  ---", "gray");
  line("Acc 2:  ---", "gray");

  if (inv && inv.items.length > 0) {
    row++;
    line(`Inventory (${inv.items.length} items):`, "yellow");
    for (const itemId of inv.items) {
      const item = world.getComponent(itemId, "Item");
      if (!item) continue;
      const isEquipped = equip?.weapon === itemId;
      const consumable = world.getComponent(itemId, "Consumable");
      let label = `  ${item.name} (${item.weight} wt)`;
      if (consumable) {
        label = `  ${item.name} (${consumable.charges}/${consumable.maxCharges})`;
      }
      line(label, isEquipped ? "cyan" : "white");
    }
  }
}
