/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  Grid,
  BlockColor,
  Tetromino,
  TetrominoType,
  TETROMINO_SHAPES,
  TETROMINO_COLORS,
  TETROMINO_GHOST_COLORS,
  Difficulty,
  DIFFICULTY_SETTINGS,
  LeaderboardEntry,
} from './types';
import { sound } from './utils/soundManager';
import { getLeaderboard, addLeaderboardEntry, checkHighScore, clearLeaderboard } from './utils/leaderboard';
import { Leaderboard } from './components/Leaderboard';
import { useInterval } from './hooks/useInterval';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  Zap,
  ListOrdered,
  Keyboard,
  ArrowBigLeft,
  ArrowBigRight,
  ArrowBigDown,
  RefreshCw,
  ChevronsDown,
  Info,
} from 'lucide-react';

// Create a blank 20x10 matrix
const createEmptyGrid = (): Grid =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(null));

// Generate a random piece
const getRandomPiece = (): Tetromino => {
  const types: TetrominoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const type = types[Math.floor(Math.random() * types.length)];
  return {
    type,
    matrix: TETROMINO_SHAPES[type].map(row => [...row]),
    color: TETROMINO_COLORS[type],
  };
};

export default function App() {
  // Game states
  const [grid, setGrid] = useState<Grid>(createEmptyGrid());
  const [currentPiece, setCurrentPiece] = useState<Tetromino & { x: number; y: number } | null>(null);
  const [nextPiece, setNextPiece] = useState<Tetromino>(getRandomPiece());
  
  // Game metrics
  const [score, setScore] = useState<number>(0);
  const [lines, setLines] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  
  // Controls & Settings
  const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  
  // Show high score dialog if eligible
  const [showHighScoreForm, setShowHighScoreForm] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [currentGameRecordId, setCurrentGameRecordId] = useState<string>('');
  
  // Controls reference overlay toggle
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Focus ref for capturing keyboard inputs
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize Leaderboard & Sound togglers
  useEffect(() => {
    setLeaderboard(getLeaderboard());
    setIsMuted(sound.getMute());
  }, []);

  // Sync Audio mute state
  const handleToggleMute = useCallback(() => {
    const muted = sound.toggleMute();
    setIsMuted(muted);
  }, []);

  // Define Speed based on difficulty and level
  const gameSpeedSetting = DIFFICULTY_SETTINGS[difficulty].speed;
  const speed = status === 'PLAYING'
    ? Math.max(60, gameSpeedSetting - (level - 1) * 60)
    : null;

  // Collision detection helper function
  const hasCollision = useCallback((
    matrix: number[][],
    offsetX: number,
    offsetY: number,
    board: Grid
  ): boolean => {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const nextX = offsetX + c;
          const nextY = offsetY + r;

          // Out of horizontal or bottom bounds
          if (nextX < 0 || nextX >= BOARD_WIDTH || nextY >= BOARD_HEIGHT) {
            return true;
          }

          // Top boundary check
          if (nextY >= 0) {
            // Overlapping with already fixed blocks
            if (board[nextY][nextX] !== null) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }, []);

  // Compute ghost piece position (for fast visual preview of where piece will land)
  const getGhostY = useCallback((): number => {
    if (!currentPiece) return 0;
    let ghostY = currentPiece.y;
    while (!hasCollision(currentPiece.matrix, currentPiece.x, ghostY + 1, grid)) {
      ghostY++;
    }
    return ghostY;
  }, [currentPiece, grid, hasCollision]);

  // Rotates a grid shape clockwise with SRS-style basic kick-tests
  const rotatePiece = useCallback(() => {
    if (status !== 'PLAYING' || !currentPiece) return;

    const size = currentPiece.matrix.length;
    const rotated = Array.from({ length: size }, () => Array(size).fill(0));
    
    // Perform clockwise rotation transpose
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        rotated[c][size - 1 - r] = currentPiece.matrix[r][c];
      }
    }

    // Basic SRS Wall Kicks: Try rotate directly, then left, right, up
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!hasCollision(rotated, currentPiece.x + kick, currentPiece.y, grid)) {
        setCurrentPiece(prev => {
          if (!prev) return null;
          return {
            ...prev,
            x: prev.x + kick,
            matrix: rotated,
          };
        });
        sound.playRotate();
        return;
      }
    }
  }, [currentPiece, grid, hasCollision, status]);

  // Move piece left or right
  const movePiece = useCallback((dir: number) => {
    if (status !== 'PLAYING' || !currentPiece) return;

    if (!hasCollision(currentPiece.matrix, currentPiece.x + dir, currentPiece.y, grid)) {
      setCurrentPiece(prev => {
        if (!prev) return null;
        return {
          ...prev,
          x: prev.x + dir,
        };
      });
      sound.playMove();
    }
  }, [currentPiece, grid, hasCollision, status]);

  // Lock current piece into the grid
  const lockPiece = useCallback((pieceToLock: Tetromino & { x: number; y: number }, currentGrid: Grid) => {
    const updatedGrid = currentGrid.map(row => [...row]);
    let gameOverCheck = false;

    for (let r = 0; r < pieceToLock.matrix.length; r++) {
      for (let c = 0; c < pieceToLock.matrix[r].length; c++) {
        if (pieceToLock.matrix[r][c] !== 0) {
          const gridY = pieceToLock.y + r;
          const gridX = pieceToLock.x + c;

          if (gridY < 0) {
            // Piece locked out of visible screen bounds
            gameOverCheck = true;
          } else {
            updatedGrid[gridY][gridX] = pieceToLock.color;
          }
        }
      }
    }

    if (gameOverCheck) {
      setStatus('GAME_OVER');
      sound.playGameOver();
      const isHigh = checkHighScore(score);
      if (isHigh) {
        setShowHighScoreForm(true);
      }
      return;
    }

    // Clear filled rows
    let rowsClearedThisTurn = 0;
    const afterClearingGrid = updatedGrid.filter(row => {
      const isRowFull = row.every(cell => cell !== null);
      if (isRowFull) {
        rowsClearedThisTurn++;
        return false; // Remove row
      }
      return true;
    });

    // Pad top with clean empty rows
    while (afterClearingGrid.length < BOARD_HEIGHT) {
      afterClearingGrid.unshift(Array(BOARD_WIDTH).fill(null));
    }

    // Record Metrics
    if (rowsClearedThisTurn > 0) {
      let basePoints = 0;
      switch (rowsClearedThisTurn) {
        case 1: basePoints = 100; sound.playLineClear(); break;
        case 2: basePoints = 300; sound.playLineClear(); break;
        case 3: basePoints = 500; sound.playLineClear(); break;
        case 4: basePoints = 800; sound.playTetris(); break; // Classic Tetris!
        default: basePoints = 1000; sound.playLineClear();
      }

      const difficultyMult = DIFFICULTY_SETTINGS[difficulty].scoreMultiplier;
      const pointsScored = Math.round(basePoints * level * difficultyMult);
      
      setScore(prev => prev + pointsScored);
      setLines(prev => {
        const total = prev + rowsClearedThisTurn;
        // Every 10 lines, players progress 1 level
        const nextLevel = Math.floor(total / 10) + 1;
        if (nextLevel > level) {
          setLevel(nextLevel);
          sound.playLevelUp();
        }
        return total;
      });
    } else {
      sound.playMove(); // Regular piece placed feedback
    }

    setGrid(afterClearingGrid);

    // Spawn Next Piece
    const nextSpawnObj = {
      ...nextPiece,
      x: Math.floor((BOARD_WIDTH - nextPiece.matrix[0].length) / 2),
      y: -2, // Spawn slightly above visible grid margin for natural sliding entry
    };

    if (hasCollision(nextSpawnObj.matrix, nextSpawnObj.x, nextSpawnObj.y, afterClearingGrid)) {
      setStatus('GAME_OVER');
      sound.playGameOver();
      const isHigh = checkHighScore(score);
      if (isHigh) {
        setShowHighScoreForm(true);
      }
    } else {
      setCurrentPiece(nextSpawnObj);
      setNextPiece(getRandomPiece());
    }
  }, [nextPiece, difficulty, level, score, hasCollision]);

  // Tick downward
  const moveDown = useCallback(() => {
    if (status !== 'PLAYING' || !currentPiece) return;

    if (!hasCollision(currentPiece.matrix, currentPiece.x, currentPiece.y + 1, grid)) {
      setCurrentPiece(prev => {
        if (!prev) return null;
        return {
          ...prev,
          y: prev.y + 1,
        };
      });
      // Soft drop bonus points
      setScore(prev => prev + 1);
    } else {
      // Lock current piece
      lockPiece(currentPiece, grid);
    }
  }, [currentPiece, grid, hasCollision, status, lockPiece]);

  // Hard drop piece directly to the bottom
  const hardDrop = useCallback(() => {
    if (status !== 'PLAYING' || !currentPiece) return;

    const targetY = getGhostY();
    const droppedPiece = { ...currentPiece, y: targetY };
    
    // Add 2 points for every index dropped
    const dropDistance = targetY - currentPiece.y;
    setScore(prev => prev + (dropDistance * 2));
    
    sound.playDrop();
    lockPiece(droppedPiece, grid);
  }, [currentPiece, getGhostY, lockPiece, grid, status]);

  // Loop game frames
  useInterval(() => {
    moveDown();
  }, speed);

  // Initialize background game session
  const startGame = useCallback(() => {
    const initPiece = getRandomPiece();
    const nextSpawnObj = {
      ...initPiece,
      x: Math.floor((BOARD_WIDTH - initPiece.matrix[0].length) / 2),
      y: -1,
    };
    
    setGrid(createEmptyGrid());
    setCurrentPiece(nextSpawnObj);
    setNextPiece(getRandomPiece());
    setScore(0);
    setLines(0);
    setLevel(1);
    setStatus('PLAYING');
    setShowHighScoreForm(false);
    
    // play cool level up alert sound
    sound.playLevelUp();
    
    // Ensure the container receives focus
    setTimeout(() => {
      containerRef.current?.focus();
    }, 50);
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (status === 'PLAYING') {
      setStatus('PAUSED');
    } else if (status === 'PAUSED') {
      setStatus('PLAYING');
      containerRef.current?.focus();
    }
  }, [status]);

  // Handle high score leaderboard submission
  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = playerName.trim() || '匿名的方块大师';
    const updatedBoard = addLeaderboardEntry(cleanName, score, level, lines);
    setLeaderboard(updatedBoard);
    
    // find index that fits this score to highlight the user ID
    const match = updatedBoard.find(entry => entry.name === cleanName && entry.score === score);
    if (match) {
      setCurrentGameRecordId(match.id);
    }

    setShowHighScoreForm(false);
    setPlayerName('');
  };

  const handleClearBoard = useCallback(() => {
    const cleared = clearLeaderboard();
    setLeaderboard(cleared);
  }, []);

  // Set up overall keyboard actions
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (status !== 'PLAYING') {
      if (e.key.toLowerCase() === 'r') {
        startGame();
      }
      if (e.key === ' ' || e.key === 'Enter') {
        if (status === 'IDLE' || status === 'GAME_OVER') {
          startGame();
        } else if (status === 'PAUSED') {
          handlePauseToggle();
        }
      }
      return;
    }

    const key = e.key.toLowerCase();
    
    switch (e.key) {
      case 'ArrowLeft':
        movePiece(-1);
        e.preventDefault();
        break;
      case 'ArrowRight':
        movePiece(1);
        e.preventDefault();
        break;
      case 'ArrowDown':
        moveDown();
        e.preventDefault();
        break;
      case 'ArrowUp':
        rotatePiece();
        e.preventDefault();
        break;
      case ' ': // Space for instantaneous Hard Drop
        hardDrop();
        e.preventDefault();
        break;
      case 'Escape':
        handlePauseToggle();
        e.preventDefault();
        break;
    }

    // Classic alternative WASD Support
    if (key === 'a') {
      movePiece(-1);
    } else if (key === 'd') {
      movePiece(1);
    } else if (key === 's') {
      moveDown();
    } else if (key === 'w') {
      rotatePiece();
    } else if (key === 'p') {
      handlePauseToggle();
    }
  }, [status, movePiece, moveDown, rotatePiece, hardDrop, handlePauseToggle, startGame]);

  // Handle browser window event listening
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Trigger focus element on load
  useEffect(() => {
    if (status === 'PLAYING') {
      containerRef.current?.focus();
    }
  }, [status]);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-between p-4 overflow-x-hidden select-none outline-none focus:ring-1 focus:ring-slate-800/50"
    >
      {/* Header Panel */}
      <header className="w-full max-w-5xl flex items-center justify-between py-3 px-4 border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-extrabold text-lg text-slate-950 font-sans shadow-[0_0_15px_rgba(245,158,11,0.3)] shrink-0 animate-bounce">
            T
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-amber-500 bg-clip-text text-transparent">
              俄罗斯方块经典版
            </h1>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">
              Classic Arcade Puzzle Grid
            </p>
          </div>
        </div>

        {/* Global Toolbar */}
        <div className="flex items-center gap-2">
          {/* Difficulty picker */}
          {status !== 'PLAYING' && status !== 'PAUSED' ? (
            <div className="flex items-center bg-slate-900/60 p-0.5 rounded-lg border border-slate-800/80 text-xs">
              {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`px-3 py-1.5 rounded-md font-medium transition-all duration-300 ${
                    difficulty === diff
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-100'
                  }`}
                >
                  {diff === 'EASY' ? '简单' : diff === 'MEDIUM' ? '中等' : diff === 'HARD' ? '困难' : '极速'}
                </button>
              ))}
            </div>
          ) : (
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-bold tracking-wide ${DIFFICULTY_SETTINGS[difficulty].bg}`}>
              {DIFFICULTY_SETTINGS[difficulty].label}
            </div>
          )}

          {/* Sound switch */}
          <button
            onClick={handleToggleMute}
            className={`p-2.5 rounded-xl border transition-all duration-300 ${
              isMuted
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
            }`}
            title={isMuted ? '开声音' : '静音'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Control guide Toggle */}
          <button
            onClick={() => setShowHelp(prev => !prev)}
            className={`p-2.5 rounded-xl border transition-all duration-200 ${
              showHelp
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700'
            }`}
            title="操作说明"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Interactive Grid Layout */}
      <main className="flex-1 w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-6 my-6 items-stretch">
        
        {/* Left Side: Instructions, stats overview, custom configuration */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Stats Bento Box */}
          <article className="bg-slate-900/40 border border-slate-900/60 p-5 rounded-2xl flex flex-col gap-5 justify-between">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">
              实时数据统计
            </h3>
            
            {/* Score item */}
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono uppercase">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Current Score
                </p>
                <p className="text-2xl font-mono font-extrabold text-amber-500 mt-1">
                  {score.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Level item */}
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono uppercase">
                  <Zap className="w-3 h-3 text-cyan-400" /> Current Level
                </p>
                <p className="text-2xl font-mono font-extrabold text-cyan-400 mt-1">
                  LV {level}
                </p>
              </div>
            </div>

            {/* Lines cleared */}
            <div className="bg-slate-950/50 rounded-xl p-3 border border-slate-800/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-500 flex items-center gap-1 font-mono uppercase">
                  <ListOrdered className="w-3 h-3 text-emerald-400" /> Lines Completed
                </p>
                <p className="text-2xl font-mono font-extrabold text-emerald-400 mt-1">
                  {lines}
                </p>
              </div>
            </div>
          </article>

          {/* Controls Instruction Card */}
          <article className="bg-slate-900/40 border border-slate-900/60 p-5 rounded-2xl flex-1 flex flex-col justify-between">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Info className="w-4 h-4 text-slate-400" /> 经典操作说明
              </h3>
              
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-stone-500 block mb-1">← / A</span>
                  <span className="text-slate-300 font-sans">向左移动</span>
                </div>
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-stone-500 block mb-1">→ / D</span>
                  <span className="text-slate-300 font-sans">向右移动</span>
                </div>
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-stone-500 block mb-1">↑ / W</span>
                  <span className="text-slate-300 font-sans">顺时针旋转</span>
                </div>
                <div className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/40">
                  <span className="text-stone-500 block mb-1">↓ / S</span>
                  <span className="text-slate-300 font-sans">软降落缓行</span>
                </div>
              </div>

              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-xs font-mono">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-stone-500">[ 空格键 ]</span>
                  <span className="text-amber-500 font-semibold font-sans">硬降落 (直接落地)</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-stone-500">[ Esc / P ]</span>
                  <span className="text-slate-300 font-sans">暂停游戏</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-900/60 text-[10px] text-slate-600 font-mono text-center leading-relaxed">
              *支持电脑键盘操作。如果您在移动端，可使用主屏幕下方的方向控制器，随时享受轻快拼图体验。
            </div>
          </article>
        </section>

        {/* Center Canvas Area: Grid Board and Controls overlays */}
        <section className="lg:col-span-5 flex flex-col items-center">
          
          {/* Game Canvas Container wrapper */}
          <div className="relative bg-slate-950 rounded-2xl border-4 border-slate-900 shadow-2xl p-2.5 max-w-full overflow-hidden shrink-0">
            
            {/* Grid rows renderer */}
            <div
              id="tetris-grid-board"
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${BOARD_WIDTH}, minmax(0, 1fr))`,
                gap: '2px',
                width: 'min(300px, 85vw)',
                height: 'min(600px, 170vw)',
              }}
              className="bg-slate-950 rounded-lg relative overflow-hidden"
            >
              {grid.map((row, y) =>
                row.map((cellColor, x) => {
                  let cellClasses = 'bg-slate-900/30 border border-slate-950/30';
                  
                  // Determine block colors mapping
                  const isCurrentActive =
                    currentPiece &&
                    y >= currentPiece.y &&
                    y < currentPiece.y + currentPiece.matrix.length &&
                    x >= currentPiece.x &&
                    x < currentPiece.x + currentPiece.matrix[0].length &&
                    currentPiece.matrix[y - currentPiece.y][x - currentPiece.x] !== 0;

                  // Determine ghost block position
                  const ghostY = getGhostY();
                  const isGhostActive =
                    currentPiece &&
                    y >= ghostY &&
                    y < ghostY + currentPiece.matrix.length &&
                    x >= currentPiece.x &&
                    x < currentPiece.x + currentPiece.matrix[0].length &&
                    currentPiece.matrix[y - ghostY][x - currentPiece.x] !== 0;

                  if (cellColor) {
                    // Lock-placed solid cells
                    cellClasses = `rounded-[4px] border ${cellColor}`;
                  } else if (isCurrentActive && currentPiece) {
                    // Live falling active piece (highest opacity)
                    cellClasses = `rounded-[4px] border ${currentPiece.color} scale-[1.02] z-10 transition-all duration-75`;
                  } else if (isGhostActive && currentPiece) {
                    // Preview guide ghost piece cell
                    const ghostClass = TETROMINO_GHOST_COLORS[currentPiece.type];
                    cellClasses = `rounded-[4px] border border-dashed ${ghostClass}`;
                  }

                  return (
                    <div
                      key={`${x}-${y}`}
                      className={`w-full h-full aspect-square transition-colors duration-100 ${cellClasses}`}
                    />
                  );
                })
              )}

              {/* OVERLAYS */}
              
              {/* Cover Idle Overlay */}
              {status === 'IDLE' && (
                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-35 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mb-4">
                    <Play className="w-8 h-8 scale-110" />
                  </div>
                  <h3 className="text-xl font-bold font-sans text-slate-100 mb-2">
                    新一轮经典拼图
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-6">
                    测试您的拼图极限与逻辑手速！<br />选择您期望的挑战等级，开始这场极富乐趣的俄罗斯方块解密。
                  </p>
                  
                  <button
                    onClick={startGame}
                    className="w-full max-w-[180px] bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold font-sans py-3 px-6 rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
                  >
                    开始游戏
                  </button>
                </div>
              )}

              {/* Cover Paused Overlay */}
              {status === 'PAUSED' && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-35">
                  <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                    <Pause className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold font-sans text-slate-100 mb-2">
                    游戏已暂停
                  </h3>
                  <p className="text-xs text-slate-400 mb-6">
                    按 ESC、P 键或下方按钮继续
                  </p>
                  
                  <button
                    onClick={handlePauseToggle}
                    className="w-full max-w-[160px] bg-teal-500 hover:bg-teal-400 text-slate-955 text-slate-950 font-bold py-2.5 px-6 rounded-xl transition-all duration-300 mb-3"
                  >
                    继续游戏
                  </button>
                  <button
                    onClick={startGame}
                    className="w-full max-w-[160px] text-xs text-slate-400 hover:text-slate-100 py-2 border border-slate-800 hover:border-slate-700 rounded-xl"
                  >
                    重新开始
                  </button>
                </div>
              )}

              {/* Cover Game-Over Overlay */}
              {status === 'GAME_OVER' && (
                <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-35">
                  <h3 className="text-xl font-extrabold text-red-500 font-sans tracking-wide uppercase mb-1">
                    游戏结束
                  </h3>
                  <p className="text-xs text-red-400/80 mb-4 tracking-wider uppercase font-mono">
                    Game Over
                  </p>
                  
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-6 w-full max-w-[200px]">
                    <span className="text-[10px] text-slate-500 block uppercase font-mono">获得最终积分</span>
                    <span className="text-2xl font-mono font-extrabold text-amber-500">{score.toLocaleString()}</span>
                  </div>

                  {showHighScoreForm ? (
                    <form onSubmit={handleSubmitScore} className="w-full max-w-[220px] space-y-3">
                      <p className="text-xs text-amber-400 font-sans font-medium">✨ 恭喜登顶高分排行榜！</p>
                      <input
                        type="text"
                        placeholder="请输入您的尊姓大名..."
                        maxLength={15}
                        required
                        value={playerName}
                        onChange={e => setPlayerName(e.target.value)}
                        className="w-full bg-slate-950/80 border border-amber-500/40 text-slate-100 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder-slate-600 text-center"
                      />
                      <button
                        type="submit"
                        className="w-full bg-amber-500 text-slate-950 font-extrabold text-xs py-2 px-4 rounded-xl hover:bg-amber-400 transition-all duration-300"
                      >
                        保存名次
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={startGame}
                      className="w-full max-w-[160px] bg-red-600 hover:bg-red-500 text-slate-100 font-bold py-2.5 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-red-900/30"
                    >
                      再次挑战
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Inline Action Controls on Dashboard for Quick State Tuning */}
          <div className="flex gap-2.5 mt-5">
            {status === 'PLAYING' && (
              <button
                onClick={handlePauseToggle}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-100 py-2 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition"
              >
                <Pause className="w-3.5 h-3.5" />
                暂停
              </button>
            )}
            
            {(status === 'PLAYING' || status === 'PAUSED') && (
              <button
                onClick={startGame}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-100 py-2 px-4 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                重开
              </button>
            )}
          </div>
        </section>

        {/* Right Side: Next Piece Preview & Leaderboard */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Next block preview card */}
          <article className="bg-slate-900/40 border border-slate-900/60 p-5 rounded-2xl flex flex-col items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono mb-4 w-full text-center">
              下一备选用砖 (Next Block)
            </h3>
            
            <div className="bg-slate-950/60 rounded-xl p-6 border border-slate-900 w-32 h-32 flex items-center justify-center relative shadow-inner">
              {/* Matrix sub board preview */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${nextPiece.matrix[0].length}, minmax(0, 1fr))`,
                  gap: '2px',
                }}
                className="justify-center items-center"
              >
                {nextPiece.matrix.map((row, r) =>
                  row.map((cell, c) => (
                    <div
                      key={`next-${r}-${c}`}
                      className={`w-5 h-5 rounded-[4px] border ${
                        cell !== 0 ? nextPiece.color : 'border-transparent bg-transparent'
                      }`}
                    />
                  ))
                )}
              </div>
            </div>
            
            <p className="text-[10px] text-slate-500 font-mono mt-3">
              方块类型: Shape - {nextPiece.type}
            </p>
          </article>

          {/* Scores Leaderboard Card */}
          <article className="flex-1 min-h-[300px]">
            <Leaderboard
              entries={leaderboard}
              onClear={handleClearBoard}
              currentUserId={currentGameRecordId}
            />
          </article>
        </section>
      </main>

      {/* Floating Instructions Legend Overlay (if triggered) */}
      {showHelp && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 max-w-md w-full relative shadow-3xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 mb-4">
              <Keyboard className="w-5 h-5 text-amber-500" />
              游戏快捷操作说明
            </h3>
            
            <div className="space-y-3.5 text-xs text-slate-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold">向左移动:</span>
                <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-500 border border-slate-800">← 键 或 A</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold">向右移动:</span>
                <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-500 border border-slate-800">→ 键 或 D</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold">顺时针旋转:</span>
                <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-500 border border-slate-800">↑ 键 或 W</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold">软降落 (加速下落):</span>
                <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-500 border border-slate-800">↓ 键 或 S</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold">硬降落 (直接落地固定):</span>
                <span className="font-mono bg-slate-950 px-2.5 py-1 rounded text-emerald-500 border border-slate-800">空格键 (Space)</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold">暂停 / 继续:</span>
                <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-500 border border-slate-800">Esc 键 或 P</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold">重新启动:</span>
                <span className="font-mono bg-slate-950 px-2 py-1 rounded text-amber-500 border border-slate-800">R 键</span>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-2.5 px-4 rounded-xl transition duration-300 text-xs"
            >
              确 定
            </button>
          </div>
        </div>
      )}

      {/* Screen bottom Touch Controls for Responsive & Mobile Device support */}
      <footer className="w-full max-w-lg mt-2 mb-4 bg-slate-900/60 border border-slate-900 p-4 rounded-3xl flex flex-col gap-3">
        <span className="text-[10.5px] text-slate-500 uppercase font-mono tracking-widest text-center">
          Touch Control Panel (移动触屏控制器)
        </span>
        
        <div className="grid grid-cols-5 gap-2.5 items-center justify-center">
          {/* Left Arrow */}
          <button
            onClick={() => movePiece(-1)}
            disabled={status !== 'PLAYING'}
            className="aspect-square bg-slate-950/80 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none rounded-2xl flex items-center justify-center transition active:scale-90"
            title="左移"
          >
            <ArrowBigLeft className="w-6 h-6" />
          </button>

          {/* Rotate key */}
          <button
            onClick={rotatePiece}
            disabled={status !== 'PLAYING'}
            className="aspect-square bg-slate-950/80 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-amber-500 disabled:opacity-30 disabled:pointer-events-none rounded-2xl flex items-center justify-center transition active:scale-90"
            title="顺时针旋转"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Soft Down key */}
          <button
            onClick={moveDown}
            disabled={status !== 'PLAYING'}
            className="aspect-square bg-slate-950/80 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none rounded-2xl flex items-center justify-center transition active:scale-90"
            title="下落"
          >
            <ArrowBigDown className="w-6 h-6" />
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => movePiece(1)}
            disabled={status !== 'PLAYING'}
            className="aspect-square bg-slate-950/80 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none rounded-2xl flex items-center justify-center transition active:scale-90"
            title="右移"
          >
            <ArrowBigRight className="w-6 h-6" />
          </button>

          {/* Hard Drop Space equivalent */}
          <button
            onClick={hardDrop}
            disabled={status !== 'PLAYING'}
            className="aspect-square bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-30 disabled:pointer-events-none rounded-2xl flex items-center justify-center transition active:scale-90"
            title="一键直落"
          >
            <ChevronsDown className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
