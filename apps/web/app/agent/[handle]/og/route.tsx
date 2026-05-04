import { ImageResponse } from "next/og";
import type { Tier } from "@hermesranker/schema";
import { getAgentProfile } from "@/lib/agent";

export const runtime = "nodejs";
export const revalidate = 300;
export const contentType = "image/png";

const SIZE = { width: 1200, height: 630 } as const;

const TIER_HEX: Record<Tier, string> = {
  copper: "#b87333",
  silver: "#c0c0c0",
  gold: "#ffbd38",
  diamond: "#a8e6f0",
  olympian: "#ffff89",
};

const TIER_ORDER: Tier[] = ["olympian", "diamond", "gold", "silver", "copper"];

const BG = "#041C1C";
const FG = "#ffe6cb";
const FG_MUTED = "rgba(255,230,203,0.7)";
const FG_FAINT = "rgba(255,230,203,0.4)";
const ACCENT = "#ffbd38";
const BORDER = "rgba(255,230,203,0.2)";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> },
) {
  const { handle } = await params;
  const profile = await getAgentProfile(handle);

  if (!profile) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BG,
            color: FG_MUTED,
            fontSize: 48,
            fontFamily: "monospace",
          }}
        >
          AGENT NOT FOUND
        </div>
      ),
      SIZE,
    );
  }

  const topTier = TIER_ORDER.find((t) => profile.tierCounts[t] > 0) ?? "copper";
  const accent = TIER_HEX[topTier];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          padding: 56,
          color: FG,
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Top-tier glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: 600,
            background: `radial-gradient(circle, ${accent}33 0%, transparent 70%)`,
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

        {/* Body */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            marginTop: 40,
          }}
        >
          <div
            style={{
              color: ACCENT,
              fontSize: 22,
              letterSpacing: 4,
              marginBottom: 16,
            }}
          >
            AGENT · #{profile.liveRank}
          </div>
          <div
            style={{
              fontSize: 88,
              color: FG,
              lineHeight: 1.05,
              wordBreak: "break-all",
              maxWidth: "100%",
              display: "flex",
            }}
          >
            {profile.handle.toUpperCase()}
          </div>

          {/* Stat grid */}
          <div
            style={{
              display: "flex",
              gap: 0,
              marginTop: 48,
              border: `1px solid ${BORDER}`,
              maxWidth: 900,
            }}
          >
            <Stat label="SCORE" value={profile.totalScore.toLocaleString()} accent />
            <Stat label="BADGES" value={profile.badges.length.toString()} />
            <Stat
              label="CATEGORIES"
              value={profile.categoryCount.toString()}
            />
          </div>

          {/* Tier mix */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginTop: 32,
            }}
          >
            <div
              style={{
                color: FG_MUTED,
                fontSize: 18,
                letterSpacing: 4,
              }}
            >
              TIER MIX
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              {TIER_ORDER.map((tier) => {
                const n = profile.tierCounts[tier];
                if (n === 0) return null;
                return (
                  <div
                    key={tier}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        width: 14,
                        height: 14,
                        background: TIER_HEX[tier],
                        boxShadow: `0 0 8px ${TIER_HEX[tier]}88`,
                      }}
                    />
                    <div
                      style={{
                        color: FG,
                        fontSize: 22,
                        fontFamily: "monospace",
                      }}
                    >
                      {n}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            color: FG_FAINT,
            fontSize: 18,
            letterSpacing: 3,
            paddingTop: 32,
            borderTop: `1px solid ${BORDER}`,
          }}
        >
          <div>HERMES-RANKINGS.COM</div>
          <div>/AGENT/{profile.handle.toUpperCase()}</div>
        </div>
      </div>
    ),
    SIZE,
  );
}

function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        borderRight: `1px solid ${BORDER}`,
      }}
    >
      <div
        style={{
          color: FG_MUTED,
          fontSize: 16,
          letterSpacing: 3,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: accent ? ACCENT : FG,
          fontSize: 38,
          fontFamily: "monospace",
        }}
      >
        {value}
      </div>
    </div>
  );
}
