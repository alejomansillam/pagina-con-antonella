import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AssistantChat } from "@/components/assistant-widget";

export const Route = createFileRoute("/_authenticated/asistente/$threadId")({
  head: () => ({
    meta: [
      { title: "Asistente del portal · Portal del Estudio" },
      { name: "description", content: "Consultá los manuales y protocolos del estudio con el asistente virtual." },
      { property: "og:title", content: "Asistente del portal · Portal del Estudio" },
      { property: "og:description", content: "Consultá los manuales y protocolos del estudio con el asistente virtual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-3 text-xl font-semibold">Asistente del portal</h1>
      <div className="h-[75vh] overflow-hidden rounded-xl border border-border bg-card">
        <AssistantChat
          key={threadId}
          threadId={threadId}
          onSelect={(id) => (id ? navigate({ to: "/asistente/$threadId", params: { threadId: id } }) : navigate({ to: "/dashboard" }))}
        />
      </div>
    </div>
  );
}
