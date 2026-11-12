import { Keyboard } from "lucide-react";

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-6 items-center justify-center rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[11px] font-semibold text-secondary-foreground">
      {children}
    </kbd>
  );
}

const TIPS: { keys: string[]; text: string }[] = [
  { keys: ["Tab", "Enter"], text: "Recorré las plantillas con Tab y copiá la seleccionada con Enter o Espacio." },
  { keys: ["Ctrl", "C"], text: "Con una plantilla seleccionada, Ctrl + C también la copia entera." },
  { keys: ["Ctrl", "V"], text: "Pegá el mensaje en WhatsApp, Chattigo o en la nota de Gestión de Mora." },
  { keys: ["Ctrl", "K"], text: "Abrí el buscador del portal desde cualquier pantalla." },
  { keys: ["Shift", "Enter"], text: "En WhatsApp Web, agrega un salto de línea sin enviar el mensaje." },
  { keys: ["Ctrl", "Shift", "V"], text: "Pega sin formato: útil para la carga en Gestión de Mora." },
  { keys: ["Alt", "Tab"], text: "Pasá rápido entre el portal, Naranja X y Gestión de Mora." },
];

export function ShortcutsGuide() {
  return (
    <details className="surface p-5">
      <summary className="flex cursor-pointer items-center gap-2 font-semibold">
        <Keyboard className="size-4 text-primary" aria-hidden /> Atajos de teclado para trabajar más rápido
      </summary>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {TIPS.map((t) => (
          <li key={t.text} className="flex items-start gap-3 text-sm">
            <span className="flex shrink-0 items-center gap-1">
              {t.keys.map((k, i) => (
                <span key={k} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground">+</span>}
                  <Kbd>{k}</Kbd>
                </span>
              ))}
            </span>
            <span className="text-muted-foreground">{t.text}</span>
          </li>
        ))}
      </ul>
    </details>
  );
}
