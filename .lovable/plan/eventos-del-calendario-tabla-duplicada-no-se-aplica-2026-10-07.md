# Eventos del calendario — tabla duplicada, no se aplica

## Situación

El SQL propuesto crea una tabla `calendario_eventos`, pero el portal **ya tiene** esa funcionalidad con la tabla `calendar_events` (migración 0018), que la página de Calendario ya usa:

| Propuesto (`calendario_eventos`) | Existente (`calendar_events`) |
|---|---|
| `fecha DATE` | `event_date DATE` |
| `tipo` con feriado/cumpleanos/reunion/otro | `kind` con los mismos 4 valores |
| `titulo`, `nota`, `created_by`, `created_at` | `title`, `note`, `created_by`, `created_at` |
| Lectura: todos los autenticados | Lectura: miembros del estudio (`is_firm_member()`) |
| Escritura: Admin y Senior | Escritura: `can_edit()` (Admin y Senior) |

## Decisión

**No crear la tabla nueva.** Hacerlo duplicaría los eventos en dos lugares y la página seguiría leyendo la tabla vieja, así que los datos quedarían partidos y desactualizados.

## Qué se hace en su lugar

1. Verificar que la página de Calendario funciona con la tabla existente: agregar, editar y eliminar un evento con la cuenta de Antonella (Admin/Senior).
2. Si la verificación sale bien, no se toca nada de base de datos.
3. Si aparece algún error concreto al guardar o borrar, se corrige sobre `calendar_events` y sus políticas, sin crear tablas nuevas.

## Nota técnica

El SQL propuesto además fallaría tal cual: los roles en la base están en minúsculas (`admin`, `senior`), no `'Admin'`/`'Senior'`, y falta el `GRANT` que la API de datos necesita para leer la tabla.
