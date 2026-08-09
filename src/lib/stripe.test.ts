import { afterEach, describe, expect, it } from 'vitest'
import { getAppUrl, mapStripeStatus } from './stripe'

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL

afterEach(() => {
  if (originalAppUrl === undefined) {
    delete process.env.NEXT_PUBLIC_APP_URL
  } else {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl
  }
})

describe('Stripe billing configuration', () => {
  it('fails closed when the application URL is missing', () => {
    delete process.env.NEXT_PUBLIC_APP_URL
    expect(() => getAppUrl()).toThrow('NEXT_PUBLIC_APP_URL is not set')
  })

  it('allows HTTPS and local HTTP origins only', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.berri.example/path'
    expect(getAppUrl()).toBe('https://app.berri.example')

    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000/path'
    expect(getAppUrl()).toBe('http://localhost:3000')

    process.env.NEXT_PUBLIC_APP_URL = 'http://app.berri.example'
    expect(() => getAppUrl()).toThrow('must use HTTPS')
  })
})

describe('Stripe subscription status mapping', () => {
  it('grants eligible states and fails closed for incomplete states', () => {
    expect(mapStripeStatus('trialing')).toBe('trialing')
    expect(mapStripeStatus('active')).toBe('active')
    expect(mapStripeStatus('past_due')).toBe('past_due')
    expect(mapStripeStatus('unpaid')).toBe('past_due')
    expect(mapStripeStatus('paused')).toBe('past_due')
    expect(mapStripeStatus('incomplete')).toBe('expired')
  })
})
