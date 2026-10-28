import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "PacMind AI | Autonomous Pac-Man Agent (Minimax α-β)",
  description: "PacMind AI DAA Edition: Autonomous Pac-Man agent using Adversarial Minimax Search with Alpha-Beta Pruning and multi-agent BFS ghost pursuit. Developed by Ashank Gupta.",
  keywords: [
    "PacMind AI",
    "Pac-Man AI",
    "Minimax Algorithm",
    "Alpha-Beta Pruning",
    "DAA",
    "Design and Analysis of Algorithms",
    "Breadth-First Search",
    "BFS",
    "Artificial Intelligence",
    "Ashank Gupta",
    "Next.js",
    "Tailwind CSS",
    "Canvas Animation",
    "Game Tree Search",
  ],
  authors: [{ name: "Ashank Gupta" }],
  creator: "Ashank Gupta",
  openGraph: {
    title: "PacMind AI | Autonomous Pac-Man Agent (Minimax α-β)",
    description: "Autonomous Pac-Man agent powered by Adversarial Minimax with Alpha-Beta Pruning. Developed by Ashank Gupta.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "PacMind AI | Autonomous Pac-Man Agent (Minimax α-β)",
    description: "Autonomous Pac-Man agent powered by Adversarial Minimax with Alpha-Beta Pruning. Developed by Ashank Gupta.",
    creator: "@ashankgupta",
  },
};

export const viewport = {
  themeColor: "#08090d",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#08090d] text-slate-100">
        {children}
      </body>
    </html>
  );
}
