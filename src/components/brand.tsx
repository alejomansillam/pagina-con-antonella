import { Link } from "@tanstack/react-router";

import logoAsset from "@/assets/mansilla-garzon-logo.png.asset.json";
import { cn } from "@/lib/utils";

export const LOGO_URL = logoAsset.url;
export const PORTAL_NAME = "Portal del Estudio";
export const FIRM_NAME = "Mansilla Garzón & Asoc.";
export const PORTAL_TITLE = `${PORTAL_NAME} · ${FIRM_NAME}`;

export function BrandMark({ className }: { className?: string }) {
  return (
    <img
      src={LOGO_URL}
      alt="Mansilla Garzón & asociados"
      className={cn("h-10 w-auto rounded bg-card object-contain p-1", className)}
    />
  );
}

export function BrandLock({
  to = "/",
  className,
  tone = "default",
}: {
  to?: "/" | "/dashboard";
  className?: string;
  tone?: "default" | "inverted";
}) {
  return (
    <Link to={to} className={cn("flex items-center gap-3", className)}>
      <BrandMark />
      <span className="leading-tight">
        <span
          className={cn(
            "block font-display text-[0.95rem] font-bold",
            tone === "inverted" ? "text-ink-foreground" : "text-foreground",
          )}
        >
          {FIRM_NAME}
        </span>
        <span
          className={cn(
            "block text-[0.7rem] uppercase tracking-[0.14em]",
            tone === "inverted" ? "text-ink-foreground/60" : "text-muted-foreground",
          )}
        >
          Portal del Estudio
        </span>
      </span>
    </Link>
  );
}

export const PADRONES = [
  {
    code: "N1",
    label: "Mes 1 · Prioridad máxima",
    detail: "Ingreso nuevo. Cancelación en 1 pago o hasta 3 cuotas.",
    className: "bg-n1 text-n1-foreground",
  },
  {
    code: "N2",
    label: "Mes 2 · Seguimiento",
    detail: "Seguimiento intensivo y planes intermedios de regularización.",
    className: "bg-n2 text-n2-foreground",
  },
  {
    code: "N3",
    label: "Mes 3 · Cierre y rescate",
    detail: "Mayor flexibilidad: más cuotas, quitas o descuentos autorizados.",
    className: "bg-n3 text-n3-foreground",
  },
] as const;
