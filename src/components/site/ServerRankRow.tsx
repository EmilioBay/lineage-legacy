import { useNavigate } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { ShieldBadge } from "@/components/site/ShieldBadge";

type Accent = "brand" | "gold" | "success";

interface ServerRankRowProps {
  rank: number;
  server: {
    id: string;
    current_name: string;
    logo_url?: string | null;
    chronicle: string;
    rates: string;
    first_seen_at: string;
    votes?: number;
    top_rank_years?: number;
  };
  accent: Accent;
  sponsored?: boolean;
}

const accentMap: Record<Accent, { border: string; text: string; focus: string; bg: string }> = {
  brand: {
    border: "border-l-brand",
    text: "text-brand",
    focus: "focus-visible:ring-brand",
    bg: "bg-brand",
  },
  gold: {
    border: "border-l-gold",
    text: "text-gold",
    focus: "focus-visible:ring-gold",
    bg: "bg-gold",
  },
  success: {
    border: "border-l-success",
    text: "text-success",
    focus: "focus-visible:ring-success",
    bg: "bg-success",
  },
};

export function ServerRankRow({ rank, server, accent, sponsored }: ServerRankRowProps) {
  const navigate = useNavigate();
  const a = accentMap[accent];
  const isTop = rank <= 3;

  function open() {
    navigate({ to: "/server/$id", params: { id: server.id } });
  }

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
        "group grid grid-cols-[36px_1fr_72px_28px] gap-2 px-3 py-2.5 items-center bg-surface border-y-0 border-r-0 border-l-4 hover:bg-surface-hover transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        a.border,
        a.focus
      )}
    >
      <span
        className={cn(
          "text-center font-black tabular-nums text-sm leading-none",
          isTop ? a.text : "text-muted-foreground/60"
        )}
      >
        {rank}
      </span>

      <div className="flex items-center gap-2 min-w-0">
        <div className="size-7 rounded bg-background border border-border overflow-hidden grid place-items-center shrink-0">
          {server.logo_url ? (
            <img src={server.logo_url} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <span className="text-[9px] text-muted-foreground font-mono font-bold">
              {server.current_name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-white truncate group-hover:text-brand transition-colors">
              {server.current_name}
            </span>
            {sponsored && (
              <span className="text-[8px] font-bold uppercase bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded shrink-0">
                Sponsored
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5 flex gap-2">
            <span>{server.chronicle}</span>
            <span>x{String(server.rates).replace(/^x/i, "")}</span>
          </div>
        </div>
      </div>

      <div className="text-right">
        <span className={cn("text-sm font-bold tabular-nums leading-none", isTop ? "text-white" : "text-muted-foreground")}>
          {(server.votes ?? 0).toLocaleString()}
        </span>
      </div>

      <div className="flex justify-center">
        <ShieldBadge firstSeenAt={server.first_seen_at} topRankYears={server.top_rank_years ?? 0} size="sm" />
      </div>
    </div>
  );
}
