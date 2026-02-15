# Grave Echo — Sensory System

## Overview

Entities perceive the world through **senses** — vision, and in the future, hearing and
smell. Senses drive two things: **AI awareness** (enemies only act when they detect a
target) and **fog of war** (the player only sees what their vision reveals). The system
is universal — player and enemies use the same vision algorithm.

## Senses

### Vision

Line-of-sight perception. Blocked by walls and opaque tiles (uses `Tile.transparent`).

- Each entity with vision has a `range` — how far they can see in tiles
- Visibility is calculated using **raycasting** from the entity's position to each tile
  within range
- A tile is visible if a ray from the entity to that tile is not blocked by any
  non-transparent tile
- Vision is recalculated whenever the entity moves

**Player default:** vision range 8
**Enemy default:** vision range 6 (varies by enemy type)

### Hearing (Future)

Sound-based perception. Passes through walls within range.

- Triggered by **events** — combat, doors opening, movement on noisy terrain
- Each event has a **loudness** value; entities hear events within `min(loudness, hearingRange)` tiles
- Hearing doesn't reveal exact position — it reveals the general direction or room
- For the player: generates messages like "You hear something moving nearby"
- For AI: triggers awareness transition toward the sound source

### Smell (Future)

Scent-based perception. Flood-fills through walkable tiles, ignores walls.

- Entities leave a **scent trail** that decays over turns
- Smell range determines how many tiles the scent flood-fill can reach
- Useful for tracker enemies that follow where the player has been
- For the player: could reveal nearby enemies through scent ("You smell something foul")

## Awareness

Every entity with `AIControlled` has an **awareness state** that determines whether and
how it acts on its turn.

### States

| State   | Behavior                                                          |
| ------- | ----------------------------------------------------------------- |
| `idle`  | Entity does nothing. Stands in place. Waiting for sensory input.  |
| `alert` | Entity has detected a target. Actively pursues and attacks.       |

### Transitions

```
idle → alert:   Entity detects a hostile target via any sense (vision for now)
alert → idle:   Target has been out of sensory range for alertDuration turns
```

### State Details

**Idle:**
- Entity does not move or attack
- Entity still checks senses each turn (passive perception)
- Renderable appearance could differ (future: dimmer color when idle)

**Alert:**
- Entity actively pursues its target using its AI behavior pattern
- `lastKnownTarget` tracks where the target was last sensed
- If the target leaves sensory range, a countdown (`alertDuration`) begins
- While counting down, the entity moves toward `lastKnownTarget`
- When the countdown expires, the entity returns to `idle`
- If the target is re-detected before the countdown expires, the countdown resets

**Default alertDuration:** 5 turns (varies by enemy type)

### Future States

Additional states can be added as mechanics require them:
- `searching` — moving to investigate a sound or last known position
- `fleeing` — retreating when health is low
- `patrolling` — following a predefined path when idle

These are not implemented now. The state field is a string union that can be extended.

## Fog of War (Player)

The player's vision determines what is rendered on screen. Every tile on the map is in
one of three states:

| State       | Rendering                                    | Entities Shown? |
| ----------- | -------------------------------------------- | --------------- |
| `hidden`    | Black / not rendered                         | No              |
| `explored`  | Dimmed (dark gray walls, dark gray floor)    | No              |
| `visible`   | Full color                                   | Yes             |

- **Hidden:** The player has never seen this tile. Rendered as empty black space.
- **Explored:** The player has previously seen this tile but it's not currently in view.
  The terrain is shown in muted colors. Entities in explored-but-not-visible tiles are
  NOT shown — the player doesn't know if enemies have moved.
- **Visible:** The tile is currently within the player's vision range and line-of-sight.
  Full color rendering. All entities on visible tiles are shown.

### Visibility Storage

The `GameMap` tracks a per-tile `explored` flag (persistent for the run). The set of
currently `visible` tiles is recalculated each time the player moves — it's a transient
set, not stored on the map.

### AI and Fog of War

Enemies do NOT use fog of war for their own perception. Their `Senses.vision` determines
whether they detect a target, but they don't track explored/hidden tiles. Fog of war is
a player rendering concern only.

## ECS Components

### Senses Component

```typescript
Senses: {
  vision: { range: number };
  // Future:
  // hearing?: { range: number };
  // smell?: { range: number };
}
```

Attached to any entity that can perceive the world — player and enemies alike.

### Awareness Component

```typescript
Awareness: {
  state: 'idle' | 'alert';
  lastKnownTarget?: { x: number; y: number };
  alertDuration: number;       // max turns to stay alert after losing target
  turnsWithoutTarget: number;  // counts up when target is not detected
}
```

Attached to entities with `AIControlled`. The player does not need this — the player's
awareness is the player's eyes on the screen (fog of war handles it).

## System Integration

### SensorySystem

Runs at the start of each entity's turn, before the AI system decides actions:

1. For each entity with `Senses` + `Position`:
   - Calculate visible tiles using raycasting from entity position
   - For AI entities with `Awareness`:
     - Check if any hostile entity is in the visible tile set
     - If yes: set `state = 'alert'`, update `lastKnownTarget`, reset `turnsWithoutTarget`
     - If no: increment `turnsWithoutTarget`. If it exceeds `alertDuration`, set `state = 'idle'`
   - For the player: update the fog of war (mark visible tiles, update explored set)

### AI System Update

The AI system checks `Awareness.state` before acting:
- `idle`: skip turn entirely (no movement, no actions)
- `alert`: execute behavior pattern as normal

### Render System Update

The render system uses the player's current visible tile set:
- Only render entities on tiles that are in the player's visible set
- Render explored-but-not-visible tiles in dimmed colors
- Don't render hidden tiles at all

## Line-of-Sight Algorithm

Use **Bresenham's line algorithm** to cast rays from the entity to target tiles:

1. For each tile within vision range, cast a ray from entity position to that tile
2. Walk the ray tile by tile
3. If any tile along the ray has `transparent: false`, the target tile is not visible
4. If the ray reaches the target without hitting an opaque tile, it's visible

Optimization: this can be expensive for large vision ranges. For Phase 1, a simple
implementation is fine. Symmetric shadowcasting is a future optimization if needed.

## Open Questions

- Should entities block line-of-sight? (Large enemies blocking view behind them)
- Should light level affect vision range? (Torches, dark rooms)
- Should the player be able to increase vision range via items/stats?
- Exact hearing mechanics — how does loudness decay? Per-tile or manhattan distance?
