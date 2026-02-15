import type { Color, Renderer } from "../renderer.ts";
import type { World } from "../../ecs/world.ts";
import type { Region } from "../layout.ts";
import type { TaggedMessage } from "../../ecs/systems/messages.ts";

export function renderDebugPanel(
  renderer: Renderer,
  world: World,
  region: Region,
  messages?: readonly TaggedMessage[],
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height, "Debug");

  const innerX = region.x + 2;
  const maxW = region.width - 3;
  let row = region.y + 1;
  const maxRow = region.y + region.height - 1;

  function line(text: string, color: Color = "gray") {
    if (row >= maxRow) return;
    renderer.drawText(innerX, row, text.slice(0, maxW), color);
    row++;
  }

  // World state (compact, single line)
  const allEntities = world.query();
  const players = world.query("PlayerControlled");
  let worldLine = `Entities: ${allEntities.length}`;
  if (players.length > 0) {
    const turn = world.getComponent(players[0]!, "TurnActor");
    if (turn) {
      worldLine += ` | Acted:${turn.hasActed} Moves:${turn.movementRemaining} 2nd:${turn.secondaryUsed}`;
    }
  }
  line(worldLine, "white");

  // AI state (compact)
  const aiEntities = world.query("AIControlled", "Position");
  if (aiEntities.length > 0) {
    const aiParts: string[] = [];
    for (const eid of aiEntities) {
      const pos = world.getComponent(eid, "Position")!;
      const hp = world.getComponent(eid, "Health");
      const rend = world.getComponent(eid, "Renderable");
      const awareness = world.getComponent(eid, "Awareness");
      const name = rend ? rend.char : "?";
      let part = `${name}#${eid}`;
      if (hp) part += ` ${hp.current}/${hp.max}hp`;
      if (awareness) part += ` [${awareness.state}]`;

      if (players.length > 0) {
        const playerPos = world.getComponent(players[0]!, "Position");
        if (playerPos) {
          const dist =
            Math.abs(pos.x - playerPos.x) + Math.abs(pos.y - playerPos.y);
          part += ` d=${dist}`;
        }
      }
      aiParts.push(part);
    }
    line(`AI: ${aiParts.join(" | ")}`, "cyan");
  }

  // Messages with turn separators
  if (messages && messages.length > 0) {
    const availableRows = maxRow - row;
    const startIdx = Math.max(0, messages.length - availableRows);
    const visible = messages.slice(startIdx);

    let lastTurn = -1;
    for (const msg of visible) {
      if (msg.turn !== lastTurn && msg.turn > 0) {
        line(`--- Turn ${msg.turn} ---`, "yellow");
        lastTurn = msg.turn;
      }
      line(msg.text);
    }
  }
}
