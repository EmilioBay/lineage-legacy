import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { createServer } from "@/lib/servers.functions";

export const Route = createFileRoute("/_authenticated/add-server")({
  head: () => ({ meta: [{ title: "Add Server — L2Index" }] }),
  component: AddServer,
});

function AddServer() {
  const navigate = useNavigate();
  const create = useServerFn(createServer);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    current_name: "", website_url: "", chronicle: "Interlude", rates: "x1",
    description: "", logo_url: "", discord_url: "", country: "", banner_url: "",
  });

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await create({ data: form });
      toast.success("Server submitted. An admin will review it shortly.");
      navigate({ to: "/dashboard" });
      void r;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Add Your Server</h1>
        <p className="text-muted-foreground mb-8 text-sm">Submissions are reviewed by an admin before going live. Be honest — history is permanent here.</p>

        <form onSubmit={submit} className="space-y-5">
          <Field label="Server name *"><input required value={form.current_name} onChange={(e) => set("current_name", e.target.value)} maxLength={80} className={inputCls} /></Field>
          <Field label="Website URL *"><input required type="url" placeholder="https://example.com" value={form.website_url} onChange={(e) => set("website_url", e.target.value)} className={inputCls} /></Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Chronicle *"><input required value={form.chronicle} onChange={(e) => set("chronicle", e.target.value)} placeholder="Interlude / High Five / Essence" className={inputCls} /></Field>
            <Field label="Rates *"><input required value={form.rates} onChange={(e) => set("rates", e.target.value)} placeholder="x1, x50, x1000" className={inputCls} /></Field>
          </div>

          <Field label="Description *">
            <textarea required minLength={10} maxLength={2000} rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} className={inputCls} />
          </Field>

          <Field label="Logo URL"><input type="url" value={form.logo_url} onChange={(e) => set("logo_url", e.target.value)} className={inputCls} placeholder="https://..." /></Field>
          <Field label="Banner URL (optional)"><input type="url" value={form.banner_url} onChange={(e) => set("banner_url", e.target.value)} className={inputCls} placeholder="https://..." /></Field>
          <Field label="Discord URL (optional)"><input type="url" value={form.discord_url} onChange={(e) => set("discord_url", e.target.value)} className={inputCls} placeholder="https://discord.gg/..." /></Field>
          <Field label="Country (optional)"><input value={form.country} onChange={(e) => set("country", e.target.value)} maxLength={60} className={inputCls} /></Field>

          <button disabled={loading} className="bg-brand text-brand-foreground px-6 py-3 rounded-lg font-bold disabled:opacity-50">
            {loading ? "Submitting..." : "Submit for review"}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}

const inputCls = "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}
