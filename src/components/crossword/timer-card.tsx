"use client";

import React from "react";
import { motion } from "framer-motion";
import { Timer, Play, Pause, RotateCcw, SkipForward, Clock } from "lucide-react";
import { useCrossword, TIMER_DURATION } from "@/context/crossword-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TimerCardProps {
  className?: string;
}

export function TimerCard({ className }: TimerCardProps) {
  const {
    timerSeconds,
    isTimerRunning,
    toggleTimer,
    resetTimer,
    nextTeamTurn,
    activeTeamId,
  } = useCrossword();

  // Progress percentage (from 100% at 20s down to 0% at 0s)
  const progressPercent = Math.max(0, Math.min(100, (timerSeconds / TIMER_DURATION) * 100));

  const isLowTime = timerSeconds <= 5;
  const isMidTime = timerSeconds <= 10 && timerSeconds > 5;

  return (
    <Card
      className={cn(
        "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-none w-full select-none flex flex-col justify-between",
        className
      )}
    >
      {/* Header */}
      <CardHeader className="border-b border-slate-100 pb-3 pt-4 px-4 sm:px-5 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                isTimerRunning
                  ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              <Timer className={cn("h-4 w-4", isTimerRunning && "animate-spin-slow")} />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                Timer Giliran
              </CardTitle>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Giliran aktif: <span className="font-bold text-indigo-600 dark:text-indigo-400">Tim {activeTeamId}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-bold px-2 py-0.5",
                isTimerRunning
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
              )}
            >
              {isTimerRunning ? "Berjalan" : "Berhenti"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      {/* Main Body */}
      <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Hanya Durasi Bar (Full Width tanpa box & tanpa teks gede) */}
        <div className="w-full space-y-1.5 py-1">
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
            <motion.div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                isLowTime
                  ? "bg-rose-500"
                  : isMidTime
                  ? "bg-amber-500"
                  : "bg-indigo-600"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold text-slate-400">
            <span>0s</span>
            <span
              className={cn(
                "font-bold font-mono transition-colors",
                isLowTime ? "text-rose-600 dark:text-rose-400 animate-pulse" : "text-slate-600 dark:text-slate-300"
              )}
            >
              {timerSeconds}s
            </span>
            <span>20s</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="grid grid-cols-3 gap-2">
          {/* Play / Stop Toggle Button */}
          <Button
            type="button"
            onClick={toggleTimer}
            className={cn(
              "col-span-1 h-10 font-bold transition-all shadow-xs",
              isTimerRunning
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
          >
            {isTimerRunning ? (
              <>
                <Pause className="h-4 w-4 mr-1.5" />
                Stop
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1.5" />
                Play
              </>
            )}
          </Button>

          {/* Reset Timer Button */}
          <Button
            type="button"
            variant="outline"
            onClick={resetTimer}
            className="h-10 font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            title="Reset timer ke 20 detik"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>

          {/* Next Turn Button */}
          <Button
            type="button"
            variant="outline"
            onClick={nextTeamTurn}
            className="h-10 font-semibold border-indigo-200 bg-indigo-50/50 hover:bg-indigo-100 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
            title="Ganti giliran ke tim selanjutnya"
          >
            <SkipForward className="h-3.5 w-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
            Ganti Tim
          </Button>
        </div>

        {/* Mechanism Footnote */}
        <div className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-center text-[10px] font-medium text-slate-500 border border-slate-100 dark:bg-slate-950/40 dark:border-slate-800/60 dark:text-slate-400">
          Durasi 20s • Waktu habis atau nyawa habis otomatis berganti giliran • Waktu stop tidak terakumulasi
        </div>
      </CardContent>
    </Card>
  );
}
