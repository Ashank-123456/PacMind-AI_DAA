'use client';

import { useState, useRef } from 'react';
import FloatingNavbar from '@/components/FloatingNavbar';
import PacmanGame from '@/components/PacmanGame';
import Footer from '@/components/Footer';

/**
 * @file page.js
 * @description PacMind AI: Autonomous Pac-Man Agent using Minimax with Alpha-Beta Pruning.
 * Developed by Ashank Gupta.
 */
export default function Home() {
  const [simulationActive, setSimulationActive] = useState(false);
  const gameRef = useRef(null);

  const handleQuickToggle = () => {
    if (gameRef.current) {
      gameRef.current.togglePlayPause();
    }
  };

  const handleSimulationStateChange = (state) => {
    setSimulationActive(state.isPlaying);
  };

  return (
    <div className="min-h-screen bg-[#08090d] text-slate-100 flex flex-col font-sans selection:bg-amber-400 selection:text-black">
      {/* ── Scroll-Aware Floating Navbar ── */}
      <FloatingNavbar
        onQuickStart={handleQuickToggle}
        isSimulationActive={simulationActive}
      />

      {/* ── Main Simulation Viewport ── */}
      <main className="flex-1 flex flex-col items-center justify-center pt-20 pb-12 px-4">
        {/* Header Title */}
        <section className="text-center max-w-xl mx-auto mb-4 select-none">
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            PacMind <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">Minimax Agent</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-mono">
            Adversarial <span className="text-emerald-400 font-semibold">Minimax (α-β Pruning)</span> vs <span className="text-blue-400 font-semibold">BFS Ghost Pursuit</span>
          </p>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Engineered by <span className="text-slate-300 font-medium">Ashank Gupta</span>
          </p>
        </section>

        {/* Interactive HD Pac-Man Simulation Canvas */}
        <PacmanGame
          ref={gameRef}
          onStateChange={handleSimulationStateChange}
        />
      </main>

      {/* ── Compact Minimal Footer ── */}
      <Footer />
    </div>
  );
}
