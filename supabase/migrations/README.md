# Supabase RPC Migrations

Funciones PostgreSQL atómicas. Correr en el SQL Editor de Supabase.

**Orden de ejecución**: el número de prefijo es convencional — los RPCs no tienen dependencias entre sí y pueden correrse en cualquier orden. El prefijo numérico existe para mantener consistencia histórica.

---

## RPCs

### 001 — `rpc_goal_deposit`
Deposita fondos en un objetivo de ahorro.

- Valida saldo disponible en la wallet (vía `wallet_current_balance`)
- Crea transacción `expense` en la wallet
- Incrementa `goals.current_amount`; marca `is_completed` si llega al target
- Registra entrada en `goal_movements`
- **Servicio**: `goalsService.depositAtomic()` — `app/(dashboard)/goals/page.tsx`
- **Reemplaza**: 3 llamadas secuenciales (tx → update goal → insert movement)

---

### 002 — `rpc_goal_withdraw`
Retira fondos de un objetivo hacia una wallet.

- Valida que `goals.current_amount >= monto`
- Crea transacción `income` en la wallet destino
- Decrementa `goals.current_amount`; resetea `is_completed` a false
- Registra entrada en `goal_movements`
- **Servicio**: `goalsService.withdrawAtomic()` — `app/(dashboard)/goals/page.tsx`
- **Reemplaza**: 3 llamadas secuenciales

---

### 003 — `rpc_exchange_conversion`
Convierte divisas entre dos wallets.

- Valida saldo en wallet origen (con `FOR UPDATE` para evitar doble ejecución)
- Crea transacción `expense` en wallet origen y `income` en wallet destino
- Ambas transacciones comparten un `conversion_id` en el campo `notes` (JSON)
- **Servicio**: `exchangeService.createConversionAtomic()` — `dollar/page.tsx`, `ConversionModal.tsx`
- **Reemplaza**: 2 inserts independientes (podía fallar entre medio dejando saldo negativo)

---

### 004 — `rpc_fixed_term_create`
Crea un plazo fijo y debita el capital de la wallet.

- Valida saldo suficiente en wallet
- Inserta registro en `fixed_terms` con status `active`
- Crea transacción `expense` en la wallet
- **Servicio**: `fixedTermService.createAtomic()` — `app/(dashboard)/plazo-fijo/page.tsx`
- **Reemplaza**: insert de fixed_term + insert de tx (podía crear un plazo sin debitar la wallet)

---

### 005 — `rpc_fixed_term_withdraw`
Retira un plazo fijo a vencimiento o anticipado.

- Valida que el plazo esté en estado `active` o `matured`
- Crea transacción `income` en la wallet destino
- Marca el plazo como `withdrawn`
- **Servicio**: `fixedTermService.withdrawAtomic()` — `app/(dashboard)/plazo-fijo/page.tsx`
- **Reemplaza**: insert de tx + update de estado (podía acreditar sin marcar el plazo)

---

### 006 — `rpc_fixed_term_reinvest`
Reinvierte un plazo vencido en uno nuevo.

4 operaciones en una sola transacción:
1. Acredita `oldTotal` en wallet (`income`)
2. Marca plazo viejo como `reinvested`
3. Crea plazo nuevo con status `active` (hereda el nombre del viejo)
4. Debita `newPrincipal` de wallet (`expense`)

- **Servicio**: `fixedTermService.reinvestAtomic()` — `app/(dashboard)/plazo-fijo/page.tsx`
- **Reemplaza**: 4 pasos secuenciales; el paso 2 fallaba silenciosamente (sin `throw`), dejando el plazo viejo como `active` mientras el nuevo ya existía

---

### 007 — `rpc_refund_credit`
Acredita un reintegro pendiente.

- Lee todos los datos del reintegro desde DB (monto, wallet, moneda) — no confía en el frontend
- Obtiene la descripción de la transacción original vía JOIN
- Crea transacción `income` en la wallet destino
- Marca el reintegro como `credited` con timestamp y FK a la transacción creada
- **Servicio**: `refundService.creditAtomic()` — `app/(dashboard)/transactions/page.tsx`
- **Reemplaza**: 6 parámetros desde frontend + lookup manual de tx → ahora 1 parámetro (`refund_id`)

---

## Propiedades comunes

Todos los RPCs:

- `SECURITY DEFINER` + `SET search_path = ''` — ejecutan con privilegios elevados, sin acceso implícito a schemas no calificados
- `FOR UPDATE` en la fila principal — previene doble ejecución concurrente
- `RAISE EXCEPTION` + `EXCEPTION WHEN OTHERS THEN RAISE` — cualquier fallo dispara rollback automático de toda la transacción
- Validan ownership (`user_id`) de todas las entidades antes de operar
