import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";
import { createSupabaseFetch, supabaseConfig } from "./client";

// Para funciones de servidor que requieren usuario logueado.
// Crea un cliente de Supabase con el token del usuario (respeta las reglas de acceso).
export const requireSupabaseAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const { url, key } = supabaseConfig();
    const token = getRequest()?.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token || token.split(".").length !== 3) throw new Error("No autorizado.");

    const supabase = createClient<Database>(url, key, {
      global: { fetch: createSupabaseFetch(key), headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.auth.getClaims(token);
    const userId = data?.claims?.sub;
    if (error || !userId) throw new Error("No autorizado.");

    return next({ context: { supabase, userId, claims: data.claims } });
  },
);
