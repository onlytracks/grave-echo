import type { Color, Renderer } from "../renderer.ts";
import type { World } from "../../ecs/world.ts";
import type { Region } from "../layout.ts";
import type { TaggedMessage } from "../../ecs/systems/messages.ts";
import type { GameMap } from "../../map/game-map.ts";
import { hasLineOfSight } from "../../ecs/systems/sensory.ts";

function debugMessageColor(msg: TaggedMessage): Color {
  if (msg.category === "gameplay") return "white";
  const text = msg.text;
  if (text.startsWith("[combat]")) return "red";
  if (text.startsWith("[sense]")) return "yellow";
  if (text.startsWith("[ai]")) return "cyan";
  if (text.startsWith("[turn]")) return "magenta";
  if (text.startsWith("[move]")) return "darkGray";
  if (text.startsWith("[spawn]")) return "green";
  return "gray";
}

export function renderDebugPanel(
  renderer: Renderer,
  world: World,
  region: Region,
  messages?: readonly TaggedMessage[],
  map?: GameMap,
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

  const aiEntities = world.query("AIControlled", "Position");
  const playerPos =
    players.length > 0
      ? world.getComponent(players[0]!, "Position")
      : undefined;

  const threatSources: string[] = [];
  const aiLines: { text: string; color: Color }[] = [];

  for (const eid of aiEntities) {
    const pos = world.getComponent(eid, "Position")!;
    const hp = world.getComponent(eid, "Health");
    const rend = world.getComponent(eid, "Renderable");
    const awareness = world.getComponent(eid, "Awareness");
    const senses = world.getComponent(eid, "Senses");
    const name = rend ? rend.char : "?";
    let part = `${name}#${eid}`;
    if (hp) part += ` ${hp.current}/${hp.max}hp`;

    if (awareness) {
      if (awareness.state === "alert") {
        part += ` [alert ${awareness.turnsWithoutTarget}/${awareness.alertDuration}]`;
      } else {
        part += ` [idle]`;
      }
    }

    const visRange = senses?.vision.range;
    if (visRange !== undefined) part += ` vis=${visRange}`;

    let dist: number | undefined;
    let los = false;
    if (playerPos) {
      dist = Math.abs(pos.x - playerPos.x) + Math.abs(pos.y - playerPos.y);
      part += ` d=${dist}`;
      if (map) {
        los = hasLineOfSight(map, pos.x, pos.y, playerPos.x, playerPos.y);
        part += ` LOS:${los ? "Y" : "N"}`;
      }
    }

    const isSensing =
      awareness?.state === "alert" &&
      los &&
      visRange !== undefined &&
      dist !== undefined &&
      dist <= visRange;
    if (isSensing) {
      part += " ⚠";
      threatSources.push(`${name}#${eid} (d=${dist}, vis=${visRange}, LOS)`);
    }

    aiLines.push({ text: part, color: isSensing ? "yellow" : "cyan" });
  }

  if (threatSources.length > 0) {
    line(`Alert: ${threatSources.join(", ")} sensing you`, "yellow");
  } else if (aiEntities.length > 0) {
    line("Status: idle (no threats sensing you)", "gray");
  }

  for (const ai of aiLines) {
    line(ai.text, ai.color);
  }

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
      line(msg.text, debugMessageColor(msg));
    }
  }
}
