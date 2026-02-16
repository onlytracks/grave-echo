import type { GameMap, Tile } from "./game-map.ts";
import {
  TileType,
  FLOOR_TILE,
  WALL_TILE,
  RUBBLE_TILE,
  GRASS_TILE,
  TALL_GRASS_TILE,
  TREE_TILE,
  PINE_TREE_TILE,
  CORRUPTED_TREE_TILE,
  MUSHROOM_TILE,
  FLOWER_TILE,
  CORRUPTED_BLOOM_TILE,
  LEAF_TILE,
  SPROUT_TILE,
  CRACKED_FLOOR_TILE,
  COBWEB_TILE,
  PILLAR_TILE,
  CORRUPTION_VEIN_TILE,
  BONE_PILE_TILE,
  SKULL_TILE,
  GRAVE_MARKER_TILE,
  COFFIN_TILE,
} from "./game-map.ts";

export function assignWallCharacters(map: GameMap): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y)!;
      if (tile.type !== TileType.Wall) continue;
      tile.char = "▓";
    }
  }
}

function weightedPick<T>(
  choices: { weight: number; value: T }[],
  rng: () => number,
): T {
  const total = choices.reduce((sum, c) => sum + c.weight, 0);
  let roll = rng() * total;
  for (const c of choices) {
    roll -= c.weight;
    if (roll <= 0) return c.value;
  }
  return choices[choices.length - 1]!.value;
}

function clone(tile: Tile): Tile {
  return { ...tile };
}

// --- Forest (Verdant Threshold) ---

export function makeForestFloor(rng: () => number): Tile {
  return clone(
    weightedPick(
      [
        { weight: 60, value: GRASS_TILE },
        { weight: 15, value: LEAF_TILE },
        { weight: 10, value: FLOWER_TILE },
        { weight: 10, value: MUSHROOM_TILE },
        { weight: 5, value: SPROUT_TILE },
      ],
      rng,
    ),
  );
}

export function makeForestWall(
  rng: () => number,
  corruptionIntensity: number = 0,
): Tile {
  const corruptWeight = Math.floor(
    20 * Math.max(0, Math.min(1, corruptionIntensity)),
  );
  const healthyTree = Math.max(0, 50 - corruptWeight);
  const pine = Math.max(0, 30 - Math.floor(corruptWeight / 2));
  return clone(
    weightedPick(
      [
        { weight: healthyTree, value: TREE_TILE },
        { weight: pine, value: PINE_TREE_TILE },
        { weight: corruptWeight, value: CORRUPTED_TREE_TILE },
      ],
      rng,
    ),
  );
}

export function makeCorruptedForestFloor(rng: () => number): Tile {
  return clone(
    weightedPick(
      [
        { weight: 40, value: GRASS_TILE },
        { weight: 15, value: LEAF_TILE },
        { weight: 10, value: CORRUPTED_BLOOM_TILE },
        { weight: 15, value: MUSHROOM_TILE },
        { weight: 10, value: TALL_GRASS_TILE },
        { weight: 10, value: SPROUT_TILE },
      ],
      rng,
    ),
  );
}

// --- Dungeon (Hollow Warren) ---

export function makeDungeonFloor(rng: () => number): Tile {
  const stoneFloor = clone(FLOOR_TILE);
  stoneFloor.fg = "gray";
  return weightedPick(
    [
      { weight: 70, value: stoneFloor },
      { weight: 15, value: clone(CRACKED_FLOOR_TILE) },
      { weight: 10, value: clone(RUBBLE_TILE) },
      { weight: 5, value: clone(COBWEB_TILE) },
    ],
    rng,
  );
}

export function makeDungeonWall(rng: () => number): Tile {
  return clone(
    weightedPick(
      [
        { weight: 90, value: WALL_TILE },
        { weight: 10, value: PILLAR_TILE },
      ],
      rng,
    ),
  );
}

// --- Boss / Corruption Core ---

export function makeBossFloor(rng: () => number): Tile {
  const corruptedFloor = clone(FLOOR_TILE);
  corruptedFloor.fg = "darkRed";
  return weightedPick(
    [
      { weight: 60, value: corruptedFloor },
      { weight: 20, value: clone(CORRUPTION_VEIN_TILE) },
      { weight: 10, value: clone(BONE_PILE_TILE) },
      { weight: 10, value: clone(SKULL_TILE) },
    ],
    rng,
  );
}

export function makeBossWall(rng: () => number): Tile {
  const darkWall = clone(WALL_TILE);
  darkWall.fg = "darkRed";
  return weightedPick(
    [
      { weight: 70, value: darkWall },
      { weight: 15, value: clone(GRAVE_MARKER_TILE) },
      { weight: 15, value: clone(COFFIN_TILE) },
    ],
    rng,
  );
}
