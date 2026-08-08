import { corsHeaders, handleOptions, json } from "../_shared/cors.ts";
import { adminClient, slotsForDate } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const date = new URL(req.url).searchParams.get("date");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: "Fecha inválida" }, 400);
    }

    const supabase = adminClient();
    await supabase.rpc("cleanup_expired_bookings");
    const { data, error } = await supabase
      .from("bookings")
      .select("booking_time")
      .eq("booking_date", date)
      .in("status", ["pending", "confirmed"]);

    if (error) throw error;
    const occupied = new Set((data ?? []).map((row) => row.booking_time.slice(0, 5)));
    const available = slotsForDate(date).filter((slot) => !occupied.has(slot));

    return new Response(JSON.stringify({ date, available }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
