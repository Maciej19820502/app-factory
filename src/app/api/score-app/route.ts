import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

async function callClaude(system: string, userMessage: string, maxTokens: number = 1024) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Claude API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.content[0]?.text || "";
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const supabase = getServiceClient();

    const { data: record } = await supabase
      .from("app_submissions")
      .select("*")
      .eq("id", id)
      .single();

    if (!record || !record.generated_html) {
      return NextResponse.json({ error: "Record not found or no HTML" }, { status: 404 });
    }

    const text = await callClaude(
      `Jesteś ekspertem oceniającym mini-aplikacje stworzone przez AI na podstawie krótkiego promptu. Oceń TYLKO w JSON, bez żadnego dodatkowego tekstu:
{
  "score_innovation": liczba 0-100,
  "score_business": liczba 0-100,
  "score_prompt": liczba 0-100,
  "ai_comment": "komentarz po polsku, max 2 zdania — co udało się osiągnąć i jedna konkretna wskazówka"
}

Kryteria:
- innovation: oryginalność pomysłu, nieoczywiste zastosowanie
- business: czy aplikacja rozwiązuje realny problem biznesowy
- prompt: precyzja i spryt w 100 znakach`,
      `Prompt uczestnika: ${record.prompt_text}\nWygenerowany kod HTML: ${record.generated_html.slice(0, 800)}`,
      1024
    );

    const cleanJson = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    const scores = JSON.parse(cleanJson);

    const scoreAvg = Math.round(
      ((scores.score_innovation + scores.score_business + scores.score_prompt) / 3) * 10
    ) / 10;

    await supabase
      .from("app_submissions")
      .update({
        score_innovation: scores.score_innovation,
        score_business: scores.score_business,
        score_prompt: scores.score_prompt,
        score_avg: scoreAvg,
        ai_comment: scores.ai_comment,
      })
      .eq("id", id);

    return NextResponse.json({ success: true, scores: { ...scores, score_avg: scoreAvg } });
  } catch (err) {
    console.error("score-app error:", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
