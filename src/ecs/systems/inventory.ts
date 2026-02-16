import type { World, Entity } from "../world.ts";
import type { MessageLog } from "./messages.ts";
import { entityName } from "./entity-name.ts";
import { getEncumbrancePenalty } from "./turn.ts";

function logEncumbranceChange(
  world: World,
  entity: Entity,
  oldPenalty: number,
  messages: MessageLog,
): void {
  const newPenalty = getEncumbrancePenalty(world, entity);
  if (newPenalty === oldPenalty) return;
  const inv = world.getComponent(entity, "Inventory");
  if (!inv) return;
  const name = entityName(world, entity);
  const pct = Math.round((inv.totalWeight / inv.carryCapacity) * 100);
  messages.add(
    `[inv] ${name} encumbrance: ${oldPenalty === Infinity ? "∞" : -oldPenalty} → ${newPenalty === Infinity ? "∞" : -newPenalty} speed (weight ${inv.totalWeight}/${inv.carryCapacity}, ${pct}%)`,
    "debug",
  );
}

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

  const pos = world.getComponent(entity, "Position");
  const oldWeight = inventory.totalWeight;
  const oldPenalty = getEncumbrancePenalty(world, entity);

  world.removeComponent(itemEntity, "Position");
  inventory.items.push(itemEntity);
  inventory.totalWeight += item.weight;
  messages.add(`You pick up ${item.name}`);

  const name = entityName(world, entity);
  const itemId = `${item.name}#${itemEntity}`;
  const posStr = pos ? `at (${pos.x},${pos.y})` : "";
  messages.add(
    `[inv] ${name} picked up ${itemId} ${posStr}, weight ${oldWeight}→${inventory.totalWeight}/${inventory.carryCapacity}`,
    "debug",
  );

  logEncumbranceChange(world, entity, oldPenalty, messages);

  const equipment = world.getComponent(entity, "Equipment");
  if (equipment) {
    if (world.hasComponent(itemEntity, "Weapon") && equipment.weapon === null) {
      equipWeapon(world, entity, itemEntity, messages, true);
    } else if (
      world.hasComponent(itemEntity, "Armor") &&
      equipment.armor === null
    ) {
      equipArmor(world, entity, itemEntity, messages, true);
    } else if (
      world.hasComponent(itemEntity, "Accessory") &&
      (equipment.accessory1 === null || equipment.accessory2 === null)
    ) {
      equipAccessory(world, entity, itemEntity, messages, true);
    }
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

  const oldWeight = inventory.totalWeight;
  const oldPenalty = getEncumbrancePenalty(world, entity);

  unequipItem(world, entity, itemEntity);

  inventory.items.splice(idx, 1);
  inventory.totalWeight -= item.weight;

  world.addComponent(itemEntity, "Position", { x: pos.x, y: pos.y });
  messages.add(`You drop ${item.name}`);

  const name = entityName(world, entity);
  messages.add(
    `[inv] ${name} dropped ${item.name}#${itemEntity} at (${pos.x},${pos.y}), weight ${oldWeight}→${inventory.totalWeight}/${inventory.carryCapacity}`,
    "debug",
  );

  logEncumbranceChange(world, entity, oldPenalty, messages);
}

function equipWeapon(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
  auto = false,
): void {
  const equipment = world.getComponent(entity, "Equipment");
  const item = world.getComponent(itemEntity, "Item");
  if (!equipment || !item) return;

  const prev = equipment.weapon;
  const prevName =
    prev !== null
      ? (() => {
          const pi = world.getComponent(prev, "Item");
          return pi ? `${pi.name}#${prev}` : `#${prev}`;
        })()
      : "empty";
  equipment.weapon = itemEntity;
  messages.add(`You equip ${item.name}`);

  const name = entityName(world, entity);
  const prefix = auto ? "auto-equipped" : "equipped";
  messages.add(
    `[inv] ${name} ${prefix} ${item.name}#${itemEntity} → weapon slot (was: ${prevName})`,
    "debug",
  );
}

function equipArmor(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
  auto = false,
): void {
  const equipment = world.getComponent(entity, "Equipment");
  const item = world.getComponent(itemEntity, "Item");
  if (!equipment || !item) return;

  const prev = equipment.armor;
  const prevName =
    prev !== null
      ? (() => {
          const pi = world.getComponent(prev, "Item");
          return pi ? `${pi.name}#${prev}` : `#${prev}`;
        })()
      : "empty";
  equipment.armor = itemEntity;
  messages.add(`You equip ${item.name}`);

  const name = entityName(world, entity);
  const prefix = auto ? "auto-equipped" : "equipped";
  messages.add(
    `[inv] ${name} ${prefix} ${item.name}#${itemEntity} → armor slot (was: ${prevName})`,
    "debug",
  );
}

function equipAccessory(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
  auto = false,
): void {
  const equipment = world.getComponent(entity, "Equipment");
  const item = world.getComponent(itemEntity, "Item");
  if (!equipment || !item) return;

  let slotName: string;
  if (equipment.accessory1 === null) {
    equipment.accessory1 = itemEntity;
    slotName = "accessory1";
  } else if (equipment.accessory2 === null) {
    equipment.accessory2 = itemEntity;
    slotName = "accessory2";
  } else {
    equipment.accessory1 = itemEntity;
    slotName = "accessory1";
  }
  messages.add(`You equip ${item.name}`);

  const name = entityName(world, entity);
  const prefix = auto ? "auto-equipped" : "equipped";
  messages.add(
    `[inv] ${name} ${prefix} ${item.name}#${itemEntity} → ${slotName} slot`,
    "debug",
  );
}

function unequipItem(world: World, entity: Entity, itemEntity: Entity): void {
  const equipment = world.getComponent(entity, "Equipment");
  if (!equipment) return;

  if (equipment.weapon === itemEntity) equipment.weapon = null;
  if (equipment.armor === itemEntity) equipment.armor = null;
  if (equipment.accessory1 === itemEntity) equipment.accessory1 = null;
  if (equipment.accessory2 === itemEntity) equipment.accessory2 = null;
}

export function isEquipped(
  world: World,
  entity: Entity,
  itemEntity: Entity,
): boolean {
  const equipment = world.getComponent(entity, "Equipment");
  if (!equipment) return false;
  return (
    equipment.weapon === itemEntity ||
    equipment.armor === itemEntity ||
    equipment.accessory1 === itemEntity ||
    equipment.accessory2 === itemEntity
  );
}

export function equip(
  world: World,
  entity: Entity,
  itemEntity: Entity,
  messages: MessageLog,
): void {
  const equipment = world.getComponent(entity, "Equipment");
  const item = world.getComponent(itemEntity, "Item");
  if (!equipment || !item) return;

  const inventory = world.getComponent(entity, "Inventory");
  if (!inventory || !inventory.items.includes(itemEntity)) return;

  if (world.hasComponent(itemEntity, "Weapon")) {
    equipWeapon(world, entity, itemEntity, messages, false);
  } else if (world.hasComponent(itemEntity, "Armor")) {
    equipArmor(world, entity, itemEntity, messages, false);
  } else if (world.hasComponent(itemEntity, "Accessory")) {
    equipAccessory(world, entity, itemEntity, messages, false);
  }
}

export function unequip(
  world: World,
  entity: Entity,
  messages: MessageLog,
  itemEntity?: Entity,
): void {
  const equipment = world.getComponent(entity, "Equipment");
  if (!equipment) return;

  const name = entityName(world, entity);

  if (itemEntity !== undefined) {
    const item = world.getComponent(itemEntity, "Item");
    const slot = getEquipSlot(equipment, itemEntity);
    unequipItem(world, entity, itemEntity);
    if (item) {
      messages.add(`You unequip ${item.name}`);
      messages.add(
        `[inv] ${name} unequipped ${item.name}#${itemEntity} from ${slot} slot`,
        "debug",
      );
    }
    return;
  }

  if (equipment.weapon !== null) {
    const weaponId = equipment.weapon;
    const item = world.getComponent(weaponId, "Item");
    equipment.weapon = null;
    if (item) {
      messages.add(`You unequip ${item.name}`);
      messages.add(
        `[inv] ${name} unequipped ${item.name}#${weaponId} from weapon slot`,
        "debug",
      );
    }
  }
}

function getEquipSlot(
  equipment: {
    weapon: Entity | null;
    armor: Entity | null;
    accessory1: Entity | null;
    accessory2: Entity | null;
  },
  itemEntity: Entity,
): string {
  if (equipment.weapon === itemEntity) return "weapon";
  if (equipment.armor === itemEntity) return "armor";
  if (equipment.accessory1 === itemEntity) return "accessory1";
  if (equipment.accessory2 === itemEntity) return "accessory2";
  return "unknown";
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
    equipWeapon(world, entity, weapons[0]!, messages);
    return true;
  }

  const currentIdx = weapons.indexOf(equipment.weapon);
  const nextIdx = (currentIdx + 1) % weapons.length;
  const nextWeapon = weapons[nextIdx]!;

  if (nextWeapon === equipment.weapon && weapons.length === 1) {
    unequip(world, entity, messages);
    return true;
  }

  const prevWeapon = equipment.weapon;
  equipment.weapon = nextWeapon;
  const item = world.getComponent(nextWeapon, "Item");
  messages.add(`You swap to ${item?.name ?? "weapon"}`);

  const name = entityName(world, entity);
  const prevItem =
    prevWeapon !== null ? world.getComponent(prevWeapon, "Item") : null;
  const prevName = prevItem ? `${prevItem.name}#${prevWeapon}` : "none";
  const nextName = item ? `${item.name}#${nextWeapon}` : `#${nextWeapon}`;
  messages.add(
    `[inv] ${name} swapped weapon: ${prevName} → ${nextName}`,
    "debug",
  );
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

  const name = entityName(world, entity);
  const itemId = `${item.name}#${itemEntity}`;

  if (consumable.effectType === "heal") {
    const health = world.getComponent(entity, "Health");
    if (!health) return false;

    const hpBefore = health.current;
    const healed = Math.min(consumable.power, health.max - health.current);
    health.current += healed;
    const oldCharges = consumable.charges;
    consumable.charges--;

    messages.add(
      `You drink ${item.name} (${oldCharges}→${consumable.charges} charges). Healed for ${healed} HP.`,
    );
    messages.add(
      `[inv] ${name} used ${itemId}: heal ${healed}, hp ${hpBefore}→${health.current}/${health.max}, charges ${oldCharges}→${consumable.charges}`,
      "debug",
    );
  } else {
    let buffs = world.getComponent(entity, "Buffs");
    if (!buffs) {
      world.addComponent(entity, "Buffs", { active: [] });
      buffs = world.getComponent(entity, "Buffs")!;
    }

    buffs.active.push({
      stat: consumable.effectType,
      value: consumable.power,
      turnsRemaining: consumable.duration,
    });

    const oldCharges = consumable.charges;
    consumable.charges--;

    messages.add(
      `You drink ${item.name} (${oldCharges}→${consumable.charges} charges). +${consumable.power} ${consumable.effectType} for ${consumable.duration} turns.`,
    );
    messages.add(
      `[inv] ${name} used ${itemId}: +${consumable.power} ${consumable.effectType} for ${consumable.duration} turns, charges ${oldCharges}→${consumable.charges}`,
      "debug",
    );
    messages.add(
      `[buff] ${name}: +${consumable.power} ${consumable.effectType} for ${consumable.duration} turns (from ${itemId})`,
      "debug",
    );
  }

  if (consumable.charges <= 0) {
    messages.add(`[inv] ${itemId} depleted (0 charges), destroyed`, "debug");
    const idx = inventory.items.indexOf(itemEntity);
    if (idx !== -1) {
      inventory.items.splice(idx, 1);
      inventory.totalWeight -= item.weight;
    }
    unequipItem(world, entity, itemEntity);
    world.destroyEntity(itemEntity);
  }

  return true;
}
