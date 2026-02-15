{
  "id": "9f5bac7d",
  "title": "Phase 2.4: Rich debug messages — entity state changes, spawns, world events",
  "tags": [
    "phase-2",
    "debug",
    "messages"
  ],
  "status": "done",
  "created_at": "2026-02-15T04:45:14.207Z"
}

## Goal
Add detailed debug-level messages throughout the game systems so the debug panel shows
meaningful information about what's happening under the hood. Currently only combat hits,
deaths, and inventory actions produce messages. Entity state changes, spawns, AI decisions,
awareness transitions, and turn economy details are invisible.

## Read First
- `AGENTS.md` — project constraints

## Existing Code Context

### Current Messages
Only these systems log messages:
- `combat.ts` — `"X attacks Y for N damage (N - N)"`
- `health.ts` — `"You have died!"`, `"X dies!"`
- `inventory.ts` — pickup, drop, equip, unequip, swap, use consumable
- `input.ts` — `"Nothing to pick up here."`, `"Already used secondary action"`

### Missing Message Sources
Nothing logs:
- Entity spawning (player, enemies, items)
- Awareness state transitions (idle → alert, alert → idle)
- AI decisions (what an enemy decided to do and why)
- Player awareness transitions
- Turn economy events (turn start, turn end, movement used)
- Movement (entity moved from A to B)
- FOV changes (new tiles revealed, entities spotted)
- Dungeon generation results (room count, map size)

### MessageLog (`src/ecs/systems/messages.ts`)
```typescript
class MessageLog {
  add(message: string): void  // tags with current turn
  setTurn(turn: number): void
  getRecent(count: number): readonly string[]
  getMessagesWithTurns(): readonly TaggedMessage[]
}
```

Single log instance passed through systems. No message categories or severity levels.

### Debug Panel (`src/renderer/panels/debug-panel.ts`)
Shows entity count, player turn state, AI entity details, and messages with turn
separators. All messages appear in both the regular message log and debug panel.

## Requirements

### 1. Message Categories
Add a category to messages so the debug panel can show everything but the regular
message log only shows player-relevant messages:

```typescript
type MessageCategory = "gameplay" | "debug";

interface TaggedMessage {
  text: string;
  turn: number;
  category: MessageCategory;
}
```

Update `MessageLog.add()`:
```typescript
add(message: string, category: MessageCategory = "gameplay"): void
```

- `"gameplay"` — shown in both MessageLog panel and Debug panel (combat, loot, death)
- `"debug"` — shown only in Debug panel (state changes, AI decisions, spawns)

Update `getRecent()` and `getMessages()` to filter by category (default: gameplay only).
Add `getRecentAll(count)` for the debug panel that includes everything.

### 2. Spawn Messages
In `src/index.ts` (or the future room populator):

```
[debug] Player spawned at (15, 12)
[debug] Goblin#4 spawned at (30, 8) [charger, 8hp]
[debug] Iron Sword spawned at (16, 11) [5 dmg, 3 wt]
[debug] Healing Potion spawned at (42, 20) [3/3 charges]
```

### 3. Awareness Transition Messages
In `src/ecs/systems/sensory.ts`, when awareness state changes:

```
[debug] Goblin#4: idle → alert (spotted player at d=5)
[debug] Goblin#4: alert → idle (lost target, 6 turns)
[debug] Player: idle → alert (sees alert Goblin#4)
[debug] Player: alert → idle (no threats visible)
```

Only log on actual transitions (state changed), not every tick.

### 4. AI Decision Messages
In `src/ecs/systems/ai.ts`, when an AI entity acts:

```
[debug] Goblin#4 AI: moving toward player (15,12) → stepped (29,8)→(28,8)
[debug] Goblin#4 AI: bumping player at (15,12) — attack
[debug] Goblin#4 AI: idle, skipping turn
[debug] Goblin#4 AI: moving to last known target (20,15)
```

### 5. Turn Economy Messages
In `src/ecs/systems/turn.ts` or `src/game.ts`:

```
[debug] === Turn 5 ===
[debug] Player turn start: 3 moves, no act, no secondary
[debug] Player turn reset (idle)
[debug] Player turn end
[debug] Goblin#4 turn start: 2 moves
[debug] Goblin#4 turn end
```

### 6. Movement Messages (Debug Only)
In `src/ecs/systems/input.ts` or movement processing:

```
[debug] Player moved (15,12)→(16,12), 2 moves remaining
[debug] Player movement blocked by wall at (16,12)
[debug] Player movement blocked by Goblin#4 at (16,12)
```

### 7. Combat Detail Messages
Enhance existing combat messages with debug detail:

Gameplay (existing, keep):
```
You attack Goblin for 4 damage (5 - 1)
```

Debug (new, additional):
```
[debug] Combat: Player(str=5) → Goblin#4(def=1), roll=4 dmg, hp: 8→4
```

### 8. Vision/FOV Messages
In `src/ecs/systems/sensory.ts`:

```
[debug] Player revealed 12 new tiles
[debug] Player spotted Goblin#4 at (30,8)
```

Only log when meaningful (new tiles revealed, new entity spotted for first time).

### 9. Debug Panel Formatting
Update `src/renderer/panels/debug-panel.ts` to show debug messages with a visual
prefix or color distinction:
- Gameplay messages: white (current behavior)
- Debug messages: dark gray or dim cyan
- Awareness changes: yellow
- Combat debug: red

### 10. Message Prefix Convention
Debug messages should use a terse prefix to indicate source system:
- `[spawn]` — entity creation
- `[ai]` — AI decisions
- `[sense]` — awareness, vision, FOV
- `[turn]` — turn economy
- `[move]` — movement
- `[combat]` — combat details

These prefixes help scan the debug log quickly. The debug panel could optionally
color-code by prefix.

## Implementation Notes
- Pass `MessageLog` to all systems that need to log. Most already receive it.
  Systems that don't (like sensory) need it added to their function signatures.
- Don't log every frame — only log on state changes and actions.
- Keep gameplay messages clean and player-facing. Debug messages can be verbose.
- The regular MessageLog panel should NEVER show debug messages.

## Tests
- Unit test: `add("test", "debug")` is excluded from `getRecent()`
- Unit test: `add("test", "debug")` is included in `getRecentAll()`
- Unit test: `add("test")` defaults to "gameplay" category
- Manual: debug panel shows rich state change information
- Manual: message log panel only shows gameplay messages (no debug noise)
- Manual: awareness transitions are visible in debug panel
- Manual: AI decisions are traceable in debug panel

## Definition of Done
- MessageLog supports `"gameplay"` and `"debug"` categories
- Regular message log filters to gameplay only
- Debug panel shows all messages with visual distinction
- Spawn messages for all entity types
- Awareness transition messages (both AI and player)
- AI decision messages with reasoning
- Turn economy messages
- Movement debug messages
- Enhanced combat detail messages
- `bun test` passes
