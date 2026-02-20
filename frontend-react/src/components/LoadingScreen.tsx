import { motion } from "framer-motion";
import { Loader2, Sparkles, BrainCircuit, PenTool } from "lucide-react";
import { useState, useEffect } from "react";

const LOADING_MESSAGES = [
  "Awakening the digital scribes...",
  "Scouring the vast expanse of the web for hidden gems...",
  "Thinking deep into trend patterns and global data...",
  "Architecting a high-impact narrative structure...",
  "Brewing fresh insights and crisp analogies...",
  "Commanding AI artists to illustrate your vision...",
  "Polishing every word for maximum intellectual resonance...",
  "Almost there! Your premium content is being finalized...",
  "Final quality check by the orchestration agents..."
];

export function LoadingScreen() {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
      {/* Animated Centerpiece */}
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-t-2 border-l-2 border-cyan-400 opacity-50 h-32 w-32"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 rounded-full border-b-2 border-r-2 border-purple-500 opacity-50 h-32 w-32 scale-75"
        />
        
        <div className="h-32 w-32 flex items-center justify-center bg-white/5 backdrop-blur-md rounded-full shadow-[0_0_50px_rgba(56,189,248,0.2)]">
          <BrainCircuit className="w-12 h-12 text-cyan-300 animate-pulse" />
        </div>
      </div>

      {/* Dynamic Text */}
      <div className="text-center space-y-2 h-20">
        <motion.h2
          key={msgIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-purple-400"
        >
          {LOADING_MESSAGES[msgIndex]}
        </motion.h2>
        <p className="text-slate-400 text-sm">This AI agent takes time to think deep.</p>
      </div>

      {/* Progress Indicators */}
      <div className="flex gap-4 text-slate-500">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
        >
          <Sparkles className="w-5 h-5 text-yellow-400" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
        >
          <PenTool className="w-5 h-5 text-pink-400" />
        </motion.div>
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}
        >
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
        </motion.div>
      </div>
    </div>
  );
}
