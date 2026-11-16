import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Variables de entorno (Vercel → Settings → Environment Variables).
// En el navegador se usan las VITE_*; en el servidor, las sin prefijo.
export function supabaseConfig() {
  const url = import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  const key =
    import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY.");
  return { url, key };
}

// Las claves nuevas de Supabase (sb_publishable_…) no son JWT:
// van en el header `apikey` y no como `Authorization: Bearer`.
export function createSupabaseFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
    if (headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

function createSupabaseClient() {
  const { url, key } = supabaseConfig();
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

let instance: ReturnType<typeof createSupabaseClient> | undefined;

// Uso: import { supabase } from "@/integrations/supabase/client";
// Se crea recién la primera vez que se usa.
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    instance ??= createSupabaseClient();
    return Reflect.get(instance, prop, receiver);
  },
});
