import type { World, Entity } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";

export function hasLineOfSight(
  map: GameMap,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): boolean {
  let dx = Math.abs(x1 - x0);
  let dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  let cx = x0;
  let cy = y0;

  while (cx !== x1 || cy !== y1) {
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      cx += sx;
    }
    if (e2 < dx) {
      err += dx;
      cy += sy;
    }

    if (cx === x1 && cy === y1) break;

    const tile = map.getTile(cx, cy);
    if (!tile || !tile.transparent) return false;
  }

  return true;
}

export function computeVisibleTiles(
  map: GameMap,
  originX: number,
  originY: number,
  range: number,
): Set<string> {
  const visible = new Set<string>();
  visible.add(`${originX},${originY}`);

  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > range) continue;
      const tx = originX + dx;
      const ty = originY + dy;
      if (!map.isInBounds(tx, ty)) continue;
      if (hasLineOfSight(map, originX, originY, tx, ty)) {
        visible.add(`${tx},${ty}`);
      }
    }
  }

  return visible;
}

export function updateAwareness(
  world: World,
  map: GameMap,
  entity: Entity,
): void {
  const senses = world.getComponent(entity, "Senses");
  const awareness = world.getComponent(entity, "Awareness");
  const pos = world.getComponent(entity, "Position");
  const faction = world.getComponent(entity, "Faction");
  if (!senses || !awareness || !pos || !faction) return;

  const visible = computeVisibleTiles(map, pos.x, pos.y, senses.vision.range);

  const factionEntities = world.query("Position", "Faction");
  let foundHostile: Entity | null = null;
  let hostilePos: { x: number; y: number } | null = null;

  for (const other of factionEntities) {
    if (other === entity) continue;
    const otherFaction = world.getComponent(other, "Faction")!;
    if (otherFaction.factionId === faction.factionId) continue;
    if (otherFaction.factionId === "neutral") continue;

    const otherPos = world.getComponent(other, "Position")!;
    if (visible.has(`${otherPos.x},${otherPos.y}`)) {
      foundHostile = other;
      hostilePos = { x: otherPos.x, y: otherPos.y };
      break;
    }
  }

  const ai = world.getComponent(entity, "AIControlled");

  if (foundHostile !== null && hostilePos !== null) {
    awareness.state = "alert";
    awareness.lastKnownTarget = hostilePos;
    awareness.turnsWithoutTarget = 0;
    if (ai) ai.targetEntity = foundHostile;
  } else {
    awareness.turnsWithoutTarget++;
    if (awareness.turnsWithoutTarget > awareness.alertDuration) {
      awareness.state = "idle";
      awareness.lastKnownTarget = null;
      if (ai) ai.targetEntity = null;
    }
  }
}

export function updatePlayerAwareness(
  world: World,
  map: GameMap,
  visible: Set<string>,
): void {
  const players = world.query("PlayerControlled", "Awareness");
  if (players.length === 0) return;

  const player = players[0]!;
  const awareness = world.getComponent(player, "Awareness")!;

  const entities = world.query("Position", "Faction", "Awareness");
  let anyAlert = false;

  for (const entity of entities) {
    if (entity === player) continue;
    const faction = world.getComponent(entity, "Faction")!;
    if (faction.factionId === "player" || faction.factionId === "neutral")
      continue;
    const entityAwareness = world.getComponent(entity, "Awareness")!;
    if (entityAwareness.state !== "alert") continue;
    const entityPos = world.getComponent(entity, "Position")!;
    if (visible.has(`${entityPos.x},${entityPos.y}`)) {
      anyAlert = true;
      break;
    }
  }

  awareness.state = anyAlert ? "alert" : "idle";
}

function updateAllAwareness(world: World, map: GameMap): void {
  const aiEntities = world.query(
    "AIControlled",
    "Senses",
    "Awareness",
    "Position",
    "Faction",
  );
  for (const entity of aiEntities) {
    updateAwareness(world, map, entity);
  }
}

export function computePlayerFOW(world: World, map: GameMap): Set<string> {
  const players = world.query("PlayerControlled", "Position", "Senses");
  if (players.length === 0) return new Set();

  const player = players[0]!;
  const pos = world.getComponent(player, "Position")!;
  const senses = world.getComponent(player, "Senses")!;

  const visible = computeVisibleTiles(map, pos.x, pos.y, senses.vision.range);

  for (const key of visible) {
    const [x, y] = key.split(",").map(Number);
    map.markExplored(x!, y!);
  }

  updateAllAwareness(world, map);
  updatePlayerAwareness(world, map, visible);

  return visible;
}
