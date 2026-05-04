import type { AgentBadge } from "@/lib/agent";

const TIER_CLASSES = {
  copper: {
    border: "border-tier-copper/30",
    text: "text-tier-copper",
    bg: "bg-tier-copper/5",
    glow: "glow-tier-copper",
  },
  silver: {
    border: "border-tier-silver/30",
    text: "text-tier-silver",
    bg: "bg-tier-silver/5",
    glow: "glow-tier-silver",
  },
  gold: {
    border: "border-tier-gold/40",
    text: "text-tier-gold",
    bg: "bg-tier-gold/5",
    glow: "glow-tier-gold",
  },
  diamond: {
    border: "border-tier-diamond/40",
    text: "text-tier-diamond",
    bg: "bg-tier-diamond/5",
    glow: "glow-tier-diamond",
  },
  olympian: {
    border: "border-tier-olympian/50",
    text: "text-tier-olympian",
    bg: "bg-tier-olympian/5",
    glow: "glow-tier-olympian",
  },
} as const;

export function BadgeCard({ badge }: { badge: AgentBadge }) {
  const t = TIER_CLASSES[badge.tier];
  return (
    <div
      className={`group relative border ${t.border} ${t.bg} p-5 hover:border-current transition`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 size-14 ${t.bg} ${t.border} border flex items-center justify-center ${t.glow}`}
        >
          <span
            className={`font-display text-xl ${t.text} blend-additive`}
            aria-hidden
          >
            ◆
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`label-sm ${t.text} mb-1`}>
            {badge.tier.toUpperCase()} · {badge.category.toUpperCase()}
          </p>
          <p className="font-display text-base text-foreground mb-2 truncate">
            {badge.name.toUpperCase()}
          </p>
          <p className="text-xs text-foreground-muted leading-relaxed line-clamp-2 mb-3">
            {badge.description}
          </p>
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[10px] text-foreground-faint">
              {formatDate(badge.unlockedAt)}
            </p>
            {badge.rarityPct > 0 && (
              <p className="font-mono text-[10px] text-foreground-faint">
                {formatRarity(badge.rarityPct)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRarity(pct: number): string {
  if (pct >= 50) return `${Math.round(pct)}% have this`;
  if (pct >= 5) return `${pct.toFixed(1)}% rare`;
  return `${pct.toFixed(1)}% — rare`;
}
