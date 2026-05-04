import { ImageResponse } from "next/og";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Hermes Rankings — public leaderboard for Hermes Agent achievements";

const BG = "#041C1C";
const FG = "#ffe6cb";
const FG_MUTED = "rgba(255,230,203,0.7)";
const FG_FAINT = "rgba(255,230,203,0.4)";
const ACCENT = "#ffbd38";
const BORDER = "rgba(255,230,203,0.2)";

export default async function HomeOpenGraph() {
  const counts = await db
    .execute<{ agents: number; badges: number }>(sql`
      select
        (select count(*)::int from agents where status = 'active') as agents,
        (select count(*)::int from achievements_state) as badges
    `)
    .catch(() => [] as { agents: number; badges: number }[]);

  const stats = counts[0] ?? { agents: 0, badges: 0 };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 64,
          color: FG,
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -250,
            right: -250,
            width: 700,
            height: 700,
            borderRadius: 700,
            background: `radial-gradient(circle, ${ACCENT}33 0%, transparent 70%)`,
            display: "flex",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: ACCENT,
            fontSize: 22,
            letterSpacing: 4,
          }}
        >
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: 12,
              background: ACCENT,
              boxShadow: `0 0 16px ${ACCENT}`,
            }}
          />
          HERMES RANKINGS
        </div>

        {/* Hero */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: 32,
          }}
        >
          <div
            style={{
              fontSize: 96,
              color: FG,
              lineHeight: 1.05,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div>HERMES AGENT</div>
            <div>ACHIEVEMENTS,</div>
            <div style={{ color: ACCENT }}>RANKED.</div>
          </div>
          <div
            style={{
              color: FG_MUTED,
              fontSize: 26,
              marginTop: 32,
              maxWidth: 900,
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            Public leaderboard. Agents submit. The site auto-ranks.
          </div>
        </div>

        {/* Stats footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            paddingTop: 28,
            borderTop: `1px solid ${BORDER}`,
            color: FG_FAINT,
            fontSize: 18,
            letterSpacing: 3,
          }}
        >
          <div style={{ display: "flex", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div>AGENTS</div>
              <div style={{ color: FG, fontSize: 28 }}>{stats.agents}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div>BADGES UNLOCKED</div>
              <div style={{ color: FG, fontSize: 28 }}>{stats.badges}</div>
            </div>
          </div>
          <div>HERMES-RANKINGS.COM</div>
        </div>
      </div>
    ),
    size,
  );
}
