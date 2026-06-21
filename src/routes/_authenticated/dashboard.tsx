import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { getMyServers, updateServer, checkIsAdmin } from "@/lib/servers.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Owner Dashboard — L2Index" }] }),
  component: Dashboard,
});

type EditFormData = {
  current_name: string;
  website_url: string;
  chronicle: string;
  rates: string;
  description: string;
  logo_url: string;
  discord_url: string;
  country: string;
  banner_url: string;
};

function Dashboard() {
  const fetchMy = useServerFn(getMyServers);
  const update = useServerFn(updateServer);
  const checkAdmin = useServerFn(checkIsAdmin);

  const { data: servers, refetch } = useQuery({ queryKey: ["my-servers"], queryFn: () => fetchMy({ data: undefined as never }) });
  const { data: adminCheck } = useQuery({ queryKey: ["is-admin"], queryFn: () => checkAdmin({ data: undefined as never }) });

  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = servers?.find((s) => s.id === editingId);

  const mutation = useMutation({
    mutationFn: async (vars: EditFormData & { id: string }) => update({ data: vars }),
    onSuccess: () => { toast.success("Server updated."); setEditingId(null); refetch(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Owner Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your servers, view votes, edit info.</p>
          </div>
          <div className="flex gap-2">
            {adminCheck?.isAdmin && (
              <Link to="/admin" className="bg-accent text-accent-foreground px-4 py-2 rounded-lg text-sm font-semibold">Admin Panel</Link>
            )}
            <Link to="/add-server" className="bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm font-semibold">Add Server</Link>
          </div>
        </div>

        {!servers?.length && (
          <div className="border border-dashed border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground mb-4">You haven't added any servers yet.</p>
            <Link to="/add-server" className="bg-brand text-brand-foreground px-4 py-2 rounded-lg text-sm font-semibold">Add your first server</Link>
          </div>
        )}

        <div className="space-y-4">
          {servers?.map((s) => (
            <div key={s.id} className="bg-surface border border-border rounded-xl p-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white">{s.current_name}</h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                      s.status === "approved" ? "bg-brand/10 text-brand border-brand/30" :
                      s.status === "pending" ? "bg-accent/10 text-accent border-accent/30" :
                      "bg-destructive/10 text-destructive border-destructive/30"
                    }`}>{s.status}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{s.chronicle} · x{s.rates.replace(/^x/i, "")} · {s.votes} votes this season</div>
                </div>
                <button onClick={() => setEditingId(editingId === s.id ? null : s.id)} className="text-sm bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg">
                  {editingId === s.id ? "Close" : "Edit"}
                </button>
              </div>

              {editingId === s.id && editing && (
                <EditForm
                  initial={{
                    current_name: editing.current_name,
                    website_url: editing.website_url,
                    chronicle: editing.chronicle,
                    rates: editing.rates,
                    description: editing.description,
                    logo_url: editing.logo_url ?? "",
                    discord_url: editing.discord_url ?? "",
                    country: editing.country ?? "",
                    banner_url: editing.banner_url ?? "",
                  }}
                  onSubmit={(form) => mutation.mutate({ id: s.id, ...form })}
                  loading={mutation.isPending}
                />
              )}
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

function EditForm({ initial, onSubmit, loading }: { initial: EditFormData; onSubmit: (f: EditFormData) => void; loading: boolean }) {
  const [form, setForm] = useState<EditFormData>(initial);
  function set<K extends keyof EditFormData>(k: K, v: string) { setForm((f) => ({ ...f, [k]: v })); }
  const inp = "w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand";
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="mt-5 pt-5 border-t border-border space-y-3">
      <input className={inp} required value={form.current_name} onChange={(e) => set("current_name", e.target.value)} placeholder="Server name" />
      <input className={inp} required type="url" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="Website URL" />
      <div className="grid grid-cols-2 gap-3">
        <input className={inp} required value={form.chronicle} onChange={(e) => set("chronicle", e.target.value)} placeholder="Chronicle" />
        <input className={inp} required value={form.rates} onChange={(e) => set("rates", e.target.value)} placeholder="Rates" />
      </div>
      <textarea className={inp} required rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} />
      <input className={inp} type="url" value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="Logo URL" />
      <input className={inp} type="url" value={form.banner_url} onChange={(e) => set("banner_url", e.target.value)} placeholder="Banner URL" />
      <input className={inp} type="url" value={form.discord_url} onChange={(e) => set("discord_url", e.target.value)} placeholder="Discord URL" />
      <input className={inp} value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="Country" />
      <p className="text-[11px] text-muted-foreground">Note: name changes are limited to 1 per year. Old names stay in your server's permanent history.</p>
      <button disabled={loading} className="bg-brand text-brand-foreground px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50">
        {loading ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
