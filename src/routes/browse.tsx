import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { ServerRow } from "@/components/site/ServerRow";
import { listServers } from "@/lib/servers.functions";
import { castVote } from "@/lib/voting.functions";
import { getFingerprint } from "@/lib/fingerprint";

export const Route = createFileRoute("/browse")({
  validateSearch: (s) => z.object({ q: z.string().optional() }).parse(s),
  head: () => ({ meta: [{ title: "Browse All Servers — L2Index" }, { name: "description", content: "Browse and search every Lineage 2 server tracked by L2Index." }] }),
  component: Browse,
});

function Browse() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const list = useServerFn(listServers);
  const vote = useServerFn(castVote);
  const [q, setQ] = useState(search.q ?? "");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["browse", search.q ?? ""],
    queryFn: () => list({ data: { q: search.q } }),
  });

  const mutation = useMutation({
    mutationFn: async (id: string) => vote({ data: { server_id: id, fingerprint: getFingerprint() } }),
    onSuccess: () => { toast.success("Vote counted."); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: "/browse", search: { q: q.trim() || undefined } });
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-6">Browse Servers</h1>
        <form onSubmit={submit} className="flex gap-2 mb-8 max-w-2xl">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, old name, or domain..."
            className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-brand"
          />
          <button className="bg-brand text-brand-foreground px-5 py-2.5 rounded-lg text-sm font-semibold">Search</button>
        </form>

        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        <div className="space-y-3">
          {data?.map((s, i) => (
            <ServerRow key={s.id} rank={i + 1} server={s} onVote={(id) => mutation.mutate(id)} voting={mutation.isPending && mutation.variables === s.id} />
          ))}
          {data && data.length === 0 && (
            <p className="text-muted-foreground text-sm">No servers found{search.q ? ` for "${search.q}"` : ""}.</p>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
