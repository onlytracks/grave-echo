import type { Renderer } from "../renderer.ts";
import type { World } from "../../ecs/world.ts";
import type { Region } from "../layout.ts";
import { getEquippedWeaponInfo } from "../../ecs/systems/targeting.ts";
import { entityName } from "../../ecs/systems/entity-name.ts";

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

  const name = entityName(world, targetEntity);
  const health = world.getComponent(targetEntity, "Health");
  const weapon = getEquippedWeaponInfo(world, targetEntity);

  if (row < maxRow) {
    renderer.drawText(innerX, row, name.slice(0, maxW), "brightWhite");
    row++;
  }

  if (health && row < maxRow) {
    const hpText = `HP: ${health.current}/${health.max}`;
    const ratio = health.current / health.max;
    const color = ratio > 0.5 ? "green" : ratio > 0.25 ? "yellow" : "red";
    renderer.drawText(innerX, row, hpText.slice(0, maxW), color);
    row++;
  }

  if (row < maxRow) {
    const weaponText = `${weapon.attackType} r:${weapon.range}`;
    renderer.drawText(innerX, row, weaponText.slice(0, maxW), "gray");
    row++;
  }

  const players = world.query("PlayerControlled", "Position");
  if (players.length > 0 && row < maxRow) {
    const playerPos = world.getComponent(players[0]!, "Position")!;
    const targetPos = world.getComponent(targetEntity, "Position")!;
    const dist =
      Math.abs(targetPos.x - playerPos.x) + Math.abs(targetPos.y - playerPos.y);
    renderer.drawText(innerX, row, `Dist: ${dist}`.slice(0, maxW), "gray");
    row++;
  }
}
