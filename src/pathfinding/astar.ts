import { MinHeap } from "./min-heap.ts";

export interface PathNode {
  x: number;
  y: number;
}

interface AStarNode {
  x: number;
  y: number;
  g: number;
  f: number;
  parentKey: string | null;
}

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const DEFAULT_MAX_NODES = 500;

function toKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function findPath(
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  isPassable: (x: number, y: number) => boolean,
  maxSearchNodes: number = DEFAULT_MAX_NODES,
): PathNode[] | null {
  if (startX === goalX && startY === goalY) return [];

  const open = new MinHeap<AStarNode>((a, b) => a.f - b.f);
  const closed = new Map<string, AStarNode>();
  let expanded = 0;

  const startKey = toKey(startX, startY);
  const h = Math.abs(goalX - startX) + Math.abs(goalY - startY);
  open.push({ x: startX, y: startY, g: 0, f: h, parentKey: null });

  while (open.size > 0) {
    const current = open.pop()!;
    const key = toKey(current.x, current.y);

    if (closed.has(key)) continue;
    closed.set(key, current);
    expanded++;

    if (expanded > maxSearchNodes) return null;

    if (current.x === goalX && current.y === goalY) {
      return reconstructPath(closed, current, startKey);
    }

    for (const dir of DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      const nKey = toKey(nx, ny);

      if (closed.has(nKey)) continue;

      const isGoal = nx === goalX && ny === goalY;
      if (!isGoal && !isPassable(nx, ny)) continue;
      if (isGoal && !isPassable(nx, ny)) {
        // Goal itself must be passable (caller excludes target entity)
        continue;
      }

      const g = current.g + 1;
      const f = g + Math.abs(goalX - nx) + Math.abs(goalY - ny);
      open.push({ x: nx, y: ny, g, f, parentKey: key });
    }
  }

  return null;
}

function reconstructPath(
  closed: Map<string, AStarNode>,
  goal: AStarNode,
  startKey: string,
): PathNode[] {
  const path: PathNode[] = [];
  let current: AStarNode | undefined = goal;

  while (current && toKey(current.x, current.y) !== startKey) {
    path.push({ x: current.x, y: current.y });
    current = current.parentKey ? closed.get(current.parentKey) : undefined;
  }

  path.reverse();
  return path;
}
