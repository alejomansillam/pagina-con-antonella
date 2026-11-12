/** Ruta de inducción guiada para nuevos ingresos (primera semana). */

export type OnboardingStep = {
  day: number;
  title: string;
  focus: string;
  tasks: string[];
  links: { label: string; to?: "/padrones" | "/plantillas" | "/calculadora" | "/perfil" | "/sugerencias" | "/browse" | "/institucional"; url?: string; articleSlug?: string }[];
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    day: 1,
    title: "Bienvenida y configuración",
    focus: "Conocer el estudio y quedar operativo en tu puesto.",
    tasks: [
      "Leer Bienvenida y Cultura del estudio.",
      "Alta de usuario de Windows y del interno de MicroSIP en tu puesto.",
      "Firmar el Acuerdo de Confidencialidad (ACU-CONF001) y los accesos.",
      "Completar Mi ficha: nombre, usuario de GM, interno, WhatsApp y cumpleaños.",
    ],
    links: [
      { label: "Bienvenida y Cultura del estudio", articleSlug: "bienvenida-y-cultura-del-estudio" },
      { label: "Día 1 y Quién es Quién", to: "/institucional" },
      { label: "Mi ficha", to: "/perfil" },
    ],
  },
  {
    day: 2,
    title: "Sistemas clave y validación",
    focus: "Consultar una cuenta de punta a punta.",
    tasks: [
      "Ingresar a Abogados Naranja X y leer una liquidación completa.",
      "Buscar un DNI en Padrones y reconocer la instancia (N1, N2 o N3).",
      "Identificar saldo base, gestor asignado y condiciones sugeridas.",
    ],
    links: [
      { label: "Padrones", to: "/padrones" },
      { label: "Abogados Naranja X", url: "https://abogados.naranjax.com/AbogadoValida3.asp" },
    ],
  },
  {
    day: 3,
    title: "Gestión diaria y canales",
    focus: "Hablar con el cliente con los modelos oficiales.",
    tasks: [
      "Capacitación oficial en Chattigo: ingreso, estados de agente y tipificación.",
      "Recorrer Plantillas diarias y las Campañas Chattigo.",
      "Ensayar un primer contacto y una propuesta con el modelo del estudio.",
    ],
    links: [
      { label: "Plantillas", to: "/plantillas" },
      { label: "Chattigo", url: "https://chattigo.sabionet.com/" },
    ],
  },
  {
    day: 4,
    title: "Carga y cobranzas",
    focus: "Dejar todo asentado como corresponde.",
    tasks: [
      "Guía de carga en Gestión de Mora: General, Mailing/Telemora y Económics.",
      "Aplicar la regla del espejo: todo acuerdo de Nx se copia idéntico en GM.",
      "Registrar un comprobante en el Drive de Carga de Transferencias.",
    ],
    links: [
      { label: "Manual de Gestión de Mora", articleSlug: "manual-gestion-de-mora" },
      {
        label: "Drive de Transferencias",
        url: "https://docs.google.com/spreadsheets/d/110dIngWyhSsd-0r8ooLj-05Lu6_8FKhqKaDi7K6bzj8/edit",
      },
    ],
  },
  {
    day: 5,
    title: "Reportes y práctica",
    focus: "Medir tu día y despejar dudas antes de recibir cartera.",
    tasks: [
      "Recorrer los tableros de control en Excel y las tablas dinámicas.",
      "Practicar con el DNI de prueba de punta a punta.",
      "Responder el checkpoint de 5 preguntas con tu tutor.",
      "Dejar tus dudas en el Buzón de sugerencias.",
    ],
    links: [
      { label: "Calculadora", to: "/calculadora" },
      { label: "Sugerencias", to: "/sugerencias" },
    ],
  },
];

/** Caso de práctica: no existe en la cartera real, es solo para ensayar. */
export const PRACTICE_CASE = {
  dni: "99.999.999",
  titular: "CLIENTE DE PRUEBA (PRÁCTICA)",
  instancia: "N2",
  saldo: "$ 250.000",
  nota: "DNI ficticio de entrenamiento. Ensayá la búsqueda, la carga en GM y el envío de plantillas sin tocar datos reales.",
} as const;

/** Referentes de consulta durante la primera semana. */
export const BUDDIES = [
  { team: "Equipo Rojo", name: "Antonella López", role: "Gestora Senior" },
  { team: "Equipo Verde", name: "Daniela Cortez", role: "Gestora Senior" },
  { team: "Equipo Azul", name: "Pilar Solano", role: "Gestora Senior" },
  { team: "Equipo 1142", name: "Moriana Rey", role: "Gestora Senior" },
  { team: "Supervisión general", name: "Milagros Villegas", role: "Supervisora General" },
] as const;

/** Checkpoint del 5.º día: 5 confirmaciones antes de asignar cartera definitiva. */
export const CHECKPOINT = [
  "Puedo explicar la diferencia entre N1, N2 y N3 y qué se negocia en cada instancia.",
  "Sé leer la matriz de estados de Gestión de Mora y elegir el estado correcto.",
  "Sé que todo acuerdo cerrado en Naranja X debe copiarse idéntico en Económics de GM.",
  "Uso las plantillas oficiales y completo los datos variables antes de enviar.",
  "Conozco el seguimiento anticipado: aviso a 5-4 días y alertas a 2 días y al vencimiento.",
] as const;

const KEY = "mg-onboarding-v1";

export type OnboardingState = { days: number[]; checkpoint: number[] };

export function readOnboarding(): OnboardingState {
  if (typeof window === "undefined") return { days: [], checkpoint: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { days: [], checkpoint: [] };
    const parsed = JSON.parse(raw) as Partial<OnboardingState>;
    return { days: parsed.days ?? [], checkpoint: parsed.checkpoint ?? [] };
  } catch {
    return { days: [], checkpoint: [] };
  }
}

export function writeOnboarding(state: OnboardingState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(state));
}
