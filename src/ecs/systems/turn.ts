import type { World, Entity } from "../world.ts";
import type { MessageLog } from "./messages.ts";
import { entityName } from "./entity-name.ts";

export function getEncumbrancePenalty(world: World, entity: Entity): number {
  const inventory = world.getComponent(entity, "Inventory");
  if (!inventory) return 0;
  const ratio = inventory.totalWeight / inventory.carryCapacity;
  if (ratio > 1) return Infinity;
  if (ratio > 0.75) return 2;
  if (ratio > 0.5) return 1;
  return 0;
}

export function startPlayerTurn(world: World, messages?: MessageLog): void {
  const players = world.query("PlayerControlled", "TurnActor", "Stats");
  for (const player of players) {
    const turnActor = world.getComponent(player, "TurnActor")!;
    const stats = world.getComponent(player, "Stats")!;
    const penalty = getEncumbrancePenalty(world, player);
    turnActor.hasActed = false;
    turnActor.movementRemaining = Math.max(0, stats.speed - penalty);
    turnActor.secondaryUsed = false;
    if (messages) {
      messages.add(
        `[turn] Player turn start: ${turnActor.movementRemaining} moves`,
        "debug",
      );
    }
  }
}

export function endPlayerTurn(world: World, messages?: MessageLog): void {
  const players = world.query("PlayerControlled", "TurnActor");
  for (const player of players) {
    const turnActor = world.getComponent(player, "TurnActor")!;
    turnActor.hasActed = true;
    turnActor.movementRemaining = 0;
    if (messages) {
      messages.add(`[turn] Player turn end`, "debug");
    }
  }
}

export function isPlayerTurnOver(world: World): boolean {
  const players = world.query("PlayerControlled", "TurnActor");
  if (players.length === 0) return true;
  const turnActor = world.getComponent(players[0]!, "TurnActor")!;
  return turnActor.hasActed;
}

export function resetIdleTurn(world: World, messages?: MessageLog): void {
  const players = world.query("PlayerControlled", "TurnActor", "Awareness");
  for (const player of players) {
    const awareness = world.getComponent(player, "Awareness")!;
    if (awareness.state !== "idle") continue;
    const turnActor = world.getComponent(player, "TurnActor")!;
    const stats = world.getComponent(player, "Stats");
    const penalty = getEncumbrancePenalty(world, player);
    turnActor.hasActed = false;
    turnActor.movementRemaining = Math.max(0, (stats?.speed ?? 1) - penalty);
    turnActor.secondaryUsed = false;
    if (messages) {
      messages.add(`[turn] Player turn reset (idle)`, "debug");
    }
  }
}

export function getAIEntities(world: World): Entity[] {
  return world.query("AIControlled", "TurnActor");
}

export function resetAITurns(world: World, messages?: MessageLog): void {
  for (const entity of getAIEntities(world)) {
    const turnActor = world.getComponent(entity, "TurnActor")!;
    const stats = world.getComponent(entity, "Stats");
    turnActor.hasActed = false;
    turnActor.movementRemaining = stats?.speed ?? 1;
    if (messages) {
      const name = entityName(world, entity);
      messages.add(
        `[turn] ${name} turn start: ${turnActor.movementRemaining} moves`,
        "debug",
      );
    }
  }
}
