import type { Color, Renderer } from "../renderer.ts";
import type { World } from "../../ecs/world.ts";
import type { Region } from "../layout.ts";
import { getEffectiveStats } from "../../ecs/systems/stats.ts";

export function renderPlayerStats(
  renderer: Renderer,
  world: World,
  region: Region,
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height, "Player");

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
  const health = world.getComponent(pid, "Health");
  const stats = world.getComponent(pid, "Stats");
  const effective = getEffectiveStats(world, pid);
  const turn = world.getComponent(pid, "TurnActor");
  const equip = world.getComponent(pid, "Equipment");
  const inv = world.getComponent(pid, "Inventory");
  const awareness = world.getComponent(pid, "Awareness");
  const buffs = world.getComponent(pid, "Buffs");

  if (awareness) {
    if (awareness.state === "alert") {
      line("[ALERT!]", "brightRed");
    } else {
      line("[Exploring]", "gray");
    }
  }

  if (health) {
    const ratio = health.max > 0 ? health.current / health.max : 0;
    const barWidth = Math.max(1, maxW - 14);
    const filled = Math.round(ratio * barWidth);
    const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);
    let barColor: Color = "green";
    if (ratio <= 0.25) barColor = "red";
    else if (ratio <= 0.5) barColor = "yellow";

    const hpLabel = `HP: ${health.current}/${health.max} `;
    renderer.drawText(innerX, row, hpLabel.slice(0, maxW), "white");
    renderer.drawText(
      innerX + hpLabel.length,
      row,
      `[${bar}]`.slice(0, maxW - hpLabel.length),
      barColor,
    );
    row++;
  }

  if (effective && stats) {
    const strBonus = effective.strength - stats.strength;
    const defBonus = effective.defense - stats.defense;
    const spdBonus = effective.speed - stats.speed;
    const fmtStat = (name: string, base: number, bonus: number) => {
      if (bonus > 0) return `${name}: ${base}+${bonus}`;
      if (bonus < 0) return `${name}: ${base}${bonus}`;
      return `${name}: ${base}`;
    };
    line(
      `${fmtStat("STR", stats.strength, strBonus)}  ${fmtStat("DEF", stats.defense, defBonus)}  ${fmtStat("SPD", stats.speed, spdBonus)}`,
    );
  } else if (stats) {
    line(`STR: ${stats.strength}  DEF: ${stats.defense}  SPD: ${stats.speed}`);
  }

  if (equip) {
    if (equip.weapon !== null) {
      const item = world.getComponent(equip.weapon, "Item");
      const wpn = world.getComponent(equip.weapon, "Weapon");
      const dmgText = wpn ? ` (${wpn.damage} dmg)` : "";
      line(`Wpn: ${item?.name ?? "?"}${dmgText}`);
    } else {
      line("Wpn: Fists");
    }

    if (equip.armor !== null) {
      const item = world.getComponent(equip.armor, "Item");
      const armor = world.getComponent(equip.armor, "Armor");
      const defText = armor ? ` (${armor.defense} def)` : "";
      line(`Arm: ${item?.name ?? "?"}${defText}`);
    }

    const acc1Name =
      equip.accessory1 !== null
        ? (world.getComponent(equip.accessory1, "Item")?.name ?? "?")
        : null;
    const acc2Name =
      equip.accessory2 !== null
        ? (world.getComponent(equip.accessory2, "Item")?.name ?? "?")
        : null;
    if (acc1Name) line(`Acc: ${acc1Name}`, "cyan");
    if (acc2Name) line(`Acc: ${acc2Name}`, "cyan");
  }

  if (buffs && buffs.active.length > 0) {
    const buffStrs = buffs.active.map(
      (b) => `${b.stat[0]!.toUpperCase()}+${b.value}(${b.turnsRemaining}t)`,
    );
    line(`Buffs: ${buffStrs.join(" ")}`, "brightYellow");
  }

  if (turn && effective) {
    line(`Moves: ${turn.movementRemaining}/${effective.speed}`);
  } else if (turn && stats) {
    line(`Moves: ${turn.movementRemaining}/${stats.speed}`);
  }

  if (inv) {
    const pct =
      inv.carryCapacity > 0
        ? Math.round((inv.totalWeight / inv.carryCapacity) * 100)
        : 0;
    line(`Weight: ${inv.totalWeight}/${inv.carryCapacity} (${pct}%)`);
  }
}
