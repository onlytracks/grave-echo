# Grave Echo — Core Gameplay Loop

## Run Structure

Each run follows a three-act journey through procedurally generated terrain. The geography
changes every run, but the structure and pacing are consistent.

### Tutorial Phase (Pre-Hub)

- **Setting:** Edge of the corrupted wilds
- **Purpose:** Teach core mechanics — movement, combat, looting, inventory
- **End condition:** Discover the Hub
- **On death:** Restart at the very beginning with nothing
- **Design intent:** Keep this short and focused. The player should find the Hub within
  1-3 runs. Once discovered, the Hub persists permanently as the new spawn point.

### The Hub — Echoed Sanctuary

A magical ruin whose ancient protections hold the corruption at bay. Once discovered, this
becomes the adventurer's permanent base and respawn point.

**Hub features:**

- **Stash:** Store gear across runs. Build reserves. Decide what to risk vs. what to save.
- **Merchant:** Sell excess loot for currency. Buy stat upgrades (strength, health, defense,
  speed, etc.). Upgrade costs scale — early upgrades are impactful, later ones are marginal.

The Hub is the anchor of the meta-game. The tension between "stash this great item" and
"I need it for this run" is a core decision.

### Act I — The Corrupted Wilds

- **Setting:** Forest and wilderness, visibly tainted by corruption
- **Content:** Overworld exploration + 2 minor dungeons/ruins
- **Purpose:** Gear up, learn the run's available items, ease into combat
- **Gate:** Clearing at least 1 minor dungeon opens the path forward

### Act II — The Ancient City

- **Setting:** Ruined city, crumbling architecture, corrupted inhabitants
- **Content:** Overworld exploration + 2 minor crypts
- **Purpose:** Escalation — tougher enemies, better loot, higher stakes
- **Gate:** Clearing at least 1 minor crypt opens the path forward

### Act III — The Deep Crypts

- **Setting:** Cathedral/castle entrance leading down into multi-floor dungeon
- **Content:** Multiple dungeon floors with checkpoints, culminating in the source of corruption
- **Purpose:** Climax — the hardest content, the best rewards, the final boss
- **Structure:** Multiple floors with internal checkpoints

## Moment-to-Moment Loop

```
Explore → Encounter → Fight/Flee → Loot → Manage Inventory → Explore
                                                    ↓
                                            Return to Hub?
                                          (sell, stash, restock)
```

- **Explore:** Navigate procedurally generated overworld and dungeons. Discover points of
  interest, dungeons, enemy camps, skeletons from past runs, environmental storytelling.
- **Encounter:** Enemies roam the overworld and populate dungeons. Encounters range from
  single corrupted creatures to ambush packs to mini-bosses.
- **Fight:** Real-time action RPG combat. Melee, ranged, and magical items. Positioning and
  timing matter.
- **Loot:** Defeated enemies and explored areas yield gear and consumables. Magical items are
  the primary power system (spells/abilities come in a later phase).
- **Manage:** Limited inventory forces decisions. Equip, consume, stash, sell, or discard.
- **Return:** The player can return to the Hub at any time to offload loot and resupply.
  The tradeoff: safety costs time, and the world may shift.

## Run-to-Run Loop (Meta-Progression)

```
Run → Death → Lose All Gear → Retain XP/Stats → Respawn at Hub → New Run
```

### What Persists Across Deaths

| Persists                      | Resets                      |
| ----------------------------- | --------------------------- |
| Character level / experience  | All carried gear            |
| Stat upgrades (HP, STR, etc.) | Consumable items            |
| Hub discovery (permanent)     | Dungeon/overworld layout    |
| Stashed items at Hub          | Enemy positions             |
| Skeletons from past deaths    | Progress within current run |
| Merchant inventory/upgrades   |                             |

### Stat Upgrades

- Experience is earned through combat, exploration, and completing objectives
- On death, experience is retained
- At the Hub merchant, experience is spent on permanent stat upgrades:
  - Health, Strength, Defense, Speed, etc.
  - Upgrade costs scale — early upgrades are impactful, later ones are marginal
  - This curve ensures skill remains important; you can't purely out-stat the game

### Skeleton System (The Echo)

When the adventurer dies, a skeleton is left at the death location in future runs.

- **Up to 10 skeletons** persist in the world at any time
- **Most recent skeleton** has the best-preserved gear (partial — not everything survives)
- **Older skeletons** have increasingly degraded gear — rust, decay, corruption damage
- **Oldest skeletons** may have only a single usable item, or just bones and flavor text
- **New deaths push out the oldest skeleton** when the cap is reached
- Skeletons appear at their death location in the procedurally generated world — the
  world is new each run, so skeleton placement is approximate (same act/area, not exact tile)

## Death

- Death is immediate — no extra lives, no second chances mid-combat
- All carried gear is lost (becomes skeleton loot for future runs)
- Stashed gear at the Hub is safe
- The player respawns at the Hub (or at the start if Hub hasn't been discovered)
- A brief "Echo" screen shows: XP earned, stats gained, notable kills, depth reached

## Development Phases

| Phase | Content                            | Goal                             |
| ----- | ---------------------------------- | -------------------------------- |
| 1     | Tutorial + Hub + Act I (Forest)    | Core loop playable and fun       |
| 2     | Act II (Ancient City + crypts)     | Escalation, act transitions work |
| 3     | Act III (Deep crypts, multi-floor) | Full run completable             |
| 4     | Final boss + ending                | Narrative resolution             |

Each phase delivers a complete, testable experience. Phase 1 is a small but whole game.

## Open Questions

- How does returning to the Hub work mid-run? Walk back? Portal/fast travel? Consumable item?
- Can the Hub be upgraded over time? (Bigger stash, better merchant stock, new facilities)
- What happens to stashed items if the player never retrieves them? Infinite stash or limited?
- Skeleton placement in a procedurally generated world — how do we map old death locations
  to new layouts? By act + relative depth? Named landmark proximity?
- Should there be a "corpse run" incentive — bonus for reaching your most recent skeleton
  quickly?
- Checkpoints in Act III — how do these work? Auto-save at each floor? Campfire mechanic?
