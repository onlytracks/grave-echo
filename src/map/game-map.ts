export enum TileType {
  Floor,
  Wall,
}

export interface Tile {
  type: TileType;
  char: string;
  fg: string;
  bg: string;
  walkable: boolean;
  transparent: boolean;
}

export const FLOOR_TILE: Tile = {
  type: TileType.Floor,
  char: "·",
  fg: "gray",
  bg: "black",
  walkable: true,
  transparent: true,
};

export const WALL_TILE: Tile = {
  type: TileType.Wall,
  char: "▓",
  fg: "white",
  bg: "black",
  walkable: false,
  transparent: false,
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
