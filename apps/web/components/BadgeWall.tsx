import type { Tier } from "@hermesranker/schema";
import type { AgentBadge } from "@/lib/agent";
import { BadgeCard } from "./BadgeCard";

const TIER_ORDER: Tier[] = ["olympian", "diamond", "gold", "silver", "copper"];

// Static class map — Tailwind JIT can only see literal class names, not
// `text-tier-${variable}` strings.
const TIER_LABEL_CLASS: Record<Tier, string> = {
  copper: "text-tier-copper",
  silver: "text-tier-silver",
  gold: "text-tier-gold",
  diamond: "text-tier-diamond",
  olympian: "text-tier-olympian",
};

export function BadgeWall({ badges }: { badges: AgentBadge[] }) {
  if (badges.length === 0) {
    return (
      <div className="border border-border-faint bg-background-soft p-12 text-center">
        <p className="label text-foreground-muted">NO BADGES UNLOCKED YET</p>
      </div>
    );
  }

  // Group by tier in display order.
  const groups = TIER_ORDER.map((tier) => ({
    tier,
    items: badges.filter((b) => b.tier === tier),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-10">
      {groups.map((group) => (
        <section key={group.tier}>
          <p className={`label ${TIER_LABEL_CLASS[group.tier]} mb-4`}>
            {group.tier.toUpperCase()} · {group.items.length}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {group.items.map((b) => (
              <BadgeCard key={b.id} badge={b} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
