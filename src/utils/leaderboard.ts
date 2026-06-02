/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LeaderboardEntry } from '../types';

const LEADERBOARD_KEY = 'tetris_classic_leaderboard';

const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', name: '艾达 (Ada Lovelace)', score: 15400, level: 8, lines: 64, date: '2026-05-28' },
  { id: '2', name: '图灵 (Alan Turing)', score: 12100, level: 6, lines: 50, date: '2026-05-29' },
  { id: '3', name: '香农 (Claude Shannon)', score: 9800, level: 5, lines: 42, date: '2026-05-30' },
  { id: '4', name: '深蓝 (Deep Blue)', score: 7500, level: 4, lines: 32, date: '2026-05-31' },
  { id: '5', name: '新手小张', score: 3200, level: 2, lines: 14, date: '2026-06-01' },
];

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    if (!data) {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(DEFAULT_LEADERBOARD));
      return DEFAULT_LEADERBOARD;
    }
    const parsed = JSON.parse(data) as LeaderboardEntry[];
    return parsed.sort((a, b) => b.score - a.score);
  } catch (e) {
    console.error('Error reading leaderboard from localStorage', e);
    return DEFAULT_LEADERBOARD;
  }
}

export function saveLeaderboard(entries: LeaderboardEntry[]): void {
  try {
    const sorted = [...entries].sort((a, b) => b.score - a.score).slice(0, 10);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
  } catch (e) {
    console.error('Error saving leaderboard to localStorage', e);
  }
}

export function checkHighScore(score: number): boolean {
  if (score <= 0) return false;
  const board = getLeaderboard();
  if (board.length < 10) return true;
  return score > board[board.length - 1].score;
}

export function addLeaderboardEntry(name: string, score: number, level: number, lines: number): LeaderboardEntry[] {
  const board = getLeaderboard();
  const newEntry: LeaderboardEntry = {
    id: Math.random().toString(36).substring(2, 9),
    name: name.trim() || '匿名的方块大师',
    score,
    level,
    lines,
    date: new Date().toISOString().split('T')[0],
  };

  const updated = [...board, newEntry];
  saveLeaderboard(updated);
  return getLeaderboard();
}

export function clearLeaderboard(): LeaderboardEntry[] {
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify([]));
    return [];
  } catch (e) {
    console.error('Error clearing leaderboard', e);
    return [];
  }
}
