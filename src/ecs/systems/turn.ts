import type { World, Entity } from "../world.ts";

export function startPlayerTurn(world: World): void {
  const players = world.query("PlayerControlled", "TurnActor", "Stats");
  for (const player of players) {
    const turnActor = world.getComponent(player, "TurnActor")!;
    const stats = world.getComponent(player, "Stats")!;
    turnActor.hasActed = false;
    turnActor.movementRemaining = stats.speed;
  }
}

export function endPlayerTurn(world: World): void {
  const players = world.query("PlayerControlled", "TurnActor");
  for (const player of players) {
    const turnActor = world.getComponent(player, "TurnActor")!;
    turnActor.hasActed = true;
    turnActor.movementRemaining = 0;
  }
}

export function isPlayerTurnOver(world: World): boolean {
  const players = world.query("PlayerControlled", "TurnActor");
  if (players.length === 0) return true;
  const turnActor = world.getComponent(players[0]!, "TurnActor")!;
  return turnActor.hasActed;
}

export function getAIEntities(world: World): Entity[] {
  return world.query("AIControlled", "TurnActor");
}

export function resetAITurns(world: World): void {
  for (const entity of getAIEntities(world)) {
    const turnActor = world.getComponent(entity, "TurnActor")!;
    const stats = world.getComponent(entity, "Stats");
    turnActor.hasActed = false;
    turnActor.movementRemaining = stats?.speed ?? 1;
  }
}
