// tslint:disable
/* eslint-disable */
import type { GamePhase } from './utils/helper';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export type Position3D = [number, number, number];

export type TileType = 'FLOOR' | 'WALL' | 'VOID' | 'EXIT';

export interface LevelConfig {
  id: number;
  name: string;
  subtitle: string;
  cols: number;
  rows: number;
  start: { x: number; z: number };
  exit: { x: number; z: number };
  targetMoves: number;
  layout: number[][]; // 0: VOID, 1: FLOOR, 2: WALL, 3: EXIT
  hint: string;
}

export interface GridTileState {
  x: number;
  z: number;
  type: TileType;
  visited: boolean;
  sinkAnim: number; // 0 (normal) -> 1 (fully sunken)
}

export interface GameState {
  status: GamePhase;
  score: number;
  level: number;
  moves: number;
  targetMoves: number;
  isGold: boolean;
  isTrapped: boolean;
  canUndo?: boolean;
}
