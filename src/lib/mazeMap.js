/**
 * @file mazeMap.js
 * @description Standard 21x19 Pac-Man maze matrix representation, corner targets,
 * and helper query utilities with comprehensive documentation.
 */

import { GRID_CONFIG, TILE_TYPES } from '@/constants/gameConfig';

const { ROWS, COLS } = GRID_CONFIG;
const { EMPTY, WALL, PELLET, POWER_PELLET, GHOST_DOOR } = TILE_TYPES;

/**
 * Static 2D matrix representing the primary maze.
 * Dimensions: 21 columns wide by 19 rows high.
 *
 * Legend:
 * 0 = Empty navigable corridor
 * 1 = Solid wall boundary
 * 2 = Regular food pellet
 * 3 = Energizer power pellet
 * 4 = One-way ghost pen access door
 */
export const PRIMARY_MAZE_MAP = [
  // 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], // 0
  [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1 ], // 1
  [ 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1 ], // 2
  [ 1, 3, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1 ], // 3 (Power Pellet)
  [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1 ], // 4 (Full horizontal transit)
  [ 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 0, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1 ], // 5 (Ghost exit column)
  [ 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 0, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1 ], // 6 (Ghost exit column)
  [ 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 4, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1 ], // 7 (Ghost Door at col 10)
  [ 1, 1, 1, 1, 1, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 2, 1, 1, 1, 1, 1 ], // 8 (Ghost House)
  [ 1, 1, 1, 1, 1, 2, 1, 1, 1, 0, 0, 0, 1, 1, 1, 2, 1, 1, 1, 1, 1 ], // 9 (Ghost House)
  [ 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1 ], // 10 (Ghost House bottom wall)
  [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1 ], // 11
  [ 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1, 1, 1, 2, 1 ], // 12
  [ 1, 3, 2, 1, 1, 2, 2, 2, 2, 2, 0, 2, 2, 2, 2, 2, 1, 1, 2, 3, 1 ], // 13 (Power Pellet)
  [ 1, 1, 2, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 2, 1, 1 ], // 14
  [ 1, 2, 2, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 1, 2, 2, 2, 2, 2, 1 ], // 15
  [ 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1 ], // 16
  [ 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1 ], // 17 (Pac-Man start row)
  [ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ], // 18
];

/**
 * Scatter Corner Destinations used by Ghosts during frightened/scatter modes.
 */
export const SCATTER_CORNERS = Object.freeze([
  { row: 1, col: 1 },
  { row: 1, col: 19 },
  { row: 17, col: 1 },
  { row: 17, col: 19 },
]);

/**
 * Creates a fresh deep-clone of the base maze matrix.
 * @returns {number[][]} Fresh 2D maze grid
 */
export function createFreshMazeGrid() {
  return PRIMARY_MAZE_MAP.map(row => [...row]);
}

/**
 * Counts the total number of collectable pellets on the grid.
 * @param {number[][]} grid - 2D grid
 * @returns {number} Total pellets + power pellets
 */
export function countCollectibles(grid) {
  let count = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (grid[r][c] === PELLET || grid[r][c] === POWER_PELLET) {
        count++;
      }
    }
  }
  return count;
}
