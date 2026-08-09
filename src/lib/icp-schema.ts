import { z } from 'zod'

const nullableString = z.string().nullable()
const nullableStrings = z.array(z.string()).nullable()
const nullableNumber = z.number().nullable()

export const ICPAnalysisSchema = z.object({
  twitter_username: z.string(),
  timestamp_utc: z.string(),
  name: nullableString,
  website: nullableString,
  industry: nullableString,
  key_features: nullableStrings,
  audience: nullableStrings,
  geography: z.array(z.enum(['North America', 'Europe', 'Asia', 'LaTam', 'China', 'Africa', 'Oceania', 'Global'])).nullable(),
  status: z.enum(['development', 'testnet', 'mainnet', 'active', 'other', 'deprecated', 'acquired']).nullable(),
  discord: nullableString,
  farcaster: nullableString,
  telegram: nullableString,
  governance_forum: nullableString,
  linkedin: nullableString,
  youtube: nullableString,
  medium: nullableString,
  blog: nullableString,
  github: nullableStrings,
  whitepaper: nullableString,
  docs: nullableString,
  explorer: nullableString,
  api_docs: nullableString,
  chains: nullableStrings,
  tech_stack: nullableStrings,
  dev_tools: nullableStrings,
  auditor: nullableStrings,
  audit_date: nullableString,
  audit_links: nullableString,
  tge: z.enum(['pre-tge', 'post-tge']).nullable(),
  token: nullableString,
  utilities: z.array(z.enum(['governance', 'staking', 'fee_payment', 'fee_discount', 'collateral', 'rewards', 'access', 'liquidity_mining', 'other'])).nullable(),
  tokenomics_model: nullableString,
  governance: nullableString,
  funding_stage: z.enum(['bootstrapped', 'pre-seed', 'seed', 'series_a', 'series_b', 'series_c', 'Grants', 'Private', 'self-sustaining', 'ICO', 'Public']).nullable(),
  funding_amount: z.enum(['<1M', '1-5M', '5-10M', '10-50M', '50-100M', '>100M', 'undisclosed']).nullable(),
  investors: nullableStrings,
  sentiment_score: z.number().min(0).max(1).nullable(),
  market_presence: nullableString,
  competitors: nullableStrings,
  monetization_stage: z.enum(['no_revenue', 'pilot_customers', 'early_revenue', 'scaling_revenue', 'mature_revenue']).nullable(),
  maturity: z.enum(['emerging', 'early_growth', 'rapid_growth', 'maturing', 'mature', 'declining']).nullable(),
  product_stage: z.enum(['concept', 'mvp', 'beta', 'ga', 'growth', 'maturity', 'sunset']).nullable(),
  community_health_score: z.number().min(0).max(1).nullable(),
  narratives: nullableStrings,
  partners: nullableStrings,
  recent_updates: nullableStrings,
  engagement_patterns: nullableStrings,
  user_journey: nullableString,
  retention_factors: nullableStrings,
  engagement_depth: nullableString,
  age_groups: nullableStrings,
  experience: nullableStrings,
  roles: nullableStrings,
  motivations: nullableStrings,
  decision_factors: nullableStrings,
  interaction_preferences: nullableStrings,
  activity_patterns: nullableStrings,
  conversion_factors: nullableStrings,
  loyalty_indicators: nullableStrings,
  user_archetypes: z.array(z.object({
    archetype_name: z.string(),
    size_estimate: z.enum(['small', 'medium', 'large']),
    priority_level: z.enum(['primary', 'secondary', 'tertiary']),
  })).nullable(),
  messaging_strategy: z.object({
    tone: nullableString,
    key_messages: nullableStrings,
    primary_channels: nullableStrings,
  }).nullable(),
  category: nullableStrings,
  tvl: nullableNumber,
  yield: nullableStrings,
  liquidity_incentives: nullableString,
  fee_model: nullableString,
  platforms: nullableStrings,
  nft_model: nullableString,
  gameplay: nullableStrings,
  game_token: nullableStrings,
  nft_assets: nullableStrings,
  p2e_model: nullableString,
  trading: nullableString,
  monthly_users: nullableNumber,
  creators: nullableNumber,
  monetization: nullableString,
  rewards: nullableString,
  tx_per_day: nullableNumber,
  projects: nullableNumber,
  market_share: nullableNumber,
  throughput: nullableString,
  cost_per_tx: nullableNumber,
  validator_economics: nullableString,
  staking: nullableString,
  trading_pairs: nullableNumber,
  assets: nullableStrings,
  volume_24h: nullableNumber,
  rank: nullableNumber,
  liquidity: nullableNumber,
  fiat: nullableStrings,
  maker_fee: nullableNumber,
  taker_fee: nullableNumber,
  withdrawal_fee: nullableNumber,
  stage: nullableString,
  sectors: nullableStrings,
  portfolio: nullableString,
  fund_size: nullableNumber,
  portfolio_size: nullableNumber,
  investments: nullableStrings,
  reputation: nullableString,
  symbol: nullableString,
  model: nullableStrings,
  case_studies: nullableString,
  testimonials: nullableString,
  clients: nullableStrings,
  team_size: nullableString,
  mission: nullableString,
  membership: nullableString,
  members: nullableNumber,
  reach: nullableNumber,
  initiatives: nullableStrings,
  benefits: nullableStrings,
  treasury: nullableString,
  collection_size: nullableNumber,
  floor_price: nullableNumber,
  total_volume: nullableNumber,
  unique_holders: nullableNumber,
  utility_features: nullableStrings,
  marketplace_integrations: nullableStrings,
  asset_types: nullableStrings,
  creator_royalties: nullableNumber,
  launch_mechanism: nullableString,
  community_features: nullableStrings,
})

export type ICPAnalysis = z.infer<typeof ICPAnalysisSchema>

export const ICP_ANALYSIS_FIELDS = Object.keys(ICPAnalysisSchema.shape) as Array<keyof ICPAnalysis>
export const ICP_CACHE_DAYS = 60

const CORE_RESEARCH_FIELDS = [
  'name', 'website', 'industry', 'key_features', 'audience', 'geography', 'status',
  'discord', 'farcaster', 'telegram', 'governance_forum', 'linkedin', 'youtube',
  'blog', 'github', 'whitepaper', 'docs', 'explorer', 'api_docs',
  'chains', 'tech_stack', 'dev_tools', 'auditor', 'audit_date', 'audit_links',
  'tge', 'token', 'utilities', 'tokenomics_model', 'governance', 'funding_stage',
  'funding_amount', 'investors', 'market_presence', 'competitors',
  'monetization_stage', 'maturity', 'product_stage',
  'narratives', 'partners', 'recent_updates', 'engagement_patterns', 'user_journey',
  'retention_factors', 'engagement_depth', 'experience', 'roles',
  'motivations', 'decision_factors', 'activity_patterns',
  'conversion_factors', 'loyalty_indicators', 'user_archetypes', 'messaging_strategy',
] as const satisfies readonly (keyof ICPAnalysis)[]

const TYPE_RESEARCH_FIELDS = {
  defi: ['category', 'tvl', 'yield', 'liquidity_incentives', 'fee_model'],
  gaming: ['platforms', 'nft_model', 'gameplay', 'game_token', 'nft_assets', 'p2e_model'],
  social: ['trading', 'monthly_users', 'creators', 'monetization', 'rewards'],
  infrastructure: ['tx_per_day', 'projects', 'market_share', 'throughput', 'cost_per_tx', 'validator_economics', 'staking'],
  exchange: ['trading_pairs', 'assets', 'volume_24h', 'rank', 'liquidity', 'fiat', 'maker_fee', 'taker_fee', 'withdrawal_fee'],
  investment: ['stage', 'sectors', 'portfolio', 'fund_size', 'portfolio_size', 'investments'],
  service: ['reputation', 'symbol', 'model', 'case_studies', 'testimonials', 'clients', 'team_size'],
  community: ['mission', 'membership', 'members', 'reach', 'initiatives', 'benefits', 'treasury'],
  nft: ['collection_size', 'floor_price', 'total_volume', 'unique_holders', 'utility_features', 'marketplace_integrations', 'asset_types', 'creator_royalties', 'launch_mechanism', 'community_features'],
} as const satisfies Record<string, readonly (keyof ICPAnalysis)[]>

/**
 * Grok only generates the common ICP fields plus fields relevant to the
 * classified organization type. The persisted object is expanded back to the
 * complete canonical schema with nulls after generation.
 */
export function createICPResearchSchema(orgType?: string): z.ZodType<Partial<ICPAnalysis>> {
  const typeFields = orgType && orgType in TYPE_RESEARCH_FIELDS
    ? TYPE_RESEARCH_FIELDS[orgType as keyof typeof TYPE_RESEARCH_FIELDS]
    : []
  const selectedFields = new Set<keyof ICPAnalysis>([...CORE_RESEARCH_FIELDS, ...typeFields])
  const shape = Object.fromEntries(
    Array.from(selectedFields, field => [field, ICPAnalysisSchema.shape[field]])
  ) as Partial<typeof ICPAnalysisSchema.shape>

  return z.object(shape) as z.ZodType<Partial<ICPAnalysis>>
}
