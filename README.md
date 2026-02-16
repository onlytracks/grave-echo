# Grave Echo

Grave Echo is a dark fantasy roguelite, turn-based tactical RPG rendered in ANSI art.
You play an adventurer pushing through corrupted wilds, ruined cities, and deep crypts,
where death is part of progression: your stats persist, your gear is lost, and echoes of
past runs remain behind as reclaimable skeleton loot.

Built as a personal multi-agent AI systems experiment.

## Core ideas

- **Death is progress**: permanent stat growth across runs
- **Echo skeletons**: past deaths leave degraded loot in future runs
- **Universal ECS rules**: player, enemies, and NPCs all use the same action economy
- **Meaningful inventory choices**: weight-based carry limits, stash risk/reward
- **Authored pacing + procedural generation**: consistent run arc, fresh layouts each run

## Current status

Active prototype built with Bun + strict TypeScript, with custom ECS, renderer, dungeon
generation, pathfinding, combat/AI systems, and test coverage around core subsystems.

## Tech stack

- **Runtime**: Bun
- **Language**: TypeScript (strict)
- **Architecture**: Custom ECS + custom ANSI renderer
- **Persistence**: SQLite via `bun:sqlite` (hub/meta progression)

## Getting started

Prerequisites:

- Bun
- A terminal configured with a **Nerd Font** (required for many item glyphs)

```bash
bun install
bun run start
```

Optional:

```bash
bun test
bun run format
```

## Design docs

Project design is documented in `docs/`:

- `docs/vision.md` — concept, pillars, tone
- `docs/core-loop.md` — run structure and meta-progression
- `docs/combat.md` — turn system, actions, and enemy behavior
- `docs/items.md` — equipment, rarity, loot, inventory/weight
- `docs/world.md` — regions and pacing
- `docs/senses.md` — vision/awareness/fog of war
- `docs/technical.md` — architecture and implementation direction

## License

MIT — see [`LICENSE`](./LICENSE).
