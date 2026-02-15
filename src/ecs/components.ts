export interface Position {
  x: number;
  y: number;
}

export interface Renderable {
  char: string;
  fg: string;
  bg: string;
}

export interface PlayerControlled {}

export interface Collidable {
  blocksMovement: boolean;
}

export interface ComponentMap {
  Position: Position;
  Renderable: Renderable;
  PlayerControlled: PlayerControlled;
  Collidable: Collidable;
}

export type ComponentType = keyof ComponentMap;
