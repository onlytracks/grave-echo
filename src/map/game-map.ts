export interface Tile {
  char: string;
  fg: string;
  bg: string;
  walkable: boolean;
}

export class GameMap {
  private tiles: Tile[][];

  constructor(
    public readonly width: number,
    public readonly height: number,
    defaultTile: Tile,
  ) {
    this.tiles = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({ ...defaultTile })),
    );
  }

  getTile(x: number, y: number): Tile {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return { char: " ", fg: "white", bg: "black", walkable: false };
    }
    return this.tiles[y]![x]!;
  }

  setTile(x: number, y: number, tile: Tile): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.tiles[y]![x] = tile;
    }
  }
}
