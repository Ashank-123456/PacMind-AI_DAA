/**
 * @file searchAlgorithms.js
 * @description Design and Analysis of Algorithms (DAA) Implementation.
 * Implements Adversarial Minimax Search with Alpha-Beta (α-β) Pruning for Pac-Man
 * and Breadth-First Search (BFS) for Ghost pursuit.
 */

import { GRID_CONFIG, TILE_TYPES } from '@/constants/gameConfig';

const { ROWS, COLS } = GRID_CONFIG;
const { WALL, GHOST_DOOR, PELLET, POWER_PELLET } = TILE_TYPES;

export const CARDINAL_DIRECTIONS = Object.freeze([
  [-1, 0], // Up
  [1, 0],  // Down
  [0, -1], // Left
  [0, 1],  // Right
]);

const toIndex = (row, col) => row * COLS + col;

export function manhattanDistance(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

/**
 * Evaluates the terminal or cutoff utility of a game state for Pac-Man (MAX).
 * Evaluation Function: Eval(s) = w1*Score - w2*Pellets - w3*PelletDist + w4*GhostDist + w5*FrightenedBonus
 */
export function evaluateGameState(maze, pacmanPos, ghosts, frightenedMode, score, pelletsLeft) {
  let minGhostDist = Infinity;
  let minFrightenedDist = Infinity;

  for (let i = 0; i < ghosts.length; i++) {
    const g = ghosts[i];
    if (g.mode === 'house') continue;
    const d = manhattanDistance(pacmanPos.row, pacmanPos.col, Math.round(g.row), Math.round(g.col));
    if (g.mode === 'frightened') {
      if (d < minFrightenedDist) minFrightenedDist = d;
    } else {
      if (d < minGhostDist) minGhostDist = d;
    }
  }

  // Fatal threat check
  if (minGhostDist <= 1) return -999999;
  if (minGhostDist === 2) return -50000;

  let frightenedBonus = 0;
  if (minFrightenedDist < Infinity) {
    frightenedBonus = 8000 / (minFrightenedDist + 1);
  }

  // Find distance to closest pellet
  let minPelletDist = 30;
  for (let r = Math.max(0, pacmanPos.row - 7); r <= Math.min(ROWS - 1, pacmanPos.row + 7); r++) {
    for (let c = Math.max(0, pacmanPos.col - 7); c <= Math.min(COLS - 1, pacmanPos.col + 7); c++) {
      if (maze[r][c] === PELLET || maze[r][c] === POWER_PELLET) {
        const d = manhattanDistance(pacmanPos.row, pacmanPos.col, r, c);
        if (d < minPelletDist) minPelletDist = d;
      }
    }
  }

  const ghostSafety = minGhostDist < 4 ? minGhostDist * 200 : 800;

  return (
    score * 15
    - pelletsLeft * 30
    - minPelletDist * 10
    + ghostSafety
    + frightenedBonus
  );
}

/**
 * Returns legal adjacent coordinates for an entity.
 */
function getLegalMoves(maze, pos, isGhost = false) {
  const moves = [];
  for (let i = 0; i < 4; i++) {
    const nr = pos.row + CARDINAL_DIRECTIONS[i][0];
    const nc = pos.col + CARDINAL_DIRECTIONS[i][1];
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
    const cell = maze[nr][nc];
    if (cell === WALL) continue;
    if (!isGhost && cell === GHOST_DOOR) continue;
    moves.push({ row: nr, col: nc, dir: CARDINAL_DIRECTIONS[i] });
  }
  return moves;
}

/**
 * Minimax Decision Engine with Alpha-Beta (α-β) Pruning.
 * Depth-limited recursive adversarial game tree search.
 *
 * @param {number[][]} maze
 * @param {{row: number, col: number}} pacman
 * @param {Array<object>} ghosts
 * @param {boolean} frightenedMode
 * @param {number} score
 * @param {number} pelletsLeft
 * @param {number} [maxDepth=3]
 * @returns {{
 *   bestMove: {row: number, col: number, dir: number[]},
 *   path: Array<{row: number, col: number}>,
 *   nodesExplored: number,
 *   pruneCount: number,
 *   timeMs: number,
 *   evalScore: number
 * }}
 */
export function findPathMinimax(maze, pacman, ghosts, frightenedMode, score, pelletsLeft, maxDepth = 3) {
  const t0 = performance.now();
  let nodesExplored = 0;
  let pruneCount = 0;

  const legalPacmanMoves = getLegalMoves(maze, pacman, false);
  if (legalPacmanMoves.length === 0) {
    return {
      bestMove: { row: pacman.row, col: pacman.col, dir: [0, 0] },
      path: [pacman],
      nodesExplored: 1,
      pruneCount: 0,
      timeMs: 0,
      evalScore: 0,
    };
  }

  // Active ghosts that participate in the adversarial min layers
  const activeGhosts = ghosts.filter(g => g.mode === 'chase' || g.mode === 'frightened');

  let bestValue = -Infinity;
  let bestMove = legalPacmanMoves[0];
  let alpha = -Infinity;
  const beta = Infinity;

  // Maximize across root Pac-Man actions
  for (let i = 0; i < legalPacmanMoves.length; i++) {
    const move = legalPacmanMoves[i];
    nodesExplored++;

    // Immediate death check
    let immediateDeath = false;
    for (const g of activeGhosts) {
      if (g.mode !== 'frightened' && Math.round(g.row) === move.row && Math.round(g.col) === move.col) {
        immediateDeath = true;
        break;
      }
    }
    if (immediateDeath) continue;

    const value = minValue(
      move,
      activeGhosts.map(g => ({ row: Math.round(g.row), col: Math.round(g.col), mode: g.mode })),
      maxDepth,
      0,
      alpha,
      beta
    );

    if (value > bestValue) {
      bestValue = value;
      bestMove = move;
    }
    alpha = Math.max(alpha, bestValue);
  }

  // Min-Value function (Ghost layer)
  function minValue(pacmanPos, currentGhosts, depth, ghostIndex, a, b) {
    nodesExplored++;

    // Check collision terminal
    for (let i = 0; i < currentGhosts.length; i++) {
      const g = currentGhosts[i];
      if (g.mode !== 'frightened' && g.row === pacmanPos.row && g.col === pacmanPos.col) {
        return -999999;
      }
    }

    // When all active ghosts have moved in this turn
    if (ghostIndex >= currentGhosts.length) {
      if (depth <= 1) {
        return evaluateGameState(maze, pacmanPos, currentGhosts, frightenedMode, score, pelletsLeft);
      }
      return maxValue(pacmanPos, currentGhosts, depth - 1, a, b);
    }

    const currentGhost = currentGhosts[ghostIndex];
    const ghostMoves = getLegalMoves(maze, currentGhost, true);

    if (ghostMoves.length === 0) {
      return minValue(pacmanPos, currentGhosts, depth, ghostIndex + 1, a, b);
    }

    let minVal = Infinity;
    for (let i = 0; i < ghostMoves.length; i++) {
      const gMove = ghostMoves[i];
      const nextGhosts = currentGhosts.map((g, idx) => idx === ghostIndex ? { ...g, row: gMove.row, col: gMove.col } : g);

      const val = minValue(pacmanPos, nextGhosts, depth, ghostIndex + 1, a, b);
      minVal = Math.min(minVal, val);

      if (minVal <= a) {
        pruneCount++;
        return minVal; // Alpha-Beta Prune!
      }
      b = Math.min(b, minVal);
    }
    return minVal;
  }

  // Max-Value function (Pac-Man layer)
  function maxValue(pacmanPos, currentGhosts, depth, a, b) {
    nodesExplored++;

    const moves = getLegalMoves(maze, pacmanPos, false);
    if (moves.length === 0 || depth <= 0) {
      return evaluateGameState(maze, pacmanPos, currentGhosts, frightenedMode, score, pelletsLeft);
    }

    let maxVal = -Infinity;
    for (let i = 0; i < moves.length; i++) {
      const pMove = moves[i];
      const val = minValue(pMove, currentGhosts, depth, 0, a, b);
      maxVal = Math.max(maxVal, val);

      if (maxVal >= b) {
        pruneCount++;
        return maxVal; // Alpha-Beta Prune!
      }
      a = Math.max(a, maxVal);
    }
    return maxVal;
  }

  // Construct forward trajectory projection for the visualizer
  const path = [pacman, { row: bestMove.row, col: bestMove.col }];
  let simPos = { row: bestMove.row, col: bestMove.col };
  for (let step = 0; step < 4; step++) {
    const nextMoves = getLegalMoves(maze, simPos, false);
    if (nextMoves.length === 0) break;
    // Pick move furthest from dangerous ghosts
    let bestNext = nextMoves[0];
    let maxSafety = -Infinity;
    for (const nm of nextMoves) {
      const evalVal = evaluateGameState(maze, nm, ghosts, frightenedMode, score, pelletsLeft);
      if (evalVal > maxSafety) {
        maxSafety = evalVal;
        bestNext = nm;
      }
    }
    path.push({ row: bestNext.row, col: bestNext.col });
    simPos = bestNext;
  }

  const timeMs = +(performance.now() - t0).toFixed(2);

  return {
    bestMove,
    path,
    nodesExplored,
    pruneCount,
    timeMs,
    evalScore: Math.round(bestValue),
  };
}

/**
 * BFS Search for Ghost Pursuit
 */
export function findPathBFS(maze, start, goal, isGhost = true) {
  const t0 = performance.now();
  if (!start || !goal) return { path: [], nodesExplored: 0, timeMs: 0 };
  if (start.row === goal.row && start.col === goal.col) {
    return { path: [start], nodesExplored: 1, timeMs: 0 };
  }

  const sKey = toIndex(start.row, start.col);
  const gKey = toIndex(goal.row, goal.col);

  const queue = [sKey];
  const visited = new Uint8Array(ROWS * COLS);
  const parentMap = new Int16Array(ROWS * COLS).fill(-1);

  visited[sKey] = 1;
  let nodesExplored = 0;

  while (queue.length > 0) {
    const currentKey = queue.shift();
    nodesExplored++;

    if (currentKey === gKey) {
      const path = [];
      let cur = currentKey;
      while (cur !== -1) {
        path.unshift({ row: Math.floor(cur / COLS), col: cur % COLS });
        if (cur === sKey) break;
        cur = parentMap[cur];
      }
      return { path, nodesExplored, timeMs: +(performance.now() - t0).toFixed(2) };
    }

    const row = Math.floor(currentKey / COLS);
    const col = currentKey % COLS;

    for (let i = 0; i < 4; i++) {
      const nextRow = row + CARDINAL_DIRECTIONS[i][0];
      const nextCol = col + CARDINAL_DIRECTIONS[i][1];

      if (nextRow < 0 || nextRow >= ROWS || nextCol < 0 || nextCol >= COLS) continue;
      const cell = maze[nextRow][nextCol];
      if (cell === WALL) continue;
      if (!isGhost && cell === GHOST_DOOR) continue;

      const nextKey = toIndex(nextRow, nextCol);
      if (!visited[nextKey]) {
        visited[nextKey] = 1;
        parentMap[nextKey] = currentKey;
        queue.push(nextKey);
      }
    }
  }

  return { path: [], nodesExplored, timeMs: +(performance.now() - t0).toFixed(2) };
}
