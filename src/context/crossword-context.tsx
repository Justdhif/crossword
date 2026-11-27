"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import confetti from "canvas-confetti";
import { GameAction, GameState } from "@/lib/server-state";
import { CROSSWORD_CLUES } from "@/lib/crossword-data";

export interface Team {
  id: number;
  name: string;
  score: number;
  lives: number; // Max 3
}

export interface TeamAnswerResult {
  teamName: string;
  isCorrect: boolean;
  scoreDelta: number;
  livesRemaining: number;
  refilled: boolean;
}

export const INITIAL_TEAMS: Team[] = [
  { id: 1, name: "Tim 1", score: 0, lives: 3 },
  { id: 2, name: "Tim 2", score: 0, lives: 3 },
  { id: 3, name: "Tim 3", score: 0, lives: 3 },
];

export const TIMER_DURATION = 20;

interface CrosswordContextType {
  state: GameState;
  selectedClueId: string | null;
  setSelectedClueId: (id: string | null) => void;
  activeAction: GameAction | null;
  submitAnswer: (clueId: string, answer: string) => Promise<{ success: boolean; message: string }>;
  checkAnswer: (clueId: string) => Promise<{ success: boolean; message: string }>;
  spillAnswer: (clueId: string) => Promise<{ success: boolean; message: string; solution?: string }>;
  resetGame: () => Promise<void>;
  isLoading: boolean;
  // Team Management
  teams: Team[];
  activeTeamId: number;
  setActiveTeamId: (id: number) => void;
  recordTeamAnswer: (isCorrect: boolean) => TeamAnswerResult;
  resetTeams: () => void;
  nextTeamTurn: () => void;
  // Timer Management
  timerSeconds: number;
  isTimerRunning: boolean;
  toggleTimer: () => void;
  resetTimer: () => void;
  // Clue Turns & Rounds (Spill unlocks after 2 rounds / 6 team turns)
  clueTurnCounts: Record<string, number>;
  getClueRounds: (clueId: string) => { turns: number; rounds: number; canSpill: boolean };
}

const STORAGE_KEY = "crossword_persisted_game_state_v2";
const TEAMS_STORAGE_KEY = "crossword_teams_persisted_v1";
const CLUE_TURNS_STORAGE_KEY = "crossword_clue_turn_counts_v1";
const SELECTED_CLUE_STORAGE_KEY = "crossword_selected_clue_id_v1";

const defaultState: GameState = {
  solvedClueIds: [],
  revealedCells: {},
  lastAction: null,
  score: 0,
  totalClues: CROSSWORD_CLUES.length,
  isComplete: false,
  updatedAt: Date.now(),
};

const CrosswordContext = createContext<CrosswordContextType | undefined>(undefined);

export function CrosswordProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(defaultState);
  const [selectedClueId, setSelectedClueId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(SELECTED_CLUE_STORAGE_KEY);
        if (saved) return saved;
      } catch (e) {
        console.warn("Failed to read initial selectedClueId from localStorage", e);
      }
    }
    return null;
  });
  const [activeAction, setActiveAction] = useState<GameAction | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Teams State (Tim 1, Tim 2, Tim 3) with safe initial localStorage read
  const [teams, setTeams] = useState<Team[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TEAMS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.teams) && parsed.teams.length === 3) {
            return parsed.teams;
          }
        }
      } catch (e) {
        console.warn("Failed to read initial teams from localStorage", e);
      }
    }
    return INITIAL_TEAMS;
  });

  const [activeTeamId, setActiveTeamId] = useState<number>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TEAMS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (typeof parsed?.activeTeamId === "number") {
            return parsed.activeTeamId;
          }
        }
      } catch (e) {
        console.warn("Failed to read initial activeTeamId from localStorage", e);
      }
    }
    return 1;
  });

  const isTeamsLoadedRef = useRef(false);

  // Timer State (20s duration, play/stop)
  const [timerSeconds, setTimerSeconds] = useState<number>(TIMER_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const actionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clue Turn Counts (Tracks turns per clue to unlock Spill Jawaban after 2 rounds / 6 turns)
  const [clueTurnCounts, setClueTurnCounts] = useState<Record<string, number>>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(CLUE_TURNS_STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.warn("Failed to read clueTurnCounts", e);
      }
    }
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem(CLUE_TURNS_STORAGE_KEY, JSON.stringify(clueTurnCounts));
    } catch (e) {
      console.warn("Failed to save clueTurnCounts", e);
    }
  }, [clueTurnCounts]);

  // Persist selectedClueId across page refreshes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        if (selectedClueId) {
          localStorage.setItem(SELECTED_CLUE_STORAGE_KEY, selectedClueId);
        } else {
          localStorage.removeItem(SELECTED_CLUE_STORAGE_KEY);
        }
      } catch (e) {
        console.warn("Failed to save selectedClueId to localStorage", e);
      }
    }
  }, [selectedClueId]);

  const incrementClueTurn = useCallback(
    (clueId?: string | null) => {
      const target = clueId || selectedClueId;
      if (!target) return;
      setClueTurnCounts((prev) => ({
        ...prev,
        [target]: (prev[target] || 0) + 1,
      }));
    },
    [selectedClueId]
  );

  const getClueRounds = useCallback(
    (clueId: string) => {
      const turns = clueTurnCounts[clueId] || 0;
      // 1 putaran = 3 tim telah mencoba (3 giliran)
      const rounds = Math.min(2, Math.floor(turns / 3));
      // Kebuka ketika sudah 2x putaran (turns >= 6)
      const canSpill = turns >= 6;
      return { turns, rounds, canSpill };
    },
    [clueTurnCounts]
  );

  // Switch team manually: durasi timer tidak terakumulasi/hangus, langsung fresh 20 detik & timer stop
  const selectTeam = useCallback(
    (id: number) => {
      setActiveTeamId(id);
      setTimerSeconds(TIMER_DURATION);
      setIsTimerRunning(false);
      incrementClueTurn(selectedClueId);
    },
    [selectedClueId, incrementClueTurn]
  );

  const nextTeamTurn = useCallback(() => {
    setActiveTeamId((prev) => (prev % 3) + 1);
    setTimerSeconds(TIMER_DURATION);
    setIsTimerRunning(false);
    incrementClueTurn(selectedClueId);
  }, [selectedClueId, incrementClueTurn]);

  const toggleTimer = useCallback(() => {
    setIsTimerRunning((prev) => !prev);
  }, []);

  const resetTimer = useCallback(() => {
    setIsTimerRunning(false);
    setTimerSeconds(TIMER_DURATION);
  }, []);

  // Timer Countdown Interval
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // When timer reaches 0s: switch turn, reset duration, increment turn count, and ensure next team's timer does NOT auto-start
  useEffect(() => {
    if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      setTimerSeconds(TIMER_DURATION);
      setActiveTeamId((curr) => (curr % 3) + 1);
      incrementClueTurn(selectedClueId);
    }
  }, [timerSeconds, isTimerRunning, selectedClueId, incrementClueTurn]);

  const triggerVisualEffects = useCallback((action: GameAction) => {
    setActiveAction(action);
    if (actionTimeoutRef.current) clearTimeout(actionTimeoutRef.current);

    // Keep active action for 2.2s so animation plays smoothly
    actionTimeoutRef.current = setTimeout(() => {
      setActiveAction(null);
    }, 2200);
  }, []);

  // Save game state to localStorage whenever state changes
  useEffect(() => {
    try {
      if (state.solvedClueIds.length > 0 || Object.keys(state.revealedCells).length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      }
    } catch (e) {
      console.warn("Failed to save state to localStorage", e);
    }
  }, [state]);

  // Load persisted teams on browser mount safely to prevent overwrite
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(TEAMS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed?.teams) && parsed.teams.length === 3) {
            setTeams(parsed.teams);
          }
          if (typeof parsed?.activeTeamId === "number") {
            setActiveTeamId(parsed.activeTeamId);
          }
        }
      } catch (e) {
        console.warn("Failed to read teams on mount", e);
      }
      isTeamsLoadedRef.current = true;
    }
  }, []);

  // Only save teams to localStorage once loaded, ensuring lives and score are never reset on refresh!
  useEffect(() => {
    if (!isTeamsLoadedRef.current) return;
    try {
      localStorage.setItem(TEAMS_STORAGE_KEY, JSON.stringify({ teams, activeTeamId }));
    } catch (e) {
      console.warn("Failed to save teams to localStorage", e);
    }
  }, [teams, activeTeamId]);

  // Initial fetch, load localStorage, SSE connection & BroadcastChannel setup
  useEffect(() => {
    // 0. Load persisted state and teams from localStorage immediately so page refresh never loses data
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as GameState;
        if (parsed && Array.isArray(parsed.solvedClueIds) && parsed.revealedCells) {
          setState(parsed);
        }
      }

      const savedTeams = localStorage.getItem(TEAMS_STORAGE_KEY);
      if (savedTeams) {
        const parsedTeams = JSON.parse(savedTeams);
        if (Array.isArray(parsedTeams?.teams)) {
          setTeams(parsedTeams.teams);
        }
        if (typeof parsedTeams?.activeTeamId === "number") {
          setActiveTeamId(parsedTeams.activeTeamId);
        }
      }

      const savedSelectedClue = localStorage.getItem(SELECTED_CLUE_STORAGE_KEY);
      if (savedSelectedClue) {
        setSelectedClueId(savedSelectedClue);
      }
    } catch (e) {
      console.warn("Failed to read from localStorage", e);
    }

    // 1. Setup BroadcastChannel for 0ms cross-tab sync
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      const channel = new BroadcastChannel("crossword-sync-channel");
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (data?.type === "SYNC_STATE" && data.state) {
          setState(data.state);
          if (data.action) {
            triggerVisualEffects(data.action);
          }
        }
        if (data?.type === "SYNC_TEAMS" && Array.isArray(data.teams)) {
          setTeams(data.teams);
          if (data.activeTeamId) {
            setActiveTeamId(data.activeTeamId);
          }
        }
      };
    }

    // 2. Fetch initial server state
    fetch("/api/game")
      .then((res) => res.json())
      .then((data: GameState) => {
        setState((prev) => {
          // If local storage had more solved clues, prefer local; else take server
          if (prev.solvedClueIds.length > data.solvedClueIds.length) {
            return prev;
          }
          return data;
        });
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load initial game state", err);
        setIsLoading(false);
      });

    // 3. Setup SSE for server-to-client push
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource("/api/game/stream");
      eventSource.onmessage = (event) => {
        try {
          const newState = JSON.parse(event.data) as GameState;
          setState((prev) => {
            if (
              newState.lastAction &&
              newState.lastAction.timestamp !== prev.lastAction?.timestamp
            ) {
              triggerVisualEffects(newState.lastAction);
            }
            if (newState.isComplete && !prev.isComplete) {
              confetti({
                particleCount: 120,
                spread: 70,
                origin: { y: 0.6 },
              });
            }
            return newState;
          });
        } catch {
          // ignore heartbeat or json parse errors
        }
      };
    } catch (e) {
      console.warn("SSE connection error", e);
    }

    return () => {
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
      if (eventSource) {
        eventSource.close();
      }
      if (actionTimeoutRef.current) {
        clearTimeout(actionTimeoutRef.current);
      }
    };
  }, [triggerVisualEffects]);

  const submitAnswer = async (clueId: string, answer: string) => {
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", clueId, answer }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengirim jawaban");
      }

      setState(data.state);
      triggerVisualEffects(data.action);

      // Broadcast to other tabs
      broadcastChannelRef.current?.postMessage({
        type: "SYNC_STATE",
        state: data.state,
        action: data.action,
      });

      if (data.state.isComplete) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      return {
        success: data.success,
        message: data.action.message || (data.success ? "Jawaban Benar!" : "Jawaban Salah!"),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      return { success: false, message: msg };
    }
  };

  const checkAnswer = async (clueId: string) => {
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check", clueId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memeriksa jawaban");
      }

      setState(data.state);
      triggerVisualEffects(data.action);

      broadcastChannelRef.current?.postMessage({
        type: "SYNC_STATE",
        state: data.state,
        action: data.action,
      });

      return {
        success: data.success,
        message: data.action.message || "Pemeriksaan selesai",
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      return { success: false, message: msg };
    }
  };

  const spillAnswer = async (clueId: string) => {
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "spill", clueId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal spill jawaban");
      }

      setState(data.state);
      triggerVisualEffects(data.action);

      broadcastChannelRef.current?.postMessage({
        type: "SYNC_STATE",
        state: data.state,
        action: data.action,
      });

      if (data.state.isComplete) {
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      return {
        success: true,
        message: data.action.message || "Jawaban berhasil dispill!",
        solution: data.solution,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      return { success: false, message: msg };
    }
  };

  // Team Score & Lives Logic
  const recordTeamAnswer = useCallback(
    (isCorrect: boolean): TeamAnswerResult => {
      const currentTeam = teams.find((t) => t.id === activeTeamId) || teams[0];
      let nextScore = currentTeam.score;
      let nextLives = currentTeam.lives;
      let scoreDelta = 0;
      let refilled = false;
      let shouldSwitchTeam = false;

      if (isCorrect) {
        nextScore += 10;
        scoreDelta = 10;
        // Jika jawaban benar: timer ke-stop & ke-reset dari ulang (20s), tetapi tetap giliran tim yang menjawab benar tadi
        setIsTimerRunning(false);
        setTimerSeconds(TIMER_DURATION);
      } else {
        nextLives -= 1;
        if (nextLives <= 0) {
          // Nyawa habis! Kurangi poin (-5), refill nyawa ke 3, stop timer & ganti giliran tim
          nextScore = Math.max(0, nextScore - 5);
          nextLives = 3;
          scoreDelta = -5;
          refilled = true;
          shouldSwitchTeam = true;
        }
      }

      const nextTeams = teams.map((team) =>
        team.id === activeTeamId
          ? { ...team, score: nextScore, lives: nextLives }
          : team
      );

      setTeams(nextTeams);

      const nextTeamId = shouldSwitchTeam ? (activeTeamId % 3) + 1 : activeTeamId;

      // Broadcast to other tabs
      broadcastChannelRef.current?.postMessage({
        type: "SYNC_TEAMS",
        teams: nextTeams,
        activeTeamId: nextTeamId,
      });

      // Otomatis stop timer dan berganti giliran jika nyawa habis
      if (shouldSwitchTeam) {
        setIsTimerRunning(false);
        setTimerSeconds(TIMER_DURATION);
        setActiveTeamId(nextTeamId);
        incrementClueTurn(selectedClueId);
      }

      return {
        teamName: currentTeam.name,
        isCorrect,
        scoreDelta,
        livesRemaining: nextLives,
        refilled,
      };
    },
    [activeTeamId, teams, selectedClueId, incrementClueTurn]
  );

  const resetTeams = useCallback(() => {
    localStorage.removeItem(TEAMS_STORAGE_KEY);
    setTeams(INITIAL_TEAMS);
    setActiveTeamId(1);
    setIsTimerRunning(false);
    setTimerSeconds(TIMER_DURATION);

    broadcastChannelRef.current?.postMessage({
      type: "SYNC_TEAMS",
      teams: INITIAL_TEAMS,
      activeTeamId: 1,
    });
  }, []);

  const resetGame = async () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(CLUE_TURNS_STORAGE_KEY);
      localStorage.removeItem(SELECTED_CLUE_STORAGE_KEY);
      setSelectedClueId(null);
      setClueTurnCounts({});
      resetTeams();
      resetTimer();
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      setState(data.state);
      setActiveAction(null);

      broadcastChannelRef.current?.postMessage({
        type: "SYNC_STATE",
        state: data.state,
        action: null,
      });
    } catch (err) {
      console.error("Gagal reset game", err);
    }
  };

  return (
    <CrosswordContext.Provider
      value={{
        state,
        selectedClueId,
        setSelectedClueId,
        activeAction,
        submitAnswer,
        checkAnswer,
        spillAnswer,
        resetGame,
        isLoading,
        teams,
        activeTeamId,
        setActiveTeamId: selectTeam,
        recordTeamAnswer,
        resetTeams,
        nextTeamTurn,
        timerSeconds,
        isTimerRunning,
        toggleTimer,
        resetTimer,
        clueTurnCounts,
        getClueRounds,
      }}
    >
      {children}
    </CrosswordContext.Provider>
  );
}

export function useCrossword() {
  const context = useContext(CrosswordContext);
  if (!context) {
    throw new Error("useCrossword must be used within a CrosswordProvider");
  }
  return context;
}
