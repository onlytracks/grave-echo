# Grave Echo — Items & Loot

## Overview

Items are the primary power system in Grave Echo. Weapons define combat style, magical
accessories provide abilities, and consumables offer tactical options. All items follow the
same rules regardless of which entity holds them — the player, an enemy, or an NPC.

## Equipment

### Equipment Slots

Every entity has the following equipment slots:

| Slot        | Purpose                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Weapon      | Single slot. Defines attack type, range, and damage. Weapon items encompass the full loadout (e.g., "Sword & Shield" is one item with defensive bonuses). |
| Armor       | Body protection. Defines defense value and may affect speed.                                                                                              |
| Accessory 1 | Ring, amulet, or other magical item. Provides passive bonuses or activatable effects (secondary action).                                                  |
| Accessory 2 | Second accessory slot.                                                                                                                                    |

Swapping a weapon or accessory is a **secondary action** in combat. The old item goes to
inventory, the new item is equipped from inventory.

### Weapon Defines Loadout

A weapon item represents the full combat loadout for that style:

| Weapon Item    | What It Represents      | Range | Notes                                        |
| -------------- | ----------------------- | ----- | -------------------------------------------- |
| Greatsword     | Two-handed sword        | 1     | High damage, no defense bonus                |
| Sword & Shield | One-hand sword + shield | 1     | Moderate damage, +defense                    |
| Axe            | Two-handed axe          | 1     | Highest melee damage, slow                   |
| Mace & Shield  | One-hand mace + shield  | 1     | Moderate damage, +defense, bonus vs armored? |
| Spear          | Two-handed spear        | 2     | Reach, moderate damage                       |
| Halberd        | Two-handed polearm      | 2     | Reach, high damage                           |
| Bow            | Bow                     | 6     | Ranged, moderate damage                      |
| Crossbow       | Crossbow                | 8     | Ranged, high damage                          |
| Staff          | Magical staff           | 4     | Ranged magical attack                        |
| Wand           | Magical wand            | 3     | Short ranged, magical effects                |

This means "swap weapon" as a secondary action can shift an entity's entire combat role
in one action — from ranged kiting to melee brawling.

## Rarity Tiers

| Tier      | Color  | Base Stats | Magical Bonuses             |
| --------- | ------ | ---------- | --------------------------- |
| Common    | White  | Base       | None                        |
| Uncommon  | Green  | +10%       | 1 minor bonus               |
| Rare      | Blue   | +25%       | 1-2 bonuses                 |
| Epic      | Purple | +50%       | 2-3 bonuses, stronger rolls |
| Legendary | Gold   | +100%      | 3+ bonuses, unique effects  |

- Rarity affects **base damage/defense** values directly
- Higher rarity items roll **more bonuses** and from a **better bonus pool**
- Legendary items may have unique named effects not found on other tiers

### Magical Bonuses

Bonuses are rolled when an item is generated. Examples:

| Bonus               | Effect                            |
| ------------------- | --------------------------------- |
| +% Damage           | Increases attack power            |
| +% Defense          | Increases armor value             |
| +% Speed            | Increases movement tiles per turn |
| +% Health           | Increases max HP                  |
| + Critical Chance   | Increases crit %                  |
| + Critical Damage   | Increases crit multiplier         |
| + Life on Hit       | Heal HP on successful attack      |
| + Corruption Resist | Reduce corruption damage (future) |

Exact values scale by rarity tier. An Uncommon might roll +5% Damage; an Epic might roll
+20% Damage.

## Consumables

### Potions

- Healing potions, resistance potions, buff potions
- Have a set number of **charges**
- Charges are replenished by **purchasing/crafting** — potions are mundane, not magical
- Using a potion is a **primary action** (ends turn)

### Scrolls

- Single-use magical effects (damage, teleport, reveal map, etc.)
- Have a set number of **charges**
- Charges are replenished by **magical recharging** at the Hub or through items
- Using a scroll is a **primary action** (ends turn)

### Charge System

All consumables use charges rather than stacking individual items:

- A "Healing Potion" item might have 3/3 charges
- Each use consumes 1 charge
- When charges hit 0, the item is depleted (kept in inventory at 0 charges, can be recharged)
- Recharging methods:
  - Potions: buy refills from merchant, or craft (future)
  - Scrolls: recharge at Hub, or find recharge items in the world

This avoids inventory clutter from stacking dozens of individual potions.

## Inventory & Weight

### No Slot Limit — Weight System

Inventory has no fixed number of slots. Instead, every item has a **weight** value and
every entity has a **carry capacity**.

```
encumbrance = total_inventory_weight / carry_capacity
```

| Encumbrance | Effect                                           |
| ----------- | ------------------------------------------------ |
| 0-50%       | No penalty                                       |
| 50-75%      | -1 movement per turn                             |
| 75-100%     | -2 movement per turn                             |
| 100%+       | Cannot move. Can still perform actions in place. |

- **Carry capacity** is derived from a stat (Strength, or a dedicated stat like Endurance)
- Carry capacity increases with stat upgrades — a permanent meta-progression benefit
- Equipped items contribute to weight (armor is heavy, rings are light)
- This creates a constant field decision: pick up that heavy axe or stay nimble?

### Weight Ranges (Rough Guide)

| Item Type        | Weight |
| ---------------- | ------ |
| Ring / Amulet    | 1-2    |
| Wand             | 2-3    |
| Sword & Shield   | 5-7    |
| Bow              | 4-5    |
| Greatsword / Axe | 7-9    |
| Halberd          | 8-10   |
| Light Armor      | 5-8    |
| Heavy Armor      | 12-18  |
| Potion           | 1      |
| Scroll           | 0.5    |

Exact values TBD during balancing.

## Loot Generation

### Drop Sources

| Source                | Loot Quality                                 |
| --------------------- | -------------------------------------------- |
| Overworld enemies     | Mostly Common, occasional Uncommon           |
| Minor dungeon enemies | Common-Uncommon, rare Rare                   |
| Mini-bosses           | Guaranteed Uncommon+, chance at Rare         |
| Act boss              | Guaranteed Rare+, chance at Epic             |
| Final boss            | Guaranteed Epic+, chance at Legendary        |
| Chests/hidden areas   | Varies by location, always at least Uncommon |
| Skeletons (own)       | Degraded versions of previously carried gear |

### Skeleton Loot Degradation

When the player dies, their carried gear is placed on a skeleton in the world. Up to 10
skeletons persist. Gear degrades based on skeleton age:

| Skeleton Age    | Degradation                                       |
| --------------- | ------------------------------------------------- |
| Most recent (1) | -1 rarity tier, all items present                 |
| 2-4 runs ago    | -1 rarity tier, 50-75% of items remain            |
| 5-7 runs ago    | -2 rarity tiers, 25-50% of items remain           |
| 8-10 runs ago   | -2 rarity tiers, 1-2 items remain, badly degraded |

- Rarity cannot degrade below Common
- Degraded items may lose some magical bonuses
- This means your most recent death is worth pursuing, but old skeletons are scraps

## Hub Economy

### Stash

- Unlimited storage at the Hub (TBD — may add weight/space limit later)
- Items in the stash survive death
- Core strategic element: what do you risk bringing on a run vs. keeping safe?

### Merchant

- **Buys** gear from the player at a fraction of item value
- Sell price scales with rarity: Common is nearly worthless, Legendary is a windfall
- Currency earned from selling is used for **permanent stat upgrades**
- Merchant does not sell gear (future extension)

### Stat Upgrades (Purchased from Merchant)

| Upgrade  | Effect                         | Cost Scaling         |
| -------- | ------------------------------ | -------------------- |
| Health   | +Max HP                        | Increasing per level |
| Strength | +Attack power, +Carry capacity | Increasing per level |
| Defense  | +Base defense                  | Increasing per level |
| Speed    | +Movement tiles per turn       | Increasing per level |
| Vitality | +Potion effectiveness?         | Increasing per level |

Costs increase with each purchase. Early upgrades are cheap and impactful. Later upgrades
are expensive and marginal. This curve prevents the player from trivializing content through
pure stat investment.

## Item Examples (Flavor)

To illustrate the system in practice:

**Common Sword & Shield** (White)

- Damage: 4, Defense: +2, Range: 1, Weight: 6
- No bonuses

**Uncommon Emberthorn Bow** (Green)

- Damage: 5 (+10%), Range: 6, Weight: 4
- +8% Critical Chance

**Rare Voidsteel Greatsword** (Blue)

- Damage: 10 (+25%), Range: 1, Weight: 8
- +12% Damage, +5% Life on Hit

**Epic Stormcaller Staff** (Purple)

- Damage: 12 (+50%), Range: 4, Weight: 3
- +15% Damage, +10% Speed, +8% Critical Damage

**Legendary Echobound Ring** (Gold)

- Weight: 1
- +20% Health, +15% Defense, Active: pulse that damages all adjacent entities (secondary action, 5 turn cooldown)

## Open Questions

- Should weapons have durability that degrades with use? Or is that too much bookkeeping?
- Crafting system — combine materials found in the world? Future extension or never?
- Set bonuses — matching items from the same "set" grant extra bonuses? Adds depth but
  complexity.
- How does the merchant determine buy price? Flat rate by rarity, or factor in bonuses?
- Should consumables be usable by all entities? (Enemies drinking potions mid-fight)
- Cooldowns on activated accessories — turn-based (every N turns) or charge-based?
- Can items be upgraded/enchanted at the Hub? Future extension?
