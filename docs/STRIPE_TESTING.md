# Stripe test-mode setup

This workflow configures and verifies Berri's individual Founder subscription without using live-mode resources or printing secrets.

## 1. Rotate the exposed test key

Any Stripe secret pasted into chat, an issue, a prompt, or a log must be treated as compromised. In Stripe test mode, roll the exposed secret key and create a replacement before continuing. Do not reuse the key that appeared in the Codex task.

Add the replacement only to `.env.local`:

```dotenv
STRIPE_SECRET_KEY=replace-with-the-new-sk-test-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The publishable key is not required because Berri redirects to Stripe-hosted Checkout and does not mount Stripe Elements in the browser.

## 2. Create or verify test products

Run:

```bash
pnpm stripe:setup:test
```

The command refuses live keys, creates or reuses the test-mode Founder product, monthly `$99` price, annual `$948` price, and self-service portal configuration. It prints only non-secret IDs. Copy those lines into `.env.local`:

```dotenv
STRIPE_FOUNDER_MONTHLY_PRICE_ID=price_...
STRIPE_FOUNDER_ANNUAL_PRICE_ID=price_...
STRIPE_BILLING_PORTAL_CONFIGURATION_ID=bpc_...
```

Growth price IDs are not required for the Founder-only self-serve launch.

## 3. Forward signed webhooks locally

Install the Stripe CLI using Stripe's official instructions, authenticate it, then run:

```bash
stripe login
stripe listen \
  --events checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed,customer.subscription.trial_will_end,invoice.paid,invoice.payment_failed \
  --forward-to http://localhost:3000/api/subscription/webhook
```

The CLI prints a temporary `whsec_...` signing secret. Put it in `.env.local` as `STRIPE_WEBHOOK_SECRET` and restart `pnpm dev`. Never commit or paste the signing secret into chat.

For a Vercel preview, create a Stripe test-mode webhook endpoint for:

```text
https://<preview-host>/api/subscription/webhook
```

Configure the endpoint signing secret in that preview's Vercel environment instead of using the local CLI secret.

## 4. Verify configuration

Run:

```bash
pnpm stripe:verify
```

This read-only check verifies test-mode API access, both Founder prices, the billing portal cancellation/payment-method settings, the webhook signing-secret format, and the application return URL. It never prints secret values.

## 5. Initialize an isolated Neo4j schema

Use only a local or disposable preview Neo4j database. Start the application and invoke the admin-protected schema route with the development admin secret:

```bash
curl -X POST \
  -H "x-admin-secret: $ADMIN_SECRET" \
  http://localhost:3000/api/neo4j/init-schema
```

Do not run this against production without explicit approval and a reviewed rollout.

## 6. Exercise the customer journey

1. Start `pnpm dev` and keep `stripe listen` running.
2. Sign in through Privy and complete the free preview.
3. Select Founder monthly or annual and start the fourteen-day trial.
4. Complete hosted Checkout with a Stripe test card from Stripe's official testing documentation.
5. Return to Billing and confirm the trial dates appear after the webhook is processed.
6. Open **Manage Trial**, update the test payment method, and schedule cancellation.
7. Confirm access remains through the displayed period end and the cancellation state appears in Berri.
8. Replay a webhook from the Stripe CLI and confirm the subscription is not duplicated.
9. Invoke `/api/cron/reconcile-subscriptions` with the development cron bearer secret and confirm the response reports successful reconciliation.

## Expected boundaries

- Checkout redirects alone never grant access.
- Only verified Stripe webhooks or reconciliation update entitlement state.
- `trialing` and `active` grant paid access; recovery-required and unknown states fail closed.
- No card details or complete Stripe payloads are stored in Neo4j or application logs.
- Dodo credentials are not used by the application and should be removed from the project environment after confirming they are unused elsewhere.
