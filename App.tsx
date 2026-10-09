// tslint:disable
/* eslint-disable */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RotateCcw,
  Play,
  Volume2,
  VolumeX,
  Music,
  HelpCircle,
  Trophy,
  ArrowRight,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Zap,
} from 'lucide-react';
import Game from './Game';
import { CONFIG, getConfig, LEVELS, AVAILABLE_MUSIC_TRACKS } from './constants';
import { GameState, LevelConfig } from './types';
import { gameAudio, MenuOverlay, useIsMobile, useAutoFocus } from './utils/helper';
import { BackgroundMusic } from './utils/BackgroundMusic';
import { usePlayground, usePlaygroundGameLifecycle } from './utils/usePlayground';

export default function App() {
  const isMobile = useIsMobile();
  const { sdk } = usePlayground();

  // Primary Game State
  const [gameState, setGameState] = useState<GameState>({
    status: 'START',
    score: 0,
    level: 1,
    moves: 0,
    targetMoves: LEVELS[0].targetMoves,
    isGold: false,
    isTrapped: false,
  });

  // Level Progression & Tile Tracking
  const [currentLevelIndex, setCurrentLevelIndex] = useState<number>(0);
  const currentLevel: LevelConfig = LEVELS[currentLevelIndex] || LEVELS[0];
  const [playerPos, setPlayerPos] = useState<{ x: number; z: number }>({
    x: currentLevel.start.x,
    z: currentLevel.start.z,
  });
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(new Set());
  const [animating, setAnimating] = useState<boolean>(false);
  const [levelScores, setLevelScores] = useState<Record<number, { moves: number; isGold: boolean }>>({});

  // Menu and Audio Overlays
  const [isGameMenuOpen, setIsGameMenuOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isSfxMuted, setIsSfxMuted] = useState<boolean>(() => gameAudio.getMuteState());
  const [isMusicMuted, setIsMusicMuted] = useState<boolean>(false);

  // Focus ref for primary buttons
  const startButtonRef = useAutoFocus<HTMLButtonElement>(gameState.status === 'START');
  const nextLevelButtonRef = useAutoFocus<HTMLButtonElement>(gameState.status === 'LEVEL_COMPLETE');
  const playAgainButtonRef = useAutoFocus<HTMLButtonElement>(gameState.status === 'VICTORY');

  // Swipe gesture detection state
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Sync lifecycle with external Playground SDK
  usePlaygroundGameLifecycle(gameState, sdk);

  // Set canHandleBackKey for iframe environment
  useEffect(() => {
    (window as unknown as Record<string, unknown>).canHandleBackKey = [
      'PLAYING',
      'PAUSED',
    ].includes(gameState.status);
  }, [gameState.status]);

  // Check if position has valid next moves
  const checkIsTrapped = useCallback(
    (pos: { x: number; z: number }, visited: Set<string>, level: LevelConfig): boolean => {
      const neighbors = [
        { x: pos.x + 1, z: pos.z },
        { x: pos.x - 1, z: pos.z },
        { x: pos.x, z: pos.z + 1 },
        { x: pos.x, z: pos.z - 1 },
      ];

      const hasValidMove = neighbors.some((n) => {
        if (n.x < 0 || n.x >= level.cols || n.z < 0 || n.z >= level.rows) return false;
        const tileType = level.layout[n.z][n.x];
        if (tileType === 0 || tileType === 2) return false; // VOID or WALL
        if (visited.has(`${n.x},${n.z}`)) return false; // Already deactivated
        return true;
      });

      return !hasValidMove;
    },
    [],
  );

  // Initialize or Reset a Level
  const initLevel = useCallback(
    (levelIdx: number) => {
      const lvl = LEVELS[levelIdx] || LEVELS[0];
      setCurrentLevelIndex(levelIdx);
      setPlayerPos({ x: lvl.start.x, z: lvl.start.z });
      setVisitedTiles(new Set());
      setAnimating(false);
      setIsGameMenuOpen(false);
      setIsHowToPlayOpen(false);

      setGameState((prev) => ({
        ...prev,
        status: 'PLAYING',
        level: lvl.id,
        moves: 0,
        targetMoves: lvl.targetMoves,
        isGold: false,
        isTrapped: false,
      }));
    },
    [],
  );

  // Start the entire game from level 1
  const handleStartGame = () => {
    gameAudio.playCrispClick();
    if (sdk && typeof sdk.startGame === 'function') {
      sdk.startGame();
    }
    setLevelScores({});
    initLevel(0);
  };

  // Instant Reset current level
  const handleRestartLevel = () => {
    gameAudio.playCrispClick();
    initLevel(currentLevelIndex);
  };

  // Advance to next level or Victory
  const handleNextLevel = () => {
    gameAudio.playConfirmSelect();
    if (currentLevelIndex + 1 < LEVELS.length) {
      initLevel(currentLevelIndex + 1);
    } else {
      setGameState((prev) => ({
        ...prev,
        status: 'VICTORY',
      }));
      gameAudio.playVictoryFanfare();
    }
  };

  // Core movement step logic
  const handleMove = useCallback(
    (dx: number, dz: number) => {
      if (gameState.status !== 'PLAYING' || isGameMenuOpen || isHowToPlayOpen) return;

      const targetX = playerPos.x + dx;
      const targetZ = playerPos.z + dz;

      // Bounds validation
      if (
        targetX < 0 ||
        targetX >= currentLevel.cols ||
        targetZ < 0 ||
        targetZ >= currentLevel.rows
      ) {
        gameAudio.playErrorBuzz();
        return;
      }

      const targetTileType = currentLevel.layout[targetZ][targetX];

      // Void (0) or Wall (2) validation
      if (targetTileType === 0 || targetTileType === 2) {
        gameAudio.playErrorBuzz();
        return;
      }

      // Visited / Inactive tile validation
      const targetKey = `${targetX},${targetZ}`;
      if (visitedTiles.has(targetKey)) {
        gameAudio.playErrorBuzz();
        return;
      }

      // Mark the tile player is stepping OFF of as deactivated
      const departingKey = `${playerPos.x},${playerPos.z}`;
      const nextVisited = new Set(visitedTiles);
      nextVisited.add(departingKey);
      setVisitedTiles(nextVisited);

      const nextMoves = gameState.moves + 1;
      setPlayerPos({ x: targetX, z: targetZ });
      gameAudio.playFootstepStone();

      // Check if reached exit
      if (targetX === currentLevel.exit.x && targetZ === currentLevel.exit.z) {
        const isGold = nextMoves <= currentLevel.targetMoves;
        const levelBonus = isGold
          ? 1000 + (currentLevel.targetMoves - nextMoves) * 100
          : 500;
        const nextScore = gameState.score + levelBonus;

        setLevelScores((prev) => ({
          ...prev,
          [currentLevel.id]: { moves: nextMoves, isGold },
        }));

        setGameState((prev) => ({
          ...prev,
          moves: nextMoves,
          score: nextScore,
          isGold,
          status: 'LEVEL_COMPLETE',
        }));

        if (isGold) {
          gameAudio.playLevelUpStinger();
        } else {
          gameAudio.playConfirmSelect();
        }
        return;
      }

      // Check if trapped
      const isTrapped = checkIsTrapped(
        { x: targetX, z: targetZ },
        nextVisited,
        currentLevel,
      );

      setGameState((prev) => ({
        ...prev,
        moves: nextMoves,
        isTrapped,
      }));

      if (isTrapped) {
        gameAudio.playDefeatMotif();
      }
    },
    [
      gameState.status,
      gameState.moves,
      gameState.score,
      isGameMenuOpen,
      isHowToPlayOpen,
      playerPos,
      currentLevel,
      visitedTiles,
      checkIsTrapped,
    ],
  );

  // Keyboard navigation & Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Menu on Escape
      if (e.key === 'Escape') {
        if (gameState.status === 'PLAYING') {
          setIsGameMenuOpen((prev) => !prev);
          setIsHowToPlayOpen(false);
          gameAudio.playCrispClick();
        }
        return;
      }

      // Quick restart on 'r' or 'R'
      if ((e.key === 'r' || e.key === 'R') && gameState.status === 'PLAYING') {
        handleRestartLevel();
        return;
      }

      // Movement keys
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          handleMove(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          handleMove(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleMove(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          handleMove(1, 0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState.status, handleMove]);

  // Touch Swipe Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || e.changedTouches.length === 0) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const minSwipeDist = 24;

    if (absDx < minSwipeDist && absDy < minSwipeDist) return;

    if (absDx > absDy) {
      if (dx > 0) handleMove(1, 0);
      else handleMove(-1, 0);
    } else {
      if (dy > 0) handleMove(0, 1);
      else handleMove(0, -1);
    }
  };

  return (
    <div
      className="fixed inset-0 overflow-hidden touch-none flex flex-col bg-[#080b11] text-white font-sans select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}>
      {/* Background Music Player */}
      <BackgroundMusic
        url={AVAILABLE_MUSIC_TRACKS[0].url}
        isPlaying={gameState.status === 'PLAYING' && !isGameMenuOpen}
        isMuted={isMusicMuted}
      />

      {/* Top HUD Bar (Only during active gameplay) */}
      {gameState.status === 'PLAYING' && (
        <header className="w-full flex items-center justify-between px-3 py-2 bg-slate-900/90 backdrop-blur border-b border-slate-800 z-20">
          {/* Left: Level and Move info */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-cyan-400">
                Level {currentLevel.id} / {LEVELS.length}
              </span>
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px] sm:max-w-none">
                {currentLevel.name}
              </span>
            </div>

            <div className="h-6 w-[1px] bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2 bg-slate-950/80 px-2 py-1 rounded border border-slate-800">
              <span className="text-[11px] text-slate-400">Moves:</span>
              <span
                className={`text-xs font-mono font-bold ${
                  gameState.moves <= currentLevel.targetMoves
                    ? 'text-amber-400'
                    : 'text-slate-300'
                }`}>
                {gameState.moves}
              </span>
              <span className="text-[10px] text-slate-500">
                / {currentLevel.targetMoves} (Gold)
              </span>
            </div>

            <button
              onClick={handleRestartLevel}
              title="Restart Level (R)"
              className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs transition-colors min-h-[32px]">
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Reset (R)</span>
            </button>
          </div>

          {/* Right: Dedicated Menu Button */}
          <button
            onClick={() => {
              gameAudio.playCrispClick();
              setIsGameMenuOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-200 text-xs font-semibold tracking-wide flex items-center gap-1.5 transition-colors min-h-[36px]">
            <span>MENU</span>
          </button>
        </header>
      )}

      {/* Trapped Banner Alert */}
      {gameState.status === 'PLAYING' && gameState.isTrapped && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-950/90 border border-rose-500/60 text-rose-200 shadow-lg text-xs animate-bounce">
          <Zap className="w-4 h-4 text-rose-400" />
          <span>No valid steps left!</span>
          <button
            onClick={handleRestartLevel}
            className="ml-1 underline font-bold text-white hover:text-rose-200">
            Restart [R]
          </button>
        </div>
      )}

      {/* 3D WebGL Canvas Container */}
      <main className="flex-1 w-full min-h-0 relative flex items-center justify-center">
        <Game
          gameState={gameState}
          currentLevel={currentLevel}
          playerPos={playerPos}
          visitedTiles={visitedTiles}
          animating={animating}
          isPaused={isGameMenuOpen || isHowToPlayOpen}
        />
      </main>

      {/* Mobile Virtual D-Pad Touch Controls */}
      {isMobile && gameState.status === 'PLAYING' && (
        <div className="absolute bottom-6 right-8 z-30 pointer-events-auto flex flex-col items-center gap-1 bg-slate-950/60 p-2 rounded-2xl border border-slate-800/80 backdrop-blur-sm">
          <button
            onPointerDown={() => handleMove(0, -1)}
            aria-label="Move Up"
            className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-slate-800/90 active:bg-cyan-600 border border-slate-700 flex items-center justify-center text-white active:scale-95 transition-transform touch-none shadow-md">
            <ChevronUp className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button
              onPointerDown={() => handleMove(-1, 0)}
              aria-label="Move Left"
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-slate-800/90 active:bg-cyan-600 border border-slate-700 flex items-center justify-center text-white active:scale-95 transition-transform touch-none shadow-md">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => handleMove(0, 1)}
              aria-label="Move Down"
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-slate-800/90 active:bg-cyan-600 border border-slate-700 flex items-center justify-center text-white active:scale-95 transition-transform touch-none shadow-md">
              <ChevronDown className="w-6 h-6" />
            </button>
            <button
              onPointerDown={() => handleMove(1, 0)}
              aria-label="Move Right"
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-xl bg-slate-800/90 active:bg-cyan-600 border border-slate-700 flex items-center justify-center text-white active:scale-95 transition-transform touch-none shadow-md">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* START / TITLE OVERLAY */}
      {gameState.status === 'START' && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-sm flex flex-col items-center bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-3">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>

            <h1 className="text-2xl font-black tracking-wider text-white mb-1">
              ONE MORE STEP
            </h1>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              Every tile you step off deactivates forever. Plan your route to reach the exit beacon without trapping yourself.
            </p>

            <div className="w-full bg-slate-950/80 rounded-xl p-3 border border-slate-800 mb-5 text-left text-xs space-y-1.5 text-slate-300">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>Move: <strong>WASD</strong>, <strong>Arrow Keys</strong> or <strong>Swipes</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Goal: Reach the glowing <strong>Exit Beacon</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Award: Meet <strong>Target Moves</strong> for Gold</span>
              </div>
            </div>

            <button
              ref={startButtonRef}
              autoFocus
              onClick={handleStartGame}
              className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg hover:shadow-cyan-500/30 flex items-center justify-center gap-2">
              <Play className="w-4 h-4 fill-current" />
              START PUZZLE
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* LEVEL COMPLETE OVERLAY */}
      {gameState.status === 'LEVEL_COMPLETE' && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-sm flex flex-col items-center bg-slate-900 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-2xl text-center">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                gameState.isGold
                  ? 'bg-amber-500/20 border border-amber-400 text-amber-400'
                  : 'bg-emerald-500/20 border border-emerald-400 text-emerald-400'
              }`}>
              <Award className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-black text-white mb-1">
              LEVEL {currentLevel.id} CLEAR!
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {currentLevel.name}
            </p>

            <div className="w-full bg-slate-950/90 rounded-xl p-3 border border-slate-800 mb-5 flex justify-around items-center">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 uppercase">Your Moves</span>
                <span className="text-lg font-mono font-bold text-white">
                  {gameState.moves}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 uppercase">Gold Target</span>
                <span className="text-lg font-mono font-bold text-amber-400">
                  {currentLevel.targetMoves}
                </span>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-slate-400 uppercase">Rating</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    gameState.isGold
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                  {gameState.isGold ? '★ GOLD' : 'SILVER'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 w-full">
              <button
                onClick={handleRestartLevel}
                className="flex-1 min-h-[48px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5 transition-colors">
                <RotateCcw className="w-4 h-4" />
                Retry
              </button>

              <button
                ref={nextLevelButtonRef}
                autoFocus
                onClick={handleNextLevel}
                className="flex-[2] min-h-[48px] py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black tracking-wide flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all">
                <span>{currentLevelIndex + 1 < LEVELS.length ? 'Next Level' : 'Finish Run'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* VICTORY OVERLAY (All 5 levels completed) */}
      {gameState.status === 'VICTORY' && (
        <MenuOverlay tone="neutral" zIndex={50}>
          <div className="w-full max-w-sm flex flex-col items-center bg-slate-900 border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mb-3 text-amber-400 animate-pulse">
              <Trophy className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-black text-amber-300 mb-1">
              CHAMPION OF THE GRID!
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              You conquered all five spatial labyrinths of One More Step.
            </p>

            <div className="w-full bg-slate-950/90 rounded-xl p-3.5 border border-slate-800 mb-5 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Score:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {gameState.score} PTS
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Gold Stars:</span>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  {Object.values(levelScores).filter((s) => s.isGold).length} / {LEVELS.length}
                </span>
              </div>
            </div>

            <button
              ref={playAgainButtonRef}
              autoFocus
              onClick={handleStartGame}
              className="w-full min-h-[48px] py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm tracking-wide transition-all shadow-lg hover:shadow-amber-500/30 flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" />
              PLAY AGAIN
            </button>
          </div>
        </MenuOverlay>
      )}

      {/* GAME MENU OVERLAY */}
      {isGameMenuOpen && (
        <MenuOverlay tone="neutral" zIndex={40}>
          <div className="w-full max-w-sm flex flex-col items-center bg-slate-900 border-2 border-slate-700 rounded-2xl p-6 shadow-2xl text-center">
            <h2 className="text-xl font-black text-white mb-5 tracking-wide">
              PAUSED / GAME MENU
            </h2>

            <div className="flex flex-col gap-2.5 w-full mb-4">
              {/* Resume */}
              <button
                autoFocus
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsGameMenuOpen(false);
                }}
                className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-colors flex items-center justify-center gap-2">
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>

              {/* Audio Controls */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const next = gameAudio.toggleMute();
                    setIsSfxMuted(next);
                  }}
                  className={`min-h-[48px] py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isSfxMuted
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                  }`}>
                  {isSfxMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  SFX: {isSfxMuted ? 'Off' : 'On'}
                </button>

                <button
                  onClick={() => setIsMusicMuted((prev) => !prev)}
                  className={`min-h-[48px] py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                    isMusicMuted
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-slate-800 text-cyan-300 border-cyan-500/50'
                  }`}>
                  <Music className="w-4 h-4" />
                  Music: {isMusicMuted ? 'Off' : 'On'}
                </button>
              </div>

              {/* Retry Level */}
              <button
                onClick={() => {
                  handleRestartLevel();
                  setIsGameMenuOpen(false);
                }}
                className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
                <RotateCcw className="w-4 h-4" />
                Try Level Again
              </button>

              {/* How to Play Guide */}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsHowToPlayOpen(true);
                }}
                className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
                <HelpCircle className="w-4 h-4" />
                How to Play
              </button>

              {/* Quit to Main Menu */}
              <button
                onClick={() => {
                  gameAudio.playCrispClick();
                  setIsGameMenuOpen(false);
                  setIsHowToPlayOpen(false);
                  setGameState((prev) => ({ ...prev, status: 'START' }));
                }}
                className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center justify-center gap-2 transition-colors">
                Quit to Title
              </button>
            </div>
          </div>
        </MenuOverlay>
      )}

      {/* HOW TO PLAY GUIDE OVERLAY (Z-Index 1001) */}
      {isHowToPlayOpen && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[1001] overflow-y-auto touch-auto"
          style={{ zIndex: 1001 }}>
          <div className="w-full max-w-sm flex flex-col bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl text-left">
            <h3 className="text-lg font-black text-cyan-400 mb-3 text-center">
              RULES OF ENGAGEMENT
            </h3>

            <div className="space-y-3 text-xs text-slate-300 mb-5 leading-relaxed">
              <p>
                1. <strong>Tile Deactivation:</strong> As soon as you step off a tile, it sinks into the abyss and cannot be entered again.
              </p>
              <p>
                2. <strong>Solid Monoliths:</strong> Tall obsidian stone walls block movement entirely.
              </p>
              <p>
                3. <strong>Exit Beacon:</strong> Navigate to the luminous green pillar to clear each stage.
              </p>
              <p>
                4. <strong>Gold Rating:</strong> Finish the level in fewer or equal moves than the target count.
              </p>
            </div>

            <button
              autoFocus
              onClick={() => {
                gameAudio.playCrispClick();
                setIsHowToPlayOpen(false);
              }}
              className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wide transition-colors">
              Close Guide
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
