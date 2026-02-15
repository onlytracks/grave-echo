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
| `docs/senses.md`    | Vision, hearing, smell, awareness, fog of war       |
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

## Terminology

Use these terms consistently in docs, code comments, commit messages, and todos.

| Term       | Meaning                                                                           |
| ---------- | --------------------------------------------------------------------------------- |
| **glyph**  | The Unicode character used to visually represent a tile or entity (`@`, `·`, `┌`) |
| **entity** | An ECS entity — any game object with components (player, enemies, items, portals) |
| **tile**   | A map cell with terrain properties (floor, wall) — not an entity                  |
| **panel**  | A bounded UI region that renders specific information (PlayerStats, MessageLog)   |
| **sense**  | A perception channel (vision, hearing, smell) — see `docs/senses.md`              |

Avoid "character" in docs and comments — it's ambiguous (Unicode glyph vs game entity).
The code field `char` in `Renderable` and `Tile` interfaces is fine — it's idiomatic and
short for glyph in context.

### Glyph Reference

When choosing glyphs for entities, items, or terrain, consult this roguelike Unicode reference:
https://raw.githubusercontent.com/globalcitizen/zomia/master/USEFUL-UNICODE.md

Prefer glyphs that are single-width and render well in common monospace terminal fonts.
Test in the game before committing — some glyphs look different across fonts.

## Code Conventions

- Bun APIs over Node.js equivalents
- Composition over inheritance
- No `any`, no type assertions unless unavoidable
- One responsibility per system
- Test systems in isolation with minimal ECS worlds
- When closing a todo that corresponds to completed work, stage the todo status change before committing — never commit code and close the todo separately
- **Never modify closed/done todos** — they are an archive of completed work. Only `pending` or `open` todos may be updated. If a closed todo needs revision, create a new todo that references it.
