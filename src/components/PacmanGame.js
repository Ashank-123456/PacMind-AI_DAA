'use client';

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import {
  GRID_CONFIG,
  TILE_TYPES,
  ENTITY_START_POSITIONS,
  GHOST_PROFILES,
  SCORING_RULES,
  FRIGHTENED_SETTINGS,
  COLOR_PALETTE,
} from '@/constants/gameConfig';
import { createFreshMazeGrid, countCollectibles } from '@/lib/mazeMap';
import {
  findPathMinimax,
  findPathBFS,
} from '@/lib/searchAlgorithms';
import { soundEffects } from '@/lib/soundEffects';

const { ROWS, COLS, CELL_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } = GRID_CONFIG;
const { EMPTY, WALL, PELLET, POWER_PELLET, GHOST_DOOR } = TILE_TYPES;
const { PACMAN: PACMAN_START, GHOST_EXIT_TARGET } = ENTITY_START_POSITIONS;

/**
 * Creates the initial clean simulation state.
 * @returns {object} Mutable state container for the continuous game loop
 */
function initializeSimulationState() {
  const maze = createFreshMazeGrid();
  const totalPellets = countCollectibles(maze);

  return {
    maze,
    totalPellets,
    pelletsLeft: totalPellets,
    score: 0,
    lives: 3,
    level: 1,
    phase: 'idle', // 'idle' | 'playing' | 'paused' | 'dying' | 'won' | 'gameover'
    dyingTimer: 0,
    frightenedTimer: 0,
    frightenedMode: false,
    ghostEatMultiplier: 1,

    // Continuous Sub-pixel Pac-Man
    pacman: {
      row: PACMAN_START.row,
      col: PACMAN_START.col,
      nextRow: PACMAN_START.row,
      nextCol: PACMAN_START.col,
      progress: 0,
      dir: { dr: 0, dc: -1 },
      path: [],
      target: null,
      speed: 6.2, // Base tiles per second
      mouthAngle: 0.2,
    },

    // Continuous Sub-pixel Ghost Agents
    ghosts: GHOST_PROFILES.map((profile, index) => ({
      ...profile,
      row: profile.startRow,
      col: profile.startCol,
      nextRow: profile.startRow,
      nextCol: profile.startCol,
      progress: 0,
      mode: 'house', // 'house' | 'exiting' | 'chase' | 'frightened'
      exitDelay: profile.exitDelaySeconds,
      frightTimer: 0,
      path: [],
      speed: profile.baseSpeed,
      houseBob: index * 0.8,
    })),

    // Real-time Profiling Telemetry
    telemetry: {
      minimaxNodes: 0,
      minimaxTimeMs: 0,
      bfsNodes: 0,
      bfsTimeMs: 0,
      fps: 60,
    },
  };
}

const PacmanGame = forwardRef(function PacmanGame({ onStateChange }, ref) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef(0);

  // Reactive UI state
  const [ui, setUi] = useState({
    score: 0,
    lives: 3,
    level: 1,
    pelletsLeft: 0,
    totalPellets: 0,
    phase: 'idle',
    frightened: false,
    frightTimer: 0,
    speedMultiplier: 1.2,
    showPaths: true,
    showDanger: false,
    soundEnabled: false,
    telemetry: { minimaxNodes: 0, minimaxTimeMs: 0, bfsTimeMs: 0, fps: 60 },
  });

  const uiRef = useRef(ui);
  useEffect(() => {
    uiRef.current = ui;
    soundEffects.setEnabled(ui.soundEnabled);
    if (onStateChange) {
      onStateChange({ phase: ui.phase, isPlaying: ui.phase === 'playing' });
    }
  }, [ui, onStateChange]);

  // ─── Reset Simulation ────────────────────────────────────────────────────
  const resetSimulation = useCallback(() => {
    const s = initializeSimulationState();
    stateRef.current = s;
    setUi(prev => ({
      ...prev,
      score: 0,
      lives: 3,
      level: 1,
      phase: 'idle',
      frightened: false,
      frightTimer: 0,
      pelletsLeft: s.totalPellets,
      totalPellets: s.totalPellets,
      telemetry: { minimaxNodes: 0, minimaxTimeMs: 0, bfsTimeMs: 0, fps: 60 },
    }));
  }, []);

  useEffect(() => {
    resetSimulation();
  }, [resetSimulation]);

  // Expose toggle control to parent navbar
  useImperativeHandle(ref, () => ({
    togglePlayPause() {
      toggleSimulation();
    },
  }));

  // ─── High-DPI / Retina Canvas Setup ──────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.floor(CANVAS_WIDTH * dpr);
    canvas.height = Math.floor(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
  }, []);

  // ─── Keyboard Hotkeys ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        toggleSimulation();
      } else if (e.code === 'KeyR') {
        resetSimulation();
      } else if (e.code === 'KeyP') {
        setUi(prev => ({ ...prev, showPaths: !prev.showPaths }));
      } else if (e.code === 'KeyD') {
        setUi(prev => ({ ...prev, showDanger: !prev.showDanger }));
      } else if (e.code === 'KeyM') {
        setUi(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [resetSimulation]);

  // ─── Continuous 60/120 FPS Sub-pixel Game Loop ───────────────────────────
  useEffect(() => {
    let active = true;

    const frameStep = (now) => {
      if (!active) return;

      if (!lastTimeRef.current) lastTimeRef.current = now;
      const rawDelta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      const dt = Math.min(rawDelta, 0.05);

      // FPS Monitoring
      frameCountRef.current++;
      fpsTimerRef.current += dt;
      if (fpsTimerRef.current >= 0.5) {
        const measuredFps = Math.round(frameCountRef.current / fpsTimerRef.current);
        frameCountRef.current = 0;
        fpsTimerRef.current = 0;
        if (stateRef.current) stateRef.current.telemetry.fps = measuredFps;
      }

      const s = stateRef.current;
      if (s) {
        const multiplier = uiRef.current.speedMultiplier;

        if (s.phase === 'playing') {
          advanceSimulation(s, dt * multiplier);
        } else if (s.phase === 'dying') {
          s.dyingTimer -= dt;
          if (s.dyingTimer <= 0) {
            handleLifeLost(s);
          }
        }

        // Render Frame
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          renderCanvas(ctx, s, now, uiRef.current);
        }

        // Periodic telemetry push to React HUD
        if (s.phase === 'playing' && Math.random() < 0.15) {
          setUi(prev => ({
            ...prev,
            score: s.score,
            lives: s.lives,
            pelletsLeft: s.pelletsLeft,
            frightened: s.frightenedMode,
            frightTimer: Math.ceil(s.frightenedTimer),
            phase: s.phase,
            telemetry: { ...s.telemetry },
          }));
        }
      }

      rafRef.current = requestAnimationFrame(frameStep);
    };

    rafRef.current = requestAnimationFrame(frameStep);
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ─── Simulation Stepper ──────────────────────────────────────────────────
  function advanceSimulation(s, dt) {
    const { maze, pacman, ghosts } = s;

    // Frightened timer countdown
    if (s.frightenedMode) {
      s.frightenedTimer -= dt;
      if (s.frightenedTimer <= 0) {
        s.frightenedMode = false;
        ghosts.forEach(g => {
          if (g.mode === 'frightened') {
            g.mode = 'chase';
            g.path = [];
          }
        });
      }
    }

    // Move Pac-Man continuously
    updatePacmanSubpixel(s, dt);

    // Move Ghosts continuously
    updateGhostsSubpixel(s, dt);

    // Continuous Subpixel Collision Check
    checkCollisions(s);

    // Win condition check
    if (s.pelletsLeft <= 0) {
      s.phase = 'won';
      setUi(p => ({ ...p, phase: 'won' }));
    }
  }

  // ─── Pac-Man Subpixel Motion ─────────────────────────────────────────────
  function updatePacmanSubpixel(s, dt) {
    const { maze, pacman, ghosts, frightenedMode } = s;

    pacman.progress += pacman.speed * dt;
    pacman.mouthAngle = Math.abs(Math.sin(performance.now() * 0.015 * pacman.speed)) * 0.38 + 0.04;

    if (pacman.progress >= 1.0) {
      pacman.progress -= 1.0;
      pacman.row = pacman.nextRow;
      pacman.col = pacman.nextCol;

      // Collect item at cell
      const cellValue = maze[pacman.row]?.[pacman.col];
      if (cellValue === PELLET) {
        maze[pacman.row][pacman.col] = EMPTY;
        s.score += SCORING_RULES.PELLET_VALUE;
        s.pelletsLeft--;
        soundEffects.playPelletChime();
      } else if (cellValue === POWER_PELLET) {
        maze[pacman.row][pacman.col] = EMPTY;
        s.score += SCORING_RULES.POWER_PELLET_VALUE;
        s.pelletsLeft--;
        s.frightenedMode = true;
        s.frightenedTimer = FRIGHTENED_SETTINGS.DURATION_SECONDS;
        s.ghostEatMultiplier = 1;
        soundEffects.playPowerPelletSiren();

        ghosts.forEach(g => {
          if (g.mode === 'chase' || g.mode === 'frightened') {
            g.mode = 'frightened';
            g.frightTimer = s.frightenedTimer;
            g.path = [];
          }
        });
      }

            // Re-evaluate Decision via Minimax with Alpha-Beta Pruning (DAA)
      const minimaxRes = findPathMinimax(
        maze,
        { row: pacman.row, col: pacman.col },
        ghosts,
        frightenedMode,
        s.score,
        s.pelletsLeft,
        3 // Minimax search depth
      );

      s.telemetry.minimaxNodes = minimaxRes.nodesExplored;
      s.telemetry.minimaxTimeMs = minimaxRes.timeMs;
      pacman.path = minimaxRes.path;

      // Advance Pac-Man along Minimax optimal move
      const nextStep = minimaxRes.bestMove;
      pacman.dir = { dr: nextStep.row - pacman.row, dc: nextStep.col - pacman.col };
      pacman.nextRow = nextStep.row;
      pacman.nextCol = nextStep.col;
    }
  }

  // ─── Ghosts Subpixel Motion ──────────────────────────────────────────────
  function updateGhostsSubpixel(s, dt) {
    const { maze, pacman, ghosts, frightenedMode } = s;
    const CORNERS = [
      { row: 1, col: 1 }, { row: 1, col: 19 },
      { row: 17, col: 1 }, { row: 17, col: 19 },
    ];

    ghosts.forEach(ghost => {
      // In ghost house
      if (ghost.mode === 'house') {
        ghost.houseBob += dt * 4;
        ghost.exitDelay -= dt;
        if (ghost.exitDelay <= 0) {
          ghost.mode = 'exiting';
          const result = findPathBFS(maze, { row: ghost.row, col: ghost.col }, GHOST_EXIT_TARGET, true);
          ghost.path = result.path;
          s.telemetry.bfsNodes += result.nodesExplored;
        }
        return;
      }

      // Movement speed ratio
      const currentSpeed = ghost.mode === 'frightened'
        ? ghost.speed * FRIGHTENED_SETTINGS.GHOST_SPEED_RATIO
        : ghost.speed;

      ghost.progress += currentSpeed * dt;

      if (ghost.progress >= 1.0) {
        ghost.progress -= 1.0;
        ghost.row = ghost.nextRow;
        ghost.col = ghost.nextCol;

        if (ghost.mode === 'exiting') {
          if (ghost.row <= GHOST_EXIT_TARGET.row) {
            ghost.mode = frightenedMode ? 'frightened' : 'chase';
            ghost.path = [];
          }
        }

        // Recompute BFS trajectory
        if (ghost.path.length <= 1) {
          if (ghost.mode === 'chase') {
            const target = { row: Math.round(pacman.row), col: Math.round(pacman.col) };
            const result = findPathBFS(maze, { row: ghost.row, col: ghost.col }, target, true);
            ghost.path = result.path;
            s.telemetry.bfsNodes = result.nodesExplored;
            s.telemetry.bfsTimeMs = result.timeMs;
          } else if (ghost.mode === 'frightened') {
            // Scatter to the corner farthest from Pac-Man
            let bestCorner = CORNERS[0];
            let maxDist = -1;
            CORNERS.forEach(corner => {
              const d = Math.abs(corner.row - pacman.row) + Math.abs(corner.col - pacman.col);
              if (d > maxDist) {
                maxDist = d;
                bestCorner = corner;
              }
            });
            const result = findPathBFS(maze, { row: ghost.row, col: ghost.col }, bestCorner, true);
            ghost.path = result.path;
          } else if (ghost.mode === 'exiting') {
            const result = findPathBFS(maze, { row: ghost.row, col: ghost.col }, GHOST_EXIT_TARGET, true);
            ghost.path = result.path;
          }
        }

        if (ghost.path && ghost.path.length > 1) {
          const nextStep = ghost.path[1];
          ghost.nextRow = nextStep.row;
          ghost.nextCol = nextStep.col;
          ghost.path.shift();
        } else {
          ghost.nextRow = ghost.row;
          ghost.nextCol = ghost.col;
        }
      }
    });
  }

  // ─── Continuous Subpixel Collision Check ─────────────────────────────────
  function checkCollisions(s) {
    const { pacman, ghosts } = s;

    const pX = (pacman.col + (pacman.nextCol - pacman.col) * pacman.progress + 0.5) * CELL_SIZE;
    const pY = (pacman.row + (pacman.nextRow - pacman.row) * pacman.progress + 0.5) * CELL_SIZE;
    const hitThreshold = CELL_SIZE * 0.72;

    for (let i = 0; i < ghosts.length; i++) {
      const ghost = ghosts[i];
      if (ghost.mode !== 'chase' && ghost.mode !== 'frightened') continue;

      const gX = (ghost.col + (ghost.nextCol - ghost.col) * ghost.progress + 0.5) * CELL_SIZE;
      const gY = (ghost.row + (ghost.nextRow - ghost.row) * ghost.progress + 0.5) * CELL_SIZE;

      const distance = Math.hypot(pX - gX, pY - gY);
      if (distance < hitThreshold) {
        if (ghost.mode === 'frightened') {
          // Pac-Man eats ghost
          s.score += SCORING_RULES.BASE_GHOST_VALUE * s.ghostEatMultiplier;
          s.ghostEatMultiplier *= 2;
          soundEffects.playGhostEatenCrunch();

          const profile = GHOST_PROFILES[i];
          ghost.row = profile.startRow;
          ghost.col = profile.startCol;
          ghost.nextRow = profile.startRow;
          ghost.nextCol = profile.startCol;
          ghost.progress = 0;
          ghost.mode = 'house';
          ghost.exitDelay = 3.5;
          ghost.path = [];
        } else {
          // Ghost catches Pac-Man
          s.phase = 'dying';
          s.dyingTimer = 1.0;
          return;
        }
      }
    }
  }

  function handleLifeLost(s) {
    s.lives--;
    if (s.lives <= 0) {
      s.phase = 'gameover';
      setUi(p => ({ ...p, phase: 'gameover', lives: 0 }));
      return;
    }

    s.pacman.row = PACMAN_START.row;
    s.pacman.col = PACMAN_START.col;
    s.pacman.nextRow = PACMAN_START.row;
    s.pacman.nextCol = PACMAN_START.col;
    s.pacman.progress = 0;
    s.pacman.path = [];
    s.pacman.target = null;

    s.ghosts.forEach((ghost, idx) => {
      const profile = GHOST_PROFILES[idx];
      ghost.row = profile.startRow;
      ghost.col = profile.startCol;
      ghost.nextRow = profile.startRow;
      ghost.nextCol = profile.startCol;
      ghost.progress = 0;
      ghost.mode = 'house';
      ghost.exitDelay = profile.exitDelaySeconds * 0.15;
      ghost.path = [];
    });

    s.phase = 'playing';
    setUi(p => ({ ...p, lives: s.lives, phase: 'playing' }));
  }

  // ─── High Definition Canvas Renderer ─────────────────────────────────────
  function renderCanvas(ctx, s, now, uiOptions) {
    const { maze, pacman, ghosts, phase, frightenedMode, frightenedTimer } = s;

    // Clear
    ctx.fillStyle = COLOR_PALETTE.BG_CANVAS;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Maze
    renderHDMaze(ctx, maze, now);

    // Danger zones
    if (uiOptions.showDanger && !frightenedMode) {
      renderDangerZones(ctx, ghosts);
    }

    // Trajectory paths
    if (uiOptions.showPaths) {
      renderPaths(ctx, pacman, ghosts);
    }

    // Ghosts
    ghosts.forEach(ghost => renderHDGhost(ctx, ghost, frightenedTimer, now));

    // Pac-Man
    if (phase !== 'dying') {
      renderHDPacman(ctx, pacman);
    } else {
      renderDeathAnimation(ctx, pacman, s.dyingTimer);
    }

    // Overlay
    if (phase !== 'playing' && phase !== 'dying') {
      renderHDOverlay(ctx, phase);
    }
  }

  // ─── Maze Vector Rendering ───────────────────────────────────────────────
  function renderHDMaze(ctx, maze, now) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = maze[r][c];
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;

        if (cell === WALL) {
          ctx.fillStyle = COLOR_PALETTE.WALL_FILL;
          ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

          ctx.strokeStyle = COLOR_PALETTE.WALL_STROKE;
          ctx.lineWidth = 1.5;

          const DIRS = [
            [-1, 0, x, y, x + CELL_SIZE, y],
            [1, 0, x, y + CELL_SIZE, x + CELL_SIZE, y + CELL_SIZE],
            [0, -1, x, y, x, y + CELL_SIZE],
            [0, 1, x + CELL_SIZE, y, x + CELL_SIZE, y + CELL_SIZE],
          ];

          DIRS.forEach(([dr, dc, x1, y1, x2, y2]) => {
            const nr = r + dr;
            const nc = c + dc;
            const isOpen = nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || maze[nr][nc] !== WALL;
            if (isOpen) {
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x2, y2);
              ctx.stroke();
            }
          });
        } else if (cell === PELLET) {
          ctx.fillStyle = COLOR_PALETTE.PELLET;
          ctx.beginPath();
          ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 2.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell === POWER_PELLET) {
          const pulse = 0.75 + 0.25 * Math.sin(now * 0.007);
          ctx.save();
          ctx.shadowColor = COLOR_PALETTE.POWER_GLOW;
          ctx.shadowBlur = 12 * pulse;
          ctx.fillStyle = COLOR_PALETTE.POWER_PELLET;
          ctx.beginPath();
          ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 6.5 * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (cell === GHOST_DOOR) {
          ctx.fillStyle = COLOR_PALETTE.GHOST_DOOR;
          ctx.fillRect(x + 2, y + CELL_SIZE / 2 - 2, CELL_SIZE - 4, 4);
        }
      }
    }
  }

  // ─── Danger Zones ────────────────────────────────────────────────────────
  function renderDangerZones(ctx, ghosts) {
    ctx.save();
    ghosts.forEach(ghost => {
      if (ghost.mode === 'chase' || ghost.mode === 'exiting') {
        const x = (ghost.col + (ghost.nextCol - ghost.col) * ghost.progress + 0.5) * CELL_SIZE;
        const y = (ghost.row + (ghost.nextRow - ghost.row) * ghost.progress + 0.5) * CELL_SIZE;
        const grad = ctx.createRadialGradient(x, y, 4, x, y, CELL_SIZE * 2.2);
        grad.addColorStop(0, COLOR_PALETTE.DANGER_AURA);
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE * 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    ctx.restore();
  }

  // ─── Trajectories ────────────────────────────────────────────────────────
  function renderPaths(ctx, pacman, ghosts) {
    const dashOffset = -(performance.now() * 0.035);

    if (pacman.path && pacman.path.length > 1) {
      ctx.save();
      ctx.strokeStyle = COLOR_PALETTE.PATH_PACMAN;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.setLineDash([5, 6]);
      ctx.lineDashOffset = dashOffset;
      ctx.shadowColor = COLOR_PALETTE.PATH_PACMAN_GLOW;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      const px = (pacman.col + (pacman.nextCol - pacman.col) * pacman.progress + 0.5) * CELL_SIZE;
      const py = (pacman.row + (pacman.nextRow - pacman.row) * pacman.progress + 0.5) * CELL_SIZE;
      ctx.moveTo(px, py);

      for (let i = 0; i < pacman.path.length; i++) {
        const pt = pacman.path[i];
        ctx.lineTo(pt.col * CELL_SIZE + CELL_SIZE / 2, pt.row * CELL_SIZE + CELL_SIZE / 2);
      }
      ctx.stroke();
      ctx.restore();
    }

    ghosts.forEach(ghost => {
      if (ghost.path && ghost.path.length > 1 && ghost.mode !== 'house') {
        ctx.save();
        ctx.strokeStyle = ghost.mode === 'frightened' ? COLOR_PALETTE.PATH_FRIGHTENED : ghost.color;
        ctx.globalAlpha = 0.45;
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = dashOffset;

        ctx.beginPath();
        const gx = (ghost.col + (ghost.nextCol - ghost.col) * ghost.progress + 0.5) * CELL_SIZE;
        const gy = (ghost.row + (ghost.nextRow - ghost.row) * ghost.progress + 0.5) * CELL_SIZE;
        ctx.moveTo(gx, gy);

        for (let i = 0; i < ghost.path.length; i++) {
          const pt = ghost.path[i];
          ctx.lineTo(pt.col * CELL_SIZE + CELL_SIZE / 2, pt.row * CELL_SIZE + CELL_SIZE / 2);
        }
        ctx.stroke();
        ctx.restore();
      }
    });
  }

  // ─── Pac-Man Entity ──────────────────────────────────────────────────────
  function renderHDPacman(ctx, pacman) {
    const x = (pacman.col + (pacman.nextCol - pacman.col) * pacman.progress + 0.5) * CELL_SIZE;
    const y = (pacman.row + (pacman.nextRow - pacman.row) * pacman.progress + 0.5) * CELL_SIZE;
    const R = CELL_SIZE / 2 - 2;

    let rot = 0;
    if (pacman.dir.dc === 1) rot = 0;
    else if (pacman.dir.dc === -1) rot = Math.PI;
    else if (pacman.dir.dr === -1) rot = -Math.PI / 2;
    else if (pacman.dir.dr === 1) rot = Math.PI / 2;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);

    ctx.shadowColor = COLOR_PALETTE.PACMAN_GLOW;
    ctx.shadowBlur = 14;

    ctx.fillStyle = COLOR_PALETTE.PACMAN;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, R, pacman.mouthAngle, Math.PI * 2 - pacman.mouthAngle);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function renderDeathAnimation(ctx, pacman, timer) {
    const x = (pacman.col + 0.5) * CELL_SIZE;
    const y = (pacman.row + 0.5) * CELL_SIZE;
    const R = CELL_SIZE / 2 - 2;
    const progress = 1.0 - Math.max(0, timer);

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = COLOR_PALETTE.PACMAN;
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(0, R * (1 - progress)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ─── Ghost Entity ────────────────────────────────────────────────────────
  function renderHDGhost(ctx, ghost, frightenedTimer, now) {
    let x = (ghost.col + (ghost.nextCol - ghost.col) * ghost.progress + 0.5) * CELL_SIZE;
    let y = (ghost.row + (ghost.nextRow - ghost.row) * ghost.progress + 0.5) * CELL_SIZE;

    if (ghost.mode === 'house') {
      y += Math.sin(ghost.houseBob) * 3;
    }

    const R = CELL_SIZE / 2 - 2;
    const isFrightened = ghost.mode === 'frightened';
    const isFlashing = isFrightened &&
      frightenedTimer < FRIGHTENED_SETTINGS.FLASH_WARNING_THRESHOLD_SECONDS &&
      Math.floor(now * 0.008) % 2 === 0;

    const ghostColor = isFrightened
      ? (isFlashing ? '#ffffff' : '#3b82f6')
      : ghost.color;

    ctx.save();
    ctx.translate(x, y);

    ctx.shadowColor = ghostColor;
    ctx.shadowBlur = 12;
    ctx.fillStyle = ghostColor;

    ctx.beginPath();
    ctx.arc(0, -R * 0.2, R, Math.PI, 0);

    const wavePhase = (now * 0.01) % (Math.PI * 2);
    const skirtHeight = R * 0.75;
    const waves = 3;
    const step = (R * 2) / waves;

    ctx.lineTo(R, skirtHeight);
    for (let i = 0; i < waves; i++) {
      const wx = R - (i + 1) * step;
      const cpX = R - (i + 0.5) * step;
      const cpY = skirtHeight + Math.sin(wavePhase + i) * 3.5;
      ctx.quadraticCurveTo(cpX, cpY, wx, skirtHeight);
    }
    ctx.closePath();
    ctx.fill();

    if (!isFrightened) {
      const eyeDx = (ghost.nextCol - ghost.col) * 2;
      const eyeDy = (ghost.nextRow - ghost.row) * 2;

      [[-R * 0.35, -R * 0.25], [R * 0.35, -R * 0.25]].forEach(([ex, ey]) => {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, R * 0.28, R * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(ex + eyeDx, ey + eyeDy, R * 0.14, 0, Math.PI * 2);
        ctx.fill();
      });
    } else {
      ctx.fillStyle = '#ffffff';
      [[-R * 0.3, -R * 0.2], [R * 0.3, -R * 0.2]].forEach(([ex, ey]) => {
        ctx.beginPath();
        ctx.arc(ex, ey, R * 0.14, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-R * 0.4, R * 0.2);
      ctx.lineTo(-R * 0.2, 0.05);
      ctx.lineTo(0, R * 0.2);
      ctx.lineTo(R * 0.2, 0.05);
      ctx.lineTo(R * 0.4, R * 0.2);
      ctx.stroke();
    }

    ctx.restore();
  }

  // ─── Overlays ────────────────────────────────────────────────────────────
  function renderHDOverlay(ctx, phase) {
    ctx.save();
    ctx.fillStyle = 'rgba(8, 9, 13, 0.78)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (phase === 'idle') {
      ctx.font = '700 28px system-ui, sans-serif';
      ctx.fillStyle = COLOR_PALETTE.PACMAN;
      ctx.shadowColor = COLOR_PALETTE.PACMAN_GLOW;
      ctx.shadowBlur = 20;
      ctx.fillText('DAA PAC-MAN MINIMAX SIMULATION', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

      ctx.shadowBlur = 0;
      ctx.font = '400 13px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Click Canvas or Press Spacebar to Begin', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 18);
    } else if (phase === 'paused') {
      ctx.font = '700 24px system-ui, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('SIMULATION PAUSED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else if (phase === 'won') {
      ctx.font = '700 32px system-ui, sans-serif';
      ctx.fillStyle = '#10b981';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowBlur = 25;
      ctx.fillText('ALL PELLETS CONSUMED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 16);
      ctx.shadowBlur = 0;
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Optimal Path Achieved • Press Reset to Run Again', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    } else if (phase === 'gameover') {
      ctx.font = '700 32px system-ui, sans-serif';
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
      ctx.shadowBlur = 25;
      ctx.fillText('AGENT TERMINATED', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 16);
      ctx.shadowBlur = 0;
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Cornered by Ghosts • Press Reset to Retry', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }

    ctx.restore();
  }

  // ─── Play / Pause Toggle ─────────────────────────────────────────────────
  const toggleSimulation = () => {
    soundEffects.initializeContext();
    const s = stateRef.current;
    if (!s) return;

    if (s.phase === 'idle' || s.phase === 'gameover' || s.phase === 'won') {
      if (s.phase === 'gameover' || s.phase === 'won') resetSimulation();
      setTimeout(() => {
        if (stateRef.current) {
          stateRef.current.phase = 'playing';
          setUi(p => ({ ...p, phase: 'playing' }));
        }
      }, 0);
    } else if (s.phase === 'playing') {
      s.phase = 'paused';
      setUi(p => ({ ...p, phase: 'paused' }));
    } else if (s.phase === 'paused') {
      s.phase = 'playing';
      setUi(p => ({ ...p, phase: 'playing' }));
    }
  };

  const progressPercent = ui.totalPellets > 0
    ? Math.round(((ui.totalPellets - ui.pelletsLeft) / ui.totalPellets) * 100)
    : 0;

  return (
    <section
      id="simulation"
      aria-label="Interactive Pac-Man AI Game Canvas"
      className="flex flex-col items-center justify-center w-full max-w-[690px] mx-auto gap-4 select-none pt-2"
    >
      {/* Telemetry Stat Badges */}
      <div className="w-full grid grid-cols-4 gap-2.5">
        <StatBadge
          label="Score"
          value={ui.score.toLocaleString()}
          title="Current accumulated score in points"
        />
        <StatBadge
          label="Pellets"
          value={`${ui.pelletsLeft} (${progressPercent}%)`}
          accent={progressPercent === 100 ? '#10b981' : undefined}
          title="Remaining food pellets left to collect"
        />
        <StatBadge
          label="Lives"
          value={'● '.repeat(ui.lives).trim()}
          accent="#ef4444"
          title="Available agent lives before termination"
        />
        <StatBadge
          label="Minimax (α-β)"
          value={`${ui.telemetry.minimaxTimeMs}ms`}
          sub={`${ui.telemetry.minimaxNodes} nodes`}
          title="Microsecond execution time and game tree nodes explored by Minimax"
        />
      </div>

      {/* Progress Line */}
      <div
        className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden"
        title={`Simulation completion progress: ${progressPercent}%`}
      >
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-amber-200 transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* HD Canvas Viewport */}
      <div
        className="relative mx-auto rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_0_60px_rgba(37,68,122,0.25)] bg-[#08090d]"
        title="Interactive Canvas. Click or press Spacebar to toggle simulation."
      >
        <canvas
          ref={canvasRef}
          className="block cursor-pointer"
          onClick={toggleSimulation}
          title="Pac-Man Game Canvas: Click to Play or Pause"
        />

        {ui.frightened && (
          <div
            className="absolute top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 backdrop-blur-md text-blue-300 text-xs font-mono font-medium flex items-center gap-2 animate-pulse cursor-pointer"
            title="Pac-Man has consumed a power pellet! Ghosts can now be eaten for 200, 400, 800, 1600 bonus points."
          >
            <span>👻 FRIGHTENED MODE</span>
            <span className="text-white font-bold">{ui.frightTimer}s</span>
          </div>
        )}
      </div>

      {/* Control Deck */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] backdrop-blur-sm text-xs">
        {/* Play/Pause & Reset */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSimulation}
            className="px-4 py-1.5 rounded-lg font-semibold transition-all bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95 shadow-[0_0_12px_rgba(250,204,21,0.25)] cursor-pointer flex items-center gap-1.5"
            title={ui.phase === 'playing' ? 'Pause active simulation (Space)' : 'Start autonomous AI simulation (Space)'}
          >
            {ui.phase === 'playing' ? (
              <><span>⏸</span> Pause</>
            ) : (
              <><span>▶</span> {ui.phase === 'idle' ? 'Start AI' : 'Resume'}</>
            )}
          </button>

          <button
            onClick={resetSimulation}
            className="px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-400 hover:text-white hover:bg-white/[0.05] transition-all active:scale-95 cursor-pointer"
            title="Reset maze grid and re-initialize agent positions (Hotkey: R)"
          >
            ↺ Reset
          </button>
        </div>

        {/* Speed Multipliers */}
        <div
          className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]"
          title="Adjust continuous simulation velocity"
        >
          {[
            { label: '0.8x', val: 0.8, tip: 'Slow motion for detailed path inspection' },
            { label: '1.2x', val: 1.2, tip: 'Standard arcade speed' },
            { label: '2.0x', val: 2.0, tip: 'Double speed' },
            { label: '3.5x', val: 3.5, tip: 'Lightning blitz mode' },
          ].map(s => (
            <button
              key={s.label}
              onClick={() => setUi(p => ({ ...p, speedMultiplier: s.val }))}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-all cursor-pointer ${
                ui.speedMultiplier === s.val
                  ? 'bg-white/10 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={s.tip}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Visualization Toggles */}
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <TogglePill
            label="Paths"
            active={ui.showPaths}
            onClick={() => setUi(p => ({ ...p, showPaths: !p.showPaths }))}
            title="Toggle live Minimax projected trajectory and Ghost BFS paths (Hotkey: P)"
          />
          <TogglePill
            label="Danger"
            active={ui.showDanger}
            onClick={() => setUi(p => ({ ...p, showDanger: !p.showDanger }))}
            title="Toggle dynamic ghost threat zone aura (Hotkey: D)"
          />
          <TogglePill
            label={ui.soundEnabled ? '🔊 SFX' : '🔇 Mute'}
            active={ui.soundEnabled}
            onClick={() => {
              soundEffects.initializeContext();
              setUi(p => ({ ...p, soundEnabled: !p.soundEnabled }));
            }}
            title="Toggle Web Audio synthesized retro sound effects (Hotkey: M)"
          />
        </div>
      </div>

      {/* Ghost Profiles */}
      <div className="w-full grid grid-cols-4 gap-2 text-[11px] font-mono">
        {GHOST_PROFILES.map(profile => (
          <div
            key={profile.id}
            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06] cursor-pointer hover:bg-white/[0.04] transition-colors"
            title={`${profile.name} (${profile.role}): ${profile.description}`}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: profile.color, boxShadow: `0 0 8px ${profile.glowColor}` }}
              />
              <span className="text-slate-300 font-medium">{profile.name}</span>
            </div>
            <span className="text-slate-500 text-[10px]">BFS</span>
          </div>
        ))}
      </div>

      {/* Keyboard Shortcut Help Bar */}
      <div
        className="text-center text-[11px] text-slate-500 font-mono pt-1 cursor-default"
        title="Keyboard hotkeys available at all times"
      >
        [Space] Play/Pause • [R] Reset • [P] Paths • [D] Danger Zones • [M] Audio
      </div>
    </section>
  );
});

export default PacmanGame;

// ─── Sub-components ────────────────────────────────────────────────────────
function StatBadge({ label, value, sub, accent, title }) {
  return (
    <div
      className="flex flex-col px-3 py-2 rounded-xl bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm cursor-default hover:border-white/[0.12] transition-colors"
      title={title}
    >
      <span className="text-[10px] tracking-wider uppercase text-slate-500 font-medium">
        {label}
      </span>
      <span className="text-sm font-semibold tracking-tight font-mono mt-0.5" style={{ color: accent || '#f1f5f9' }}>
        {value}
      </span>
      {sub && <span className="text-[10px] text-slate-500 font-mono">{sub}</span>}
    </div>
  );
}

function TogglePill({ label, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
        active
          ? 'bg-white/[0.08] border-white/20 text-white font-medium shadow-sm'
          : 'bg-transparent border-white/[0.05] text-slate-500 hover:text-slate-400'
      }`}
    >
      {label}
    </button>
  );
}
