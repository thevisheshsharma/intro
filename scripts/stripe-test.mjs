import dotenv from 'dotenv'
import Stripe from 'stripe'

dotenv.config({ path: '.env.local', override: false })

const command = process.argv[2] || 'verify'
const secretKey = process.env.STRIPE_SECRET_KEY

if (!secretKey) {
  fail('STRIPE_SECRET_KEY is missing from .env.local')
}

if (!secretKey.startsWith('sk_test_')) {
  fail('Refusing to run: STRIPE_SECRET_KEY must be a Stripe test-mode key')
}

const stripe = new Stripe(secretKey, { typescript: true, maxNetworkRetries: 2 })

const founderPrices = {
  monthly: {
    lookupKey: 'berri_founder_monthly',
    unitAmount: 9_900,
    interval: 'month',
  },
  annual: {
    lookupKey: 'berri_founder_annual',
    unitAmount: 94_800,
    interval: 'year',
  },
}

const portalFeatures = {
  customer_update: {
    enabled: true,
    allowed_updates: ['address', 'name', 'tax_id'],
  },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_cancel: {
    enabled: true,
    mode: 'at_period_end',
    cancellation_reason: {
      enabled: true,
      options: ['missing_features', 'other', 'too_expensive', 'unused'],
    },
  },
  subscription_update: { enabled: false },
}

try {
  if (command === 'setup') {
    await setupTestResources()
  } else if (command === 'verify') {
    await verifyTestResources()
  } else {
    fail(`Unknown command: ${command}`)
  }
} catch (error) {
  fail(error instanceof Error ? error.message : 'Stripe operation failed')
}

async function setupTestResources() {
  await stripe.balance.retrieve()
  const product = await findOrCreateFounderProduct()
  const monthlyPrice = await findOrCreatePrice(product.id, founderPrices.monthly)
  const annualPrice = await findOrCreatePrice(product.id, founderPrices.annual)
  const portalConfiguration = await findOrCreatePortalConfiguration()

  console.log('Stripe test resources are ready. Add these non-secret values to .env.local:')
  console.log(`STRIPE_FOUNDER_MONTHLY_PRICE_ID=${monthlyPrice.id}`)
  console.log(`STRIPE_FOUNDER_ANNUAL_PRICE_ID=${annualPrice.id}`)
  console.log(`STRIPE_BILLING_PORTAL_CONFIGURATION_ID=${portalConfiguration.id}`)
  console.log('Then configure STRIPE_WEBHOOK_SECRET using Stripe CLI or a preview webhook endpoint.')
}

async function verifyTestResources() {
  const appUrl = requiredEnv('NEXT_PUBLIC_APP_URL')
  const webhookSecret = requiredEnv('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret.startsWith('whsec_')) {
    throw new Error('STRIPE_WEBHOOK_SECRET does not look like a Stripe signing secret')
  }

  const monthlyPriceId = requiredEnv('STRIPE_FOUNDER_MONTHLY_PRICE_ID')
  const annualPriceId = requiredEnv('STRIPE_FOUNDER_ANNUAL_PRICE_ID')
  const portalConfigurationId = requiredEnv('STRIPE_BILLING_PORTAL_CONFIGURATION_ID')

  await stripe.balance.retrieve()
  await verifyPrice(monthlyPriceId, founderPrices.monthly)
  await verifyPrice(annualPriceId, founderPrices.annual)

  const portalConfiguration = await stripe.billingPortal.configurations.retrieve(
    portalConfigurationId
  )
  if (!portalConfiguration.active) {
    throw new Error('Configured Stripe billing portal configuration is inactive')
  }
  assertPortalConfiguration(portalConfiguration)

  const parsedAppUrl = new URL(appUrl)
  const isLocal = parsedAppUrl.hostname === 'localhost' || parsedAppUrl.hostname === '127.0.0.1'
  if (parsedAppUrl.protocol !== 'https:' && !(isLocal && parsedAppUrl.protocol === 'http:')) {
    throw new Error('NEXT_PUBLIC_APP_URL must be HTTPS outside local development')
  }

  console.log('Stripe test-mode readiness check passed:')
  console.log('- API authentication')
  console.log('- Founder monthly and annual recurring prices')
  console.log('- customer portal payment-method updates and cancellation')
  console.log('- webhook signing-secret format')
  console.log('- application return URL')
}

async function findOrCreateFounderProduct() {
  const products = await stripe.products.list({ active: true, limit: 100 })
  const existing = products.data.find(product => product.metadata.berri_plan === 'founder')
  if (existing) return existing

  return stripe.products.create(
    {
      name: 'Berri Founder',
      description: 'Individual Berri subscription for founder-led Web3 GTM teams.',
      metadata: { berri_plan: 'founder' },
    },
    { idempotencyKey: 'berri-test-founder-product-v1' }
  )
}

async function findOrCreatePrice(productId, expected) {
  const prices = await stripe.prices.list({
    active: true,
    lookup_keys: [expected.lookupKey],
    limit: 1,
  })
  const existing = prices.data[0]
  if (existing) {
    assertPrice(existing, expected)
    return existing
  }

  return stripe.prices.create(
    {
      product: productId,
      currency: 'usd',
      unit_amount: expected.unitAmount,
      lookup_key: expected.lookupKey,
      recurring: { interval: expected.interval },
      metadata: { berri_plan: 'founder' },
    },
    { idempotencyKey: `${expected.lookupKey}-v1` }
  )
}

async function verifyPrice(priceId, expected) {
  const price = await stripe.prices.retrieve(priceId)
  assertPrice(price, expected)
  if (price.livemode) {
    throw new Error(`${expected.lookupKey} unexpectedly belongs to live mode`)
  }
}

function assertPrice(price, expected) {
  if (!price.active) {
    throw new Error(`${expected.lookupKey} is inactive`)
  }
  if (price.currency !== 'usd' || price.unit_amount !== expected.unitAmount) {
    throw new Error(`${expected.lookupKey} does not match Berri's configured USD amount`)
  }
  if (price.type !== 'recurring' || price.recurring?.interval !== expected.interval) {
    throw new Error(`${expected.lookupKey} does not use the expected recurring interval`)
  }
}

async function findOrCreatePortalConfiguration() {
  const configurations = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  })
  const existing = configurations.data.find(
    configuration => configuration.metadata.berri_configuration === 'founder-self-serve'
  )
  if (existing) {
    return stripe.billingPortal.configurations.update(existing.id, {
      features: portalFeatures,
    })
  }

  return stripe.billingPortal.configurations.create(
    {
      name: 'Berri Founder self-serve',
      features: portalFeatures,
      metadata: { berri_configuration: 'founder-self-serve' },
    },
    { idempotencyKey: 'berri-test-founder-portal-v1' }
  )
}

function assertPortalConfiguration(configuration) {
  if (!configuration.features.payment_method_update.enabled) {
    throw new Error('Stripe billing portal must allow payment-method updates')
  }
  if (!configuration.features.subscription_cancel.enabled) {
    throw new Error('Stripe billing portal must allow subscription cancellation')
  }
  if (configuration.features.subscription_cancel.mode !== 'at_period_end') {
    throw new Error('Stripe billing portal must cancel subscriptions at period end')
  }
}

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is missing from .env.local`)
  return value
}

function fail(message) {
  console.error(`Stripe test setup failed: ${message}`)
  process.exit(1)
}
