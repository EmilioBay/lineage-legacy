import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, X, Loader2, Upload, HelpCircle, Eye } from "lucide-react";

import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { createServer, checkIdentifierAvailability } from "@/lib/servers.functions";
import { supabase } from "@/integrations/supabase/client";
import { CHRONICLES, SERVER_TYPES, COUNTRIES } from "@/lib/l2-constants";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

export const Route = createFileRoute("/_authenticated/add-server")({
  head: () => ({ meta: [{ title: "Add Server — L2Index" }] }),
  component: AddServer,
});

const MIN_DESC = 100;
const MAX_DESC = 2000;

function AddServer() {
  const navigate = useNavigate();
  const create = useServerFn(createServer);
  const checkName = useServerFn(checkIdentifierAvailability);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [countryOpen, setCountryOpen] = useState(false);

  const [nameStatus, setNameStatus] = useState<"idle" | "checking" | "available" | "taken" | "short">("idle");
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    current_name: "",
    website_url: "",
    chronicle: "Interlude",
    rates: 1,
    server_type: "Mid Rate",
    launch_date: "",
    description: "",
    logo_url: "",
    discord_url: "",
    country: "",
    banner_url: "",
  });
  const [uploading, setUploading] = useState<{ logo: boolean; banner: boolean }>({ logo: false, banner: false });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // Real-time name availability
  useEffect(() => {
    if (nameTimer.current) clearTimeout(nameTimer.current);
    const value = form.current_name.trim();
    if (value.length < 2) {
      setNameStatus(value.length === 0 ? "idle" : "short");
      return;
    }
    setNameStatus("checking");
    nameTimer.current = setTimeout(async () => {
      try {
        const r = await checkName({ data: { identifier: value } });
        setNameStatus(r.available ? "available" : "taken");
      } catch {
        setNameStatus("idle");
      }
    }, 400);
    return () => {
      if (nameTimer.current) clearTimeout(nameTimer.current);
    };
  }, [form.current_name, checkName]);

  async function uploadImage(file: File, kind: "logo" | "banner") {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      toast.error("Please sign in again.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Max image size is 5 MB.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }
    setUploading((u) => ({ ...u, [kind]: true }));
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${userData.user.id}/${kind}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("server-images")
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      // Bucket is private — use a long-lived signed URL.
      const { data: signed, error: signErr } = await supabase.storage
        .from("server-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr || !signed) throw signErr ?? new Error("Could not generate URL");
      set(kind === "logo" ? "logo_url" : "banner_url", signed.signedUrl);
      toast.success(`${kind === "logo" ? "Logo" : "Banner"} uploaded.`);
    } catch (err) {
      toast.error((err as Error).message || "Upload failed.");
    } finally {
      setUploading((u) => ({ ...u, [kind]: false }));
    }
  }

  function validate(): string | null {
    if (form.current_name.trim().length < 2) return "Server name is required.";
    if (nameStatus === "taken") return "Server name is unavailable.";
    if (!form.website_url) return "Website URL is required.";
    if (!form.chronicle) return "Chronicle is required.";
    if (form.rates < 1 || form.rates > 999999) return "Rates must be between 1 and 999,999.";
    if (!form.server_type) return "Server type is required.";
    if (form.description.trim().length < MIN_DESC) return `Description must be at least ${MIN_DESC} characters.`;
    if (form.description.length > MAX_DESC) return `Description must be at most ${MAX_DESC} characters.`;
    return null;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setLoading(true);
    try {
      await create({ data: form });
      toast.success("Server submitted. An admin will review it shortly.");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const descLen = form.description.length;
  const descOk = descLen >= MIN_DESC && descLen <= MAX_DESC;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">Add Your Server</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          Submissions are reviewed by an admin before going live. Be honest — history is permanent here.
        </p>

        <form onSubmit={submit} className="space-y-5">
          <Field label="Server name *">
            <div className="relative">
              <input
                required
                value={form.current_name}
                onChange={(e) => set("current_name", e.target.value)}
                maxLength={80}
                className={inputCls + " pr-10"}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {nameStatus === "checking" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {nameStatus === "available" && <Check className="w-4 h-4 text-emerald-500" />}
                {nameStatus === "taken" && <X className="w-4 h-4 text-red-500" />}
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span
                className={
                  nameStatus === "available"
                    ? "text-emerald-500"
                    : nameStatus === "taken"
                      ? "text-red-500"
                      : "text-muted-foreground"
                }
              >
                {nameStatus === "available" && "Name is available."}
                {nameStatus === "taken" && "Name is already in use by an active server."}
                {nameStatus === "checking" && "Checking availability..."}
                {nameStatus === "short" && "Name must be at least 2 characters."}
                {nameStatus === "idle" && "Checked in real time."}
              </span>
              <button
                type="button"
                onClick={() => setWhyOpen(true)}
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-white"
              >
                <HelpCircle className="w-3 h-3" /> Why is this name unavailable?
              </button>
            </div>
          </Field>

          <Field label="Website URL *">
            <input
              required
              type="url"
              placeholder="https://example.com"
              value={form.website_url}
              onChange={(e) => set("website_url", e.target.value)}
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Chronicle *">
              <select
                required
                value={form.chronicle}
                onChange={(e) => set("chronicle", e.target.value)}
                className={inputCls}
              >
                {CHRONICLES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Server type *">
              <select
                required
                value={form.server_type}
                onChange={(e) => set("server_type", e.target.value)}
                className={inputCls}
              >
                {SERVER_TYPES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Rates (1–999999) *">
              <input
                required
                type="number"
                min={1}
                max={999999}
                step={1}
                value={form.rates}
                onChange={(e) => set("rates", Math.max(1, Math.min(999999, Number(e.target.value) || 1)))}
                className={inputCls}
              />
            </Field>
            <Field label="Launch date">
              <input
                type="date"
                value={form.launch_date}
                onChange={(e) => set("launch_date", e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Description *">
            <textarea
              required
              minLength={MIN_DESC}
              maxLength={MAX_DESC}
              rows={6}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className={inputCls}
            />
            <div className={`mt-1 text-xs text-right ${descOk ? "text-muted-foreground" : "text-red-500"}`}>
              {descLen} / {MAX_DESC} (min {MIN_DESC})
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Logo">
              <ImageUploadField
                value={form.logo_url}
                uploading={uploading.logo}
                onFile={(f) => uploadImage(f, "logo")}
                onClear={() => set("logo_url", "")}
                aspect="aspect-square"
              />
            </Field>
            <Field label="Banner">
              <ImageUploadField
                value={form.banner_url}
                uploading={uploading.banner}
                onFile={(f) => uploadImage(f, "banner")}
                onClear={() => set("banner_url", "")}
                aspect="aspect-[3/1]"
              />
            </Field>
          </div>

          <Field label="Discord URL (optional)">
            <input
              type="url"
              value={form.discord_url}
              onChange={(e) => set("discord_url", e.target.value)}
              className={inputCls}
              placeholder="https://discord.gg/..."
            />
          </Field>

          <Field label="Country (optional)">
            <Popover open={countryOpen} onOpenChange={setCountryOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={inputCls + " text-left flex items-center justify-between"}
                >
                  <span className={form.country ? "" : "text-muted-foreground"}>
                    {form.country || "Select country..."}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                <Command>
                  <CommandInput placeholder="Search country..." />
                  <CommandList>
                    <CommandEmpty>No country found.</CommandEmpty>
                    <CommandGroup>
                      {COUNTRIES.map((c) => (
                        <CommandItem
                          key={c}
                          value={c}
                          onSelect={() => {
                            set("country", c);
                            setCountryOpen(false);
                          }}
                        >
                          {c}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </Field>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex items-center gap-2 bg-surface border border-border text-white px-5 py-3 rounded-lg font-semibold hover:border-brand"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>
            <button
              type="submit"
              disabled={loading || nameStatus === "taken"}
              className="bg-brand text-brand-foreground px-6 py-3 rounded-lg font-bold disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit for review"}
            </button>
          </div>
        </form>
      </main>
      <Footer />

      {/* Why unavailable dialog */}
      <Dialog open={whyOpen} onOpenChange={setWhyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Why is this name unavailable?</DialogTitle>
            <DialogDescription>
              On L2Index, server names and domains are protected to keep trust history honest.
            </DialogDescription>
          </DialogHeader>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-5">
            <li>A name or domain that belongs to an active (approved or pending) server cannot be reused.</li>
            <li>Previous names are kept in history forever — even after a rename.</li>
            <li>This prevents impersonation of established projects and reputation laundering.</li>
            <li>If you believe you are the rightful owner of a conflicting name, contact admins after submission.</li>
          </ul>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Listing preview</DialogTitle>
            <DialogDescription>This is roughly how your server will appear once approved.</DialogDescription>
          </DialogHeader>
          <ServerPreview form={form} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

const inputCls =
  "w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ImageUploadField({
  value,
  uploading,
  onFile,
  onClear,
  aspect,
}: {
  value: string;
  uploading: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
  aspect: string;
}) {
  const inputId = `upl-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="space-y-2">
      {value ? (
        <div className={`relative ${aspect} w-full bg-surface border border-border rounded-lg overflow-hidden`}>
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={onClear}
            className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1 hover:bg-black"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={`flex flex-col items-center justify-center gap-2 ${aspect} w-full bg-surface border border-dashed border-border rounded-lg cursor-pointer hover:border-brand text-xs text-muted-foreground`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Upload className="w-5 h-5" />
              <span>Click to upload</span>
              <span className="text-[10px]">PNG/JPG, max 5MB</span>
            </>
          )}
        </label>
      )}
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ServerPreview({ form }: { form: Record<string, string | number> }) {
  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {form.banner_url ? (
        <img src={String(form.banner_url)} alt="" className="w-full aspect-[3/1] object-cover" />
      ) : (
        <div className="w-full aspect-[3/1] bg-gradient-to-br from-brand/30 to-transparent" />
      )}
      <div className="p-5 flex gap-4">
        {form.logo_url ? (
          <img src={String(form.logo_url)} alt="" className="w-20 h-20 rounded-lg object-cover border border-border" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-background border border-border flex items-center justify-center text-xs text-muted-foreground">
            no logo
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-extrabold text-white">{String(form.current_name) || "Server name"}</h3>
          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
            <span className="px-2 py-0.5 bg-background rounded">{form.chronicle}</span>
            <span className="px-2 py-0.5 bg-background rounded">x{form.rates}</span>
            <span className="px-2 py-0.5 bg-background rounded">{form.server_type}</span>
            {form.country && <span className="px-2 py-0.5 bg-background rounded">{form.country}</span>}
            {form.launch_date && <span className="px-2 py-0.5 bg-background rounded">Launch: {form.launch_date}</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
            {String(form.description) || "Description will appear here."}
          </p>
        </div>
      </div>
    </div>
  );
}
