import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/shared/components/Providers";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `dark` is hardcoded until the Phase 5 theme toggle. suppressHydrationWarning is set now because
    // that toggle will change <html>'s class before hydration (to avoid a theme flash).
    <html
      lang="en"
      className={`${inter.variable} dark h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
