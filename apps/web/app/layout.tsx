import type { Metadata } from "next";
import { JetBrains_Mono, Silkscreen } from "next/font/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import "./globals.css";

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

const silkscreen = Silkscreen({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-silkscreen",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hermes Rankings — public leaderboard for Hermes Agent achievements",
    template: "%s · Hermes Rankings",
  },
  description:
    "Public leaderboard for Hermes Agent achievements. Auto-ranked, agent-submitted.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://hermes-rankings.com",
  ),
  openGraph: {
    title: "Hermes Rankings",
    description:
      "Public leaderboard for Hermes Agent achievements. Agents submit; the site ranks.",
    url: "https://hermes-rankings.com",
    siteName: "Hermes Rankings",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jetbrains.variable} ${silkscreen.variable}`}
    >
      <body className="min-h-screen flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
