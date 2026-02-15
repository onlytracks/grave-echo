{
  "id": "c82dce5c",
  "title": "Phase 0b.3: Combat System (Bump-to-Attack)",
  "tags": [
    "phase-0b",
    "combat",
    "systems"
  ],
  "status": "done",
  "created_at": "2026-02-14T23:00:39.752Z"
}

## Goal
Implement bump-to-attack combat. When any entity tries to move into a tile occupied by
a hostile entity, it attacks instead. Universal — same system for player and enemies.

## Read First
- `AGENTS.md` — universal entity system
- `docs/combat.md` — damage model, attack as primary action, critical hits
- `docs/items.md` — damage formula (for now: use Stats.strength as power, no weapons yet)

## Dependencies
- Requires: Phase 0b.2 (AI + enemy entity)

## Requirements

### `src/ecs/components.ts` — Add Faction Component
```typescript
Faction: { factionId: 'player' | 'enemy' | 'neutral' }
```
Add to player (`player` faction) and goblin (`enemy` faction). Entities attack entities
of a different hostile faction. For now: player and enemy are mutually hostile, neutral
is hostile to nobody.

### `src/ecs/systems/combat.ts` — Combat System
**Universal** — works for any entity attacking any other entity.

Called when an entity attempts to move into a tile occupied by a hostile entity:
1. MovementSystem detects a Collidable entity at the target tile
2. Check factions — if hostile, trigger combat instead of blocking
3. Calculate damage: `max(1, attacker.stats.strength - defender.stats.defense + random(-1, +1))`
4. Apply damage to defender's Health.current
5. 5% chance of critical hit: damage × 2
6. Generate a message describing the attack: "You strike the goblin for 4 damage" /
   "The goblin bites you for 2 damage"
7. This counts as the attacker's **primary action** — sets TurnActor.hasActed = true

### `src/ecs/systems/health.ts` — Health System
Runs after combat resolves:
- Check all entities with Health component
- If Health.current <= 0, the entity dies:
  - Remove from the ECS world (destroy entity)
  - Generate a death message: "The goblin dies!" / "You have died!"
  - If the player dies: transition game state to a death screen (simple text for now,
    e.g., "You died. Press any key to quit.")

### Update MovementSystem
The movement → combat handoff:
```
Entity tries to move to (x, y)
  → Is there a Collidable entity at (x, y)?
    → Yes: Is it hostile (check Faction)?
      → Yes: CombatSystem.attack(attacker, defender) — primary action
      → No: Block movement (friendly entity in the way)
    → No: Move normally
```

This keeps MovementSystem entity-agnostic. It doesn't know if the attacker is the player
or an enemy. It just checks components.

### Message Display
For Phase 0b, display combat messages in the status line area below the grid. A simple
last-3-messages list is enough. Full MessageLog panel comes later.

### AI Update
The Charger AI should now attack when adjacent:
- If adjacent to target and target is hostile → move into target tile (triggers combat)
- This requires no special attack code in the AI — the AI just tries to move into the
  target's tile, and MovementSystem + CombatSystem handle the rest

## Tests (`src/ecs/systems/__tests__/combat.test.ts`)
- Attack deals strength - defense ± 1 damage (minimum 1)
- Critical hit deals double damage
- Damage reduces defender Health.current
- Entity with Health.current <= 0 is destroyed
- Faction check: same faction entities don't attack each other
- Attack sets TurnActor.hasActed = true (ends turn)
- Non-hostile Collidable entities block movement without combat

## Definition of Done
- Player bumps into goblin → combat message, goblin takes damage
- Goblin bumps into player → combat message, player takes damage
- Goblin dies when HP reaches 0, removed from grid
- Player death shows death screen
- Combat uses the same system for both player and goblin attacks
- `bun test` passes all combat tests
- CombatSystem has ZERO entity-type-specific code
