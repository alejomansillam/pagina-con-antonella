import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Planilla "VACACIONES 2027" en Google Drive. Debe estar compartida como
// "Cualquier persona con el enlace puede ver" para poder leerla como CSV.
const SHEET_ID = process.env["VACATIONS_SHEET_ID"] || "14-YWkYgvApxq3Xd7g6sEYEYfrkKwrwpg5zwhXQJPY0Y";
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); rows.push(row); row = []; cur = "";
    } else cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

const pad = (n: number) => String(n).padStart(2, "0");
function parseDate(s: string, fallbackYear?: number): { iso: string; y: number } | null {
  const m = s.trim().match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (!m) return null;
  const d = +m[1]!, mo = +m[2]!;
  let y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : fallbackYear ?? (mo >= 7 ? 2026 : 2027);
  if (!m[3] && fallbackYear && mo === 12 && fallbackYear === 2027) y = 2026;
  return { iso: `${y}-${pad(mo)}-${pad(d)}`, y };
}

export const syncVacationsFromDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("can_edit", { _user_id: context.userId });
    if (!ok) throw new Error("Solo Admin o Seniors pueden sincronizar.");
    const res = await fetch(CSV_URL, { redirect: "follow" });
    const text = res.ok ? await res.text() : "";
    if (!res.ok || text.trimStart().startsWith("<")) {
      throw new Error("No se pudo leer la planilla de vacaciones. Revisá que esté compartida con el enlace.");
    }
    const rows = parseCsv(text).slice(1);

    const out: Array<{ person_name: string; team: string | null; days: number | null; start_date: string; end_date: string; status: string; note: string | null; source: string }> = [];
    let pending = 0;
    for (const r of rows) {
      const name = (r[0] ?? "").replace(/\s+/g, " ").trim();
      if (!name) continue;
      const team = (r[1] ?? "").trim() || null;
      const days = parseInt(r[2] ?? "") || null;
      const starts = (r[3] ?? "").split(" - ").map((x) => x.trim()).filter(Boolean);
      const ends = (r[4] ?? "").split(" - ").map((x) => x.trim()).filter(Boolean);
      const note = [r[5], r[6]].map((x) => (x ?? "").trim()).filter(Boolean).join(" · ") || null;
      if (!starts.length) { pending++; continue; }
      starts.forEach((s, i) => {
        const endRaw = ends[i] ?? ends[0] ?? s;
        const e = parseDate(endRaw);
        const st = parseDate(s, e?.y);
        if (!st || !e) return;
        out.push({ person_name: name, team, days, start_date: st.iso, end_date: e.iso < st.iso ? st.iso : e.iso, status: "solicitada", note, source: "drive" });
      });
    }

    const del = await context.supabase.from("vacations").delete().eq("source", "drive");
    if (del.error) throw new Error(del.error.message);
    if (out.length) {
      const { error } = await context.supabase.from("vacations").insert(out.map((o) => ({ ...o, updated_by: context.userId })));
      if (error) throw new Error(error.message);
    }
    return { loaded: out.length, pending };
  });
