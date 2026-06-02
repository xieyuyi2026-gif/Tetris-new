/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LeaderboardEntry } from '../types';
import { Trophy, Calendar, Zap, ListOrdered, RotateCcw } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  onClear: () => void;
  currentUserId?: string; // Highlight current game's score if it's there
}

export function Leaderboard({ entries, onClear, currentUserId }: LeaderboardProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-800 p-6 flex flex-col h-full shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
          <h2 id="leaderboard-title" className="text-lg font-bold text-slate-100 font-sans tracking-tight">
            本地高分排行榜
          </h2>
        </div>
        
        {entries.length > 0 && (
          <button
            id="clear-leaderboard-btn"
            onClick={() => {
              if (window.confirm('您确定要清空排行榜吗？此操作无法撤销。')) {
                onClear();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 font-medium py-1 px-2.5 rounded-lg border border-slate-800 hover:border-red-500/20 hover:bg-red-500/5 transition-all duration-300"
            title="清空排行榜"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-500 text-center">
            <Trophy className="w-8 h-8 opacity-20 mb-2" />
            <p className="text-sm font-light">暂无高分记录</p>
            <p className="text-xs opacity-60">快来创造您的第一个纪录吧！</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isTop3 = index < 3;
            const rankColors = [
              'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]',
              'bg-gradient-to-r from-slate-300 to-slate-400 text-slate-950',
              'bg-gradient-to-r from-amber-700 to-amber-800 text-slate-100',
            ];
            const itemHighlight = entry.id === currentUserId
              ? 'bg-amber-500/10 border-amber-500/30 ring-1 ring-amber-500/20'
              : 'bg-slate-950/40 border-slate-800/40 hover:border-slate-700/60';

            return (
              <div
                id={`leaderboard-item-${entry.id}`}
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-xl border text-sm transition-all duration-300 ${itemHighlight}`}
              >
                <div className="flex items-center gap-3">
                  {/* Rank Badge */}
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${isTop3 ? rankColors[index] : 'bg-slate-800/60 text-slate-400'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-slate-200">{entry.name}</div>
                    <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                      <span className="flex items-center gap-0.5"><Zap className="w-2.5 h-2.5 text-blue-500" />等级 {entry.level}</span>
                      <span className="flex items-center gap-0.5"><ListOrdered className="w-2.5 h-2.5 text-emerald-500" />消行 {entry.lines}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-extrabold text-amber-500 text-base">
                    {entry.score.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center justify-end gap-1 mt-0.5 font-mono">
                    <Calendar className="w-2.5 h-2.5" />
                    {entry.date}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
