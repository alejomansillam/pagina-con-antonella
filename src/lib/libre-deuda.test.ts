import { describe, it } from "node:test";
import { throws, doesNotThrow } from "node:assert";
import { validateLibreDeuda } from "./libre-deuda";

describe("Datos variables del libre deuda", () => {
  const data = { nombre: "Laime Andres Hipolito", dni: "27722634", fecha: "2026-10-21", pago: "2026-10-15" };
  it("acepta los datos y fechas del modelo oficial", () => doesNotThrow(() => validateLibreDeuda(data)));
  it("requiere identificación para nuevas constancias", () => throws(() => validateLibreDeuda({ ...data, dni: "" })));
  it("rechaza cancelación posterior a la emisión", () => throws(() => validateLibreDeuda({ ...data, pago: "2026-10-22" })));
  it("rechaza fechas inexistentes", () => throws(() => validateLibreDeuda({ ...data, pago: "2026-02-30" })));
});