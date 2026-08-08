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

export const WORKING_DAYS = [1, 2, 3, 4, 5];
export const WORKING_HOURS = { start: 14, end: 17 };

export function isValidSlot(date: string, time: string) {
  const value = new Date(`${date}T${time}:00-03:00`);
  const day = value.getUTCDay();
  const hour = Number(time.slice(0, 2));
  return WORKING_DAYS.includes(day) && hour >= WORKING_HOURS.start && hour < WORKING_HOURS.end;
}

export function slotsForDate(date: string) {
  const day = new Date(`${date}T12:00:00-03:00`).getUTCDay();
  return WORKING_DAYS.includes(day) ? ["14:00", "15:00", "16:00"] : [];
}
