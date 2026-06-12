# QA Fase 8 — UI, Mobile, Accesibilidad

> Ejecutar en Chromium DevTools con viewport 375px (mobile), 768px (tablet) y 1280px (desktop).
> Activar "Emulate CSS prefers-reduced-motion: reduce" para verificar que no haya animaciones rotas.

---

## 1. Desktop (1280px)

### General
- [ ] Sidebar visible y navegación funcional
- [ ] Todas las páginas renderizan sin overflow horizontal
- [ ] `animate-fade-in` en dashboard, transactions, health, estadisticas, wallets, reservas, plazo-fijo, pending

### Dashboard
- [ ] KPI cards en grid 4 columnas
- [ ] Gráfico de evolución patrimonial visible
- [ ] Plantillas rápidas visibles
- [ ] YieldBanner visible si hay billeteras con rendimiento

### Transacciones
- [ ] Cards de resumen (Ingresos/Gastos) en 2 columnas
- [ ] Chips de filtro scrollables con botones ◀ ▶
- [ ] Filtros de tipo financiero (KIND_FILTERS) visibles
- [ ] Lista de transacciones sin overflow
- [ ] Modal edición/creación abre correctamente
- [ ] Modal eliminación bulk muestra advertencia

### Billeteras
- [ ] Cards de billetera en grid 2 columnas con tema correcto
- [ ] Botones de acción (editar, ajustar, eliminar) visibles al hover
- [ ] Modal ajuste de billetera funciona (4 modos)
- [ ] Modal diagnóstico: botones Actualizar/Copiar/Cerrar visibles

### Health
- [ ] Grid de resumen de datos: 6 columnas en desktop
- [ ] Tabla diagnóstico expandible sin overflow (scroll horizontal si el contenido lo requiere)
- [ ] Checks de salud ordenados por severidad

### Estadísticas
- [ ] KPI cards en 4 columnas
- [ ] Gráficos de categorías y distribución visibles
- [ ] Resumen por período completo

### Reservas
- [ ] Cards de reserva en 2 columnas
- [ ] Totales por moneda en 4 columnas
- [ ] Modal crear reserva / movimiento funciona

---

## 2. Tablet (768px)

- [ ] Dashboard: KPI cards en 2 columnas
- [ ] Transactions: summary cards en 2 columnas
- [ ] Wallets: cards en 2 columnas
- [ ] Health: grid resumen en 3 columnas (`sm:grid-cols-3`)
- [ ] Reservas: totales en 2 columnas
- [ ] Estadísticas: KPI cards en 2 columnas
- [ ] Modales centrados (no drawer inferior)
- [ ] ReportModal centrado (no bottom-sheet)

---

## 3. Mobile (375px — iPhone SE)

### General
- [ ] Sin overflow horizontal en ninguna página (verificar con scroll de dos dedos)
- [ ] FAB (+) visible en la esquina inferior derecha
- [ ] Padding seguro en pantallas con notch (safe-area-inset)
- [ ] Tipografía legible sin zoom (mínimo 14px para texto principal)

### Dashboard
- [ ] KPI cards apiladas en 2 columnas
- [ ] Wallet slider navegable con swipe
- [ ] Transacciones recientes legibles

### Transacciones
- [ ] Cards de resumen (Ingresos/Gastos) apiladas en 1 columna
- [ ] Chips horizontales scrollables sin romper el layout
- [ ] Fila de transacción: checkbox + icono + texto truncado + monto visibles sin overflow
- [ ] Modal crear/editar: campos bien espaciados, scroll funcional
- [ ] Confirmación bulk: botones accesibles

### Billeteras
- [ ] Cards en 1 columna full-width
- [ ] Botones de acción visibles en touch (sin hover)
- [ ] DiagnosticModal: botones apilados en mobile (`flex-col sm:flex-row`)
- [ ] Modal formulario: inputs sin desbordamiento

### Health
- [ ] Grid resumen en 2 columnas (`grid-cols-2`)
- [ ] Tabla diagnóstico dentro de `overflow-x-auto` con scroll lateral funcional
- [ ] Tabla tiene `min-w-[480px]` para legibilidad

### Estadísticas
- [ ] Sin overflow en barras de categoría
- [ ] Gráfico de ahorro visible

### Reservas
- [ ] Totales en 2 columnas (no 4)
- [ ] Modal creación/movimiento funcional

### Modales en mobile
- [ ] Modal compartido: altura limitada a `calc(100vh - 2rem)`, contenido scrolleable
- [ ] ReportModal: bottom-sheet en mobile (`items-end sm:items-center`)
- [ ] Botones en modales con altura mínima 44px (touch target)
- [ ] Cierre por tap en overlay funcional
- [ ] ESC cierra el modal

### Onboarding
- [ ] Slides legibles en 375px
- [ ] Botones de navegación accesibles (tamaño ≥ 44px)
- [ ] Confetti al completar visible

---

## 4. Navegación por teclado básica

- [ ] Tab navega por botones en el orden correcto
- [ ] Focus visible en todos los elementos interactivos (contorno brand-500 o equivalente)
- [ ] Modal.tsx: foco visible en botón "Cerrar"
- [ ] Paginación: foco visible en botones de página
- [ ] ESC cierra modales
- [ ] Enter/Space activa botones
- [ ] Select personalizado: Enter/Space abre dropdown, Escape cierra

---

## 5. Accesibilidad ARIA

- [ ] `Modal.tsx`: tiene `role="dialog"`, `aria-modal="true"`, `aria-labelledby` apuntando al h2
- [ ] `ReportModal.tsx`: tiene `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
- [ ] `Button.tsx`: cuando está en loading, tiene `aria-busy="true"`
- [ ] `Input.tsx`: mensaje de error conectado con `aria-describedby`
- [ ] `KindBadge.tsx`: usa `aria-label` en lugar de `title`
- [ ] `Pagination.tsx`: página activa tiene `aria-current="page"`
- [ ] Botones de solo icono: tienen `aria-label` descriptivo (ej: "Editar billetera", "Eliminar transacción")
- [ ] `EmptyState.tsx`: ilustración SVG tiene `aria-hidden="true"`

---

## 6. Filtros y chips

- [ ] Chips seleccionados visualmente distinguibles (fondo brand + sombra)
- [ ] Chips no seleccionados: borde y texto legible
- [ ] Scroll horizontal en chips no rompe layout
- [ ] Botones ◀ ▶ de scroll deshabilitados cuando no hay más contenido (opacidad reducida)

---

## 7. Health — secciones expandibles

- [ ] Click en "Ver detalles" expande la tabla correctamente
- [ ] Click en "Ocultar detalles" colapsa la tabla
- [ ] Tabla expandida scrolleable horizontalmente en mobile
- [ ] Estado de carga (spinner) visible mientras se cargan detalles
- [ ] Sin detalles: mensaje "Sin registros encontrados"

---

## 8. Reportes

- [ ] ReportModal abre desde la barra de Estadísticas
- [ ] Sección de resumen financiero visible
- [ ] Botón "Imprimir" abre ventana de impresión del navegador
- [ ] Modal cierra al click en overlay o botón X

---

## 9. Animaciones

- [ ] `animate-fade-in` en todas las páginas del dashboard (dashboard, transactions, health, wallets, estadisticas, reservas)
- [ ] Modales abren/cierran con animación suave (Framer Motion scale + fade)
- [ ] Cards de billetera con stagger animation al cargar
- [ ] EmptyState aparece con fade
- [ ] Con `prefers-reduced-motion: reduce`: todas las animaciones deshabilitadas, contenido sigue visible

---

## 10. Build / Typecheck

```bash
npm run typecheck   # 0 errores TypeScript
npm run test        # tests de lógica financiera pasan
npm run build       # build exitoso sin warnings críticos
```

---

## Notas de riesgo post-Fase 8

| Área | Riesgo | Mitigación |
|---|---|---|
| StatCard ACCENT | Colores hardcodeados en palette local | No modificados — funciona correctamente, riesgo bajo |
| Tabla diagnóstico en health | Con `min-w-[480px]` puede verse angosta en < 380px | Evaluar si se necesita scroll de todas formas |
| Onboarding en 320px | Contenido denso puede requerir scroll | Verificar en iPhone SE (375px) como mínimo |
| Input focus ring | Cambio de `red-200`/`violet-200` a CSS variables | Variables `--expense-200`/`--brand-200` deben existir en globals.css |
