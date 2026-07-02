import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const CONTACT_TO_EMAIL = Deno.env.get("CONTACT_TO_EMAIL") ?? "dvalax.pro@gmail.com";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") ?? "onboarding@resend.dev";
const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ??
  "https://dimitrivalax.github.io,http://localhost:4000,http://127.0.0.1:4000"
).split(",");

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  website?: string;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin =
    origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function validate(body: ContactPayload): string | null {
  if (!body.name?.trim()) return "Le nom est requis.";
  if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return "Une adresse email valide est requise.";
  }
  if (!body.phone?.trim()) return "Le téléphone est requis.";
  if (!body.message?.trim()) return "Le message est requis.";
  if (body.message.length > 5000) return "Le message est trop long.";
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const headers = {
    ...corsHeaders(origin),
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  try {
    const body: ContactPayload = await req.json();

    if (body.website?.trim()) {
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
    }

    const validationError = validate(body);
    if (validationError) {
      return new Response(JSON.stringify({ error: validationError }), {
        status: 400,
        headers,
      });
    }

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers,
      });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        reply_to: body.email,
        subject: `Contact portfolio : ${body.name}`,
        html: `
          <h2>Nouveau message depuis le portfolio</h2>
          <p><strong>Nom :</strong> ${escapeHtml(body.name!)}</p>
          <p><strong>Email :</strong> ${escapeHtml(body.email!)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(body.phone!)}</p>
          <p><strong>Message :</strong></p>
          <p>${escapeHtml(body.message!).replace(/\n/g, "<br>")}</p>
        `,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error:", errText);

      let clientMessage = "Failed to send email";
      try {
        const errJson = JSON.parse(errText);
        if (errJson.message?.includes("domain is not verified")) {
          clientMessage =
            "Le domaine d'envoi n'est pas vérifié sur Resend. Ajoutez et validez votre domaine dans le dashboard Resend.";
        } else if (errJson.message) {
          clientMessage = errJson.message;
        }
      } catch {
        // keep generic message
      }

      return new Response(JSON.stringify({ error: clientMessage }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers,
    });
  }
});
