<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Permisos: roles en tabla user_roles (admin/senior) con has_role/can_edit en RLS; nunca en profiles — evita escalada de privilegios.
- Internal human chat uses membership-scoped RLS and atomic database RPCs for conversation creation and membership changes; this prevents access to other conversations and duplicate direct chats. Only group creators add members.
- Internal chat conversation IDs live in dedicated routes, and Realtime subscriptions invalidate scoped queries with unmount cleanup; this preserves reload history without leaking subscriptions.
- Generate debt-free PDFs client-side from a sanitized official PDF base, replacing only identity and dates; this preserves original artwork without publishing example debtor data.
- Keep quick and full portal guides driven by shared step definitions; interactive references must use existing typed routes to prevent instructions drifting from navigation.

- AI assistant: server function `askAssistant` (Lovable AI Gateway SDK) answers only from `articles`; threads/messages are per-user RLS tables, never Supabase Edge Functions — keeps keys server-side and history private.
