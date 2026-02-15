{
  "id": "5eb8a4ef",
  "title": "Hold/Defend — defensive stance with melee attack of opportunity",
  "tags": [
    "gameplay",
    "combat",
    "tactics"
  ],
  "status": "done",
  "created_at": "2026-02-15T22:15:56.997Z"
}

## Goal
When an entity presses `.` (pass/hold), instead of just ending the turn with no
benefit, the entity enters a defensive stance until their next turn. This grants:

1. **+2 defense bonus** until the entity's next turn starts
2. **Attack of opportunity** — if any hostile entity makes a **melee** attack against
   the defending entity, the defender automatically counterattacks BEFORE the incoming
   attack resolves. Ranged and reach attacks do NOT trigger this.

This applies universally — AI entities can also hold/defend.

## Mechanics

### Defensive Stance
- Activated by ending turn without using a primary action (`.` key for player)
- Grants a temporary defense buff (+2) that lasts until the entity's next turn
- The buff is removed at the start of the entity's next turn (in `startPlayerTurn` /
  `resetAITurns`)

### Attack of Opportunity
- When a hostile entity attacks a defending entity with a **melee attack** (range 1,
  bump-to-attack), the defender strikes first
- The opportunity attack uses the defender's equipped weapon at normal damage
- The opportunity attack happens BEFORE the incoming attack resolves
- Only triggers on melee (bump) attacks. Reach (range 2) and ranged attacks do NOT
  trigger — the attacker is too far away to be countered
- Only triggers once per incoming attack (not once per turn — multiple attackers each
  trigger their own opportunity attack)
- If the opportunity attack kills the attacker, the original attack does not happen

### What Does NOT Trigger
- Ranged attacks (bow, crossbow, staff, wand) — no counter
- Reach attacks (spear, halberd at range 2) — no counter
- Non-attack interactions — no counter

## Implementation

### 1. New Component: `Defending`
Add a tag component to track defensive stance:

```typescript
// In components.ts
export interface Defending {}

// In ComponentMap
Defending: Defending;
```

Simple tag — presence means the entity is in defensive stance.

### 2. Defense Buff via `getEffectiveStats`
In `src/ecs/systems/stats.ts`, modify `getEffectiveStats()` to check for `Defending`:

```typescript
if (world.hasComponent(entity, "Defending")) {
  def += 2;
}
```

No ActiveBuff needed — the component IS the buff. Cleaner than a timed buff since
removal is tied to turn start, not buff tick.

### 3. Hold Action Sets Defending
In `src/game.ts`, when `event.type === "pass"`:

```typescript
if (event.type === "pass") {
  const player = this.getPlayerEntity();
  if (player) {
    const turnActor = world.getComponent(player, "TurnActor");
    // Only grant defend if player hasn't used primary action
    if (turnActor && !turnActor.hasActed) {
      world.addComponent(player, "Defending", {});
      this.messages.add("You brace for attack. (+2 defense, counterattack ready)");
    }
  }
  endPlayerTurn(this.world, this.messages);
}
```

### 4. Remove Defending at Turn Start
In `src/ecs/systems/turn.ts`:

`startPlayerTurn()`:
```typescript
world.removeComponent(player, "Defending");
```

`resetAITurns()`:
```typescript
world.removeComponent(entity, "Defending");
```

### 5. Attack of Opportunity in Combat
In `src/ecs/systems/combat.ts`, modify `attack()` to check if the defender is
defending and the attack is melee (adjacent):

```typescript
export function attack(
  world: World,
  attacker: Entity,
  defender: Entity,
  messages: MessageLog,
  rng: () => number = Math.random,
): void {
  // Check for attack of opportunity BEFORE the main attack
  if (world.hasComponent(defender, "Defending")) {
    const attackerPos = world.getComponent(attacker, "Position");
    const defenderPos = world.getComponent(defender, "Position");
    if (attackerPos && defenderPos) {
      const dist = Math.abs(attackerPos.x - defenderPos.x) +
                   Math.abs(attackerPos.y - defenderPos.y);
      // Only melee range (adjacent, dist=1) triggers opportunity attack
      if (dist <= 1) {
        // Remove defending so the counter doesn't trigger recursively
        world.removeComponent(defender, "Defending");
        messages.add(
          `${getDisplayName(world, defender)} counterattacks!`,
        );
        // Perform the counter — call attack without triggering another opportunity
        performAttackDamage(world, defender, attacker, messages, rng);
        // If attacker died from the counter, skip the original attack
        const attackerHealth = world.getComponent(attacker, "Health");
        if (attackerHealth && attackerHealth.current <= 0) return;
      }
    }
  }

  // ... existing attack logic
}
```

To avoid recursion, extract the damage calculation into a helper `performAttackDamage()`
that `attack()` calls. The opportunity attack calls `performAttackDamage()` directly
(no opportunity check). `attack()` wraps it with the opportunity check + turn actor
updates.

### 6. AI Defend (Future-Ready)
AI entities can also defend. A `guardian` pattern could choose to defend when no target
is in attack range but enemies are nearby. Not implementing AI defend behavior now,
but the system supports it — any entity with `Defending` component gets the bonuses.

### 7. Movement System — Bump Attacks Trigger Opportunity
The bump-to-attack path in `tryMove()` calls `attack()`. Since `attack()` now checks
for `Defending`, melee bump attacks automatically trigger opportunity attacks. No
changes needed in `movement.ts`.

### 8. Ranged Attacks — No Trigger
`attemptRangedAttack()` in `targeting.ts` also calls `attack()`. But ranged attacks
are at distance > 1, so the dist check in the opportunity logic won't trigger. Reach
attacks at exactly range 2 also won't trigger (dist > 1).

Edge case: if a ranged entity is adjacent and uses a ranged attack, dist = 1 — this
SHOULD trigger the opportunity attack. The defender can reach them. This is correct
and tactically interesting (don't use a bow point-blank against a defending enemy).

### 9. Visual Feedback
- Message log: "You brace for attack. (+2 defense, counterattack ready)"
- Message log on trigger: "You counterattack!" / "The ▓ counterattacks!"
- PlayerStats panel: show a defend indicator when `Defending` component is present
  (e.g., `[DEFEND]` next to status, or a shield icon)

## Files to Change
- `src/ecs/components.ts` — add `Defending` interface + ComponentMap entry
- `src/ecs/systems/stats.ts` — add +2 defense in `getEffectiveStats()` for Defending
- `src/ecs/systems/combat.ts` — extract `performAttackDamage()`, add opportunity attack
  check in `attack()`
- `src/ecs/systems/turn.ts` — remove `Defending` in `startPlayerTurn()` and `resetAITurns()`
- `src/game.ts` — add `Defending` component on pass, add gameplay message
- `src/renderer/panels/player-stats.ts` — show defend indicator (optional, nice-to-have)

## Edge Cases
- Entity defends, nobody attacks → defend buff expires at next turn start, no counter
- Multiple enemies attack a defending entity → each melee attack triggers a separate
  counter (defending is removed after first counter, so only the first triggers)
- Wait — that's a design choice. Options:
  - **Option A**: Remove `Defending` after first counter (one opportunity attack per stance)
  - **Option B**: Keep `Defending` until turn start (counter every melee attack)
  - **Recommend Option A** — otherwise defend is overpowered when surrounded. One counter
    per stance creates a tactical choice about which enemy to bait.
- Defender kills attacker with counter → original attack doesn't happen, attacker death
  processed normally
- Defending entity with no weapon → counter uses unarmed (strength-based) damage
- AI entity defends → same rules, same counter logic

## Tests
- Unit: `getEffectiveStats` returns +2 defense when `Defending` is present
- Unit: melee attack against defending entity triggers counter before main attack
- Unit: ranged attack against defending entity does NOT trigger counter
- Unit: reach attack (dist=2) against defending entity does NOT trigger counter
- Unit: counter that kills attacker prevents the original attack
- Unit: `Defending` removed at turn start
- Unit: `Defending` only added when primary action hasn't been used
- Manual: `.` shows defend message, incoming melee triggers counter
- `bun test` passes

## Definition of Done
- `.` grants defensive stance (+2 defense, counterattack ready)
- Melee attacks against defending entity trigger opportunity attack first
- Ranged and reach attacks (dist > 1) do not trigger counter
- Counter resolves before incoming attack; if counter kills, original attack skipped
- `Defending` removed at start of entity's next turn
- Only one counter per defensive stance (Option A)
- Works for any entity, not player-specific
- `bun test` passes
