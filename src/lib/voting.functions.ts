import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

const COOLDOWN_MS = 12 * 60 * 60 * 1000;

function getIp() {
  return (
    getRequestIP({ xForwardedFor: true }) ||
    getRequestHeader("x-real-ip") ||
    getRequestHeader("cf-connecting-ip") ||
    "0.0.0.0"
  );
}

export const castVote = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    server_id: z.string().uuid(),
    fingerprint: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ip = getIp();

    const { data: server } = await supabaseAdmin
      .from("servers").select("id, status").eq("id", data.server_id).maybeSingle();
    if (!server || server.status !== "approved") {
      throw new Error("Server not available for voting");
    }

    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("votes")
      .select("id, created_at")
      .eq("server_id", data.server_id)
      .eq("ip_address", ip)
      .gte("created_at", cutoff)
      .limit(1);

    if (recent && recent.length > 0) {
      const nextAt = new Date(new Date(recent[0].created_at).getTime() + COOLDOWN_MS);
      throw new Error(`You can vote again at ${nextAt.toLocaleString()}`);
    }

    const { error } = await supabaseAdmin.from("votes").insert({
      server_id: data.server_id,
      ip_address: ip,
      device_fingerprint: data.fingerprint ?? null,
      vote_year: new Date().getFullYear(),
    });
    if (error) throw new Error(error.message);

    return { ok: true, next_vote_at: new Date(Date.now() + COOLDOWN_MS).toISOString() };
  });

export const getVoteCooldown = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ server_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ip = getIp();
    const cutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("votes")
      .select("created_at")
      .eq("server_id", data.server_id)
      .eq("ip_address", ip)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recent && recent.length > 0) {
      const nextAt = new Date(new Date(recent[0].created_at).getTime() + COOLDOWN_MS).toISOString();
      return { can_vote: false, next_vote_at: nextAt };
    }
    return { can_vote: true, next_vote_at: null as string | null };
  });
