import { generateObject } from 'ai';
import { xai, GROK_MODELS } from './grok-client';
import { z } from 'zod';
import { getOrganizationProperties, Neo4jAnalysisMapper } from '@/services';

/**
 * Configuration options for ICP analysis depth
 */
export enum ICPAnalysisConfig {
  MINI_FAST = 'MINI_FAST',
  MINI = 'MINI',
  FULL = 'FULL'
}

// Re-export for backwards compatibility
export { GROK_MODELS };

// ================================================================================================
// MODULAR UNIVERSAL SCHEMA COMPONENTS
// ================================================================================================

const UniversalSocialLinksSchema = z.object({
  discord: z.string().nullable().describe("Discord server URL"),
  farcaster: z.string().nullable().describe("Farcaster profile URL"),
  telegram: z.string().nullable().describe("Telegram group URL"),
  governance_forum: z.string().nullable().describe("Governance or DAO or treasury link"),
  linkedin: z.string().nullable().describe("LinkedIn profile URL"),
  youtube: z.string().nullable().describe("YouTube channel URL"),
  medium: z.string().nullable().describe("Medium blog URL"),
  blog: z.string().nullable().describe("Official blog URL"),
});

const UniversalTechnicalSchema = z.object({
  github: z.array(z.string()).nullable().describe("GitHub repository URLs"),
  whitepaper: z.string().nullable().describe("Whitepaper or documentation URL"),
  docs: z.string().nullable().describe("Developer documentation URL"),
  explorer: z.string().nullable().describe("Block explorer or network dashboard URL"),
  api_docs: z.string().nullable().describe("API documentation URL"),
  chains: z.array(z.string()).nullable().describe("Blockchain network slugs"),
  tech_stack: z.array(z.string()).nullable().describe("Core technical components"),
  dev_tools: z.array(z.string()).nullable().describe("Developer tools and SDKs"),
});

const UniversalSecurityAuditSchema = z.object({
  auditor: z.array(z.string()).nullable().describe("Security audit firms (@username format)"),
  audit_date: z.string().nullable().describe("Date of latest audit"),
  audit_links: z.string().nullable().describe("Security audit report URL"),
});

const UniversalTokenomicsSchema = z.object({
  tge: z.enum(['pre-tge', 'post-tge']).nullable().describe("Token Generation Event status"),
  token: z.string().nullable().describe("Native token symbol"),
  utilities: z.array(z.enum(['governance', 'staking', 'fee_payment', 'fee_discount', 'collateral', 'rewards', 'access', 'liquidity_mining', 'other'])).nullable().describe("Token utilities"),
  tokenomics_model: z.string().nullable().describe("Token distribution and value accrual"),
  governance: z.string().nullable().describe("Governance structure"),
});

const UniversalFundingSchema = z.object({
  funding_stage: z.enum(['bootstrapped', 'pre-seed', 'seed', 'series_a', 'series_b', 'series_c', 'Grants', 'Private', 'self-sustaining', 'ICO', 'Public']).nullable().describe("Funding status"),
  funding_amount: z.enum(['<1M', '1-5M', '5-10M', '10-50M', '50-100M', '>100M', 'undisclosed']).nullable().describe("Funding amount range"),
  investors: z.array(z.string()).nullable().describe("Investors (@username format)"),
});

const UniversalMarketMetricsSchema = z.object({
  sentiment_score: z.number().min(0).max(1).nullable().describe("Market sentiment score (0-1)"),
  market_presence: z.string().nullable().describe("Market presence assessment"),
  competitors: z.array(z.string()).nullable().describe("Competitors (@username format)"),
  monetization_stage: z.enum(['no_revenue', 'pilot_customers', 'early_revenue', 'scaling_revenue', 'mature_revenue']).nullable().describe("Monetization stage"),
  maturity: z.enum(['emerging', 'early_growth', 'rapid_growth', 'maturing', 'mature', 'declining']).nullable().describe("Market maturity level"),
  product_stage: z.enum(['concept', 'mvp', 'beta', 'ga', 'growth', 'maturity', 'sunset']).nullable().describe("Product lifecycle stage"),
  community_health_score: z.number().min(0).max(1).nullable().describe("Community health score (0-1)"),
  narratives: z.array(z.string()).nullable().describe("Market narratives"),
  partners: z.array(z.string()).nullable().describe("Partners (@username format)"),
  recent_updates: z.array(z.string()).nullable().describe("Recent developments"),
});

const UniversalUserBehaviorSchema = z.object({
  engagement_patterns: z.array(z.string()).nullable().describe("User engagement patterns"),
  user_journey: z.string().nullable().describe("Typical user journey"),
  retention_factors: z.array(z.string()).nullable().describe("User retention factors"),
  engagement_depth: z.string().nullable().describe("Engagement depth"),
  age_groups: z.array(z.enum(['Gen Z (18-26)', 'Millennials (27-42)', 'Gen X (43-58)', 'Boomers (59+)', 'Mixed Generational', 'Young Professionals (22-35)', 'Mid-Career (35-50)', 'Experienced (50+)', 'Institutions'])).nullable().describe("Age groups"),
  experience: z.array(z.enum(['Beginner', 'Beginner to Intermediate', 'Intermediate', 'Intermediate to Advanced', 'Advanced', 'Expert', 'Mixed Experience'])).nullable().describe("Experience levels"),
  roles: z.array(z.string()).nullable().describe("Professional roles"),
  motivations: z.array(z.string()).nullable().describe("User motivations"),
  decision_factors: z.array(z.string()).nullable().describe("Decision factors"),
  interaction_preferences: z.array(z.string()).nullable().describe("Interaction preferences"),
  activity_patterns: z.array(z.string()).nullable().describe("Activity patterns"),
  conversion_factors: z.array(z.string()).nullable().describe("Conversion factors"),
  loyalty_indicators: z.array(z.string()).nullable().describe("Loyalty indicators"),
});

const UniversalCoreSchema = z.object({
  name: z.string().describe("Official name"),
  website: z.string().nullable().describe("Official website URL"),
  industry: z.string().describe("Industry sector"),
  key_features: z.array(z.string()).nullable().describe("Key features"),
  audience: z.array(z.string()).nullable().describe("Target audience"),
  geography: z.array(z.enum(['North America', 'Europe', 'Asia', 'LaTam', 'China', 'Africa', 'Oceania', 'Global'])).nullable().describe("Geographic focus"),
  status: z.enum(['development', 'testnet', 'mainnet', 'active', 'other', 'deprecated', 'acquired']).nullable().describe("Operational status"),
});

// Category-specific extensions
const DeFiProtocolExtensions = z.object({
  category: z.string().nullable().describe("DeFi category"),
  tvl: z.number().min(0).nullable().describe("Total Value Locked in USD"),
  yield: z.array(z.string()).nullable().describe("Yield mechanisms"),
  liquidity_incentives: z.string().nullable().describe("Liquidity incentives"),
  fee_model: z.string().nullable().describe("Fee model"),
});

const GameFiProtocolExtensions = z.object({
  category: z.string().nullable().describe("Gaming category"),
  platforms: z.array(z.enum(['Mobile', 'Web', 'Desktop', 'VR', 'other'])).nullable().describe("Platforms"),
  nft_model: z.string().nullable().describe("NFT model"),
  gameplay: z.array(z.string()).nullable().describe("Gameplay features"),
  game_token: z.array(z.string()).nullable().describe("In-game tokens"),
  nft_assets: z.array(z.string()).nullable().describe("NFT assets"),
  p2e_model: z.string().nullable().describe("P2E model"),
  trading: z.string().nullable().describe("Trading mechanics"),
});

const SocialProtocolExtensions = z.object({
  category: z.string().nullable().describe("Social category"),
  monthly_users: z.number().int().min(0).nullable().describe("Monthly active users"),
  creators: z.number().int().min(0).nullable().describe("Number of creators"),
  monetization: z.string().nullable().describe("Creator monetization"),
  rewards: z.string().nullable().describe("Content rewards"),
});

const InfrastructureExtensions = z.object({
  category: z.enum(['Layer1', 'Layer2', 'Rollup', 'Bridge', 'Oracle', 'Storage', 'Compute', 'Indexing', 'RPC', 'Node', 'Validator', 'Wallet', 'Account Abstraction', 'Interoperability', 'MEV', 'ZK', 'Data Availability', 'Sequencer', 'Security', 'Identity', 'Dev Tooling', 'Monitoring', 'Messaging', 'Governance', 'Other']).nullable().describe("Infrastructure category"),
  tx_per_day: z.number().int().min(0).nullable().describe("Daily transactions"),
  projects: z.number().int().min(0).nullable().describe("Projects building on this"),
  market_share: z.number().min(0).max(1).nullable().describe("Market share"),
  throughput: z.string().nullable().describe("TPS"),
  cost_per_tx: z.number().min(0).nullable().describe("Cost per transaction"),
  validator_economics: z.string().nullable().describe("Validator economics"),
  staking: z.string().nullable().describe("Staking model"),
  fee_model: z.string().nullable().describe("Fee structure"),
});

const ExchangeExtensions = z.object({
  category: z.enum(['CEX', 'DEX', 'Hybrid', 'Aggregator']).nullable().describe("Exchange type"),
  trading_pairs: z.number().int().min(0).nullable().describe("Trading pairs"),
  assets: z.array(z.string()).nullable().describe("Supported assets"),
  volume_24h: z.number().min(0).nullable().describe("24h volume"),
  rank: z.number().int().min(1).nullable().describe("Market rank"),
  liquidity: z.number().min(0).max(1).nullable().describe("Liquidity depth"),
  fiat: z.array(z.string()).nullable().describe("Fiat currencies"),
  maker_fee: z.number().min(0).nullable().describe("Maker fee"),
  taker_fee: z.number().min(0).nullable().describe("Taker fee"),
  withdrawal_fee: z.number().min(0).nullable().describe("Withdrawal fee"),
  liquidity_incentives: z.string().nullable().describe("Liquidity incentives"),
});

const InvestmentFundExtensions = z.object({
  category: z.enum(['Venture Capital', 'Accelerator', 'Family Office', 'Corporate VC', 'Other']).nullable().describe("Fund type"),
  stage: z.enum(['Agnostic', 'Grants', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Institutional', 'ICO']).nullable().describe("Investment stage"),
  sectors: z.array(z.string()).nullable().describe("Sector focus"),
  portfolio: z.string().nullable().describe("Portfolio URL"),
  fund_size: z.number().min(0).nullable().describe("Fund size"),
  portfolio_size: z.number().int().min(0).nullable().describe("Portfolio companies"),
  investments: z.array(z.string()).nullable().describe("Portfolio investments (@username)"),
  reputation: z.enum(['Tier S', 'Tier A', 'Tier B', 'Tier C']).nullable().describe("Reputation"),
  symbol: z.string().nullable().describe("Fund token"),
  model: z.array(z.enum(['Equity', 'Debt', 'Tokens', 'Hybrid', 'Other'])).nullable().describe("Investment model"),
});

const ServiceProviderExtensions = z.object({
  category: z.array(z.enum(['Development', 'Marketing', 'Legal', 'PR', 'Audits', 'Community Management', 'Tokenomics', 'Design', 'Governance Advisory', 'Content', 'Partnerships', 'Education & Training', 'Localization', 'Event Management'])).nullable().describe("Service category"),
  case_studies: z.string().nullable().describe("Case studies URL"),
  testimonials: z.string().nullable().describe("Testimonials URL"),
  clients: z.array(z.string()).nullable().describe("Clients (@username)"),
  team_size: z.enum(['1-5', '6-15', '16-50', '51-100', '100+', 'undisclosed']).nullable().describe("Team size"),
});

const CommunityDAOExtensions = z.object({
  category: z.array(z.enum(['DAO', 'Guild', 'Regional', 'Builder', 'Grants', 'Supporter', 'Collector', 'Research', 'Creator'])).nullable().describe("Community type"),
  mission: z.string().nullable().describe("Mission"),
  membership: z.string().nullable().describe("Membership model"),
  members: z.number().int().min(0).nullable().describe("Member count"),
  reach: z.number().min(0).max(1).nullable().describe("Community reach"),
  initiatives: z.array(z.string()).nullable().describe("Key initiatives"),
  benefits: z.array(z.string()).nullable().describe("Member benefits"),
  treasury: z.string().nullable().describe("Treasury management"),
});

const DigitalAssetsNFTExtensions = z.object({
  category: z.enum(['Marketplace', 'Art Platform', 'Gaming NFTs', 'Music NFTs', 'Sports NFTs', 'Utility NFTs', 'PFP Collection', 'Generative Art', 'Photography', 'Domain Names', 'Virtual Real Estate', 'Fractional Ownership', 'NFT Infrastructure', 'Creator Tools', 'Analytics']).nullable().describe("NFT category"),
  collection_size: z.number().int().min(0).nullable().describe("Collection size"),
  floor_price: z.number().min(0).nullable().describe("Floor price"),
  total_volume: z.number().min(0).nullable().describe("Total volume"),
  unique_holders: z.number().int().min(0).nullable().describe("Unique holders"),
  utility_features: z.array(z.enum(['Art', 'Gaming', 'Membership', 'Access', 'Staking', 'Governance', 'Breeding', 'Evolution', 'P2E', 'Royalties', 'Fractionalization', 'Real World Assets', 'Identity', 'Domain', 'Virtual Land', 'Music Rights', 'IP Rights'])).nullable().describe("Utility features"),
  marketplace_integrations: z.array(z.string()).nullable().describe("Marketplaces (@username)"),
  asset_types: z.array(z.string()).nullable().describe("Asset types"),
  creator_royalties: z.number().min(0).max(100).nullable().describe("Creator royalties %"),
  launch_mechanism: z.enum(['Drop', 'Auction', 'Dutch Auction', 'Whitelist', 'Public Mint', 'Claim', 'Airdrop', 'Marketplace']).nullable().describe("Launch mechanism"),
  community_features: z.array(z.enum(['Discord Integration', 'Token Gating', 'Holder Benefits', 'Events', 'Governance', 'Social Media Integration', 'Creator Tools', 'Analytics Dashboard'])).nullable().describe("Community features"),
});

const UniversalUserBehaviorInsightsSchema = z.object({
  user_archetypes: z.array(z.object({
    archetype_name: z.string().describe("User archetype name"),
    size_estimate: z.enum(['small', 'medium', 'large']).describe("Segment size"),
    priority_level: z.enum(['primary', 'secondary', 'tertiary']).describe("Strategic priority")
  })).describe("User archetypes"),
  messaging_strategy: z.object({
    tone: z.string().nullable().describe("Communication tone"),
    key_messages: z.array(z.string()).nullable().describe("Core value propositions"),
    primary_channels: z.array(z.enum([
      'X', 'discord', 'telegram', 'youtube', 'farcaster', 'instagram', 'tiktok',
      'governance_forum', 'snapshot', 'commonwealth', 'tally', 'lens', 'dscvr',
      'blog', 'newsletter', 'podcast', 'documentation', 'press_releases', 'KOL_partnerships', 'partners',
      'conferences', 'community_calls', 'ama_sessions', 'hackathons', 'airdrops'
    ])).max(5).nullable().describe("Top 5 channels")
  }).nullable().describe("Messaging strategy")
});

// Schema cache for performance
const schemaCache = new Map<string, z.ZodObject<any>>();

/**
 * Generate dynamic ICP Analysis schema based on classification
 */
export function createClassificationSpecificSchema(classification?: {
  orgType?: string
  orgSubtype?: string[]
  web3Focus?: string
}): z.ZodObject<any> {
  const orgType = classification?.orgType || 'protocol';
  const cacheKey = orgType;

  if (schemaCache.has(cacheKey)) {
    return schemaCache.get(cacheKey)!;
  }

  const needsTokenomics = ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'community', 'nft'].includes(orgType);
  const needsTechnical = ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'nft'].includes(orgType);
  const needsSecurity = ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'nft'].includes(orgType);
  const needsFunding = ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'service', 'nft'].includes(orgType);

  // Build up the shape object
  let shapeObj: Record<string, any> = {
    twitter_username: z.string().describe("Twitter username"),
    timestamp_utc: z.string().describe("UTC timestamp of analysis"),
    ...UniversalCoreSchema.shape,
    ...UniversalSocialLinksSchema.shape,
    ...UniversalMarketMetricsSchema.shape,
    ...UniversalUserBehaviorSchema.shape,
    ...UniversalUserBehaviorInsightsSchema.shape,
  };

  if (needsTokenomics) shapeObj = { ...shapeObj, ...UniversalTokenomicsSchema.shape };
  if (needsTechnical) shapeObj = { ...shapeObj, ...UniversalTechnicalSchema.shape };
  if (needsSecurity) shapeObj = { ...shapeObj, ...UniversalSecurityAuditSchema.shape };
  if (needsFunding) shapeObj = { ...shapeObj, ...UniversalFundingSchema.shape };

  // Apply category-specific extensions
  const extensionMap: Record<string, z.ZodObject<any>> = {
    defi: DeFiProtocolExtensions,
    gaming: GameFiProtocolExtensions,
    social: SocialProtocolExtensions,
    infrastructure: InfrastructureExtensions,
    exchange: ExchangeExtensions,
    investment: InvestmentFundExtensions,
    service: ServiceProviderExtensions,
    community: CommunityDAOExtensions,
    nft: DigitalAssetsNFTExtensions,
  };

  if (extensionMap[orgType]) {
    shapeObj = { ...shapeObj, ...extensionMap[orgType].shape };
  }

  const completeSchema = z.object(shapeObj);
  schemaCache.set(cacheKey, completeSchema);
  return completeSchema;
}

export const ICPAnalysisSchema = createClassificationSpecificSchema();

/**
 * Get classification-specific context for ICP analysis
 */
function getClassificationSpecificContext(classification?: { orgType?: string }) {
  const orgType = classification?.orgType || 'protocol';

  const contextMap: Record<string, any> = {
    defi: {
      analysisInstructions: "DeFi protocol. Focus on TVL, yield rates, token utility, smart contract audits.",
      searchPlan: ['{} defillama TVL yield', '{} liquidity mining', '{} smart contract audit'],
      requiredData: 'TVL trends, token economics, security audits, liquidity programs'
    },
    gaming: {
      analysisInstructions: "GameFi protocol. Focus on player metrics, NFT economies, P2E mechanics.",
      searchPlan: ['{} dappradar gaming', '{} NFT gaming assets', '{} play to earn tokenomics'],
      requiredData: 'Daily players, NFT volumes, P2E rewards, in-game economy'
    },
    social: {
      analysisInstructions: "SocialFi protocol. Focus on user engagement, creator monetization.",
      searchPlan: ['{} social engagement creators', '{} creator monetization', '{} social token community'],
      requiredData: 'User engagement, creator revenue, social token utility'
    },
    investment: {
      analysisInstructions: "Investment fund. Focus on portfolio, fund size, investment thesis.",
      searchPlan: ['{} portfolio investments', '{} fund size LP', '{} investment thesis'],
      requiredData: 'Portfolio companies, fund size, investment stage, exits'
    },
    infrastructure: {
      analysisInstructions: "Blockchain infrastructure. Focus on performance, developer adoption.",
      searchPlan: ['{} dune analytics', '{} github developers', '{} performance TPS'],
      requiredData: 'Network metrics, developer adoption, security, fees'
    },
    exchange: {
      analysisInstructions: "Crypto exchange. Focus on volume, liquidity, security.",
      searchPlan: ['{} coingecko volume', '{} security audit', '{} regulatory compliance'],
      requiredData: 'Trading volume, liquidity, security, regulatory status'
    },
    service: {
      analysisInstructions: "Web3 service provider. Focus on services, clients, capabilities.",
      searchPlan: ['{} web3 services clients', '{} case studies', '{} team expertise'],
      requiredData: 'Service offerings, client segments, team expertise'
    },
    community: {
      analysisInstructions: "Web3 community/DAO. Focus on governance, treasury, engagement.",
      searchPlan: ['{} DAO governance', '{} community discord', '{} treasury token'],
      requiredData: 'Community size, governance activity, treasury, member rewards'
    },
    nft: {
      analysisInstructions: "Digital assets/NFTs. Focus on collection metrics, creator economy.",
      searchPlan: ['{} opensea collection', '{} NFT community'],
      requiredData: 'Floor price, volume, holders, creator royalties, utility'
    },
  };

  return contextMap[orgType] || {
    analysisInstructions: "Web3 project. Focus on technical metrics, user adoption, partnerships.",
    searchPlan: ['{} defillama', '{} github', '{} dune analytics', '{} news 2024 2025'],
    requiredData: 'TVL, user metrics, development activity, partnerships'
  };
}

/**
 * Create a structured ICP analysis using Grok with the xAI SDK
 */
export async function createStructuredICPAnalysis(
  twitterUsername: string,
  config: ICPAnalysisConfig = ICPAnalysisConfig.FULL,
  classification?: { orgType?: string; orgSubtype?: string[]; web3Focus?: string },
  options?: { skipCache?: boolean }
): Promise<z.infer<ReturnType<typeof createClassificationSpecificSchema>>> {

  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY environment variable is not configured');
  }

  const cleanUsername = twitterUsername.replace('@', '');
  console.log(`🚀 Starting ICP analysis for @${cleanUsername}`);

  // Fetch existing Neo4j data first
  console.log(`🔍 Fetching existing Neo4j data...`);
  const neo4jData = await getOrganizationProperties(twitterUsername);

  // Check if we have fresh ICP data (skip cache check if explicitly requested)
  const ICP_STALE_DAYS = 90;
  console.log(`🔍 [ICP Cache] Checking cache for @${cleanUsername}: skipCache=${options?.skipCache}, hasData=${!!neo4jData}, last_icp_analysis=${neo4jData?.last_icp_analysis}`);

  if (!options?.skipCache && neo4jData?.last_icp_analysis) {
    const icpUpdatedAt = neo4jData.last_icp_analysis;
    console.log(`🔍 [ICP Cache] Found last_icp_analysis for @${cleanUsername}: ${icpUpdatedAt}`);
    if (icpUpdatedAt) {
      const updateDate = new Date(icpUpdatedAt);
      const staleThreshold = new Date(Date.now() - ICP_STALE_DAYS * 24 * 60 * 60 * 1000);

      if (updateDate > staleThreshold) {
        console.log(`✅ [ICP Cache] Fresh ICP data found for @${cleanUsername} (updated ${icpUpdatedAt}), skipping Grok analysis`);
        return neo4jData as any; // Return cached data
      } else {
        console.log(`⚠️ [ICP Cache] Stale ICP data for @${cleanUsername} (updated ${icpUpdatedAt}), running fresh analysis`);
      }
    } else {
      console.log(`⚠️ [ICP Cache] No timestamp found for @${cleanUsername}, running fresh analysis`);
    }
  } else {
    console.log(`⚠️ [ICP Cache] No last_icp_analysis for @${cleanUsername}, running fresh analysis`);
  }

  const dynamicSchema = createClassificationSpecificSchema(classification);
  const context = getClassificationSpecificContext(classification);

  // Build the prompt
  const systemPrompt = `You are an expert Web3 analyst specializing in Ideal Customer Profile (ICP) analysis.
Use live web search to research organizations and create comprehensive customer profiles.

ANALYSIS FOCUS: ${context.analysisInstructions}

SEARCH PRIORITY: defillama.com, dune.com, github.com, messari.com, coingecko.com, official websites, X posts, Discord, documentation

REQUIREMENTS:
- Use diverse sources including official AND third-party analysis
- Focus on data from 2024-2025 for recent developments
- Cross-validate information across multiple sources
- Extract quantitative metrics where available
- Only report verified data, not estimates`;

  const userPrompt = `Research @${cleanUsername} and create detailed ICP analysis.

${neo4jData && Object.keys(neo4jData).length > 0 ? `KNOWN DATA FROM DATABASE:
${Object.entries(neo4jData)
        .filter(([_, value]) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0))
        .map(([key, value]) => `✅ ${key}: ${Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value}`)
        .join('\n')}

` : ''}SEARCH PLAN:
- Search "@${cleanUsername}" on X for official profile and posts
- ${context.searchPlan.map((p: string) => p.replace('{}', cleanUsername)).join('\n- ')}
- Search "${cleanUsername} partnerships integrations"
- Search "${cleanUsername} tokenomics governance"

REQUIRED DATA: ${context.requiredData}

Execute comprehensive live search and build data-driven ICP analysis.`;

  console.log('🔄 Making Grok API request with xAI SDK...');

  try {
    const result = await generateObject({
      model: xai(GROK_MODELS.ANALYSIS),
      schema: dynamicSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: config === ICPAnalysisConfig.MINI_FAST ? 0.3 : 0.5,
    });

    console.log('✅ Grok API response received');

    const analysis = result.object;

    // Store to Neo4j
    if (neo4jData?.userId && analysis) {
      console.log(`💾 Storing analysis to Neo4j for user ${neo4jData.userId}...`);
      try {
        await Neo4jAnalysisMapper.storeAnalysisToNeo4j(neo4jData.userId, analysis as any, classification);
      } catch (updateError) {
        console.error(`❌ Failed to store analysis to Neo4j:`, updateError);
      }
    }

    console.log(`📋 ICP Analysis completed with ${Object.keys(analysis).length} fields`);
    return analysis;

  } catch (error) {
    console.error('❌ ICP Analysis failed:', error);
    throw new Error(`ICP analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find people associated with an organization using Grok
 */
export async function findOrgAffiliatesWithGrok(orgUsername: string): Promise<string[]> {
  if (!process.env.XAI_API_KEY) {
    throw new Error('XAI_API_KEY environment variable is not configured');
  }

  const cleanUsername = orgUsername.replace('@', '');

  try {
    const result = await generateObject({
      model: xai(GROK_MODELS.CLASSIFICATION),
      schema: z.object({
        usernames: z.array(z.string()).describe("List of Twitter usernames associated with the organization")
      }),
      prompt: `Find all X accounts associated with @${cleanUsername}, including:
- Official accounts
- Team member accounts
- Community member accounts
- Contributor accounts

Search X and web sources to find comprehensive results.
Return only valid Twitter usernames (without @ prefix).
Do not make up usernames - only return accounts you can verify exist.`,
      temperature: 0.3,
    });

    return result.object.usernames
      .filter((username: string) => username && username.trim().length > 0)
      .map((username: string) => username.trim().replace(/^@/, ''));

  } catch (error) {
    console.error('Error finding org affiliates:', error);
    return [];
  }
}
