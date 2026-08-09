import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const MONTHLY_LIMIT = 30;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[character] || character));
}

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Se requiere iniciar sesión" }, 401);

    const supabase = adminClient();
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Sesión inválida" }, 401);

    const body = await req.json();
    const businessId = String(body.business_id || "");
    const clientId = String(body.client_id || "");
    const subject = String(body.subject || "").trim();
    const message = String(body.message || "").trim();
    if (!businessId || !clientId || !subject || !message) return json({ error: "El destinatario, asunto y mensaje son obligatorios" }, 400);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    const isPlatformOwner = profile?.role === "platform_owner";
    if (!isPlatformOwner) {
      const { data: membership } = await supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", authData.user.id).maybeSingle();
      if (!membership || !["owner", "admin"].includes(membership.role)) return json({ error: "No tenés acceso a este negocio" }, 403);
    }

    const { data: client, error: clientError } = await supabase.from("clients").select("id, name, email").eq("id", clientId).eq("business_id", businessId).single();
    if (clientError || !client) return json({ error: "Cliente no encontrado" }, 404);
    if (!client.email) return json({ error: "Este cliente no tiene email cargado" }, 400);

    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    const { count, error: countError } = await supabase.from("client_email_sends").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("sent_at", monthStart.toISOString());
    if (countError) throw countError;
    if ((count || 0) >= MONTHLY_LIMIT) return json({ error: "Este negocio alcanzó el límite de 30 emails este mes" }, 429);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "Falta configurar RESEND_API_KEY en Supabase" }, 500);
    const from = Deno.env.get("RESEND_FROM_EMAIL") || "Induliru <hola@induliru.com>";
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [client.email], subject, text: message, html: `<p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>` }),
    });
    const resendResult = await resendResponse.json().catch(() => ({}));
    if (!resendResponse.ok) return json({ error: resendResult.message || "Resend no pudo enviar el email" }, 502);

    const { error: logError } = await supabase.from("client_email_sends").insert({ business_id: businessId, client_id: client.id, recipient: client.email, subject, sent_by: authData.user.id });
    if (logError) throw logError;
    return json({ ok: true, remaining: MONTHLY_LIMIT - (count || 0) - 1 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
