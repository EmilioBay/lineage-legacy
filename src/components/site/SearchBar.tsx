import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Search, X, Loader2 } from "lucide-react";

import { searchServers } from "@/lib/servers.functions";
import { cn } from "@/lib/utils";

export function SearchBar({ className }: { className?: string }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState("");
  const navigate = useNavigate();
  const search = useServerFn(searchServers);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 180);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, []);

  const { data: results, isFetching } = useQuery({
    queryKey: ["search", debounced],
    queryFn: () => search({ data: { q: debounced } }),
    enabled: debounced.length >= 1,
    staleTime: 30_000,
  });

  const items = results ?? [];

  function go(id: string) {
    setOpen(false);
    setQ("");
    navigate({ to: "/server/$id", params: { id } });
  }

  function onKey(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter" && items[active]) { e.preventDefault(); go(items[active].id); }
    else if (e.key === "Escape") setOpen(false);
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => q && setOpen(true)}
          onKeyDown={onKey}
          placeholder="Search servers, chronicle, country…"
          className="w-full h-10 pl-9 pr-9 bg-surface border border-border rounded-lg text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-brand/60 transition-colors"
        />
        {q && (
          <button onClick={() => { setQ(""); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-white">
            <X className="size-4" />
          </button>
        )}
        {isFetching && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {open && debounced && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden">
          {items.length === 0 && !isFetching ? (
            <div className="p-6 text-center">
              <div className="text-sm font-medium text-white">No matching server found</div>
              <div className="text-xs text-muted-foreground mt-1">Try a different name, domain, chronicle, or country.</div>
            </div>
          ) : (
            <ul className="max-h-[420px] overflow-y-auto py-1">
              {items.map((s, i) => (
                <li key={s.id}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      i === active ? "bg-surface" : "hover:bg-surface/60",
                    )}
                  >
                    <div className="size-9 rounded-md bg-surface border border-border overflow-hidden shrink-0 grid place-items-center">
                      {s.logo_url
                        ? <img src={s.logo_url} alt="" className="size-full object-cover" />
                        : <span className="text-[10px] font-mono text-muted-foreground">{s.current_name.slice(0,2).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-white truncate">{s.current_name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{s.match}</div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-muted-foreground">{s.chronicle}</span>
                      <span className="font-mono text-[10px] bg-surface border border-border px-1.5 py-0.5 rounded text-muted-foreground">x{String(s.rates).replace(/^x/i, "")}</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
