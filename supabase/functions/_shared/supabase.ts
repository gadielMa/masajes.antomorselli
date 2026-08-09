import { createClient } from "npm:@supabase/supabase-js@2";

export function adminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  let serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

  // Supabase expone las nuevas claves secretas como un JSON con nombres.
  // La clave creada por defecto se encuentra en SUPABASE_SECRET_KEYS.default.
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS");
  console.log("Supabase admin config:", {
    hasUrl: Boolean(url),
    hasSecretKeysJson: Boolean(secretKeysJson),
    hasCustomSecret: Boolean(serviceRoleKey),
  });
  if (secretKeysJson) {
    try {
      const secretKeys = JSON.parse(secretKeysJson);
      console.log("Supabase secret key names:", Object.keys(secretKeys));
      serviceRoleKey = secretKeys.default || serviceRoleKey;
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS no contiene un JSON válido");
    }
  }

  if (!url || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o una secret key de Supabase");
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function businessForSlug(
  supabase: ReturnType<typeof adminClient>,
  slug = "antonella-morselli",
) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, slug, status")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

  if (error || !data) throw new Error("Negocio no encontrado");
  return data;
}

type BusinessHours = {
  start_time: string;
  end_time: string;
  slot_minutes: number;
  active: boolean;
};

function weekdayForDate(date: string) {
  return new Date(`${date}T12:00:00-03:00`).getUTCDay();
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

async function hoursForDate(
  supabase: ReturnType<typeof adminClient>,
  date: string,
  businessId?: string,
) {
  let query = supabase
    .from("business_hours")
    .select("start_time, end_time, slot_minutes, active")
    .eq("weekday", weekdayForDate(date));

  if (businessId) query = query.eq("business_id", businessId);
  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  return data as BusinessHours | null;
}

export async function slotsForDate(
  supabase: ReturnType<typeof adminClient>,
  date: string,
  businessId?: string,
) {
  const hours = await hoursForDate(supabase, date, businessId);
  if (!hours || !hours.active) return [];

  const start = timeToMinutes(hours.start_time);
  const end = timeToMinutes(hours.end_time);
  const slots: string[] = [];

  for (let minute = start; minute + hours.slot_minutes <= end; minute += hours.slot_minutes) {
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`);
  }
  return slots;
}

export async function isValidSlot(
  supabase: ReturnType<typeof adminClient>,
  date: string,
  time: string,
  businessId?: string,
) {
  const slots = await slotsForDate(supabase, date, businessId);
  return slots.includes(time.slice(0, 5));
}
