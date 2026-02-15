import type { World, Entity } from "../world.ts";

export function entityName(world: World, entity: Entity): string {
  if (world.hasComponent(entity, "PlayerControlled")) return "Player";
  const renderable = world.getComponent(entity, "Renderable");
  const char = renderable ? renderable.char : "?";
  return `${char}#${entity}`;
}
