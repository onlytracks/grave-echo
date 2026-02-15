{
  "id": "f33eccc0",
  "title": "Give enemies healing potions in inventory for loot drops",
  "tags": [
    "gameplay",
    "items",
    "enemies",
    "loot"
  ],
  "status": "done",
  "created_at": "2026-02-15T22:41:41.392Z"
}

## Goal
Enemies currently only carry weapons (and sometimes armor). They never drop
consumables, so the player's only potion source is floor spawns. Give enemies
a chance to carry a healing potion so combat is a reliable source of sustain.

## Design
- **All enemy types** can carry a healing potion (chance-based for most, guaranteed
  for harder enemies)
- Potions drop on death via existing `dropAllItems()` — no new drop logic needed
- Dropped potions always have **full charges** regardless of whether the enemy used
  one (see companion todo for AI potion use)

### Carry Rates

| Enemy Type | Potion Chance | Notes |
|------------|--------------|-------|
| Goblin (charger) | 30% | Common enemy, modest loot |
| Rotwood Archer | 25% | Ranged enemy, lower carry rate |
| Blightvines Skulker | 25% | Fast enemy, light inventory |
| Hollow Patrol | 30% | Sentry, moderate loot |
| Thornback Guardian | 100% | Tough enemy, guaranteed |
| Boss | 100% | Always carries a potion |

Rates are tunable — start here, adjust based on feel.

## Implementation

### 1. Helper in enemy-factory.ts
Add a helper to give an enemy a potion:

```typescript
function givePotion(world: World, enemy: number, rng: () => number = Math.random): void {
  const potion = createHealingPotion(world, 0, 0);
  world.removeComponent(potion, "Position");
  const inventory = world.getComponent(enemy, "Inventory")!;
  inventory.items.push(potion);
  const item = world.getComponent(potion, "Item");
  if (item) inventory.totalWeight += item.weight;
}
```

### 2. Add to Enemy Factories
Each `create*` function gets a potion roll after weapon/armor setup:

```typescript
// In createGoblin (room-populator.ts):
if (rng() < 0.3) givePotion(world, goblin, rng);

// In createRotwoodArcher:
if (rng() < 0.25) givePotion(world, entity, rng);

// In createBlightvinesSkulker:
if (rng() < 0.25) givePotion(world, entity, rng);

// In createHollowPatrol:
if (rng() < 0.3) givePotion(world, entity, rng);

// In createThornbackGuardian:
givePotion(world, entity);  // always

// In createBoss:
givePotion(world, boss);  // always
```

### 3. Import
Add `createHealingPotion` import to `enemy-factory.ts`.

The goblin and boss factories in `room-populator.ts` need the same treatment —
either move them to `enemy-factory.ts` or add the import there too.

### 4. Drop Behavior
`dropAllItems()` in `health.ts` already handles consumable drops. The `shouldDrop()`
function gives non-equipped items a 50% drop chance. Potions aren't equipped, so
they'll drop 50% of the time.

Consider: should potions always drop? The player fought for it. Options:
- **Option A**: 50% drop (current `shouldDrop` for non-equipped items) — some waste
- **Option B**: Always drop consumables — feels more rewarding
- **Recommend Option B** — add a consumable check in `shouldDrop()`:

```typescript
if (world.hasComponent(itemId, "Consumable")) return true;
```

### 5. Full Charges on Drop
The potion entity is created with `maxCharges` charges. Even if AI uses it (future
todo), the dropped potion should have full charges. Two approaches:
- **Simple**: restore charges in `dropAllItems()` before dropping
- **Simpler**: the AI todo will handle this — when AI drinks, don't decrement charges
  on the actual item, just apply the heal. The potion is a "capability" for the AI,
  not a real consumable with state.

For THIS todo, potions are just inventory items that drop. No charge manipulation
needed since enemies don't drink yet.

## Files to Change
- `src/enemies/enemy-factory.ts` — add `givePotion()` helper, call from each factory
- `src/map/room-populator.ts` — add potion to goblin + boss factories
- `src/ecs/systems/health.ts` — (optional) always drop consumables in `shouldDrop()`
- `src/items/item-factory.ts` — import already exists in `room-populator.ts`, add to
  `enemy-factory.ts`

## Tests
- Unit: enemy created with potion has it in inventory
- Unit: enemy death drops potion on ground
- Unit: dropped potion has full charges
- Manual: kill enemies, see healing potions on the ground
- Manual: potions appear more reliably from guardians/bosses
- `bun test` passes

## Definition of Done
- Enemies carry healing potions at rates defined above
- Potions drop on death with full charges
- Consumables always drop (not subject to 50% non-equipped chance)
- No new item types needed — uses existing `createHealingPotion`
- `bun test` passes
