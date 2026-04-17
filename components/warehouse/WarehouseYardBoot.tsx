"use client";

import { motion } from "framer-motion";

/** Full-bleed branded loader; parent should mount inside `AnimatePresence` for exit animation. */
export function WarehouseYardBoot() {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#030306]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(245,166,35,0.25), transparent 55%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(122,29,43,0.2), transparent 50%)",
        }}
      />
      <motion.div
        className="relative flex flex-col items-center gap-6 px-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative">
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 to-transparent shadow-[0_0_40px_rgba(245,166,35,0.15)]"
            animate={{ boxShadow: ["0 0 20px rgba(245,166,35,0.12)", "0 0 44px rgba(245,166,35,0.22)", "0 0 20px rgba(245,166,35,0.12)"] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="font-mono text-2xl font-bold tracking-tight text-amber-100/95">Y</span>
          </motion.div>
          <motion.span
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.6)]"
            animate={{ scale: [1, 1.2, 1], opacity: [0.9, 1, 0.9] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            aria-hidden
          />
        </div>
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.35em] text-white/45">Tommy D&apos;s</p>
          <p className="mt-2 font-sans text-lg font-medium text-white/95">Warming up the yard</p>
          <p className="mt-1 max-w-xs text-sm font-light text-white/50">Syncing racks with the log…</p>
        </div>
        <div className="flex w-48 gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="h-1 flex-1 rounded-full bg-gradient-to-r from-amber-400/80 to-amber-600/40"
              initial={{ scaleY: 0.35, opacity: 0.4 }}
              animate={{ scaleY: [0.35, 1, 0.35], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
