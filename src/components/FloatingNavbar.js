'use client';

import { useState, useEffect, useRef } from 'react';
import BrandLogo from './BrandLogo';

/**
 * @file FloatingNavbar.js
 * @description Minimalist floating navigation bar that dynamically hides on scroll down
 * and reappears on scroll up.
 */
export default function FloatingNavbar({ onQuickStart, isSimulationActive }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsScrolled(currentScrollY > 20);

      if (currentScrollY > lastScrollYRef.current && currentScrollY > 60) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      aria-label="Main Navigation"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out px-4 py-3 select-none ${
        isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`max-w-[720px] mx-auto flex items-center justify-between px-4 py-2.5 rounded-2xl transition-all duration-300 ${
          isScrolled
            ? 'bg-[#08090d]/85 backdrop-blur-md border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.5)]'
            : 'bg-white/[0.02] border border-white/[0.06] backdrop-blur-sm'
        }`}
      >
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="cursor-pointer"
          title="PacMind AI (Minimax Edition) by Ashank Gupta: Scroll to top"
        >
          <BrandLogo size={24} />
        </div>

        {/* Center Minimal Algorithm Pill */}
        <div
          className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-400 cursor-default"
          title="Search Engine: Adversarial Minimax with Alpha-Beta Pruning for Pac-Man, BFS shortest-path for Ghosts"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Pac-Man: Minimax (α-β)</span>
          <span className="text-slate-600">•</span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>Ghosts: BFS</span>
        </div>

        {/* Quick Launch Button */}
        <div className="flex items-center gap-2">
          {onQuickStart && (
            <button
              onClick={onQuickStart}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold font-mono bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_14px_rgba(250,204,21,0.25)] cursor-pointer flex items-center gap-1.5"
              title={isSimulationActive ? 'Pause simulation (Space)' : 'Launch autonomous AI simulation (Space)'}
            >
              <span>{isSimulationActive ? '⏸' : '▶'}</span>
              <span>{isSimulationActive ? 'Pause' : 'Start AI'}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
