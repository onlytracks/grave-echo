{
  "id": "5dcb6fdb",
  "title": "Debug mode disables FOW — full map, entities, and items visible",
  "tags": [
    "debug",
    "quality-of-life",
    "renderer",
    "fow"
  ],
  "status": "done",
  "created_at": "2026-02-16T00:27:00.842Z"
}

## Goal
When debug mode is toggled on, fog of war is automatically disabled. The full
map, all entities, and all items render at full brightness. No separate toggle.

## Behavior
- `F2` toggles debug mode (existing)
- Debug on → FOW off (full map visible)
- Debug off → FOW on (normal rendering)
- Game logic unchanged — AI awareness, player sensing all run normally
- This is purely a rendering override

## Implementation

### Game class (src/game.ts)
No new state needed — just use `this.debugVisible` to control FOW in the
render pass:

```typescript
const visibleForRender = this.debugVisible
  ? null   // null = show everything
  : this.visibleTiles;

renderGameGrid(
  this.renderer,
  this.world,
  this.map,
  visibleForRender,
  // ...
);
```

### Game grid renderer (src/renderer/panels/game-grid.ts)
Change `visibleTiles` parameter type from `Set<string>` to `Set<string> | null`:
- `null` → render every tile at full brightness, render every entity
- `Set<string>` → current behavior (visible = bright, explored = dim, unknown = hidden)

### No input handler changes
No new keybind needed. `F2` already toggles debug mode.

## Files to Change
- `src/game.ts` — pass null visibleTiles when debugVisible
- `src/renderer/panels/game-grid.ts` — accept null visibleTiles = show all

## Tests
- Manual: press F2, full map + all entities + items revealed at full brightness
- Manual: press F2 again, FOW restored
- Manual: AI still behaves normally with debug on (idle enemies stay idle)
- `bun test` passes

## Definition of Done
- Debug mode on = FOW off, full map visible
- Debug mode off = normal FOW
- Game logic unaffected
- `bun test` passes
