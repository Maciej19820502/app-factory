"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AppSubmission, SessionControl } from "@/lib/supabase";

const SPINNER_MESSAGES = [
  "AI projektuje interfejs...",
  "AI pisze kod...",
  "AI testuje logikę...",
  "Zaraz gotowe...",
];

export default function ParticipantPage() {
  const [session, setSession] = useState<SessionControl | null>(null);
  const [nickname, setNickname] = useState("");
  const [promptText, setPromptText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [spinnerIdx, setSpinnerIdx] = useState(0);
  const [submission, setSubmission] = useState<AppSubmission | null>(null);
  const [copied, setCopied] = useState(false);
  const [rejectionMsg, setRejectionMsg] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll + realtime subscription for submission updates
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const subscribeToSubmission = useCallback((id: string) => {
    // Realtime
    const channel = supabase
      .channel(`submission-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_submissions", filter: `id=eq.${id}` },
        (payload) => setSubmission(payload.new as AppSubmission)
      )
      .subscribe();

    // Polling fallback every 3s
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("app_submissions")
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        setSubmission(data);
        // Stop polling once fully scored
        if (data.score_avg !== null && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    }, 3000);

    return () => {
      supabase.removeChannel(channel);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  // Restore submitted state from sessionStorage
  useEffect(() => {
    const savedId = sessionStorage.getItem("appfactory-submission-id");
    if (savedId) {
      setSubmitted(true);
      setSubmitting(true);
      supabase
        .from("app_submissions")
        .select("*")
        .eq("id", savedId)
        .single()
        .then(({ data: sub }) => {
          if (sub) {
            setSubmission(sub);
            setSubmitting(false);
            subscribeToSubmission(sub.id);
          } else {
            sessionStorage.removeItem("appfactory-submission-id");
            setSubmitted(false);
            setSubmitting(false);
          }
        });
    }
  }, [subscribeToSubmission]);

  // Fetch session state
  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase
        .from("session_control")
        .select("*")
        .eq("id", 2)
        .single();
      if (data) setSession(data);
    };
    fetchSession();

    const channel = supabase
      .channel("session-control-participant")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_control", filter: "id=eq.2" },
        (payload) => setSession(payload.new as SessionControl)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Spinner animation
  useEffect(() => {
    if (submitting) {
      intervalRef.current = setInterval(() => {
        setSpinnerIdx((prev) => (prev + 1) % SPINNER_MESSAGES.length);
      }, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim() || !promptText.trim() || submitted) return;
    setRejectionMsg("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/generate-app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: nickname.trim(), prompt_text: promptText.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setRejectionMsg(data.error);
        setSubmitting(false);
        return;
      }
      // Fetch the full submission
      const { data: sub } = await supabase
        .from("app_submissions")
        .select("*")
        .eq("id", data.id)
        .single();
      if (sub) {
        sessionStorage.setItem("appfactory-submission-id", data.id);
        setSubmission(sub);
        setSubmitted(true);
        setSubmitting(false);
        subscribeToSubmission(data.id);
      }
    } catch {
      alert("Wystąpił błąd. Spróbuj ponownie.");
      setSubmitting(false);
    }
  };

  const maxLen = session?.prompt_max_length || 100;
  const charsLeft = maxLen - promptText.length;
  const appUrl = submission?.artifact_slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/app/${submission.artifact_slug}`
    : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopied(true);
    } catch {
      // Fallback for HTTP/insecure contexts
      const textarea = document.createElement("textarea");
      textarea.value = appUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  // Session inactive
  if (!session || !session.app_session) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🏭</div>
          <h1 className="text-3xl font-bold mb-4 text-accent-teal">
            AppFactory
          </h1>
          <p className="text-xl text-text-secondary">
            Czekaj na uruchomienie sesji przez prowadzącego.
          </p>
          <div className="spinner mx-auto mt-8"></div>
        </div>
      </div>
    );
  }

  // Show result
  if (submission?.generated_html) {
    return (
      <div className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8 animate-fade-in">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-accent-teal">
              Twoja aplikacja jest gotowa!
            </h1>
          </div>

          {/* App iframe */}
          <div className="rounded-xl overflow-hidden mb-6 animate-fade-in border-2 border-accent-teal">
            <iframe
              srcDoc={submission.generated_html}
              className="w-full"
              style={{ height: "400px", background: "#fff" }}
              sandbox="allow-scripts allow-forms"
              title="Generated App"
            />
          </div>

          {/* Copy link button */}
          <div className="text-center mb-8">
            <button
              onClick={copyLink}
              className="px-6 py-3 rounded-lg text-lg font-semibold transition-all bg-accent-teal text-bg-primary hover:brightness-110"
            >
              {copied ? "Skopiowano!" : "Skopiuj link do aplikacji"}
            </button>
          </div>

          {/* Scores */}
          {submission.score_avg !== null ? (
            <div className="rounded-xl p-6 animate-fade-in bg-bg-card">
              <h2 className="text-xl font-bold mb-4 text-center text-accent-gold">
                Ocena AI
              </h2>
              <div className="space-y-3 mb-6">
                <ScoreBar label="Innowacyjność" value={submission.score_innovation} />
                <ScoreBar label="Efektywność biznesowa" value={submission.score_business} />
                <ScoreBar label="Jakość promptu" value={submission.score_prompt} />
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-accent-gold">
                  {submission.score_avg}
                  <span className="text-2xl text-text-secondary">/100</span>
                </div>
                <p className="text-sm text-text-secondary mt-1">Wynik łączny</p>
              </div>
              {submission.ai_comment && (
                <p className="text-text-secondary italic text-center mt-4">
                  {submission.ai_comment}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="spinner mx-auto mb-4"></div>
              <p className="text-text-secondary">AI ocenia Twoją aplikację...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Submitting spinner
  if (submitting) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="spinner mx-auto mb-6" style={{ width: "60px", height: "60px" }}></div>
          <p className="text-xl text-text-secondary animate-pulse">
            {SPINNER_MESSAGES[spinnerIdx]}
          </p>
        </div>
      </div>
    );
  }

  // Form
  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🏭</div>
          <h1 className="text-4xl font-bold mb-2 text-accent-teal">
            AppFactory
          </h1>
          <p className="text-text-secondary text-lg">
            Opisz aplikację — AI ją stworzy w kilka sekund
          </p>
        </div>

        {session.topic_constraint && (
          <div className="rounded-lg px-4 py-3 mb-4 border border-accent-gold bg-bg-card">
            <p className="text-sm text-text-secondary">Temat sesji:</p>
            <p className="font-semibold text-accent-gold">
              {session.topic_constraint}
            </p>
          </div>
        )}

        {rejectionMsg && (
          <div className="rounded-lg px-4 py-3 mb-4 border border-red-500/50 bg-bg-card">
            <p className="text-red-400 text-sm">{rejectionMsg}</p>
            <p className="text-text-secondary text-xs mt-1">Zmień opis i spróbuj ponownie.</p>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-6 space-y-5 bg-bg-card"
        >
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Twój pseudonim
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 30))}
              maxLength={30}
              required
              className="w-full px-4 py-3 rounded-lg bg-bg-input text-white border border-white/10 focus:outline-none focus:border-accent-teal text-lg"
              placeholder="Twoje imię lub pseudonim"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Opisz swoją aplikację
            </label>
            <textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value.slice(0, maxLen))}
              maxLength={maxLen}
              required
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-bg-input text-white border border-white/10 focus:outline-none focus:border-accent-teal text-lg resize-none"
              placeholder="Co ma robić Twoja aplikacja?"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-text-secondary">
                Przykład: kalkulator marży dla e-commerce
              </p>
              <span
                className={`text-sm font-mono ${
                  charsLeft < 15 ? "text-red-400" : "text-text-secondary"
                }`}
              >
                {promptText.length}/{maxLen}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={!nickname.trim() || !promptText.trim() || submitting || submitted}
            className="w-full py-4 rounded-lg text-lg font-bold transition-all disabled:opacity-40 bg-accent-teal text-bg-primary hover:brightness-110"
          >
            Stwórz aplikację →
          </button>
        </form>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-bold text-accent-teal">
          {v}/100
        </span>
      </div>
      <div className="h-3 rounded-full bg-bg-primary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 bg-accent-teal"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}
