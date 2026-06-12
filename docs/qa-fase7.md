# QA — Fase 7: Onboarding y Primera Experiencia

Fecha: 2026-06-11

## Escenarios de prueba

### 1. Usuario nuevo — flujo completo de registro

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 1 | Registrarse con email + password nuevos | Redirige a `/verify` |
| 2 | Verificar email con OTP | Redirige a `/dashboard` |
| 3 | Verificar en Supabase: tabla `categories` | Existen 20+ categorías para el user_id (14 gastos + 6 ingresos + categorías de sistema) |
| 4 | Dashboard se carga | Aparece `FirstWalletWizard` bloqueando el fondo |
| 5 | Crear primera billetera con saldo inicial | El `FirstWalletWizard` se cierra |
| 6 | Verificar slide educativo | Aparece modal "¡Bienvenido a Equal!" con 3 conceptos clave |
| 7 | Tocar "Entendido, empezar" | Desaparece el modal educativo, aparece onboarding de 3 pasos |
| 8 | Completar los 3 pasos del onboarding | Confetti + modal se cierra |
| 9 | Recargar la página | No aparece ni el slide educativo ni el onboarding |

### 2. Categorías creadas automáticamente

| Verificación | Resultado esperado |
|--------------|--------------------|
| Ir a `/categories` | Ver ≥20 categorías listadas |
| Filtrar por tipo Gasto | Ver 14 categorías de gasto (Alimentación, Transporte, Alquiler, Servicios, Salud, Educación, Ocio, Ropa, Supermercado, Mascotas, Deudas, Impuestos, Suscripciones, Otros gastos) |
| Filtrar por tipo Ingreso | Ver 6 categorías de ingreso (Sueldo, Freelance, Ventas, Reintegros, Regalos, Otros ingresos) |
| Verificar categorías de sistema | Existen Sin categoría (gasto e ingreso), Saldo inicial, Ajuste (gasto e ingreso) |
| Intentar eliminar "Sin categoría" | Error: las categorías de sistema no se pueden eliminar |
| Editar "Alimentación" | Permite editar nombre, color, icono |
| Eliminar "Mascotas" | Se elimina sin error |

### 3. Idempotencia — no duplicar categorías

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 1 | Segundo login con el mismo usuario | `ensureDefaultCategories()` se ejecuta de nuevo |
| 2 | Verificar tabla `categories` | No hay duplicados (misma cantidad que antes) |
| 3 | Verificar en consola/logs | No hay errores de constraint violation |

### 4. Onboarding educativo

| Verificación | Resultado esperado |
|--------------|--------------------|
| Usuario nuevo (sin billeteras) | `FirstWalletWizard` aparece, NO aparece el slide educativo |
| Después de crear billetera | Slide educativo aparece primero (3 conceptos clave) |
| Slide muestra 3 bloques | Billetera = tu dinero real, Saldo inicial ≠ ingreso, Transferencias no cuentan |
| Botón "X" en slide | Marca slide como visto, pasa al onboarding de 3 pasos (no se salta el onboarding) |
| Botón "Entendido, empezar" | Mismo resultado que "X" |
| Onboarding tiene 3 pasos | Crear billetera ✓, Registrar movimiento, Crear objetivo |
| Barra de progreso | Refleja los pasos completados |
| Botón "Omitir" en cada paso | Avanza al siguiente paso sin ir a la ruta |
| Al completar todos los pasos | Confetti + modal desaparece |

### 5. Onboarding salteado

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 1 | Hacer X en el slide educativo | Slide desaparece, aparece onboarding de 3 pasos |
| 2 | Hacer X en el onboarding de 3 pasos | Onboarding desaparece completamente |
| 3 | Recargar | No vuelve a aparecer ningún modal |
| 4 | Verificar localStorage | Existen claves `eq_intro_...` y `eq_onboarding_...` con valor '1' |

### 6. Mobile — responsive

| Verificación | Dispositivo sugerido | Resultado esperado |
|-------------|---------------------|---------------------|
| Slide educativo | iPhone 14 / 375px | Modal encaja sin scroll horizontal |
| Onboarding 3 pasos | iPhone 14 / 375px | Botones accesibles con thumb |
| Empty states | 375px | Texto legible, botón visible |

### 7. Empty states

#### Dashboard (usuario con billeteras pero sin transacciones)
- **Mostrar**: "Registrá tu primer movimiento"
- **Descripción**: "Anotá un gasto o ingreso para empezar a controlar tus finanzas."
- **CTA**: "+ Nueva transacción" → navega a `/transactions`

#### Reservas (sin reservas creadas)
- **Mostrar**: "No tenés reservas todavía"
- **Descripción**: "Apartá dinero para un fin específico sin mezclarlo con tu saldo disponible. No se registra como gasto."
- **CTA**: "+ Nueva reserva" → abre modal de creación

#### Health / Salud (sin transacciones)
- **Mostrar**: "No hay datos para analizar"
- **Descripción**: "Registrá algunas transacciones para ver la salud de tus finanzas."
- **CTA**: "Ir a Transacciones" → navega a `/transactions`
- **Nota**: Con transacciones existentes, el EmptyState NO se muestra

### 8. Microcopy educativa

| Ubicación | Texto esperado |
|-----------|----------------|
| Campo "Saldo inicial" en crear billetera | Hint: "Tu punto de partida — no se registra como ingreso del mes." |
| Modal crear reserva (nueva) | Nota: "Depositar a una reserva no cuenta como gasto. El dinero sigue siendo tuyo, solo está apartado." |
| WalletAdjustmentModal modo "Corrección de saldo" | Nota: "El ajuste corrige el saldo — no representa un ingreso o gasto real." |
| Modal editar reserva | La nota de "Depositar" NO aparece (solo en creación) |

### 9. Primera billetera con saldo inicial

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 1 | Crear billetera con saldo inicial ARS 50.000 | Billetera creada con saldo 50.000 |
| 2 | Ir a Transacciones | No aparece una transacción de ingreso por 50.000 |
| 3 | Ir a Estadísticas | El saldo inicial no suma a los ingresos del mes |
| 4 | Ver hint en el campo | "Tu punto de partida — no se registra como ingreso del mes." |

### 10. Primer ingreso/gasto tras onboarding

| Paso | Acción | Resultado esperado |
|------|--------|--------------------|
| 1 | Registrar ingreso (Sueldo ARS 100.000) | Aparece en Transacciones con tipo Ingreso |
| 2 | Dashboard | KPI Ingresos muestra 100.000 |
| 3 | Estadísticas | Ingreso visible en gráficos |
| 4 | Registrar gasto (Alimentación ARS 2.000) | Aparece en Transacciones con tipo Gasto |
| 5 | Dashboard | KPI Gastos muestra 2.000 |

---

## Comandos de verificación

```bash
# Tests unitarios de categorías
npx vitest run utils/__tests__/categories.test.ts

# Todos los tests
npx vitest run

# Typecheck
npx tsc --noEmit

# Build de producción
npm run build
```

## Checklist de regresión

- [ ] Las categorías existentes de usuarios legacy no se modificaron
- [ ] `transaction_kind` sigue funcionando correctamente
- [ ] Los filtros del dashboard no cambiaron
- [ ] El health score sigue calculándose
- [ ] Las estadísticas excluyen transferencias e ingresos de sistema
- [ ] El onboarding no aparece a usuarios que ya lo completaron
