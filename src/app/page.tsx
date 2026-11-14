"use client";

import React from "react";
import { CrosswordGrid } from "@/components/crossword/crossword-grid";
import { ClueListAndCheck } from "@/components/crossword/clue-list-and-check";
import { TeamScoreboard } from "@/components/crossword/team-scoreboard";
import { TimerCard } from "@/components/crossword/timer-card";

export default function HomePage() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Page Header */}
      <div className="mb-6 border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Teka-Teki Silang
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          Klik salah satu kotak pada papan teka-teki silang untuk menampilkan soal dan mengisi jawaban.
        </p>
      </div>

      {/* Main Two-Column Layout with tight gap and bottom aligned via items-stretch */}
      <div className="flex flex-col lg:flex-row items-stretch justify-start gap-4 lg:gap-5">
        {/* Left: Crossword Grid + Timer Card below it, aligned to bottom of right column */}
        <div className="shrink-0 flex flex-col justify-between w-full lg:w-auto space-y-3">
          <CrosswordGrid />
          <TimerCard className="flex-1" />
        </div>

        {/* Right: Soal, Input Jawaban & Info Tim */}
        <div className="w-full lg:max-w-md xl:max-w-lg flex flex-col justify-between space-y-3">
          <ClueListAndCheck />
          <TeamScoreboard />
        </div>
      </div>
    </div>
  );
}
