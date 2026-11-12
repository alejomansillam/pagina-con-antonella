INSERT INTO public.articles (category_id, slug, title, summary, body, reading_minutes, is_required, is_tool, position)
SELECT '836b009f-79e8-4b3b-9317-b14e85b48ac5', 'manual-protocolo-mora-tardia',
'Protocolo de tono de voz: Mora tardía',
'Guía de tono para comunicaciones de mora tardía con foco en la experiencia del cliente: pilares, objeciones frecuentes, estructura de mensajes y reglas por canal.',
$b$El tono de Naranja X es **cercano, claro, transparente y constructivo**. En la cobranza, la premisa es ayudar al cliente a regularizar su situación, no intimidarlo ni estigmatizarlo.

## Pilares de contenido

- **Empatía y respeto**: el cliente puede estar atravesando una dificultad económica. Sin lenguaje amenazante, agresivo o culpabilizador.
- **Claridad y simplicidad**: sin modismos jurídicos ni tecnicismos. El cliente debe entender cuánto debe, cuál es la oferta y cuándo y cómo pagar.
- **Transparencia**: montos, fechas límite, intereses, descuentos y consecuencias reales. Informar días y horarios de atención y presentarse con el nombre de la empresa.
- **Orientación a la solución**: cómo ayudarlo a resolverlo hoy (cuotas, quitas, refinanciación), no solo exigir el pago.
- **Privacidad**: no brindar datos sensibles como DNI y apellido en las comunicaciones.

## Objeciones frecuentes

**Maltrato / amenazas**: evitar infundir temor legal o presión temporal excesiva; transformar el contacto en un asesoramiento útil.

**No juzgamos**: nadie elige tener deuda; algo pasó que no pudo cumplir. No preguntamos por qué usó la tarjeta o por qué compró.

- «No puedo pagar ese monto» → «Entendemos tu situación. ¿De cuánto dinero disponés hoy para que busquemos una refinanciación que se adapte a tu presupuesto?»
- «Desconozco la deuda / Ya pagué» → «Gracias por avisarnos. Te pedimos por favor el comprobante o te guiamos para verificar el estado de tu cuenta.»
- «No soy la persona que buscan» → «Disculpá las molestias. Vamos a actualizar ahora la base para no volver a contactarte a este número.»

## Estructura de mensajes (email, WhatsApp, SMS)

1. **Identificación transparente**: nombre de la agencia + Naranja X + nombre del titular (sin datos sensibles).
2. **Contexto claro**: motivo del contacto.
3. **Propuesta / solución**: detalle claro, incluyendo plazos.
4. **Llamado a la acción directo y seguro**: enlace al canal oficial de la agencia.

## Reglas por canal

**Llamadas**
- Validar la identidad del titular antes de mencionar detalles de la deuda.
- Prohibido dejar mensajes a terceros (familiares, empleadores) sobre la deuda del titular.

**WhatsApp**
- Informar siempre días y horarios de atención.
- Responder dentro de las **2 horas** (mora tardía).

**Email**
- Asuntos sin mayúsculas sostenidas, sin signos de exclamación excesivos (¡¡!!) ni palabras como «BENEFICIO EXCLUSIVO», «URGENTE», «ULTIMÁTUM» o «LEGAL».
- Ejemplo positivo: «[Nombre], ponete al día con tu tarjeta Naranja X y aprovechá esta opción de pago.»

## Elementos del mensaje

- **Inicio — cercanía**: usar el nombre propio; saludo cálido, sin mayúsculas duras ni negritas.
- **Motivo del contacto — claridad sin culpas**: «Deuda vencida», «Cuenta en mora», «En manos de abogados», «En nuestro Estudio Jurídico», «Agencia de cobro».
- **Propuesta — colaboración**: priorizar 1 o 2 opciones, no saturar. Dejar negociaciones pendientes por si no hay acuerdo en el primer contacto. «Te puedo llamar para compartirte más detalle», «Solicité una prórroga para tu cuenta». No usar el plural: se ofrecen opciones, decide la persona usuaria.
- **Urgencia sin amenaza — plazo concreto**: «Si hacés un compromiso de pago hoy, vas a evitar que tu deuda se incremente», «Podemos llegar a un acuerdo en las próximas 48 h hábiles».
- **Cierre — disponibilidad y confianza**: «¿En qué horario podemos charlar?», «Estoy para ayudarte», «Estos son nuestros horarios».$b$,
6, true, true, 45
WHERE NOT EXISTS (SELECT 1 FROM public.articles WHERE slug='manual-protocolo-mora-tardia');