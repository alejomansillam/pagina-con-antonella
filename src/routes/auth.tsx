import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, MailCheck } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLock } from "@/components/brand";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ingresar — Portal del Estudio · Mansilla Garzón & Asoc." },
      {
        name: "description",
        content:
          "Acceso para gestores del estudio: manuales operativos, hub de sistemas y checklist de capacitación.",
      },
      {
        property: "og:title",
        content: "Ingresar — Portal del Estudio · Mansilla Garzón & Asoc.",
      },
      {
        property: "og:description",
        content: "Accedé a los manuales operativos, tus guardados y tu checklist de lectura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});


const FIRM_DOMAIN = "@mansillayasoc.com.ar";

function isFirmEmail(value: string) {
  return value.trim().toLowerCase().endsWith(FIRM_DOMAIN);
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isFirmEmail(email)) {
      toast.error(`Usá tu correo del estudio (${FIRM_DOMAIN})`);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmail(true);
          return;
        }
        navigate({ to: "/dashboard", replace: true });
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Algo salió mal";
      toast.error(
        message.toLowerCase().includes("invalid login")
          ? "Correo o contraseña incorrectos."
          : message,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("No pudimos iniciar sesión con Google. Intenta de nuevo.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-12 text-ink-foreground lg:flex">
        <BrandLock tone="inverted" />
        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight">
            Todo lo que necesitas saber, en el orden en que lo necesitas.
          </h1>
          <p className="mt-4 text-ink-foreground/70">
            Bienvenida, Cultura, Procesos Operativos, Herramientas Clave y FAQs: cinco secciones con
            objetivos claros y una checklist de lectura que sigue tu progreso.
          </p>
        </div>
        <p className="text-sm text-ink-foreground/50">Portal interno de onboarding y capacitación</p>
      </div>

      <div className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          {checkEmail ? (
            <div className="text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <MailCheck className="size-6" aria-hidden />
              </span>
              <h2 className="mt-5 font-display text-2xl">Revisa tu correo</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enviamos un enlace de confirmación a <strong>{email}</strong>. Ábrelo para activar tu
                cuenta y volver al portal.
              </p>
              <Button variant="outline" className="mt-6" onClick={() => setCheckEmail(false)}>
                Volver
              </Button>
            </div>
          ) : (
            <>
              <div className="lg:hidden">
                <BrandLock />
              </div>
              <h2 className="mt-6 font-display text-3xl lg:mt-0">Ingresar al portal</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Acceso exclusivo para el equipo de Mansilla Garzón &amp; Asoc.
              </p>

              <Button
                size="lg"
                className="mt-6 h-auto w-full whitespace-normal py-3 text-base"
                onClick={handleGoogle}
                disabled={loading}
              >
                {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Ingresar con Google ({FIRM_DOMAIN})
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Es la forma más rápida: entrá con tu cuenta del estudio y listo.
              </p>

              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />o con contraseña
                <span className="h-px flex-1 bg-border" />
              </div>

              <div className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
                {(["signin", "signup"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setMode(value)}
                    className={cn(
                      "rounded-full py-1.5 text-sm font-medium transition-colors",
                      mode === value
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {value === "signin" ? "Ingresar" : "Registrarme"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {mode === "signup" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName">Nombre y apellido</Label>
                    <Input
                      id="fullName"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Correo del estudio</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder={`nombre.apellido${FIRM_DOMAIN}`}
                    autoComplete="email"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Solo se permite el ingreso con tu correo <strong>{FIRM_DOMAIN}</strong>.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    minLength={6}
                    required
                  />
                </div>
                <Button type="submit" variant="outline" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
                  {mode === "signin" ? "Ingresar con contraseña" : "Crear cuenta"}
                </Button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
