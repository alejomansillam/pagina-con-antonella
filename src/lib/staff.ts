import { supabase } from "@/integrations/supabase/client";

export type StaffEntry = {
  id: string;
  user_id: string | null;
  full_name: string;
  nickname: string | null;
  gm_username: string | null;
  microsip_ext: string | null;
  whatsapp: string | null;
  whatsapp_alt: string | null;
  internal_email: string | null;
  role_title: string | null;
  team: string | null;
  kind: string;
  birth_day: number | null;
  birth_month: number | null;
  position: number;
};

export const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const STAFF_COLUMNS =
  "id, user_id, full_name, nickname, gm_username, microsip_ext, whatsapp, whatsapp_alt, internal_email, role_title, team, kind, birth_day, birth_month, position";

export const staffDirectoryQuery = {
  queryKey: ["staff_directory"] as const,
  queryFn: async (): Promise<StaffEntry[]> => {
    const { data, error } = await supabase
      .from("staff_directory")
      .select(STAFF_COLUMNS)
      .order("position")
      .order("full_name");
    if (error) throw error;
    return (data ?? []) as StaffEntry[];
  },
};

export type Ficha = {
  id: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  gm_username: string | null;
  internal_email: string | null;
  whatsapp: string | null;
  microsip_ext: string | null;
  birth_day: number | null;
  birth_month: number | null;
  department: string | null;
  role_title: string | null;
};

export const fichaQuery = {
  queryKey: ["ficha"] as const,
  queryFn: async (): Promise<Ficha | null> => {
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return null;
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, first_name, last_name, gm_username, internal_email, whatsapp, microsip_ext, birth_day, birth_month, department, role_title",
      )
      .eq("id", uid)
      .maybeSingle();
    if (error) throw error;
    return (data ?? null) as Ficha | null;
  },
};

export async function saveFicha(values: Partial<Ficha>) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sesión no disponible");

  const full_name = `${values.first_name ?? ""} ${values.last_name ?? ""}`.trim();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: values.first_name ?? null,
      last_name: values.last_name ?? null,
      gm_username: values.gm_username ?? null,
      internal_email: values.internal_email ?? null,
      whatsapp: values.whatsapp ?? null,
      microsip_ext: values.microsip_ext ?? null,
      birth_day: values.birth_day ?? null,
      birth_month: values.birth_month ?? null,
      role_title: values.role_title ?? null,
      ...(full_name ? { full_name } : {}),
    })
    .eq("id", uid);
  if (error) throw error;
}

/** Vincula la ficha del usuario con su registro del directorio y sincroniza sus datos. */
export async function syncDirectoryEntry(entryId: string, values: Partial<StaffEntry>) {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) throw new Error("Sesión no disponible");
  const { error } = await supabase
    .from("staff_directory")
    .update({ ...values, user_id: uid })
    .eq("id", entryId);
  if (error) throw error;
}

export function waLink(number: string) {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/549${digits}`;
}

export function prettyPhone(number: string) {
  const d = number.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return number;
}

export type Birthday = {
  id: string;
  name: string;
  day: number;
  month: number;
  role: string | null;
  whatsapp?: string | null;
};

export function collectBirthdays(staff: StaffEntry[], extra: Ficha | null): Birthday[] {
  const list: Birthday[] = staff
    .filter((s) => s.birth_day && s.birth_month)
    .map((s) => ({
      id: s.id,
      name: s.full_name,
      day: s.birth_day!,
      month: s.birth_month!,
      role: s.role_title,
      whatsapp: s.whatsapp ?? s.whatsapp_alt,
    }));

  if (extra?.birth_day && extra.birth_month && !list.some((b) => b.name === extra.full_name)) {
    list.push({
      id: extra.id,
      name: extra.full_name || "Mi ficha",
      day: extra.birth_day,
      month: extra.birth_month,
      role: extra.role_title,
      whatsapp: extra.whatsapp,
    });
  }
  return list.sort((a, b) => a.month - b.month || a.day - b.day);
}

/** Días que faltan para el próximo cumpleaños. */
export function daysUntil(b: Birthday, today = new Date()) {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let next = new Date(today.getFullYear(), b.month - 1, b.day);
  if (next.getTime() < base.getTime()) next = new Date(today.getFullYear() + 1, b.month - 1, b.day);
  return Math.round((next.getTime() - base.getTime()) / 86400000);
}


export function upcomingBirthdays(list: Birthday[], today = new Date()) {
  const key = (m: number, d: number) => m * 100 + d;
  const now = key(today.getMonth() + 1, today.getDate());
  const sorted = [...list].sort((a, b) => key(a.month, a.day) - key(b.month, b.day));
  const after = sorted.filter((b) => key(b.month, b.day) >= now);
  const before = sorted.filter((b) => key(b.month, b.day) < now);
  return [...after, ...before];
}

export function isToday(b: Birthday, today = new Date()) {
  return b.day === today.getDate() && b.month === today.getMonth() + 1;
}
