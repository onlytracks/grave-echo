import type { GameMap } from "./game-map.ts";
import { TileType } from "./game-map.ts";

export function assignWallCharacters(map: GameMap): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y)!;
      if (tile.type !== TileType.Wall) continue;
      tile.char = "▓";
    }
  }
}
