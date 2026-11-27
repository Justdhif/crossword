"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { INITIAL_GRID_CELLS, GRID_COLS } from "@/lib/crossword-data";
import { useCrossword } from "@/context/crossword-context";
import { cn } from "@/lib/utils";

export function CrosswordGrid() {
  const { state, selectedClueId, activeAction } = useCrossword();

  // Determine if a cell is part of the currently active action (wrong or correct)
  const isCellInActiveAction = (wordIds: string[]) => {
    if (!activeAction) return false;
    return wordIds.includes(activeAction.id);
  };

  // Determine if a cell is part of the selected clue
  const isCellSelected = (wordIds: string[]) => {
    if (!selectedClueId) return false;
    return wordIds.includes(selectedClueId);
  };

  return (
    <div className="relative flex flex-col items-start select-none w-full">
      {/* Grid container without heavy shadow, clean border */}
      <div className="relative max-w-full overflow-x-auto no-scrollbar rounded-2xl bg-white p-2 sm:p-4 border border-slate-200/90 dark:bg-slate-900/90 dark:border-slate-800">
        <div
          className="grid gap-1 sm:gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))`,
          }}
        >
          {INITIAL_GRID_CELLS.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const cellKey = `${rIdx}-${cIdx}`;

              // Black / Inactive cell (crossword blocker)
              if (!cell) {
                return (
                  <div
                    key={cellKey}
                    className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 rounded-md bg-slate-100/70 border border-slate-200/50 dark:bg-slate-950/90 dark:border-slate-900"
                  />
                );
              }

              const letter = state.revealedCells[cellKey] || "";
              const hasLetter = Boolean(letter);
              const isSelected = isCellSelected(cell.wordIds);
              const isInActive = isCellInActiveAction(cell.wordIds);
              const isActionWrong = isInActive && activeAction?.status === "wrong";
              const isActionCorrect = isInActive && activeAction?.status === "correct";

              return (
                <motion.div
                  key={cellKey}
                  animate={
                    isActionWrong
                      ? {
                          x: [0, -8, 8, -6, 6, -3, 3, 0],
                          transition: { duration: 0.65, ease: "easeInOut" },
                        }
                      : isActionCorrect
                      ? {
                          scale: [1, 1.15, 0.96, 1.06, 1],
                          transition: { duration: 0.7, ease: "easeOut" },
                        }
                      : {
                          scale: isSelected ? 1.04 : 1,
                        }
                  }
                  className={cn(
                    "relative flex h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 lg:h-10 lg:w-10 items-center justify-center rounded-md sm:rounded-lg border text-center transition-all duration-150 cursor-default",
                    // 1. Default empty cell
                    !hasLetter &&
                      "bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800",
                    // 2. Filled cell with letter
                    hasLetter &&
                      "bg-slate-50/90 border-slate-300 font-bold text-slate-800 dark:bg-slate-800/90 dark:border-slate-700 dark:text-white",
                    // 3. Highlight when part of current selected clue
                    isSelected &&
                      "border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-400/40 dark:bg-indigo-950/60 dark:border-indigo-400 dark:ring-indigo-500/50",
                    // 4. Smooth Wrong Action State
                    isActionWrong &&
                      "!bg-rose-600 !border-rose-400 !text-white ring-4 ring-rose-500/60 shadow-md",
                    // 5. Smooth Correct Action State
                    isActionCorrect &&
                      "!bg-emerald-600 !border-emerald-400 !text-white ring-4 ring-emerald-500/60 shadow-md"
                  )}
                >
                  {/* Clue Number Badge in the corner */}
                  {cell.clueNumber && (
                    <span
                      className={cn(
                        "absolute left-0.5 top-0.5 text-[8px] sm:text-[9px] font-black leading-none",
                        isActionWrong || isActionCorrect
                          ? "text-white"
                          : isSelected
                          ? "text-indigo-600 dark:text-indigo-300"
                          : "text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {cell.clueNumber}
                    </span>
                  )}

                  {/* Letter Content with smooth animation & high contrast */}
                  <AnimatePresence mode="wait">
                    {letter ? (
                      <motion.span
                        key={`letter-${cellKey}-${letter}`}
                        initial={{ opacity: 0, scale: 0.2, rotateY: 90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 24,
                          mass: 0.8,
                        }}
                        className={cn(
                          "text-xs sm:text-base md:text-lg font-black uppercase tracking-wider select-none",
                          isActionWrong || isActionCorrect
                            ? "text-white"
                            : isSelected
                            ? "text-indigo-950 dark:text-indigo-100"
                            : "text-slate-900 dark:text-white"
                        )}
                      >
                        {letter}
                      </motion.span>
                    ) : null}
                  </AnimatePresence>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
