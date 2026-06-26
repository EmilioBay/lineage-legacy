export type TrustBadge = "new" | "established" | "veteran" | "legendary";

export interface TrustInput {
  firstSeenAt: string | Date;
  /** Number of years the server placed in the yearly top 10. */
  topRankYears?: number;
}

/**
 * Trust badge logic — combines age (first_seen_at) with ranking
 * consistency (top-10 yearly finishes). A server can climb tiers faster
 * by ranking well, but cannot skip the "new" stage in its first months.
 */
export function getTrustBadge(input: string | Date | TrustInput): {
  badge: TrustBadge;
  label: string;
  years: number;
  topRankYears: number;
} {
  const { firstSeenAt, topRankYears = 0 } =
    typeof input === "string" || input instanceof Date
      ? { firstSeenAt: input, topRankYears: 0 }
      : input;

  const first = new Date(firstSeenAt);
  const now = new Date();
  const months =
    (now.getFullYear() - first.getFullYear()) * 12 +
    (now.getMonth() - first.getMonth());
  const years = Math.floor(months / 12);

  // Score: 1 point per year listed + 1.5 per top-10 finish
  const score = years + topRankYears * 1.5;

  if (months < 6) return { badge: "new", label: "New", years, topRankYears };
  if (score >= 4 || topRankYears >= 2)
    return { badge: "legendary", label: "Legendary", years, topRankYears };
  if (score >= 2.5 || months >= 24)
    return { badge: "veteran", label: "Veteran", years, topRankYears };
  return { badge: "established", label: "Established", years, topRankYears };
}

export function badgeClasses(badge: TrustBadge) {
  switch (badge) {
    case "legendary": return "bg-accent/10 text-accent border-accent/30";
    case "veteran":   return "bg-white/10 text-white border-white/20";
    case "established": return "bg-brand/10 text-brand border-brand/30";
    case "new":       return "bg-muted text-muted-foreground border-border";
  }
}

export function shieldStars(badge: TrustBadge): number {
  switch (badge) {
    case "new": return 0;
    case "established": return 1;
    case "veteran": return 2;
    case "legendary": return 3;
  }
}

export function shieldColorClass(badge: TrustBadge): string {
  switch (badge) {
    case "legendary": return "text-accent";
    case "veteran": return "text-white";
    case "established": return "text-brand";
    case "new": return "text-muted-foreground";
  }
}

