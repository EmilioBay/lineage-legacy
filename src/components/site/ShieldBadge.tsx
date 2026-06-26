import { Shield, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { getTrustBadge, shieldColorClass, shieldStars } from "@/lib/trust";

interface ShieldBadgeProps {
  firstSeenAt: string | Date;
  topRankYears?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeMap = {
  sm: { shield: "size-4", star: "size-2" },
  md: { shield: "size-5", star: "size-2.5" },
  lg: { shield: "size-6", star: "size-3" },
};

export function ShieldBadge({ firstSeenAt, topRankYears = 0, size = "sm", showLabel = false }: ShieldBadgeProps) {
  const { badge, label } = getTrustBadge({ firstSeenAt, topRankYears });
  const stars = shieldStars(badge);
  const color = shieldColorClass(badge);
  const s = sizeMap[size];

  return (
    <div className={cn("inline-flex items-center gap-1.5", color)} title={label}>
      <div className="relative inline-flex items-center justify-center">
        <Shield className={cn(s.shield, "fill-current opacity-15")} />
        <Shield className={cn("absolute", s.shield)} />
        {stars > 0 && (
          <div className="absolute inset-0 flex items-center justify-center gap-px">
            {Array.from({ length: stars }).map((_, i) => (
              <Star key={i} className={cn(s.star, "fill-current")} />
            ))}
          </div>
        )}
      </div>
      {showLabel && <span className="text-xs font-medium whitespace-nowrap">{label}</span>}
    </div>
  );
}
