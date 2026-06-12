# Deployment Guide — Vercel

## Variables de entorno requeridas

Configurarlas en Vercel → Project → Settings → Environment Variables.
**Solo se necesitan estas dos variables.** No existe service role key ni ninguna clave privada en esta app.

| Variable | Descripción | Dónde encontrarla |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase | Supabase dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anon/pública de Supabase | Supabase dashboard → Settings → API → Project API keys → `anon public` |

Configurar ambas variables para los entornos **Production**, **Preview** y **Development**.

## Configuración del proyecto en Vercel

| Configuración | Valor |
|---|---|
| Framework Preset | Next.js (autodetectado) |
| Build Command | `npm run build` (default) |
| Output Directory | `.next` (default) |
| Install Command | `npm ci` |
| Node.js Version | 20.x |

No se requiere `vercel.json`. El preset de Next.js maneja el routing, el middleware (`proxy.ts`) y los assets estáticos.

## Checklist pre-deploy

### Base de datos (Supabase)
- [ ] Todas las migraciones en `supabase/migrations/` aplicadas al proyecto de producción (001 hasta 047 en orden)
- [ ] Verificar en el SQL editor de Supabase que existen los 18 RPCs: `SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE 'rpc_%';`
- [ ] Confirmar que RLS está habilitado en tablas sensibles (ver sección de seguridad más abajo)
- [ ] La configuración de email en Supabase Auth está lista para producción (confirmación por email, etc.)

### Vercel
- [ ] Ambas variables de entorno configuradas para el entorno Production
- [ ] Dominio personalizado configurado (si aplica)
- [ ] El repositorio de GitHub está conectado para deploys automáticos en push a `main`

### CI
- [ ] El workflow de GitHub Actions (`.github/workflows/quality.yml`) pasa en verde en el branch que se va a deployar

## Aplicar migraciones al proyecto Supabase de producción

**Opción A — Supabase CLI:**
```bash
supabase link --project-ref <tu-project-ref>
supabase db push
```

**Opción B — Manual (SQL editor de Supabase):**
Ejecutar cada archivo `.sql` en `supabase/migrations/` en orden numérico (001 → 047). Cada archivo usa `CREATE OR REPLACE FUNCTION` y es idempotente para las RPCs.

## Seguridad — verificación de RLS

Los 18 RPCs tienen `SECURITY DEFINER` + `SET search_path = ''` + verificación de `auth.uid()` + `REVOKE EXECUTE FROM public/anon`. Esto protege todas las mutaciones.

Verificar adicionalmente en el Supabase dashboard (Table Editor → cada tabla → Edit table → "Enable Row Level Security") que RLS está **ON** para:
- `transactions`
- `wallets`
- `categories`
- `goals`
- `goal_movements`
- `fixed_terms`
- `refunds`
- `scheduled_transactions`

Si alguna tabla tiene RLS **OFF**, aplicar la migración `048_enable_rls_on_core_tables.sql` (ver template en el plan de Fase 6).

## Problemas comunes

**Build falla con "supabaseUrl is required"**
Las variables de entorno no están configuradas o no están en el scope correcto. Verificar en Vercel → Settings → Environment Variables que ambas están presentes en el scope Production.

**Loop de redirección en auth post-deploy**
Verificar que la "Site URL" del proyecto Supabase (Authentication → URL Configuration) coincide exactamente con el dominio de producción, ej. `https://equal.vercel.app`. Agregar el dominio también en "Redirect URLs".

**Errores "Failed to fetch" en producción**
Verificar que `NEXT_PUBLIC_SUPABASE_URL` apunta al proyecto correcto (no a un proyecto dev). Confirmar que el proyecto Supabase no está pausado (el plan gratuito pausa proyectos inactivos por más de 1 semana).

**Middleware no redirige correctamente**
El middleware de esta app está en `proxy.ts` (no en `middleware.ts`). Verificar que `next.config.ts` lo registra correctamente y que exporta `middleware` y `config.matcher`.

## Post-deploy

Ejecutar el smoke test en [deploy-smoke-test.md](./deploy-smoke-test.md).
