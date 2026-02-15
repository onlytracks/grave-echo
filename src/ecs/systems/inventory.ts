import type { World, Entity } from "../world.ts";
import type { MessageLog } from "./messages.ts";

export function pickup(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
): boolean {
  const inventory = world.getComponent(entity, "Inventory");
  const item = world.getComponent(itemEntity, "Item");
  if (!inventory || !item) return false;

  if (inventory.totalWeight + item.weight > inventory.carryCapacity) {
    messages.add(`Inventory too heavy to pick up ${item.name}`);
    return false;
  }

  world.removeComponent(itemEntity, "Position");
  inventory.items.push(itemEntity);
  inventory.totalWeight += item.weight;
  messages.add(`You pick up ${item.name}`);

  const equipment = world.getComponent(entity, "Equipment");
  const weapon = world.getComponent(itemEntity, "Weapon");
  if (equipment && weapon && equipment.weapon === null) {
    equip(world, entity, itemEntity, messages);
  }

  return true;
}

export function drop(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
): void {
  const inventory = world.getComponent(entity, "Inventory");
  const item = world.getComponent(itemEntity, "Item");
  const pos = world.getComponent(entity, "Position");
  if (!inventory || !item || !pos) return;

  const idx = inventory.items.indexOf(itemEntity);
  if (idx === -1) return;

  const equipment = world.getComponent(entity, "Equipment");
  if (equipment && equipment.weapon === itemEntity) {
    equipment.weapon = null;
  }

  inventory.items.splice(idx, 1);
  inventory.totalWeight -= item.weight;

  world.addComponent(itemEntity, "Position", { x: pos.x, y: pos.y });
  messages.add(`You drop ${item.name}`);
}

export function equip(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
): void {
  const equipment = world.getComponent(entity, "Equipment");
  const weapon = world.getComponent(itemEntity, "Weapon");
  const item = world.getComponent(itemEntity, "Item");
  if (!equipment || !weapon || !item) return;

  const inventory = world.getComponent(entity, "Inventory");
  if (!inventory || !inventory.items.includes(itemEntity)) return;

  if (equipment.weapon !== null && equipment.weapon !== itemEntity) {
    // Old weapon stays in inventory, just unset the slot
  }

  equipment.weapon = itemEntity;
  messages.add(`You equip ${item.name}`);
}

export function unequip(
  world: World,
  entity: Entity,
  messages: MessageLog,
): void {
  const equipment = world.getComponent(entity, "Equipment");
  if (!equipment || equipment.weapon === null) return;

  const item = world.getComponent(equipment.weapon, "Item");
  equipment.weapon = null;
  if (item) messages.add(`You unequip ${item.name}`);
}

export function swapToNextWeapon(
  world: World,
  entity: Entity,
  messages: MessageLog,
): boolean {
  const inventory = world.getComponent(entity, "Inventory");
  const equipment = world.getComponent(entity, "Equipment");
  if (!inventory || !equipment) return false;

  const weapons = inventory.items.filter((id) =>
    world.hasComponent(id, "Weapon"),
  );
  if (weapons.length === 0) return false;

  if (equipment.weapon === null) {
    equip(world, entity, weapons[0]!, messages);
    return true;
  }

  const currentIdx = weapons.indexOf(equipment.weapon);
  const nextIdx = (currentIdx + 1) % weapons.length;
  const nextWeapon = weapons[nextIdx]!;

  if (nextWeapon === equipment.weapon && weapons.length === 1) {
    unequip(world, entity, messages);
    return true;
  }

  equipment.weapon = nextWeapon;
  const item = world.getComponent(nextWeapon, "Item");
  messages.add(`You swap to ${item?.name ?? "weapon"}`);
  return true;
}

export function useConsumable(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
): boolean {
  const consumable = world.getComponent(itemEntity, "Consumable");
  const item = world.getComponent(itemEntity, "Item");
  const inventory = world.getComponent(entity, "Inventory");
  if (!consumable || !item || !inventory) return false;

  if (consumable.effectType === "heal") {
    const health = world.getComponent(entity, "Health");
    if (!health) return false;

    const healed = Math.min(consumable.power, health.max - health.current);
    health.current += healed;
    const oldCharges = consumable.charges;
    consumable.charges--;

    messages.add(
      `You drink ${item.name} (${oldCharges}→${consumable.charges} charges). Healed for ${healed} HP.`,
    );

    if (consumable.charges <= 0) {
      const idx = inventory.items.indexOf(itemEntity);
      if (idx !== -1) {
        inventory.items.splice(idx, 1);
        inventory.totalWeight -= item.weight;
      }
      world.destroyEntity(itemEntity);
    }
  }

  return true;
}
