import { Link } from "@tanstack/react-router";

import { cn } from "@/lib/utils";
import { ServerRankRow } from "@/components/site/ServerRankRow";

type Accent = "brand" | "gold" | "success";

interface Server {
  id: string;
  current_name: string;
  logo_url?: string | null;
  chronicle: string;
  rates: string;
  first_seen_at: string;
  votes: number;
  top_rank_years?: number;
}

interface RankingTableProps {
  accent: Accent;
  title: string;
  yearBadge?: string | number;
  servers: Server[];
  emptyMessage?: string;
  sponsoredIds?: Set<string>;
}

const headerAccent: Record<Accent, string> = {
  brand: "border-brand/30 text-brand bg-brand/10",
  gold: "border-gold/30 text-gold bg-gold/10",
  success: "border-success/30 text-success bg-success/10",
};

export function RankingTable({ accent, title, yearBadge, servers, emptyMessage, sponsoredIds }: RankingTableProps) {
  const headerClass = headerAccent[accent];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className={cn("size-2 rounded-full", accent === "brand" ? "bg-brand" : accent === "gold" ? "bg-gold" : "bg-success")} />
          {title}
          {yearBadge && (
            <span className={cn("text-[10px] px-2 py-0.5 rounded border uppercase font-mono", headerClass)}>
              {yearBadge}
            </span>
          )}
        </h2>
        <Link to="/browse" className="text-xs text-muted-foreground hover:text-brand transition-colors">
          View All
        </Link>
      </div>

      {servers.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <p className="text-muted-foreground text-sm">{emptyMessage ?? "No servers listed."}</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[36px_1fr_72px_28px] gap-2 px-3 py-2 bg-background/40 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            <span>#</span>
            <span>Server</span>
            <span className="text-right">Votes</span>
            <span className="text-center">Trust</span>
          </div>
          <div className="divide-y divide-border">
            {servers.map((s, i) => (
              <ServerRankRow
                key={s.id}
                rank={i + 1}
                server={s}
                accent={accent}
                sponsored={sponsoredIds?.has(s.id)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
