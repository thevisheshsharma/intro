export type ApiAccessClass =
  | 'public-webhook'
  | 'authenticated'
  | 'owner'
  | 'pathfinder'
  | 'people-intel'
  | 'company-intel'
  | 'admin'
  | 'cron'

export const API_AUTHORIZATION_MATRIX = {
  'src/app/api/admin/cleanup-duplicates/route.ts': 'admin',
  'src/app/api/admin/llama-sync/route.ts': 'admin',
  'src/app/api/cron/reconcile-subscriptions/route.ts': 'cron',
  'src/app/api/cron/llama-sync/route.ts': 'cron',
  'src/app/api/find-from-org/route.ts': 'people-intel',
  'src/app/api/find-mutuals/route.ts': 'pathfinder',
  'src/app/api/grok-analyze-org/route.ts': 'company-intel',
  'src/app/api/llama-sync/route.ts': 'admin',
  'src/app/api/neo4j/init-schema/route.ts': 'admin',
  'src/app/api/onboarding/analyze/route.ts': 'authenticated',
  'src/app/api/onboarding/status/route.ts': 'owner',
  'src/app/api/organization-icp-analysis/save/route.ts': 'company-intel',
  'src/app/api/profile/[userId]/route.ts': 'owner',
  'src/app/api/subscription/checkout/route.ts': 'authenticated',
  'src/app/api/subscription/portal/route.ts': 'authenticated',
  'src/app/api/subscription/route.ts': 'authenticated',
  'src/app/api/subscription/webhook/route.ts': 'public-webhook',
  'src/app/api/twitter/followers/route.ts': 'pathfinder',
  'src/app/api/twitter/following-list/route.ts': 'pathfinder',
  'src/app/api/twitter/user-lookup/route.ts': 'pathfinder',
  'src/app/api/user/complete-onboarding/route.ts': 'authenticated',
  'src/app/api/user/onboarding-status/route.ts': 'authenticated',
  'src/app/api/user/profile/route.ts': 'owner',
  'src/app/api/user/session/route.ts': 'authenticated',
  'src/app/api/user/sync-followers/route.ts': 'owner',
} as const satisfies Record<string, ApiAccessClass>
