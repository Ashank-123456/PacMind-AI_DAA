/**
 * @file Footer.js
 * @description Minimalist footer with copyright and author attribution.
 */
export default function Footer() {
  return (
    <footer
      aria-label="Site Footer"
      className="w-full border-t border-white/[0.06] bg-[#050608] py-4 px-4 select-none text-center"
    >
      <p className="text-xs text-slate-500 font-mono">
        © 2026 PacMind AI (Minimax Edition) • Developed by Ashank Gupta. All rights reserved.
      </p>
    </footer>
  );
}
