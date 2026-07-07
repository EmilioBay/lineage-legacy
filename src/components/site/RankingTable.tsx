import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { ServerRankRow } from "@/components/site/ServerRankRow";

type Accent = "brand" | "gold" | "success" | "accent";

interface Server {
  id: string;
  current_name: string;
  logo_url?: string | null;
  chronicle: string;
  rates: string;
  first_seen_at: string;
  votes?: number;
  top_rank_years?: number;
  launch_date?: string | null;
}

interface RankingTableProps {
  accent: Accent;
  title: string;
  yearBadge?: string | number;
  servers: Server[];
  emptyMessage?: string;
  sponsoredIds?: Set<string>;
  showRank?: boolean;
  showVotes?: boolean;
  allSponsored?: boolean;
  viewAllTo?: string;
  extraHeader?: string;
  rowExtra?: (s: Server) => React.ReactNode;
  highlightPalette?: "green" | "blue";
}


const headerAccent: Record<Accent, string> = {
  brand:   "border-brand/30 text-brand bg-brand/10",
  gold:    "border-gold/30 text-gold bg-gold/10",
  success: "border-success/30 text-success bg-success/10",
  accent:  "border-accent/30 text-accent bg-accent/10",
};

const dotAccent: Record<Accent, string> = {
  brand: "bg-brand",
  gold: "bg-gold",
  success: "bg-success",
  accent: "bg-accent",
};

export function RankingTable({
  accent,
  title,
  yearBadge,
  servers,
  emptyMessage,
  sponsoredIds,
  showRank = true,
  showVotes = true,
  allSponsored = false,
  viewAllTo = "/browse",
  extraHeader,
  rowExtra,
  highlightPalette,
}: RankingTableProps) {

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
          <span className={cn("size-2 rounded-full", dotAccent[accent])} />
          {title}
          {yearBadge && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded border uppercase font-mono", headerAccent[accent])}>
              {yearBadge}
            </span>
          )}
        </h2>
        <Link to={viewAllTo} className="text-[11px] text-muted-foreground hover:text-brand transition-colors">
          View All →
        </Link>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-xs">{emptyMessage ?? "No servers listed."}</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-surface/30">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-background/60 border-b border-border text-[9px] uppercase tracking-wider text-muted-foreground/80 font-semibold">
            {showRank && <span className="w-5 text-center">#</span>}
            <span className="size-6 shrink-0" />
            <span className="flex-1">Server</span>
            {rowExtra && <span className="w-12 text-right shrink-0">{extraHeader}</span>}
            {showVotes && <span className="w-12 text-right shrink-0">Votes</span>}
            <span className="w-6 text-center shrink-0">Trust</span>
          </div>
          <div className="divide-y divide-border">
            {servers.map((s, i) => (
              <ServerRankRow
                key={s.id}
                rank={showRank ? i + 1 : i + 1}
                server={s}
                accent={accent}
                sponsored={allSponsored || sponsoredIds?.has(s.id)}
                showRank={showRank}
                showVotes={showVotes}
                extra={rowExtra?.(s)}
                highlightPalette={highlightPalette}
              />

            ))}
          </div>
        </div>
      )}
    </section>
  );
}
