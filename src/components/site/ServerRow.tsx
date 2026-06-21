import { Link } from "@tanstack/react-router";
import { getTrustBadge, badgeClasses } from "@/lib/trust";

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
  onVote: (id: string) => void;
  voting?: boolean;
}

export function ServerRow({ rank, server, onVote, voting }: Props) {
  const trust = getTrustBadge({
    firstSeenAt: server.first_seen_at,
    topRankYears: server.top_rank_years ?? 0,
  });
  const isPodium = rank <= 3;
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border transition-all flex items-center gap-5 p-5 ${
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

      <Link
        to="/server/$id"
        params={{ id: server.id }}
        className="size-20 sm:size-24 rounded-xl bg-background border border-border flex-shrink-0 grid place-items-center overflow-hidden ring-1 ring-white/5"
      >
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
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/server/$id"
            params={{ id: server.id }}
            className="text-xl font-bold text-white hover:text-brand transition-colors truncate"
          >
            {server.current_name}
          </Link>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badgeClasses(
              trust.badge,
            )}`}
          >
            {trust.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2 flex-wrap">
          <span className="font-mono bg-background border border-border px-2 py-0.5 rounded">
            {server.chronicle}
          </span>
          <span className="font-mono bg-background border border-border px-2 py-0.5 rounded">
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

      <div className="text-right pr-2 hidden sm:block">
        <p className="text-2xl font-mono text-white tabular-nums">
          {server.votes.toLocaleString()}
        </p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Votes
        </p>
      </div>

      <button
        disabled={voting}
        onClick={() => onVote(server.id)}
        className="bg-white/5 hover:bg-brand text-white border border-white/10 px-6 py-2.5 rounded-lg font-bold transition-colors text-sm disabled:opacity-50 shrink-0"
      >
        {voting ? "..." : "VOTE"}
      </button>
    </div>
  );
}
