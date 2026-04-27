export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GROUND_Y = CANVAS_HEIGHT - 60;

export const GRAVITY = 0.8;
export const JUMP_FORCE = -16;

export enum FighterState {
  IDLE = 'IDLE',
  WALK = 'WALK',
  JUMP = 'JUMP',
  PUNCH = 'PUNCH',
  KICK = 'KICK',
  BLOCK = 'BLOCK',
  DODGE = 'DODGE',
  HIT = 'HIT',
  SPECIAL = 'SPECIAL',
  COMBO = 'COMBO',
  WIN = 'WIN',
  LOSE = 'LOSE',
}

export interface FighterConfig {
  name: string;
  speed: number;
  strength: number;
  health: number;
  color: string;
  accent: string;
  comboKeys: string[];
}

export const CHARACTERS: Record<string, FighterConfig> = {
  naveen: {
    name: 'Naveen',
    speed: 6,
    strength: 10,
    health: 100,
    color: '#00F2FF', // Cyan shadow
    accent: '#00F2FF',
    comboKeys: ['p', 'p', 'k'],
  },
  ravi: {
    name: 'Ravi',
    speed: 4,
    strength: 18,
    health: 120,
    color: '#FF00FF', // Magenta shadow
    accent: '#FF00FF',
    comboKeys: ['k', 'k', 'p'],
  },
};
