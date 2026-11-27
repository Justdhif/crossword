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
  Sparkles,
  Info,
  Lock,
  ListOrdered,
  HelpCircle,
  ChevronDown,
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
    setSelectedClueId,
    submitAnswer,
    spillAnswer,
    resetGame,
    recordTeamAnswer,
    activeTeamId,
    isTimerRunning,
    getClueRounds,
  } = useCrossword();

  const [letters, setLetters] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [isSpilling, setIsSpilling] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
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

  // Close custom dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Find active clue directly from selectedClueId
  const currentClue: CrosswordClue | undefined = useMemo(() => {
    return CROSSWORD_CLUES.find((c) => c.id === selectedClueId);
  }, [selectedClueId]);

  const isCurrentSolved = useMemo(() => {
    return currentClue ? state.solvedClueIds.includes(currentClue.id) : false;
  }, [currentClue, state.solvedClueIds]);

  // Soal terkunci jika sedang dipilih dan belum selesai
  const isClueLocked = Boolean(currentClue && !isCurrentSolved);

  // Round count tracking for Spill Jawaban unlock (unlocks after 2 rounds / 6 team turns)
  const clueRoundInfo = useMemo(() => {
    return currentClue
      ? getClueRounds(currentClue.id)
      : { turns: 0, rounds: 0, canSpill: false };
  }, [currentClue, getClueRounds]);
  const canSpill = clueRoundInfo.canSpill;

  // Helper to check if a specific index in the current clue already has a revealed letter on the board
  const getRevealedCharForIndex = (index: number) => {
    if (!currentClue) return "";
    const r = currentClue.direction === "Mendatar" ? currentClue.row : currentClue.row + index;
    const c = currentClue.direction === "Mendatar" ? currentClue.col + index : currentClue.col;
    return state.revealedCells[`${r}-${c}`] || "";
  };

  // Update letter boxes: pre-fill solved letters OR intersecting revealed letters!
  useEffect(() => {
    if (!currentClue) {
      setLetters([]);
      return;
    }

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

    // Auto focus the first box that is NOT already revealed (only if timer is running)
    setTimeout(() => {
      if (!isTimerRunning) return;
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
  }, [currentClue, isCurrentSolved, state.revealedCells, isTimerRunning]);

  // Handle letter typing into box
  const handleLetterChange = (index: number, val: string) => {
    if (!currentClue || !isTimerRunning) return;

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
    if (!currentClue || !isTimerRunning) return;

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
    if (!currentClue || !isTimerRunning) return;
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
    if (!currentClue || isChecking || !isTimerRunning) return;

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

  // 3. Reset Game: membersihkan semua jawaban dan mereset skor semua tim
  const handleResetGame = async () => {
    localStorage.removeItem("crossword_last_feedback_v1");
    await resetGame();
    setLetters([]);
    setFeedback({
      type: "info",
      message: "Seluruh permainan, teka-teki silang, dan skor tim berhasil direset!",
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

            {/* Button Reset Semua (Reset teka-teki silang, soal, dan tim) */}
            <button
              type="button"
              onClick={handleResetGame}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 dark:hover:border-rose-900 cursor-pointer shadow-sm"
              title="Reset semua permainan, teka-teki silang, dan skor tim"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Semua</span>
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Pilihan Soal Custom Dropdown Selector */}
        <div ref={dropdownRef} className="relative space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <ListOrdered className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Pilih Soal Teka-Teki:</span>
            </span>
          </div>

          {/* Trigger Button */}
          <button
            type="button"
            disabled={isClueLocked}
            onClick={() => !isClueLocked && setIsDropdownOpen((prev) => !prev)}
            className={cn(
              "w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all shadow-xs text-left",
              isClueLocked
                ? "cursor-not-allowed opacity-75 bg-slate-100 text-slate-500 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-400"
                : "cursor-pointer hover:border-indigo-300 hover:bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-white dark:hover:border-indigo-500",
              isDropdownOpen && "border-indigo-500 ring-2 ring-indigo-500/20 bg-white dark:bg-slate-950"
            )}
            title={isClueLocked ? "Selesaikan soal ini terlebih dahulu sebelum berganti soal" : "Pilih nomor soal 1 - 12"}
          >
            <div className="flex items-center gap-2 truncate">
              {currentClue ? (
                <>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-600 text-[11px] font-bold text-white shadow-xs">
                    {currentClue.number}
                  </span>
                  <span className="truncate">
                    Soal {currentClue.number} • {currentClue.direction} ({currentClue.length} Huruf)
                  </span>
                  {isCurrentSolved && (
                    <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Selesai
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 font-normal">
                  -- Pilih Nomor Soal (1 - 12) --
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200",
                isDropdownOpen && "rotate-180 text-indigo-600 dark:text-indigo-400"
              )}
            />
          </button>

          {/* Custom Dropdown Menu List */}
          <AnimatePresence>
            {isDropdownOpen && !isClueLocked && (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-950 no-scrollbar"
              >
                <div className="space-y-1">
                  {CROSSWORD_CLUES.map((clue) => {
                    const isSolved = state.solvedClueIds.includes(clue.id);
                    const isSelected = selectedClueId === clue.id;

                    return (
                      <button
                        key={clue.id}
                        type="button"
                        onClick={() => {
                          setSelectedClueId(clue.id);
                          setIsDropdownOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg px-3 py-2 text-left text-xs sm:text-sm font-medium transition-colors cursor-pointer",
                          isSelected
                            ? "bg-indigo-50 text-indigo-900 font-semibold dark:bg-indigo-950/60 dark:text-indigo-200"
                            : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-900"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-bold",
                              isSelected
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}
                          >
                            {clue.number}
                          </span>
                          <span>
                            Soal {clue.number} • {clue.direction} ({clue.length} Huruf)
                          </span>
                        </div>
                        {isSolved ? (
                          <span className="flex items-center gap-1 rounded bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
                            <Check className="h-2.5 w-2.5" />
                            Selesai
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                            Belum Selesai
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Active Clue Question Prompt */}
        {currentClue ? (
          <motion.div
            key={currentClue.id}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 sm:p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30 shadow-none"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-relaxed">
                {currentClue.clue}
              </p>
              {isCurrentSolved && (
                <span className="shrink-0 flex items-center gap-1 rounded-md bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-900/60 dark:border-emerald-700 dark:text-emerald-200">
                  <Check className="h-2.5 w-2.5" />
                  Selesai
                </span>
              )}
            </div>
          </motion.div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/30 p-6 text-center text-xs sm:text-sm text-slate-600 dark:border-indigo-900/60 dark:bg-indigo-950/20 dark:text-slate-400">
            <HelpCircle className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            <p className="font-bold text-slate-900 dark:text-white">
              Belum Ada Soal Yang Dipilih
            </p>
            <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">
              Silakan pilih salah satu nomor soal pada pilihan di atas. Soal akan tampil di sini dan kotak-kotak kata di papan teka-teki silang akan otomatis aktif.
            </p>
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
                      readOnly={isRevealedFromBoard || isCurrentSolved || !isTimerRunning}
                      onChange={(e) => handleLetterChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      disabled={isChecking || isSpilling || !isTimerRunning}
                      title={
                        !isTimerRunning
                          ? "Nyalakan timer giliran terlebih dahulu untuk mulai mengisi jawaban"
                          : isRevealedFromBoard
                          ? "Huruf dari kata yang sudah terbuka"
                          : undefined
                      }
                      className={cn(
                        "flex h-10 sm:h-12 w-full items-center justify-center rounded-lg sm:rounded-xl border text-center text-base sm:text-xl font-bold uppercase transition-all duration-150 focus:outline-none",
                        !isTimerRunning &&
                          "opacity-60 cursor-not-allowed bg-slate-100/80 dark:bg-slate-900/80 border-dashed border-slate-300 dark:border-slate-700",
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
            disabled={isChecking || isSpilling || !currentClue || !isTimerRunning}
            className={cn(
              "w-full font-semibold h-11 shadow-sm transition-colors",
              !isTimerRunning
                ? "bg-slate-300 text-slate-500 dark:bg-slate-800 dark:text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            )}
            title={!isTimerRunning ? "Nyalakan timer terlebih dahulu untuk mengecek jawaban" : undefined}
          >
            <Search className="h-4 w-4 mr-1.5" />
            {isChecking ? "Mengecek..." : "Cek Jawaban"}
          </Button>

          {/* Button Spill Jawaban (Disabled sampai 2x putaran rotasi tim) */}
          <Button
            type="button"
            variant="outline"
            onClick={handleSpillAnswer}
            disabled={isChecking || isSpilling || !currentClue || !canSpill}
            title={
              !canSpill
                ? `Tombol Spill Jawaban akan terbuka setelah 2x putaran (Saat ini: Putaran ${clueRoundInfo.rounds}/2, ${clueRoundInfo.turns}/6 giliran)`
                : "Spill Jawaban sekarang"
            }
            className={cn(
              "w-full font-semibold h-11 shadow-sm transition-colors",
              canSpill
                ? "border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/70 hover:text-indigo-900 dark:border-indigo-900/80 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
                : "opacity-60 cursor-not-allowed border-slate-200 bg-slate-100/80 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"
            )}
          >
            {canSpill ? (
              <Eye className="h-4 w-4 mr-1.5 text-indigo-600 dark:text-indigo-400" />
            ) : (
              <Lock className="h-3.5 w-3.5 mr-1.5 text-slate-400 dark:text-slate-500" />
            )}
            <span>
              {canSpill
                ? "Spill Jawaban"
                : `Spill Jawaban (${clueRoundInfo.rounds}/2 Putaran)`}
            </span>
          </Button>
        </div>

        {/* Banner Info (Selalu Tampil) */}
        <motion.div
          key={feedback ? feedback.message : `standby-${activeTeamId}-${currentClue?.id}-${isTimerRunning}`}
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
              : !isTimerRunning
              ? "bg-amber-50/70 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900/60"
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
          ) : !isTimerRunning ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <Info className="h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
          )}

          <span>
            {feedback
              ? feedback.message
              : !currentClue
              ? "Silakan pilih salah satu nomor soal pada pilihan di atas untuk memulai."
              : !isTimerRunning
              ? `Nyalakan timer giliran (Play) terlebih dahulu untuk mulai mengisi jawaban Tim ${activeTeamId}.`
              : `Giliran Tim ${activeTeamId}: Isi huruf jawaban lalu klik Cek Jawaban.`}
          </span>
        </motion.div>
      </CardContent>
    </Card>
  );
}
