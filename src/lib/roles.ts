import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "senior" | "gestor";

export const myRolesQuery = {
  queryKey: ["my_roles"] as const,
  queryFn: async (): Promise<Role[]> => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return [];
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
    if (error) throw error;
    return (data ?? []).map((r) => r.role as Role);
  },
};

export function canEdit(roles: Role[]) {
  return roles.includes("admin") || roles.includes("senior");
}
