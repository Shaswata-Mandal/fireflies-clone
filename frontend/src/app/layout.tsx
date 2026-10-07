import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/shared/components/layout/AppShell";
import { Providers } from "@/shared/components/Providers";
import { DARK_CLASS, SYSTEM_DARK_QUERY, THEME_STORAGE_KEY } from "@/shared/utils/theme";
import "@/styles/globals.css";

// Inter matches the Fireflies UI font (docs/reference/colors.md §4); exposed as a CSS variable
// so globals.css can feed it to Tailwind's `font-sans`.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fireflies Clone",
  description: "Meeting library, transcripts and AI summaries",
};

// Runs before first paint so a saved "light"/"system" choice never flashes dark. Mirrors
// resolveTheme() in shared/utils/theme.ts; anything unreadable leaves the default dark class.
const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var d=t==="system"?matchMedia("${SYSTEM_DARK_QUERY}").matches:t!=="light";document.documentElement.classList.toggle("${DARK_CLASS}",d)}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `dark` is the default; ThemeProvider and THEME_INIT_SCRIPT change <html>'s class before
    // hydration, hence suppressHydrationWarning.
    <html
      lang="en"
      className={`${inter.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="h-full">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
