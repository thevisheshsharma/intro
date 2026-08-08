import { describe, expect, it } from 'vitest'
import { hasValidBearerSecret, hasValidSecret } from './secrets'

describe('secret verification', () => {
  it('fails closed when either value is absent', () => {
    expect(hasValidSecret(null, undefined)).toBe(false)
    expect(hasValidSecret('provided', undefined)).toBe(false)
    expect(hasValidSecret(null, 'expected')).toBe(false)
  })

  it('accepts only an exact secret', () => {
    expect(hasValidSecret('expected', 'expected')).toBe(true)
    expect(hasValidSecret('Expected', 'expected')).toBe(false)
    expect(hasValidSecret('expected-extra', 'expected')).toBe(false)
  })

  it('requires a correctly formatted bearer secret', () => {
    expect(hasValidBearerSecret('Bearer expected', 'expected')).toBe(true)
    expect(hasValidBearerSecret('expected', 'expected')).toBe(false)
    expect(hasValidBearerSecret('bearer expected', 'expected')).toBe(false)
  })
})
