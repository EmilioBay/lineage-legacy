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
  };
  onVote: (id: string) => void;
  voting?: boolean;
}

export function ServerRow({ rank, server, onVote, voting }: Props) {
  const trust = getTrustBadge(server.first_seen_at);
  return (
    <div className="group bg-surface hover:bg-surface-hover border border-border hover:border-brand/30 rounded-xl p-4 transition-all flex items-center gap-4 relative overflow-hidden">
      {trust.badge === "legendary" && <div className="absolute top-0 left-0 w-1 h-full bg-accent" />}
      <div className="text-3xl font-black text-muted-foreground/40 w-10 italic shrink-0">{String(rank).padStart(2, "0")}</div>
      <Link to="/server/$id" params={{ id: server.id }} className="size-16 rounded-lg bg-background border border-border flex-shrink-0 grid place-items-center overflow-hidden">
        {server.logo_url ? (
          <img src={server.logo_url} alt={server.current_name} className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="text-xs text-muted-foreground font-mono">{server.current_name.slice(0, 2).toUpperCase()}</span>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Link to="/server/$id" params={{ id: server.id }} className="text-lg font-bold text-white hover:text-brand transition-colors truncate">
            {server.current_name}
          </Link>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${badgeClasses(trust.badge)}`}>{trust.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
          <span className="font-mono bg-background px-1.5 rounded">{server.chronicle}</span>
          <span className="font-mono bg-background px-1.5 rounded">x{server.rates.replace(/^x/i, "")}</span>
          {trust.years > 0 && <span className="italic text-muted-foreground/80">{trust.years}y listed</span>}
        </div>
      </div>
      <div className="text-right pr-2 hidden sm:block">
        <p className="text-xl font-mono text-white">{server.votes.toLocaleString()}</p>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Votes</p>
      </div>
      <button
        disabled={voting}
        onClick={() => onVote(server.id)}
        className="bg-white/5 hover:bg-brand text-white border border-white/10 px-5 py-2 rounded-lg font-bold transition-colors text-sm disabled:opacity-50"
      >
        {voting ? "..." : "VOTE"}
      </button>
    </div>
  );
}
