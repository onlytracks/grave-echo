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
  secondaryUsed: boolean;
}

export interface AIControlled {
  pattern: "charger";
  targetEntity: number | null;
}

export interface Faction {
  factionId: "player" | "enemy" | "neutral";
}

export interface Item {
  name: string;
  weight: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export interface Weapon {
  damage: number;
  range: number;
  weaponType: "sword" | "bow";
}

export interface Consumable {
  effectType: "heal";
  power: number;
  charges: number;
  maxCharges: number;
}

export interface Inventory {
  items: number[];
  totalWeight: number;
  carryCapacity: number;
}

export interface Equipment {
  weapon: number | null;
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
  Faction: Faction;
  Item: Item;
  Weapon: Weapon;
  Consumable: Consumable;
  Inventory: Inventory;
  Equipment: Equipment;
}

export type ComponentType = keyof ComponentMap;
