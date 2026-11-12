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
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink p-12 text-ink-foreground lg:flex">
        <img
          src="/brand/ingreso-estudio.jpg"
          alt=""
          aria-hidden
          className="absolute inset-0 size-full object-cover object-[30%_40%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#1f2638] via-[#1f2638]/70 to-[#1f2638]/40"
        />
        <div className="relative">
          <BrandLock tone="inverted" />
        </div>
        <div className="relative max-w-md">
          <h1 className="font-display text-4xl leading-tight">
            Todo lo que necesitas saber, en el orden en que lo necesitas.
          </h1>
          <p className="mt-4 text-ink-foreground/70">
            Bienvenida, Cultura, Procesos Operativos, Herramientas Clave y FAQs: cinco secciones con
            objetivos claros y una checklist de lectura que sigue tu progreso.
          </p>
        </div>
        <p className="relative text-sm text-ink-foreground/60">
          Duarte Quirós 670, Piso 3 · Córdoba
        </p>
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
                <img
                  src="/brand/ingreso-estudio.jpg"
                  alt="Ingreso del estudio Mansilla Garzón & Asociados"
                  className="mt-5 h-36 w-full rounded-lg object-cover object-[30%_38%]"
                />
              </div>
              <h2 className="mt-6 font-display text-3xl lg:mt-0">Ingresar al portal</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Acceso exclusivo para el equipo de Mansilla Garzón &amp; Asoc.
              </p>

              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="mt-6 flex w-full items-center gap-3 rounded-md border border-[#3b4561]/25 bg-card px-4 py-3 text-left shadow-sm transition-colors hover:border-[#3b4561]/60 hover:bg-[#3b4561]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3b4561]/40 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-5 shrink-0 animate-spin text-[#3b4561]" aria-hidden />
                ) : (
                  <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden>
                    <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
                    <path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z" />
                    <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
                  </svg>
                )}
                <span className="leading-tight">
                  <span className="block text-sm font-semibold text-[#3b4561]">
                    Continuar con Google
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Con tu cuenta {FIRM_DOMAIN}
                  </span>
                </span>
              </button>
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
