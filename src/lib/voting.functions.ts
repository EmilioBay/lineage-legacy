import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

export const castVote = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({
    server_id: z.string().uuid(),
    fingerprint: z.string().max(200).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const ip =
      getRequestIP({ xForwardedFor: true }) ||
      getRequestHeader("x-real-ip") ||
      getRequestHeader("cf-connecting-ip") ||
      "0.0.0.0";

    // Confirm server is approved
    const { data: server } = await supabaseAdmin
      .from("servers").select("id, status").eq("id", data.server_id).maybeSingle();
    if (!server || server.status !== "approved") {
      throw new Error("Server not available for voting");
    }

    // 12h rate limit by IP + server
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("votes")
      .select("id, created_at")
      .eq("server_id", data.server_id)
      .eq("ip_address", ip)
      .gte("created_at", twelveHoursAgo)
      .limit(1);

    if (recent && recent.length > 0) {
      const nextAt = new Date(new Date(recent[0].created_at).getTime() + 12 * 60 * 60 * 1000);
      throw new Error(`You can vote again at ${nextAt.toLocaleString()}`);
    }

    const { error } = await supabaseAdmin.from("votes").insert({
      server_id: data.server_id,
      ip_address: ip,
      device_fingerprint: data.fingerprint ?? null,
      vote_year: new Date().getFullYear(),
    });
    if (error) throw new Error(error.message);

    return { ok: true };
  });
