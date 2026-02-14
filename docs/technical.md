# Grave Echo — Technical Design

## Technology Stack

| Component       | Choice                  | Rationale                              |
|-----------------|-------------------------|----------------------------------------|
| Language        | TypeScript              | Strong typing, excellent AI code generation, broad ecosystem |
| Runtime         | Node.js                 | Fast, cross-platform, good terminal support |
| Database        | SQLite (better-sqlite3) | Portable, single-file, synchronous API, no server needed |
| ECS             | Custom                  | Tailored to our data model (complex components like inventory, equipment) |
| Rendering       | Custom abstraction layer | Raw ANSI escape codes behind a renderer interface, swappable |
| Build           | TBD                     | tsc, tsup, or similar                  |

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                     Game Loop                        │
│  Input → Systems → Render                            │
├──────────┬──────────┬──────────┬────────────────────┤
│  Input   │  ECS     │  Systems │  Renderer          │
│  Handler │  World   │          │                     │
│          │          │          │                     │
│ Keyboard │ Entities │ Movement │ Screen Manager      │
│ mapping  │ Comps    │ Combat   │  ├─ Game Grid       │
│ & state  │ Queries  │ AI       │  ├─ Player Stats    │
│          │          │ Loot     │  ├─ Target Info     │
│          │          │ Turn     │  ├─ Message Log     │
│          │          │ Portal   │  └─ Equipment       │
├──────────┴──────────┴──────────┴────────────────────┤
│                   Data Layer                         │
│  SQLite: persistent state, item defs, enemy defs     │
└─────────────────────────────────────────────────────┘
```

## Entity Component System

### Design Principles

- Entities are numeric IDs
- Components are plain TypeScript objects attached to entities
- Systems are functions that operate on entities with specific component combinations
- No inheritance — composition only
- The ECS makes no distinction between player, enemy, NPC — they are all entities
  with different component configurations

### Core Components (Phase 1)

| Component       | Data                                              | Entities      |
|-----------------|---------------------------------------------------|---------------|
| Position        | x, y, region                                      | All spatial   |
| Renderable      | character, foreground color, background color      | All visible   |
| Health          | current, max                                      | All living    |
| Stats           | strength, defense, speed                          | All living    |
| Equipment       | weapon, armor, accessory1, accessory2 (entity refs)| All living   |
| Inventory       | item entity list, total weight, carry capacity    | All living    |
| TurnActor       | has acted this round, movement remaining           | All living    |
| PlayerControlled| (tag component, no data)                          | Player only   |
| AIControlled    | behavior pattern, target entity                   | Enemies, NPCs |
| Item            | name, rarity, weight, item type                   | All items     |
| Weapon          | damage, range, weapon type                        | Weapon items  |
| Armor           | defense, speed penalty                            | Armor items   |
| Accessory       | bonuses, active effect, cooldown                  | Accessory items|
| Consumable      | effect type, charges current, charges max          | Potions, scrolls |
| MagicalBonuses  | list of {bonus type, value}                       | Magical items |
| Lootable        | (tag component)                                   | Skeletons, chests |
| Portal          | destination region                                | Portal entities |
| MessageSource   | text, type (echo message, lore, tutorial)         | Echo messages |
| Faction         | faction ID                                        | All living    |
| Collidable      | blocks movement (true/false)                      | Walls, entities |

Items are entities too — a sword in your inventory is an entity with Item + Weapon +
possibly MagicalBonuses components. This means items can exist on the ground, in inventory,
or equipped, all using the same entity.

### Core Systems (Phase 1)

| System          | Operates On                  | Purpose                        |
|-----------------|------------------------------|--------------------------------|
| InputSystem     | PlayerControlled + TurnActor | Translates keyboard input to actions |
| AISystem        | AIControlled + TurnActor     | Decides entity actions via behavior trees |
| MovementSystem  | Position + TurnActor         | Validates and executes movement |
| CombatSystem    | Position + Stats + Equipment | Resolves attacks, applies damage |
| LootSystem      | Lootable + Inventory         | Handles item pickup and drops  |
| InventorySystem | Inventory + Item             | Manages weight, equip/unequip  |
| HealthSystem    | Health                       | Checks for death, triggers death events |
| TurnSystem      | TurnActor                    | Manages turn order, resets movement/actions |
| RenderSystem    | Position + Renderable        | Draws entities to the game grid |
| PortalSystem    | Position + Portal            | Handles region transitions     |
| MessageSystem   | MessageSource                | Displays echo messages when near |

### Turn Flow in ECS

```
1. TurnSystem: set player as active, reset movement points
2. InputSystem: wait for player input, translate to actions
   - Secondary action? → execute via relevant system
   - Movement? → MovementSystem validates and moves, decrement points
   - Primary action? → CombatSystem/InventorySystem/etc → end player turn
   - Pass? → end player turn
3. TurnSystem: iterate non-player TurnActors
4. AISystem: for each AI entity, decide and execute actions
   - Same flow: optional secondary → movement → optional primary
5. TurnSystem: new round, back to step 1
6. RenderSystem: redraw after each action (player or AI)
```

## Renderer

### Abstraction Layer

The renderer is behind an interface so the implementation can be swapped.

```typescript
interface Renderer {
  init(): void;
  shutdown(): void;
  clear(): void;
  drawCell(x: number, y: number, char: string, fg: Color, bg: Color): void;
  drawText(x: number, y: number, text: string, fg: Color): void;
  drawBox(x: number, y: number, width: number, height: number, title?: string): void;
  flush(): void;  // commit frame to terminal
  getScreenSize(): { width: number; height: number };
}
```

The game never writes ANSI codes directly — it always goes through this interface. The
initial implementation uses raw ANSI escape codes to stdout. Could be replaced with
ncurses bindings, a web canvas renderer, or a test harness that captures output.

### Screen Components

Each UI panel is an independent component that renders into a bounded region. Components
know nothing about each other or their position on screen. A layout manager assigns regions.

| Component       | Content                                    |
|-----------------|--------------------------------------------|
| GameGrid        | The map view — terrain, entities, items     |
| PlayerStats     | HP bar, stat values, level, XP             |
| TargetInfo      | Selected target's info (Tab cycling)        |
| MessageLog      | Scrolling log of game events               |
| EquipmentPanel  | Currently equipped items                   |

### Screen Layout

```
┌──────────────────────────┬───────────────┐
│                          │ PlayerStats   │
│                          │               │
│       GameGrid           │               │
│                          ├───────────────┤
│                          │ TargetInfo    │
│                          │               │
│                          │               │
├──────────────────────────┼───────────────┤
│ MessageLog               │ EquipmentPanel│
│                          │               │
│                          │               │
└──────────────────────────┴───────────────┘
```

Layout is configurable — panels can be rearranged without modifying their rendering logic.

## Input Handling

### Key Bindings

| Key          | Context    | Action                                    |
|--------------|------------|-------------------------------------------|
| ↑ ↓ ← →     | Gameplay   | Move (1 tile per keypress, costs movement)|
| Tab          | Gameplay   | Cycle target to next visible entity       |
| Shift+Tab    | Gameplay   | Cycle target to previous visible entity   |
| Space        | Gameplay   | Primary action: attack current target     |
| Enter        | Gameplay   | Primary action: interact (pickup, portal, talk) |
| .            | Gameplay   | Primary action: hold/defend (end turn)    |
| s            | Gameplay   | Secondary action: swap weapon (from inventory) |
| a            | Gameplay   | Secondary action: trigger accessory 1     |
| d            | Gameplay   | Secondary action: trigger accessory 2     |
| i            | Gameplay   | Open inventory screen                     |
| Escape       | Any        | Close current screen / open menu          |
| 1-9          | Inventory  | Select item by index                      |
| e            | Inventory  | Equip selected item                       |
| u            | Inventory  | Use selected item (consumable)            |
| x            | Inventory  | Drop selected item                        |
| q            | Menu       | Save and quit (saves at Hub only)         |

### Input State Machine

Input handling is context-sensitive:

```
┌──────────┐    i     ┌───────────┐
│ Gameplay │ ───────→ │ Inventory │
│          │ ←─────── │           │
└──────────┘   Esc    └───────────┘
     │                      
     │ Esc                  
     ↓                      
┌──────────┐                
│   Menu   │                
│          │                
└──────────┘                
```

Additional screens (merchant, stash) follow the same pattern — Escape always goes back.

## Data Layer (SQLite)

### Persistent State (Survives Death)

| Table             | Data                                          |
|-------------------|-----------------------------------------------|
| player            | Level, XP, stat upgrades, currency            |
| stash             | Items stored at the Sanctuary                 |
| skeletons         | Up to 10: region, approximate position, run number |
| skeleton_items    | Items on each skeleton, with degradation level |
| unlocked_portals  | Which regions are accessible from the Sanctuary |
| merchant_state    | Merchant upgrade prices, what's been purchased |
| game_flags        | Sanctuary discovered, tutorial completed, etc. |

### Definition Tables (Read-Only Game Data)

| Table             | Data                                          |
|-------------------|-----------------------------------------------|
| weapon_defs       | Base stats for each weapon type by rarity     |
| armor_defs        | Base stats for each armor type by rarity      |
| accessory_defs    | Base stats, effects, cooldowns                |
| consumable_defs   | Effect types, base charges                    |
| enemy_defs        | Base stats, AI pattern, loot table ref        |
| loot_tables       | Drop rates by source type and rarity          |
| bonus_pool        | Possible magical bonuses and value ranges     |

### No Run State Persistence

The current run (world layout, entity positions, inventory, equipped gear) exists only in
memory via the ECS. When the player dies or quits mid-run, run state is discarded. Save/load
only operates on the persistent state tables.

Saving is only available at the Sanctuary. Loading always resumes at the Sanctuary.

## Project Structure (Proposed)

```
grave-echo/
├── docs/                    # Design documents (this folder)
├── src/
│   ├── index.ts             # Entry point
│   ├── game.ts              # Game loop, state machine
│   ├── ecs/
│   │   ├── world.ts         # ECS world: entity creation, component storage, queries
│   │   ├── components.ts    # Component type definitions
│   │   └── systems/
│   │       ├── input.ts
│   │       ├── ai.ts
│   │       ├── movement.ts
│   │       ├── combat.ts
│   │       ├── loot.ts
│   │       ├── inventory.ts
│   │       ├── health.ts
│   │       ├── turn.ts
│   │       ├── portal.ts
│   │       └── message.ts
│   ├── renderer/
│   │   ├── renderer.ts      # Renderer interface
│   │   ├── ansi.ts          # ANSI implementation
│   │   ├── layout.ts        # Screen layout manager
│   │   └── panels/
│   │       ├── game-grid.ts
│   │       ├── player-stats.ts
│   │       ├── target-info.ts
│   │       ├── message-log.ts
│   │       └── equipment.ts
│   ├── data/
│   │   ├── database.ts      # SQLite connection, migrations
│   │   ├── persistence.ts   # Save/load persistent state
│   │   └── definitions.ts   # Load game definitions from DB
│   ├── world-gen/
│   │   ├── generator.ts     # Region generation orchestrator
│   │   ├── overworld.ts     # Overworld generation
│   │   └── dungeon.ts       # Dungeon generation
│   └── types/
│       └── index.ts         # Shared type definitions
├── data/
│   └── grave-echo.db        # SQLite database file
├── package.json
└── tsconfig.json
```

## Open Questions

- Build tool choice — tsc + node, tsx for dev, tsup for bundling?
- Testing strategy — unit tests for systems? Integration tests for turn flow?
- Map representation — 2D array of tile entities? Separate tile map + entity layer?
- FOV/visibility — should the player only see nearby tiles? Fog of war?
- How large is the game grid viewport? Fixed size or adaptive to terminal?
- Pathfinding algorithm for AI movement — A* or simpler?
- Should we support terminal resize mid-game?
