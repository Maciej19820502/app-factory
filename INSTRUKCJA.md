# AppFactory — Instrukcja uruchomienia

## 1. Konfiguracja Supabase

### Tworzenie tabel
1. Otwórz projekt Supabase → **SQL Editor**
2. Wklej i wykonaj zawartość pliku `supabase-setup.sql`
   - Jeśli tabela `session_control` już istnieje (z CLEAR Challenge), wykonaj osobno:
     ```sql
     ALTER TABLE session_control ADD COLUMN IF NOT EXISTS app_session BOOLEAN DEFAULT false;
     INSERT INTO session_control (id, is_active, ends_at, scoring_done, app_session)
     VALUES (2, false, NULL, false, false)
     ON CONFLICT (id) DO UPDATE SET app_session = EXCLUDED.app_session;
     ```

### Włączenie Realtime
1. W panelu Supabase przejdź do **Database → Replication**
2. Upewnij się, że tabele `app_submissions` i `session_control` są dodane do publikacji `supabase_realtime`
   (SQL z pliku setup to robi automatycznie)

### Zmienne środowiskowe
1. Skopiuj z **Settings → API** w Supabase:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL projektu
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — klucz anon/public
   - `SUPABASE_SERVICE_ROLE_KEY` — klucz service_role
2. Wklej do pliku `.env.local`
3. Dodaj swój klucz API Anthropic: `ANTHROPIC_API_KEY`

---

## 2. Uruchomienie lokalne

```bash
npm install
npm run dev
```

Aplikacja dostępna pod: http://localhost:3000

- **Widok uczestnika:** http://localhost:3000/appfactory
- **Panel admina:** http://localhost:3000/appfactory/admin (hasło: `factory2025`)
- **Artefakt:** http://localhost:3000/app/[slug]

---

## 3. Wdrożenie na Vercel

1. Zainstaluj Vercel CLI: `npm i -g vercel`
2. W katalogu projektu: `vercel`
3. Skonfiguruj zmienne środowiskowe w panelu Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_APP_URL` — URL produkcyjny (np. `https://appfactory.vercel.app`)
4. Deploy: `vercel --prod`

---

## 4. Scenariusz prowadzenia sesji

### Przed sesją
1. Otwórz panel admina: `/appfactory/admin`
2. Zaloguj się hasłem: `factory2025`
3. Upewnij się, że status sesji to **NIEAKTYWNA**
4. Wyświetl uczestnikom link do `/appfactory` (np. przez QR code)

### Start sesji
1. Ustaw czas trwania (domyślnie 10 minut)
2. Kliknij **▶ Uruchom sesję**
3. Uczestnicy zobaczą formularz automatycznie (realtime)
4. Obserwuj pojawiające się karty z aplikacjami na żywo

### W trakcie sesji
- Karty aktualizują się w czasie rzeczywistym
- Po wygenerowaniu aplikacji AI automatycznie ją ocenia
- Top 3 aplikacje mają złote/srebrne/brązowe obramowanie
- Klikaj **🔗 Otwórz aplikację** aby zobaczyć pełny podgląd

### Zakończenie sesji
1. Kliknij **⏹ Zakończ sesję** (lub poczekaj aż czas się skończy)
2. Kliknij **📊 Wygeneruj podsumowanie sesji** aby zobaczyć statystyki
3. Omów wyniki z uczestnikami — pokaż najlepsze aplikacje
