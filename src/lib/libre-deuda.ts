import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import base from "@/assets/libre-deuda-base.pdf.asset.json";

export type LibreDeudaData = { nombre: string; dni: string; fecha: string; pago: string };

export function validateLibreDeuda(data: LibreDeudaData) {
  if (!data.nombre.trim() || !/^\d{7,9}$/.test(data.dni)) throw new Error("Ingresá nombre y DNI válido, sin puntos.");
  for (const date of [data.fecha, data.pago]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
      throw new Error("Completá ambas fechas válidas.");
    }
  }
  if (data.pago > data.fecha) throw new Error("La cancelación no puede ser posterior a la emisión.");
}

export async function generateLibreDeuda(data: LibreDeudaData) {
  validateLibreDeuda(data);
  const response = await fetch(base.url);
  if (!response.ok) throw new Error("No se pudo cargar el modelo oficial.");
  const doc = await PDFDocument.load(await response.arrayBuffer());
  const page = doc.getPages()[0];
  if (!page) throw new Error("Modelo oficial incompleto.");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const height = page.getHeight();
  const date = new Date(data.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
  const heading = `Cordoba, ${date}`;
  page.drawText(heading, { x: 539.66266 - font.widthOfTextAtSize(heading, 10), y: height - 73.7008, size: 10, font, color: rgb(0.35, 0.35, 0.35) });
  const [year, month, day] = data.pago.split("-");
  const text = `Por medio de la presente informamos que (DU ${data.dni}) ${data.nombre.trim()} pago la totalidad de su deuda con Tarjeta Naranja S.A.U. el dia ${day}/${month}/${year}.`;
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, 11) > 482.97) {
      if (!line || font.widthOfTextAtSize(word, 11) > 482.97) throw new Error("El nombre es demasiado largo para el formato oficial.");
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  if (lines.length > 3) throw new Error("El nombre es demasiado largo para el formato oficial.");
  lines.forEach((value, index) => page.drawText(value, { x: 56.69291, y: height - 187.08661 - index * 12.65002, size: 11, font }));
  doc.setTitle("Libre deuda");
  doc.setAuthor("Tarjeta Naranja S.A.U.");
  return doc.save();
}