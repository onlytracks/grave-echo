import type { World } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { InputEvent } from "../../input/input-handler.ts";
import type { MessageLog } from "./messages.ts";
import { tryMove } from "./movement.ts";
import { pickup, swapToNextWeapon } from "./inventory.ts";
import { cycleTarget, attemptRangedAttack } from "./targeting.ts";

const DIRECTION_DELTA = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
} as const;

export function handlePlayerInput(
  world: World,
  map: GameMap,
  event: InputEvent,
  messages?: MessageLog,
  visibleTiles?: Set<string>,
): boolean {
  const players = world.query("PlayerControlled", "Position");
  if (players.length === 0) return false;
  const player = players[0]!;

  if (event.type === "cycleTarget") {
    if (visibleTiles) {
      cycleTarget(world, player, visibleTiles);
    }
    return false;
  }

  if (event.type === "attack" && messages) {
    const turnActor = world.getComponent(player, "TurnActor");
    if (turnActor?.hasActed) return false;
    return attemptRangedAttack(world, map, player, messages);
  }

  if (event.type === "move") {
    const pos = world.getComponent(player, "Position")!;
    const delta = DIRECTION_DELTA[event.direction];
    const result = tryMove(
      world,
      map,
      player,
      pos.x + delta.dx,
      pos.y + delta.dy,
      messages,
    );
    return result !== "blocked";
  }

  if (event.type === "pickup" && messages) {
    const pos = world.getComponent(player, "Position")!;
    const items = world.query("Position", "Item");
    const itemHere = items.find((id) => {
      const p = world.getComponent(id, "Position")!;
      return p.x === pos.x && p.y === pos.y;
    });
    if (itemHere !== undefined) {
      return pickup(world, player, itemHere, messages);
    }
    messages.add("Nothing to pick up here.");
    return false;
  }

  if (event.type === "swapWeapon" && messages) {
    const turnActor = world.getComponent(player, "TurnActor");
    if (turnActor?.secondaryUsed) {
      messages.add("Already used secondary action this turn.");
      return false;
    }
    const result = swapToNextWeapon(world, player, messages);
    if (result && turnActor) {
      turnActor.secondaryUsed = true;
    }
    return result;
  }

  return false;
}
