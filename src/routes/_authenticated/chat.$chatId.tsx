import { createFileRoute } from "@tanstack/react-router";
import { InternalChatPanel } from "@/components/internal-chat-panel";

export const Route = createFileRoute("/_authenticated/chat/$chatId")({
  head: () => ({ meta: [
    { title: "Conversación del equipo — Mansilla Garzón & Asoc." },
    { name: "description", content: "Conversación privada del chat interno del estudio." },
    { property: "og:title", content: "Conversación del equipo — Mansilla Garzón & Asoc." },
    { property: "og:description", content: "Mensajes privados entre integrantes del estudio." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConversationPage,
});

function ConversationPage() {
  const { user } = Route.useRouteContext();
  const { chatId } = Route.useParams();
  return <InternalChatPanel me={user.id} chatId={chatId} />;
}