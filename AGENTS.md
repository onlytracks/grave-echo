# Grave Echo — Agent Guidelines

## Project Overview

Grave Echo is a roguelite turn-based TUI game rendered in ANSI art. Read `docs/vision.md`
for the full concept, design pillars, and tone.

## Design Documents

Read the relevant doc before implementing any feature in its domain.

| Document            | Covers                                              |
| ------------------- | --------------------------------------------------- |
| `docs/vision.md`    | Game concept, design pillars, tone, audience        |
| `docs/core-loop.md` | Run structure, meta-progression, death, hub         |
| `docs/combat.md`    | Turn system, actions, weapons, enemies, targeting   |
| `docs/items.md`     | Equipment, rarity, loot, weight, consumables        |
| `docs/world.md`     | Regions, pacing, dungeons, The Verdant Threshold    |
| `docs/technical.md` | Stack, ECS, renderer, data layer, project structure |

## Tech Stack

- **Runtime:** Bun (not Node.js) — `bun run`, `bun test`, `bun install`
- **Language:** TypeScript (strict mode)
- **Database:** `bun:sqlite` — no ORM, no better-sqlite3, no Drizzle
- **Formatting:** `bun run format` (Prettier)
- **Dependencies:** Minimize. ECS, renderer, and data layer are all custom. See `docs/technical.md`.

## Non-Negotiable Constraints

1. **Universal entity system** — Player, enemies, NPCs follow identical rules. No special-case
   code for the player. Differences come from component data, not code paths.
2. **Items are entities** — same entity whether on the ground, in inventory, or equipped.
3. **No run state persistence** — only Sanctuary hub state persists to SQLite. See `docs/core-loop.md`.
4. **Renderer abstraction** — no direct ANSI outside the renderer implementation. See `docs/technical.md`.
5. **Repository pattern** — no SQL outside `src/data/`. See `docs/technical.md`.

## Code Conventions

- Bun APIs over Node.js equivalents
- Composition over inheritance
- No `any`, no type assertions unless unavoidable
- One responsibility per system
- Test systems in isolation with minimal ECS worlds
