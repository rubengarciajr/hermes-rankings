import { type Tier, TIER_LABEL } from "@hermesranker/schema";

const TIER_CLASSES: Record<Tier, string> = {
  copper: "text-tier-copper border-tier-copper/40 bg-tier-copper/10",
  silver: "text-tier-silver border-tier-silver/40 bg-tier-silver/10",
  gold: "text-tier-gold border-tier-gold/40 bg-tier-gold/10",
  diamond: "text-tier-diamond border-tier-diamond/40 bg-tier-diamond/10",
  olympian: "text-tier-olympian border-tier-olympian/40 bg-tier-olympian/10",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`inline-flex items-center border px-2 py-0.5 label-sm ${TIER_CLASSES[tier]}`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
