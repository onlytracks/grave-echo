import type { World, Entity } from "../world.ts";
import type { Equipment } from "../components.ts";
import type { MessageLog } from "./messages.ts";

export interface HealthResult {
  playerDied: boolean;
  enemiesKilled: number;
}

export function processHealth(
  world: World,
  messages: MessageLog,
  rng: () => number = Math.random,
): HealthResult {
  let playerDied = false;
  let enemiesKilled = 0;
  const entities = world.query("Health");

  for (const entity of entities) {
    const health = world.getComponent(entity, "Health")!;
    if (health.current <= 0) {
      const isPlayer = world.hasComponent(entity, "PlayerControlled");
      if (isPlayer) {
        messages.add("You have died!");
        playerDied = true;
      } else {
        dropAllItems(world, entity, messages, rng);
        const renderable = world.getComponent(entity, "Renderable");
        const name = renderable ? `The ${renderable.char}` : "Something";
        messages.add(`${name} dies!`);
        if (world.hasComponent(entity, "AIControlled")) {
          enemiesKilled++;
        }
      }
      world.destroyEntity(entity);
    }
  }

  return { playerDied, enemiesKilled };
}

function shouldDrop(
  world: World,
  itemId: Entity,
  equipment: Equipment | null,
  rng: () => number,
): boolean {
  if (equipment?.weapon === itemId) return true;
  if (equipment?.armor === itemId) return rng() < 0.75;
  if (equipment?.accessory1 === itemId || equipment?.accessory2 === itemId)
    return rng() < 0.5;
  return rng() < 0.5;
}

function dropAllItems(
  world: World,
  entity: Entity,
  messages: MessageLog,
  rng: () => number,
): void {
  const pos = world.getComponent(entity, "Position");
  const inventory = world.getComponent(entity, "Inventory");
  const equipment = world.getComponent(entity, "Equipment");
  if (!pos || !inventory) return;

  const snapshot: Equipment | null = equipment ? { ...equipment } : null;

  if (equipment) {
    equipment.weapon = null;
    equipment.armor = null;
    equipment.accessory1 = null;
    equipment.accessory2 = null;
  }

  for (const itemId of inventory.items) {
    const item = world.getComponent(itemId, "Item");
    if (!item) continue;

    if (!shouldDrop(world, itemId, snapshot, rng)) {
      world.destroyEntity(itemId);
      continue;
    }

    world.addComponent(itemId, "Position", { x: pos.x, y: pos.y });

    const isNotable =
      itemId === snapshot?.weapon ||
      itemId === snapshot?.armor ||
      world.hasComponent(itemId, "Weapon") ||
      world.hasComponent(itemId, "Armor");
    messages.add(`${item.name} dropped!`, isNotable ? "gameplay" : "debug");
  }

  inventory.items = [];
  inventory.totalWeight = 0;
}
