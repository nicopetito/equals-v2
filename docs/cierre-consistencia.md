# Cierre de Consistencia Funcional — Equal

**Fecha:** 2026-05-30  
**Sprints completados:** Sprint 1, Sprint 2, Sprint 3 + Auditoría de cierre

---

## Resumen ejecutivo

Tres sprints sucesivos llevaron al sistema desde un estado con 5 errores críticos de cálculo hasta un sistema con integridad de datos completa, protección de relaciones, visibilidad de anomalías y diagnóstico en tiempo real.

| Sprint | Foco | Estado |
|--------|------|--------|
| Sprint 1 | Cálculos: patrimonio, CSV, montos, refunds, huérfanas en dashboard | ✅ Cerrado |
| Sprint 2 | Protección: delete de billeteras/categorías, cap de refunds, trazabilidad | ✅ Cerrado |
| Sprint 3 | Visibilidad: recurrentes inválidas, sin categoría, System Health | ✅ Cerrado |
| Auditoría | 2 bugs encontrados y corregidos, documentación final | ✅ Cerrado |

---

## Reglas de negocio — tabla final consolidada

### Billeteras
| Regla | Condición de bloqueo |
|-------|---------------------|
| No eliminar con transacciones | `transactionCount > 0` |
| No eliminar con saldo ≠ 0 | `currentBalance ≠ 0` |
| No eliminar con plazo fijo activo/maduro | `activeFixedTerms > 0` |
| No eliminar con reintegros pendientes/acreditados | `pendingRefunds > 0` |
| No eliminar con operaciones programadas asignadas | `recurringCount > 0` *(corregido en auditoría)* |

### Categorías
| Regla | Condición de bloqueo |
|-------|---------------------|
| No eliminar con transacciones asociadas | `transactionCount > 0` |
| Eliminar con presupuestos (con confirmación) | Solo advierte count, no bloquea |

### Reintegros
| Regla | Validación |
|-------|-----------|
| Cap total | `Σ(pending + credited) + nuevo ≤ monto_original` en `create()` |
| Cap al acreditar | `Σ(credited) + este ≤ monto_original` en `creditAtomic()` |

### Patrimonio
| Regla | Comportamiento |
|-------|---------------|
| Plazo fijo usa `estimated_total` | El total incluye interés estimado |
| Desglose separado | "Capital invertido" + "Interés estimado" cuando hay interés |

### Transacciones / Dashboard
| Regla | Comportamiento |
|-------|---------------|
| KPIs excluyen huérfanas | `kpiFiltered` = transacciones con billetera vigente |
| Tasa de ahorro excluye refunds | `calculateSavingsMetrics()` descuenta `refundIncome` de `realIncome` |
| HealthScore usa valores netos | Recibe `savingsMetrics.realIncome` y `savingsMetrics.consumerExpenses` |

### Importación CSV
| Regla | Comportamiento |
|-------|---------------|
| Requiere billetera | Bloquea importación si alguna fila tiene `wallet_id = null` |
| Montos inválidos | `parseArgentineAmount()` retorna `null`; la fila se marca con `_error` |

### Operaciones recurrentes
| Regla | Comportamiento |
|-------|---------------|
| Billetera inválida | Badge "Billetera inválida" + botón de ejecución oculto |
| Ejecución bloqueada | `handleExecute()` aborta con toast descriptivo si billetera no existe |
| Solo flujo atómico | `execute()` marcado `@deprecated`; UI usa solo `executeAtomic()` |

### Presupuestos
| Regla | Comportamiento |
|-------|---------------|
| Banner sin categoría | Muestra count + total de gastos sin categoría del período actual |
| Categoría eliminada | Se muestra como "Categoría eliminada" (gris itálico) |

### Sistema
| Regla | Comportamiento |
|-------|---------------|
| Categoría eliminada en estadísticas | Aparece como "Categoría eliminada" (gris) en top de categorías |
| `?category_id=<id>` en transactions | Activa `filterCategory` (corregido en auditoría) |
| `?uncategorized=true` | Alias de `?no_category=true` |

---

## Archivos modificados — todos los sprints

| Archivo | Sprint | Cambio |
|---------|--------|--------|
| `utils/finance.ts` | S1, S2 | `isRefundTransaction()`, `calculateSavingsMetrics()`, `NetWorthBreakdown`, `calculateNetWorth()` |
| `components/ui/NetWorthSparkline.tsx` | S1, S2 | Reescrito con `calculateNetWorth()`; desglose capital/interés |
| `app/(dashboard)/import/page.tsx` | S1 | Bloqueo si `wallet_id = null` |
| `utils/csv.ts` | S1 | `parseArgentineAmount()` retorna `null` en fallo |
| `app/(dashboard)/dashboard/page.tsx` | S1 | KPIs con `kpiFiltered` + `calculateSavingsMetrics()` |
| `services/wallets.service.ts` | S2, Auditoría | `getDeleteImpact()` + `recurringCount` |
| `app/(dashboard)/wallets/page.tsx` | S2, Auditoría | Modal bloqueo condicional + `recurringCount` |
| `services/categories.service.ts` | S2 | `getDeleteImpact()` con `transactionCount + budgetCount` |
| `app/(dashboard)/categories/page.tsx` | S2 | Modal de confirmación, bloqueo por transacciones |
| `services/refund.service.ts` | S2 | Cap total en `create()` y `creditAtomic()` |
| `hooks/useRefunds.ts` | S2 | `console.error` en `usePendingRefunds` |
| `app/(dashboard)/estadisticas/page.tsx` | S2 | "Categoría eliminada" en top categories |
| `app/(dashboard)/budgets/page.tsx` | S2, S3 | "Categoría eliminada" + banner sin categoría |
| `services/recurring.service.ts` | S3 | `execute()` marcado `@deprecated` |
| `app/(dashboard)/scheduled/page.tsx` | S3 | Badge billetera inválida, bloqueo ejecución |
| `app/(dashboard)/transactions/page.tsx` | S3, Auditoría | Alias `uncategorized=true`, `?category_id=<id>` |
| `app/(dashboard)/health/page.tsx` | S3 | Página nueva: 6 checks + copia diagnóstico |
| `components/layout/Sidebar.tsx` | S3 | "Salud del sistema" en Herramientas |
| `docs/auditoria-consistencia.md` | S1 | C1–C5 marcados como corregidos |
| `docs/sprint-2-consistencia.md` | S2 | Documentación Sprint 2 |
| `docs/sprint-3-consistencia.md` | S3 | Documentación Sprint 3 |

---

## Casos de prueba manuales finales

| # | Escenario | Resultado esperado |
|---|-----------|-------------------|
| 1 | Usuario nuevo sin datos — abrir dashboard, budgets, health, scheduled | Sin banners, sin errores, sin falsos positivos |
| 2 | Importar CSV sin asignar billetera | Bloqueado: "hay filas sin billetera" |
| 3 | Importar CSV con monto inválido (`$abc`) | Fila marcada con error; no se importa como $0 |
| 4 | Crear gasto sin categoría → ir a Presupuestos | Banner amarillo visible; link a `/transactions?no_category=true` funciona |
| 5 | Crear billetera con transacción → intentar eliminar | Bloqueado: "tiene X transacciones" |
| 6 | Crear billetera con recurrente (sin historial) → intentar eliminar | Bloqueado: "tiene X operación(es) programada(s)" *(nuevo)* |
| 7 | Crear categoría con transacción → intentar eliminar | Bloqueado: "tiene transacciones" + link a `/transactions?category_id=<id>` funciona *(corregido)* |
| 8 | Gasto $10.000 → refund acreditado $7.000 → crear refund $4.000 | Error: "no puede superar el monto original" |
| 9 | Crear plazo fijo con TNA → ver Patrimonio neto | Muestra "Capital invertido" + "Interés estimado" separados |
| 10 | Crear recurrente válida → ejecutar | Usa `executeAtomic()`; transacción creada correctamente |
| 11 | Asignar recurrente a billetera → eliminar billetera (desde otro flujo si existe) → ir a Programadas | Badge "Billetera inválida" visible; botón de ejecución oculto |
| 12 | Abrir `/health` con sistema limpio | "Sistema saludable" en verde; 6 checks en verde |
| 13 | Abrir `/health` con huérfanas existentes | Check "Transacciones huérfanas" en rojo con link funcional |
| 14 | Click "Copiar diagnóstico técnico" | Toast de confirmación; texto estructurado en portapapeles |

---

## Problemas pendientes (backlog)

| ID | Descripción | Prioridad | Sprint origen |
|----|-------------|-----------|---------------|
| P1 | Reforzar cap de reintegros en RPC `rpc_refund_credit` con CHECK en BD | Alta | S2 |
| P2 | Billeteras: opción de reasignación masiva de transacciones antes de eliminar | Media | S2 |
| P3 | Categorías: opción de reasignación masiva antes de eliminar | Media | S2 |
| P4 | `cancelByTransaction()` en refund.service.ts silencia errores (solo `console.error`) | Baja | S2 |
| P5 | `getBudgetCount()` en categories.service.ts es redundante con `getDeleteImpact()` | Baja | S2 |
| P6 | Health page: exportar diagnóstico como `.txt` | Baja | S3 |
| P7 | Health page: historial de estados (timeline de integridad) | Baja | S3 |
| P8 | Estadísticas: ingresos brutos vs. netos (refunds) — actualmente muestra brutos en KPI cards | Info | Auditoría |

---

## Recomendaciones para módulos siguientes

### Auth / Onboarding

- El sistema ya es seguro de recibir un usuario nuevo (arrays vacíos manejados correctamente en todos los componentes).
- Al crear el primer usuario, considerar un flujo de onboarding que cree al menos una billetera antes de llegar al dashboard — evita la aparición prematura del badge "Billetera inválida" en recurrentes de demo.
- La página de Health (`/health`) puede ser útil durante el onboarding para confirmar que la cuenta está bien configurada.

### Datos iniciales / seeds

- Si se proveen transacciones de ejemplo al usuario nuevo, asegurarse de que todas tengan `wallet_id` válido — de lo contrario aparecerán como huérfanas en System Health.

### Base de datos

- P1 es el único pendiente de impacto en seguridad: reforzar el cap de reintegros directamente en el RPC `rpc_refund_credit` para prevención a nivel base de datos (actualmente solo validado en el cliente).

### Futuros módulos de reportes

- `calculateSavingsMetrics()` y `calculateNetWorth()` son los dos puntos centrales de verdad financiera — cualquier módulo de reportes debe usar estas funciones, no recomputar desde cero.
- `isRefundTransaction()` está exportada y es el único lugar donde se define qué es un reintegro — no duplicar esta lógica.

---

## Estado final

```
tsc --noEmit  → 0 errores
npm run build → OK — todas las rutas incluyendo /health
npm run lint  → 47 errores preexistentes (sin nuevos introducidos por los 3 sprints)
```
