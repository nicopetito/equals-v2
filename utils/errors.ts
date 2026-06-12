const TECHNICAL_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  {
    pattern: /violates foreign key constraint/i,
    message: 'No se puede completar la operación porque hay datos relacionados.',
  },
  {
    pattern: /duplicate key value violates unique constraint/i,
    message: 'Ya existe un registro con esos datos.',
  },
  {
    pattern: /violates check constraint/i,
    message: 'Los datos ingresados no son válidos.',
  },
  {
    pattern: /null value in column .+ violates not-null constraint/i,
    message: 'Falta completar un campo obligatorio.',
  },
  {
    pattern: /new row violates row-level security policy/i,
    message: 'No tenés permisos para realizar esta acción.',
  },
  {
    pattern: /permission denied/i,
    message: 'No tenés permisos para realizar esta acción.',
  },
  {
    pattern: /not authenticated/i,
    message: 'Tu sesión expiró. Por favor, volvé a iniciar sesión.',
  },
  {
    pattern: /jwt expired/i,
    message: 'Tu sesión expiró. Por favor, volvé a iniciar sesión.',
  },
  {
    pattern: /failed to fetch/i,
    message: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.',
  },
  {
    pattern: /network error/i,
    message: 'No se pudo conectar con el servidor. Verificá tu conexión a internet.',
  },
  {
    pattern: /invalid input syntax for type/i,
    message: 'Los datos ingresados no son válidos.',
  },
  {
    pattern: /value too long for type/i,
    message: 'El texto ingresado es demasiado largo.',
  },
  {
    pattern: /could not serialize access/i,
    message: 'La operación falló por un conflicto temporal. Intentá de nuevo.',
  },
  {
    pattern: /\bERROR:\s+/i,
    message: 'Ocurrió un error en la base de datos. Intentá de nuevo.',
  },
  {
    pattern: /\bDETAIL:\s+/i,
    message: 'Ocurrió un error en la base de datos. Intentá de nuevo.',
  },
]

const TECHNICAL_INDICATORS = [
  /violates/i,
  /constraint/i,
  /\bERROR\b/,
  /\bDETAIL\b/,
  /null value/i,
  /duplicate key/i,
  /permission denied/i,
  /\bjwt\b/i,
  /\bpgrst\b/i,
  /\bpostgrest\b/i,
  /at character \d+/i,
  /at line \d+/i,
  /invalid (input|syntax)/i,
  /error code/i,
]

function isUserFriendlyMessage(msg: string): boolean {
  if (msg.length > 200) return false
  return !TECHNICAL_INDICATORS.some((re) => re.test(msg))
}

/**
 * Maps an unknown thrown value to a user-facing Spanish message.
 * Returns `fallback` for unrecognized technical errors to avoid exposing raw SQL to the user.
 */
export function getErrorMessage(e: unknown, fallback: string): string {
  if (!(e instanceof Error)) return fallback
  const msg = e.message
  for (const { pattern, message } of TECHNICAL_PATTERNS) {
    if (pattern.test(msg)) return message
  }
  if (isUserFriendlyMessage(msg)) return msg
  return fallback
}
