import { describe, expect, it } from 'vitest'
import { optionalNonNegativeNumber, required, slugPattern } from '@/lib/formValidators'

describe('required', () => {
  const validate = required('Champ requis')

  it('rejects empty or whitespace-only values', () => {
    expect(validate({ value: '' })).toBe('Champ requis')
    expect(validate({ value: '   ' })).toBe('Champ requis')
  })

  it('accepts non-empty values', () => {
    expect(validate({ value: 'ok' })).toBeUndefined()
  })
})

describe('slugPattern', () => {
  const validate = slugPattern('Slug invalide')

  it('accepts an empty value (handled by required separately)', () => {
    expect(validate({ value: '' })).toBeUndefined()
  })

  it('accepts valid slugs', () => {
    expect(validate({ value: 'aube-brisee' })).toBeUndefined()
    expect(validate({ value: 'set2' })).toBeUndefined()
  })

  it('rejects slugs with uppercase, spaces or leading/trailing dashes', () => {
    expect(validate({ value: 'Aube-Brisee' })).toBe('Slug invalide')
    expect(validate({ value: 'aube brisee' })).toBe('Slug invalide')
    expect(validate({ value: '-aube' })).toBe('Slug invalide')
  })
})

describe('optionalNonNegativeNumber', () => {
  const validate = optionalNonNegativeNumber('Nombre invalide')

  it('accepts empty, zero and positive numbers', () => {
    expect(validate({ value: '' })).toBeUndefined()
    expect(validate({ value: 0 })).toBeUndefined()
    expect(validate({ value: '12' })).toBeUndefined()
  })

  it('rejects negative numbers and non-numeric strings', () => {
    expect(validate({ value: -1 })).toBe('Nombre invalide')
    expect(validate({ value: 'abc' })).toBe('Nombre invalide')
  })
})
