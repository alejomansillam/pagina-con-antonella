import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, UserRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MONTHS,
  fichaQuery,
  saveFicha,
  staffDirectoryQuery,
  syncDirectoryEntry,
  type Ficha,
} from "@/lib/staff";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Mi ficha — Mansilla Garzón & Asoc." },
      {
        name: "description",
        content:
          "Completá tus datos de gestión: usuario de Gestión de Mora, interno MicroSIP, WhatsApp corporativo, correo interno y tu cumpleaños.",
      },
      { property: "og:title", content: "Mi ficha — Mansilla Garzón & Asoc." },
      {
        property: "og:description",
        content: "Tus datos de contacto y gestión dentro del portal del estudio.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PerfilPage,
});

const EMPTY = {
  first_name: "",
  last_name: "",
  gm_username: "",
  internal_email: "",
  whatsapp: "",
  microsip_ext: "",
  role_title: "",
  birth_day: "",
  birth_month: "",
};

function PerfilPage() {
  const queryClient = useQueryClient();
  const { data: ficha } = useQuery(fichaQuery);
  const { data: staff = [] } = useQuery(staffDirectoryQuery);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    if (!ficha) return;
    const [first = "", ...rest] = (ficha.full_name ?? "").trim().split(" ");
    setForm({
      first_name: ficha.first_name ?? first,
      last_name: ficha.last_name ?? rest.join(" "),
      gm_username: ficha.gm_username ?? "",
      internal_email: ficha.internal_email ?? "",
      whatsapp: ficha.whatsapp ?? "",
      microsip_ext: ficha.microsip_ext ?? "",
      role_title: ficha.role_title ?? "",
      birth_day: ficha.birth_day ? String(ficha.birth_day) : "",
      birth_month: ficha.birth_month ? String(ficha.birth_month) : "",
    });
  }, [ficha]);

  const set = (key: keyof typeof EMPTY, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: async () => {
      const values: Partial<Ficha> = {
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        gm_username: form.gm_username.trim() || null,
        internal_email: form.internal_email.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        microsip_ext: form.microsip_ext.trim() || null,
        role_title: form.role_title.trim() || null,
        birth_day: form.birth_day ? Number(form.birth_day) : null,
        birth_month: form.birth_month ? Number(form.birth_month) : null,
      };
      await saveFicha(values);

      // Si su nombre o usuario coincide con un registro de la agenda, lo mantenemos sincronizado.
      const gm = values.gm_username?.toLowerCase();
      const fullName = `${form.first_name} ${form.last_name}`.trim().toLowerCase();
      const match = staff.find(
        (s) =>
          (gm && s.gm_username?.toLowerCase() === gm) ||
          s.full_name.toLowerCase() === fullName ||
          s.user_id === ficha?.id,
      );
      if (match && (match.user_id === null || match.user_id === ficha?.id)) {
        await syncDirectoryEntry(match.id, {
          internal_email: values.internal_email ?? match.internal_email,
          whatsapp: values.whatsapp ?? match.whatsapp,
          microsip_ext: values.microsip_ext ?? match.microsip_ext,
          gm_username: values.gm_username ?? match.gm_username,
          birth_day: values.birth_day ?? match.birth_day,
          birth_month: values.birth_month ?? match.birth_month,
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ficha"] });
      await queryClient.invalidateQueries({ queryKey: ["staff_directory"] });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Ficha actualizada");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Equipo y comunicación
        </p>
        <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold">
          <UserRound className="size-7 text-primary" aria-hidden />
          Mi ficha
        </h1>
        <p className="mt-2 text-muted-foreground">
          Estos datos aparecen en la agenda del estudio y en el calendario de cumpleaños.
        </p>
      </header>

      <form
        className="space-y-5 rounded-xl border border-border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Nombre" id="first_name" value={form.first_name} onChange={(v) => set("first_name", v)} />
          <Field label="Apellido" id="last_name" value={form.last_name} onChange={(v) => set("last_name", v)} />
          <Field
            label="Usuario de Gestión de Mora"
            id="gm_username"
            value={form.gm_username}
            onChange={(v) => set("gm_username", v)}
            placeholder="ej.: dcortez"
          />
          <Field
            label="Interno MicroSIP"
            id="microsip_ext"
            value={form.microsip_ext}
            onChange={(v) => set("microsip_ext", v)}
            placeholder="ej.: 105"
          />
          <Field
            label="Correo interno del estudio"
            id="internal_email"
            value={form.internal_email}
            onChange={(v) => set("internal_email", v)}
            placeholder="nombre@estudio.com"
          />
          <Field
            label="WhatsApp corporativo"
            id="whatsapp"
            value={form.whatsapp}
            onChange={(v) => set("whatsapp", v)}
            placeholder="3511234567"
          />
          <Field
            label="Puesto"
            id="role_title"
            value={form.role_title}
            onChange={(v) => set("role_title", v)}
            placeholder="ej.: Gestora"
          />
        </div>

        <fieldset className="space-y-2">
          <Label>Cumpleaños</Label>
          <div className="flex gap-3">
            <Select value={form.birth_day} onValueChange={(v) => set("birth_day", v)}>
              <SelectTrigger className="w-28" aria-label="Día de cumpleaños">
                <SelectValue placeholder="Día" />
              </SelectTrigger>
              <SelectContent>
                {days.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.birth_month} onValueChange={(v) => set("birth_month", v)}>
              <SelectTrigger className="flex-1" aria-label="Mes de cumpleaños">
                <SelectValue placeholder="Mes" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </fieldset>

        <Button type="submit" disabled={mutation.isPending} className="w-full">
          <Save className="size-4" aria-hidden />
          {mutation.isPending ? "Guardando…" : "Guardar mi ficha"}
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  id,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
