{
  "id": "c2d6cdd4",
  "title": "Phase 3.5: Enemy loot drops on death",
  "tags": [
    "phase-3",
    "loot",
    "combat",
    "items"
  ],
  "status": "pending",
  "created_at": "2026-02-15T06:17:47.312Z"
}

## Goal
When an enemy dies, drop their carried items (inventory + equipment) on the ground
at their death position. Currently `processHealth()` calls `world.destroyEntity()`
which deletes the enemy and orphans/destroys their item entities. This closes the
combat → loot reward loop: kill enemies, get their gear.

## Read First
- `AGENTS.md` — universal entity system, items are entities
- `docs/items.md` — drop sources, loot quality by enemy type

## Existing Code Context

### Health System (`src/ecs/systems/health.ts`)
```typescript
if (health.current <= 0) {
  // ... messages ...
  world.destroyEntity(entity);  // destroys enemy + orphans item entities
}
```

### World.destroyEntity (`src/ecs/world.ts`)
Removes the entity and all its components. Does NOT touch other entities
(item entities in inventory are separate entities, but they lose their
"owner" reference).

### Enemy Equipment (from Phase 3.3/3.4)
Enemies have Inventory and Equipment components with real item entities:
```typescript
world.addComponent(enemy, "Inventory", { items: [weaponId, armorId], ... });
world.addComponent(enemy, "Equipment", { weapon: weaponId, armor: armorId, ... });
```

Item entities exist independently — they have Item, Weapon/Armor/etc components
but no Position (removed when "held"). On enemy death, these entities still exist
in the world but are inaccessible (no Position, no inventory reference).

### Item Pickup
`pickup()` in inventory.ts removes Position from item. `drop()` re-adds Position.
Items keep their Renderable at all times (fixed in Phase 3.2).

## Requirements

### 1. Drop Items Before Destroying Enemy
In `processHealth()`, before calling `world.destroyEntity()` on a non-player entity,
extract and drop all carried items:

```typescript
function dropAllItems(world: World, entity: Entity, messages: MessageLog): void {
  const pos = world.getComponent(entity, "Position");
  const inventory = world.getComponent(entity, "Inventory");
  const equipment = world.getComponent(entity, "Equipment");
  if (!pos || !inventory) return;

  // Unequip everything first
  if (equipment) {
    equipment.weapon = null;
    equipment.armor = null;
    equipment.accessory1 = null;
    equipment.accessory2 = null;
  }

  // Drop each item at the entity's death position
  for (const itemId of inventory.items) {
    const item = world.getComponent(itemId, "Item");
    if (!item) continue;
    world.addComponent(itemId, "Position", { x: pos.x, y: pos.y });
    // Renderable is already on the item (Phase 3.2 fix)
    messages.add(`${item.name} dropped!`, "debug");
  }

  // Clear inventory so destroyEntity doesn't leave stale references
  inventory.items = [];
  inventory.totalWeight = 0;
}
```

### 2. Update processHealth
```typescript
if (health.current <= 0) {
  if (!isPlayer) {
    dropAllItems(world, entity, messages);
    // ... existing death message ...
  }
  world.destroyEntity(entity);
}
```

### 3. Drop Chance (Optional Filtering)
Not all enemies should drop all items. Add a simple drop chance:

- **Equipped weapon**: 100% drop (the player saw them using it)
- **Equipped armor**: 75% drop
- **Equipped accessories**: 50% drop
- **Inventory consumables**: 50% drop each

This prevents every kill from being a guaranteed full loot piñata. The player
gets the weapon they fought against but other gear is uncertain.

Implementation: in `dropAllItems`, check a roll per item before adding Position.
Items that don't drop are destroyed with `world.destroyEntity(itemId)`.

```typescript
function shouldDrop(world: World, itemId: Entity, equipment: Equipment | null, rng: () => number): boolean {
  if (equipment?.weapon === itemId) return true;  // always drop weapon
  if (equipment?.armor === itemId) return rng() < 0.75;
  if (equipment?.accessory1 === itemId || equipment?.accessory2 === itemId) return rng() < 0.5;
  if (world.hasComponent(itemId, "Consumable")) return rng() < 0.5;
  return rng() < 0.5;  // default
}
```

### 4. Gameplay Message on Drop
Show a gameplay message (not just debug) when notable loot drops:

```
The g dies!
Iron Sword dropped!
```

Only show gameplay messages for weapon and armor drops (the interesting ones).
Consumable drops are debug-only to avoid message spam.

### 5. Multiple Items on Same Tile
Items can stack on the same tile (multiple Position components at same coords).
The pickup system (`e` key) already picks up one item at a time. The z-order
rendering (Phase done) shows the highest-priority item on top.

If multiple items drop at the same position, the player presses `e` multiple
times to pick them up. This is fine.

### 6. Pickup Feedback Enhancement
When standing on a tile with dropped loot, the message log should hint:

```
You see: Iron Sword, Chainmail here.
```

Show this when the player moves onto a tile with items. Update movement handling
to check for items at the new position and log a message.

### 7. Player Death — Don't Drop (Yet)
When the player dies, do NOT drop items. The full skeleton system (Phase 2.5b)
will handle player death loot. For now, player items are just lost on death.

## Edge Cases
- **Enemy has empty inventory**: no items to drop, no messages. Clean.
- **Enemy has no Position when dying** (shouldn't happen): guard with early return.
- **Item entity already destroyed** (edge case): check entity exists before adding
  Position.
- **Many items on one tile**: rendering shows top item, player picks up one at a
  time. Future: show item list when standing on multi-item tile.

## Tests
- Unit test: enemy death drops equipped weapon at death position
- Unit test: dropped item has Position matching enemy's death position
- Unit test: dropped item retains Renderable, Item, Weapon components
- Unit test: enemy entity is destroyed after dropping items
- Unit test: drop chance filtering works (weapon always, others probabilistic)
- Unit test: items not dropped are destroyed
- Unit test: player death does NOT drop items
- Manual: killing enemy shows loot on the ground
- Manual: can pick up dropped enemy weapon
- Manual: equipped dropped weapon works correctly
- Manual: message log shows notable drops
- `bun test` passes

## Definition of Done
- Enemy items drop at death position before entity destruction
- Drop chance varies by slot (weapon 100%, armor 75%, accessories/consumables 50%)
- Gameplay messages for weapon/armor drops
- Dropped items are fully functional (pickup, equip, use)
- Player death does not drop items
- "You see: X here" message when stepping on loot
- `bun test` passes
