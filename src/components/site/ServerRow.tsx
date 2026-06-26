import { useNavigate } from "@tanstack/react-router";

import { ShieldBadge } from "@/components/site/ShieldBadge";
import { getTrustBadge } from "@/lib/trust";


interface Props {
  rank: number;
  server: {
    id: string;
    current_name: string;
    logo_url?: string | null;
    chronicle: string;
    rates: string;
    first_seen_at: string;
    votes: number;
    top_rank_years?: number;
    country?: string | null;
  };
  onVote?: (id: string) => void;
  voting?: boolean;
}

export function ServerRow({ rank, server, onVote, voting }: Props) {
  const navigate = useNavigate();
  const trust = getTrustBadge({
    firstSeenAt: server.first_seen_at,
    topRankYears: server.top_rank_years ?? 0,
  });
  const isPodium = rank <= 3;

  function openServer() {
    navigate({ to: "/server/$id", params: { id: server.id } });
  }

  return (
    <div
      role={onVote ? undefined : "button"}
      tabIndex={onVote ? undefined : 0}
      onClick={openServer}
      onKeyDown={
        onVote
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openServer();
              }
            }
      }
      className={`group relative overflow-hidden rounded-2xl border transition-all flex flex-col sm:flex-row items-stretch sm:items-center gap-5 sm:gap-6 p-6 cursor-pointer ${
        onVote ? "" : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      } ${
        isPodium
          ? "bg-gradient-to-r from-surface to-surface/40 border-brand/30 shadow-[0_0_0_1px_rgba(56,127,255,0.08)]"
          : "bg-surface border-border hover:border-brand/30"
      } hover:bg-surface-hover`}
    >
      {trust.badge === "legendary" && (
        <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
      )}

      <div
        className={`shrink-0 w-12 text-center font-black italic tabular-nums ${
          isPodium ? "text-brand text-4xl" : "text-muted-foreground/40 text-3xl"
        }`}
      >
        {String(rank).padStart(2, "0")}
      </div>

      <div className="size-14 sm:size-16 rounded-xl bg-background border border-border flex-shrink-0 grid place-items-center overflow-hidden ring-1 ring-white/5">
        {server.logo_url ? (
          <img
            src={server.logo_url}
            alt={server.current_name}
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-sm text-muted-foreground font-mono font-bold">
            {server.current_name.slice(0, 2).toUpperCase()}
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0 py-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-2xl font-bold tracking-tight text-foreground group-hover:text-brand transition-colors truncate">
            {server.current_name}
          </span>
          <ShieldBadge
            firstSeenAt={server.first_seen_at}
            topRankYears={server.top_rank_years ?? 0}
            size="md"
            showLabel
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
          <span className="font-mono bg-background/60 border border-border/70 px-2.5 py-1 rounded">
            {server.chronicle}
          </span>
          <span className="font-mono bg-background/60 border border-border/70 px-2.5 py-1 rounded">
            x{server.rates.replace(/^x/i, "")}
          </span>
          {trust.years > 0 && (
            <span className="italic">{trust.years}y listed</span>
          )}
          {(server.top_rank_years ?? 0) > 0 && (
            <span className="text-accent font-mono">
              ★ {server.top_rank_years}× top 10
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-5 sm:gap-6 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
        <div className="text-right sm:text-center shrink-0">
          <p className="text-3xl font-black text-foreground tabular-nums leading-none">
            {server.votes.toLocaleString()}
          </p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">
            Votes
          </p>
        </div>

        {onVote && (
          <button
            disabled={voting}
            onClick={(e) => {
              e.stopPropagation();
              onVote(server.id);
            }}
            className="bg-white/5 hover:bg-brand text-foreground border border-white/10 px-7 py-3 rounded-lg font-bold transition-colors text-sm disabled:opacity-50 shrink-0"
          >
            {voting ? "..." : "VOTE"}
          </button>
        )}
      </div>
    </div>
  );
}
