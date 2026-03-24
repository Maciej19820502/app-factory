import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { getServiceClient } from "@/lib/supabase";
import {
  t, tReplace, type Lang,
  getTopicValidationPrompt, getGenerationPrompt, getScoringPrompt,
} from "@/lib/translations";

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
      .select("app_session, topic_constraint, prompt_max_length, lang")
      .eq("id", 2)
      .single();

    if (!session?.app_session) {
      return NextResponse.json({ error: t("errSessionInactive", (session?.lang as Lang) || "pl") }, { status: 403 });
    }

    const lang: Lang = (session.lang as Lang) || "pl";
    const maxLen = session.prompt_max_length || 100;

    if (prompt_text.length > maxLen) {
      return NextResponse.json(
        { error: tReplace("errPromptTooLong", lang, { max: String(maxLen) }) },
        { status: 400 }
      );
    }

    // Validate topic constraint if set
    if (session.topic_constraint) {
      const topicPrompt = getTopicValidationPrompt(lang);
      const valText = await callClaude(
        topicPrompt.system,
        topicPrompt.user(session.topic_constraint, prompt_text),
        200
      );

      const valClean = valText.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      try {
        const valResult = JSON.parse(valClean);
        if (!valResult.allowed) {
          const reason = valResult.reason || t("errTopicFallback", lang);
          return NextResponse.json(
            {
              error: tReplace("errTopicRejection", lang, {
                topic: session.topic_constraint,
                reason,
              }),
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
      return NextResponse.json({ error: t("errDbInsert", lang) }, { status: 500 });
    }

    // Generate HTML and score in background after response is sent
    after(async () => {
      await generateAndScore(record.id, prompt_text, lang);
    });

    return NextResponse.json({ id: record.id, slug });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("generate-app error:", message, err);
    return NextResponse.json({ error: `${t("errServer", "pl")}: ${message}` }, { status: 500 });
  }
}

async function generateAndScore(recordId: string, promptText: string, lang: Lang) {
  const supabase = getServiceClient();

  try {
    const genPrompt = getGenerationPrompt(lang);
    const generatedHtml = await callClaude(
      genPrompt.system,
      genPrompt.user(promptText),
      4096
    );

    await supabase
      .from("app_submissions")
      .update({ generated_html: generatedHtml })
      .eq("id", recordId);

    await scoreApp(recordId, promptText, generatedHtml, lang);
  } catch (err) {
    console.error("Generation error for", recordId, err);
  }
}

async function scoreApp(recordId: string, promptText: string, generatedHtml: string, lang: Lang) {
  const supabase = getServiceClient();

  try {
    const text = await callClaude(
      getScoringPrompt(lang),
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
