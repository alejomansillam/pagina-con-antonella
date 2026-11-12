import { createFileRoute } from "@tanstack/react-router";
import { InternalChatPanel } from "@/components/internal-chat-panel";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({ meta: [
    { title: "Chat interno — Mansilla Garzón & Asoc." },
    { name: "description", content: "Conversaciones privadas y grupos del equipo del estudio." },
    { property: "og:title", content: "Chat interno — Mansilla Garzón & Asoc." },
    { property: "og:description", content: "Mensajes y grupos internos del equipo." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ChatPage,
});

function ChatPage() {
  const { user } = Route.useRouteContext();
  return <InternalChatPanel me={user.id} />;
}