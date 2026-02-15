import type { Room } from "./dungeon-generator.ts";
import type { GameMap } from "./game-map.ts";
import { roomCenter } from "./dungeon-generator.ts";

export interface RoomGraph {
  rooms: Room[];
  edges: [number, number][];
  adjacency: Map<number, Set<number>>;
  criticalPath: number[];
  getNeighbors(roomIndex: number): number[];
  getDistance(fromIndex: number, toIndex: number): number;
}

export function roomIntensity(depth: number, maxDepth: number): number {
  if (maxDepth <= 0) return 0;
  return Math.min(1, depth / maxDepth);
}

function buildAdjacency(rooms: Room[], map: GameMap): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  for (let i = 0; i < rooms.length; i++) adj.set(i, new Set());

  const roomIndex = new Map<string, number>();
  for (let i = 0; i < rooms.length; i++) {
    for (const f of rooms[i]!.floors) {
      roomIndex.set(`${f.x},${f.y}`, i);
    }
  }

  for (let i = 0; i < rooms.length; i++) {
    const center = roomCenter(rooms[i]!);
    const visited = new Set<string>();
    const queue = [center];
    visited.add(`${center.x},${center.y}`);

    while (queue.length > 0) {
      const { x, y } = queue.shift()!;
      for (const [dx, dy] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ] as const) {
        const nx = x + dx;
        const ny = y + dy;
        const key = `${nx},${ny}`;
        if (visited.has(key) || !map.isWalkable(nx, ny)) continue;
        visited.add(key);
        const ri = roomIndex.get(key);
        if (ri !== undefined && ri !== i) {
          adj.get(i)!.add(ri);
          adj.get(ri)!.add(i);
        } else {
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }
  return adj;
}

function bfsDistances(adj: Map<number, Set<number>>, start: number): number[] {
  const dist = new Array(adj.size).fill(-1) as number[];
  dist[start] = 0;
  const queue = [start];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const neighbor of adj.get(cur)!) {
      if (dist[neighbor] === -1) {
        dist[neighbor] = dist[cur]! + 1;
        queue.push(neighbor);
      }
    }
  }
  return dist;
}

function bfsShortestPath(
  adj: Map<number, Set<number>>,
  from: number,
  to: number,
): number[] {
  const prev = new Map<number, number>();
  const visited = new Set<number>([from]);
  const queue = [from];

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const neighbor of adj.get(cur)!) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        prev.set(neighbor, cur);
        queue.push(neighbor);
      }
    }
  }

  if (!visited.has(to)) return [];

  const path: number[] = [];
  let cur = to;
  while (cur !== from) {
    path.unshift(cur);
    cur = prev.get(cur)!;
  }
  path.unshift(from);
  return path;
}

function extractEdges(adj: Map<number, Set<number>>): [number, number][] {
  const edges: [number, number][] = [];
  const seen = new Set<string>();
  for (const [i, neighbors] of adj) {
    for (const j of neighbors) {
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([Math.min(i, j), Math.max(i, j)]);
      }
    }
  }
  return edges;
}

export function buildRoomGraph(rooms: Room[], map: GameMap): RoomGraph {
  const adjacency = buildAdjacency(rooms, map);
  const edges = extractEdges(adjacency);

  const distances = bfsDistances(adjacency, 0);
  const maxDepth = Math.max(0, ...distances.filter((d) => d >= 0));

  for (let i = 0; i < rooms.length; i++) {
    rooms[i]!.depth = distances[i] ?? 0;
    rooms[i]!.intensity = roomIntensity(rooms[i]!.depth, maxDepth);
  }

  let bossIdx = 0;
  for (let i = 1; i < rooms.length; i++) {
    if (rooms[i]!.tag === "boss") {
      bossIdx = i;
      break;
    }
  }

  const criticalPath = bfsShortestPath(adjacency, 0, bossIdx);

  const distCache = new Map<number, number[]>();
  distCache.set(0, distances);

  return {
    rooms,
    edges,
    adjacency,
    criticalPath,
    getNeighbors(roomIndex: number): number[] {
      return [...(adjacency.get(roomIndex) ?? [])];
    },
    getDistance(fromIndex: number, toIndex: number): number {
      let dists = distCache.get(fromIndex);
      if (!dists) {
        dists = bfsDistances(adjacency, fromIndex);
        distCache.set(fromIndex, dists);
      }
      return dists[toIndex] ?? -1;
    },
  };
}
