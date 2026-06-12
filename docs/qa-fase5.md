# QA End-to-End — Fase 5 Equal

Checklist de escenarios manuales para un usuario limpio. Ejecutar en orden para simular un ciclo financiero completo.

---

## Convenciones

- **Resultado esperado** = comportamiento correcto verificable en UI
- **Regresión** = síntoma de que algo rompió con los cambios de Fase 4/5
- **KPI** = tarjetas de ingresos/gastos/balance en dashboard o estadísticas

---

## 1. Billetera con saldo inicial

**Pasos:**
1. Ir a Billeteras → Nueva billetera
2. Ingresar nombre "Banco X", moneda ARS, saldo inicial 50.000

**Resultado esperado:**
- Se crea una transacción con `transaction_kind = initial_balance`
- El saldo de la billetera muestra 50.000 ARS
- En Historial: aparece con badge "Saldo inicial"
- En Dashboard KPIs: NO aparece en Ingresos
- En Estadísticas KPIs: NO aparece en Ingresos
- En ReportModal → sección movimientos internos: aparece 1 saldo inicial

**Pantallas:** Billeteras, Historial, Dashboard, Estadísticas, ReportModal  
**Posibles regresiones:** Si aparece en KPIs de ingresos, falla el filtro de `REAL_TRANSACTION_KINDS`

---

## 2. Ingreso real

**Pasos:**
1. Nueva transacción → Tipo Ingreso, monto 10.000, categoría "Sueldo"

**Resultado esperado:**
- Aparece en Historial sin badge de kind especial (o badge "Ingreso")
- Dashboard: Ingresos sube en 10.000
- Estadísticas: Ingresos sube, tasa de ahorro se calcula correctamente
- ReportModal: aparece en "Ingresos reales"

**Pantallas:** Historial, Dashboard, Estadísticas, ReportModal  
**Posibles regresiones:** Si no aparece en KPIs, falla `REAL_TRANSACTION_KINDS.has('income')`

---

## 3. Gasto real

**Pasos:**
1. Nueva transacción → Tipo Gasto, monto 2.000, categoría "Supermercado"

**Resultado esperado:**
- Dashboard: Gastos sube en 2.000, Balance neto baja
- Tasa de ahorro en Estadísticas se recalcula
- ReportModal: aparece en "Gastos reales" y en top categorías

**Pantallas:** Historial, Dashboard, Estadísticas, ReportModal  
**Posibles regresiones:** Si no baja el balance, check `calculateSavingsMetrics`

---

## 4. Transferencia interna entre billeteras

**Pasos:**
1. Ir a Billeteras → transferir 5.000 de "Banco X" a otra billetera
2. Abrir Historial de transacciones

**Resultado esperado:**
- En Historial: aparece como UNA sola fila "Banco X → Billetera Y", con badge "Transferencia interna"
- Tooltip del badge: "Movimiento entre tus billeteras. No afecta tu balance total."
- Dashboard: KPIs de ingresos/gastos NO cambian (la transferencia no suma)
- El balance total de billeteras tampoco cambia (el dinero solo se movió)
- ReportModal: aparece 1 en "Transferencias" de movimientos internos

**Pantallas:** Historial, Dashboard, ReportModal  
**Posibles regresiones:**
- Si aparece como dos filas separadas: falla el colapso por `transfer_group_id`
- Si afecta KPIs: falla el filtro `REAL_TRANSACTION_KINDS`

---

## 5. Transferencia incompleta (simulable)

> Nota: Para simular, se puede crear una transacción con `transaction_kind='transfer'` y un `transfer_group_id` único sin par en la DB (via Supabase Studio o RPC).

**Resultado esperado:**
- En Historial: aparece la fila con indicador visual de "incompleta" (`_isIncomplete=true`)
- No crashea la página

**Pantallas:** Historial  
**Posibles regresiones:** Si crashea, revisar el manejo de `_isIncomplete` en el render

---

## 6. Depósito a reserva

**Pasos:**
1. Ir a la sección Reservas → crear reserva de 3.000 ARS

**Resultado esperado:**
- Aparece transacción con `transaction_kind = reserve_deposit`, badge "Depósito a reserva"
- Tooltip: "Dinero reservado, no gastado aún."
- Dashboard: NO cuenta en Gastos
- El saldo de la billetera origen baja en 3.000

**Pantallas:** Historial, Dashboard  
**Posibles regresiones:** Si baja los gastos en KPIs, falla el filtro de kinds

---

## 7. Retiro desde reserva

**Pasos:**
1. Liberar la reserva anterior

**Resultado esperado:**
- Transacción con `transaction_kind = reserve_withdrawal`, badge "Retiro de reserva"
- Tooltip: "Liberación de reserva, no es ingreso nuevo."
- Dashboard: NO cuenta en Ingresos
- El saldo de la billetera destino sube

**Pantallas:** Historial, Dashboard  
**Posibles regresiones:** Si aparece en ingresos, falla el filtro de kinds

---

## 8. Ajuste manual de billetera

**Pasos:**
1. Ir a Billeteras → ajuste manual de saldo (WalletAdjustmentModal)

**Resultado esperado:**
- Transacción con `transaction_kind = wallet_adjustment`, badge "Ajuste de saldo"
- Tooltip: "Corrección manual de saldo. No es ingreso ni gasto real."
- Dashboard: NO afecta KPIs de ingresos/gastos
- El saldo de la billetera refleja el valor ajustado

**Pantallas:** Billeteras, Historial, Dashboard  
**Posibles regresiones:** Si aparece en KPIs, falla el filtro

---

## 9. Reintegro pendiente

**Pasos:**
1. Nueva transacción → Gasto, marcar como "pendiente de reintegro"
2. Verificar que aparece en panel de Reintegros pendientes en Historial

**Resultado esperado:**
- El gasto original aparece en Historial normalmente
- El panel "Reintegros pendientes" muestra la entrada con estado "pendiente"
- El monto no se descuenta de gastos aún (el reintegro está pendiente)

**Pantallas:** Historial  
**Posibles regresiones:** Si no aparece en el panel, revisar `usePendingRefunds`

---

## 10. Reintegro acreditado

**Pasos:**
1. Sobre el reintegro pendiente → acreditar

**Resultado esperado:**
- Se crea una transacción con `transaction_kind = refund_credit`, badge "Reintegro acreditado"
- Tooltip: "Reintegro acreditado. Se incluye en ingresos pero separado del ahorro."
- Dashboard: aparece en Ingresos BRUTOS, pero `realIncome` (tasa de ahorro) NO lo incluye
- Estadísticas: `refundIncome` visible, no distorsiona la tasa de ahorro
- ReportModal: aparece en "Reintegros acreditados" (sección especial)

**Pantallas:** Historial, Dashboard, Estadísticas, ReportModal  
**Posibles regresiones:** Si altera la tasa de ahorro, revisar `calculateSavingsMetrics`

---

## 11. Rendimiento / Yield

**Pasos:**
1. Billetera con rendimiento automático configurado → ejecutar cálculo de yield

**Resultado esperado:**
- Transacción con `transaction_kind = yield` (o `subtype = 'yield'`), badge "Rendimiento"
- Tooltip: "Rendimiento estimado. Se muestra separado de ingresos."
- Dashboard: aparece en tarjeta "Rendimientos" separada, NO en Ingresos reales
- Tasa de ahorro NO se ve afectada por el yield
- ReportModal: sección "Rendimientos estimados" con detalle por billetera

**Pantallas:** Billeteras, Dashboard, ReportModal  
**Posibles regresiones:** Si yield aparece en tasa de ahorro, revisar `calculateSavingsMetrics`

---

## 12. Dashboard

**Verificar:**
- [ ] KPIs de Ingresos/Gastos/Balance neto son correctos (excluyen internos)
- [ ] Tarjeta "Rendimientos" aparece si hay yields en el período
- [ ] Sección expandible "¿Cómo se calculan estos números?" muestra el conteo de movimientos internos excluidos
- [ ] Selector de período cambia los KPIs correctamente
- [ ] Filtro de moneda funciona (ARS/USD/EUR)
- [ ] No hay lag visible en carga inicial

**Posibles regresiones:** Cualquier cambio en `calculateSavingsMetrics` o `REAL_TRANSACTION_KINDS`

---

## 13. Estadísticas

**Verificar:**
- [ ] Período anterior se calcula correctamente (comparación de deltas %)
- [ ] Tasa de ahorro no incluye rendimientos ni aportes a objetivos
- [ ] Gráfico de categorías muestra solo gastos reales
- [ ] HealthScore se carga (lazy-load) sin bloquear el resto de la página
- [ ] Filtros de período y moneda sincronizan correctamente

**Posibles regresiones:** Si la comparación de período está rota, revisar `getPrevDateRange`

---

## 14. Historial de transacciones

**Verificar:**
- [ ] Transferencias internas aparecen colapsadas (1 fila por par)
- [ ] Transferencias legacy (con `notes.transfer_id`) también colapsan
- [ ] Filtro por `transaction_kind` (chips) funciona correctamente
- [ ] Al filtrar por "Transferencias", las filas colapsadas siguen mostrándose bien
- [ ] Badge de kind visible en cada transacción con tooltip correcto
- [ ] Paginación funciona (siguiente/anterior página)
- [ ] Filtros de fecha, categoría y billetera no rompen el colapso de transferencias

**Posibles regresiones:**
- Si transferencias aparecen como 2 filas: falla `buildProcessedTransactions`
- Si filtros rompen el historial: revisar interacción entre filtros y `processedTransactions`

---

## 15. PDF / ReportModal

**Verificar:**
- [ ] Modal abre sin lag incluso con muchas transacciones (useMemo en efecto)
- [ ] Sección A: solo movimientos reales con montos correctos
- [ ] Sección B: conteos de internos correctos (sin inflar montos)
- [ ] Sección C: reintegros y rendimientos correctos
- [ ] Tasa de ahorro en modal coincide con la de estadísticas
- [ ] Botón "Exportar/Imprimir PDF" genera PDF con todos los datos
- [ ] En mobile: modal es scrolleable (`overflow-y-auto`, `maxHeight: calc(100vh - 2rem)`)

**Posibles regresiones:** Si tasa de ahorro difiere del dashboard, revisar `calculateSavingsMetrics(realTxs)` en ReportModal vs el cálculo en dashboard

---

## 16. Health financiero

**Verificar:**
- [ ] Página carga sin timeout (7 checks de DB se resuelven)
- [ ] Checks con estado "ok" muestran verde
- [ ] Checks con issues muestran warning/critical con conteo correcto
- [ ] Expandir un check muestra el detalle de transacciones problemáticas
- [ ] Diagnóstico financiero (null_kind, transfer_no_group, etc.) es coherente con el estado real de la DB

**Deuda técnica conocida:** `useTransactions()` en health/page.tsx carga TODAS las transacciones sin filtro de fecha — puede ser lento para usuarios con años de historial. Pendiente agregar ventana de tiempo.

---

## Checklist de regresiones transversales

Después de completar todos los escenarios, verificar:

- [ ] `npx tsc --noEmit` sin errores
- [ ] `npm run test` — 35 tests pasan
- [ ] `npm run lint` sin errores
- [ ] No hay `console.error` en la consola del browser
- [ ] Las tarjetas de billeteras muestran saldos correctos en Billeteras
- [ ] Los objetivos (si existen) muestran progreso correcto
