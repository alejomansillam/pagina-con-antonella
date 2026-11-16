# Portal del Estudio · notas para agentes

- Stack: TanStack Start + React + Tailwind, Supabase (base, login, archivos), deploy en Vercel desde `main`.
- Estructura de la base: `supabase/schema.sql` (sin datos). Cualquier cambio de base se agrega ahí.

- Permisos: roles en tabla user_roles (admin/senior) con has_role/can_edit en RLS; nunca en profiles — evita escalada de privilegios.
- Internal human chat uses membership-scoped RLS and atomic database RPCs for conversation creation and membership changes; this prevents access to other conversations and duplicate direct chats. Only group creators add members.
- Internal chat conversation IDs live in dedicated routes, and Realtime subscriptions invalidate scoped queries with unmount cleanup; this preserves reload history without leaking subscriptions.
- Generate debt-free PDFs client-side from a sanitized official PDF base, replacing only identity and dates; this preserves original artwork without publishing example debtor data.
- Keep quick and full portal guides driven by shared step definitions; interactive references must use existing typed routes to prevent instructions drifting from navigation.

- Asistente IA: server function `askAssistant` (API de Anthropic, `ANTHROPIC_API_KEY`) responde solo con `articles`; hilos y mensajes con RLS por usuario.
