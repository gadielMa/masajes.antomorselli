import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient, businessForSlug, isValidSlot } from "../_shared/supabase.ts";

const PRICES: Record<string, number> = {
  descontracturante: 30000,
  relajante: 25000,
  deportivo: 35000,
};

const SERVICE_NAMES: Record<string, string> = {
  descontracturante: "Masaje Descontracturante",
  relajante: "Masaje Relajante",
  deportivo: "Masaje Deportivo",
};

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const body = await req.json();
    const { name, dni, service, date, time, business_slug } = body;
    const price = PRICES[service];

    if (!name || !/^\d{7,8}$/.test(String(dni)) || !price || !date || !time) {
      return json({ error: "Datos de reserva incompletos o inválidos" }, 400);
    }
    const supabase = adminClient();
    const business = await businessForSlug(supabase, business_slug);
    if (!(await isValidSlot(supabase, date, time, business.id))) {
      return json({ error: "Ese horario no está disponible para reservas" }, 400);
    }

    const accessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!accessToken) return json({ error: "Falta MERCADOPAGO_ACCESS_TOKEN" }, 500);

    await supabase.rpc("cleanup_expired_bookings");

    const { data: booking, error: bookingError } = await supabase.from("bookings").insert({
      business_id: business.id,
      name: String(name).trim(),
      dni: String(dni),
      service,
      booking_date: date,
      booking_time: `${time}:00`,
      status: "pending",
    }).select("id, name, dni, service, booking_date, booking_time, status, expires_at").single();

    if (bookingError) {
      if (bookingError.code === "23505") return json({ error: "Ese horario acaba de ser reservado" }, 409);
      throw bookingError;
    }

    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://gadielma.github.io/masajes.antomorselli";
    const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`;
    const preferenceResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        items: [{
          id: service,
          title: SERVICE_NAMES[service],
          quantity: 1,
          currency_id: "ARS",
          unit_price: price,
        }],
        external_reference: booking.id,
        back_urls: {
          success: `${siteUrl}/exito.html?payment_status=approved&source=mercadopago`,
          failure: `${siteUrl}/?payment_status=failure&source=mercadopago`,
          pending: `${siteUrl}/?payment_status=pending&source=mercadopago`,
        },
        auto_return: "approved",
        notification_url: webhookUrl,
      }),
    });

    const preference = await preferenceResponse.json();
    if (!preferenceResponse.ok) {
      console.error("Mercado Pago preference error", preference);
      return json({ error: "No se pudo crear la preferencia de pago" }, 502);
    }

    await supabase.from("bookings")
      .update({ payment_id: preference.id })
      .eq("id", booking.id);

    return json({
      booking,
      preference_id: preference.id,
      init_point: preference.init_point || preference.sandbox_init_point,
    }, 201);
  } catch (error) {
    console.error("create-preference error", error);
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
