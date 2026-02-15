{
  "id": "facc13d2",
  "title": "Auto-equip weapon on pickup when no weapon equipped",
  "tags": [
    "quality-of-life",
    "items"
  ],
  "status": "done",
  "created_at": "2026-02-15T02:58:27.099Z"
}

## Goal
When the player picks up a weapon and has no weapon equipped, automatically equip it.

## Existing Code Context
- `src/ecs/systems/inventory.ts` — `pickup()` function adds item to inventory and
  generates a message. `equip()` function sets `Equipment.weapon` and generates a message.
  Both functions exist and work.

## Requirements

In `pickup()` in `src/ecs/systems/inventory.ts`, after successfully adding the item to
inventory, check:
1. Does the picked-up item have a `Weapon` component?
2. Does the entity have an `Equipment` component with `weapon === null`?
3. If both: call `equip(world, entity, itemEntity, messages)`

This produces two messages: "You pick up Iron Sword" then "You equip Iron Sword".

## Tests (`src/ecs/systems/__tests__/inventory.test.ts`)
- Picking up a weapon with no weapon equipped → weapon is auto-equipped
- Picking up a weapon with a weapon already equipped → weapon is NOT auto-equipped
- Picking up a non-weapon item → no equip attempt
- Auto-equip messages appear in correct order

## Definition of Done
- Player picks up a sword with empty weapon slot → sword is equipped automatically
- Player picks up a bow with sword already equipped → bow goes to inventory only
- `bun test` passes
