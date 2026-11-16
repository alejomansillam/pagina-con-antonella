# Portal del Estudio · Mansilla Garzón & Asoc.

Portal interno del equipo: padrones, plantillas, campañas, equipos, calendario, chat interno, constancias y capacitación.

- **Sitio:** https://pagina-con-antonella.vercel.app (Vercel publica solo cada cambio en `main`).
- **Base de datos, login y archivos:** Supabase, proyecto `portal-estudio`.
- **Estructura de la base:** `supabase/schema.sql`.

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Para qué |
| --- | --- |
| `VITE_SUPABASE_URL`, `SUPABASE_URL` | URL del proyecto de Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PUBLISHABLE_KEY` | Clave pública de Supabase |
| `ANTHROPIC_API_KEY` | Asistente con IA (opcional) |
| `VACATIONS_SHEET_ID` | Planilla de vacaciones en Drive (opcional) |

## Desarrollo local

```sh
npm install
npm run dev
```

Requiere un archivo `.env` con las variables de arriba.
