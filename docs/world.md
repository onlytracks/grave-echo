# Grave Echo — World Structure

## Overview

The world of Grave Echo is organized around the **Echoed Sanctuary** — a magical ruin that
serves as the player's Hub. From the Sanctuary, portals connect to distinct regions of the
world. Each region has its own terrain, enemies, dungeons, and boss encounters. The player
chooses which region to enter each run.

Regions are procedurally generated each run, but follow a defined structure that ensures
consistent pacing and content density. The geography changes; the rhythm doesn't.

## World Map

```
                    ┌─────────────────┐
                    │  The Ashen Deep  │  (Region 3 - future)
                    └────────┬────────┘
                             │
┌──────────────┐    ┌────────┴────────┐    ┌──────────────────┐
│  The Verdant │    │     Echoed      │    │  The Shattered   │
│   Threshold  ├────┤   Sanctuary     ├────┤   Kingdom        │  (Region 2 - future)
│  (Starting   │    │     (Hub)       │    └──────────────────┘
│   Wilds)     │    └────────┬────────┘
└──────────────┘             │
                    ┌────────┴────────┐
                    │    (Future      │
                    │    regions...)   │
                    └─────────────────┘
```

The Sanctuary sits at the center. Portals to each region are discovered and unlocked through
play. Only The Verdant Threshold is accessible initially — the player must find the Sanctuary
before any other regions open.

## Region Names & Themes

| Region              | Theme                          | Phase | Status      |
|---------------------|--------------------------------|-------|-------------|
| The Verdant Threshold | Corrupted forest, overgrown ruins, the gateway to the Sanctuary | 1 | Starting zone |
| The Shattered Kingdom | Ruined ancient city, crumbling streets, corrupted inhabitants | 2 | Future |
| The Ashen Deep       | Cathedral descent into deep crypts, multi-floor dungeon | 3 | Future |

These are working names. Each region connects to the Sanctuary via a portal discovered
during play.

## Cross-Region Dependencies (Future)

Regions are not strictly linear. The Sanctuary's portal system allows the player to revisit
any unlocked region. This supports:

- A locked door in The Verdant Threshold that requires a key found in The Shattered Kingdom
- An NPC in one region who gives information needed in another
- Returning to earlier regions with better gear to access previously unreachable areas
- Optional objectives that span multiple regions

For Phase 1, only The Verdant Threshold exists. The architecture supports cross-region play
without needing to build it yet.

## Game Rhythm (General)

Every region follows the same structural pattern, scaled to its difficulty and theme:

```
Region Entry
  │
  ├── Overworld Exploration (enemies, loot, environmental storytelling)
  │     │
  │     ├── Minor Dungeon 1 (10-15 min, mini-boss, portal reward)
  │     │
  │     ├── Overworld Exploration (escalating difficulty)
  │     │
  │     ├── Minor Dungeon 2 (10-15 min, mini-boss, portal reward)
  │     │
  │     └── Overworld Exploration (approach to main dungeon)
  │
  └── Main Dungeon (multi-floor, region boss, portal to Sanctuary + next region unlock)
```

- **Overworld segments** provide breathing room, loot, and encounters between dungeons
- **Minor dungeons** are focused 10-15 minute challenges ending in a mini-boss
- **Clearing a mini-boss** spawns a **return portal** — the player's earned safe exit
- **The main dungeon** is the region's climax, harder and longer than minor dungeons
- **Defeating the region boss** unlocks the portal to the next region at the Sanctuary
- The player is never required to clear both minor dungeons, but doing so provides
  better gear and preparation for the main dungeon

### Pacing Within a Region

| Segment              | Intensity | Duration  | Purpose                        |
|----------------------|-----------|-----------|--------------------------------|
| Overworld approach   | Low-Med   | 5-10 min  | Explore, gear up, learn layout |
| Minor dungeon        | Medium    | 10-15 min | Focused challenge, loot spike  |
| Overworld transition | Low       | 3-5 min   | Breathe, manage inventory      |
| Minor dungeon        | Med-High  | 10-15 min | Harder challenge, better loot  |
| Overworld approach   | Medium    | 5-10 min  | Building tension               |
| Main dungeon         | High      | 15-20 min | Climax, boss fight             |

**Total region clear: ~50-75 minutes** — aligns with the ~1 hour target session.

## Return Portals

Portals are the only way to return to the Sanctuary from the field.

- **Static portals** appear after defeating a mini-boss or region boss
- Portals are **permanent for the current run** — the player can use them to shuttle
  loot back to the Sanctuary stash and return to continue
- Portals are **one-way back to the Sanctuary** — returning to the region places the
  player at the portal location, not where they left off
- On death, all run portals are lost (the region regenerates next run)

This creates the rhythm: push deeper → earn a portal → bank loot → push deeper.

---

## The Verdant Threshold (Detailed — Phase 1)

### Overview

A once-thriving forest at the boundary of the corruption. Ancient trees twist with dark
energy. Overgrown ruins dot the landscape — remnants of watchtowers, shrines, and outposts
that once guarded the approach to the lands beyond. The corruption is visible but not
overwhelming: sickly coloration, unnatural growth, warped wildlife.

### First Experience (Pre-Sanctuary Discovery)

The player's first runs begin at the **edge of the Threshold** with no gear. This is the
gateway to the rest of the game.

**Structure:**
- Small, guided area that opens into broader exploration
- Guarantees the player finds: a melee weapon, a ranged weapon, and a magical wand
- **Echo messages** scattered throughout — glowing inscriptions left by previous
  adventurers (or echoes of the player's own past). These teach game mechanics:
  - Movement and combat basics
  - How the action economy works (secondary → movement → primary)
  - Item pickup and weight
  - Tab-targeting
- Light enemy presence — simple Charger-type corrupted wildlife
- The path naturally leads toward the Sanctuary

**Death in the Threshold (pre-Sanctuary):**
- The player respawns **nearby in a safe location**, not at the start of the zone
- Gear is lost as normal (skeleton left behind)
- This trains the player on the Echo/death system without punishing them with a full restart
- Once the Sanctuary is discovered, normal death rules apply (respawn at Sanctuary,
  region regenerates)

### Sanctuary Discovery

The player finds the **Echoed Sanctuary** — an ancient ruin humming with protective magic.
The corruption cannot reach it. This is a landmark moment:

- The Sanctuary becomes the permanent respawn point
- Stash and Merchant become available
- The portal to The Verdant Threshold activates — future runs enter the Threshold from
  the Sanctuary
- The pre-Sanctuary starting area is no longer accessible (it becomes part of the
  generated Threshold on future runs)

### Post-Sanctuary Threshold Structure

Once the Sanctuary is unlocked, entering The Verdant Threshold follows the standard
region rhythm:

```
Sanctuary Portal → Threshold Entry
  │
  ├── Corrupted Forest (overworld)
  │     Twisted trees, corrupted wildlife, scattered ruins
  │     Enemies: Corrupted Wolves (Charger), Thornlings (Swarm), Blighted Archers (Archer)
  │
  ├── The Hollow Warren (Minor Dungeon 1)
  │     Collapsed watchtower overtaken by roots and corruption
  │     5-8 rooms, mix of combat and exploration
  │     Mini-boss: Rootbound Guardian (Guardian pattern, reach attacks)
  │     Reward: Return portal, loot chest
  │
  ├── Deeper Forest (overworld, escalating)
  │     Thicker corruption, tougher enemies, environmental hazards
  │     Enemies: Add Moss Stalkers (Flanker), Blight Spitters (Archer, poison?)
  │
  ├── The Sunken Shrine (Minor Dungeon 2)
  │     Half-submerged stone shrine, partially flooded rooms
  │     5-8 rooms, tighter spaces, more tactical combat
  │     Mini-boss: Shrine Defiler (Caster pattern, magical attacks)
  │     Reward: Return portal, loot chest
  │
  ├── The Threshold's Edge (overworld, approach)
  │     Forest gives way to ancient stone. The corruption intensifies.
  │     Toughest overworld enemies, hints of what lies beyond
  │
  └── The Warden's Gate (Main Dungeon)
        Ancient gatehouse and surrounding grounds
        8-12 rooms across multiple floors
        Region Boss: The Threshold Warden (corrupted guardian of the old boundary)
        Reward: Return portal, region completion, unlocks next region at Sanctuary
```

### Enemy Roster — The Verdant Threshold

| Enemy             | Pattern   | Notes                                    |
|-------------------|-----------|------------------------------------------|
| Corrupted Wolf    | Charger   | Fast, low HP, appears in packs of 2-3    |
| Thornling         | Swarm     | Weak, slow, but numerous. 4-6 at a time  |
| Blighted Archer   | Archer    | Ranged, keeps distance, low HP           |
| Moss Stalker      | Flanker   | Tries to get behind the player           |
| Blight Spitter    | Archer    | Ranged, poison effect? (future)          |
| Rootbound Guardian| Guardian  | Mini-boss. High HP, reach attack, holds position |
| Shrine Defiler    | Caster    | Mini-boss. Uses magical secondary actions |
| Threshold Warden  | TBD       | Region boss. Complex multi-phase fight?  |

### Loot Profile — The Verdant Threshold

| Source             | Expected Rarity                           |
|--------------------|-------------------------------------------|
| Overworld enemies  | Common, occasional Uncommon               |
| Dungeon enemies    | Common-Uncommon                           |
| Dungeon chests     | Uncommon, rare Rare                       |
| Mini-boss          | Guaranteed Uncommon+, chance at Rare      |
| Region boss        | Guaranteed Rare+, chance at Epic          |

## Open Questions

- How does the overworld generate? Connected rooms/clearings? Open grid with features placed?
- Should regions have environmental hazards (poison ground, collapsing floors)?
- Weather/time of day — aesthetic only or mechanical impact?
- How does the corruption visually intensify as the player goes deeper into a region?
- Region boss design — single phase or multi-phase fights?
- How are minor dungeons gated? Always accessible, or require finding an entrance?
- Should the overworld have non-combat points of interest (lore, environmental puzzles)?
