# Sprint 2 — Integridad de datos y prevención de huérfanos

**Fecha:** 2026-05-30  
**Sprint anterior:** Sprint 1 (C1–C5 corregidos — ver `docs/auditoria-consistencia.md`)

---

## Resumen ejecutivo

Sprint enfocado en prevenir operaciones peligrosas que generan datos huérfanos o inconsistentes:
bloqueo de eliminación de billeteras/categorías con dependencias, validación de cap en reintegros,
visibilidad de errores en hooks, patrimonio estimado con plazo fijo y trazabilidad de categorías eliminadas.

---

## Problemas trabajados

### 1. Billeteras: bloqueo de hard delete peligroso

**Problema:** Una billetera podía eliminarse aunque tuviera transacciones, plazo fijo, saldo o reintegros asociados, dejando datos huérfanos.

**Archivos modificados:**
- `services/wallets.service.ts`
- `app/(dashboard)/wallets/page.tsx`

**Cambios:**
- `getDeleteImpact()` ahora también retorna `currentBalance` (consultado desde `wallet_current_balance` view).
- La consulta de refunds ahora incluye status `pending` y `credited` (antes solo `pending`).
- El modal de eliminación ahora distingue dos estados:
  - **Bloqueado** (cuando hay transacciones, saldo ≠ 0, plazo fijo activo, o reintegros): muestra los motivos y solo ofrece "Cerrar" + "Ver transacciones →".
  - **Libre** (ninguna condición): muestra confirmación y botón "Eliminar".
- Se eliminó el auto-cancel de reintegros pendientes al borrar. El usuario debe resolverlos antes.

**Regla de negocio:**
Una billetera se puede eliminar **solo si** no tiene transacciones, saldo = 0, sin plazos fijos activos/maduros, sin reintegros pendientes o acreditados.

---

### 2. Categorías: bloqueo de hard delete con transacciones

**Problema:** `getBudgetCount()` solo verificaba presupuestos, no transacciones. Una categoría con transacciones podía eliminarse, rompiendo estadísticas y presupuestos.

**Archivos modificados:**
- `services/categories.service.ts`
- `app/(dashboard)/categories/page.tsx`

**Cambios:**
- Se agregó `getDeleteImpact(id)` que retorna `{ transactionCount, budgetCount }` con dos queries paralelas.
- `handleDelete()` fue reescrito: carga el impacto y abre un modal de confirmación (antes usaba `window.confirm()`).
- El modal distingue:
  - **Bloqueado** si `transactionCount > 0`: muestra mensaje, no permite eliminar, ofrece "Ver transacciones →" (`/transactions?category_id=<id>`).
  - **Solo presupuestos**: confirma que se eliminarán N presupuestos antes de proceder.
  - **Libre**: elimina directamente con confirmación.
- Se agregó `confirmDeleteCategory()` separado del handler de carga de impacto.

**Regla de negocio:**
Una categoría con transacciones asociadas no puede eliminarse directamente.

---

### 3. Reintegros: validación de cap total

**Problema:** La suma de reintegros sobre una misma transacción podía superar el monto original, generando devoluciones mayores al gasto real.

**Archivo modificado:** `services/refund.service.ts`

**Cambios en `create()`:**
- Antes de insertar, consulta en paralelo:
  1. El monto de la transacción original (`transactions.amount`).
  2. La suma de todos los reintegros existentes con status `pending` o `credited` para ese `original_transaction_id`.
- Si `suma_existente + nuevo_monto > monto_original` → lanza error con mensaje descriptivo.
- Si la transacción original no se encuentra (ej: fue eliminada), el check se omite silenciosamente.

**Cambios en `creditAtomic()`:**
- Antes de llamar al RPC, verifica que el monto ya creditado + el monto de este reintegro no supere el original.
- Considera solo los refunds con status `credited` (no `pending`) porque el `create()` ya validó al crear.

**Pendiente:** Reforzar también en el RPC `rpc_refund_credit` con una migración SQL para prevención a nivel BD (no implementado en este sprint para no crear riesgo en migración).

**Caso de prueba:**
- Gasto: $10.000 → Refund acreditado: $7.000 → Nuevo refund $4.000 → **BLOQUEADO** ($11.000 > $10.000).

---

### 4. usePendingRefunds: no silenciar errores

**Problema:** `catch {}` silencioso impedía detectar fallos de migración o tabla inexistente.

**Archivo modificado:** `hooks/useRefunds.ts`

**Cambio:** Reemplazado `catch {}` por `catch (error) { console.error('[usePendingRefunds]', error) }`. El hook sigue siendo graceful (no rompe el dashboard), pero ahora el error queda registrado en consola.

---

### 5. Patrimonio neto: usar estimated_total en plazo fijo

**Problema:** `calculateNetWorth()` usaba `principal_amount` para plazo fijo, ignorando los intereses estimados.

**Archivos modificados:**
- `utils/finance.ts`
- `components/ui/NetWorthSparkline.tsx`

**Cambios en `calculateNetWorth()`:**
- `NetWorthBreakdown` tiene tres nuevos campos: `investmentsInterest`, `investmentsEstimated`.
- Para cada plazo fijo activo:
  - `investments` = suma de `principal_amount` (capital original).
  - `investmentsInterest` = suma de `estimated_total - principal_amount` cuando `estimated_total > principal_amount`.
  - `investmentsEstimated` = suma del valor estimado total (`estimated_total` si > principal, sino `principal_amount`).
  - `total` usa `investmentsEstimated` (patrimonio estimado).
- Fallback: si `estimated_total` es 0 o ≤ `principal_amount`, se usa `principal_amount`.

**Cambios en `NetWorthSparkline`:**
- Si hay interés estimado (`investmentsInterest > 0`): muestra dos filas: "Capital invertido" e "Interés estimado".
- Si no hay interés: mantiene la fila única "Inversiones" (comportamiento anterior).

**Regla de negocio:**
El patrimonio total usa el valor estimado del plazo fijo. El desglose distingue capital real e interés estimado no realizado.

---

### 6. Categorías eliminadas en estadísticas y presupuestos

**Problema:** Gastos con categoría eliminada aparecían como "Sin categoría", mezclándose con gastos genuinamente sin categoría.

**Archivos modificados:**
- `app/(dashboard)/estadisticas/page.tsx`
- `app/(dashboard)/budgets/page.tsx`

**Cambios en estadísticas:**
- En `topExpCategories` y `topIncCategories`: si `category_name` es null pero `category_id` está seteado → muestra "Categoría eliminada" en gris (`#9ca3af`).
- Si `category_id` también es null → mantiene "Sin categoría".

**Cambios en presupuestos:**
- En el card de presupuesto: si `category_name` es null → muestra "Categoría eliminada" en gris itálico.
- El color del indicador redondo usa `#9ca3af` en lugar del color original.

---

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `services/wallets.service.ts` | `getDeleteImpact()` agrega `currentBalance`, refunds amplía a `pending+credited` |
| `app/(dashboard)/wallets/page.tsx` | Modal con bloqueo condicional, sin auto-cancel de refunds |
| `services/categories.service.ts` | Nuevo método `getDeleteImpact()` con `transactionCount + budgetCount` |
| `app/(dashboard)/categories/page.tsx` | Nuevo modal de confirmación, bloqueo si hay transacciones, link a `/transactions?category_id=` |
| `services/refund.service.ts` | Validación de cap en `create()` y `creditAtomic()` |
| `hooks/useRefunds.ts` | `console.error` en `usePendingRefunds` |
| `utils/finance.ts` | `NetWorthBreakdown` con campos `investmentsInterest/investmentsEstimated`, `calculateNetWorth()` usa `estimated_total` |
| `components/ui/NetWorthSparkline.tsx` | Desglose "Capital invertido" + "Interés estimado" cuando existe interés |
| `app/(dashboard)/estadisticas/page.tsx` | Fallback "Categoría eliminada" en top categories |
| `app/(dashboard)/budgets/page.tsx` | Fallback "Categoría eliminada" en card de presupuesto |

---

## Reglas de negocio definidas

| Módulo | Regla |
|--------|-------|
| Billeteras | Eliminar solo si transactionCount=0, currentBalance=0, activeFixedTerms=0, pendingRefunds=0 |
| Categorías | Eliminar solo si transactionCount=0 (presupuestos pueden eliminarse en cascada) |
| Reintegros | `Σ(pending + credited) + nuevo ≤ monto_original` en create; `Σ(credited) + este ≤ monto_original` en credit |
| Patrimonio | `total` incluye `estimated_total` de plazo fijo activo; desglose muestra capital e interés por separado |
| Categorías eliminadas | Se muestran como "Categoría eliminada" (gris) en estadísticas y presupuestos, no mezcladas con "Sin categoría" |

---

## Casos de prueba manuales

| # | Caso | Resultado esperado |
|---|------|--------------------|
| 1 | Crear billetera con saldo 0 y sin movimientos → intentar eliminar | Se puede eliminar |
| 2 | Crear billetera con una transacción → intentar eliminar | Bloqueado: "tiene X transacciones asociadas" |
| 3 | Crear billetera con saldo positivo → intentar eliminar | Bloqueado: "saldo distinto de $0" |
| 4 | Crear billetera con plazo fijo activo → intentar eliminar | Bloqueado: "tiene X plazo(s) fijo(s) activo(s)" |
| 5 | Crear categoría con transacción → intentar eliminar | Bloqueado: "tiene transacciones asociadas" + link a /transactions |
| 6 | Crear categoría con presupuesto pero sin transacciones → intentar eliminar | Confirmación: "se eliminarán N presupuestos" |
| 7 | Gasto $10.000 → refund acreditado $7.000 → crear refund $4.000 | Error: "no puede superar el monto original" |
| 8 | Forzar error en usePendingRefunds (ej: desconectar) | Dashboard sigue funcionando; console.error registrado |
| 9 | Crear plazo fijo con TNA y estimated_total > principal | Patrimonio muestra "Capital invertido" + "Interés estimado" separados |
| 10 | Simular categoría eliminada (category_id existe, category_name null) | Estadísticas y presupuestos muestran "Categoría eliminada" (no "Sin categoría") |

---

## Pendientes detectados (no abordados en Sprint 2)

| ID | Descripción | Prioridad |
|----|-------------|-----------|
| P1 | Reforzar cap de reintegros en RPC `rpc_refund_credit` con CHECK en BD | Alta |
| P2 | Billeteras: opción de reasignación masiva de transacciones (antes de eliminar) | Media |
| P3 | Categorías: opción de reasignación masiva de transacciones antes de eliminar | Media |
| P4 | `cancelByTransaction()` en refund.service.ts silencia errores parcialmente (`console.error` sin relanzar) | Baja |
| P5 | `getBudgetCount()` sigue sin ser eliminado — es redundante con `getDeleteImpact()`, puede removerse en refactor futuro | Baja |
