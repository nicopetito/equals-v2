export interface HelpSection {
  key: string
  title: string
  description: string
  example?: string
  impact?: string[]
  tips?: string[]
  cta?: { label: string; href: string }
}

export const helpContent: Record<string, HelpSection> = {
  dashboard: {
    key: 'dashboard',
    title: '¿Qué muestra el Dashboard?',
    description:
      'El Dashboard es tu resumen financiero en tiempo real. Muestra el balance total de todas tus billeteras, ingresos y gastos del período, y la evolución de tu patrimonio a lo largo del tiempo.',
    example: 'Balance total: ARS 450.000 · Ingresos: ARS 200.000 · Gastos: ARS 85.000 · Ahorro: 57%',
    impact: [
      'El balance refleja el saldo actual de todas tus billeteras combinadas',
      'Los KPIs se actualizan cada vez que registrás una transacción',
      'La tasa de ahorro se calcula como (ingresos − gastos) / ingresos',
      'Podés filtrar por período y moneda para ver distintos escenarios',
    ],
    tips: [
      'Revisá el Dashboard una vez por semana para mantener el control',
      'Usá el filtro de moneda para analizar ARS y USD por separado',
      'La tasa de ahorro del 20% o más es un buen indicador de salud financiera',
    ],
    cta: { label: 'Ver transacciones', href: '/transactions' },
  },

  transactions: {
    key: 'transactions',
    title: '¿Cómo funcionan las transacciones?',
    description:
      'Las transacciones son el registro de cada ingreso o gasto que cargás en Equal. Cada movimiento actualiza el balance de la billetera correspondiente, el progreso de la categoría y las estadísticas del período.',
    example: 'Sueldo · +ARS 250.000 · Billetera: Cuenta sueldo · Categoría: Ingresos laborales',
    impact: [
      'Suma o resta del saldo de la billetera seleccionada',
      'Acumula en la categoría asignada para presupuestos y estadísticas',
      'Aparece en el historial del período activo en el Dashboard',
      'Si pertenece a un objetivo, actualiza su progreso automáticamente',
    ],
    tips: [
      'Asignale siempre una categoría a cada movimiento para mejorar tus reportes',
      'Usá los filtros para detectar patrones de gasto por período o billetera',
      'Las transacciones de tipo "ingreso" suman al balance; las de tipo "gasto" lo reducen',
    ],
    cta: { label: 'Nueva transacción', href: '/transactions' },
  },

  wallets: {
    key: 'wallets',
    title: '¿Qué son las billeteras en Equal?',
    description:
      'Las billeteras son contenedores virtuales de dinero dentro de Equal. Representan tus fuentes de fondos reales: efectivo, cuentas bancarias, billeteras digitales o inversiones. Equal no se conecta a ningún banco ni accede a tus cuentas reales.',
    example: 'Efectivo · ARS 15.000 / Cuenta Santander · ARS 180.000 / Mercado Pago · ARS 42.000 / Ahorros USD · USD 2.500',
    impact: [
      'Cada transacción afecta el saldo de la billetera que seleccionés',
      'El balance total del Dashboard suma todas las billeteras activas',
      'Podés tener billeteras en ARS, USD, EUR o CRYPTO',
      'Los objetivos pueden descontar del saldo de una billetera al depositar',
    ],
    tips: [
      'Creá una billetera por cada cuenta real que manejás',
      'Reconciliá el saldo de Equal con el saldo real cada tanto para mantener exactitud',
      'Separar billeteras por moneda facilita el seguimiento de inversiones en dólares',
    ],
    cta: { label: 'Nueva billetera', href: '/wallets' },
  },

  categories: {
    key: 'categories',
    title: '¿Para qué sirven las categorías?',
    description:
      'Las categorías clasifican cada transacción por tipo de gasto o ingreso. Son la base de tus presupuestos, estadísticas y reportes. Una buena clasificación te permite entender exactamente en qué gastás y cuánto.',
    example: 'Alimentación · Transporte · Alquiler · Sueldo · Freelance · Entretenimiento · Salud',
    impact: [
      'Cada transacción categorizada alimenta los presupuestos mensuales',
      'Las estadísticas muestran el gasto real por categoría en el período',
      'El gráfico donut del Dashboard se construye a partir de tus categorías',
      'Sin categorías, los reportes y presupuestos no funcionan correctamente',
    ],
    tips: [
      'Creá categorías específicas en lugar de genéricas para análisis más precisos',
      'Separar "Alimentación" de "Delivery" te da información más accionable',
      'Podés asignar colores para identificar categorías de un vistazo',
    ],
    cta: { label: 'Nueva categoría', href: '/categories' },
  },

  scheduled: {
    key: 'scheduled',
    title: '¿Cómo funcionan las operaciones programadas?',
    description:
      'Las operaciones programadas representan ingresos o gastos fijos que se repiten de forma regular: sueldo mensual, alquiler, servicios, suscripciones. Te ayudan a planificar y anticipar tu flujo de caja.',
    example: 'Sueldo · +ARS 250.000 · mensual · día 15 / Netflix · −ARS 4.500 · mensual / Alquiler · −ARS 120.000 · mensual',
    impact: [
      'Aparecen en el Calendario como eventos esperados en su fecha de ejecución',
      'Te recordamos cuándo vence una operación programada',
      'Podés registrarlas manualmente cuando ocurren para impactar el balance real',
      'No impactan el balance automáticamente hasta que las confirmás',
    ],
    tips: [
      'Registrá todas tus obligaciones fijas para tener una visión real del flujo de caja',
      'Revisá el Calendario antes de fin de mes para anticipar gastos importantes',
      'Usá operaciones programadas para estimar cuánto te queda disponible después de compromisos fijos',
    ],
    cta: { label: 'Nueva operación', href: '/scheduled' },
  },

  goals: {
    key: 'goals',
    title: '¿Cómo funcionan los objetivos?',
    description:
      'Los objetivos te permiten reservar dinero para metas específicas sin confundirlo con tu saldo disponible. El dinero sigue siendo tuyo, pero Equal lo contabiliza por separado para ayudarte a mantener el foco.',
    example: 'Viaje a Europa · Meta USD 8.000 · Ahorrado USD 2.200 · Progreso 27,5%',
    impact: [
      'Al depositar, el saldo se descuenta de la billetera seleccionada',
      'Aumenta el "dinero reservado" en el resumen de patrimonio',
      'Al retirar, el dinero vuelve a la billetera de origen',
      'El historial registra cada movimiento de depósito y retiro',
    ],
    tips: [
      'Usá objetivos para metas con horizonte de tiempo definido',
      'Revisá el progreso mensualmente para mantener la motivación',
      'No mezcles el dinero reservado con gastos diarios; eso es precisamente el objetivo del módulo',
    ],
    cta: { label: 'Nuevo objetivo', href: '/goals' },
  },

  budgets: {
    key: 'budgets',
    title: '¿Cómo funcionan los presupuestos?',
    description:
      'Los presupuestos establecen un límite de gasto mensual por categoría. Equal compara ese límite con el gasto real registrado en tus transacciones del mes y te muestra el estado en tiempo real.',
    example: 'Alimentación · Límite ARS 40.000 · Gastado ARS 28.500 · 71% · Bajo control',
    impact: [
      'El gasto real se calcula automáticamente desde tus transacciones del mes',
      'El estado cambia a "cerca del límite" al superar el 80% del presupuesto',
      'El estado cambia a "superado" cuando el gasto real excede el límite',
      'Podés copiar los presupuestos del mes anterior para no empezar desde cero',
    ],
    tips: [
      'Creá presupuestos solo para categorías de gasto variable donde necesitás control',
      'Revisá el estado a mitad de mes para ajustar hábitos a tiempo',
      'Los presupuestos no bloquean transacciones; son una herramienta de conciencia, no de restricción',
    ],
    cta: { label: 'Nuevo presupuesto', href: '/budgets' },
  },

  dollar: {
    key: 'dollar',
    title: '¿Cómo funciona el dólar en Equal?',
    description:
      'El módulo Dólar muestra las cotizaciones del mercado cambiario argentino en tiempo real y te permite convertir entre billeteras de diferentes monedas. No es una compra ni venta bancaria real; es una conversión interna de saldo.',
    example: 'Dólar Blue · Compra $1.280 · Venta $1.310 / Convertir ARS 100.000 → USD 76,33 al tipo Blue',
    impact: [
      'La conversión descuenta el saldo de la billetera de origen y acredita en la de destino',
      'Usá la cotización que corresponde a tu operación real (oficial, blue, MEP)',
      'El historial de Equal refleja el tipo de cambio al momento de la conversión',
      'Equal no realiza operaciones reales con bancos ni casas de cambio',
    ],
    tips: [
      'Actualizá las cotizaciones antes de cada conversión para tener el dato más reciente',
      'Usá el tipo MEP si operás con dólares vía bolsa',
      'Registrá tus conversiones para tener trazabilidad de tu posición en dólares',
    ],
  },

  'plazo-fijo': {
    key: 'plazo-fijo',
    title: '¿Cómo funciona el plazo fijo?',
    description:
      'El módulo de Plazo Fijo tiene dos modos: simulación y registro. En modo simulación calculás el rendimiento estimado de un plazo fijo sin afectar ningún saldo. Si guardás la inversión como real, se descuenta de la billetera correspondiente.',
    example: 'Capital ARS 500.000 · TNA 110% · 30 días · Interés estimado: ARS 45.205 · Total al vencimiento: ARS 545.205',
    impact: [
      'La simulación no modifica ningún saldo ni registro',
      'Al guardar como inversión real, se descuenta de la billetera de origen',
      'Al vencer, podés registrar el cobro para acreditar capital + intereses',
      'El historial muestra inversiones activas, vencidas y renovadas',
    ],
    tips: [
      'Usá la simulación para comparar distintas tasas y plazos antes de invertir',
      'Registrá el plazo fijo como inversión real para que Equal refleje tu patrimonio exacto',
      'Acordate de registrar el cobro al vencimiento para actualizar tu saldo',
    ],
    cta: { label: 'Simular plazo fijo', href: '/plazo-fijo' },
  },

  calendar: {
    key: 'calendar',
    title: '¿Qué muestra el Calendario?',
    description:
      'El Calendario es tu línea temporal financiera. Muestra transacciones registradas, operaciones programadas pendientes, vencimientos de plazos fijos y movimientos de objetivos organizados día a día.',
    example: 'Lunes 15 · Sueldo ARS 250.000 (programado) / Jueves 18 · Alquiler −ARS 120.000 / Viernes 30 · Vence Plazo Fijo',
    impact: [
      'Los días con movimientos muestran puntos indicadores en el calendario',
      'Al seleccionar un día ves el detalle de todos sus eventos financieros',
      'Podés filtrar por tipo: transacciones, programadas, objetivos o plazos fijos',
      'Los insights del período aparecen en la parte inferior de la vista',
    ],
    tips: [
      'Revisá el Calendario a principio de mes para ver los compromisos del período',
      'Usá el filtro "Programadas" para ver solo tus obligaciones fijas pendientes',
      'Los días sin movimientos también son información útil: períodos de bajo gasto',
    ],
  },

  achievements: {
    key: 'achievements',
    title: '¿Qué son los logros financieros?',
    description:
      'Los logros reflejan hábitos financieros consistentes. No son puntos ni trofeos; son indicadores de que estás tomando decisiones saludables de forma sostenida: registrar movimientos, diversificar billeteras, cumplir presupuestos.',
    example: 'Constancia · 30 días registrando movimientos / Ahorro activo · Primer objetivo completado / Sin excederse · 3 meses bajo límite en Alimentación',
    impact: [
      'Los logros en progreso muestran cuánto falta para alcanzarlos',
      'Los logros desbloqueados registran la fecha de cumplimiento',
      'Ningún logro tiene recompensa monetaria ni modifica tu saldo',
      'Son un reflejo de disciplina financiera, no un sistema de puntos',
    ],
    tips: [
      'Los logros más valiosos son los de constancia: requieren tiempo, no grandes acciones',
      'No optimices para desbloquear logros; optimizá tus finanzas y los logros llegarán solos',
      'Podés ocultar logros que no te interesen para mantener la vista limpia',
    ],
  },

  import: {
    key: 'import',
    title: '¿Cómo importar un resumen bancario?',
    description:
      'La importación inteligente convierte resúmenes bancarios en CSV en transacciones organizadas dentro de Equal. Detecta columnas automáticamente, sugiere categorías y te pide revisión antes de confirmar. Nada se guarda hasta que vos lo aprobés.',
    example: 'Subís el CSV de Brubank → Equal detecta fecha, descripción e importe → revisás 48 movimientos → confirmás 46 y descartás 2 duplicados',
    impact: [
      'Ninguna transacción se guarda hasta el paso final de confirmación',
      'Equal detecta duplicados comparando fecha, descripción e importe',
      'Podés editar la categoría de cada fila antes de importar',
      'Al confirmar, todas las transacciones impactan el balance y estadísticas normalmente',
    ],
    tips: [
      'Exportá el CSV desde tu banco en formato estándar (fecha, descripción, importe)',
      'Revisá siempre las categorías sugeridas antes de confirmar',
      'Importá una vez al mes para mantener Equal sincronizado con tus cuentas reales',
      'Si detectás duplicados, descartá los que ya registraste manualmente',
    ],
    cta: { label: 'Importar archivo', href: '/import' },
  },

  estadisticas: {
    key: 'estadisticas',
    title: '¿Qué muestran las Estadísticas?',
    description:
      'Las Estadísticas son el análisis profundo de tu actividad financiera. Muestran tendencias de ingresos y gastos, desglose por categoría, evolución del patrimonio y comparativas entre períodos. Son el lugar para entender el panorama completo.',
    example: 'Últimos 3 meses · Gasto promedio ARS 95.000/mes · Categoría principal: Alimentación 28% · Tendencia: −8% vs mes anterior',
    impact: [
      'Todo el análisis se basa en las transacciones que registraste',
      'Podés filtrar por período (7 días, 30 días, 3 meses, etc.) y por moneda',
      'Los gráficos reflejan datos reales, no estimaciones',
      'La calidad del análisis depende directamente de qué tan bien categorizaste tus movimientos',
    ],
    tips: [
      'Usá el filtro de 3 meses para detectar tendencias que no son visibles mes a mes',
      'Si los datos parecen inconsistentes, revisá que las transacciones tengan categorías asignadas',
      'Exportá el reporte para compartirlo o guardarlo como referencia',
    ],
  },
}
