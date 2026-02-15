{
  "id": "e7bbce1e",
  "title": "Phase 3.2: Inventory screen + fix Renderable stripping on pickup",
  "tags": [
    "phase-3",
    "inventory",
    "ui",
    "bugfix"
  ],
  "status": "done",
  "created_at": "2026-02-15T05:38:25.697Z"
}

## Goal
Add a modal inventory screen so the player can view, equip, unequip, and drop items.
Also fix the anti-pattern of stripping Renderable on pickup and reconstructing it on
drop — Renderable should be intrinsic to the entity.

## Read First
- `AGENTS.md` — project constraints
- `docs/items.md` — item system design

## Existing Code Context

### Inventory System (`src/ecs/systems/inventory.ts`)
- `pickup()` — removes Position AND Renderable from item entity, adds to inventory
- `drop()` — re-adds Position, reconstructs Renderable from hardcoded lookup table
- `equip()`, `unequip()`, `swapToNextWeapon()`, `useConsumable()` — all work
- `drop()` is implemented but has no input binding

### Input (`src/input/input-handler.ts`)
`"i"` key is not mapped. No inventory-related InputEvent types exist.

### Game State (`src/game.ts`)
```typescript
enum GameState { Running, Dead }
```
No modal/overlay state. The game loop processes input in a single path.

### Renderer
No overlay/modal rendering exists. All panels are fixed layout regions.

## Requirements

### 1. Fix: Stop Removing Renderable on Pickup
In `pickup()`, remove only Position, NOT Renderable:

```typescript
// Before (broken):
world.removeComponent(itemEntity, "Position");
world.removeComponent(itemEntity, "Renderable");

// After (correct):
world.removeComponent(itemEntity, "Position");
// Renderable stays — it's intrinsic to the entity
```

The renderer already only draws entities with BOTH Position and Renderable, so items
in inventory (no Position) won't appear on the map.

In `drop()`, remove the entire Renderable reconstruction block (the hardcoded charMap/
fgMap lookup). Just re-add Position:

```typescript
world.addComponent(itemEntity, "Position", { x: pos.x, y: pos.y });
// Renderable is already on the entity — no reconstruction needed
```

### 2. GameState: Inventory Mode
Add an `Inventory` state to GameState:

```typescript
enum GameState { Running, Dead, Inventory }
```

When in Inventory state, the game loop routes input to inventory handling instead of
the normal game input. The game world does NOT advance turns while in inventory.

### 3. Input: Open/Close Inventory
Add `"inventory"` to InputEvent. Map `i` key (0x69) in `parseInput()`.

- Pressing `i` while Running → switch to Inventory state
- Pressing `i` or Esc while in Inventory → switch back to Running

### 4. Inventory Screen State
Track cursor position and the inventory view:

```typescript
interface InventoryScreenState {
  cursorIndex: number;
  items: Entity[];  // snapshot of inventory.items for stable indexing
}
```

Store on the Game class or as a separate object. Initialize when entering Inventory
state. The items list is a snapshot — if the player drops something, rebuild it.

### 5. Inventory Screen Rendering
Render as an overlay on top of the game grid area (the largest panel). Draw a bordered
box with the item list inside:

```
╔═══════ Inventory ═══════╗
║                          ║
║  > Iron Sword [E]    3wt ║
║    Healing Potion ×3 1wt ║
║    Old Bow           2wt ║
║                          ║
║  Weight: 6/20            ║
║                          ║
║  [d]rop [e]quip [Esc]   ║
╚══════════════════════════╝
```

For each item show:
- Cursor indicator (`>` or highlight)
- Item name (from Item.name)
- `[E]` marker if currently equipped (weapon slot matches this entity)
- Charge count for consumables (`×3`)
- Weight

Footer shows:
- Total weight / carry capacity
- Available actions

### 6. Inventory Input Handling
While in Inventory state, handle these keys:

- **Up/Down arrows**: move cursor through item list
- **`d`**: drop highlighted item at player's feet, rebuild item list
- **`e`**: equip highlighted item (if weapon) or unequip (if already equipped)
- **`i` or Esc**: close inventory, return to Running
- **All other keys**: ignored

Dropping an equipped item should unequip it first (already handled by `drop()`).

### 7. Drop Action Details
When dropping from inventory screen:
1. Call existing `drop(world, player, itemEntity, messages)`
2. Remove item from the screen's item list
3. Adjust cursor if it was on the last item
4. If inventory is now empty, close the screen

Dropping is NOT a turn action — the player is managing inventory outside of combat
time. This is consistent with the idle/alert model: if you can open inventory, you're
not in danger.

**Alternative consideration**: if the player is `alert`, should inventory be blocked
or should drop cost an action? For simplicity, allow inventory access anytime but
document this as a potential balance concern for later.

### 8. Equip/Unequip from Inventory
- Highlight a weapon → press `e` → calls `equip()`. If another weapon was equipped,
  it gets unequipped (stays in inventory).
- Highlight an equipped weapon → press `e` → calls `unequip()`.
- Highlight a non-equippable item (consumable) → press `e` → no effect, show message.

### 9. Rendering Integration
The inventory overlay should:
- Draw OVER the game grid region (use the same region coordinates)
- NOT clear other panels (player stats, message log stay visible)
- Use `renderer.drawBox()` for the border
- Use `renderer.drawText()` for each line
- Highlighted item: use a distinct foreground color (brightWhite or brightYellow)
  vs normal items (gray)

### 10. Empty Inventory
If inventory is empty, show:
```
╔═══════ Inventory ═══════╗
║                          ║
║    (empty)               ║
║                          ║
║  [Esc] close             ║
╚══════════════════════════╝
```

## Edge Cases
- **Drop last item**: cursor resets, screen shows empty or closes
- **Drop equipped weapon**: unequips first, then drops (existing behavior)
- **Full floor tile**: multiple items can stack on same tile (Position allows it)
- **Open inventory with no items**: shows empty state
- **Consumable with 0 charges**: shouldn't exist (destroyed in useConsumable), but
  guard against it

## Tests
- Unit test: pickup no longer removes Renderable from item entity
- Unit test: drop no longer adds Renderable (it's already there)
- Unit test: dropped item has correct Position matching dropper
- Unit test: dropped item renders on map (has both Position and Renderable)
- Manual: `i` opens inventory overlay on game grid
- Manual: arrow keys navigate item list
- Manual: `d` drops item, it appears on the ground
- Manual: `e` equips/unequips weapons
- Manual: `[E]` marker shows on equipped items
- Manual: weight totals are accurate
- Manual: Esc/i closes inventory
- Manual: empty inventory shows "(empty)"
- `bun test` passes

## Definition of Done
- Renderable no longer stripped on pickup or reconstructed on drop
- `i` key opens modal inventory screen
- Inventory screen shows all items with name, weight, equipped status, charges
- Arrow keys navigate, `d` drops, `e` equips/unequips
- Esc/i closes inventory
- Empty inventory handled gracefully
- `bun test` passes
