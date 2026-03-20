import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServiceClient } from "@/lib/supabase";

export const maxDuration = 60;

async function callClaude(system: string, userMessage: string, maxTokens: number = 4096) {
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
    const { nickname, prompt_text } = await req.json();

    if (!nickname || !prompt_text) {
      return NextResponse.json({ error: "Brakuje danych" }, { status: 400 });
    }
    const supabase = getServiceClient();

    // Check session is active
    const { data: session } = await supabase
      .from("session_control")
      .select("app_session, topic_constraint, prompt_max_length")
      .eq("id", 2)
      .single();

    if (!session?.app_session) {
      return NextResponse.json({ error: "Sesja nie jest aktywna" }, { status: 403 });
    }

    const maxLen = session.prompt_max_length || 100;
    if (prompt_text.length > maxLen) {
      return NextResponse.json({ error: `Prompt za długi (max ${maxLen} znaków)` }, { status: 400 });
    }

    // Validate topic constraint if set
    if (session.topic_constraint) {
      const valText = await callClaude(
        `Jesteś strażnikiem tematyki sesji tworzenia aplikacji. Oceń czy prompt uczestnika mieści się w temacie sesji.

Odpowiedz TYLKO w JSON, bez żadnego dodatkowego tekstu:
{"allowed": true/false, "reason": "krótkie wyjaśnienie po polsku, max 1 zdanie"}

Bądź dość liberalny — akceptuj prompty luźno powiązane z tematem. Odrzucaj tylko te zupełnie niezwiązane.`,
        `Temat sesji: "${session.topic_constraint}"\nPrompt uczestnika: "${prompt_text}"`,
        200
      );

      const valClean = valText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      try {
        const valResult = JSON.parse(valClean);
        if (!valResult.allowed) {
          return NextResponse.json(
            {
              error: `Twój prompt nie mieści się w temacie sesji: "${session.topic_constraint}". ${valResult.reason || "Spróbuj opisać aplikację związaną z wybranym tematem."}`,
            },
            { status: 400 }
          );
        }
      } catch {
        // If parsing fails, allow the submission
      }
    }

    // Generate unique slug
    let slug = crypto.randomUUID().slice(0, 6);
    let attempts = 0;
    while (attempts < 5) {
      const { data: existing } = await supabase
        .from("app_submissions")
        .select("id")
        .eq("artifact_slug", slug)
        .single();
      if (!existing) break;
      slug = crypto.randomUUID().slice(0, 6);
      attempts++;
    }

    // Insert initial record
    const { data: record, error: insertError } = await supabase
      .from("app_submissions")
      .insert({
        nickname,
        prompt_text,
        artifact_slug: slug,
      })
      .select("id")
      .single();

    if (insertError || !record) {
      return NextResponse.json({ error: "Błąd zapisu do bazy" }, { status: 500 });
    }

    // Generate HTML and score in background after response is sent
    after(async () => {
      await generateAndScore(record.id, prompt_text);
    });

    return NextResponse.json({ id: record.id, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-app error:", message, err);
    return NextResponse.json({ error: `Błąd serwera: ${message}` }, { status: 500 });
  }
}

async function generateAndScore(recordId: string, promptText: string) {
  const supabase = getServiceClient();

  try {
    const generatedHtml = await callClaude(
      `Jesteś generatorem mini-aplikacji webowych. Na podstawie opisu użytkownika stwórz KOMPLETNY, działający plik HTML (jeden plik, bez zewnętrznych zależności poza CDN).

Wymagania techniczne:
- Jeden plik HTML z CSS i JS w środku
- Możesz użyć tylko CDN: Tailwind CSS (play.tailwindcss.com/cdn) lub vanilla JS — bez npm, bez React
- Aplikacja musi działać po wklejeniu kodu w przeglądarkę
- Rozmiar kodu: max 200 linii
- Styl: ciemne tło #1a1a2e, akcenty w kolorze #00d4ff
- Aplikacja ma być FUNKCJONALNA — nie tylko wizualna makieta

Zwróć WYŁĄCZNIE kod HTML, zaczynający się od <!DOCTYPE html>.
Żadnego opisu, żadnego markdown, żadnych backticks.`,
      `Stwórz aplikację: ${promptText}`,
      4096
    );

    await supabase
      .from("app_submissions")
      .update({ generated_html: generatedHtml })
      .eq("id", recordId);

    await scoreApp(recordId, promptText, generatedHtml);
  } catch (err) {
    console.error("Generation error for", recordId, err);
  }
}

async function scoreApp(recordId: string, promptText: string, generatedHtml: string) {
  const supabase = getServiceClient();

  try {
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
      `Prompt uczestnika: ${promptText}\nWygenerowany kod HTML: ${generatedHtml.slice(0, 800)}`,
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
      .eq("id", recordId);
  } catch (err) {
    console.error("Scoring error for", recordId, err);
  }
}
