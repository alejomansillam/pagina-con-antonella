/** Accesos directos del Hub de Sistemas del estudio. */
export type SystemLink = {
  name: string;
  purpose: string;
  url?: string;
  articleSlug?: string;
  links?: { label: string; url: string }[];
};

export const SYSTEMS: SystemLink[] = [
  {
    name: "Instagram del estudio",
    purpose: "Novedades y vida institucional en redes.",
    url: "https://www.instagram.com/estudiomansillayasociados/",
  },
  {
    name: "LinkedIn del estudio",
    purpose: "Página institucional de Mansilla Garzón & Asoc.",
    url: "https://ar.linkedin.com/company/estudiomgya",
  },
  {
    name: "Gestión de Mora",
    purpose: "Registro de gestiones: General, Mailing/Telemora y Económicos.",
    articleSlug: "manual-gestion-de-mora",
  },
  {
    name: "Abogados Naranja X",
    purpose: "Consulta de cuenta, liquidación, refinanciaciones y pagos.",
    url: "https://abogados.naranjax.com/AbogadoValida3.asp",
    articleSlug: "manual-abogados-naranja-x",
  },
  {
    name: "Chattigo",
    purpose: "Conversaciones omnicanal de WhatsApp y redes.",
    url: "https://login.chattigo.com",
    articleSlug: "chattigo",
  },
  {
    name: "Softphone MicroSIP",
    purpose: "Llamadas salientes desde el puesto del gestor.",
    articleSlug: "microsip",
  },
  {
    name: "Drive de Carga de Transferencias",
    purpose: "Asiento de comprobantes: DNI, fecha, monto y gestor.",
    url: "https://docs.google.com/spreadsheets/d/110dIngWyhSsd-0r8ooLj-05Lu6_8FKhqKaDi7K6bzj8/edit?gid=263522090#gid=263522090",
  },
  {
    name: "Tableros de Control en Excel",
    purpose: "Medición diaria del recupero y la productividad.",
    links: [
      {
        label: "General Tarjeta Naranja",
        url: "https://docs.google.com/spreadsheets/d/1v0ZcDMGLkk06FLW3-CvVQseFlJW30eAl/edit?usp=drive_link",
      },
      {
        label: "Padrones activos",
        url: "https://docs.google.com/spreadsheets/d/1X-z1YGj1FeWLERqkcRVxf6OER3CXsiHW/edit?usp=drive_link",
      },
      {
        label: "Llamadas positivas",
        url: "https://docs.google.com/spreadsheets/d/1PGZfTphyZc2wIBZdSyKPQpyKduCR6em4/edit?usp=drive_link",
      },
    ],
  },
];
