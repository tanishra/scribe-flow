import { motion } from "framer-motion";
import { Sparkles, Brain, Search, Palette, Timer, Info } from "lucide-react";

const steps = [
  { icon: Search, text: "Performing deep web research...", duration: "45s" },
  { icon: Brain, text: "Architecting strategic blog structure...", duration: "30s" },
  { icon: Sparkles, text: "Generating high-impact sections...", duration: "60s" },
  { icon: Palette, text: "Creating unique visual assets...", duration: "45s" },
];

export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      {/* Animated Core */}
      <div className="relative mb-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-24 h-24 rounded-full border-t-2 border-b-2 border-blue-500"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-blue-400 animate-pulse" />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-white mb-4">Crafting Your Masterpiece</h2>
      
      <div className="flex items-center gap-2 text-blue-400 font-medium mb-12 bg-blue-500/10 px-4 py-2 rounded-full">
        <Timer className="w-4 h-4" />
        <span>Estimated time: 3-4 minutes</span>
      </div>

      {/* Strategic Progress List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full text-left mb-12">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4"
          >
            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
              <step.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">{step.text}</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Avg. {step.duration}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* The "Why" Card */}
      <div className="max-w-md bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden">
        <div className="flex gap-3 text-left">
            <Info className="w-5 h-5 text-blue-400 shrink-0 mt-1" />
            <div>
                <h4 className="text-sm font-bold text-white mb-1">Quality takes a moment</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                    Unlike standard AI, ScribeFlow performs real-time research and multi-agent drafting to ensure high accuracy and technical depth.
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
