import type { World, Entity } from "../world.ts";

export function getEncumbrancePenalty(world: World, entity: Entity): number {
  const inventory = world.getComponent(entity, "Inventory");
  if (!inventory) return 0;
  const ratio = inventory.totalWeight / inventory.carryCapacity;
  if (ratio > 1) return Infinity;
  if (ratio > 0.75) return 2;
  if (ratio > 0.5) return 1;
  return 0;
}

export function startPlayerTurn(world: World): void {
  const players = world.query("PlayerControlled", "TurnActor", "Stats");
  for (const player of players) {
    const turnActor = world.getComponent(player, "TurnActor")!;
    const stats = world.getComponent(player, "Stats")!;
    const penalty = getEncumbrancePenalty(world, player);
    turnActor.hasActed = false;
    turnActor.movementRemaining = Math.max(0, stats.speed - penalty);
    turnActor.secondaryUsed = false;
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
