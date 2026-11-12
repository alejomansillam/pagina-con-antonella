
-- shared updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  department TEXT,
  role_title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  objectives TEXT[] NOT NULL DEFAULT '{}',
  accent TEXT NOT NULL DEFAULT 'amber',
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- articles
CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  reading_minutes INT NOT NULL DEFAULT 3,
  is_required BOOLEAN NOT NULL DEFAULT true,
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.articles TO authenticated;
GRANT ALL ON public.articles TO service_role;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "articles_read" ON public.articles FOR SELECT TO authenticated USING (true);
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX articles_category_idx ON public.articles(category_id, position);

-- bookmarks
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO authenticated;
GRANT ALL ON public.bookmarks TO service_role;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookmarks_own" ON public.bookmarks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reading progress
CREATE TABLE public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, article_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reading_progress_own" ON public.reading_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- seed categories
INSERT INTO public.categories (slug, name, title, summary, objectives, accent, position) VALUES
('bienvenida', 'Bienvenida', 'Bienvenida: tus primeros días con claridad', 'Todo lo que necesitas para arrancar con confianza: qué esperar, a quién conocer y cómo se ve una primera semana exitosa.', ARRAY['Entender qué sucede en tu primer día, primera semana y primer mes','Identificar a tu manager, tu buddy y las personas clave de tu equipo','Completar los trámites administrativos y de acceso sin bloqueos','Saber a quién preguntar cuando algo no está claro'], 'amber', 1),
('cultura', 'Cultura', 'Cultura: cómo trabajamos y qué valoramos', 'Nuestros valores en la práctica: cómo tomamos decisiones, cómo nos comunicamos y qué comportamientos reconocemos.', ARRAY['Explicar los valores de la compañía con ejemplos concretos','Aplicar nuestras normas de comunicación asincrónica y de reuniones','Reconocer cómo se toman y documentan las decisiones','Dar y recibir feedback siguiendo nuestro marco'], 'rose', 2),
('procesos-operativos', 'Procesos Operativos', 'Procesos Operativos: el flujo de trabajo de cada área', 'Los procesos que hacen que el trabajo avance, área por área, con responsables, tiempos y puntos de entrega.', ARRAY['Seguir el flujo de trabajo de tu área de punta a punta','Saber quién aprueba qué y en qué momento','Usar las plantillas y rituales de planificación correctos','Escalar un bloqueo por el canal adecuado'], 'sky', 3),
('herramientas-clave', 'Herramientas Clave', 'Herramientas Clave: tus accesos y sistemas del día a día', 'Las herramientas que usarás a diario, cómo pedir acceso y las buenas prácticas de seguridad esperadas.', ARRAY['Configurar tus cuentas y la verificación en dos pasos','Solicitar accesos y permisos por el proceso correcto','Usar cada herramienta para el propósito que le corresponde','Aplicar las prácticas básicas de seguridad de la información'], 'emerald', 4),
('faqs', 'FAQs', 'FAQs: respuestas rápidas a las dudas más comunes', 'Las preguntas que todo el mundo hace en sus primeras semanas, respondidas de forma directa.', ARRAY['Resolver dudas de nómina, vacaciones y ausencias','Presentar gastos y reembolsos correctamente','Gestionar equipo, soporte técnico y beneficios','Saber dónde buscar antes de preguntar'], 'violet', 5);

-- seed articles
INSERT INTO public.articles (category_id, slug, title, summary, body, reading_minutes, is_required, position)
SELECT c.id, a.slug, a.title, a.summary, a.body, a.reading_minutes, a.is_required, a.position
FROM (VALUES
('bienvenida','tu-primer-dia','Tu primer día: agenda y expectativas','Qué va a pasar hoy, hora por hora, y qué se espera de ti (spoiler: sobre todo conocer gente).','## Bienvenida\n\nHoy no se espera que produzcas: se espera que conozcas. Tu agenda del primer día combina configuración de accesos, presentaciones y una comida con tu equipo.\n\n### Mañana\n- 9:30 Recepción y entrega de equipo\n- 10:00 Configuración de cuentas y verificación en dos pasos\n- 11:00 Reunión 1:1 con tu manager\n\n### Tarde\n- 13:00 Comida con el equipo\n- 15:00 Recorrido por herramientas internas\n- 16:30 Cierre del día con tu buddy\n\n### Qué se espera de ti\nHacer preguntas, anotar lo que no entiendas y dejar por escrito cualquier acceso que te falte.',3,true,1),
('bienvenida','tu-primera-semana','Tu primera semana: objetivos y entregables','Los cinco resultados concretos que deberías alcanzar antes del viernes.','## Objetivos de la semana 1\n\n1. Todos tus accesos funcionando.\n2. Una conversación de 30 minutos con cada persona de tu equipo directo.\n3. Leer las secciones de Bienvenida y Cultura completas.\n4. Entender el flujo de trabajo de tu área a alto nivel.\n5. Cerrar una primera tarea pequeña de principio a fin.\n\n### Cómo medimos el progreso\nTu checklist de lectura en el portal y una revisión de 30 minutos con tu manager el viernes.',4,true,2),
('bienvenida','quien-es-quien','Quién es quién: tu manager, tu buddy y los equipos','El mapa de personas: a quién acudir para cada tipo de duda.','## Tu red de apoyo\n\n**Tu manager** define prioridades, resuelve bloqueos y hace tu seguimiento de desempeño.\n\n**Tu buddy** es tu atajo para las preguntas “tontas”: dónde está algo, cómo se hace algo, a quién se le pregunta.\n\n**People Ops** resuelve contrato, nómina, vacaciones y beneficios.\n\n**IT / Soporte** resuelve equipo, accesos y contraseñas.\n\n### Regla práctica\nSi llevas más de 30 minutos bloqueado, pregunta. Preguntar temprano es la conducta esperada, no una excepción.',3,true,3),
('bienvenida','primeros-30-dias','Tus primeros 30 días: hitos de 7, 14 y 30','Un plan por etapas para pasar de observar a contribuir.','## Día 7\nAccesos listos, contexto básico del área, primera tarea entregada.\n\n## Día 14\nParticipas en los rituales de tu equipo, entiendes las métricas que sigue tu área y trabajas con autonomía en tareas acotadas.\n\n## Día 30\nTomas tareas de punta a punta, propones mejoras y ya has documentado al menos una cosa que te costó entender para quien venga después.',3,false,4),
('cultura','nuestros-valores','Nuestros valores en la práctica','Cuatro valores, con ejemplos de lo que sí y lo que no.','## Claridad antes que velocidad\nEscribimos las decisiones. Una reunión sin nota escrita no ocurrió.\n\n## Propiedad, no permiso\nSi ves un problema, es tuyo hasta que encuentres a su dueño.\n\n## Respeto por el tiempo ajeno\nAgendas con objetivo, mensajes con contexto, documentos con resumen arriba.\n\n## Curiosidad honesta\nDecir “no lo sé” es una respuesta profesional completa.',4,true,1),
('cultura','comunicacion','Normas de comunicación: canales y tiempos de respuesta','Qué se escribe, dónde y cuándo esperar respuesta.','## Elige el canal\n- **Documento**: decisiones, propuestas, cualquier cosa que alguien deba leer en un mes.\n- **Chat**: coordinación del día. Respuesta esperada: mismo día laboral.\n- **Correo**: comunicación externa.\n- **Reunión**: solo cuando hay desacuerdo o hace falta decidir en vivo.\n\n## Asincronía por defecto\nEscribe pensando en quien lo lea mañana en otra zona horaria: contexto, decisión pedida, fecha límite.',4,true,2),
('cultura','reuniones-y-decisiones','Reuniones y toma de decisiones','Cómo se decide algo aquí y cómo queda registrado.','## Antes\nToda reunión tiene objetivo, dueño y documento previo.\n\n## Durante\nUna persona decide, el resto asesora. La discrepancia se dice en la reunión, no después.\n\n## Después\nEn 24 horas se publica la nota: decisión, alternativas descartadas, responsables y próximos pasos.',3,true,3),
('cultura','feedback','Feedback: cómo lo damos y cómo lo recibimos','El marco que usamos para que el feedback sea útil y no personal.','## Marco: situación, comportamiento, impacto\n\n“En la revisión del martes, el documento llegó 10 minutos antes; el equipo no pudo prepararse y la decisión se aplazó una semana.”\n\n## Al recibirlo\nEscucha completo, pregunta por un ejemplo más, agradece y decide una acción concreta.\n\n## Cadencia\n1:1 semanal con tu manager, revisión formal cada trimestre.',3,false,4),
('procesos-operativos','flujo-general','El flujo de trabajo general: de la idea a la entrega','Las cinco etapas por las que pasa cualquier trabajo, sin importar el área.','## Etapas\n1. **Entrada**: la solicitud llega por el formulario o canal oficial del área.\n2. **Triage**: se prioriza semanalmente y se asigna responsable.\n3. **Ejecución**: se trabaja con estado visible en el tablero.\n4. **Revisión**: revisión por par o aprobación según el tipo de trabajo.\n5. **Cierre**: se documenta y se comunica al solicitante.\n\nSi un trabajo no está en el tablero, no existe para la planificación.',4,true,1),
('procesos-operativos','proceso-producto-ingenieria','Producto e Ingeniería: ciclo de entrega','Cómo pasa una funcionalidad de propuesta a producción.','## Ciclo\n- Propuesta breve con problema, usuario y métrica de éxito\n- Refinamiento y estimación en la sesión semanal\n- Desarrollo en ramas cortas con revisión obligatoria\n- Despliegue con monitoreo y plan de reversión\n- Revisión de impacto a las dos semanas\n\n## Definición de terminado\nProbado, documentado, monitoreado y comunicado.',5,true,2),
('procesos-operativos','proceso-comercial-soporte','Comercial y Soporte: ciclo de cliente','Del primer contacto a la renovación, con responsables por etapa.','## Comercial\nProspección → calificación → propuesta → cierre → traspaso a onboarding. Cada etapa se refleja en el CRM el mismo día.\n\n## Soporte\nTicket → clasificación por severidad → resolución o escalado → cierre con causa raíz. Severidad 1 se escala en menos de 15 minutos.\n\n## Traspasos\nTodo traspaso entre áreas incluye un resumen escrito del contexto del cliente.',4,true,3),
('procesos-operativos','escalamiento','Cómo escalar un bloqueo','La ruta de escalamiento y los tiempos esperados en cada nivel.','## Ruta\n1. Tu equipo directo (mismo día)\n2. Tu manager (24 horas)\n3. Responsable del área implicada (48 horas)\n4. Comité de dirección (solo riesgos de cliente o legales)\n\n## Cómo se escribe un escalamiento\nQué está bloqueado, desde cuándo, qué intentaste, qué decisión necesitas y para cuándo.',3,true,4),
('herramientas-clave','accesos-y-cuentas','Accesos y cuentas: configuración inicial','Las cuentas que necesitas el primer día y cómo asegurarlas.','## Cuentas base\nCorreo corporativo, gestor de contraseñas, chat interno, suite de documentos y el tablero de tu área.\n\n## Verificación en dos pasos\nObligatoria en todas las cuentas corporativas. Configúrala el primer día con la app de autenticación, no por SMS.\n\n## Gestor de contraseñas\nNinguna credencial compartida fuera del gestor. Nunca por chat ni correo.',3,true,1),
('herramientas-clave','solicitar-permisos','Cómo solicitar permisos y herramientas nuevas','El proceso de solicitud, quién aprueba y cuánto tarda.','## Proceso\n1. Solicita desde el catálogo interno de herramientas.\n2. Tu manager aprueba (1 día laboral).\n3. IT provisiona (1-2 días laborales).\n\n## Principio de mínimo privilegio\nPides el acceso que necesitas para la tarea, no el más amplio disponible. Los accesos se revisan cada trimestre y los no usados se retiran.',3,true,2),
('herramientas-clave','que-herramienta-para-que','Qué herramienta usar para qué','Una tabla mental para no duplicar información entre sistemas.','## Uso previsto\n- **Documentos**: conocimiento duradero y decisiones\n- **Tablero**: trabajo con estado y responsable\n- **Chat**: coordinación efímera\n- **CRM**: todo lo relativo a clientes\n- **Portal de onboarding**: lo que un nuevo ingreso debe leer\n\nSi algo importante solo existe en el chat, muévelo a un documento.',3,false,3),
('herramientas-clave','seguridad-basica','Seguridad de la información: lo mínimo indispensable','Cinco prácticas que evitan la mayoría de los incidentes.','## Prácticas\n1. Verificación en dos pasos en todo.\n2. Bloqueo de pantalla automático.\n3. Nada de datos de clientes en herramientas no aprobadas.\n4. Ante un correo sospechoso: reportar, no responder.\n5. Reporta cualquier incidente en la primera hora; no hay penalización por reportar.',3,true,4),
('faqs','nomina-y-pagos','Nómina y pagos','Cuándo cobras, qué incluye tu recibo y a quién preguntar.','## Fechas\nEl pago se realiza el último día laboral de cada mes.\n\n## Recibo\nDisponible en el portal de People Ops dentro de los tres días siguientes al pago.\n\n## Dudas\nEscribe a People Ops con el mes en cuestión y el concepto que no cuadra.',2,true,1),
('faqs','vacaciones-y-ausencias','Vacaciones y ausencias','Cómo se piden, con cuánta antelación y qué pasa con los días no usados.','## Solicitud\nDesde el portal de People Ops, con aprobación de tu manager.\n\n## Antelación\n- 1 o 2 días: 48 horas\n- Más de 3 días: 2 semanas\n- Más de 2 semanas seguidas: 1 mes\n\n## Enfermedad\nAvisa a tu manager por chat en cuanto puedas y registra la ausencia el mismo día.',2,true,2),
('faqs','gastos-y-reembolsos','Gastos y reembolsos','Qué se reembolsa, con qué límites y en cuánto tiempo.','## Qué se reembolsa\nViajes de trabajo, formación aprobada, material de oficina y comidas con clientes.\n\n## Cómo\nSube la factura al sistema de gastos dentro de los 30 días, con concepto y proyecto.\n\n## Plazo\nEl reembolso se paga con la nómina del mes siguiente a la aprobación.',2,true,3),
('faqs','equipo-y-soporte','Equipo y soporte técnico','Qué equipo recibes, qué hacer si falla y cómo se renueva.','## Equipo\nPortátil, monitor y periféricos básicos. Necesidades específicas se piden por el catálogo interno.\n\n## Si algo falla\nAbre un ticket de soporte. Para averías que te impiden trabajar, hay equipo de préstamo el mismo día.\n\n## Renovación\nCada tres años o antes si el rendimiento lo justifica.',2,false,4)
) AS a(cat_slug, slug, title, summary, body, reading_minutes, is_required, position)
JOIN public.categories c ON c.slug = a.cat_slug;
