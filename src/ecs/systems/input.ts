import type { World } from "../world.ts";
import type { GameMap } from "../../map/game-map.ts";
import type { InputEvent } from "../../input/input-handler.ts";
import type { MessageLog } from "./messages.ts";
import { tryMove } from "./movement.ts";

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
): boolean {
  if (event.type !== "move") return false;

  const players = world.query("PlayerControlled", "Position");
  if (players.length === 0) return false;

  const player = players[0]!;
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
