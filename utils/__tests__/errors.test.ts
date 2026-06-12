import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '@/utils/errors'

describe('getErrorMessage', () => {
  it('maps foreign key violation to friendly message', () => {
    const e = new Error('insert or update on table "transactions" violates foreign key constraint "fk_wallet"')
    expect(getErrorMessage(e, 'fallback')).toBe(
      'No se puede completar la operación porque hay datos relacionados.'
    )
  })

  it('maps duplicate key to friendly message', () => {
    const e = new Error('duplicate key value violates unique constraint "categories_pkey"')
    expect(getErrorMessage(e, 'fallback')).toMatch(/Ya existe/)
  })

  it('maps check constraint violation to friendly message', () => {
    const e = new Error('new row for relation "wallets" violates check constraint "wallets_balance_check"')
    expect(getErrorMessage(e, 'fallback')).toMatch(/no son válidos/)
  })

  it('maps not-null constraint to friendly message', () => {
    const e = new Error('null value in column "wallet_id" violates not-null constraint')
    expect(getErrorMessage(e, 'fallback')).toMatch(/campo obligatorio/)
  })

  it('maps RLS violation to permissions message', () => {
    const e = new Error('new row violates row-level security policy for table "transactions"')
    expect(getErrorMessage(e, 'fallback')).toMatch(/permisos/)
  })

  it('maps permission denied to permissions message', () => {
    const e = new Error('permission denied for table wallets')
    expect(getErrorMessage(e, 'fallback')).toMatch(/permisos/)
  })

  it('maps jwt expired to session message', () => {
    const e = new Error('JWT expired')
    expect(getErrorMessage(e, 'fallback')).toMatch(/sesión/)
  })

  it('maps not authenticated to session message', () => {
    const e = new Error('Not authenticated')
    expect(getErrorMessage(e, 'fallback')).toMatch(/sesión/)
  })

  it('maps failed to fetch to network message', () => {
    const e = new Error('Failed to fetch')
    expect(getErrorMessage(e, 'fallback')).toMatch(/internet/)
  })

  it('maps network error to network message', () => {
    const e = new Error('Network Error')
    expect(getErrorMessage(e, 'fallback')).toMatch(/internet/)
  })

  it('passes through already-friendly Spanish message from service layer', () => {
    const e = new Error('El monto debe ser mayor a 0.')
    expect(getErrorMessage(e, 'fallback')).toBe('El monto debe ser mayor a 0.')
  })

  it('passes through another friendly service-level message', () => {
    const e = new Error('Seleccioná una billetera para registrar esta transacción.')
    expect(getErrorMessage(e, 'fallback')).toBe('Seleccioná una billetera para registrar esta transacción.')
  })

  it('passes through short user-friendly messages without technical words', () => {
    const e = new Error('No se puede eliminar una transacción con reintegro acreditado.')
    expect(getErrorMessage(e, 'fallback')).toBe('No se puede eliminar una transacción con reintegro acreditado.')
  })

  it('maps invalid input syntax (Supabase/Postgres) to friendly message', () => {
    const e = new Error('invalid input syntax for type uuid: "not-a-uuid"')
    expect(getErrorMessage(e, 'Error desconocido')).toMatch(/no son válidos/)
  })

  it('returns fallback for unrecognized technical error with line reference', () => {
    const e = new Error('some obscure internal error code XYZ-9999 at line 42')
    expect(getErrorMessage(e, 'Error desconocido')).toBe('Error desconocido')
  })

  it('returns fallback for long message (likely stack trace)', () => {
    const e = new Error('a'.repeat(201))
    expect(getErrorMessage(e, 'fallback largo')).toBe('fallback largo')
  })

  it('returns fallback when e is a string', () => {
    expect(getErrorMessage('string error', 'fallback')).toBe('fallback')
  })

  it('returns fallback when e is null', () => {
    expect(getErrorMessage(null, 'fallback')).toBe('fallback')
  })

  it('returns fallback when e is undefined', () => {
    expect(getErrorMessage(undefined, 'fallback')).toBe('fallback')
  })

  it('returns fallback when e is a number', () => {
    expect(getErrorMessage(42, 'fallback')).toBe('fallback')
  })

  it('returns fallback when e is a plain object', () => {
    expect(getErrorMessage({ message: 'error' }, 'fallback')).toBe('fallback')
  })
})
