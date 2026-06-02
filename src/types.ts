/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TetrominoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export type BlockColor = string | null;

export type Grid = BlockColor[][];

export interface Point {
  x: number;
  y: number;
}

export interface Tetromino {
  type: TetrominoType;
  matrix: number[][];
  color: string;
}

export type GameStateStatus = 'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  level: number;
  lines: number;
  date: string;
}

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const TETROMINO_SHAPES: Record<TetrominoType, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export const TETROMINO_COLORS: Record<TetrominoType, string> = {
  I: 'bg-cyan-500 shadow-[0_0_10px_#06b6d4] border-cyan-400',
  O: 'bg-amber-400 shadow-[0_0_10px_#fbbf24] border-amber-300',
  T: 'bg-purple-500 shadow-[0_0_10px_#a855f7] border-purple-400',
  S: 'bg-green-500 shadow-[0_0_10px_#22c55e] border-green-400',
  Z: 'bg-rose-500 shadow-[0_0_10px_#f43f5e] border-rose-400',
  J: 'bg-blue-600 shadow-[0_0_10px_#2563eb] border-blue-400',
  L: 'bg-orange-500 shadow-[0_0_10px_#f97316] border-orange-400',
};

// Subtle background preview colors for neat visuals
export const TETROMINO_GHOST_COLORS: Record<TetrominoType, string> = {
  I: 'border-cyan-500/40 bg-cyan-500/10',
  O: 'border-amber-400/40 bg-amber-400/10',
  T: 'border-purple-500/40 bg-purple-500/10',
  S: 'border-green-500/40 bg-green-500/10',
  Z: 'border-rose-500/40 bg-rose-500/10',
  J: 'border-blue-600/40 bg-blue-600/10',
  L: 'border-orange-500/40 bg-orange-500/10',
};

export const DIFFICULTY_SETTINGS: Record<Difficulty, { speed: number; label: string; scoreMultiplier: number; bg: string }> = {
  EASY: { speed: 850, label: '新手 (Easy)', scoreMultiplier: 1, bg: 'bg-green-500/10 text-green-400 border-green-500/20' },
  MEDIUM: { speed: 550, label: '进阶 (Medium)', scoreMultiplier: 1.5, bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  HARD: { speed: 300, label: '高手 (Hard)', scoreMultiplier: 2, bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  EXPERT: { speed: 150, label: '大师 (Expert)', scoreMultiplier: 3, bg: 'bg-red-500/10 text-red-400 border-red-500/20' },
};
