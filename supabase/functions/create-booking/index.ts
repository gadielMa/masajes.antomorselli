import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient, isValidSlot } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const body = await req.json();
    const { name, dni, service, date, time, payment_id } = body;

    if (!name || !/^\d{7,8}$/.test(String(dni)) || !service || !date || !time) {
      return json({ error: "Datos de reserva incompletos o inválidos" }, 400);
    }
    if (!isValidSlot(date, time)) {
      return json({ error: "Ese horario no está disponible para reservas" }, 400);
    }

    const supabase = adminClient();
    await supabase.rpc("cleanup_expired_bookings");
    const { data, error } = await supabase.from("bookings").insert({
      name: String(name).trim(),
      dni: String(dni),
      service,
      booking_date: date,
      booking_time: `${time}:00`,
      payment_id: payment_id || null,
      status: "pending",
    }).select("id, name, dni, service, booking_date, booking_time, status, expires_at").single();

    if (error) {
      if (error.code === "23505") return json({ error: "Ese horario acaba de ser reservado" }, 409);
      throw error;
    }
    return json({ booking: data }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
