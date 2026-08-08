import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // Mercado Pago debe verificarse consultando su API desde aquí.
  // No se confirma una reserva solo porque el navegador vuelva con ?status=approved.
  try {
    const payload = await req.json();
    const paymentId = payload?.data?.id || payload?.id;
    if (!paymentId) return json({ received: true });

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN" }, 500);

    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!paymentResponse.ok) return json({ error: "No se pudo verificar el pago" }, 502);
    const payment = await paymentResponse.json();
    if (payment.status !== "approved") return json({ received: true, status: payment.status });

    const externalReference = payment.external_reference;
    if (!externalReference) return json({ received: true, warning: "Sin external_reference" });

    const supabase = adminClient();
    const { error } = await supabase.from("bookings")
      .update({ status: "confirmed", payment_id: String(paymentId) })
      .eq("id", externalReference)
      .eq("status", "pending");
    if (error) throw error;

    return json({ received: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
