# Auditoría de Consistencia Funcional — Equal v2

**Fecha:** 2026-05-30  
**Autor:** Claude Code (auditoría estática)  
**Estado:** Sprint 1 completado (2026-05-30) — C1–C5 corregidos

---

## Resumen ejecutivo

Se auditaron 12 módulos del sistema. Se identificaron **5 problemas críticos**, **6 altos**, **6 medios** y **4 de observación**. Los problemas más graves afectan la visualización del patrimonio neto (el sparkline lo calcula desde 0 ignorando balances reales), la importación CSV (permite transacciones sin billetera sin advertencia bloqueante) y la tasa de ahorro (inflada por refunds contados como ingresos reales).

La arquitectura general es sólida: todas las operaciones destructivas usan RPCs atómicos, `safeNumber()` se aplica consistentemente, y la mayoría de las mutaciones críticas están correctamente validadas en la base de datos. Los problemas son puntuales pero de alto impacto visual y financiero.

---

## Módulos

### 1. Dashboard

**Fuente de datos:**
- Transacciones: `transactions_with_details` (view) — hook `useTransactions()`
- Billeteras: `wallet_current_balance` (view) — hook `useWallets()`
- Objetivos: `goals` — hook `useGoals()`
- Plazo fijo: `fixed_terms` — hook `useFixedTerms()`
- Reintegros pendientes: `refunds` — hook `usePendingRefunds()`

**Filtros aplicados:**
- Período seleccionado (this_month, last_month, 7_days, etc.) sobre transacciones
- Moneda seleccionada (o "todas")
- `user_id` siempre presente

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| D1 | Las transacciones huérfanas (sin wallet_id válido) **se incluyen en los totales de ingresos/gastos** pero **no en los balances de billeteras**. El usuario ve ingresos de $X pero el disponible es menor. | `dashboard/page.tsx:155-170` (stats incluye todos), `183-190` (orphanStats es solo alerta) | 🔴 Crítico |
| D2 | `usePendingRefunds` silencia errores completamente. Si la tabla no existe, el dashboard no avisa. | `hooks/useRefunds.ts:39` `.catch(() => {})` | 🟠 Alto |
| D3 | El cálculo de `savingsMetrics` incluye refunds acreditados como ingresos reales, inflando la tasa de ahorro. | `utils/finance.ts:21-48`, `dashboard/page.tsx:172` | 🔴 Crítico |
| D4 | `NetWorthSparkline` calcula el patrimonio acumulando deltas de transacciones desde 0, ignorando el balance inicial de las billeteras. Ver sección Patrimonio Neto. | `components/ui/NetWorthSparkline.tsx:40-66` | 🔴 Crítico |

**Comportamiento correcto:** Las alertas de huérfanas y sin categoría SÍ están implementadas (`orphanStats`, `uncategorizedStats`). No se ocultan datos. El problema es que los totales no excluyen las huérfanas.

---

### 2. Billeteras

**Fuente de datos:** `wallet_current_balance` (view SQL) para listado con saldo. `wallets` (tabla) para CRUD.

**Filtros aplicados:** `user_id`.

**Cómo se calcula el balance:** La view `wallet_current_balance` computa `initial_balance + SUM(transactions WHERE wallet_id = wallets.id AND type = 'income') - SUM(... type = 'expense')`. Si una transacción tiene `wallet_id = NULL`, no afecta a ninguna billetera.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| B1 | Hard delete sin soft-delete. Al eliminar una billetera, las transacciones que la referenciaban quedan con `wallet_id` apuntando a un registro inexistente (FK rota dependiendo de las constraints del esquema). | `wallets.service.ts:108-120` | 🟠 Alto |
| B2 | `getDeleteImpact()` advierte sobre transacciones, fixed_terms y refunds pendientes, pero el usuario puede confirmar de todos modos. No hay bloqueo en caso de saldo positivo o transacciones críticas. | `wallets.service.ts:83-106` | 🟡 Medio |
| B3 | El diagnóstico (`rpc_wallet_diagnostics`) existe pero no se expone en la UI de forma proactiva. Los usuarios no saben que pueden ejecutarlo. | `wallets.service.ts:122-136`, `supabase/migrations/017_rpc_wallet_diagnostics.sql` | 🔵 Bajo |

**Positivo:** `safeNumber()` aplicado en todos los campos NUMERIC de la view (`initial_balance`, `transaction_total`, `current_balance`, `transaction_count`).

---

### 3. Transacciones

**Fuente de datos:** `transactions_with_details` (view) para listado. `transactions` (tabla) para CRUD.

**Filtros aplicados:** `user_id`, tipo, `wallet_ids[]`, `category_ids[]`, moneda, fechas, búsqueda textual.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| T1 | Una transacción puede tener `wallet_id = NULL`. Esto es válido a nivel de schema pero provoca inconsistencia entre ingresos/gastos y balances. La detección de huérfanas existe (`transactions/page.tsx: filterOrphan`) pero no bloquea la creación. | `utils/csv.ts:313`, `dashboard/page.tsx:183-190` | 🔴 Crítico (vía CSV) |
| T2 | Una transacción puede tener `category_id = NULL`. Gastos sin categoría no impactan presupuestos. Tampoco aparecen en estadísticas por categoría. La UI muestra alerta de count pero no etiqueta "Sin categoría" en cada fila. | `budgets.service.ts` (no consulta tx sin category), `estadisticas/page.tsx` | 🟠 Alto |

**Positivo:** Detección de huérfanas en el filtro de transacciones. Protección contra edición de transacciones con refunds creditados. Batch insert atómico.

---

### 4. Categorías

**Fuente de datos:** `categories` (tabla).

**Filtros aplicados:** `user_id`, `order by name`.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| C1 | Hard delete de categorías. `getBudgetCount()` advierte sobre presupuestos, pero **no verifica transacciones** con esa categoría. Al eliminar, las transacciones quedan con `category_id` inválido (FK rota o null si hay CASCADE). | `categories.service.ts:91-103`, `getBudgetCount` solo cuenta budgets | 🟠 Alto |
| C2 | Gastos de categorías eliminadas no aparecen en estadísticas por categoría ni se asignan a ningún presupuesto. Se pierden silenciosamente en los breakdowns. | `estadisticas/page.tsx`, `budgets.service.ts` | 🟠 Alto |

**Positivo:** `getBudgetCount()` advierte antes de eliminar cuando hay presupuestos asociados. Manejo correcto de categorías con join nullable en budgets.

---

### 5. Presupuestos

**Fuente de datos:** `budgets` (tabla) con join a `categories`.

**Filtros aplicados:** `user_id`, `month`, `year`.

**Cómo se calcula el gasto vs. presupuesto:** En el cliente, se cruzan las transacciones del mes con `category_id` del presupuesto. Los refunds creditados se descuentan vía `buildCreditedRefundMap()`.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| P1 | Los gastos sin categoría (`category_id = NULL`) no se asignan a ningún presupuesto. No hay presupuesto "Sin categoría" ni aviso en la página de presupuestos de que hay gastos no cubiertos. | `utils/finance.ts:53-61`, lógica de cruce en presupuestos | 🟡 Medio |
| P2 | Si una categoría se elimina, los presupuestos de ese mes/año retienen el registro pero `category_name/color/icon` vienen `null` (join devuelve null). Se muestran como "categoría eliminada" solo si la UI lo maneja; si no, puede mostrar campos vacíos. | `budgets.service.ts:29-31` (manejo de null correcto, depende del componente UI) | 🟡 Medio |
| P3 | `copyFromMonth()` no verifica si las categorías de los presupuestos origen siguen existiendo. Puede copiar presupuestos con `category_id` inválido. | `budgets.service.ts:100-133` | 🔵 Bajo |

**Positivo:** `buildCreditedRefundMap()` descuenta correctamente refunds creditados del gasto presupuestado. Manejo de error 23505 (presupuesto duplicado). `safeNumber()` aplicado.

---

### 6. Estadísticas

**Fuente de datos:** Mismo que dashboard (transacciones + billeteras + objetivos + plazo fijo).

**Filtros aplicados:** Período, moneda, `user_id`.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| E1 | `HealthScore` recibe `income` y `expenses` brutos. Los refunds acreditados (tipo `income`, descripción `'Reintegro: ...'`) se cuentan como ingresos reales. La tasa de ahorro mostrada es falsamente positiva cuando hay refunds. | `components/ui/HealthScore.tsx:43-57`, `estadisticas/page.tsx` | 🔴 Crítico |
| E2 | El gráfico `NetWorthSparkline` recibe transacciones, no balances. Calcula el "patrimonio" acumulando `income - expense` desde 0. Ignora el balance inicial de billeteras, los objetivos y el plazo fijo. | `components/ui/NetWorthSparkline.tsx:40-66` | 🔴 Crítico |
| E3 | `calculateNetWorth()` sí usa balances reales. Sin embargo el `total` mostrado es siempre el snapshot actual, no histórico. No es posible ver "¿cuánto patrimonio tenía hace 3 meses?". | `utils/finance.ts:70-106` | 🟡 Medio |
| E4 | Los intereses estimados de plazo fijo (`estimated_total`) no se incluyen en el patrimonio neto. Solo se usa `principal_amount`. | `utils/finance.ts:99` | 🟠 Alto |

**Positivo:** El cálculo `calculateNetWorth()` es correcto (liquid + goals + investments, sin doble conteo). Cuando el RPC `rpc_goal_deposit` registra el aporte, descuenta de la billetera y suma al objetivo, por lo que `wallet.current_balance` baja y `goal.current_amount` sube — no hay doble conteo en el patrimonio real.

---

### 7. Reintegros

**Fuente de datos:** `refunds` (tabla).

**Filtros aplicados:** `user_id`, `status`, `original_transaction_id`, `destination_wallet_id`.

**Flujo al acreditar:** `rpc_refund_credit` → crea transacción tipo `income` con descripción `'Reintegro: {desc_original}'` → actualiza status a `credited`.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| R1 | Los refunds acreditados generan una transacción `income`. `calculateSavingsMetrics()` **no distingue** estas transacciones de ingresos reales, inflando `income`, `realIncome` y `savingsRate`. | `utils/finance.ts:31-33`, `supabase/migrations/007_rpc_refund_credit.sql:54` | 🔴 Crítico |
| R2 | No hay validación de cap total de refunds sobre una misma transacción. Teóricamente se pueden acreditar múltiples refunds cuya suma supere el monto original. | `refund.service.ts` (sin cap check), `007_rpc_refund_credit.sql` (sin validación de suma) | 🟠 Alto |
| R3 | `usePendingRefunds` silencia el error silenciosamente en lugar de al menos hacer `console.error`. Si la migración no se aplicó o la tabla no existe, el hook retorna silencio. | `hooks/useRefunds.ts:39` | 🟠 Alto |

**Positivo:** `original_transaction_id` siempre validado. `destination_wallet_id` validado en el RPC. Estado no puede ser acreditado dos veces (línea 35-37 del RPC). Cancelación en cascada cuando se elimina la transacción original.

---

### 8. Objetivos

**Fuente de datos:** `goals` (tabla), `goal_movements` (tabla).

**RPCs:** `rpc_goal_deposit`, `rpc_goal_withdraw` — ambos atómicos.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| O1 | El listado general de objetivos hace `select('*')` sin cargar `goal_movements`. Los movimientos solo están disponibles en `getById()`. Si en el futuro un componente necesita el historial desde la lista, no lo tendrá. | `goals.service.ts:22` vs `goals.service.ts:41` | 🔵 Bajo |
| O2 | La detección de aportes/retiros de objetivos en `calculateSavingsMetrics()` depende del prefijo de descripción `'Aporte a objetivo:'`. Si el RPC cambia la descripción, las transacciones no se clasificarán correctamente. Actualmente coincide (el RPC produce `'Aporte a objetivo: {nombre}'` y `startsWith('Aporte a objetivo:')` funciona). | `utils/finance.ts:7-8`, `supabase/migrations/001_rpc_goal_deposit.sql:57` | 🟡 Medio |

**Positivo:** El RPC `rpc_goal_deposit` valida: autenticación, monto > 0, que el objetivo exista y pertenezca al usuario, que la billetera exista con saldo suficiente. El flujo completo es atómico. No hay doble conteo en patrimonio porque la billetera pierde balance cuando se deposita al objetivo. `goal_movements` se crea correctamente en el RPC.

---

### 9. Plazo Fijo

**Fuente de datos:** `fixed_terms` (tabla).

**RPCs:** `rpc_fixed_term_create`, `rpc_fixed_term_withdraw`, `rpc_fixed_term_reinvest` — todos atómicos.

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| FT1 | El patrimonio neto usa `principal_amount`, no `estimated_total`. Los intereses estimados no se contabilizan en el patrimonio. Para usuarios con TNA alta o plazos largos, el patrimonio mostrado puede ser significativamente menor al real. | `utils/finance.ts:99` | 🟠 Alto |
| FT2 | No hay pre-validación client-side de que la billetera de origen existe y tiene saldo antes de llamar al RPC. El error del RPC se propaga como excepción, que la UI debería manejar pero podría mostrar un mensaje técnico. | `fixed_term.service.ts:45-79` | 🔵 Bajo |

**Positivo:** Degradación elegante si la tabla no existe (error 42P01). RPCs atómicos para crear, retirar y reinvertir. `parseFixedTerm()` aplica `safeNumber()` en todos los campos numéricos. `reinvestAtomic()` retira el plazo anterior y crea el nuevo en una sola transacción de BD — no hay doble conteo.

---

### 10. Recurrentes / Programadas

**Fuente de datos:** `recurring_transactions_with_details` (view). `recurring_transactions` (tabla) para CRUD.

**Ejecución:** Dos métodos disponibles: `execute()` (no atómico, llama a `transactionsService.create()`) y `executeAtomic()` (RPC `rpc_recurring_execute`).

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| RC1 | El método `execute()` no es atómico: crea la transacción y luego actualiza `next_date` en pasos separados. Si el segundo falla, la transacción queda registrada pero `next_date` no avanza. El método `executeAtomic()` sí es correcto; verificar que la UI use siempre este último. | `recurring.service.ts:122-137` vs `139-147` | 🟡 Medio |
| RC2 | Si la billetera asignada a una recurrente se elimina, `executeAtomic()` fallará con un error del RPC al intentar crear la transacción. No hay pre-validación ni aviso proactivo al usuario de que la recurrente tiene billetera inválida. | `recurring.service.ts:139-147`, RPC no expuesto para auditoría local | 🟡 Medio |

**Positivo:** Al eliminar una recurrente, se estampan las transacciones generadas con una nota de trazabilidad antes de que la FK quede nula. Hard delete controlado con audit trail.

---

### 11. Importación CSV

**Fuente de datos:** Archivo CSV del usuario → `rpc_transactions_batch_insert` (RPC atómico).

**Validaciones presentes en `utils/csv.ts`:**
- Fechas inválidas: detectadas y marcadas con `_error`
- Descripciones vacías: marcadas con `_error`
- Formato de monto: `parseArgentineAmount()` maneja formatos AR/EU/USA

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| CSV1 | El CSV puede importarse sin seleccionar billetera (`defaultWalletId` undefined → `null`). El RPC inserta sin error. Las transacciones quedan con `wallet_id = NULL` — huérfanas desde el primer momento. No hay validación bloqueante en la UI ni en el RPC. | `utils/csv.ts:313`, `supabase/migrations/013_rpc_transactions_batch_insert.sql:34` | 🔴 Crítico |
| CSV2 | Si un monto no puede parsearse (ej. `"INVALIDO"`, string vacío), `parseArgentineAmount()` retorna `0`. La fila se importa con `amount = 0` sin marcarla como error. | `utils/csv.ts:188`, `209: parseFloat(cleaned) \|\| 0` | 🟠 Alto |
| CSV3 | La detección de duplicados funciona solo dentro del mismo archivo (fingerprint en memoria). No detecta si ya existe en la base de datos una transacción idéntica de una importación anterior. | `app/(dashboard)/import/page.tsx` (fingerprint local) | 🔵 Bajo |
| CSV4 | `category_id` puede ser null si el usuario no seleccionó categoría por defecto. Las transacciones importadas sin categoría no impactarán presupuestos ni estadísticas por categoría. No hay advertencia bloqueante. | `utils/csv.ts:314` | 🟡 Medio |

**Positivo:** `rpc_transactions_batch_insert` es atómico (todos o ninguno). Fechas inválidas sí se marcan como error. Formatos de monto AR/EU/USA correctamente detectados. Detección de duplicados dentro del archivo funciona.

---

### 12. Patrimonio Neto

**Fuente de datos:** `calculateNetWorth(wallets, goals, fixedTerms)` en `utils/finance.ts`.

**Fórmula real (correcta):**
```
liquid      = SUM(wallet.current_balance)
goals       = SUM(goal.current_amount WHERE NOT is_completed)
investments = SUM(fixed_term.principal_amount WHERE status = 'active')
total       = liquid + goals + investments
```

**Problemas detectados:**

| # | Problema | Evidencia | Severidad |
|---|----------|-----------|-----------|
| PN1 | `NetWorthSparkline` **ignora la fórmula correcta** y en su lugar acumula `income - expense` de las últimas transacciones, arrancando desde 0. Esto produce valores completamente incorrectos para usuarios con balance inicial. | `components/ui/NetWorthSparkline.tsx:40-66` | 🔴 Crítico |
| PN2 | Los intereses de plazo fijo no se incluyen (`principal_amount` en lugar de `estimated_total`). | `utils/finance.ts:99` | 🟠 Alto |
| PN3 | El patrimonio no es histórico. No se puede calcular "¿cuánto tenía el 1 de enero?". El sparkline intenta suplir esto pero de forma incorrecta. | `utils/finance.ts:70-106` | 🟡 Medio |
| PN4 | Las transacciones huérfanas (sin billetera) afectan los totales de ingresos/gastos pero no el `liquid` del patrimonio. Esto crea una brecha entre "lo que ingresé" y "lo disponible". | `dashboard/page.tsx:155-170`, `utils/finance.ts:82-88` | 🟠 Alto (vía CSV1/D1) |

**Positivo:** No hay doble conteo entre liquid, goals e investments. El flujo de depósito en objetivo (`rpc_goal_deposit`) descuenta de la billetera y suma al objetivo atómicamente. El flujo de plazo fijo (`rpc_fixed_term_create`) descuenta de la billetera y crea el fixed_term atómicamente. El patrimonio calculado en `calculateNetWorth()` es numéricamente correcto para el estado actual.

---

## Tabla consolidada de problemas

| ID | Módulo | Problema | Archivo | Línea | Severidad | Estado |
|----|--------|----------|---------|-------|-----------|--------|
| C1 | Dashboard / Estadísticas | NetWorthSparkline calcula desde transacciones, ignora balances iniciales | `components/ui/NetWorthSparkline.tsx` | 40-66 | 🔴 Crítico | ✅ Corregido (Sprint 1) |
| C2 | Importación CSV | `wallet_id = null` sin advertencia bloqueante | `utils/csv.ts` | 313 | 🔴 Crítico | ✅ Corregido (Sprint 1) |
| C3 | Importación CSV | Montos con parse failure → 0 silencioso | `utils/csv.ts` | 209 | 🔴 Crítico | ✅ Corregido (Sprint 1) |
| C4 | Reintegros / Estadísticas | Refunds contados como ingresos reales, inflan tasa de ahorro y HealthScore | `utils/finance.ts` | 21-48 | 🔴 Crítico | ✅ Corregido (Sprint 1) |
| C5 | Dashboard | Transacciones huérfanas incluidas en totales income/expenses pero no en balances | `dashboard/page.tsx` | 155-190 | 🔴 Crítico | ✅ Corregido (Sprint 1) |
| A1 | Billeteras | Hard delete sin soft-delete — FK de transacciones queda rota | `wallets.service.ts` | 108-120 | 🟠 Alto | Requiere decisión |
| A2 | Categorías | Hard delete sin verificar transacciones huérfanas resultantes | `categories.service.ts` | 91-103 | 🟠 Alto | Requiere decisión |
| A3 | Reintegros | No hay cap total de refunds sobre una misma transacción | `refund.service.ts` / `007_rpc_refund_credit.sql` | — | 🟠 Alto | Pendiente |
| A4 | Reintegros | `usePendingRefunds` silencia errores sin log | `hooks/useRefunds.ts` | 39 | 🟠 Alto | Pendiente (fácil) |
| A5 | Patrimonio neto | Intereses de plazo fijo no incluidos (`principal` no `estimated_total`) | `utils/finance.ts` | 99 | 🟠 Alto | Pendiente |
| A6 | Categorías | Gastos de categorías eliminadas desaparecen de estadísticas y presupuestos | Impacto de A2 | — | 🟠 Alto | Requiere decisión |
| M1 | Recurrentes | `execute()` no atómico: transacción + next_date en 2 pasos | `recurring.service.ts` | 122-137 | 🟡 Medio | Requiere decisión |
| M2 | Recurrentes | Billetera eliminada → recurrente falla sin aviso proactivo | `recurring.service.ts` | 139-147 | 🟡 Medio | Pendiente |
| M3 | Presupuestos | Gastos sin categoría no aparecen en ningún presupuesto, sin aviso | `budgets.service.ts` | — | 🟡 Medio | Pendiente |
| M4 | Estadísticas | Patrimonio sin histórico (solo snapshot actual) | `utils/finance.ts` | 70-106 | 🟡 Medio | Requiere decisión |
| M5 | Objetivos | Detección de aportes/retiros por prefijo de descripción (frágil) | `utils/finance.ts` | 7-8 | 🟡 Medio | Requiere decisión |
| M6 | Importación CSV | `category_id` puede ser null sin advertencia | `utils/csv.ts` | 314 | 🟡 Medio | Pendiente |
| B1 | Objetivos | `goal_movements` no cargado en listado general | `goals.service.ts` | 22 | 🔵 Bajo | Pendiente (fácil) |
| B2 | Billeteras | Diagnóstico (`rpc_wallet_diagnostics`) no expuesto en UI proactivamente | `wallets.service.ts` | 122-136 | 🔵 Bajo | Pendiente |
| B3 | Importación CSV | Duplicados detectados solo dentro del archivo, no contra BD | `import/page.tsx` | — | 🔵 Bajo | Pendiente |
| B4 | Presupuestos | `copyFromMonth()` no verifica si categorías siguen existiendo | `budgets.service.ts` | 100-133 | 🔵 Bajo | Pendiente |

---

## Mejoras de diagnóstico propuestas

Estas mejoras son propuestas de implementación futura. Permiten al usuario detectar y entender inconsistencias sin modificar datos.

### 1. Banner de sistema: transacciones sin billetera
**Ubicación propuesta:** Barra superior del dashboard y de transacciones.  
**Contenido:** "Tenés N transacciones sin billetera asignada. Estas no afectan tu saldo disponible."  
**Acción:** Link directo al filtro de huérfanas en la página de transacciones.  
**Ya existe parcialmente:** `orphanStats` en dashboard muestra info pero no de forma prominente.

### 2. Filtro de transacciones huérfanas
**Ya implementado:** `filterOrphan` en `transactions/page.tsx`.  
**Mejora propuesta:** Exponerlo como chip/badge visible en la barra de filtros, no solo en código.

### 3. Banner de sistema: transacciones sin categoría
**Ubicación propuesta:** Página de presupuestos y estadísticas.  
**Contenido:** "N gastos sin categoría no se asignaron a ningún presupuesto."  
**Acción:** Link al filtro de sin categoría en transacciones.  
**Ya existe parcialmente:** `uncategorizedStats` en dashboard.

### 4. Vista de salud del sistema (System Health)
**Nueva sección propuesta** en configuración o herramientas:
- Transacciones huérfanas (sin wallet): `SELECT count(*) FROM transactions WHERE wallet_id IS NULL`
- Transacciones sin categoría: `SELECT count(*) FROM transactions WHERE category_id IS NULL`
- Presupuestos con categoría eliminada: cruce entre budgets y categories
- Recurrentes con billetera inválida: cruce entre recurring_transactions y wallets
- Refunds pendientes vencidos: refunds con `expected_date < NOW()` y `status = 'pending'`

### 5. Botón "Copiar diagnóstico técnico"
**En la vista de salud del sistema:** genera un JSON/texto con los conteos anteriores para facilitar el reporte de bugs.

---

## Soluciones recomendadas por problema

### C1 — NetWorthSparkline (Crítico, fácil de corregir)
**Solución:** Reemplazar el cálculo basado en transacciones por el cálculo real:
- Pasar `wallets`, `goals`, `fixedTerms` al componente (ya están disponibles en `estadisticas/page.tsx`)
- Usar `calculateNetWorth()` para el punto actual
- Para el histórico de meses: calcular el balance de cada mes usando `transaction_monthly_summary` o acumulando desde el primer mes con balance inicial sumado
- Alternativa simplificada: mostrar el patrimonio actual con su desglose (liquid + goals + investments) en lugar del sparkline histórico incorrecto, hasta implementar el histórico real

### C2 — CSV sin billetera (Crítico, cambio en UI)
**Solución:** En el paso de mapeo de columnas de la importación, validar que `defaultWalletId` sea un UUID válido antes de habilitar el botón "Importar". Mostrar error visible: "Seleccioná una billetera de destino antes de importar."

### C3 — Montos 0 silenciosos (Crítico, cambio en `csv.ts`)
**Solución:** En `parseArgentineAmount()`, retornar `null` cuando el monto no puede parsearse (no `0`). En `mapRowsToTransactions()`, si el monto es `null`, agregar `_error: 'Monto inválido'` a la fila. En la UI, mostrar filas con error y no permitir importarlas.

### C4 — Refunds en savings rate (Crítico, cambio en `finance.ts`)
**Solución:** Agregar prefijo `REFUND_PREFIX = 'Reintegro:'` en `utils/finance.ts`. En `calculateSavingsMetrics()`, identificar transacciones de refund y excluirlas de `realIncome` (o tratarlas como una categoría separada). El `HealthScore` debería usar `savingsMetrics.realIncome` en lugar de `income` bruto.

### C5 — Huérfanas en totales (Crítico, decisión de diseño)
**Solución A (preferida):** Excluir transacciones sin billetera de los cálculos de income/expenses en dashboard. Mostrar un banner explicando que N transacciones huérfanas no se contabilizan.  
**Solución B:** Mantenerlas en los totales pero mostrar un subtotal de "Transacciones sin billetera: $X" en el resumen.

### A4 — usePendingRefunds silencia errores (Alto, trivial)
**Solución:** Cambiar `.catch(() => {})` a `.catch(e => console.error('[usePendingRefunds]', e))`.

### A5 — Intereses de plazo fijo (Alto, cambio en `finance.ts`)
**Solución:** En `calculateNetWorth()`, reemplazar `ft.principal_amount` por `ft.estimated_total` para plazo fijo activo. Opcionalmente, separar `investments` en `principal` e `interest` para el desglose del patrimonio.

### M1 — execute() no atómico en recurrentes (Medio)
**Solución:** Verificar que la UI siempre llame `executeAtomic()` y no `execute()`. Si `execute()` es dead code, eliminarlo.

---

## Casos de prueba manuales sugeridos

### Suite 1: Transacciones huérfanas
1. Importar un CSV sin seleccionar billetera. Verificar que aparece error bloqueante (actualmente no ocurre).
2. Crear manualmente una transacción y borrar su billetera. Verificar que el dashboard muestra la alerta de huérfanas y que el balance de billeteras no incluye esa transacción.
3. Verificar que los totales de ingresos/gastos del dashboard incluyen la transacción huérfana (bug conocido C5).

### Suite 2: NetWorthSparkline
1. Crear una billetera con balance inicial de $100,000.
2. Registrar solo un gasto de $1,000.
3. Verificar que el sparkline en estadísticas muestra aproximadamente $99,000, no -$1,000.
4. (Actualmente fallará — mostrará -$1,000 porque parte de 0.)

### Suite 3: Refunds y tasa de ahorro
1. Registrar un ingreso de $5,000 y un gasto de $4,000. Tasa de ahorro esperada: 20%.
2. Acreditar un refund de $500.
3. Verificar que la tasa de ahorro sigue siendo ~20%, no ~26%.
4. (Actualmente mostrará ~26% porque el refund inflará el income.)

### Suite 4: Patrimonio y plazo fijo
1. Crear un plazo fijo de $10,000 con TNA 100% a 30 días (interés estimado $822).
2. Verificar que el patrimonio muestra $10,000 (actualmente) vs $10,822 (correcto).

### Suite 5: Categoría eliminada
1. Crear una transacción con categoría "Hogar".
2. Eliminar la categoría "Hogar" desde la configuración.
3. Verificar qué muestra estadísticas/presupuestos para esa transacción.
4. Verificar que el presupuesto de "Hogar" de ese mes no queda en estado inconsistente.

### Suite 6: Importación con monto inválido
1. Preparar un CSV con una fila que tenga el monto como texto (`"CREDITO"`).
2. Importar y verificar si la fila se marca como error o se importa con amount=0.
3. (Actualmente se importa con amount=0.)

### Suite 7: Recurrente con billetera eliminada
1. Crear una transacción recurrente con billetera "Brubank".
2. Eliminar la billetera "Brubank".
3. Intentar ejecutar la recurrente. Verificar que el error mostrado es comprensible para el usuario.

---

## Archivos a modificar (pendiente de implementación)

| Archivo | Cambio necesario | Prioridad |
|---------|-----------------|-----------|
| `components/ui/NetWorthSparkline.tsx` | Reescribir cálculo usando balances reales, no transacciones | 🔴 Crítico |
| `utils/finance.ts` | Excluir refunds de `realIncome`; usar `estimated_total` para plazo fijo | 🔴 Crítico |
| `utils/csv.ts` | `parseArgentineAmount` retorna null en lugar de 0 para fallo de parse | 🔴 Crítico |
| `app/(dashboard)/import/page.tsx` | Validar `wallet_id` obligatorio antes de permitir importar | 🔴 Crítico |
| `hooks/useRefunds.ts` | Cambiar `.catch(() => {})` por `.catch(e => console.error(...))` | 🟠 Alto (trivial) |
| `supabase/migrations/007_rpc_refund_credit.sql` | Considerar cap total de refunds sobre tx original | 🟠 Alto |
| `services/categories.service.ts` | Agregar conteo de transacciones en `getBudgetCount()` antes de eliminar | 🟠 Alto |
| `services/recurring.service.ts` | Verificar que la UI usa solo `executeAtomic()`, eliminar `execute()` si es dead code | 🟡 Medio |
| `app/(dashboard)/budgets/page.tsx` | Mostrar aviso cuando hay gastos sin categoría no cubiertos por presupuestos | 🟡 Medio |
