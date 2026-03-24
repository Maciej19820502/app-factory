import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import { getStopWords, type Lang } from "@/lib/translations";

export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();

    const langParam = req.nextUrl.searchParams.get("lang");
    const lang: Lang = langParam === "en" ? "en" : "pl";

    const { data: submissions } = await supabase
      .from("app_submissions")
      .select("*")
      .not("score_avg", "is", null);

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({
        total_apps: 0,
        avg_score: 0,
        max_score: 0,
        min_score: 0,
        top_words: [],
      });
    }

    const scores = submissions.map((s) => s.score_avg as number);
    const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);

    // Word frequency from prompts
    const { data: allSubmissions } = await supabase
      .from("app_submissions")
      .select("prompt_text");

    const wordMap: Record<string, number> = {};
    const stopWords = getStopWords(lang);

    (allSubmissions ?? []).forEach((s) => {
      s.prompt_text
        .toLowerCase()
        .split(/\s+/)
        .filter((w: string) => w.length > 2 && !stopWords.has(w))
        .forEach((w: string) => {
          wordMap[w] = (wordMap[w] || 0) + 1;
        });
    });

    const topWords = Object.entries(wordMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));

    return NextResponse.json({
      total_apps: submissions.length,
      avg_score: avgScore,
      max_score: maxScore,
      min_score: minScore,
      top_words: topWords,
    });
  } catch (err) {
    console.error("session-summary error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
