export type Lang = "pl" | "en";

const translations = {
  // ── Layout ──
  metaTitle: { pl: "AppFactory — DFE Academy", en: "AppFactory — DFE Academy" },
  metaDescription: { pl: "Stwórz mini-aplikację za pomocą AI", en: "Create a mini-app with AI" },
  footer: {
    pl: "Aplikacja szkoleniowa DFE.Academy (Workspace Partners Sp. z o.o. & Maciej Broniszewski) Wszystkie prawa zastrzeżone",
    en: "Training application DFE.Academy (Workspace Partners Sp. z o.o. & Maciej Broniszewski) All rights reserved",
  },

  // ── Participant – waiting ──
  waitingTitle: { pl: "AppFactory", en: "AppFactory" },
  waitingMessage: { pl: "Czekaj na uruchomienie sesji przez prowadzącego.", en: "Waiting for the instructor to start the session." },

  // ── Participant – form ──
  formTagline: { pl: "Opisz aplikację — AI ją stworzy w kilka sekund", en: "Describe an app — AI will build it in seconds" },
  topicLabel: { pl: "Temat sesji:", en: "Session topic:" },
  rejectionRetry: { pl: "Zmień opis i spróbuj ponownie.", en: "Change the description and try again." },
  nicknameLabel: { pl: "Twój pseudonim", en: "Your nickname" },
  nicknamePlaceholder: { pl: "Twoje imię lub pseudonim", en: "Your name or nickname" },
  promptLabel: { pl: "Opisz swoją aplikację", en: "Describe your app" },
  promptPlaceholder: { pl: "Co ma robić Twoja aplikacja?", en: "What should your app do?" },
  promptExample: { pl: "Przykład: kalkulator marży dla e-commerce", en: "Example: margin calculator for e-commerce" },
  submitButton: { pl: "Stwórz aplikację →", en: "Create app →" },
  errorGeneric: { pl: "Wystąpił błąd. Spróbuj ponownie.", en: "An error occurred. Please try again." },

  // ── Participant – spinner ──
  spinner1: { pl: "AI projektuje interfejs...", en: "AI is designing the interface..." },
  spinner2: { pl: "AI pisze kod...", en: "AI is writing code..." },
  spinner3: { pl: "AI testuje logikę...", en: "AI is testing logic..." },
  spinner4: { pl: "Zaraz gotowe...", en: "Almost done..." },

  // ── Participant – result ──
  resultTitle: { pl: "Twoja aplikacja jest gotowa!", en: "Your app is ready!" },
  copyLink: { pl: "Skopiuj link do aplikacji", en: "Copy app link" },
  copied: { pl: "Skopiowano!", en: "Copied!" },
  aiScoreTitle: { pl: "Ocena AI", en: "AI Score" },
  scoreInnovation: { pl: "Innowacyjność", en: "Innovation" },
  scoreBusiness: { pl: "Efektywność biznesowa", en: "Business effectiveness" },
  scorePrompt: { pl: "Jakość promptu", en: "Prompt quality" },
  scoreTotalLabel: { pl: "Wynik łączny", en: "Total score" },
  scoringInProgress: { pl: "AI ocenia Twoją aplikację...", en: "AI is scoring your app..." },

  // ── Admin – auth ──
  adminPanelTitle: { pl: "Panel Admina", en: "Admin Panel" },
  passwordPlaceholder: { pl: "Hasło", en: "Password" },
  loginButton: { pl: "Zaloguj", en: "Log in" },
  wrongPassword: { pl: "Nieprawidłowe hasło", en: "Wrong password" },

  // ── Admin – session control ──
  adminHeader: { pl: "AppFactory Admin", en: "AppFactory Admin" },
  logoutButton: { pl: "Wyloguj", en: "Log out" },
  startSession: { pl: "Uruchom sesję", en: "Start session" },
  stopSession: { pl: "Zakończ sesję", en: "Stop session" },
  sessionActive: { pl: "AKTYWNA", en: "ACTIVE" },
  sessionInactive: { pl: "NIEAKTYWNA", en: "INACTIVE" },
  statusLabel: { pl: "Status:", en: "Status:" },
  resetSession: { pl: "Zresetuj sesję (usuń wszystko)", en: "Reset session (delete all)" },
  resetConfirm: {
    pl: "Czy na pewno chcesz zresetować sesję? Wszystkie aplikacje uczestników zostaną USUNIĘTE.",
    en: "Are you sure you want to reset the session? All participant apps will be DELETED.",
  },
  startError: { pl: "Błąd uruchamiania sesji", en: "Error starting session" },

  // ── Admin – topic & settings ──
  topicConstraintLabel: { pl: "Zawężenie tematyki aplikacji", en: "App topic constraint" },
  topicPlaceholder: {
    pl: "np. Aplikacje wspierające sprzedaż w e-commerce — zostaw puste, aby nie ograniczać tematyki",
    en: "e.g. Apps supporting e-commerce sales — leave empty for no topic restriction",
  },
  topicHint: {
    pl: "Jeśli ustawione — prompty spoza tego tematu zostaną odrzucone przez AI. Uczestnik zobaczy informację o wymaganym temacie.",
    en: "If set — prompts outside this topic will be rejected by AI. Participants will see the required topic.",
  },
  promptLimitLabel: { pl: "Limit znaków promptu:", en: "Prompt character limit:" },
  promptLimitHint: { pl: "znaków (10–500)", en: "characters (10–500)" },
  saveSettings: { pl: "Zapisz ustawienia", en: "Save settings" },
  saved: { pl: "Zapisano", en: "Saved" },
  currentTopicVisible: { pl: "Aktualny temat widoczny dla uczestników:", en: "Current topic visible to participants:" },
  languageLabel: { pl: "Język sesji:", en: "Session language:" },

  // ── Admin – participants ──
  participantsHeader: { pl: "Uczestnicy", en: "Participants" },
  statusGenerating: { pl: "generowanie...", en: "generating..." },
  statusScoring: { pl: "ocenianie...", en: "scoring..." },
  statusPts: { pl: "pkt", en: "pts" },
  summaryButton: { pl: "Wygeneruj podsumowanie sesji", en: "Generate session summary" },
  appsCount: { pl: "aplikacji", en: "apps" },
  emptyState: {
    pl: "Brak aplikacji. Uruchom sesję i poczekaj na zgłoszenia uczestników.",
    en: "No apps yet. Start a session and wait for participant submissions.",
  },

  // ── Admin – results table ──
  resultsTableHeader: { pl: "Tabela wyników", en: "Results table" },
  colParticipant: { pl: "Uczestnik", en: "Participant" },
  colActions: { pl: "Akcje", en: "Actions" },
  openButton: { pl: "Otwórz", en: "Open" },
  deleteConfirm: { pl: "Usunąć aplikację uczestnika", en: "Delete app by participant" },
  generating: { pl: "Generowanie...", en: "Generating..." },

  // ── Admin – summary modal ──
  summaryTitle: { pl: "Podsumowanie sesji", en: "Session summary" },
  statTotalApps: { pl: "Liczba aplikacji", en: "Total apps" },
  statAvgScore: { pl: "Średni wynik", en: "Average score" },
  statMaxScore: { pl: "Najwyższy wynik", en: "Max score" },
  statMinScore: { pl: "Najniższy wynik", en: "Min score" },
  topWordsLabel: { pl: "Najczęstsze słowa w promptach:", en: "Most frequent words in prompts:" },
  closeButton: { pl: "Zamknij", en: "Close" },

  // ── 404 ──
  notFoundMessage: { pl: "Nie znaleziono aplikacji o podanym identyfikatorze.", en: "No app found with this identifier." },

  // ── API errors ──
  errMissingData: { pl: "Brakuje danych", en: "Missing data" },
  errSessionInactive: { pl: "Sesja nie jest aktywna", en: "Session is not active" },
  errPromptTooLong: { pl: "Prompt za długi (max {max} znaków)", en: "Prompt too long (max {max} characters)" },
  errDbInsert: { pl: "Błąd zapisu do bazy", en: "Database save error" },
  errServer: { pl: "Błąd serwera", en: "Server error" },
  errTopicRejection: {
    pl: "Twój prompt nie mieści się w temacie sesji: \"{topic}\". {reason}",
    en: "Your prompt doesn't fit the session topic: \"{topic}\". {reason}",
  },
  errTopicFallback: {
    pl: "Spróbuj opisać aplikację związaną z wybranym tematem.",
    en: "Try describing an app related to the chosen topic.",
  },
} as const;

export type TranslationKey = keyof typeof translations;

export function t(key: TranslationKey, lang: Lang): string {
  return translations[key][lang];
}

export function tReplace(key: TranslationKey, lang: Lang, replacements: Record<string, string>): string {
  let text: string = translations[key][lang];
  for (const [k, v] of Object.entries(replacements)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

export function getSpinnerMessages(lang: Lang): string[] {
  return [
    translations.spinner1[lang],
    translations.spinner2[lang],
    translations.spinner3[lang],
    translations.spinner4[lang],
  ];
}

// ── Claude prompts (kept separate — not UI strings) ──

export function getTopicValidationPrompt(lang: Lang) {
  if (lang === "en") {
    return {
      system: `You are a topic guardian for an app-building session. Assess whether the participant's prompt fits the session topic.

Reply ONLY in JSON, no additional text:
{"allowed": true/false, "reason": "short explanation in English, max 1 sentence"}

Be fairly liberal — accept prompts loosely related to the topic. Reject only completely unrelated ones.`,
      user: (topic: string, prompt: string) =>
        `Session topic: "${topic}"\nParticipant prompt: "${prompt}"`,
    };
  }
  return {
    system: `Jesteś strażnikiem tematyki sesji tworzenia aplikacji. Oceń czy prompt uczestnika mieści się w temacie sesji.

Odpowiedz TYLKO w JSON, bez żadnego dodatkowego tekstu:
{"allowed": true/false, "reason": "krótkie wyjaśnienie po polsku, max 1 zdanie"}

Bądź dość liberalny — akceptuj prompty luźno powiązane z tematem. Odrzucaj tylko te zupełnie niezwiązane.`,
    user: (topic: string, prompt: string) =>
      `Temat sesji: "${topic}"\nPrompt uczestnika: "${prompt}"`,
  };
}

export function getGenerationPrompt(lang: Lang) {
  if (lang === "en") {
    return {
      system: `You are a web mini-app generator. Based on the user's description, create a COMPLETE, working HTML file (single file, no external dependencies except CDN).

Technical requirements:
- Single HTML file with CSS and JS inside
- You may only use CDN: Tailwind CSS (play.tailwindcss.com/cdn) or vanilla JS — no npm, no React
- The app must work when pasted into a browser
- Code size: max 200 lines
- Style: dark background #1a1a2e, accents in #00d4ff
- The app must be FUNCTIONAL — not just a visual mockup

Return ONLY HTML code, starting with <!DOCTYPE html>.
No description, no markdown, no backticks.`,
      user: (prompt: string) => `Create an app: ${prompt}`,
    };
  }
  return {
    system: `Jesteś generatorem mini-aplikacji webowych. Na podstawie opisu użytkownika stwórz KOMPLETNY, działający plik HTML (jeden plik, bez zewnętrznych zależności poza CDN).

Wymagania techniczne:
- Jeden plik HTML z CSS i JS w środku
- Możesz użyć tylko CDN: Tailwind CSS (play.tailwindcss.com/cdn) lub vanilla JS — bez npm, bez React
- Aplikacja musi działać po wklejeniu kodu w przeglądarkę
- Rozmiar kodu: max 200 linii
- Styl: ciemne tło #1a1a2e, akcenty w kolorze #00d4ff
- Aplikacja ma być FUNKCJONALNA — nie tylko wizualna makieta

Zwróć WYŁĄCZNIE kod HTML, zaczynający się od <!DOCTYPE html>.
Żadnego opisu, żadnego markdown, żadnych backticks.`,
    user: (prompt: string) => `Stwórz aplikację: ${prompt}`,
  };
}

export function getScoringPrompt(lang: Lang) {
  if (lang === "en") {
    return `You are an expert evaluating AI-generated mini-apps based on a short prompt. Score ONLY in JSON, no additional text:
{
  "score_innovation": number 0-100,
  "score_business": number 0-100,
  "score_prompt": number 0-100,
  "ai_comment": "comment in English, max 2 sentences — what was achieved and one specific tip"
}

Criteria:
- innovation: originality of the idea, non-obvious application
- business: does the app solve a real business problem
- prompt: precision and cleverness in 100 characters`;
  }
  return `Jesteś ekspertem oceniającym mini-aplikacje stworzone przez AI na podstawie krótkiego promptu. Oceń TYLKO w JSON, bez żadnego dodatkowego tekstu:
{
  "score_innovation": liczba 0-100,
  "score_business": liczba 0-100,
  "score_prompt": liczba 0-100,
  "ai_comment": "komentarz po polsku, max 2 zdania — co udało się osiągnąć i jedna konkretna wskazówka"
}

Kryteria:
- innovation: oryginalność pomysłu, nieoczywiste zastosowanie
- business: czy aplikacja rozwiązuje realny problem biznesowy
- prompt: precyzja i spryt w 100 znakach`;
}

export function getStopWords(lang: Lang): Set<string> {
  if (lang === "en") {
    return new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "is", "it", "that", "this", "are", "was",
      "be", "has", "had", "not", "you", "all", "can", "her", "his", "one",
      "our", "out", "do", "if", "me", "my", "no", "so", "up", "as", "we",
    ]);
  }
  return new Set([
    "i", "w", "z", "na", "do", "dla", "o", "od", "po", "ze",
    "się", "to", "jest", "nie", "co", "jak", "lub", "a", "ale",
    "że", "już", "też", "oraz", "który", "która", "które",
  ]);
}
