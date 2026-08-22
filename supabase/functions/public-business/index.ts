import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

// Expone únicamente la información que un cliente necesita para reservar.
Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;

  try {
    const slug = new URL(req.url).searchParams.get("slug") || "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return json({ error: "Profesional inválido" }, 400);

    const { data, error } = await adminClient()
      .from("businesses")
      .select("name, slug, public_profile")
      .eq("slug", slug)
      .eq("status", "active")
      .single();
    if (error || !data) return json({ error: "Profesional no encontrado" }, 404);

    return json({ business: { name: data.name, slug: data.slug, ...(data.public_profile || {}) } });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
