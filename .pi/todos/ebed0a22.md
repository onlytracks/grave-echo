{
  "id": "ebed0a22",
  "title": "Phase 2.2b: Room tagging + spawn point system",
  "tags": [
    "phase-2",
    "map",
    "worldgen",
    "spawning"
  ],
  "status": "pending",
  "created_at": "2026-02-15T03:34:43.047Z"
}

## Goal
Tag rooms with a purpose (entry, combat, loot, boss, etc.) and define spawn points within
rooms. This decouples entity placement from hardcoded room indices in `src/index.ts` and
creates the foundation for the region rhythm system. The generator decides *what* a room
is for; a separate populator places entities based on those tags.

## Read First
- `AGENTS.md` — project constraints
- `docs/world.md` — region rhythm, enemy roster, loot profile

## Dependencies
- Requires TODO-97193fc6 (Phase 2.2a: Larger map + room variety) to be done first, since
  this builds on the updated `Room` interface with `floors` field.

## Existing Code Context

### Room Interface (after 2.2a)
```typescript
interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  floors: { x: number; y: number }[];
}
```

### Entity Spawning (`src/index.ts`)
Currently hardcodes:
- Player at `rooms[0]` center
- Sword at `rooms[0]` corner
- Bow at `rooms[1]` center
- Potion at `rooms[2]` center
- Goblins at center of rooms 1-4

This all needs to be driven by room tags instead.

## Requirements

### 1. Room Tags
Extend the `Room` interface with a tag:

```typescript
type RoomTag = "entry" | "combat" | "loot" | "boss" | "transition" | "empty";

interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  floors: { x: number; y: number }[];
  tag: RoomTag;
}
```

### 2. Tag Assignment Rules
After room generation and corridor carving, assign tags:

- `rooms[0]` → always `"entry"` — safe starting room, no enemies
- Largest room → `"boss"` (if not room 0). Preferably far from entry.
- 1-2 rooms → `"loot"` — smaller rooms with items, few or no enemies
- Dead-end rooms → `"loot"` or `"empty"` — reward for exploration
- Remaining rooms → `"combat"` — enemies placed here
- Corridor-adjacent small rooms → `"transition"` — connecting spaces, light or no content

Tag assignment should consider room size and graph position (distance from entry).

### 3. Spawn Points
Add spawn points to rooms — positions within the room's floor tiles designated for
entity placement:

```typescript
interface SpawnPoint {
  x: number;
  y: number;
  type: "player" | "enemy" | "item";
}

interface Room {
  // ... existing fields
  tag: RoomTag;
  spawnPoints: SpawnPoint[];
}
```

Spawn point generation:
- **Entry room**: 1 player spawn at center, 1-2 item spawns (starting gear)
- **Combat room**: 1-3 enemy spawns spread across the room (not all at center),
  0-1 item spawns
- **Loot room**: 2-4 item spawns, 0-1 enemy spawns (optional guard)
- **Boss room**: 1 enemy spawn at center (boss), 1-2 item spawns (reward)
- **Transition/empty**: 0-1 item spawns

Spawn points should be placed on floor tiles, not adjacent to walls (at least 1 tile
from any wall for enemies, to avoid getting stuck).

### 4. Room Populator (`src/map/room-populator.ts`)
New module that reads room tags and spawn points to create entities:

```typescript
interface PopulatorConfig {
  difficulty: number;  // 1-10, scales enemy stats and count
}

function populateRooms(
  world: World,
  rooms: Room[],
  config: PopulatorConfig,
): { player: Entity }
```

This replaces the hardcoded entity creation in `src/index.ts`. The populator:
- Creates the player entity at the entry room's player spawn
- Creates enemies at combat/boss room enemy spawns
- Creates items at item spawns using the item factory
- Returns the player entity ID (needed by Game)

### 5. Simplify `src/index.ts`
Reduce `main()` to:
```typescript
const { map, rooms } = generateDungeon();
const { player } = populateRooms(world, rooms, { difficulty: 1 });
const game = new Game(world, map, renderer);
```

All entity creation moves out of `index.ts` into the populator.

### 6. Item Pool
The populator needs to know which items to place. For now, a simple weighted pool:
- Common: Iron Sword, Short Bow
- Uncommon: (future items)
- Consumables: Healing Potion

The populator picks from the pool based on room tag and difficulty. Keep it simple —
just randomize from the existing item factories for now.

## Tests
- Unit test: tag assignment gives room 0 the `"entry"` tag
- Unit test: every room gets a tag
- Unit test: spawn points are on walkable floor tiles
- Unit test: entry room has a player spawn point
- Manual: enemies appear in combat rooms, not in the entry room
- Manual: loot rooms have items and few/no enemies
- Manual: boss room has a tougher enemy (or at least is tagged for it)

## Definition of Done
- All rooms have tags assigned based on size, position, and role
- Spawn points generated per room based on tag
- Room populator creates entities from spawn points
- `src/index.ts` no longer hardcodes entity positions
- Player always starts in a safe entry room
- `bun test` passes
