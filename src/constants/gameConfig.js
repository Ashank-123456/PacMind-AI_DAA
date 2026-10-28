/**
 * @file gameConfig.js
 * @description Centralized configuration parameters, theme design tokens,
 * scoring system, and animation physics for the Pac-Man AI simulation.
 */

/**
 * Grid Dimension Constants
 */
export const GRID_CONFIG = {
  ROWS: 19,
  COLS: 21,
  CELL_SIZE: 30, // Base pixel size per tile on 1x display
  get CANVAS_WIDTH() {
    return this.COLS * this.CELL_SIZE; // 630px
  },
  get CANVAS_HEIGHT() {
    return this.ROWS * this.CELL_SIZE; // 570px
  },
};

/**
 * Tile Type Enumeration
 * Representing semantic values in the maze matrix.
 */
export const TILE_TYPES = Object.freeze({
  EMPTY: 0,
  WALL: 1,
  PELLET: 2,
  POWER_PELLET: 3,
  GHOST_DOOR: 4, // Ghosts can cross; Pac-Man cannot
});

/**
 * Default Entity Starting Coordinates
 */
export const ENTITY_START_POSITIONS = Object.freeze({
  PACMAN: { row: 17, col: 10 },
  GHOST_EXIT_TARGET: { row: 4, col: 10 },
});

/**
 * Ghost Entity Definitions and AI Personalities
 */
export const GHOST_PROFILES = Object.freeze([
  {
    id: 'blinky',
    name: 'Blinky',
    color: '#ef4444', // Red
    glowColor: 'rgba(239, 68, 68, 0.6)',
    role: 'Shadow / Aggressive Chaser',
    description: 'Relentlessly paths directly to Pac-Man using BFS shortest-path targeting.',
    startRow: 8,
    startCol: 9,
    exitDelaySeconds: 0,
    baseSpeed: 5.6,
  },
  {
    id: 'pinky',
    name: 'Pinky',
    color: '#f472b6', // Pink
    glowColor: 'rgba(244, 114, 182, 0.6)',
    role: 'Speedy / Ambush Tracker',
    description: 'Exits early from the house to flank Pac-Man from intersecting corridors.',
    startRow: 8,
    startCol: 11,
    exitDelaySeconds: 2.2,
    baseSpeed: 5.6,
  },
  {
    id: 'inky',
    name: 'Inky',
    color: '#06b6d4', // Cyan
    glowColor: 'rgba(6, 182, 212, 0.6)',
    role: 'Bashful / Dual Trapper',
    description: 'Coordinates pathing based on Pac-Man proximity and team positions.',
    startRow: 9,
    startCol: 9,
    exitDelaySeconds: 4.5,
    baseSpeed: 5.6,
  },
  {
    id: 'clyde',
    name: 'Clyde',
    color: '#f97316', // Orange
    glowColor: 'rgba(249, 115, 22, 0.6)',
    role: 'Pokey / Feigned Wanderer',
    description: 'Alternates between chasing Pac-Man and retreating to corner patrol zones.',
    startRow: 9,
    startCol: 11,
    exitDelaySeconds: 6.8,
    baseSpeed: 5.6,
  },
]);

/**
 * Arcade Scoring System Values
 */
export const SCORING_RULES = Object.freeze({
  PELLET_VALUE: 10,
  POWER_PELLET_VALUE: 50,
  BASE_GHOST_VALUE: 200, // Multiplies by 2 for each subsequent ghost eaten in a single power cycle
});

/**
 * Frightened Mode Settings
 */
export const FRIGHTENED_SETTINGS = Object.freeze({
  DURATION_SECONDS: 6.5,
  GHOST_SPEED_RATIO: 0.62, // Ghosts slow down when vulnerable
  FLASH_WARNING_THRESHOLD_SECONDS: 2.0, // Flash white warning before returning to chase
});

/**
 * Minimalist Futuristic Color Palette
 */
export const COLOR_PALETTE = Object.freeze({
  BG_CANVAS: '#08090d',
  WALL_FILL: '#0d101a',
  WALL_STROKE: '#25447a',
  WALL_GLOW: 'rgba(56, 130, 246, 0.45)',
  PELLET: '#fbbf24',
  PELLET_GLOW: 'rgba(251, 191, 36, 0.6)',
  POWER_PELLET: '#ffffff',
  POWER_GLOW: 'rgba(255, 255, 255, 0.9)',
  GHOST_DOOR: '#ec4899',
  PACMAN: '#facc15',
  PACMAN_GLOW: 'rgba(250, 204, 21, 0.5)',
  PATH_PACMAN: '#10b981',
  PATH_PACMAN_GLOW: 'rgba(16, 185, 129, 0.6)',
  PATH_FRIGHTENED: '#6366f1',
  DANGER_AURA: 'rgba(239, 68, 68, 0.22)',
});
