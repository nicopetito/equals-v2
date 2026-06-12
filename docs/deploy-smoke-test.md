# Smoke Test Post-Deploy

Ejecutar este checklist después de cada deploy a producción. Usar una ventana incógnito/privada. Cada escenario debería tomar menos de 2 minutos.

## Entorno

- URL: dominio de producción (ej. `https://equal.vercel.app`)
- Navegador: ventana incógnito/privada
- Supabase: tener el dashboard abierto en otra pestaña para verificar datos si es necesario

---

## 1. Flujo de autenticación

- [ ] Navegar a `/` → redirige a `/login` (sin 404 ni pantalla en blanco)
- [ ] Intentar login con contraseña incorrecta → mensaje de error visible, se queda en `/login`
- [ ] Registrar una cuenta de test (`smoke+test@dominio.com`) → redirige a `/dashboard`
- [ ] Cerrar sesión → redirige a `/login`
- [ ] Volver a iniciar sesión con la cuenta de test → llega a `/dashboard`

Esperado: sin pantallas blancas, sin errores en DevTools (consola y Network).

---

## 2. Dashboard

- [ ] `/dashboard` carga sin error
- [ ] Widget "Saldo total" muestra un valor (puede ser $0 para cuenta nueva)
- [ ] Los gráficos renderizan sin errores (pueden mostrar placeholder "sin datos")

---

## 3. Billeteras — Crear

- [ ] Navegar a `/wallets`
- [ ] Hacer clic en "Nueva billetera"
- [ ] Crear billetera "Test ARS" con moneda ARS y saldo inicial 10.000
- [ ] La billetera aparece en la lista con saldo ~$10.000,00

Verificar en Supabase: existe una fila en `wallets` y una transacción de `initial_balance` en `transactions`.

---

## 4. Transacciones — Crear

- [ ] Usar el FAB (botón flotante) o ir a `/transactions`
- [ ] Crear un gasto de ARS 500, categoría "Sin categoría", billetera "Test ARS"
- [ ] La transacción aparece en la lista
- [ ] El saldo de "Test ARS" se actualiza a ~$9.500,00
- [ ] Crear un ingreso de ARS 200
- [ ] El saldo se actualiza a ~$9.700,00

---

## 5. Transacciones — Eliminar

- [ ] Eliminar la transacción de gasto creada en el paso 4
- [ ] La transacción desaparece de la lista
- [ ] El saldo vuelve al valor anterior
- [ ] Se muestra un toast de confirmación (no un error técnico crudo)

---

## 6. Metas — Crear y depositar

- [ ] Navegar a `/goals`
- [ ] Crear meta "Smoke Test Goal" con objetivo ARS 5.000
- [ ] Hacer clic en "Aportar" y depositar ARS 1.000 desde "Test ARS"
- [ ] La barra de progreso de la meta se actualiza
- [ ] El saldo de "Test ARS" se reduce en 1.000

---

## 7. Transferencia entre billeteras

- [ ] Crear una segunda billetera "Test ARS 2" con saldo inicial 0
- [ ] En `/wallets`, iniciar una transferencia de ARS 500 desde "Test ARS" a "Test ARS 2"
- [ ] Ambos saldos se actualizan correctamente
- [ ] En `/transactions`, la transferencia aparece con el badge correcto (tipo "transferencia")

---

## 8. Transacciones programadas

- [ ] Navegar a `/scheduled`
- [ ] Crear una transacción programada de ARS 200, descripción "Prueba programada"
- [ ] La entrada aparece en la lista

---

## 9. Pagos pendientes

- [ ] Navegar a `/pending`
- [ ] Crear un pago pendiente de ARS 300 a "Juan Test"
- [ ] Marcar el pago como completado usando la billetera "Test ARS"
- [ ] El pago pasa al estado completado
- [ ] El saldo de "Test ARS" se reduce

---

## 10. Plazo fijo

- [ ] Navegar a `/plazo-fijo`
- [ ] Crear un plazo fijo: ARS 1.000, 30 días, TNA 110%, desde "Test ARS"
- [ ] La entrada aparece en la lista
- [ ] El capital fue deducido de la billetera

---

## 11. Reservas

- [ ] Navegar a `/reservas`
- [ ] Crear una reserva "Test Reserva" desde "Test ARS" con ARS 500
- [ ] La reserva aparece en la lista con el saldo correcto
- [ ] Hacer un withdrawal de ARS 100 de la reserva
- [ ] El saldo de la reserva se reduce

---

## 12. Conversión de moneda (Dollar)

- [ ] Navegar a `/dollar`
- [ ] Las cotizaciones USD/EUR cargan (pueden ser en caché por 60 segundos)
- [ ] Si hay billetera USD: probar una conversión pequeña ARS→USD

---

## 13. Estadísticas y reportes

- [ ] Navegar a `/estadisticas`
- [ ] La página carga sin errores
- [ ] Cambiar el período → los datos se actualizan
- [ ] Probar ReportModal (si aplica) → el PDF/resumen se genera

---

## 14. Health financiero

- [ ] Navegar a `/health`
- [ ] El score financiero se muestra
- [ ] Las secciones del diagnóstico cargan correctamente

---

## 15. UX de errores — verificación

- [ ] Intentar eliminar una billetera que tiene transacciones → aparece un aviso/bloqueo, **no un error SQL crudo**
- [ ] Intentar transferir más del saldo disponible → aparece un mensaje amigable en español, **no un stack trace**

---

## 16. Seguridad auth

- [ ] Cerrar sesión
- [ ] Intentar navegar directamente a `/dashboard` → redirige a `/login`
- [ ] Intentar navegar directamente a `/wallets` → redirige a `/login`
- [ ] Intentar navegar directamente a `/transactions` → redirige a `/login`

---

## Limpieza

- [ ] Eliminar todos los datos de test creados durante este smoke test (billeteras, transacciones, metas, etc.)
- [ ] O bien eliminar el usuario de test directamente desde Supabase Authentication → Users

---

## Criterio de aprobación

Todos los ítems marcados sin:
- Pantallas blancas o `Error: Application error`
- Mensajes de error técnicos crudos (SQL, nombres de constraints, stack traces) visibles al usuario
- Errores 500 en el panel Network de DevTools
- Errores de autenticación en los logs de Vercel Functions

Si algún escenario falla, hacer rollback del deploy en Vercel → Deployments → deploy anterior → "Promote to Production".
