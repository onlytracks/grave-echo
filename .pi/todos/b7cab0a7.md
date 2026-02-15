{
  "id": "b7cab0a7",
  "title": "Render entities with z-order priority (living > items > terrain)",
  "tags": [
    "quality-of-life",
    "renderer"
  ],
  "status": "done",
  "created_at": "2026-02-15T02:59:04.083Z"
}

## Goal
When multiple entities share a tile, render the highest-priority one. Currently the entity
rendered last in query order wins, so items can render on top of the player or enemies.
The player standing on an item should show `@`, not `/`.

## Existing Code Context
- `src/renderer/panels/game-grid.ts` — `renderGameGrid()` queries all entities with
  Position+Renderable, iterates them, and draws each with `drawCell()`. Last entity
  drawn on a tile overwrites previous ones. No ordering guarantee.
- Components: `PlayerControlled` (tag), `AIControlled` (has pattern), `Item` (has name/weight).
  These can be used to determine entity priority without adding new components.

## Requirements

In `renderGameGrid()` in `src/renderer/panels/game-grid.ts`, sort the entity render list
so higher-priority entities are drawn last (and thus visible):

**Priority (lowest drawn first, highest drawn last):**
1. Items (entities with `Item` component)
2. AI entities (entities with `AIControlled` component)
3. Player (entities with `PlayerControlled` component)

Implementation: after querying entities with Position+Renderable, sort them by priority
before the render loop. Use the World to check for `Item`, `AIControlled`, or
`PlayerControlled` components to assign priority.

```typescript
function entityPriority(world: World, entity: Entity): number {
  if (world.hasComponent(entity, "PlayerControlled")) return 3;
  if (world.hasComponent(entity, "AIControlled")) return 2;
  if (world.hasComponent(entity, "Item")) return 1;
  return 0;
}
```

Sort ascending so highest priority renders last.

## Tests
No automated tests — visual rendering concern. Verify manually:
- Player standing on an item tile shows `@`, not the item character
- Enemy standing on an item tile shows the enemy, not the item
- Items on empty floor still render normally

## Definition of Done
- Player character always visible when standing on an item
- Enemies render over items
- `bun test` still passes (no regressions)
