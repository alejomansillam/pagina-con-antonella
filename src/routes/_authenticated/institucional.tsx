import { createFileRoute } from "@tanstack/react-router";
import { EditableSection } from "@/components/editable-section";

export const Route = createFileRoute("/_authenticated/institucional")({
  head: () => ({
    meta: [
      { title: "Bienvenida, Día 1 y Quién es Quién — Portal del Estudio" },
      { name: "description", content: "Cultura, procesos, agenda del primer día y roles del estudio." },
      { property: "og:title", content: "Bienvenida, Día 1 y Quién es Quién" },
      { property: "og:description", content: "Información institucional del estudio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Institucional,
});

function Institucional() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl">Bienvenida e institucional</h1>
        <p className="mt-2 text-muted-foreground">Cultura, primer día y roles del estudio. Admin y Seniors pueden editar cada bloque.</p>
      </header>
      <EditableSection sectionKey="bienvenida" fallbackTitle="Bienvenida, Cultura y Procesos" />
      <div className="grid gap-6 md:grid-cols-2">
        <EditableSection sectionKey="dia1-agenda" fallbackTitle="Día 1: Agenda" />
        <EditableSection sectionKey="dia1-expectativas" fallbackTitle="Día 1: Expectativas" />
      </div>
      <EditableSection sectionKey="quien-es-quien" fallbackTitle="Quién es Quién" />
    </div>
  );
}
