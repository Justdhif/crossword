"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  Search,
  Eye,
  Check,
  RotateCcw,
  MousePointerClick,
  Sparkles,
  Info,
} from "lucide-react";
import { CROSSWORD_CLUES, CrosswordClue } from "@/lib/crossword-data";
import { useCrossword } from "@/context/crossword-context";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ClueListAndCheck() {
  const {
    state,
    selectedClueId,
    submitAnswer,
    spillAnswer,
    resetGame,
    recordTeamAnswer,
    activeTeamId,
  } = useCrossword();

  const [activeClueId, setActiveClueId] = useState<string>(selectedClueId || "1");
  const [letters, setLetters] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isSpilling, setIsSpilling] = useState(false);
  
  // Feedback status persists across clicks, typing, and page refresh
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("crossword_last_feedback_v1");
        if (saved) return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return null;
  });

  // Save feedback whenever it changes
  useEffect(() => {
    if (feedback) {
      try {
        localStorage.setItem("crossword_last_feedback_v1", JSON.stringify(feedback));
      } catch {
        // ignore
      }
    }
  }, [feedback]);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Find active clue
  const currentClue: CrosswordClue | undefined = useMemo(() => {
    return CROSSWORD_CLUES.find((c) => c.id === activeClueId);
  }, [activeClueId]);

  const isCurrentSolved = useMemo(() => {
    return currentClue ? state.solvedClueIds.includes(currentClue.id) : false;
  }, [currentClue, state.solvedClueIds]);

  // Helper to check if a specific index in the current clue already has a revealed letter on the board
  const getRevealedCharForIndex = (index: number) => {
    if (!currentClue) return "";
    const r = currentClue.direction === "Mendatar" ? currentClue.row : currentClue.row + index;
    const c = currentClue.direction === "Mendatar" ? currentClue.col + index : currentClue.col;
    return state.revealedCells[`${r}-${c}`] || "";
  };

  // Sync active clue when selectedClueId changes from board click without erasing feedback banner
  useEffect(() => {
    if (selectedClueId) {
      setActiveClueId(selectedClueId);
    }
  }, [selectedClueId]);

  // Update letter boxes: pre-fill solved letters OR intersecting revealed letters!
  useEffect(() => {
    if (!currentClue) return;

    if (isCurrentSolved) {
      const cleanWord = currentClue.word.split("");
      setLetters(cleanWord);
    } else {
      // Pre-fill any letter that is ALREADY unlocked/revealed on the crossword board!
      const initialLetters = Array.from({ length: currentClue.length }, (_, i) => {
        const r = currentClue.direction === "Mendatar" ? currentClue.row : currentClue.row + i;
        const c = currentClue.direction === "Mendatar" ? currentClue.col + i : currentClue.col;
        return state.revealedCells[`${r}-${c}`] || "";
      });
      setLetters(initialLetters);
    }

    // Auto focus the first box that is NOT already revealed
    setTimeout(() => {
      let target = 0;
      while (target < currentClue.length) {
        const r = currentClue.direction === "Mendatar" ? currentClue.row : currentClue.row + target;
        const c = currentClue.direction === "Mendatar" ? currentClue.col + target : currentClue.col;
        if (!state.revealedCells[`${r}-${c}`]) break;
        target++;
      }
      if (target < currentClue.length) {
        inputRefs.current[target]?.focus();
        inputRefs.current[target]?.select();
      }
    }, 60);
  }, [currentClue, isCurrentSolved, state.revealedCells]);

  // Handle letter typing into box
  const handleLetterChange = (index: number, val: string) => {
    if (!currentClue) return;

    // If this box is already unlocked from board, don't allow modifying it
    if (!isCurrentSolved && getRevealedCharForIndex(index)) {
      return;
    }

    const char = val.slice(-1).toUpperCase();
    const updated = [...letters];
    updated[index] = char;
    setLetters(updated);

    // If letter entered, auto-focus next box that is not already revealed
    if (char && index < currentClue.length - 1) {
      let nextIdx = index + 1;
      while (nextIdx < currentClue.length && getRevealedCharForIndex(nextIdx)) {
        nextIdx++;
      }
      if (nextIdx < currentClue.length) {
        inputRefs.current[nextIdx]?.focus();
        inputRefs.current[nextIdx]?.select();
      }
    }
  };

  // Handle backspace and arrow navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!currentClue) return;

    const isCurrentRevealed = Boolean(getRevealedCharForIndex(index));

    if (e.key === "Backspace") {
      if (isCurrentRevealed) {
        // If backspace on an unlocked cell, jump to previous unrevealed box
        e.preventDefault();
        let prevIdx = index - 1;
        while (prevIdx >= 0 && getRevealedCharForIndex(prevIdx)) {
          prevIdx--;
        }
        if (prevIdx >= 0) {
          inputRefs.current[prevIdx]?.focus();
        }
        return;
      }

      if (!letters[index] && index > 0) {
        // Move to previous unrevealed box and clear it
        let prevIdx = index - 1;
        while (prevIdx >= 0 && getRevealedCharForIndex(prevIdx)) {
          prevIdx--;
        }
        if (prevIdx >= 0) {
          const updated = [...letters];
          updated[prevIdx] = "";
          setLetters(updated);
          inputRefs.current[prevIdx]?.focus();
        }
      } else {
        const updated = [...letters];
        updated[index] = "";
        setLetters(updated);
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      let prevIdx = index - 1;
      while (prevIdx >= 0 && getRevealedCharForIndex(prevIdx)) {
        prevIdx--;
      }
      if (prevIdx >= 0) {
        inputRefs.current[prevIdx]?.focus();
        inputRefs.current[prevIdx]?.select();
      }
    } else if (e.key === "ArrowRight" && index < currentClue.length - 1) {
      let nextIdx = index + 1;
      while (nextIdx < currentClue.length && getRevealedCharForIndex(nextIdx)) {
        nextIdx++;
      }
      if (nextIdx < currentClue.length) {
        inputRefs.current[nextIdx]?.focus();
        inputRefs.current[nextIdx]?.select();
      }
    } else if (e.key === "Enter") {
      handleCheckAnswer();
    }
  };

  // Handle paste full word
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (!currentClue) return;
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").trim().replace(/\s+/g, "").toUpperCase();
    const updated = [...letters];
    for (let i = 0; i < currentClue.length; i++) {
      if (i < pasted.length) {
        // Don't overwrite revealed intersecting letters unless identical
        const existingRev = getRevealedCharForIndex(i);
        if (!existingRev || existingRev === pasted[i]) {
          updated[i] = pasted[i];
        }
      }
    }
    setLetters(updated);
    const nextIdx = Math.min(pasted.length, currentClue.length - 1);
    inputRefs.current[nextIdx]?.focus();
  };

  // 1. Cek Jawaban: validasi input teks per kotak dengan kunci jawaban
  const handleCheckAnswer = async () => {
    if (!currentClue || isChecking) return;

    const rawTyped = letters.join("").trim();
    if (rawTyped.length === 0) {
      setFeedback({
        type: "error",
        message: "Silakan isi huruf jawaban terlebih dahulu!",
      });
      return;
    }

    setIsChecking(true);

    const res = await submitAnswer(currentClue.id, rawTyped);
    setIsChecking(false);

    // Apply Team Scoring & Lives Mechanism
    const teamRes = recordTeamAnswer(res.success);

    let feedbackMsg = res.message;
    if (res.success) {
      feedbackMsg = `${res.message} • ${teamRes.teamName} +10 Poin!`;
    } else {
      if (teamRes.refilled) {
        feedbackMsg = `${res.message} • Nyawa ${teamRes.teamName} habis! Penalti -5 Poin & Nyawa diisi ulang.`;
      } else {
        feedbackMsg = `${res.message} • Nyawa ${teamRes.teamName} berkurang 1 (Tersisa ${teamRes.livesRemaining}).`;
      }
    }

    setFeedback({
      type: res.success ? "success" : "error",
      message: feedbackMsg,
    });
  };

  // 2. Spill Jawaban: langsung membuka / menampilkan jawaban asli
  const handleSpillAnswer = async () => {
    if (!currentClue || isSpilling) return;

    setIsSpilling(true);

    const res = await spillAnswer(currentClue.id);
    setIsSpilling(false);

    if (res.solution) {
      const cleanWord = currentClue.word.split("");
      setLetters(cleanWord);
    }

    setFeedback({
      type: "info",
      message: `Jawaban No ${currentClue.number}: ${currentClue.displayWord || currentClue.word}`,
    });
  };

  // 3. Reset Game: membersihkan semua jawaban yang sudah terjawab atau dispill
  const handleResetGame = async () => {
    localStorage.removeItem("crossword_last_feedback_v1");
    await resetGame();
    if (currentClue) {
      setLetters(Array(currentClue.length).fill(""));
    }
    setFeedback({
      type: "info",
      message: "Seluruh jawaban teka-teki silang berhasil direset!",
    });
  };

  return (
    <Card className="border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-none w-full">
      <CardHeader className="border-b border-slate-100 pb-4 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
            Jawaban Soal
          </CardTitle>
          <div className="flex items-center gap-2">
            {currentClue && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold flex items-center gap-1",
                  isCurrentSolved
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                    : "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                )}
              >
                {isCurrentSolved ? (
                  <>
                    <Check className="h-3 w-3" />
                    Terjawab
                  </>
                ) : (
                  "Belum Terjawab"
                )}
              </Badge>
            )}

            {/* Button Reset Game */}
            <button
              type="button"
              onClick={handleResetGame}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-900 cursor-pointer shadow-sm"
              title="Reset semua jawaban teka-teki silang"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Active Clue Question Prompt */}
        {currentClue ? (
          <motion.div
            key={currentClue.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30 shadow-none"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 font-bold text-white text-xs shadow-sm">
                {currentClue.number}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                {currentClue.direction} ({currentClue.length} Huruf)
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-relaxed">
              {currentClue.clue}
            </p>
          </motion.div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-300 p-4 text-xs sm:text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <MousePointerClick className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <span>Klik salah satu kotak pada papan teka-teki silang untuk menampilkan soal.</span>
          </div>
        )}

        {/* Input Teks Per Kotak - Selalu Sebaris (flex-nowrap) */}
        {currentClue && (
          <div className="py-1">
            <div className="flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5 py-1 w-full max-w-full overflow-x-auto no-scrollbar">
              {Array.from({ length: currentClue.length }).map((_, idx) => {
                const char = letters[idx] || "";
                const isRevealedFromBoard = Boolean(getRevealedCharForIndex(idx));

                return (
                  <div key={`letter-box-wrap-${currentClue.id}-${idx}`} className="relative flex-1 min-w-[28px] max-w-[42px] shrink">
                    <input
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={char}
                      readOnly={isRevealedFromBoard || isCurrentSolved}
                      onChange={(e) => handleLetterChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      disabled={isChecking || isSpilling}
                      title={isRevealedFromBoard ? "Huruf dari kata yang sudah terbuka" : undefined}
                      className={cn(
                        "flex h-10 sm:h-12 w-full items-center justify-center rounded-lg sm:rounded-xl border text-center text-base sm:text-xl font-bold uppercase transition-all duration-150 focus:outline-none",
                        // If cell is already revealed on board from intersecting word
                        isRevealedFromBoard
                          ? "border-indigo-300 bg-indigo-100/60 text-indigo-950 dark:border-indigo-500/60 dark:bg-indigo-900/40 dark:text-indigo-100 ring-1 ring-indigo-400/30 cursor-default"
                          : char
                          ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 ring-1 ring-indigo-500/20 dark:border-indigo-400 dark:bg-indigo-950/60 dark:text-white"
                          : "border-slate-300 bg-white text-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-indigo-400"
                      )}
                    />
                    {isRevealedFromBoard && !isCurrentSolved && (
                      <span className="absolute -top-1.5 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white shadow-sm">
                        ✓
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons: Cek Jawaban & Spill Jawaban */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          {/* Button Cek Jawaban */}
          <Button
            type="button"
            onClick={handleCheckAnswer}
            disabled={isChecking || isSpilling || !currentClue}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold h-11 shadow-sm transition-colors"
          >
            <Search className="h-4 w-4 mr-1.5" />
            {isChecking ? "Mengecek..." : "Cek Jawaban"}
          </Button>

          {/* Button Spill Jawaban */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSpillAnswer}
            disabled={isChecking || isSpilling || !currentClue}
            className="w-full font-semibold border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/70 hover:text-indigo-900 dark:border-indigo-900/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 h-11 shadow-sm transition-colors"
          >
            <Eye className="h-4 w-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            {isSpilling ? "Membuka..." : "Spill Jawaban"}
          </Button>
        </div>

        {/* Banner Info (Selalu Tampil) */}
        <motion.div
          key={feedback ? feedback.message : `standby-${activeTeamId}-${currentClue?.id}`}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex items-center gap-2 rounded-xl p-3 text-xs sm:text-sm font-medium border shadow-none",
            feedback
              ? feedback.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800"
                : feedback.type === "info"
                ? "bg-indigo-50 text-indigo-900 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800"
                : "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-200 dark:border-rose-800"
              : "bg-indigo-50/60 text-slate-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-slate-300 dark:border-indigo-900/40"
          )}
        >
          {feedback ? (
            feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : feedback.type === "info" ? (
              <Eye className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            )
          ) : (
            <Info className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          )}

          <span>
            {feedback
              ? feedback.message
              : currentClue
              ? `Giliran Tim ${activeTeamId}: Isi huruf jawaban lalu klik Cek Jawaban.`
              : "Klik salah satu kotak pada teka-teki silang untuk memulai."}
          </span>
        </motion.div>
      </CardContent>
    </Card>
  );
}
