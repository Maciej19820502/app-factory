import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AppFactory — DFE Academy",
  description: "Stwórz mini-aplikację za pomocą AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl">
      <body className="flex flex-col min-h-screen">
        {/* Header */}
        <header className="w-full px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://dfe.academy/wp-content/uploads/2025/11/dfe.academy-logo.png"
              alt="DFE.academy logo"
              className="h-10 w-auto"
            />
            <span className="text-lg font-semibold">
              <span className="text-accent-teal">DFE</span>
              <span className="text-white/60">.</span>
              <span className="text-white">academy</span>
            </span>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="w-full px-5 py-5 border-t border-white/10 shrink-0">
          <p className="text-text-secondary text-xs leading-relaxed text-center">
            Aplikacja szkoleniowa DFE.Academy (Workspace Partners Sp. z o.o. &amp; Maciej Broniszewski) Wszystkie prawa zastrzeżone
          </p>
        </footer>
      </body>
    </html>
  );
}
