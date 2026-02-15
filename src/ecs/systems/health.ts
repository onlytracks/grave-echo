import type { World } from "../world.ts";
import type { MessageLog } from "./messages.ts";

export interface HealthResult {
  playerDied: boolean;
}

export function processHealth(
  world: World,
  messages: MessageLog,
): HealthResult {
  let playerDied = false;
  const entities = world.query("Health");

  for (const entity of entities) {
    const health = world.getComponent(entity, "Health")!;
    if (health.current <= 0) {
      const isPlayer = world.hasComponent(entity, "PlayerControlled");
      if (isPlayer) {
        messages.add("You have died!");
        playerDied = true;
      } else {
        const renderable = world.getComponent(entity, "Renderable");
        const name = renderable ? `The ${renderable.char}` : "Something";
        messages.add(`${name} dies!`);
      }
      world.destroyEntity(entity);
    }
  }

  return { playerDied };
}
