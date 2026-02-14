# Grave Echo — Combat System

## Overview

Turn-based grid combat viewed top-down, rendered in ANSI art. All entities in the game world —
player, enemies, NPCs, allies, summons — follow the **same universal action economy**. There
is no special-case logic for the player. The player is simply an entity controlled by keyboard
input rather than AI. Depth comes from positioning, weapon choice, and item usage — not
reflexes.

## Entity Action Economy

Every entity in the game world gets one turn per round. Each turn consists of:

- **Secondary action** (optional, once) — swap equipped weapon/item, trigger a magical
  item effect
- **Movement** (optional) — move up to speed stat in tiles, step-by-step
- **Primary action** (optional, once) — attack, use consumable item, or hold/defend

Rules:

- Secondary action and movement can be performed in **any order** and **interleaved**
  (e.g., move 2 tiles, swap weapon, move 1 more tile)
- Executing the **primary action ends the entity's turn immediately**
- An entity may **pass** to end turn without using a primary action
- **Targeting is free** — does not cost any action

These rules apply universally. An NPC merchant could equip a sword and fight. An enemy
could drink a potion. A future allied summon follows the same turn structure. The system
makes no distinction — only the input source differs (keyboard, AI behavior tree, scripted
sequence).

### Turn Order

```
Player: [secondary?] + [movement?] (any order) → [primary action] → turn ends
  ↓
Entity 1: [secondary?] + [movement?] → [primary action]
Entity 2: [secondary?] + [movement?] → [primary action]
...
  ↓
Player turn begins
```

Player always acts first. All other entities act in sequence after the player's turn ends.
Future extension: speed-based initiative ordering.

## Movement

- **Grid-based**, 4-directional (up/down/left/right) using arrow keys
- Each arrow key press moves 1 tile and costs 1 movement point
- **Speed stat** determines tiles per turn (e.g., speed 3 = up to 3 tiles of movement)
- Movement is step-by-step — the player controls the exact path
- Terrain may affect movement cost (rubble = 2 points per tile, etc.)
- Heavy armor may reduce effective speed

## Primary Actions (All Entities)

### Attack

- **Melee:** Target an adjacent entity (bump-to-attack). 1 tile range.
- **Reach:** Target an entity up to 2 tiles away in a cardinal direction (spears, halberds).
- **Ranged:** Target any visible entity within weapon range (bows, crossbows, thrown weapons).
  Requires line-of-sight.

### Use Item

- Consume a usable item from inventory (potion, scroll, food, etc.)
- Effect is immediate
- Any entity with an inventory can use items — enemies drink potions, NPCs use scrolls

### Hold / Defend

- End turn deliberately without attacking
- Could grant a minor defensive bonus until next turn (TBD)

## Secondary Actions (All Entities)

### Swap Equipment

- Change equipped weapon or active magical item
- Any entity with equipment slots can swap gear mid-combat

### Trigger Magical Item

- Activate an equipped magical item's effect (ring pulse, amulet shield, etc.)
- These are the primary "ability" system until player spells are implemented
- Effects use the grid: area-of-effect around the entity, line in a direction,
  single target, etc.
- Enemies and NPCs can trigger their own magical items using the same system

## Targeting System

- **Free action** — does not cost primary or secondary for any entity
- Built as **entity-targets-entity** — any entity can target any other entity
- Player uses Tab to cycle through visible entities; AI selects targets via behavior trees
- Selected target is highlighted on the grid (distinct color or border)
- A **detail panel** displays for the player's selected target:
  - Name and type
  - Health (approximate or exact based on player knowledge)
  - Equipped weapon / attack type
  - Attack range
  - Movement speed
- This architecture supports player-vs-enemy, enemy-vs-NPC, NPC-vs-enemy, enemy-vs-enemy,
  and future multiplayer without rearchitecting

## Damage Model (Simple, Extensible)

### Base Formula

```
damage = attacker_power - defender_defense + random(-1, +1)
minimum damage = 1 (attacks always do at least 1)
```

- **Power** = base strength + weapon damage
- **Defense** = base defense + armor value
- Numbers should be small and human-readable: a sword does 3-5 damage, a starting
  enemy has 8-12 HP

### Critical Hits

- Base critical chance: 5%
- Critical multiplier: 2x damage
- Some weapons/items may increase crit chance or multiplier

### Future Extensions (Not Phase 1)

- Damage types (physical, fire, ice, corruption)
- Resistances and vulnerabilities
- Status effects (poison, slow, blind, burning)
- Armor penetration

## Weapon Categories

| Category | Range  | Tiles | Notes                             |
| -------- | ------ | ----- | --------------------------------- |
| Sword    | Melee  | 1     | Balanced damage                   |
| Axe      | Melee  | 1     | High damage, slower?              |
| Mace     | Melee  | 1     | Bonus vs armored?                 |
| Spear    | Reach  | 2     | Can attack without being adjacent |
| Halberd  | Reach  | 2     | Higher damage reach weapon        |
| Bow      | Ranged | 6?    | Requires line-of-sight, ammo TBD  |
| Crossbow | Ranged | 8?    | Higher damage, lower fire rate?   |
| Staff    | Ranged | 4?    | Magical ranged attack, no ammo    |
| Wand     | Ranged | 3?    | Shorter range, magical effects    |

Exact stats TBD — these establish the categories and tactical roles.

### Weapon Slot

- **Single weapon slot** — defines the entity's full combat loadout
- A "Sword & Shield" is one item; a "Greatsword" is one item
- Swapping weapons is a **secondary action** — old weapon goes to inventory, new one
  equips from inventory
- This allows mid-combat role shifts (melee → ranged) at the cost of a secondary action

## AI Behavior Patterns

All non-player entities use behavior trees to decide how to spend their turn. Since every
entity follows the same action economy, behavior trees simply choose: what to target, whether
to use a secondary action, where to move, and what primary action to take.

| Pattern  | Description                                            |
| -------- | ------------------------------------------------------ |
| Charger  | Moves directly toward target, melee attacks            |
| Flanker  | Tries to approach from the side or behind              |
| Archer   | Keeps distance, uses ranged attacks, retreats if close |
| Guardian | Holds position, attacks when target is in range        |
| Swarm    | Weak individually, moves in groups, surrounds          |
| Caster   | Triggers magical effects (secondary), then attacks     |
| Passive  | Non-hostile. Flees when attacked. (Merchants, NPCs)    |
| Ally     | Follows player, targets player's enemies. (Future)     |

These patterns work for any entity type. An NPC guard uses the Guardian pattern. A corrupted
merchant might switch from Passive to Charger. A summoned creature uses Ally. The behavior
tree is a property of the entity, not its type.

### Telegraphing

- Entities preparing a powerful attack show a visual indicator for 1 turn before
  executing (color change, symbol change, or status text)
- This gives other entities 1 turn to reposition — the grid-based equivalent of dodging

### Scaling by Act

| Act | Enemy Complexity                                            |
| --- | ----------------------------------------------------------- |
| I   | Chargers, Guardians, basic Swarms. Simple, predictable.     |
| II  | Add Flankers, Archers. Enemies use positioning.             |
| III | Add Casters, complex Swarms. Enemies use secondary actions. |

## Grid Tactics

The grid itself is the tactical layer. Terrain and positioning replace dodge-rolling.

- **Chokepoints:** Doorways and corridors limit how many enemies can reach you
- **Line-of-sight:** Pillars and walls block ranged attacks — for both sides
- **Elevation?** TBD — could high ground grant range/damage bonus
- **Destructible terrain?** TBD — future extension
- **Light/dark?** TBD — limited visibility in unlit areas could affect targeting range

## Open Questions

- Ammo for ranged weapons — limited or unlimited? Limited adds resource management,
  unlimited simplifies
- Should "hold/defend" grant a mechanical bonus (e.g., +2 defense until next turn)?
- Do entities drop their equipped gear on death, or is loot separate from what they
  were using? (If yes, the player can see what an enemy is carrying and decide if it's
  worth fighting for — strong incentive to engage tough enemies with good gear)
- How does speed interact with heavy armor? Flat reduction or percentage?
- Should there be a "flee" mechanic — disengage from adjacent enemies with a penalty?
- Multi-tile entities (bosses) — how do they work on the grid?
- Entity faction system — how do entities know who to target? Player faction, corruption
  faction, neutral faction? Faction hostility matrix?
- Turn order among non-player entities — fixed order, speed-based, or random?
