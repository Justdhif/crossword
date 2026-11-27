"use client";

import React from "react";
import { motion } from "framer-motion";
import { Users, Heart, Trophy, CheckCircle2 } from "lucide-react";
import { useCrossword } from "@/context/crossword-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function TeamScoreboard() {
  const { teams, activeTeamId, setActiveTeamId } = useCrossword();

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-none w-full select-none">
      <CardHeader className="border-b border-slate-100 pb-3 pt-4 px-4 sm:px-5 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
            <Users className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
              Info Tim
            </CardTitle>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Pilih tim untuk giliran menjawab
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* 3 Teams Grid */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          {teams.map((team) => {
            const isActive = team.id === activeTeamId;

            return (
              <motion.div
                key={team.id}
                onClick={() => setActiveTeamId(team.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex flex-col items-center justify-between rounded-xl border p-2.5 sm:p-3 text-center transition-all duration-150 cursor-pointer",
                  isActive
                    ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500 dark:bg-indigo-950/50 ring-2 ring-indigo-500/20"
                    : "border-slate-200/90 bg-slate-50/50 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-slate-700"
                )}
              >
                {/* Active Turn Pill */}
                {isActive && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-1.5 py-0.2 text-[9px] font-bold text-white shadow-xs">
                    Giliran
                  </span>
                )}

                {/* Team Name */}
                <span
                  className={cn(
                    "text-xs font-bold tracking-tight mb-1",
                    isActive
                      ? "text-indigo-900 dark:text-indigo-200"
                      : "text-slate-700 dark:text-slate-300"
                  )}
                >
                  {team.name}
                </span>

                {/* Score */}
                <div className="flex items-baseline gap-1 my-0.5">
                  <span
                    className={cn(
                      "text-xl sm:text-2xl font-black tracking-tight",
                      isActive
                        ? "text-indigo-600 dark:text-indigo-400"
                        : "text-slate-900 dark:text-white"
                    )}
                  >
                    {team.score}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Poin
                  </span>
                </div>

                {/* Lives (3 Hearts with Pop Animation) */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {Array.from({ length: 3 }).map((_, i) => {
                    const hasLife = i < team.lives;
                    return (
                      <div key={`heart-slot-${team.id}-${i}`} className="relative flex items-center justify-center">
                        <motion.div
                          key={`heart-anim-${team.id}-${i}-${hasLife}`}
                          initial={hasLife ? false : { scale: 1.8, rotate: -20 }}
                          animate={
                            hasLife
                              ? { scale: [0.85, 1.15, 1] }
                              : { scale: [1.8, 0.65, 1], rotate: [0, 15, 0] }
                          }
                          transition={{
                            type: "spring",
                            stiffness: 600,
                            damping: 16,
                            mass: 0.5,
                          }}
                          className="flex items-center justify-center"
                        >
                          <Heart
                            className={cn(
                              "h-3.5 w-3.5 transition-colors duration-200",
                              hasLife
                                ? "text-rose-500 fill-rose-500 drop-shadow-xs"
                                : "text-slate-300 dark:text-slate-700 fill-transparent stroke-1"
                            )}
                          />
                        </motion.div>

                        {/* Floating Pop "-1" Effect when a life is lost */}
                        {!hasLife && (
                          <motion.span
                            key={`pop-text-${team.id}-${i}`}
                            initial={{ opacity: 1, scale: 0.5, y: 0 }}
                            animate={{ opacity: 0, scale: 1.5, y: -12 }}
                            transition={{ duration: 0.55, ease: "easeOut" }}
                            className="absolute -top-1 pointer-events-none text-[8px] font-black text-rose-500 select-none"
                          >
                            -1
                          </motion.span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mt-1">
                  {team.lives}/3 Nyawa
                </span>
              </motion.div>
            );
          })}
        </div>

        {/* Rule Mechanism Footnote */}
        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-center text-[11px] font-medium text-slate-500 border border-slate-100 dark:bg-slate-950/40 dark:border-slate-800/60 dark:text-slate-400">
          Benar: <span className="font-bold text-emerald-600 dark:text-emerald-400">+10 Poin</span> • Salah: <span className="font-bold text-rose-500">-1 Nyawa</span> (Habis: <span className="font-bold text-rose-600">-5 Poin</span> & Refill)
        </div>
      </CardContent>
    </Card>
  );
}
