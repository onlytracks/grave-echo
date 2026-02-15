import { FLOOR_TILE, GameMap, WALL_TILE } from "./game-map.ts";
import { assignWallCharacters } from "./tile-utils.ts";

export function buildTestRoom(): GameMap {
  const map = new GameMap(20, 15, FLOOR_TILE);

  // Border walls
  for (let x = 0; x < map.width; x++) {
    map.setTile(x, 0, { ...WALL_TILE });
    map.setTile(x, map.height - 1, { ...WALL_TILE });
  }
  for (let y = 0; y < map.height; y++) {
    map.setTile(0, y, { ...WALL_TILE });
    map.setTile(map.width - 1, y, { ...WALL_TILE });
  }

  // L-shaped wall
  for (let x = 5; x <= 8; x++) map.setTile(x, 4, { ...WALL_TILE });
  for (let y = 4; y <= 7; y++) map.setTile(5, y, { ...WALL_TILE });

  // Pillars
  map.setTile(14, 3, { ...WALL_TILE });
  map.setTile(14, 7, { ...WALL_TILE });
  map.setTile(14, 11, { ...WALL_TILE });

  assignWallCharacters(map);
  return map;
}
