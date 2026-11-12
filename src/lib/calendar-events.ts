export type EventDraft = {
  event_date: string;
  end_date?: string | null;
  start_time?: string | null;
  title: string;
  note?: string | null;
};

export const fmtDate = (s: string) => s.split("-").reverse().join("/");
export const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : "");

/** Devuelve un mensaje de error o null si el evento es válido. */
export function validateEvent(e: EventDraft): string | null {
  if (!e.title.trim()) return "Completá el título";
  if (!e.event_date) return "Completá la fecha";
  if (e.end_date && e.end_date < e.event_date) return "La fecha de fin no puede ser anterior al inicio";
  return null;
}

/** Arma título y detalle del aviso vinculado a un evento. */
export function announcementFromEvent(e: EventDraft) {
  const date = e.end_date && e.end_date !== e.event_date
    ? `Fecha: ${fmtDate(e.event_date)} al ${fmtDate(e.end_date)}`
    : `Fecha: ${fmtDate(e.event_date)}`;
  const lines = [date];
  if (e.start_time) lines.push(`Hora: ${fmtTime(e.start_time)} hs`);
  if (e.note?.trim()) lines.push(e.note.trim());
  return { title: `Evento: ${e.title.trim()}`, body: lines.join("\n"), level: "info" as const };
}
