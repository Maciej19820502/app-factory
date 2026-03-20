# AppFactory — Raport statusowy 20.03.2026

## 1. Opis projektu

AppFactory to aplikacja webowa na potrzeby konferencji online. Uczestnicy wpisują krótki prompt (konfigurowalna długość), a AI (Claude Sonnet) generuje na jego podstawie działającą mini-aplikację HTML w przeglądarce. Administrator widzi zgłoszenia, rankingi i artefakty na żywo.

**Produkcja:** https://app-factory-six.vercel.app
**Repozytorium:** https://github.com/Maciej19820502/app-factory
**Hosting:** Vercel
**Baza danych:** Supabase (projekt `wyhuefafintmumnarpej`)

---

## 2. Stack technologiczny

| Warstwa | Technologia | Wersja |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.0 |
| Język | TypeScript | 5.8.3 |
| Baza danych + Realtime | Supabase | JS SDK 2.49.4 |
| AI | Claude API (Sonnet) | claude-sonnet-4-20250514 |
| CSS | Tailwind CSS | 4.1.3 |
| Hosting | Vercel | — |

---

## 3. Struktura plików

```
src/
├── app/
│   ├── layout.tsx                  # Layout: header z logo DFE.academy, footer
│   ├── page.tsx                    # Redirect → /appfactory
│   ├── globals.css                 # Kolory, animacje, @theme (paleta CLEAR Challenge)
│   ├── appfactory/
│   │   ├── page.tsx                # Widok uczestnika
│   │   └── admin/page.tsx          # Panel admina
│   ├── app/[slug]/page.tsx         # Publiczny widok artefaktu
│   └── api/
│       ├── generate-app/route.ts   # Generowanie HTML + scoring (fetch do Claude API)
│       ├── score-app/route.ts      # Ręczne re-scoring
│       └── session-summary/route.ts # Statystyki sesji
└── lib/
    └── supabase.ts                 # Klient Supabase (lazy proxy) + typy
```

Dodatkowe pliki w root:
- `supabase-setup.sql` — SQL do utworzenia tabel
- `INSTRUKCJA.md` — instrukcja uruchomienia
- `.env.local` — zmienne środowiskowe (NIE w repo)

---

## 4. Baza danych

### Tabela `app_submissions`
| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID (PK) | auto-generowane |
| nickname | TEXT | pseudonim uczestnika |
| prompt_text | TEXT | treść promptu |
| generated_html | TEXT | wygenerowany kod HTML (null = w trakcie generowania) |
| artifact_slug | TEXT (unique) | krótki identyfikator do URL |
| score_innovation | INTEGER | ocena innowacyjności 0-100 |
| score_business | INTEGER | ocena efektywności biznesowej 0-100 |
| score_prompt | INTEGER | ocena jakości promptu 0-100 |
| score_avg | NUMERIC | średnia z trzech ocen |
| ai_comment | TEXT | komentarz AI po polsku |
| created_at | TIMESTAMPTZ | data utworzenia |

### Tabela `session_control` (id=2 dla AppFactory)
| Kolumna | Typ | Opis |
|---|---|---|
| id | INTEGER (PK) | 2 = AppFactory |
| is_active | BOOLEAN | (używane przez CLEAR Challenge) |
| app_session | BOOLEAN | czy sesja AppFactory jest aktywna |
| ends_at | TIMESTAMPTZ | kiedy sesja się kończy |
| topic_constraint | TEXT | ograniczenie tematyki (null = brak) |
| prompt_max_length | INTEGER | max długość promptu (domyślnie 100) |
| scoring_done | BOOLEAN | (używane przez CLEAR Challenge) |

### Realtime
Obie tabele są dodane do publikacji `supabase_realtime`. Aplikacja używa Supabase Realtime + polling co 3-5 sekund jako fallback (realtime przez proxy Supabase bywa zawodny na Vercel).

---

## 5. Jak działa — flow

### Uczestnik (`/appfactory`)
1. Widzi "Czekaj na sesję" dopóki `app_session = false`
2. Po uruchomieniu sesji widzi formularz (pseudonim + prompt)
3. Jeśli ustawiony `topic_constraint` — widzi baner z tematem
4. Po kliknięciu "Stwórz aplikację":
   - API waliduje temat (Claude sprawdza zgodność)
   - Tworzy rekord w `app_submissions` z `generated_html = null`
   - Zwraca `id` natychmiast
   - W tle (`after()`) Claude generuje HTML → zapisuje do bazy → Claude ocenia → zapisuje wyniki
5. Uczestnik widzi spinner, a co 3s polluje bazę
6. Gdy `generated_html` się pojawi → wyświetla iframe z aplikacją
7. Gdy `score_avg` się pojawi → wyświetla kartę oceny
8. Stan submisji zapisany w `sessionStorage` — refresh nie pozwala wysłać ponownie

### Admin (`/appfactory/admin`)
- Hasło: `factory2025` (sessionStorage)
- Uruchamia/kończy sesję z timerem
- Ustawia temat i limit znaków promptu
- Widzi panel uczestników (imiona + status: generowanie/ocenianie/wynik)
- Siatka kart z podglądem iframe + wyniki
- Tabela wyników posortowana wg score_avg
- Usuwanie pojedynczych aplikacji
- Reset sesji (usuwa wszystkie aplikacje)
- Podsumowanie sesji (statystyki + najczęstsze słowa)
- Auto-polling co 5s

### Artefakt (`/app/[slug]`)
- Fullscreen iframe z wygenerowaną aplikacją
- Overlay bar: pseudonim + prompt + wynik
- 404 po polsku gdy slug nie istnieje

---

## 6. Wywołania Claude API

Aplikacja **nie używa Anthropic SDK** (nie działa na Node.js 24 / Vercel). Zamiast tego używa bezpośrednich wywołań `fetch` do `https://api.anthropic.com/v1/messages`.

Funkcja `callClaude(system, userMessage, maxTokens)` w `generate-app/route.ts` obsługuje wszystkie wywołania:
1. **Walidacja tematu** — sprawdza czy prompt mieści się w temacie sesji
2. **Generowanie HTML** — tworzy kompletną mini-aplikację (max 4096 tokenów)
3. **Scoring** — ocenia innowacyjność, biznesowość, jakość promptu (JSON)

`maxDuration = 60` na API routes (Vercel serverless timeout).

---

## 7. Styl wizualny

Paleta kolorów spójna z CLEAR Challenge:
| Zmienna | Kolor | Użycie |
|---|---|---|
| `bg-primary` | `#1d2073` | tło strony |
| `bg-card` | `#252880` | tło kart |
| `bg-input` | `#2e318d` | tło pól input |
| `accent-teal` | `#45d3d3` | akcent główny, przyciski |
| `accent-gold` | `#F5B840` | wyniki, top elementy |
| `text-secondary` | `#b0b3d6` | tekst pomocniczy |

Logo DFE.academy w headerze, stopka Workspace Partners.

---

## 8. Zmienne środowiskowe

Plik `.env.local` (lokalne) / Vercel Environment Variables (produkcja):

```
NEXT_PUBLIC_SUPABASE_URL=https://wyhuefafintmumnarpej.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_APP_URL=https://app-factory-six.vercel.app
```

---

## 9. Utrzymanie i operacje

### Nowy deploy
```bash
cd "APP factory"
vercel --prod
```

### Dodanie/zmiana zmiennej środowiskowej
```bash
vercel env rm NAZWA production
echo "nowa-wartość" | vercel env add NAZWA production
vercel --prod   # redeploy wymagany
```

### Reset bazy (usunięcie wszystkich aplikacji)
Przez panel admina: przycisk "Zresetuj sesję (usuń wszystko)" lub SQL:
```sql
DELETE FROM app_submissions;
UPDATE session_control SET app_session = false, ends_at = NULL WHERE id = 2;
```

### Dodanie nowej kolumny do session_control
1. Wykonaj `ALTER TABLE` w Supabase SQL Editor
2. Zaktualizuj typ `SessionControl` w `src/lib/supabase.ts`
3. Dodaj obsługę w admin page
4. Deploy

### Monitoring
- Vercel: https://vercel.com/maciej19820502s-projects/app-factory
- Supabase: https://supabase.com/dashboard (projekt wyhuefafintmumnarpej)
- Logi Vercel: `vercel logs https://app-factory-six.vercel.app`

### Znane ograniczenia
- Hasło admina hardcoded w kliencie (`factory2025`) — wystarczające dla aplikacji szkoleniowej
- RLS open (allow all) — nie do użytku produkcyjnego z danymi wrażliwymi
- Anthropic SDK nie działa na Vercel (Node 24) — używamy bezpośredniego `fetch`
- Realtime Supabase bywa zawodny — polling co 3-5s jako fallback

---

## 10. Scenariusz prowadzenia sesji

1. **Przed sesją:** admin loguje się, ustawia temat (opcjonalnie), limit znaków, czas
2. **Start:** kliknięcie "Uruchom sesję" — uczestnicy widzą formularz
3. **W trakcie:** uczestnicy wysyłają prompty, admin obserwuje karty i tabelę wyników na żywo
4. **Zakończenie:** "Zakończ sesję" lub timer, potem "Wygeneruj podsumowanie"
5. **Przed następną sesją:** "Zresetuj sesję" czyści wszystko

---

*Raport wygenerowany 20.03.2026 | Projekt zbudowany w sesji Claude Code*
