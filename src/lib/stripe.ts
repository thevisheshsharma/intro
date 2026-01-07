import Stripe from 'stripe'

// Initialize Stripe client (will throw if used without STRIPE_SECRET_KEY)
function getStripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    typescript: true,
  })
}

// Lazy initialization to avoid errors during build
let _stripe: Stripe | null = null
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    if (!_stripe) {
      _stripe = getStripeClient()
    }
    return (_stripe as any)[prop]
  },
})

// Price IDs for subscription plans
export const PRICE_IDS = {
  founder: {
    monthly: process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_FOUNDER_ANNUAL_PRICE_ID || '',
  },
  standard: {
    monthly: process.env.STRIPE_STANDARD_MONTHLY_PRICE_ID || '',
    annual: process.env.STRIPE_STANDARD_ANNUAL_PRICE_ID || '',
  },
} as const

// Map price ID to plan name
export function getPlanFromPriceId(priceId: string): 'founder' | 'standard' | null {
  if (priceId === PRICE_IDS.founder.monthly || priceId === PRICE_IDS.founder.annual) {
    return 'founder'
  }
  if (priceId === PRICE_IDS.standard.monthly || priceId === PRICE_IDS.standard.annual) {
    return 'standard'
  }
  return null
}

// Map Stripe subscription status to our status
export function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' {
  switch (stripeStatus) {
    case 'trialing':
      return 'trialing'
    case 'active':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'canceled':
    case 'unpaid':
      return 'canceled'
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'expired'
  }
}
