import type { Renderer } from "../renderer.ts";
import type { World } from "../../ecs/world.ts";

export function renderDebugPanel(
  renderer: Renderer,
  world: World,
  region: { x: number; y: number; width: number; height: number },
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height, "Debug");

  const innerX = region.x + 2;
  const maxW = region.width - 3;
  let row = region.y + 1;
  const maxRow = region.y + region.height - 1;

  function line(
    text: string,
    color: "white" | "gray" | "yellow" | "cyan" = "gray",
  ) {
    if (row >= maxRow) return;
    renderer.drawText(innerX, row, text.slice(0, maxW), color);
    row++;
  }

  const allEntities = world.query();
  line(`Entities: ${allEntities.length}`, "white");
  row++;

  const players = world.query("PlayerControlled");
  if (players.length > 0) {
    const pid = players[0]!;
    const pos = world.getComponent(pid, "Position");
    const hp = world.getComponent(pid, "Health");
    const stats = world.getComponent(pid, "Stats");
    const turn = world.getComponent(pid, "TurnActor");

    line(`Player (id: ${pid})`, "cyan");
    if (pos) line(` pos: ${pos.x}, ${pos.y}`);
    if (hp) line(` hp: ${hp.current}/${hp.max}`);
    if (stats)
      line(` str:${stats.strength} def:${stats.defense} spd:${stats.speed}`);
    if (turn)
      line(
        ` moved: ${stats ? stats.speed - turn.movementRemaining : 0}/${stats?.speed ?? "?"} acted:${turn.hasActed}`,
      );

    const inv = world.getComponent(pid, "Inventory");
    const equip = world.getComponent(pid, "Equipment");
    if (inv) {
      const pct =
        inv.carryCapacity > 0
          ? Math.round((inv.totalWeight / inv.carryCapacity) * 100)
          : 0;
      line(` weight: ${inv.totalWeight}/${inv.carryCapacity} (${pct}%)`);
      if (equip) {
        if (equip.weapon !== null) {
          const itemComp = world.getComponent(equip.weapon, "Item");
          line(` weapon: ${itemComp?.name ?? `#${equip.weapon}`}`);
        } else {
          line(` weapon: (none)`);
        }
      }
      for (const itemId of inv.items) {
        const itemComp = world.getComponent(itemId, "Item");
        if (itemComp) line(`  - ${itemComp.name} (${itemComp.weight})`);
      }
    }

    row++;
  }

  const turnState = world.query("PlayerControlled", "TurnActor");
  if (turnState.length > 0) {
    const turn = world.getComponent(turnState[0]!, "TurnActor")!;
    line(`Turn: ${turn.hasActed ? "AI" : "Player"}`, "yellow");
    row++;
  }

  const aiEntities = world.query("AIControlled", "Position");
  for (const eid of aiEntities) {
    const ai = world.getComponent(eid, "AIControlled")!;
    const pos = world.getComponent(eid, "Position")!;
    const hp = world.getComponent(eid, "Health");
    const rend = world.getComponent(eid, "Renderable");

    const name = rend ? rend.char : "?";
    line(`Enemy '${name}' (id: ${eid})`, "cyan");
    line(` pos: ${pos.x}, ${pos.y}`);
    if (hp) line(` hp: ${hp.current}/${hp.max}`);
    line(` ai: ${ai.pattern} → ${ai.targetEntity ?? "none"}`);

    const awareness = world.getComponent(eid, "Awareness");
    if (awareness) {
      line(` aware: ${awareness.state}`);
      if (awareness.state === "alert") {
        line(
          ` noSee: ${awareness.turnsWithoutTarget}/${awareness.alertDuration}`,
        );
        if (awareness.lastKnownTarget) {
          line(
            ` last: ${awareness.lastKnownTarget.x},${awareness.lastKnownTarget.y}`,
          );
        }
      }
    }

    if (ai.targetEntity !== null) {
      const targetPos = world.getComponent(ai.targetEntity, "Position");
      if (targetPos) {
        const dist =
          Math.abs(pos.x - targetPos.x) + Math.abs(pos.y - targetPos.y);
        line(` dist: ${dist}`);
      }
    }
    row++;
  }

  const itemsOnGround = world.query("Position", "Item");
  if (itemsOnGround.length > 0 && players.length > 0) {
    const playerPos = world.getComponent(players[0]!, "Position");
    if (playerPos) {
      const nearby = itemsOnGround.filter((eid) => {
        const p = world.getComponent(eid, "Position")!;
        return p.x === playerPos.x && p.y === playerPos.y;
      });
      if (nearby.length > 0) {
        line("Items here:", "yellow");
        for (const eid of nearby) {
          const itemComp = world.getComponent(eid, "Item");
          line(` ${itemComp?.name ?? `item #${eid}`}`);
        }
      }
    }
  }
}
