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

export function renderDebugMessages(
  renderer: Renderer,
  region: Region,
  messages: readonly TaggedMessage[],
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height, "Messages");

  const innerX = region.x + 2;
  const maxW = region.width - 3;
  let row = region.y + 1;
  const maxRow = region.y + region.height - 1;

  if (messages.length === 0) return;

  const availableRows = maxRow - row;
  const startIdx = Math.max(0, messages.length - availableRows);
  const visible = messages.slice(startIdx);

  let lastTurn = -1;
  for (const msg of visible) {
    if (row >= maxRow) break;
    if (msg.turn !== lastTurn && msg.turn > 0) {
      renderer.drawText(
        innerX,
        row,
        `--- Turn ${msg.turn} ---`.slice(0, maxW),
        "yellow",
      );
      row++;
      lastTurn = msg.turn;
      if (row >= maxRow) break;
    }
    renderer.drawText(
      innerX,
      row,
      msg.text.slice(0, maxW),
      debugMessageColor(msg),
    );
    row++;
  }
}

export function renderDebugEntities(
  renderer: Renderer,
  world: World,
  region: Region,
  map?: GameMap,
): void {
  renderer.drawBox(region.x, region.y, region.width, region.height, "Entities");

  const innerX = region.x + 2;
  const maxW = region.width - 3;
  let row = region.y + 1;
  const maxRow = region.y + region.height - 1;

  function line(text: string, color: Color = "gray") {
    if (row >= maxRow) return;
    renderer.drawText(innerX, row, text.slice(0, maxW), color);
    row++;
  }

  const players = world.query("PlayerControlled");
  if (players.length > 0) {
    const turn = world.getComponent(players[0]!, "TurnActor");
    if (turn) {
      line(
        `Acted:${turn.hasActed ? "Y" : "N"} Mv:${turn.movementRemaining} 2nd:${turn.secondaryUsed ? "Y" : "N"}`,
        "white",
      );
    }
  }

  const playerPos =
    players.length > 0
      ? world.getComponent(players[0]!, "Position")
      : undefined;

  const aiEntities = world.query("AIControlled", "Position");
  const threatSources: string[] = [];

  interface AIInfo {
    text: string;
    color: Color;
    dist: number;
  }

  const aiLines: AIInfo[] = [];

  for (const eid of aiEntities) {
    const pos = world.getComponent(eid, "Position")!;
    const hp = world.getComponent(eid, "Health");
    const rend = world.getComponent(eid, "Renderable");
    const awareness = world.getComponent(eid, "Awareness");
    const senses = world.getComponent(eid, "Senses");
    const glyph = rend ? rend.char : "?";
    let part = `${glyph}#${eid}`;
    if (hp) part += ` ${hp.current}/${hp.max}`;

    if (awareness) {
      if (awareness.state === "alert") {
        part += ` alrt ${awareness.turnsWithoutTarget}/${awareness.alertDuration}`;
      } else {
        part += ` idle`;
      }
    }

    const visRange = senses?.vision.range;
    let dist = 99;
    let los = false;
    if (playerPos) {
      dist = Math.abs(pos.x - playerPos.x) + Math.abs(pos.y - playerPos.y);
      part += ` d=${dist}`;
      if (map) {
        los = hasLineOfSight(map, pos.x, pos.y, playerPos.x, playerPos.y);
        if (los) part += ` LOS:Y`;
      }
    }

    const isSensing =
      awareness?.state === "alert" &&
      los &&
      visRange !== undefined &&
      dist <= visRange;
    if (isSensing) {
      part += " ⚠";
      threatSources.push(`${glyph}#${eid}`);
    }

    aiLines.push({ text: part, color: isSensing ? "yellow" : "cyan", dist });
  }

  if (threatSources.length > 0) {
    line(`Alert: ${threatSources.join(", ")} sensing you`, "yellow");
  } else if (aiEntities.length > 0) {
    line("Status: idle", "gray");
  }

  line("─".repeat(Math.min(maxW, region.width - 4)), "darkGray");

  aiLines.sort((a, b) => a.dist - b.dist);
  for (const ai of aiLines) {
    line(ai.text, ai.color);
  }
}
