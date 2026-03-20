"use client";

import { useState, useEffect, use } from "react";
import { supabase } from "@/lib/supabase";
import type { AppSubmission } from "@/lib/supabase";

export default function ArtifactPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [submission, setSubmission] = useState<AppSubmission | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const load = async () => {
      const { data, error } = await supabase
        .from("app_submissions")
        .select("*")
        .eq("artifact_slug", slug)
        .single();

      if (error || !data) {
        setNotFound(true);
        return;
      }
      setSubmission(data);

      // Subscribe to updates
      channel = supabase
        .channel(`artifact-${data.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "app_submissions",
            filter: `id=eq.${data.id}`,
          },
          (payload) => setSubmission(payload.new as AppSubmission)
        )
        .subscribe();
    };
    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-3xl font-bold mb-2 text-accent-teal">
            404
          </h1>
          <p className="text-xl text-text-secondary">
            Nie znaleziono aplikacji o podanym identyfikatorze.
          </p>
        </div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: "40px",
          backgroundColor: "rgba(29,32,115,0.95)",
          zIndex: 10,
        }}
      >
        <div className="text-sm text-text-secondary truncate mr-4">
          <span className="font-bold text-accent-teal">
            {submission.nickname}
          </span>
          <span className="text-text-secondary ml-2">
            {submission.prompt_text.length > 50
              ? submission.prompt_text.slice(0, 50) + "..."
              : submission.prompt_text}
          </span>
        </div>
        <div className="text-sm shrink-0">
          {submission.score_avg !== null ? (
            <span className="font-bold text-accent-gold">
              {submission.score_avg}/100
            </span>
          ) : (
            <div
              className="inline-block w-4 h-4 border-2 rounded-full"
              style={{
                borderColor: "rgba(69,211,211,0.3)",
                borderTopColor: "#45d3d3",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}
        </div>
      </div>

      {/* Fullscreen iframe */}
      <iframe
        srcDoc={submission.generated_html ?? ""}
        className="flex-1 w-full"
        style={{ background: "#fff" }}
        sandbox="allow-scripts allow-forms"
        title={`App by ${submission.nickname}`}
      />
    </div>
  );
}
