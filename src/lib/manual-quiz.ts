/** Quiz de 3 preguntas por manual. `answer` es el índice de la opción correcta. */
export type QuizQuestion = { q: string; options: string[]; answer: number; why: string };

export const MANUAL_QUIZZES: Record<string, QuizQuestion[]> = {
  "manual-protocolo-mora-tardia": [
    {
      q: "¿En cuánto tiempo hay que responder un WhatsApp en mora tardía?",
      options: ["24 horas", "2 horas", "48 horas hábiles", "Al día siguiente"],
      answer: 1,
      why: "El protocolo fija un plazo de respuesta de 2 horas.",
    },
    {
      q: "En una llamada, ¿qué hacés antes de mencionar la deuda?",
      options: ["Validar la identidad del titular", "Dejar el mensaje a un familiar", "Informar el monto total", "Advertir sobre acciones legales"],
      answer: 0,
      why: "Primero se valida la identidad; está prohibido informar la deuda a terceros.",
    },
    {
      q: "¿Cuál es un asunto de email correcto?",
      options: ["URGENTE: deuda pendiente", "¡¡ÚLTIMÁTUM LEGAL!!", "[Nombre], ponete al día con tu tarjeta Naranja X", "BENEFICIO EXCLUSIVO por hoy"],
      answer: 2,
      why: "Se evitan mayúsculas sostenidas, exclamaciones excesivas y palabras de spam.",
    },
  ],
  "manual-gestion-de-mora": [
    {
      q: "¿Cuál es el formato correcto para cargar un teléfono en GM?",
      options: ["0341 15 3313609", "5493413313609", "3413313609", "+54 0341 3313609"],
      answer: 1,
      why: "Los teléfonos se cargan sin 0 y sin 15, con código de país.",
    },
    {
      q: "¿Qué hacés con una entrada anterior del historial que quedó desactualizada?",
      options: ["La borrás", "La editás", "Sumás una entrada nueva", "Le pedís a sistemas que la quite"],
      answer: 2,
      why: "Nunca se borran entradas: siempre se agrega una nueva.",
    },
    {
      q: "¿Cuándo cambia la Situación de una cuenta?",
      options: [
        "Cada vez que se la llama",
        "Solo ante un estado específico y verificable",
        "Una vez por semana",
        "Cuando el gestor lo cree conveniente",
      ],
      answer: 1,
      why: "Es el criterio de avance de la Matriz Oficial.",
    },
  ],
  "manual-abogados-naranja-x": [
    {
      q: "¿Qué importe se le informa al cliente?",
      options: ["El total del Detalle de Cupones", "El Capital", "El Total Deuda", "Los intereses punitorios"],
      answer: 2,
      why: "El Total Deuda es el único importe exigible.",
    },
    {
      q: "¿Por qué el Detalle de Cupones suma menos que el Total Deuda?",
      options: [
        "Porque tiene un error",
        "Porque no incluye intereses del estudio ni honorarios",
        "Porque ya tiene una quita aplicada",
        "Porque muestra solo el último mes",
      ],
      answer: 1,
      why: "Los cupones muestran solo los consumos puros reclamados por la entidad.",
    },
    {
      q: "Antes de ofrecer un plan nuevo, ¿qué tenés que verificar?",
      options: [
        "La alerta verde «Refinanciado: * ACTIVO *»",
        "La sucursal del cliente",
        "El código 2FA",
        "El campo Acreditado",
      ],
      answer: 0,
      why: "Indica que la cuenta ya tiene un plan vigente.",
    },
  ],
  "chattigo-manual-de-uso": [
    {
      q: "¿En qué estado tenés que estar para recibir conversaciones?",
      options: ["En pausa", "Disponible", "Desconectado", "Cualquiera"],
      answer: 1,
      why: "Si no estás Disponible, no se te asignan conversaciones.",
    },
    {
      q: "Al usar una respuesta rápida, ¿qué podés modificar?",
      options: ["Los importes", "Los plazos", "El saludo y el nombre", "Las condiciones"],
      answer: 2,
      why: "Nunca se modifican condiciones, importes ni plazos.",
    },
    {
      q: "¿Qué etiquetas son obligatorias antes de cerrar?",
      options: [
        "Solo «otros»",
        "Motivo, resultado y área responsable",
        "Ninguna",
        "Nombre y DNI",
      ],
      answer: 1,
      why: "Cerrar sin etiqueta es un error frecuente: las etiquetas definen los reportes.",
    },
  ],
  "estrategia-padrones-n1-n2-n3": [
    {
      q: "¿Cuál es el objetivo de negociación en N1?",
      options: [
        "Quitas de intereses",
        "Planes largos",
        "Cancelación en 1 pago o hasta 3 cuotas",
        "Esperar al mes 3",
      ],
      answer: 2,
      why: "N1 es la cartera más fresca: negociación estricta.",
    },
    {
      q: "¿Cuánto tiempo como máximo se gestiona cada lote?",
      options: ["1 mes", "3 meses", "6 meses", "1 año"],
      answer: 1,
      why: "Cumplidos 3 meses, la cartera sale del estudio.",
    },
    {
      q: "En N3, antes de ofrecer una quita, ¿qué hacés?",
      options: [
        "Verificar que esté autorizada",
        "Ofrecerla directamente",
        "Esperar que el cliente la pida",
        "Nada, en N3 todo vale",
      ],
      answer: 0,
      why: "Siempre se verifica que la quita o el descuento esté autorizado.",
    },
  ],
  "cierre-acuerdos-seguimiento": [
    {
      q: "¿Para qué sirve la entrega inicial, aunque sea chica?",
      options: [
        "Para nada, se puede omitir",
        "Garantiza la promesa y congela las condiciones del plan",
        "Reemplaza la primera cuota",
        "Habilita pagar por Rapipago",
      ],
      answer: 1,
      why: "Además asegura la cobranza del mes.",
    },
    {
      q: "En un plan a 10 días, ¿cuándo contacta el gestor?",
      options: ["El día 1", "El día 5", "El día 10", "Después del vencimiento"],
      answer: 1,
      why: "Se contacta 4 a 5 días antes del vencimiento, con tono informativo.",
    },
    {
      q: "¿Qué medio de pago está habilitado?",
      options: ["Rapipago", "Pago Mis Cuentas", "Transferencia al CBU de Tarjeta Naranja S.A.", "Tarjeta de crédito"],
      answer: 2,
      why: "Solo transferencia, con foto del comprobante y DNI del titular emisor.",
    },
  ],
};
