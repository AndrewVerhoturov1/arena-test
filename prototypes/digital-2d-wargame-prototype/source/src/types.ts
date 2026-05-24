export type FactionId = 'rome' | 'greek' | 'gaul' | 'samnite' | 'carthage';
export type GameMode = 'designer' | 'play';
export type TerrainType = 'city' | 'town' | 'fortress' | 'port' | 'pass';
export type CounterType = 'legion' | 'fleet' | 'leader' | 'auxiliary';

export interface Faction {
  id: FactionId;
  name: string;
  emblem: string;
  color: string;
  darkColor: string;
  lightColor: string;
  vp: number;
  handSize: number;
  status: 'active' | 'inactive' | 'eliminated';
}

export interface Space {
  id: string;
  name: string;
  x: number;
  y: number;
  homeFaction?: FactionId;
  controlFaction?: FactionId;
  connections: string[];
  terrain: TerrainType;
}

export interface Counter {
  id: string;
  name: string;
  faction: FactionId;
  type: CounterType;
  strength: number;
  spaceId?: string;
  x?: number;
  y?: number;
  flipped: boolean;
  exhausted: boolean;
}

export interface ActionLogEntry {
  id: number;
  text: string;
  timestamp: Date;
  faction?: FactionId;
}

export interface ContextMenuItem {
  label: string;
  action: string;
  icon?: string;
  disabled?: boolean;
}

export interface ContextMenuState {
  x: number;
  y: number;
  items: ContextMenuItem[];
  type: 'space' | 'counter' | 'map';
  targetId?: string;
}

export interface Layers {
  connections: boolean;
  names: boolean;
  control: boolean;
  terrain: boolean;
  homeRings: boolean;
}
