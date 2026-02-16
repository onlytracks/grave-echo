export enum TileType {
  Floor,
  Wall,
  // Universal
  DoorOpen,
  DoorClosed,
  StairsDown,
  StairsUp,
  Rubble,
  Pit,
  // Nature (Verdant Threshold)
  Grass,
  TallGrass,
  Tree,
  PineTree,
  CorruptedTree,
  Mushroom,
  Flower,
  CorruptedBloom,
  Leaf,
  Sprout,
  ShallowWater,
  DeepWater,
  // Dungeon (Hollow Warren)
  CrackedFloor,
  Pillar,
  Barrel,
  Cobweb,
  Torch,
  TreasureChest,
  // Boss / Corruption Core
  CorruptionVein,
  BonePile,
  Skull,
  GraveMarker,
  Coffin,
  DarkFlame,
  Crystal,
  // Hub (Echoed Sanctuary)
  Campfire,
  Fountain,
  Tent,
  Flag,
  Portal,
}

export interface Tile {
  type: TileType;
  char: string;
  fg: string;
  bg: string;
  walkable: boolean;
  transparent: boolean;
  movementCost: number;
}

// --- Universal tiles ---

export const FLOOR_TILE: Tile = {
  type: TileType.Floor,
  char: "·",
  fg: "gray",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const WALL_TILE: Tile = {
  type: TileType.Wall,
  char: "▓",
  fg: "white",
  bg: "black",
  walkable: false,
  transparent: false,
  movementCost: 1,
};

export const DOOR_OPEN_TILE: Tile = {
  type: TileType.DoorOpen,
  char: "\u{F081C}",
  fg: "brown",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const DOOR_CLOSED_TILE: Tile = {
  type: TileType.DoorClosed,
  char: "\u{F081B}",
  fg: "brown",
  bg: "black",
  walkable: false,
  transparent: false,
  movementCost: 1,
};

export const STAIRS_DOWN_TILE: Tile = {
  type: TileType.StairsDown,
  char: "\u{F12BE}",
  fg: "brightYellow",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const STAIRS_UP_TILE: Tile = {
  type: TileType.StairsUp,
  char: "\u{F12BD}",
  fg: "brightYellow",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const RUBBLE_TILE: Tile = {
  type: TileType.Rubble,
  char: "•",
  fg: "darkGray",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const PIT_TILE: Tile = {
  type: TileType.Pit,
  char: "◇",
  fg: "darkGray",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

// --- Verdant Threshold (Nature) tiles ---

export const GRASS_TILE: Tile = {
  type: TileType.Grass,
  char: "\u{F1510}",
  fg: "green",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const TALL_GRASS_TILE: Tile = {
  type: TileType.TallGrass,
  char: "\u{F1510}",
  fg: "darkGreen",
  bg: "black",
  walkable: true,
  transparent: false,
  movementCost: 2,
};

export const TREE_TILE: Tile = {
  type: TileType.Tree,
  char: "\u{F0531}",
  fg: "green",
  bg: "black",
  walkable: false,
  transparent: false,
  movementCost: 1,
};

export const PINE_TREE_TILE: Tile = {
  type: TileType.PineTree,
  char: "\u{F0405}",
  fg: "green",
  bg: "black",
  walkable: false,
  transparent: false,
  movementCost: 1,
};

export const CORRUPTED_TREE_TILE: Tile = {
  type: TileType.CorruptedTree,
  char: "\u{F0531}",
  fg: "darkMagenta",
  bg: "black",
  walkable: false,
  transparent: false,
  movementCost: 1,
};

export const MUSHROOM_TILE: Tile = {
  type: TileType.Mushroom,
  char: "\u{F07DF}",
  fg: "brightGreen",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const FLOWER_TILE: Tile = {
  type: TileType.Flower,
  char: "\u{F024A}",
  fg: "yellow",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const CORRUPTED_BLOOM_TILE: Tile = {
  type: TileType.CorruptedBloom,
  char: "\u{F024A}",
  fg: "magenta",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const LEAF_TILE: Tile = {
  type: TileType.Leaf,
  char: "\u{F032A}",
  fg: "darkGreen",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const SPROUT_TILE: Tile = {
  type: TileType.Sprout,
  char: "\u{F0E66}",
  fg: "green",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const SHALLOW_WATER_TILE: Tile = {
  type: TileType.ShallowWater,
  char: "\u{F058C}",
  fg: "blue",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 2,
};

export const DEEP_WATER_TILE: Tile = {
  type: TileType.DeepWater,
  char: "\u{F078D}",
  fg: "darkBlue",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

// --- Dungeon (Hollow Warren) tiles ---

export const CRACKED_FLOOR_TILE: Tile = {
  type: TileType.CrackedFloor,
  char: "◇",
  fg: "darkGray",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const PILLAR_TILE: Tile = {
  type: TileType.Pillar,
  char: "\u{F0702}",
  fg: "white",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

export const BARREL_TILE: Tile = {
  type: TileType.Barrel,
  char: "\u{F0074}",
  fg: "brown",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

export const COBWEB_TILE: Tile = {
  type: TileType.Cobweb,
  char: "\u{F0BCA}",
  fg: "white",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const TORCH_TILE: Tile = {
  type: TileType.Torch,
  char: "\u{F1606}",
  fg: "brightYellow",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const TREASURE_CHEST_TILE: Tile = {
  type: TileType.TreasureChest,
  char: "\u{F0726}",
  fg: "yellow",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

// --- Boss / Corruption Core tiles ---

export const CORRUPTION_VEIN_TILE: Tile = {
  type: TileType.CorruptionVein,
  char: "~",
  fg: "magenta",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const BONE_PILE_TILE: Tile = {
  type: TileType.BonePile,
  char: "\u{F00B9}",
  fg: "white",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const SKULL_TILE: Tile = {
  type: TileType.Skull,
  char: "\u{F068C}",
  fg: "white",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const GRAVE_MARKER_TILE: Tile = {
  type: TileType.GraveMarker,
  char: "\u{F0BA2}",
  fg: "gray",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

export const COFFIN_TILE: Tile = {
  type: TileType.Coffin,
  char: "\u{F0B7F}",
  fg: "darkGray",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

export const DARK_FLAME_TILE: Tile = {
  type: TileType.DarkFlame,
  char: "\u{F0238}",
  fg: "red",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

export const CRYSTAL_TILE: Tile = {
  type: TileType.Crystal,
  char: "\u{F0B2F}",
  fg: "magenta",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

// --- Hub (Echoed Sanctuary) tiles ---

export const CAMPFIRE_TILE: Tile = {
  type: TileType.Campfire,
  char: "\u{F0EDD}",
  fg: "brightYellow",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const FOUNTAIN_TILE: Tile = {
  type: TileType.Fountain,
  char: "\u{F096B}",
  fg: "cyan",
  bg: "black",
  walkable: false,
  transparent: true,
  movementCost: 1,
};

export const TENT_TILE: Tile = {
  type: TileType.Tent,
  char: "\u{F0508}",
  fg: "brown",
  bg: "black",
  walkable: false,
  transparent: false,
  movementCost: 1,
};

export const FLAG_TILE: Tile = {
  type: TileType.Flag,
  char: "\u{F023B}",
  fg: "red",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export const PORTAL_TILE: Tile = {
  type: TileType.Portal,
  char: "\u{F0299}",
  fg: "brightCyan",
  bg: "black",
  walkable: true,
  transparent: true,
  movementCost: 1,
};

export class GameMap {
  private tiles: Tile[][];
  private explored: boolean[][];

  constructor(
    public readonly width: number,
    public readonly height: number,
    defaultTile: Tile = FLOOR_TILE,
  ) {
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ ...defaultTile })),
    );
    this.explored = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => false),
    );
  }

  isInBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x: number, y: number): Tile | undefined {
    if (!this.isInBounds(x, y)) return undefined;
    return this.tiles[y]![x]!;
  }

  setTile(x: number, y: number, tile: Tile): void {
    if (this.isInBounds(x, y)) {
      this.tiles[y]![x] = tile;
    }
  }

  isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile?.walkable ?? false;
  }

  markExplored(x: number, y: number): void {
    if (this.isInBounds(x, y)) {
      this.explored[y]![x] = true;
    }
  }

  isExplored(x: number, y: number): boolean {
    if (!this.isInBounds(x, y)) return false;
    return this.explored[y]![x]!;
  }
}
