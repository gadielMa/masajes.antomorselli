import { handleOptions, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/supabase.ts";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

Deno.serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabase = adminClient();
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Se requiere iniciar sesión" }, 401);

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Sesión inválida" }, 401);

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (profile?.role !== "platform_owner") {
      return json({ error: "No tenés permisos para crear negocios" }, 403);
    }

    const body = await req.json();
    const fullName = String(body.full_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const businessName = String(body.business_name || "").trim();
    const slug = String(body.slug || "").trim().toLowerCase();

    if (!fullName || fullName.length < 2 || !businessName || businessName.length < 2) {
      return json({ error: "Nombre y negocio son obligatorios" }, 400);
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: "Email inválido" }, 400);
    if (password.length < 8) return json({ error: "La contraseña debe tener al menos 8 caracteres" }, 400);
    if (!SLUG_PATTERN.test(slug)) return json({ error: "Slug inválido" }, 400);

    const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (userError || !newUser.user) {
      return json({ error: userError?.message || "No se pudo crear el usuario" }, 409);
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .insert({ name: businessName, slug })
      .select("id, name, slug, status")
      .single();
    if (businessError || !business) {
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return json({ error: businessError?.message || "No se pudo crear el negocio" }, 409);
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, role: "admin" })
      .eq("id", newUser.user.id);
    const { error: memberError } = await supabase
      .from("business_members")
      .insert({ business_id: business.id, user_id: newUser.user.id, role: "owner" });

    if (profileError || memberError) {
      await supabase.from("businesses").delete().eq("id", business.id);
      await supabase.auth.admin.deleteUser(newUser.user.id);
      return json({ error: "No se pudo completar la asignación del administrador" }, 500);
    }

    const { error: hoursError } = await supabase.from("business_hours").insert(
      [1, 2, 3, 4, 5].map((weekday) => ({
        business_id: business.id,
        weekday,
        start_time: "14:00",
        end_time: "17:00",
        slot_minutes: 60,
        active: true,
        updated_by: newUser.user.id,
      })),
    );
    if (hoursError) return json({ error: "Negocio creado, pero no se pudieron crear los horarios" }, 500);

    return json({
      business,
      admin: { id: newUser.user.id, email, full_name: fullName },
    }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});
