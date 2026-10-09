import { MusicTrack } from './utils/helper';
import { LevelConfig } from './types';

/** Game configuration schema following mandatory Playground standards. */
export const CONFIG = {
  // --- Game ---
  title: {
    value: 'One More Step',
    type: 'string',
    label: 'Game Title',
    group: 'Game',
  },
  baseCanvasWidth: {
    value: 800,
    type: 'number',
    label: 'Base Canvas Width',
    group: 'Game',
  },
  baseCanvasHeight: {
    value: 600,
    type: 'number',
    label: 'Base Canvas Height',
    group: 'Game',
  },

  // --- Theme ---
  backgroundColor: {
    value: '#080b11',
    type: 'color',
    label: 'Background Color',
    group: 'Theme',
  },
  primaryColor: {
    value: '#06b6d4',
    type: 'color',
    label: 'Primary Accent Color',
    group: 'Theme',
  },
  fontFamily: {
    value: 'Inter, system-ui, sans-serif',
    type: 'string',
    label: 'Font Family',
    group: 'Theme',
  },

  // --- Camera ---
  fov: {
    value: 45,
    type: 'number',
    label: 'Field of View',
    group: 'Camera',
    min: 30,
    max: 75,
    step: 1,
  },
  cameraAngle: {
    value: 56,
    type: 'number',
    label: 'Camera Tilt Angle',
    group: 'Camera',
    min: 30,
    max: 80,
    step: 2,
  },
  cameraDistance: {
    value: 14,
    type: 'number',
    label: 'Camera Distance',
    group: 'Camera',
    min: 8,
    max: 24,
    step: 1,
  },

  // --- Lighting & Visuals ---
  ambientIntensity: {
    value: 1.8,
    type: 'number',
    label: 'Ambient Intensity',
    group: 'Visuals',
    min: 0.5,
    max: 4.0,
    step: 0.1,
  },
  sunIntensity: {
    value: 4.0,
    type: 'number',
    label: 'Sun Intensity',
    group: 'Visuals',
    min: 1.0,
    max: 8.0,
    step: 0.5,
  },
  hemiSkyColor: {
    value: '#38bdf8',
    type: 'color',
    label: 'Hemisphere Sky Color',
    group: 'Visuals',
  },
  hemiGroundColor: {
    value: '#1e1b4b',
    type: 'color',
    label: 'Hemisphere Ground Color',
    group: 'Visuals',
  },
  hemiIntensity: {
    value: 0.8,
    type: 'number',
    label: 'Hemisphere Intensity',
    group: 'Visuals',
    min: 0.2,
    max: 2.0,
    step: 0.1,
  },

  // --- Gameplay Rules & Tuning ---
  playerMoveSpeed: {
    value: 10,
    type: 'number',
    label: 'Player Glide Speed',
    group: 'Rules',
    min: 4,
    max: 18,
    step: 1,
  },
  enableSwipeControls: {
    value: true,
    type: 'boolean',
    label: 'Enable Mobile Swipes',
    group: 'Rules',
  },
  tileDropSpeed: {
    value: 4.0,
    type: 'number',
    label: 'Tile Dissolve Speed',
    group: 'Rules',
    min: 1.0,
    max: 8.0,
    step: 0.5,
  },

  // --- System ---
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'System',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'System',
  },
  maxSubSteps: {
    value: 5,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'System',
  },

  // --- Audio ---
  defaultMusicVolume: {
    value: 0.4,
    type: 'number',
    label: 'Default Music Volume',
    group: 'Audio',
    min: 0,
    max: 1,
    step: 0.05,
  },
  defaultSfxVolume: {
    value: 0.7,
    type: 'number',
    label: 'Default SFX Volume',
    group: 'Audio',
    min: 0,
    max: 1,
    step: 0.05,
  },
};

// Merge customized config values if present (injected by Playground)
const { playgroundConfig } = globalThis as {
  playgroundConfig?: Record<string, unknown>;
};
if (playgroundConfig) {
  for (const [key, value] of Object.entries(playgroundConfig)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], { value });
    }
  }
}

/** Type helper for reading values in game code. */
export type ConfigKey = keyof typeof CONFIG;

/**
 * Gets a configuration value by key.
 * @param key The configuration key.
 * @return The configuration value.
 */
export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

/** Five Handcrafted, Progressively Challenging Puzzle Levels */
export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: 'First Step',
    subtitle: 'Every tile you step off vanishes.',
    cols: 4,
    rows: 4,
    start: { x: 0, z: 0 },
    exit: { x: 3, z: 3 },
    targetMoves: 6,
    hint: 'Move right then down to reach the glowing green beacon.',
    layout: [
      [1, 1, 1, 2],
      [2, 2, 1, 2],
      [2, 2, 1, 1],
      [2, 2, 2, 3],
    ],
  },
  {
    id: 2,
    name: 'The Fork',
    subtitle: 'One way leads forward, dead ends will trap you.',
    cols: 5,
    rows: 5,
    start: { x: 0, z: 2 },
    exit: { x: 4, z: 2 },
    targetMoves: 8,
    hint: 'Loop around the obsidian walls to reach the other side.',
    layout: [
      [1, 1, 1, 1, 1],
      [1, 2, 2, 2, 1],
      [1, 2, 0, 2, 3],
      [1, 2, 2, 2, 1],
      [1, 1, 1, 1, 1],
    ],
  },
  {
    id: 3,
    name: 'Island Bridge',
    subtitle: 'Chokepoints require precise directional commitment.',
    cols: 5,
    rows: 5,
    start: { x: 0, z: 0 },
    exit: { x: 4, z: 4 },
    targetMoves: 8,
    hint: 'Cross the central causeway without revisiting tiles.',
    layout: [
      [1, 1, 2, 1, 1],
      [2, 1, 1, 1, 2],
      [2, 2, 1, 2, 2],
      [2, 1, 1, 1, 2],
      [1, 1, 2, 1, 3],
    ],
  },
  {
    id: 4,
    name: 'The Spiral',
    subtitle: 'Concentric paths lock behind your footprint.',
    cols: 6,
    rows: 6,
    start: { x: 0, z: 0 },
    exit: { x: 2, z: 3 },
    targetMoves: 16,
    hint: 'Weave along the outer ring before stepping inward.',
    layout: [
      [1, 1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2, 1],
      [1, 1, 1, 1, 2, 1],
      [1, 2, 3, 1, 2, 1],
      [1, 2, 2, 2, 2, 1],
      [1, 1, 1, 1, 1, 1],
    ],
  },
  {
    id: 5,
    name: 'Grand Labyrinth',
    subtitle: 'The ultimate spatial trial with dual branching lanes.',
    cols: 7,
    rows: 7,
    start: { x: 0, z: 3 },
    exit: { x: 6, z: 3 },
    targetMoves: 14,
    hint: 'Plan your serpentine path across the interlocking corridors.',
    layout: [
      [2, 1, 1, 1, 1, 1, 2],
      [1, 1, 2, 2, 2, 1, 1],
      [1, 2, 1, 1, 1, 2, 1],
      [1, 2, 1, 2, 1, 2, 3],
      [1, 2, 1, 1, 1, 2, 1],
      [1, 1, 2, 2, 2, 1, 1],
      [2, 1, 1, 1, 1, 1, 2],
    ],
  },
];

/** Background music tracks available for the game to use. */
export const AVAILABLE_MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    name: 'automated_dream',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/automated_dream.mp3',
    description: 'An intellectually stimulating track with a calm feel, ideal for spatial puzzles.',
  },
  {
    name: 'chrome_cobblestone',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/chrome_cobblestone.mp3',
    description: 'A smooth track with a slightly industrial focus sound.',
  },
];
