import type { GameMap } from "./game-map.ts";
import { TileType } from "./game-map.ts";

function isWall(map: GameMap, x: number, y: number): boolean {
  if (!map.isInBounds(x, y)) return true;
  return map.getTile(x, y)!.type === TileType.Wall;
}

export function assignWallCharacters(map: GameMap): void {
  for (let y = 0; y < map.height; y++) {
    for (let x = 0; x < map.width; x++) {
      const tile = map.getTile(x, y)!;
      if (tile.type !== TileType.Wall) continue;

      const n = isWall(map, x, y - 1);
      const s = isWall(map, x, y + 1);
      const e = isWall(map, x + 1, y);
      const w = isWall(map, x - 1, y);

      const key = (n ? 8 : 0) | (s ? 4 : 0) | (e ? 2 : 0) | (w ? 1 : 0);

      const charMap: Record<number, string> = {
        0b0000: "■",
        0b1000: "│",
        0b0100: "│",
        0b1100: "│",
        0b0010: "─",
        0b0001: "─",
        0b0011: "─",
        0b1010: "└",
        0b1001: "┘",
        0b0110: "┌",
        0b0101: "┐",
        0b1110: "├",
        0b1101: "┤",
        0b0111: "┬",
        0b1011: "┴",
        0b1111: "┼",
      };

      tile.char = charMap[key] ?? "#";
    }
  }
}
