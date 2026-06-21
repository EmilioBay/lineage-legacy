export type TrustBadge = "new" | "established" | "veteran" | "legendary";

export function getTrustBadge(firstSeenAt: string | Date): { badge: TrustBadge; label: string; years: number } {
  const first = new Date(firstSeenAt);
  const now = new Date();
  const months = (now.getFullYear() - first.getFullYear()) * 12 + (now.getMonth() - first.getMonth());
  const years = Math.floor(months / 12);
  if (months >= 36) return { badge: "legendary", label: "Legendary", years };
  if (months >= 24) return { badge: "veteran", label: "Veteran", years };
  if (months >= 6) return { badge: "established", label: "Established", years };
  return { badge: "new", label: "New", years };
}

export function badgeClasses(badge: TrustBadge) {
  switch (badge) {
    case "legendary": return "bg-accent/10 text-accent border-accent/30";
    case "veteran":   return "bg-white/10 text-white border-white/20";
    case "established": return "bg-brand/10 text-brand border-brand/30";
    case "new":       return "bg-muted text-muted-foreground border-border";
  }
}
