# Sprint 3 — Visibilidad, diagnóstico y protecciones adicionales

**Fecha:** 2026-05-30  
**Sprint anterior:** Sprint 2 (ver `docs/sprint-2-consistencia.md`)

---

## Resumen ejecutivo

Sprint enfocado en cuatro áreas: visibilidad completa de transacciones sin categoría, protección contra
ejecución de operaciones recurrentes con billetera inválida, página de diagnóstico de integridad del
sistema, y un alias de URL para filtrado por sin categoría.

---

## Problemas trabajados

### 1. Operaciones recurrentes: billetera inválida

**Problema:** Una operación recurrente podía tener asignada una billetera que ya no existe (fue eliminada).
Al intentar ejecutarla, el RPC fallaba con un error genérico sin contexto útil.

**Archivo modificado:** `app/(dashboard)/scheduled/page.tsx`

**Cambios:**
- `recurringService.execute()` marcado como `@deprecated` — usar `executeAtomic()` en su lugar. (completado en Sprint 3, en `services/recurring.service.ts`)
- Se computa `walletIds` (Set de IDs de billeteras vigentes) en el componente.
- `ScheduledCardProps` tiene nuevo campo `hasInvalidWallet?: boolean`.
- En `ScheduledCard`: cuando `hasInvalidWallet` es true, se muestra badge rojo "Billetera inválida" y el botón "Registrar pago/cobro" queda oculto.
- En `handleExecute()`: si la billetera está asignada pero no existe en el Set, se muestra toast con mensaje claro y se aborta la ejecución.

**Regla de negocio:**
Una operación recurrente con `wallet_id` apuntando a una billetera inexistente no puede ejecutarse.
El usuario debe editarla y reasignar una billetera válida.

---

### 2. Presupuestos: banner de gastos sin categoría

**Problema:** Los gastos sin categoría en el período actual no estaban incluidos en ningún presupuesto,
pero esto no se comunicaba visualmente en la página de presupuestos.

**Archivo modificado:** `app/(dashboard)/budgets/page.tsx`

**Cambios:**
- Nuevo `useMemo` `uncategorizedStats` que cuenta y suma gastos sin `category_id` del mes/año activo.
- Banner amarillo entre el gráfico y la lista de presupuestos, visible cuando `uncategorizedStats.count > 0`.
- El banner muestra: `N gasto(s) sin categoría en {Mes} {Año} — {Total} no asignados` con link a `/transactions?no_category=true`.

**Regla de negocio:**
Si hay gastos sin categoría en el período mostrado, se avisa al usuario con acceso directo al filtro.

---

### 3. Transacciones: alias `uncategorized=true`

**Problema:** Los links desde el banner de presupuestos usan `?no_category=true`, pero otros puntos de
la aplicación podrían usar `?uncategorized=true`. Ambos deben activar el mismo filtro.

**Archivo modificado:** `app/(dashboard)/transactions/page.tsx`

**Cambio:**
```typescript
// Antes:
const noCategory = searchParams.get('no_category')
// Después:
const noCategory = searchParams.get('no_category') ?? searchParams.get('uncategorized')
```

Ambos parámetros activan `filterNoCategory = true`.

---

### 4. Página de Salud del Sistema

**Problema:** No existía una forma de ver el estado de integridad de los datos en un solo lugar.
Los problemas (huérfanas, sin categoría, billeteras inválidas en recurrentes, etc.) requerían navegar
página por página.

**Archivo creado:** `app/(dashboard)/health/page.tsx`

**Checks implementados:**

| ID | Nombre | Crítico si… | Link |
|----|--------|-------------|------|
| orphans | Transacciones huérfanas | count > 0 | `/transactions?orphan=true` |
| uncategorized | Gastos sin categoría (mes actual) | count > 0 | `/transactions?no_category=true` |
| deleted_category_tx | Transacciones con categoría eliminada | count > 0 | — |
| invalid_wallet_recurring | Operaciones recurrentes con billetera inválida | count > 0 | `/scheduled` |
| deleted_category_budgets | Presupuestos con categoría eliminada | count > 0 | `/budgets` |
| overdue_refunds | Reintegros pendientes vencidos (+90 días) | count > 0 | — |

**UI:**
- Banner de estado general (OK / Advertencia / Crítico) con color semántico.
- Lista de 6 checks, cada uno con icono de estado, descripción y link de acción.
- Resumen de datos cargados (6 contadores).
- Botón "Copiar diagnóstico técnico" que genera texto estructurado con todos los checks y lo copia al portapapeles.

**Navegación:**
- Agregado a la sección "Herramientas" del sidebar (`components/layout/Sidebar.tsx`) con ícono `Activity`.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `services/recurring.service.ts` | `execute()` marcado como `@deprecated` |
| `app/(dashboard)/scheduled/page.tsx` | `walletIds` set, `hasInvalidWallet` prop, badge, bloqueo en `handleExecute()` |
| `app/(dashboard)/budgets/page.tsx` | `uncategorizedStats` useMemo, banner de sin categoría |
| `app/(dashboard)/transactions/page.tsx` | Alias `uncategorized=true` → `filterNoCategory` |
| `app/(dashboard)/health/page.tsx` | Página nueva: 6 checks + copia diagnóstico |
| `components/layout/Sidebar.tsx` | Nuevo ítem "Salud del sistema" en Herramientas |

---

## Reglas de negocio definidas

| Módulo | Regla |
|--------|-------|
| Recurrentes | Una operación con `wallet_id` inexistente muestra badge de error y no puede ejecutarse |
| Presupuestos | Si hay gastos sin categoría en el período, se muestra banner con link a filtro |
| Transacciones | `?uncategorized=true` y `?no_category=true` son equivalentes |
| Salud | La página agrega en un solo lugar el estado de integridad del sistema |

---

## Casos de prueba manuales

| # | Caso | Resultado esperado |
|---|------|--------------------|
| 1 | Crear operación recurrente con billetera → eliminar la billetera → ir a Programadas | Badge "Billetera inválida" visible en la tarjeta |
| 2 | Intentar ejecutar recurrente con billetera inválida desde el UI | Toast de error claro; sin ejecución |
| 3 | Tener gastos sin categoría en el mes actual → ir a Presupuestos | Banner amarillo con count y total |
| 4 | Navegar a `/transactions?uncategorized=true` | Se activa el filtro "sin categoría" |
| 5 | Navegar a `/health` | Página carga, muestra 6 checks con estados correctos |
| 6 | Click "Copiar diagnóstico" | Texto estructurado en portapapeles; toast de confirmación |
| 7 | Sin problemas de integridad → `/health` | Banner verde "Sistema saludable" |
| 8 | Tener transacción huérfana → `/health` | Check "Transacciones huérfanas" en rojo con link |

---

## Pendientes detectados (no abordados en Sprint 3)

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| P1 | Reforzar cap de reintegros en RPC `rpc_refund_credit` (Sprint 2 P1) | Alta |
| P2 | Billeteras: reasignación masiva antes de eliminar (Sprint 2 P2) | Media |
| P3 | Categorías: reasignación masiva antes de eliminar (Sprint 2 P3) | Media |
| P6 | Health page: exportar diagnóstico como PDF o archivo `.txt` | Baja |
| P7 | Health page: historial de estados (timeline de integridad) | Baja |
