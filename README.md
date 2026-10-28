# 👾 DAA Project: Autonomous Pac-Man Agent using Minimax & Alpha-Beta Pruning

> **Design and Analysis of Algorithms (DAA)** practical implementation of an autonomous **Adversarial Minimax Decision Engine** with **Alpha-Beta ($\alpha$-$\beta$) Pruning** on a 60 FPS continuous subpixel HTML5 Canvas. Built with **Next.js 16**, **React 19**, and **Tailwind CSS v4**.

---

## 📑 Table of Contents

- [Project Overview](#-project-overview)
- [DAA Algorithmic Theory: Minimax vs Ghosts](#-daa-algorithmic-theory-minimax-vs-ghosts)
  - [Game Formulation: Zero-Sum Multi-Agent Grid World](#1-game-formulation-zero-sum-multi-agent-grid-world)
  - [The Minimax Decision Rule](#2-the-minimax-decision-rule)
  - [Alpha-Beta (α-β) Pruning Optimization](#3-alpha-beta-α-β-pruning-optimization)
  - [State Evaluation Function](#4-state-evaluation-function)
  - [Complexity Analysis: Time & Space](#5-complexity-analysis-time--space)
- [Ghosts AI: BFS Shortest-Path Pursuit](#-ghosts-ai-bfs-shortest-path-pursuit)
- [Project Architecture & File Tree](#-project-architecture--file-tree)
- [Interactive Controls & Hotkeys](#-interactive-controls--hotkeys)
- [How to Run](#-how-to-run)
- [Author & Academic Disclaimer](#-author--academic-disclaimer)

---

## 🌟 Project Overview

In the classic multi-agent grid world, Pac-Man faces active adversaries (ghosts) whose goal is to intercept and capture him. In traditional AI, single-agent pathfinding like A* treats ghosts merely as dynamic obstacles. 

In this **DAA Project**, we formulate the problem as an **Adversarial Multi-Agent Zero-Sum Game**:
- **Pac-Man ($\text{MAX}$)**: Plans actions to maximize his terminal evaluation utility.
- **Ghosts ($\text{MIN}$)**: Minimize Pac-Man's utility by coordinating pursuit and cornering him.
- **$\alpha$-$\beta$ Pruning**: Dramatically reduces the game tree search space from $\mathcal{O}(b^m)$ down to $\mathcal{O}(b^{m/2})$, enabling real-time look-ahead at 60 FPS.

---

## 🧠 DAA Algorithmic Theory: Minimax vs Ghosts

### 1. Game Formulation: Zero-Sum Multi-Agent Grid World
- **Players**: Pac-Man ($\text{MAX}$) and $k$ active ghosts ($\text{MIN}_1, \text{MIN}_2, \dots, \text{MIN}_k$).
- **State Space**: Grid coordinates of Pac-Man, positions and modes of ghosts, remaining pellets, and current score.
- **Actions**: Legal cardinal directions $\text{Legal}(s) \subseteq \{\text{Up}, \text{Down}, \text{Left}, \text{Right}\} \setminus \{\text{Walls}, \text{GhostDoor}\}$.
- **Turn Order**: Pac-Man moves first, followed by each active ghost moving in sequence within the same ply.

### 2. The Minimax Decision Rule

At any state $s$:
$$\text{Minimax}(s, d) = \begin{cases} 
\text{Eval}(s) & \text{if } d = 0 \text{ or Terminal}(s) \\
\max_{a \in \text{Legal}(s)} \text{MinValue}(\text{Result}(s, a), d, \text{ghost}_1, \alpha, \beta) & \text{if agent is Pac-Man} \\
\min_{a \in \text{Legal}(s)} \text{NextAgent}(\text{Result}(s, a), d, \text{ghost}_{i+1}, \alpha, \beta) & \text{if agent is a Ghost}
\end{cases}$$

### 3. Alpha-Beta ($\alpha$-$\beta$) Pruning Optimization

Alpha-Beta pruning maintains two bounds along the search path:
- $\alpha$: The highest-value choice found so far by $\text{MAX}$.
- $\beta$: The lowest-value choice found so far by $\text{MIN}$.

```
               [ MAX: Pac-Man ]  (α = -∞, β = +∞)
                 /          \
                /            \
       [ MIN: Blinky ]     [ MIN: Blinky ]
         /         \            /         \
       (v=12)    (v=8)       (v=20)     [ PRUNED! ]
                             If β ≤ α, stop searching!
```

**Pruning Condition**:
- At any $\text{MIN}$ node: if $v \le \alpha$, prune remaining sibling branches.
- At any $\text{MAX}$ node: if $v \ge \beta$, prune remaining sibling branches.

### 4. State Evaluation Function

When depth cutoff $d = 0$ is reached, the heuristic utility of the state is evaluated:
$$\text{Eval}(s) = 15 \cdot \text{Score} - 30 \cdot \text{PelletsLeft} - 10 \cdot \text{DistToNearestPellet} + \text{GhostSafetyScore} + \text{FrightenedPreyBonus}$$

Where:
- $\text{GhostSafetyScore} = \begin{cases} -999999 & \text{if } \text{minDist} \le 1 \text{ (Fatal trap)} \\ -50000 & \text{if } \text{minDist} = 2 \text{ (Imminent danger)} \\ \min(800, \text{minDist} \cdot 200) & \text{otherwise} \end{cases}$
- $\text{FrightenedPreyBonus} = \frac{8000}{\text{distToFrightenedGhost} + 1}$ (Pac-Man aggressively hunts edible ghosts).

### 5. Complexity Analysis: Time & Space

| Metric | Standard Minimax | Minimax with $\alpha$-$\beta$ Pruning |
|---|---|---|
| **Branching Factor ($b$)** | $\approx 2.5 - 4$ legal moves per tile | $\approx 2.5 - 4$ legal moves per tile |
| **Worst-Case Time** | $\mathcal{O}(b^m)$ | $\mathcal{O}(b^m)$ (poor move ordering) |
| **Best-Case Time** | $\mathcal{O}(b^m)$ | $\mathcal{O}(b^{m/2})$ (optimal move ordering) |
| **Space Complexity** | $\mathcal{O}(m)$ | $\mathcal{O}(m)$ (depth-first stack depth) |
| **Effective Search Depth** | Depth $2$ | **Depth $3 - 4$ in real-time ($< 0.2\text{ms}$)** |

---

## 👻 Ghosts AI: BFS Shortest-Path Pursuit

While Pac-Man uses adversarial game trees, the ghosts utilize **Breadth-First Search (BFS)**:
- Level-order FIFO queue expansion guarantees the step-optimal path to Pac-Man's coordinates.
- During Frightened Mode, ghosts invert targets and retreat toward the furthest maze corners.

---

## 📁 Project Architecture & File Tree

```
DAA_Project/
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css         # Tailwind v4 theme & smooth scroll
│   │   ├── layout.js           # DAA SEO metadata & viewport setup
│   │   └── page.js             # DAA Pac-Man Minimax presentation page
│   ├── components/
│   │   ├── BrandLogo.js        # DAA-PAC vector SVG logo
│   │   ├── FloatingNavbar.js   # Scroll-aware hide/reveal floating header
│   │   ├── PacmanGame.js       # 60 FPS HD Canvas engine with Minimax telemetry
│   │   └── Footer.js           # Minimal copyright bar
│   ├── constants/
│   │   └── gameConfig.js       # Grid dimensions (21x19), speeds, scores, tokens
│   └── lib/
│       ├── mazeMap.js          # 21x19 discrete maze matrix
│       ├── searchAlgorithms.js # Minimax + Alpha-Beta Pruning & BFS
│       └── soundEffects.js     # Zero-asset Web Audio API retro synthesizer
├── next.config.mjs             # Next.js security headers & Turbopack
├── package.json                # Project dependencies ("daa-project")
└── README.md                   # Complete DAA documentation
```

---

## 🎮 Interactive Controls & Hotkeys

| Action | Control | Hotkey | Description |
|---|---|---|---|
| **Play / Pause** | `▶ Start AI` / `⏸ Pause` Button | `[Space]` | Launch or pause continuous simulation |
| **Reset** | `↺ Reset` Button | `[R]` | Reset grid and re-seed pellets |
| **Minimax Vectors** | `Paths` Toggle | `[P]` | Visualize Pac-Man's projected Minimax trajectory |
| **Danger Heatmap** | `Danger` Toggle | `[D]` | Toggle ghost threat zone radar |
| **Audio Effects** | `🔊 SFX` / `🔇 Mute` | `[M]` | Toggle synthesized retro chimes |
| **Speed Control** | `0.8x`, `1.2x`, `2.0x`, `3.5x` | — | Adjust simulation velocity in real-time |

---

## 💻 How to Run

Navigate to the project directory on your Desktop:

```bash
cd /Users/ashankgupta/Desktop/DAA_Project
```

Run the development server on a distinct port (e.g., 3001 or 3000):

```bash
PORT=3001 npm run dev
```

Open your browser at **[http://localhost:3001](http://localhost:3001)**.

To create an optimized production build:
```bash
npm run build
npm run start
```

---

## 📜 Author & Academic Disclaimer

- **Course**: Design and Analysis of Algorithms (DAA).
- **Core Topic**: Game Tree Search, Minimax Theorem, Alpha-Beta Pruning, Heuristic Evaluation.
- **Attribution**: Built as an academic demonstration of multi-agent zero-sum adversarial search. Pac-Man is a trademark of Bandai Namco Entertainment Inc.
