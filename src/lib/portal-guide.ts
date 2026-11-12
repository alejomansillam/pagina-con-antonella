/** Fuente compartida para la guía rápida y la guía completa. */
export const GUIDE_TITLE = "Guía de uso del portal";
export const GUIDE_ARTICLE_SLUG = "como-usar-el-portal";

export const GUIDE_ITEMS = [
  {
    title: "Consultá novedades y agenda",
    text: "En Inicio, revisá las novedades y los cumpleaños del equipo. En Calendario, seleccioná un día para consultar sus eventos, horarios y fechas.",
    location: "Inicio → Novedades · Equipo y agenda → Calendario",
    cue: "Buscá el ícono de calendario y seleccioná la fecha que necesitás consultar.",
    to: "/calendario",
    action: "Abrir Calendario",
  },
  {
    title: "Encontrá información y cuentas",
    text: "Usá el buscador de la barra superior para encontrar manuales, personas, novedades o un DNI. Para consultar una cuenta, ingresá el DNI en Padrones y revisá los datos disponibles.",
    location: "Barra superior → Buscador · Herramientas → Padrones",
    cue: "Identificá la lupa junto al campo de búsqueda. Un DNI permite abrir su ficha en Padrones.",
    to: "/padrones",
    action: "Abrir Padrones",
  },
  {
    title: "Prepará un mensaje de gestión",
    text: "En Plantillas, elegí la categoría y el mensaje adecuado. Seleccioná «Copiar mensaje», completá las variables entre corchetes y verificá los datos antes de enviarlo.",
    location: "Herramientas → Plantillas → Copiar mensaje",
    cue: "El ícono de copia identifica la acción de copiar. Revisá [NOMBRE], [DNI], [MONTO] y [FECHA] cuando correspondan.",
    to: "/plantillas",
    action: "Abrir Plantillas",
  },
  {
    title: "Completá tu capacitación",
    text: "Consultá los manuales en Capacitación. Al terminar una lectura, seleccioná «Marcar como leído». Usá Guardados para volver a los artículos que necesitás consultar con frecuencia.",
    location: "Información → Capacitación · Artículo → Marcar como leído / Guardar",
    cue: "La marca de verificación indica una lectura completada; el marcador identifica los artículos guardados.",
    to: "/browse",
    action: "Abrir Capacitación",
  },
  {
    title: "Mantené el contacto con el equipo",
    text: "Completá tus datos en Mi ficha y consultá los contactos en Agenda. En Chat interno podés iniciar una conversación individual o participar en los grupos de los que sos integrante.",
    location: "Equipo y agenda → Mi ficha / Agenda / Chat interno",
    cue: "Buscá el ícono de conversación para abrir el chat. El clip permite adjuntar archivos y la carita abre los emojis.",
    to: "/chat",
    action: "Abrir Chat interno",
  },
] as const;

export const GUIDE_FOOTER =
  "Podés volver a consultar esta guía desde Ayuda, junto al ícono de signo de pregunta en la barra superior.";

export const GUIDE_SUMMARY = "Pasos para consultar información, usar las herramientas y comunicarte con el equipo.";
export const GUIDE_BODY = GUIDE_ITEMS.map((item, i) =>
  `## ${i + 1}. ${item.title}\n\n${item.text}\n\n**Ubicación:** ${item.location}\n\n**Referencia visual:** ${item.cue}`,
).join("\n\n") + `\n\n${GUIDE_FOOTER}`;

const KEY = "mg-guide-seen-v1";
export const guideSeen = () =>
  typeof window !== "undefined" && window.localStorage.getItem(KEY) === "1";
export const markGuideSeen = () => window.localStorage.setItem(KEY, "1");
