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

export interface Health {
  current: number;
  max: number;
}

export interface Stats {
  strength: number;
  defense: number;
  speed: number;
}

export interface TurnActor {
  hasActed: boolean;
  movementRemaining: number;
}

export interface AIControlled {
  pattern: "charger";
  targetEntity: number | null;
}

export interface ComponentMap {
  Position: Position;
  Renderable: Renderable;
  PlayerControlled: PlayerControlled;
  Collidable: Collidable;
  Health: Health;
  Stats: Stats;
  TurnActor: TurnActor;
  AIControlled: AIControlled;
}

export type ComponentType = keyof ComponentMap;
