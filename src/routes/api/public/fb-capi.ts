import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";

const PIXEL_ID = "1043916548098606";

function sha256(v?: string | null) {
  if (!v) return undefined;
  return createHash("sha256").update(String(v).trim().toLowerCase()).digest("hex");
}

export const Route = createFileRoute("/api/public/fb-capi")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const accessToken = process.env.FB_CAPI_ACCESS_TOKEN;
        const testCode = process.env.FB_TEST_EVENT_CODE;
        if (!accessToken) {
          return new Response(JSON.stringify({ error: "FB CAPI not configured" }), { status: 200 });
        }

        let body: any = {};
        try { body = await request.json(); } catch {}

        const {
          event_name,
          event_id,
          event_source_url,
          fbp,
          fbc,
          user_agent,
          custom_data,
          email,
          phone,
        } = body || {};

        if (!event_name) {
          return new Response(JSON.stringify({ error: "event_name required" }), { status: 400 });
        }

        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          undefined;

        const user_data: Record<string, any> = {
          client_user_agent: user_agent || request.headers.get("user-agent") || undefined,
          client_ip_address: ip,
        };
        if (fbp) user_data.fbp = fbp;
        if (fbc) user_data.fbc = fbc;
        if (email) user_data.em = [sha256(email)];
        if (phone) user_data.ph = [sha256(phone.replace(/\D/g, ""))];

        const payload: any = {
          data: [
            {
              event_name,
              event_time: Math.floor(Date.now() / 1000),
              event_id,
              event_source_url,
              action_source: "website",
              user_data,
              custom_data: custom_data || {},
            },
          ],
        };
        if (testCode) payload.test_event_code = testCode;

        try {
          const res = await fetch(
            `https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${accessToken}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );
          const json = await res.json().catch(() => ({}));
          return new Response(JSON.stringify(json), {
            status: res.ok ? 200 : 502,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message || "capi failed" }), { status: 502 });
        }
      },
    },
  },
});
