import { supabase } from "@/integrations/supabase/client";

export const chatPeopleQuery = {
  queryKey: ["internal-chat", "people"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("internal_chat_people");
    if (error) throw error;
    return data ?? [];
  },
};

export const chatsQuery = {
  queryKey: ["internal-chat", "chats"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.from("internal_chats")
      .select("id,kind,name,created_by,updated_at,internal_chat_members(user_id)")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  },
};

export type InternalChat = Awaited<ReturnType<typeof chatsQuery.queryFn>>[number];
export type ChatPerson = Awaited<ReturnType<typeof chatPeopleQuery.queryFn>>[number];

export function chatTitle(chat: InternalChat, people: ChatPerson[], me: string) {
  if (chat.kind === "group") return chat.name ?? "Grupo";
  const peer = chat.internal_chat_members.find((member) => member.user_id !== me);
  return people.find((person) => person.id === peer?.user_id)?.full_name || "Integrante del estudio";
}

export const unreadQuery = {
  queryKey: ["internal-chat", "unread"] as const,
  queryFn: async () => {
    const { data, error } = await supabase.rpc("internal_chat_unread");
    if (error) throw error;
    return Object.fromEntries((data ?? []).map((r) => [r.chat_id, Number(r.unread)])) as Record<string, number>;
  },
};

export const CHAT_EMOJIS = ["😀","😂","😊","😍","🙏","👍","👏","🙌","💪","🎉","✅","❌","⚠️","📌","📎","📞","💬","🔥","❤️","🤝","😅","🤔","😢","☕"];

export const sanitizeFileName = (name: string) => name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-120) || "archivo";
