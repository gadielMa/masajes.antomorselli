import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient, businessForSlug } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const { id, dni, business_slug } = await req.json();
    if (!id || !/^\d{7,8}$/.test(String(dni))) return json({ error: "Datos inválidos" }, 400);

    const supabase = adminClient();
    const business = await businessForSlug(supabase, business_slug);
    const { data, error } = await supabase.from("bookings")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("business_id", business.id)
      .eq("dni", String(dni))
      .in("status", ["pending", "confirmed"])
      .select("id, status")
      .maybeSingle();

    if (error) throw error;
    if (!data) return json({ error: "Turno no encontrado" }, 404);
    return json({ booking: data });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
