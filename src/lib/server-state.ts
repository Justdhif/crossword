import { CROSSWORD_CLUES, CrosswordClue } from "./crossword-data";

export interface GameAction {
  id: string; // clueId e.g. "1-mendatar"
  number: number;
  direction: string;
  type: "answer" | "check";
  status: "correct" | "wrong";
  timestamp: number;
  submittedWord?: string;
  correctWord?: string;
  message?: string;
}

export interface GameState {
  solvedClueIds: string[];
  revealedCells: Record<string, string>; // "r-c": letter
  lastAction: GameAction | null;
  score: number;
  totalClues: number;
  isComplete: boolean;
  updatedAt: number;
}

// Global server in-memory store (persists across hot-reloads and API calls in Node.js)
declare global {
  // eslint-disable-next-line no-var
  var __CROSSWORD_GAME_STATE__: GameState | undefined;
  // eslint-disable-next-line no-var
  var __CROSSWORD_CLIENT_LISTENERS__: Set<(state: GameState) => void> | undefined;
}

function getInitialState(): GameState {
  return {
    solvedClueIds: [],
    revealedCells: {},
    lastAction: null,
    score: 0,
    totalClues: CROSSWORD_CLUES.length,
    isComplete: false,
    updatedAt: Date.now(),
  };
}

if (!globalThis.__CROSSWORD_GAME_STATE__) {
  globalThis.__CROSSWORD_GAME_STATE__ = getInitialState();
}

if (!globalThis.__CROSSWORD_CLIENT_LISTENERS__) {
  globalThis.__CROSSWORD_CLIENT_LISTENERS__ = new Set();
}

export function getGameState(): GameState {
  if (!globalThis.__CROSSWORD_GAME_STATE__) {
    globalThis.__CROSSWORD_GAME_STATE__ = getInitialState();
  }
  return globalThis.__CROSSWORD_GAME_STATE__;
}

export function resetGameState(): GameState {
  globalThis.__CROSSWORD_GAME_STATE__ = getInitialState();
  notifyListeners(globalThis.__CROSSWORD_GAME_STATE__);
  return globalThis.__CROSSWORD_GAME_STATE__;
}

export function subscribeToGameState(listener: (state: GameState) => void): () => void {
  globalThis.__CROSSWORD_CLIENT_LISTENERS__?.add(listener);
  return () => {
    globalThis.__CROSSWORD_CLIENT_LISTENERS__?.delete(listener);
  };
}

function notifyListeners(state: GameState) {
  if (globalThis.__CROSSWORD_CLIENT_LISTENERS__) {
    for (const listener of globalThis.__CROSSWORD_CLIENT_LISTENERS__) {
      try {
        listener(state);
      } catch (e) {
        console.error("Listener error", e);
      }
    }
  }
}

export function submitAnswer(clueId: string, rawAnswer: string): { success: boolean; state: GameState; action: GameAction } {
  const clue = CROSSWORD_CLUES.find((c) => c.id === clueId);
  const state = getGameState();

  if (!clue) {
    throw new Error(`Clue with id "${clueId}" not found`);
  }

  const cleanAnswer = rawAnswer.trim().replace(/\s+/g, "").toUpperCase();
  const targetWord = clue.word.replace(/\s+/g, "").toUpperCase();
  const isCorrect = cleanAnswer === targetWord;

  let action: GameAction;

  if (isCorrect) {
    const isAlreadySolved = state.solvedClueIds.includes(clue.id);
    if (!isAlreadySolved) {
      state.solvedClueIds.push(clue.id);
      state.score += 100;
    }

    // Populate revealed cells
    const letters = clue.word.split("");
    for (let i = 0; i < letters.length; i++) {
      const r = clue.direction === "Mendatar" ? clue.row : clue.row + i;
      const c = clue.direction === "Mendatar" ? clue.col + i : clue.col;
      state.revealedCells[`${r}-${c}`] = letters[i];
    }

    state.isComplete = state.solvedClueIds.length >= CROSSWORD_CLUES.length;
    state.updatedAt = Date.now();

    action = {
      id: clue.id,
      number: clue.number,
      direction: clue.direction,
      type: "answer",
      status: "correct",
      timestamp: Date.now(),
      submittedWord: cleanAnswer,
      correctWord: clue.word,
      message: `Jawaban untuk No ${clue.number} (${clue.direction}) BENAR!`,
    };
  } else {
    state.updatedAt = Date.now();
    action = {
      id: clue.id,
      number: clue.number,
      direction: clue.direction,
      type: "answer",
      status: "wrong",
      timestamp: Date.now(),
      submittedWord: cleanAnswer,
      correctWord: undefined,
      message: `Jawaban "${cleanAnswer}" untuk No ${clue.number} (${clue.direction}) SALAH!`,
    };
  }

  state.lastAction = action;
  notifyListeners(state);

  return {
    success: isCorrect,
    state,
    action,
  };
}

export function checkAnswer(clueId: string): { success: boolean; state: GameState; action: GameAction } {
  const clue = CROSSWORD_CLUES.find((c) => c.id === clueId);
  const state = getGameState();

  if (!clue) {
    throw new Error(`Clue with id "${clueId}" not found`);
  }

  // Check if all cells of this clue are filled correctly
  const letters = clue.word.split("");
  let isCurrentlyCorrect = true;

  for (let i = 0; i < letters.length; i++) {
    const r = clue.direction === "Mendatar" ? clue.row : clue.row + i;
    const c = clue.direction === "Mendatar" ? clue.col + i : clue.col;
    if (state.revealedCells[`${r}-${c}`] !== letters[i]) {
      isCurrentlyCorrect = false;
      break;
    }
  }

  // If user already solved it or if it's already verified
  const isSolved = state.solvedClueIds.includes(clue.id) || isCurrentlyCorrect;

  const action: GameAction = {
    id: clue.id,
    number: clue.number,
    direction: clue.direction,
    type: "check",
    status: isSolved ? "correct" : "wrong",
    timestamp: Date.now(),
    correctWord: isSolved ? clue.word : undefined,
    message: isSolved
      ? `Nomor ${clue.number} (${clue.direction}) sudah benar/terisi!`
      : `Nomor ${clue.number} (${clue.direction}) belum terisi atau jawabannya belum tepat!`,
  };

  state.lastAction = action;
  state.updatedAt = Date.now();
  notifyListeners(state);

  return {
    success: isSolved,
    state,
    action,
  };
}

export function spillAnswer(clueId: string): { success: boolean; state: GameState; action: GameAction; solution: string } {
  const clue = CROSSWORD_CLUES.find((c) => c.id === clueId);
  const state = getGameState();

  if (!clue) {
    throw new Error(`Clue with id "${clueId}" not found`);
  }

  const isAlreadySolved = state.solvedClueIds.includes(clue.id);
  if (!isAlreadySolved) {
    state.solvedClueIds.push(clue.id);
  }

  // Populate revealed cells with solution letters
  const letters = clue.word.split("");
  for (let i = 0; i < letters.length; i++) {
    const r = clue.direction === "Mendatar" ? clue.row : clue.row + i;
    const c = clue.direction === "Mendatar" ? clue.col + i : clue.col;
    state.revealedCells[`${r}-${c}`] = letters[i];
  }

  state.isComplete = state.solvedClueIds.length >= CROSSWORD_CLUES.length;
  state.updatedAt = Date.now();

  const action: GameAction = {
    id: clue.id,
    number: clue.number,
    direction: clue.direction,
    type: "answer",
    status: "correct",
    timestamp: Date.now(),
    submittedWord: clue.word,
    correctWord: clue.word,
    message: `Jawaban No ${clue.number} dispill: ${clue.displayWord || clue.word}`,
  };

  state.lastAction = action;
  notifyListeners(state);

  return {
    success: true,
    state,
    action,
    solution: clue.displayWord || clue.word,
  };
}
