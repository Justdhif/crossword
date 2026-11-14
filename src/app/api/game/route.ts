import { NextResponse } from "next/server";
import { getGameState, submitAnswer, checkAnswer, spillAnswer, resetGameState } from "@/lib/server-state";

export async function GET() {
  const state = getGameState();
  return NextResponse.json(state);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, clueId, answer } = body;

    if (action === "reset") {
      const state = resetGameState();
      return NextResponse.json({ success: true, state });
    }

    if (action === "answer") {
      if (!clueId || typeof answer !== "string") {
        return NextResponse.json(
          { error: "clueId and answer string are required" },
          { status: 400 }
        );
      }
      const result = submitAnswer(clueId, answer);
      return NextResponse.json(result);
    }

    if (action === "spill") {
      if (!clueId) {
        return NextResponse.json(
          { error: "clueId is required" },
          { status: 400 }
        );
      }
      const result = spillAnswer(clueId);
      return NextResponse.json(result);
    }

    if (action === "check") {
      if (!clueId) {
        return NextResponse.json(
          { error: "clueId is required" },
          { status: 400 }
        );
      }
      const result = checkAnswer(clueId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
