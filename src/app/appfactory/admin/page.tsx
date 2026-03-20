"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { AppSubmission, SessionControl } from "@/lib/supabase";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<SessionControl | null>(null);
  const [submissions, setSubmissions] = useState<AppSubmission[]>([]);
  const [minutes, setMinutes] = useState(10);
  const [topicConstraint, setTopicConstraint] = useState("");
  const [topicSaved, setTopicSaved] = useState(false);
  const [promptMaxLength, setPromptMaxLength] = useState(100);
  const [timeLeft, setTimeLeft] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<{
    total_apps: number;
    avg_score: number;
    max_score: number;
    min_score: number;
    top_words: { word: string; count: number }[];
  } | null>(null);

  // Auth check
  useEffect(() => {
    const stored = sessionStorage.getItem("appfactory-admin");
    if (stored === "true") setAuthenticated(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "factory2025") {
      sessionStorage.setItem("appfactory-admin", "true");
      setAuthenticated(true);
    } else {
      alert("Nieprawidłowe hasło");
    }
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    let { data: sess } = await supabase
      .from("session_control")
      .select("*")
      .eq("id", 2)
      .single();

    // Auto-create record if it doesn't exist
    if (!sess) {
      const { data: created } = await supabase
        .from("session_control")
        .upsert({
          id: 2,
          is_active: false,
          ends_at: null,
          scoring_done: false,
          app_session: false,
          prompt_max_length: 100,
        })
        .select("*")
        .single();
      sess = created;
    }

    if (sess) {
      setSession(sess);
      setTopicConstraint(sess.topic_constraint || "");
      setPromptMaxLength(sess.prompt_max_length || 100);
    }

    const { data: subs } = await supabase
      .from("app_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (subs) setSubmissions(subs);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();

    // Realtime subscriptions
    const sessionChannel = supabase
      .channel("admin-session")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "session_control", filter: "id=eq.2" },
        (payload) => setSession(payload.new as SessionControl)
      )
      .subscribe();

    const subsChannel = supabase
      .channel("admin-submissions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_submissions" },
        () => fetchData()
      )
      .subscribe();

    // Polling fallback every 5s
    const pollInterval = setInterval(fetchData, 5000);

    return () => {
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(subsChannel);
      clearInterval(pollInterval);
    };
  }, [authenticated, fetchData]);

  // Timer countdown
  useEffect(() => {
    if (!session?.app_session || !session.ends_at) {
      setTimeLeft("");
      return;
    }

    const tick = () => {
      const diff = new Date(session.ends_at!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("00:00");
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [session?.app_session, session?.ends_at]);

  const startSession = async () => {
    const endsAt = new Date(Date.now() + minutes * 60000).toISOString();
    const { error } = await supabase
      .from("session_control")
      .update({
        app_session: true,
        ends_at: endsAt,
        topic_constraint: topicConstraint.trim() || null,
        prompt_max_length: promptMaxLength,
      })
      .eq("id", 2);
    if (error) {
      console.error("startSession error:", error);
      alert(`Błąd uruchamiania sesji: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  const stopSession = async () => {
    const { error } = await supabase
      .from("session_control")
      .update({ app_session: false, ends_at: null })
      .eq("id", 2);
    if (error) {
      alert(`Błąd: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  const resetSession = async () => {
    if (!confirm("Czy na pewno chcesz zresetować sesję? Wszystkie aplikacje uczestników zostaną USUNIĘTE.")) return;
    // Delete all submissions
    await supabase.from("app_submissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    // Reset session
    await supabase
      .from("session_control")
      .update({ app_session: false, ends_at: null, topic_constraint: null })
      .eq("id", 2);
    setSubmissions([]);
    await fetchData();
  };

  const logout = () => {
    sessionStorage.removeItem("appfactory-admin");
    setAuthenticated(false);
  };

  const saveTopic = async () => {
    await supabase
      .from("session_control")
      .update({
        topic_constraint: topicConstraint.trim() || null,
        prompt_max_length: promptMaxLength,
      })
      .eq("id", 2);
    setTopicSaved(true);
    setTimeout(() => setTopicSaved(false), 2000);
  };

  const deleteSubmission = async (id: string, nickname: string) => {
    if (!confirm(`Usunąć aplikację uczestnika "${nickname}"?`)) return;
    await supabase.from("app_submissions").delete().eq("id", id);
    setSubmissions((prev) => prev.filter((s) => s.id !== id));
  };

  const fetchSummary = async () => {
    const res = await fetch("/api/session-summary");
    const data = await res.json();
    setSummary(data);
    setShowSummary(true);
  };

  // Sort by score for ranking
  const sorted = [...submissions].sort(
    (a, b) => (b.score_avg ?? -1) - (a.score_avg ?? -1)
  );
  const rankMap = new Map<string, number>();
  sorted.forEach((s, i) => {
    if (s.score_avg !== null) rankMap.set(s.id, i);
  });

  if (!authenticated) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-xl p-6 space-y-4 bg-bg-card"
        >
          <h1 className="text-2xl font-bold text-center text-accent-teal">
            Panel Admina
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Hasło"
            className="w-full px-4 py-3 rounded-lg bg-bg-input text-white border border-white/10 focus:outline-none focus:border-accent-teal"
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg font-bold bg-accent-teal text-bg-primary hover:brightness-110"
          >
            Zaloguj
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Session Control */}
      <div className="rounded-xl p-5 mb-6 bg-bg-card">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-accent-teal">
            AppFactory Admin
          </h1>

          <button
            onClick={logout}
            className="text-xs px-3 py-1 rounded-lg text-text-secondary border border-white/10 hover:bg-bg-input"
          >
            Wyloguj
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {!session?.app_session ? (
              <>
                <input
                  type="number"
                  value={minutes}
                  onChange={(e) => setMinutes(Number(e.target.value))}
                  min={1}
                  max={60}
                  className="w-16 px-2 py-2 rounded bg-bg-input text-white border border-white/10 text-center"
                />
                <span className="text-text-secondary text-sm">min</span>
                <button
                  onClick={startSession}
                  className="px-4 py-2 rounded-lg font-bold bg-green-600 text-white hover:bg-green-500"
                >
                  Uruchom sesję
                </button>
              </>
            ) : (
              <>
                <span className="text-2xl font-mono font-bold text-accent-gold">
                  {timeLeft}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-green-500/20 text-green-400">
                  AKTYWNA
                </span>
                <button
                  onClick={stopSession}
                  className="px-4 py-2 rounded-lg font-bold bg-red-600 text-white hover:bg-red-500"
                >
                  Zakończ sesję
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3">
          {!session?.app_session && (
            <p className="text-text-secondary text-sm">
              Status: <span className="text-red-400 font-bold">NIEAKTYWNA</span>
            </p>
          )}
          <button
            onClick={resetSession}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/15 ml-auto"
          >
            Zresetuj sesję (usuń wszystko)
          </button>
        </div>
      </div>

      {/* Topic Constraint */}
      <div className="rounded-xl p-5 mb-6 bg-bg-card">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Zawężenie tematyki aplikacji
            </label>
            <textarea
              value={topicConstraint}
              onChange={(e) => setTopicConstraint(e.target.value)}
              rows={2}
              placeholder="np. Aplikacje wspierające sprzedaż w e-commerce — zostaw puste, aby nie ograniczać tematyki"
              className="w-full px-4 py-3 rounded-lg bg-bg-input text-white border border-white/10 focus:outline-none focus:border-accent-teal text-sm resize-none"
            />
            <p className="text-xs text-text-secondary mt-1">
              Jeśli ustawione — prompty spoza tego tematu zostaną odrzucone przez AI.
              Uczestnik zobaczy informację o wymaganym temacie.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <label className="text-sm text-text-secondary shrink-0">
                Limit znaków promptu:
              </label>
              <input
                type="number"
                value={promptMaxLength}
                onChange={(e) => setPromptMaxLength(Math.max(10, Math.min(500, Number(e.target.value))))}
                min={10}
                max={500}
                className="w-20 px-2 py-2 rounded bg-bg-input text-white border border-white/10 text-center text-sm"
              />
              <span className="text-xs text-text-secondary">znaków (10–500)</span>
            </div>
          </div>
          <button
            onClick={saveTopic}
            className="px-4 py-2 rounded-lg font-bold text-sm mt-6 shrink-0 bg-accent-teal text-bg-primary hover:brightness-110"
          >
            {topicSaved ? "Zapisano" : "Zapisz ustawienia"}
          </button>
        </div>
        {session?.topic_constraint && (
          <div className="mt-3 px-3 py-2 rounded-lg bg-bg-primary border border-accent-gold/30">
            <p className="text-xs text-text-secondary">Aktualny temat widoczny dla uczestników:</p>
            <p className="text-sm font-medium text-accent-gold">
              {session.topic_constraint}
            </p>
          </div>
        )}
      </div>

      {/* Participants Panel */}
      {submissions.length > 0 && (
        <div className="rounded-xl p-5 mb-6 bg-bg-card">
          <div className="flex items-center gap-3 mb-3">
            <h2 className="text-lg font-bold text-accent-teal">
              Uczestnicy
            </h2>
            <span className="px-2 py-0.5 rounded-full text-sm font-bold bg-accent-teal/20 text-accent-teal">
              {submissions.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {submissions.map((sub) => {
              const status = sub.score_avg !== null
                ? "scored"
                : sub.generated_html
                ? "generated"
                : "pending";
              const statusColor = status === "scored"
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : status === "generated"
                ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                : "bg-accent-teal/10 text-accent-teal border-accent-teal/20";
              const statusLabel = status === "scored"
                ? `${sub.score_avg} pkt`
                : status === "generated"
                ? "ocenianie..."
                : "generowanie...";
              return (
                <div
                  key={sub.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${statusColor}`}
                >
                  <span className="font-medium">{sub.nickname}</span>
                  <span className="text-xs opacity-75">{statusLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary button */}
      <div className="mb-6">
        <button
          onClick={fetchSummary}
          className="px-5 py-2 rounded-lg font-bold bg-accent-gold text-bg-primary hover:brightness-110"
        >
          Wygeneruj podsumowanie sesji
        </button>
        <span className="text-text-secondary text-sm ml-3">
          {submissions.length} aplikacji
        </span>
      </div>

      {/* Submissions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {submissions.map((sub) => {
          const rank = rankMap.get(sub.id);
          let cardClass = "";
          if (rank === 0) cardClass = "card-gold";
          else if (rank === 1) cardClass = "card-silver";
          else if (rank === 2) cardClass = "card-bronze";

          return (
            <div
              key={sub.id}
              className={`rounded-xl p-4 bg-bg-card ${cardClass}`}
            >
              {/* Header */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  {rank === 0 && <span className="text-lg">🥇</span>}
                  {rank === 1 && <span className="text-lg">🥈</span>}
                  {rank === 2 && <span className="text-lg">🥉</span>}
                  <span className="font-bold text-accent-teal">
                    {sub.nickname}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{sub.prompt_text}</p>
              </div>

              {/* Iframe preview */}
              <div className="rounded-lg overflow-hidden mb-3 border border-white/10">
                {sub.generated_html ? (
                  <iframe
                    srcDoc={sub.generated_html}
                    className="w-full pointer-events-none"
                    style={{ height: "200px", background: "#fff" }}
                    sandbox="allow-scripts"
                    title={`Preview ${sub.nickname}`}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center bg-bg-primary"
                    style={{ height: "200px" }}
                  >
                    <div className="text-center">
                      <div className="spinner mx-auto mb-2" style={{ width: "24px", height: "24px" }}></div>
                      <p className="text-sm text-text-secondary">Generowanie...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Scores */}
              {sub.score_avg !== null ? (
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs text-text-secondary">
                    <span>🚀 {sub.score_innovation}</span>
                    <span>💼 {sub.score_business}</span>
                    <span>✍️ {sub.score_prompt}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-accent-gold">
                      {sub.score_avg}
                    </span>
                    <span className="text-text-secondary text-sm">/100</span>
                  </div>
                </div>
              ) : sub.generated_html ? (
                <div className="flex items-center justify-center py-3">
                  <div className="spinner" style={{ width: "20px", height: "20px" }}></div>
                  <span className="text-xs text-text-secondary ml-2">Ocenianie...</span>
                </div>
              ) : null}

              {/* Actions */}
              <div className="flex gap-2">
                {sub.artifact_slug && (
                  <a
                    href={`/app/${sub.artifact_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 block text-center text-sm py-2 rounded-lg transition-colors bg-accent-teal/15 text-accent-teal hover:bg-accent-teal/25"
                  >
                    Otwórz
                  </a>
                )}
                <button
                  onClick={() => deleteSubmission(sub.id, sub.nickname)}
                  className="text-sm py-2 px-3 rounded-lg transition-colors bg-red-500/15 text-red-400 hover:bg-red-500/25"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Results Table */}
      {submissions.length > 0 && (
        <div className="rounded-xl p-5 mt-8 mb-6 overflow-x-auto bg-bg-card">
          <h2 className="text-xl font-bold mb-4 text-accent-gold">
            Tabela wyników
          </h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-text-secondary text-left">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Uczestnik</th>
                <th className="py-2 pr-3">Prompt</th>
                <th className="py-2 pr-3 text-center">🚀</th>
                <th className="py-2 pr-3 text-center">💼</th>
                <th className="py-2 pr-3 text-center">✍️</th>
                <th className="py-2 pr-3 text-center font-bold text-accent-gold">Avg</th>
                <th className="py-2 text-center">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((sub, idx) => {
                const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : "";
                return (
                  <tr
                    key={sub.id}
                    className="border-b border-white/5 hover:bg-bg-primary/30"
                  >
                    <td className="py-2 pr-3">
                      {medal || (sub.score_avg !== null ? idx + 1 : "—")}
                    </td>
                    <td className="py-2 pr-3 font-medium text-accent-teal">
                      {sub.nickname}
                    </td>
                    <td className="py-2 pr-3 text-text-secondary max-w-[200px] truncate">
                      {sub.prompt_text}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {sub.score_innovation ?? <span className="text-dark-gray">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {sub.score_business ?? <span className="text-dark-gray">—</span>}
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {sub.score_prompt ?? <span className="text-dark-gray">—</span>}
                    </td>
                    <td className={`py-2 pr-3 text-center font-bold text-lg ${sub.score_avg !== null ? "text-accent-gold" : ""}`}>
                      {sub.score_avg ?? <span className="text-dark-gray">—</span>}
                    </td>
                    <td className="py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {sub.artifact_slug && (
                          <a
                            href={`/app/${sub.artifact_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs px-2 py-1 rounded text-accent-teal hover:bg-accent-teal/15"
                          >
                            🔗
                          </a>
                        )}
                        <button
                          onClick={() => deleteSubmission(sub.id, sub.nickname)}
                          className="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-500/20"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {submissions.length === 0 && (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-text-secondary text-lg">
            Brak aplikacji. Uruchom sesję i poczekaj na zgłoszenia uczestników.
          </p>
        </div>
      )}

      {/* Summary Modal */}
      {showSummary && summary && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
          onClick={() => setShowSummary(false)}
        >
          <div
            className="rounded-xl p-6 max-w-md w-full bg-bg-card"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-accent-gold">
              Podsumowanie sesji
            </h2>
            <div className="space-y-3">
              <StatRow label="Liczba aplikacji" value={summary.total_apps} />
              <StatRow label="Średni wynik" value={summary.avg_score} />
              <StatRow label="Najwyższy wynik" value={summary.max_score} />
              <StatRow label="Najniższy wynik" value={summary.min_score} />

              {summary.top_words.length > 0 && (
                <div>
                  <p className="text-sm text-text-secondary mb-2">
                    Najczęstsze słowa w promptach:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {summary.top_words.map((w) => (
                      <span
                        key={w.word}
                        className="px-2 py-1 rounded text-sm bg-accent-teal/15 text-accent-teal"
                      >
                        {w.word} ({w.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSummary(false)}
              className="w-full mt-6 py-2 rounded-lg font-bold bg-accent-teal text-bg-primary hover:brightness-110"
            >
              Zamknij
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-white/10">
      <span className="text-text-secondary">{label}</span>
      <span className="text-xl font-bold text-accent-teal">
        {value}
      </span>
    </div>
  );
}
