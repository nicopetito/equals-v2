# QA — Bloque financiero: transacciones, reintegros y diagnóstico

Casos de prueba manuales para verificar el comportamiento post-fix antes de avanzar con auth/onboarding.

---

## Correcciones incluidas

| # | Archivo | Fix |
|---|---------|-----|
| 1 | `services/transactions.service.ts` | `update()` compara valores contra la tx original antes de bloquear — elimina falsos positivos cuando el form envía payload completo con campos sin cambiar |
| 2 | `components/transactions/NewTransactionModal.tsx` | `softCheckBypassed.current` se resetea al abrir/cerrar el modal para no saltarse el warning en sesiones subsiguientes |
| 3 | `app/(dashboard)/transactions/page.tsx` | `useEffect` de `wallet_id` usa `[searchParams]` en lugar de `[]` — el filtro se actualiza si la URL cambia con el componente montado |
| 4 | `components/transactions/NewTransactionModal.tsx` | `payload` se construye dentro del `try`, después del guard financiero |

---

## Casos de prueba

### TC-01 — Editar descripción con reintegro acreditado (fix 1)
**Pasos:** Crear gasto → acreditar reintegro → editar solo la descripción → Guardar  
**Esperado:** ✅ Guarda sin error. El guard no bloquea porque amount/type/wallet_id/currency no cambiaron.

### TC-02 — Bloqueo de campos financieros con reintegro acreditado
**Pasos:** Crear gasto → acreditar reintegro → intentar cambiar amount, tipo, billetera o moneda  
**Esperado:** ❌ Campos deshabilitados visualmente. Si se bypasea la UI, el service también rechaza con error claro.

### TC-03 — Edición libre antes de acreditar
**Pasos:** Crear gasto con reintegro pendiente → editar amount, tipo, billetera, moneda → Guardar  
**Esperado:** ✅ Guarda sin restricción. Solo los reintegros con `status='credited'` bloquean.

### TC-04 — Warning en date/category con reintegro acreditado — cancelar
**Pasos:** Crear gasto → acreditar reintegro → cambiar fecha o categoría → click Guardar  
**Esperado:** Aparece warning soft. Al cancelar, no guarda. Sin doble submit.

### TC-05 — Warning en date/category con reintegro acreditado — confirmar
**Pasos:** Igual a TC-04 → click "Confirmar de todos modos"  
**Esperado:** ✅ Guarda correctamente. Una sola llamada al service.

### TC-06 — Reset del warning al reabrir el modal (fix 2)
**Pasos:** Abrir modal de edición con reintegro acreditado → cambiar fecha → confirmar warning → cerrar modal → reabrir → cambiar fecha de nuevo  
**Esperado:** El warning vuelve a aparecer (softCheckBypassed limpiado al reabrir).

### TC-07 — Eliminación en cascada
**Pasos:** Crear gasto con reintegro → acreditar reintegro → eliminar el gasto  
**Esperado:** ✅ Se eliminan: la transacción original + la transacción de ingreso del reintegro acreditado. El reintegro queda con `status='cancelled'`. El saldo de la billetera se recalcula correctamente.

### TC-08 — Diagnóstico sin discrepancias
**Pasos:** Abrir /wallets → click "Diagnóstico"  
**Esperado:** Banner verde si todos los saldos coinciden entre la vista `wallet_current_balance` y el RPC de diagnóstico.

### TC-09 — Diagnóstico con discrepancia y navegación
**Pasos:** Si hay billetera con discrepancia en el diagnóstico → click "Ver transacciones"  
**Esperado:** Navega a `/transactions?wallet_id=<id>`. El filtro de billetera queda preseleccionado. El usuario puede limpiarlo haciendo click en la billetera nuevamente.

### TC-10 — Filtro wallet_id desde URL con componente ya montado (fix 3)
**Pasos:** Estar en /transactions → navegar a otra página → volver a /transactions?wallet_id=X via router.push  
**Esperado:** Filtro se aplica correctamente. El `useEffect` con `[searchParams]` lo detecta incluso si el componente no se desmontó.

### TC-11 — Copiar diagnóstico
**Pasos:** Abrir Diagnóstico con billeteras → click "Copiar diagnóstico"  
**Esperado:** Clipboard contiene resumen técnico. El ícono cambia a check verde durante 2 segundos.

### TC-12 — Acreditar reintegro — actualización de saldo
**Pasos:** Acreditar un reintegro pendiente  
**Esperado:** El saldo de la billetera destino sube sin recargar la página (la vista `wallet_current_balance` se recalcula en tiempo real).

---

## Resultado de revisión técnica

| Check | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Sin errores |
| `npm run lint` (archivos modificados) | ✅ Sin errores nuevos — los errores de lint existentes son preexistentes en otros archivos (`budgets`, `scheduled`, `reset-password`) con el mismo patrón |
| `npm run build` | ✅ 21 rutas compiladas, exit code 0 |

---

## Pendientes conocidos (no bloquean el commit estable)

- Los warnings de `react-hooks/set-state-in-effect` y `preserve-manual-memoization` en `budgets/page.tsx`, `scheduled/page.tsx` y `reset-password/page.tsx` son preexistentes y ajenos al bloque financiero.
- La estructura de query params adicionales (`type`, `category_id`, `currency`, `from`, `to`, `search`) está preparada como comentarios en `transactions/page.tsx:199-204` para implementación futura.
