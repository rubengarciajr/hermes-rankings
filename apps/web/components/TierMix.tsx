import type { Tier } from "@hermesranker/schema";

const TIER_BG: Record<Tier, string> = {
  copper: "bg-tier-copper",
  silver: "bg-tier-silver",
  gold: "bg-tier-gold",
  diamond: "bg-tier-diamond",
  olympian: "bg-tier-olympian",
};

const TIER_ORDER: Tier[] = ["olympian", "diamond", "gold", "silver", "copper"];

export function TierMix({
  counts,
  size = "sm",
}: {
  counts: Record<Tier, number>;
  size?: "sm" | "md";
}) {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return <span className="text-foreground-faint">—</span>;
  }

  const dot = size === "md" ? "size-2.5" : "size-2";

  return (
    <div className="flex items-center gap-3">
      {TIER_ORDER.map((tier) => {
        const n = counts[tier] ?? 0;
        if (n === 0) return null;
        return (
          <div
            key={tier}
            className="flex items-center gap-1"
            title={`${n} × ${tier}`}
          >
            <span className={`${dot} ${TIER_BG[tier]}`} />
            <span className="font-mono text-xs tabular-nums text-foreground-muted">
              {n}
            </span>
          </div>
        );
      })}
    </div>
  );
}
