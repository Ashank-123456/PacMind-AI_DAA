'use client';

/**
 * @file BrandLogo.js
 * @description PacMind AI Minimax brand logo.
 */
export default function BrandLogo({ size = 28, showText = true }) {
  return (
    <div
      className="flex items-center gap-2.5 select-none group cursor-pointer"
      title="PacMind AI (Minimax Edition) • Developed by Ashank Gupta"
    >
      <div
        className="relative flex items-center justify-center rounded-xl p-1.5 transition-transform duration-300 group-hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(250,204,21,0.15) 0%, rgba(59,130,246,0.15) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 0 16px rgba(250, 204, 21, 0.2)',
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="transition-transform duration-300 group-hover:rotate-6"
        >
          {/* Glowing Pac-Man */}
          <path
            d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C19.5 28 22.6 26.5 24.8 24.1L16 16L27.6 18.2C27.9 17.5 28 16.8 28 16C28 9.37 22.63 4 16 4Z"
            fill="url(#pacmanGradient)"
          />
          {/* Food Pellets in trajectory */}
          <circle cx="21" cy="11" r="1.8" fill="#FDE047" className="animate-pulse" />
          <circle cx="27" cy="11" r="1.8" fill="#FDE047" />

          {/* Gradients */}
          <defs>
            <linearGradient id="pacmanGradient" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FACC15" />
              <stop offset="1" stopColor="#EAB308" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold tracking-wider text-sm bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              PACMIND
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-amber-400/10 border border-amber-400/30 text-amber-300">
              MINIMAX
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono tracking-tight">
            by Ashank Gupta
          </span>
        </div>
      )}
    </div>
  );
}
