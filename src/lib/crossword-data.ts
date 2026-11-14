export type Direction = "Mendatar" | "Menurun";

export interface CrosswordClue {
  id: string;
  number: number;
  direction: Direction;
  word: string;
  displayWord?: string;
  row: number; // 0-based
  col: number; // 0-based
  clue: string;
  length: number;
}

export interface CrosswordCellData {
  row: number;
  col: number;
  solution: string;
  clueNumber?: number;
  wordIds: string[];
}

export const GRID_ROWS = 10;
export const GRID_COLS = 15;

export const CROSSWORD_CLUES: CrosswordClue[] = [
  {
    id: "1",
    number: 1,
    direction: "Menurun",
    word: "HURUFK",
    displayWord: "HURUF K",
    row: 2,
    col: 4,
    clue: "Kerbau adalah binatang yang memiliki?",
    length: 6,
  },
  {
    id: "2",
    number: 2,
    direction: "Menurun",
    word: "SENDIRI",
    row: 0,
    col: 6,
    clue: "Saat naik pesawat kita dilarang membawa?",
    length: 7,
  },
  {
    id: "3",
    number: 3,
    direction: "Menurun",
    word: "GANTIAN",
    row: 1,
    col: 10,
    clue: "Barber mencukur rambut pelanggan dengan?",
    length: 7,
  },
  {
    id: "4",
    number: 4,
    direction: "Mendatar",
    word: "TENANG",
    row: 7,
    col: 8,
    clue: "Ikan bernapas di air dengan?",
    length: 6,
  },
  {
    id: "5",
    number: 5,
    direction: "Mendatar",
    word: "KERAMAS",
    row: 0,
    col: 0,
    clue: "Di perpustakaan tidak boleh?",
    length: 7,
  },
  {
    id: "6",
    number: 6,
    direction: "Mendatar",
    word: "BOHONGNYA",
    row: 2,
    col: 2,
    clue: "Gajah naik motor kelihatan apanya?",
    length: 9,
  },
  {
    id: "7",
    number: 7,
    direction: "Menurun",
    word: "USUS",
    row: 2,
    col: 13,
    clue: "Jauh di mata, tapi dekat di hati?",
    length: 4,
  },
  {
    id: "8",
    number: 8,
    direction: "Mendatar",
    word: "TAKUT",
    row: 4,
    col: 10,
    clue: "Lawannya gemuk?",
    length: 5,
  },
  {
    id: "9",
    number: 9,
    direction: "Menurun",
    word: "BAKAT",
    row: 2,
    col: 2,
    clue: "Burung bisa terbang karena memiliki?",
    length: 5,
  },
  {
    id: "10",
    number: 10,
    direction: "Menurun",
    word: "SOKTAU",
    row: 4,
    col: 8,
    clue: "Yang suka ngatur lalu lintas?",
    length: 6,
  },
  {
    id: "11",
    number: 11,
    direction: "Mendatar",
    word: "RUMAH",
    row: 9,
    col: 7,
    clue: "Neil Armstrong pernah menginjakkan kaki di?",
    length: 5,
  },
  {
    id: "12",
    number: 12,
    direction: "Menurun",
    word: "KERTAS",
    row: 0,
    col: 0,
    clue: "Yang sering mendapat nilai 100 saat ulangan?",
    length: 6,
  },
];

export function buildGridCells(): (CrosswordCellData | null)[][] {
  const grid: (CrosswordCellData | null)[][] = Array.from({ length: GRID_ROWS }, () =>
    Array(GRID_COLS).fill(null)
  );

  for (const clue of CROSSWORD_CLUES) {
    const letters = clue.word.split("");
    for (let i = 0; i < letters.length; i++) {
      const r = clue.direction === "Mendatar" ? clue.row : clue.row + i;
      const c = clue.direction === "Mendatar" ? clue.col + i : clue.col;

      if (!grid[r][c]) {
        grid[r][c] = {
          row: r,
          col: c,
          solution: letters[i],
          wordIds: [clue.id],
        };
      } else {
        if (!grid[r][c]!.wordIds.includes(clue.id)) {
          grid[r][c]!.wordIds.push(clue.id);
        }
      }

      // Assign clue number label to the starting cell
      if (i === 0) {
        grid[r][c]!.clueNumber = clue.number;
      }
    }
  }

  return grid;
}

export const INITIAL_GRID_CELLS = buildGridCells();
