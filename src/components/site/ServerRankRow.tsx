import { useNavigate } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { ShieldBadge } from "@/components/site/ShieldBadge";

type Accent = "brand" | "gold" | "success" | "accent";

interface ServerRankRowProps {
  rank?: number;
  server: {
    id: string;
    current_name: string;
    logo_url?: string | null;
    chronicle: string;
    rates: string;
    first_seen_at: string;
    votes?: number;
    top_rank_years?: number;
    launch_date?: string | null;
  };
  accent: Accent;
  sponsored?: boolean;
  showRank?: boolean;
  showVotes?: boolean;
  extra?: React.ReactNode;
  highlightPalette?: "green" | "blue";
}

const accentMap: Record<Accent, { border: string; text: string; focus: string }> = {
  brand:   { border: "border-l-brand",   text: "text-brand",   focus: "focus-visible:ring-brand" },
  gold:    { border: "border-l-gold",    text: "text-gold",    focus: "focus-visible:ring-gold" },
  success: { border: "border-l-success", text: "text-success", focus: "focus-visible:ring-success" },
  accent:  { border: "border-l-accent",  text: "text-accent",  focus: "focus-visible:ring-accent" },
};

export function ServerRankRow({
  rank,
  server,
  accent,
  sponsored,
  showRank = true,
  showVotes = true,
  extra,
  highlightPalette,
}: ServerRankRowProps) {
  const navigate = useNavigate();
  const a = accentMap[accent];
  const isTop = rank !== undefined && rank <= 3;

  function open() {
    navigate({ to: "/server/$id", params: { id: server.id } });
  }

  const highlightBg = (() => {
    if (!highlightPalette || rank === undefined || rank > 3) return "";
    const tiers =
      highlightPalette === "green"
        ? ["bg-success/20", "bg-success/10", "bg-success/[0.06]"]
        : ["bg-brand/20", "bg-brand/10", "bg-brand/[0.06]"];
    return tiers[rank - 1];
  })();

  const highlightText =
    highlightPalette && rank !== undefined && rank <= 3
      ? highlightPalette === "green"
        ? "text-success"
        : "text-brand"
      : "";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "group flex items-center gap-2 px-2.5 py-1.5 border-l-[3px] hover:bg-surface-hover transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
        highlightBg || "bg-surface",
        a.border,
        a.focus,
      )}
    >
      {showRank && (
        <span
          className={cn(
            "w-5 text-center font-black tabular-nums text-[11px] leading-none shrink-0",
            highlightText || (isTop ? a.text : "text-muted-foreground/60"),
          )}
        >
          {rank ?? ""}
        </span>
      )}

      <div className="size-6 rounded bg-background border border-border overflow-hidden grid place-items-center shrink-0">
        {server.logo_url ? (
          <img src={server.logo_url} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="text-[8px] text-muted-foreground font-mono font-bold">
            {server.current_name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[13px] font-semibold text-white truncate group-hover:text-brand transition-colors">
            {server.current_name}
          </span>
          {sponsored && (
            <span className="text-[7px] font-bold uppercase bg-success/10 text-success border border-success/20 px-1 py-0 rounded shrink-0">
              AD
            </span>
          )}
        </div>
        <div className="text-[9px] text-muted-foreground mt-0 flex gap-1 items-center">
          <span className="px-1 py-0 rounded bg-white/5 border border-white/10 font-mono">
            {server.chronicle}
          </span>
          <span className="px-1 py-0 rounded bg-white/5 border border-white/10 font-mono">
            x{String(server.rates).replace(/^x/i, "")}
          </span>
        </div>
      </div>

      {extra && <div className="w-12 text-right text-[10px] text-muted-foreground shrink-0">{extra}</div>}

      {showVotes && (
        <div className="w-12 text-right shrink-0">
          <span className={cn("text-[13px] font-bold tabular-nums leading-none", isTop ? "text-white" : "text-muted-foreground")}>
            {(server.votes ?? 0).toLocaleString()}
          </span>
        </div>
      )}

      <div className="w-6 flex justify-center shrink-0">
        <ShieldBadge firstSeenAt={server.first_seen_at} topRankYears={server.top_rank_years ?? 0} size="sm" />
      </div>
    </div>
  );
}
