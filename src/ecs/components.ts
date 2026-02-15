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
  pattern: "charger" | "archer" | "guardian" | "skulker" | "patrol";
  targetEntity: number | null;
  patrolPath?: { x: number; y: number }[];
  patrolIndex?: number;
  currentPath?: { x: number; y: number }[];
  pathTargetX?: number;
  pathTargetY?: number;
  pathAge?: number;
  hasUsedPotion?: boolean;
  canDrinkPotions?: boolean;
}

export interface Faction {
  factionId: "player" | "enemy" | "neutral";
}

export interface Item {
  name: string;
  weight: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
}

export type WeaponType =
  | "sword"
  | "axe"
  | "mace"
  | "spear"
  | "halberd"
  | "bow"
  | "crossbow"
  | "staff"
  | "wand";

export type AttackType = "melee" | "reach" | "ranged";

export interface Weapon {
  damage: number;
  range: number;
  weaponType: WeaponType;
  attackType: AttackType;
  defenseBonus: number;
}

export type EffectType = "heal" | "speed" | "strength" | "defense";

export interface Consumable {
  effectType: EffectType;
  power: number;
  duration: number;
  charges: number;
  maxCharges: number;
}

export interface Armor {
  defense: number;
  speedPenalty: number;
  armorType: "light" | "medium" | "heavy";
}

export interface StatBonus {
  stat:
    | "strength"
    | "defense"
    | "speed"
    | "maxHealth"
    | "critChance"
    | "critDamage";
  value: number;
}

export interface Accessory {
  slot: "accessory";
  bonuses: StatBonus[];
}

export interface ActiveBuff {
  stat: "strength" | "defense" | "speed";
  value: number;
  turnsRemaining: number;
}

export interface Buffs {
  active: ActiveBuff[];
}

export interface Inventory {
  items: number[];
  totalWeight: number;
  carryCapacity: number;
}

export interface Equipment {
  weapon: number | null;
  armor: number | null;
  accessory1: number | null;
  accessory2: number | null;
}

export interface Senses {
  vision: { range: number };
}

export interface Awareness {
  state: "idle" | "alert";
  lastKnownTarget: { x: number; y: number } | null;
  alertDuration: number;
  turnsWithoutTarget: number;
}

export interface TargetSelection {
  targetEntity: number | null;
}

export interface Defending {}

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
  Armor: Armor;
  Accessory: Accessory;
  Buffs: Buffs;
  Inventory: Inventory;
  Equipment: Equipment;
  Senses: Senses;
  Awareness: Awareness;
  TargetSelection: TargetSelection;
  Defending: Defending;
}

export type ComponentType = keyof ComponentMap;
