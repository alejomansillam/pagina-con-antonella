import { createFileRoute, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { BrandMark, PORTAL_TITLE } from "@/components/brand";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: PORTAL_TITLE },
      {
        name: "description",
        content:
          "Portal operativo interno de Mansilla Garzón & Asoc.: padrones N1/N2/N3, plantillas de gestión, campañas de Chattigo, equipos, agenda y capacitación.",
      },
      { property: "og:title", content: PORTAL_TITLE },
      {
        property: "og:description",
        content:
          "Acceso interno del estudio: padrones, plantillas, campañas de Chattigo, equipos y capacitación.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    throw redirect({ to: data.session ? "/dashboard" : "/auth", replace: true });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink text-ink-foreground">
      <div className="flex flex-col items-center gap-4">
        <BrandMark className="h-14" />
        <Loader2 className="size-5 animate-spin" aria-hidden />
      </div>
    </div>
  );
}
