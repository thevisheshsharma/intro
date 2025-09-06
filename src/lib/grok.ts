import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { getOrganizationProperties, updateOrganizationProperties, removeOrganizationProperties, Neo4jAnalysisMapper } from '@/services';

/**
 * Grok API client configuration
 * Uses the official X.AI API endpoint for Grok models
 */
const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

/**
 * Available Grok models with their specific use cases
 */
export const GROK_MODELS = {
  /** Main Grok 3 model with live search capabilities */
  GROK_3: 'grok-3',
  /** Grok 3 Mini - balanced performance and speed */
  GROK_3_MINI: 'grok-3-mini',
  /** Grok 3 Mini Fast - optimized for quick responses */
  GROK_3_MINI_FAST: 'grok-3-mini-fast',
} as const;

/**
 * Predefined configurations for different use cases
 */
export const GROK_CONFIGS = {
  /** For quick responses and simpler tasks */
  MINI_FAST: {
    model: GROK_MODELS.GROK_3_MINI_FAST,
    temperature: 0.7,
    max_tokens: 1000,
  },
  /** For standard tasks with balanced speed and quality */
  MINI: {
    model: GROK_MODELS.GROK_3_MINI,
    temperature: 0.5,
    max_tokens: 2000,
  },
  /** For detailed analysis and complex tasks with live search */
  FULL: {
    model: GROK_MODELS.GROK_3,
    temperature: 0.3,
    max_tokens: 4000,
  },
} as const;

/**
 * Configuration options for ICP analysis depth and focus
 */
export enum ICPAnalysisConfig {
  /** Quick analysis with basic metrics */
  MINI_FAST = 'MINI_FAST',
  /** Standard analysis with balanced detail */
  MINI = 'MINI', 
  /** Comprehensive analysis with full research */
  FULL = 'FULL'
}

/**
 * COMPREHENSIVE ICP ANALYSIS SYSTEM - MODULAR BASE + EXTENSION SCHEMAS
 * Architecture: Universal base schemas + category-specific extensions for optimal flexibility
 */

// ================================================================================================
// MODULAR UNIVERSAL SCHEMA COMPONENTS
// ================================================================================================

/**
 * Universal Social Links Schema - Social platform and community links
 * Used in: All categories (universal need for social presence)
 */
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

/**
 * Universal Technical Schema - Technical infrastructure and development fields
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange
 */
const UniversalTechnicalSchema = z.object({
  github: z.array(z.string()).nullable().describe("GitHub repository URLs"),
  whitepaper: z.string().nullable().describe("Whitepaper or documentation URL"),
  docs: z.string().nullable().describe("Developer documentation URL"),
  explorer: z.string().nullable().describe("Block explorer or network dashboard URL"),
  api_docs: z.string().nullable().describe("API documentation URL"),
  chains: z.array(z.string()).nullable().describe("Blockchain network slugs (e.g., ethereum, polygon, arbitrum)"),
  tech_stack: z.array(z.string()).nullable().describe("Core technical components and architecture"),
  dev_tools: z.array(z.string()).nullable().describe("Developer tools and SDKs provided"),
});

/**
 * Universal Security Audit Schema - Security and audit related fields
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange
 */
const UniversalSecurityAuditSchema = z.object({
  auditor: z.array(z.string()).nullable().describe("Security audit firm names. X handles only (@username format)"),
  audit_date: z.string().nullable().describe("Date of latest audit"),
  audit_links: z.string().nullable().describe("Security audit report URL"),
});

/**
 * Universal Tokenomics Schema - Universal tokenomics fields that apply to most Web3 organizations
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange, Community/DAO
 */
const UniversalTokenomicsSchema = z.object({
  tge: z.enum(['pre-tge', 'post-tge']).nullable().describe("Token Generation Event (TGE) status"),
  token: z.string().nullable().describe("Native token symbol"),
  utilities: z.array(z.enum(['governance', 'staking', 'fee_payment', 'fee_discount', 'collateral', 'rewards', 'access', 'liquidity_mining', 'other'])).nullable().describe("Core token utilities and use cases"),
  tokenomics_model: z.string().nullable().describe("Token distribution, allocation, and value accrual mechanisms"),
  governance: z.string().nullable().describe("Governance structure if applicable"),
});

/**
 * Universal Funding Schema - Funding and investment related fields
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange, Service Providers
 */
const UniversalFundingSchema = z.object({
  funding_stage: z.enum(['bootstrapped', 'pre-seed', 'seed', 'series_a', 'series_b', 'series_c', 'Grants', 'Private', 'self-sustaining', 'ICO', 'Public']).nullable().describe("Funding status"),
  funding_amount: z.enum(['<1M', '1-5M', '5-10M', '10-50M', '50-100M', '>100M', 'undisclosed']).nullable().describe("Funding amount range"),
  investors: z.array(z.string()).nullable().describe("Investors, X handles only (@username format)"),
});

/**
 * Universal Market Metrics Schema - Market position and competitive analysis
 * Used in: All categories (universal need for market analysis)
 */
const UniversalMarketMetricsSchema = z.object({
  sentiment_score: z.number().min(0).max(1).nullable().describe("Overall market sentiment score (0-1)"),
  market_presence: z.string().nullable().describe("Overall market presence and visibility assessment"),
  competitors: z.array(z.string()).nullable().describe("List of primary competitors in the space. X handles only (@username format)"),
  monetization_stage: z.enum(['no_revenue', 'pilot_customers', 'early_revenue', 'scaling_revenue', 'mature_revenue']).nullable().describe("Current monetization and revenue generation readiness"),
  maturity: z.enum(['emerging', 'early_growth', 'rapid_growth', 'maturing', 'mature', 'declining']).nullable().describe("Overall market maturity level for this sector"),
  product_stage: z.enum(['concept', 'mvp', 'beta', 'ga', 'growth', 'maturity', 'sunset']).nullable().describe("Current product development lifecycle stage"),
  community_health_score: z.number().min(0).max(1).nullable().describe("Overall community engagement and health score (0-1)"),
  narratives: z.array(z.string()).nullable().describe("Current market narratives and themes associated"),
  partners: z.array(z.string()).nullable().describe("All partnerships and collaborations. X handles only (@username format)"),
  recent_updates: z.array(z.string()).nullable().describe("Recent major developments"),
});

/**
 * Universal User Behavior Schema - User behavior and demographic analysis
 * Used in: All categories (universal ICP analysis need)
 */
const UniversalUserBehaviorSchema = z.object({
  engagement_patterns: z.array(z.string()).nullable().describe("Common user engagement and interaction patterns"),
  user_journey: z.string().nullable().describe("Typical user journey and onboarding experience"),
  retention_factors: z.array(z.string()).nullable().describe("Key factors that drive user retention and loyalty"),
  engagement_depth: z.string().nullable().describe("Depth of user engagement and participation levels"),
  age_groups: z.array(z.enum(['Gen Z (18-26)', 'Millennials (27-42)', 'Gen X (43-58)', 'Boomers (59+)', 'Mixed Generational', 'Young Professionals (22-35)', 'Mid-Career (35-50)', 'Experienced (50+)', 'Institutions'])).nullable().describe("Age ranges or generational cohorts"),
  experience: z.array(z.enum(['Beginner', 'Beginner to Intermediate', 'Intermediate', 'Intermediate to Advanced', 'Advanced', 'Expert', 'Mixed Experience'])).nullable().describe("Web3/crypto experience level ranges of users"),
  roles: z.array(z.string()).nullable().describe("Common professional roles of the users"),
  motivations: z.array(z.string()).nullable().describe("Primary motivations for engagement and participation"),
  decision_factors: z.array(z.string()).nullable().describe("Key factors influencing user decisions and actions"),
  interaction_preferences: z.array(z.string()).nullable().describe("Preferred interaction methods and channels"),
  activity_patterns: z.array(z.string()).nullable().describe("Common activity patterns and usage behaviors"),
  conversion_factors: z.array(z.string()).nullable().describe("Factors that lead to deeper engagement or conversion"),
  loyalty_indicators: z.array(z.string()).nullable().describe("Indicators of user loyalty and long-term engagement"),
});

/**
 * Refined Universal Base Schema - Contains only truly universal fields
 * After extracting modular components, this contains minimal universal fields that every organization needs
 */
const UniversalCoreSchema = z.object({
  // Basic Identification Fields
  name: z.string().describe("Official name"),
  website: z.string().nullable().describe("Official website URL"),
  industry: z.string().describe("Primary industry sector classification"),
  
  // Core Operational Metrics
  key_features: z.array(z.string()).nullable().describe("List of key features and capabilities"),
  audience: z.array(z.string()).nullable().describe("Target client segments and industries"),
  geography: z.array(z.enum(['North America', 'Europe', 'Asia', 'LaTam', 'China', 'Africa', 'Oceania', 'Global'])).nullable().describe("Geographic focus and presence"),
  status: z.enum(['development', 'testnet', 'mainnet', 'active', 'other', 'deprecated', 'acquired']).nullable().describe("Current operational status"),
});

// ================================================================================================
// LEGACY UNIVERSAL BASE SCHEMA - Composed from modular components
// ================================================================================================

/**
 * Legacy Universal Base Schema - Maintains backward compatibility
 * This is now composed from the modular schemas above
 * Contains ALL possible fields that ANY organization might have (flattened)
 */
const UniversalBaseSchema = UniversalCoreSchema
  .extend(UniversalSocialLinksSchema.shape)
  .extend(UniversalTechnicalSchema.shape)
  .extend(UniversalSecurityAuditSchema.shape)
  .extend(UniversalTokenomicsSchema.shape)
  .extend(UniversalFundingSchema.shape)
  .extend(UniversalMarketMetricsSchema.shape)
  .extend(UniversalUserBehaviorSchema.shape);

/// ================================================================================================
/// FLATTENED CATEGORY-SPECIFIC EXTENSION SCHEMAS
/// ================================================================================================

/**
 * DeFi Protocol Extensions - Flat fields specific to DeFi protocols
 */
const DeFiProtocolFlatExtensions = z.object({
  // DeFi Identification
  category: z.string().nullable().describe("DeFi protocol category (DEX, Lending, Yield, Derivatives, etc.)"),
  
  // DeFi Market Metrics
  tvl: z.number().min(0).nullable().describe("Current Total Value Locked in USD"),
  
  // DeFi Tokenomics
  yield: z.array(z.string()).nullable().describe("Yield generation mechanisms"),
  liquidity_incentives: z.string().nullable().describe("Liquidity provision incentives"),
  fee_model: z.string().nullable().describe("How fees are shared with token holders"),
});

/**
 * GameFi Protocol Extensions - Flat fields specific to GameFi protocols
 */
const GameFiProtocolFlatExtensions = z.object({
  // GameFi Identification
  category: z.string().nullable().describe("Gaming category (MMORPG, Strategy, Casual, etc.)"),
  platforms: z.array(z.enum(['Mobile', 'Web', 'Desktop', 'VR', 'other'])).nullable().describe("Platform type (Mobile, Web, Desktop, VR, other)"),
  nft_model: z.string().nullable().describe("NFT integration and asset ownership model"),
  
  // GameFi Core Metrics
  gameplay: z.array(z.string()).nullable().describe("Core gameplay features"),
  
  // GameFi Tokenomics
  game_token: z.array(z.string()).nullable().describe("In-game tokens and their utilities"),
  nft_assets: z.array(z.string()).nullable().describe("Types of NFT assets and their functions"),
  p2e_model: z.string().nullable().describe("Play-to-earn mechanics and sustainability"),
  trading: z.string().nullable().describe("In-game asset trading and marketplace mechanics"),
});

/**
 * Social Protocol Extensions - Flat fields specific to SocialFi protocols
 */
const SocialProtocolFlatExtensions = z.object({
  // Social Identification
  category: z.string().nullable().describe("Social protocol category (Content, Identity, Communication, etc.)"),
  
  // Social Market Metrics
  monthly_users: z.number().int().min(0).nullable().describe("Monthly active users"),
  creators: z.number().int().min(0).nullable().describe("Number of content creators"),
  
  // Social Tokenomics
  monetization: z.string().nullable().describe("Creator monetization model"),
  rewards: z.string().nullable().describe("Content creation and curation rewards"),
});

/**
 * Infrastructure Extensions - Flat fields specific to blockchain infrastructure
 */
const InfrastructureFlatExtensions = z.object({
  // Infrastructure Identification
  category: z.enum(['Layer1', 'Layer2', 'Rollup', 'Bridge', 'Oracle', 'Storage', 'Compute', 'Indexing', 'RPC', 'Node', 'Validator', 'Wallet', 'Account Abstraction', 'Interoperability', 'MEV', 'ZK', 'Data Availability', 'Sequencer', 'Security', 'Identity', 'Dev Tooling', 'Monitoring', 'Messaging', 'Governance', 'Other']).nullable().describe("Infrastructure category"),
  
  // Infrastructure Market Metrics
  tx_per_day: z.number().int().min(0).nullable().describe("Daily transaction count"),
  projects: z.number().int().min(0).nullable().describe("Number of projects building on/with this infrastructure"),
  market_share: z.number().min(0).max(1).nullable().describe("Market share in category (0-1)"),
  
  // Infrastructure Performance
  throughput: z.string().nullable().describe("Transaction throughput (TPS)"),
  cost_per_tx: z.number().min(0).nullable().describe("Average cost per transaction in USD"),
  
  // Infrastructure Tokenomics
  validator_economics: z.string().nullable().describe("Validator/operator economics and requirements"),
  staking: z.string().nullable().describe("Staking requirements and rewards"),
  fee_model: z.string().nullable().describe("Network fee structure and distribution"),
});

/**
 * Exchange Extensions - Flat fields specific to crypto exchanges
 */
const ExchangeFlatExtensions = z.object({
  // Exchange Identification
  category: z.enum(['CEX', 'DEX', 'Hybrid', 'Aggregator']).nullable().describe("Exchange type"),
  trading_pairs: z.number().int().min(0).nullable().describe("Number of trading pairs"),
  assets: z.array(z.string()).nullable().describe("Major supported asset categories"),
  
  // Exchange Market Metrics
  volume_24h: z.number().min(0).nullable().describe("24-hour trading volume in USD"),
  rank: z.number().int().min(1).nullable().describe("Market ranking by volume"),
  liquidity: z.number().min(0).max(1).nullable().describe("Overall liquidity depth assessment"),
  
  // Exchange Features
  fiat: z.array(z.string()).nullable().describe("Supported fiat currencies"),
  
  // Exchange Fees
  maker_fee: z.number().min(0).nullable().describe("Maker fee percentage"),
  taker_fee: z.number().min(0).nullable().describe("Taker fee percentage"),
  withdrawal_fee: z.number().min(0).nullable().describe("Withdrawal fee percentage"),
  
  // Exchange Tokenomics
  liquidity_incentives: z.string().nullable().describe("Liquidity provision incentives"),
});

/**
 * Investment Fund Extensions - Flat fields specific to investment funds
 */
const InvestmentFundFlatExtensions = z.object({
  // Fund Identification
  category: z.enum(['Venture Capital', 'Accelerator', 'Family Office', 'Corporate VC', 'Other']).nullable().describe("Type of investment fund"),
  stage: z.enum(['Agnostic', 'Grants', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Institutional', 'ICO']).nullable().describe("Primary investment stage focus"),
  sectors: z.array(z.string()).nullable().describe("Primary sector and technology focus areas or Agnostic"),
  portfolio: z.string().nullable().describe("Portfolio companies listing URL"),
  
  // Fund Market Metrics
  fund_size: z.number().min(0).nullable().describe("Total fund size in USD (if public)"),
  portfolio_size: z.number().int().min(0).nullable().describe("Number of portfolio companies"),
  investments: z.array(z.string()).nullable().describe("All portfolio investments. X handles only (@username format)"),
  reputation: z.enum(['Tier S', 'Tier A', 'Tier B', 'Tier C']).nullable().describe("Market reputation in investments"),
  
  // Fund Investment Model
  symbol: z.string().nullable().describe("Fund token or investment vehicle (if applicable)"),
  model: z.array(z.enum(['Equity', 'Debt', 'Tokens', 'Hybrid', 'Other'])).nullable().describe("Investment deployment strategy"),
});

/**
 * Service Provider Extensions - Flat fields specific to service providers
 */
const ServiceProviderFlatExtensions = z.object({
  // Service Identification
  category: z.array(z.enum(['Development', 'Marketing', 'Legal', 'PR', 'Audits', 'Community Management', 'Tokenomics', 'Design', 'Governance Advisory', 'Content', 'Partnerships', 'Education & Training', 'Localization', 'Event Management'])).nullable().describe("Primary service category"),
  case_studies: z.string().nullable().describe("Case studies or portfolio URL"),
  testimonials: z.string().nullable().describe("Client testimonials or reviews URL"),
  
  // Service Market Metrics
  clients: z.array(z.string()).nullable().describe("All clients. X handles only (@username format)"),
  team_size: z.enum(['1-5', '6-15', '16-50', '51-100', '100+', 'undisclosed']).nullable().describe("Team size range"),
});

/**
 * Community/DAO Extensions - Flat fields specific to communities and DAOs
 */
const CommunityDAOFlatExtensions = z.object({
  // Community Identification
  category: z.array(z.enum(['DAO', 'Guild', 'Regional', 'Builder', 'Grants', 'Supporter', 'Collector', 'Research', 'Creator'])).nullable().describe("Type of community or DAO"),
  mission: z.string().nullable().describe("Mission and primary focus areas"),
  membership: z.string().nullable().describe("Membership model and participation requirements"),
  
  // Community Market Metrics
  members: z.number().int().min(0).nullable().describe("Total community member count"),
  reach: z.number().min(0).max(1).nullable().describe("Community influence and reach within the ecosystem"),
  
  // Community Core Metrics
  initiatives: z.array(z.string()).nullable().describe("Key community initiatives and programs"),
  benefits: z.array(z.string()).nullable().describe("Benefits and value provided to members"),
  
  // Community Tokenomics
  treasury: z.string().nullable().describe("Treasury allocation and management"),
});

/**
 * Digital Assets and NFTs Extensions - Flat fields specific to NFT and digital asset platforms
 */
const DigitalAssetsNFTFlatExtensions = z.object({
  // NFT Collection Metrics
  category: z.enum(['Marketplace', 'Art Platform', 'Gaming NFTs', 'Music NFTs', 'Sports NFTs', 'Utility NFTs', 'PFP Collection', 'Generative Art', 'Photography', 'Domain Names', 'Virtual Real Estate', 'Fractional Ownership', 'NFT Infrastructure', 'Creator Tools', 'Analytics']).nullable().describe("Digital assets and NFT category"),
  collection_size: z.number().int().min(0).nullable().describe("Total number of NFTs in primary collection"),
  floor_price: z.number().min(0).nullable().describe("Current floor price"),
  total_volume: z.number().min(0).nullable().describe("Total trading volume"),
  unique_holders: z.number().int().min(0).nullable().describe("Number of unique NFT holders"),
  
  // Platform Features
  utility_features: z.array(z.enum(['Art', 'Gaming', 'Membership', 'Access', 'Staking', 'Governance', 'Breeding', 'Evolution', 'P2E', 'Royalties', 'Fractionalization', 'Real World Assets', 'Identity', 'Domain', 'Virtual Land', 'Music Rights', 'IP Rights'])).nullable().describe("Primary utility features of NFTs"),
  marketplace_integrations: z.array(z.string()).nullable().describe("Supported NFT marketplaces and platforms. X handles only (@username format)"),
  asset_types: z.array(z.string()).nullable().describe("Types of digital assets supported"),
  
  // Creator Economy
  creator_royalties: z.number().min(0).max(100).nullable().describe("Creator royalty percentage"),
  launch_mechanism: z.enum(['Drop', 'Auction', 'Dutch Auction', 'Whitelist', 'Public Mint', 'Claim', 'Airdrop', 'Marketplace']).nullable().describe("Primary NFT launch mechanism"),
  
  // Community Features
  community_features: z.array(z.enum(['Discord Integration', 'Token Gating', 'Holder Benefits', 'Events', 'Governance', 'Social Media Integration', 'Creator Tools', 'Analytics Dashboard'])).nullable().describe("Community and social features"),
});

// ================================================================================================
// USER BEHAVIOR AND ICP SYNTHESIS SCHEMAS (Universal across all types)
// ================================================================================================

/**
 * User behavior insights - applicable to all organization types
 */
const UniversalUserBehaviorInsightsSchema = z.object({
  user_archetypes: z.array(z.object({
    archetype_name: z.string().describe("Name/label for this user archetype"),
    size_estimate: z.enum(['small', 'medium', 'large']).describe("Relative size of this user segment"),
    priority_level: z.enum(['primary', 'secondary', 'tertiary']).describe("Strategic importance for targeting")
  })).describe("Different user archetypes (names and basic info only)"),
  
  messaging_strategy: z.object({
    tone: z.string().nullable().describe("Primary communication tone (e.g., 'professional', 'casual', 'technical')"),
    key_messages: z.array(z.string()).nullable().describe("3-5 core value propositions"),
    primary_channels: z.array(z.enum([
      'X', 'discord', 'telegram', 'youtube', 'farcaster', 'instagram', 'tiktok', // Social Platforms
      'governance_forum', 'snapshot',  'commonwealth', 'tally', 'lens', 'dscvr', // Web3 Governance & Community
      'blog', 'newsletter', 'podcast', 'documentation', 'press_releases', 'KOL_partnerships', 'partners', // Content & Technical
      'conferences', 'community_calls', 'ama_sessions', 'hackathons', 'airdrops' // Web3 Events & Engagement
    ])).max(5).nullable().describe("Top 5 communication channels used")
  }).nullable().describe("Core messaging and communication strategy")
});

/**
 * Generate dynamic ICP Analysis schema based on classification using modular architecture
 * Composes universal schemas + category-specific extensions for optimal flexibility
 */
export function createClassificationSpecificSchema(classification?: {
  org_type?: string
  org_subtype?: string[]
  web3_focus?: string
}) {
  const orgType = classification?.org_type || 'protocol'
  
  console.log(`📋 Building simplified schema for: orgType="${orgType}"`);
  
  // Helper function to determine which universal modules to include
  function needsTokenomics(type: string): boolean {
    return ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'community', 'nft'].includes(type);
  }
  
  function needsTechnical(type: string): boolean {
    return ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'nft'].includes(type);
  }
  
  function needsSecurity(type: string): boolean {
    return ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'nft'].includes(type);
  }
  
  function needsFunding(type: string): boolean {
    return ['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'service', 'nft'].includes(type);
  }
  
  // Start with core universal schema (always included)
  let finalSchema = UniversalCoreSchema
    .extend(UniversalSocialLinksSchema.shape) // Always include social links
    .extend(UniversalMarketMetricsSchema.shape) // Always include market metrics
    .extend(UniversalUserBehaviorSchema.shape); // Always include user behavior
  
  // Add conditional universal modules based on org type
  if (needsTokenomics(orgType)) {
    finalSchema = finalSchema.extend(UniversalTokenomicsSchema.shape);
  }
  
  if (needsTechnical(orgType)) {
    finalSchema = finalSchema.extend(UniversalTechnicalSchema.shape);
  }
  
  if (needsSecurity(orgType)) {
    finalSchema = finalSchema.extend(UniversalSecurityAuditSchema.shape);
  }
  
  if (needsFunding(orgType)) {
    finalSchema = finalSchema.extend(UniversalFundingSchema.shape);
  }
  
  // Apply category-specific extensions based on simplified org type mapping
  if (orgType === 'defi') {
    finalSchema = finalSchema.extend(DeFiProtocolFlatExtensions.shape)
  } else if (orgType === 'gaming') {
    finalSchema = finalSchema.extend(GameFiProtocolFlatExtensions.shape)
  } else if (orgType === 'social') {
    finalSchema = finalSchema.extend(SocialProtocolFlatExtensions.shape)
  } else if (orgType === 'protocol') {
    // Generic protocols get no specific extensions - just universal modules
  } else if (orgType === 'investment') {
    finalSchema = finalSchema.extend(InvestmentFundFlatExtensions.shape)
  } else if (orgType === 'infrastructure') {
    finalSchema = finalSchema.extend(InfrastructureFlatExtensions.shape)
  } else if (orgType === 'exchange') {
    finalSchema = finalSchema.extend(ExchangeFlatExtensions.shape)
  } else if (orgType === 'service') {
    finalSchema = finalSchema.extend(ServiceProviderFlatExtensions.shape)
  } else if (orgType === 'community') {
    finalSchema = finalSchema.extend(CommunityDAOFlatExtensions.shape)
  } else if (orgType === 'nft') {
    finalSchema = finalSchema.extend(DigitalAssetsNFTFlatExtensions.shape)
  }

  // Combine with universal user behavior insights
  const completeSchema = z.object({
    twitter_username: z.string().describe("Twitter username of the analyzed organization"),
    timestamp_utc: z.string().describe("UTC timestamp of when the analysis was performed"),
    
    // All fields flattened at root level
    ...finalSchema.shape,
    
    // Universal user behavior and ICP insights
    ...UniversalUserBehaviorInsightsSchema.shape
  });
  
  return completeSchema;
}

type ICPAnalysisType = z.infer<ReturnType<typeof createClassificationSpecificSchema>>;

// Legacy schema export for backward compatibility - moved after function definition
export const ICPAnalysisSchema = createClassificationSpecificSchema();

/**
 * Generate classification-specific context for ICP analysis
 */
function getClassificationSpecificContext(classification?: {
  org_type?: string
  org_subtype?: string[]
  web3_focus?: string
}) {
  const orgType = classification?.org_type || 'protocol'
  const web3Focus = classification?.web3_focus || 'native'

  // Direct org type handling (simplified approach)
  if (orgType === 'defi') {
    return {
      analysisInstructions: "This is a DeFi protocol. Focus on TVL, yield rates, token utility, smart contract audits, DeFi composability, yield mechanisms, fee structures, and liquidity mining programs",
      priorityDataSources: "defillama.com",
      
      analysisDepth: `- Extract yield farming rewards and APY calculations
- Map liquidity pool compositions and impermanent loss risk
- Analyze fee distribution mechanisms and token accrual`,
      
      userPrompt: `This is a DeFi protocol - prioritize TVL, yield mechanisms, and security audits.`,
      
      searchPlan: [
        'Search "{} defillama TVL yield" for DeFi-specific metrics',
        'Search "{} liquidity mining yield farming" for incentive programs',
        'Search "{} smart contract audit security" for security analysis',
        'Search "{} defi composability integrations" for ecosystem positioning'
      ],
      
      requiredData: `- TVL trends and liquidity depth
- Token economics: governance, staking, fee sharing  
- Smart contract security audits
- Liquidity mining programs and incentive mechanisms
- User behavior: yield farming, LP provision, governance participation`
    }
  }

  if (orgType === 'gaming') {
    return {
      analysisInstructions: "This is a GameFi protocol. Focus on player metrics, NFT economies, P2E mechanics, retention rates, play-to-earn mechanics, and in-game asset trading",
      priorityDataSources: "dappradar.com, opensea.io, footprint.network",
      
      analysisDepth: `- Extract play-to-earn reward mechanisms and token economies
- Analyze NFT asset utility and trading volumes
- Research guild partnerships and scholar programs`,
      
      userPrompt: `This is a GameFi protocol - prioritize player metrics, NFT economies, and P2E mechanics.`,
      
      searchPlan: [
        'Search "{} dappradar gaming players" for player statistics',
        'Search "{} NFT gaming assets opensea" for in-game economy data',
        'Search "{} play to earn tokenomics" for reward mechanisms',
        'Search "{} gaming partnerships ecosystem" for collaborations'
      ],
      
      requiredData: `- Daily/monthly active players and retention rates
- NFT trading volumes and asset valuations
- Play-to-earn reward structures and token distribution
- In-game economy health and sustainability metrics`
    }
  }

  if (orgType === 'social') {
    return {
      analysisInstructions: "This is a SocialFi protocol. Focus on user engagement, creator monetization, social tokens, network effects, creator revenue sharing, and content curation mechanisms",
      priorityDataSources: "lens.xyz, farcaster.xyz, mirror.xyz, rally.io",
      
      analysisDepth: `- Extract creator revenue sharing and monetization rates
- Analyze social token utility and community rewards
- Research content curation and moderation mechanisms`,
      
      userPrompt: `This is a SocialFi protocol - prioritize user engagement, creator economics, and community growth.`,
      
      searchPlan: [
        'Search "{} social engagement creators" for user metrics',
        'Search "{} creator monetization revenue" for economic models',
        'Search "{} social token community" for token utility',
        'Search "{} web3 social network" for platform positioning'
      ],
      
      requiredData: `- User engagement metrics and content creation rates
- Creator monetization models and revenue distribution
- Social token utility and community incentive structures
- Network growth patterns and viral coefficients`
    }
  }

  // Generic protocol context
  if (orgType === 'protocol') {
    return getDefaultProtocolContext()
  }

  // Investment-specific context
  if (orgType === 'investment') {
    return {
      analysisInstructions: "This is an investment fund. Focus on portfolio, fund size, investment thesis, market reputation, check sizes, LP composition, and investment stage focus",
      priorityDataSources: "crunchbase.com, pitchbook.com",
      
      analysisDepth: `- Extract fund size patterns and typical check sizes
- Map LP composition and institutional backing
- Analyze investment thesis specificity and sector focus`,
      
      userPrompt: `This is an investment fund - prioritize portfolio, investment thesis, and fund metrics.`,
      
      searchPlan: [
        'Search "{} portfolio investments web3" for investment activity',
        'Search "{} fund size LP investors" for fund details',  
        'Search "{} investment thesis crypto" for strategy focus',
        'Search "{} crypto VC market position" for competitive analysis'
      ],
      
      requiredData: `- Investment portfolio and notable portfolio companies
- Fund size, stage focus, and typical check sizes
- Investment thesis and sector expertise
- Performance metrics and successful exits`
    }
  }

  // Infrastructure-specific context
  if (orgType === 'infrastructure') {
    return {
      analysisInstructions: "This is blockchain infrastructure. Focus on performance metrics, developer adoption, network usage, security, uptime, and technical architecture",
      priorityDataSources: "l2beat.com, etherscan.io, dune.com",
      
      analysisDepth: `- Extract network performance metrics and uptime statistics
- Analyze developer adoption and ecosystem growth
- Research security audits and technical architecture`,
      
      userPrompt: `This is blockchain infrastructure - prioritize performance, adoption, and technical metrics.`,
      
      searchPlan: [
        'Search "{} dune analytics network stats" for usage metrics',
        'Search "{} github developers SDK" for developer adoption',
        'Search "{} performance benchmark TPS" for performance data',
        'Search "{} security audit infrastructure" for security analysis'
      ],
      
      requiredData: `- Network performance metrics (TPS, latency, uptime)
- Developer adoption and integration statistics
- Security features and audit history
- Fee structure and economic sustainability`
    }
  }

  // Exchange-specific context
  if (orgType === 'exchange') {
    return {
      analysisInstructions: "This is a crypto exchange. Focus on trading volume, liquidity, user base, security, regulatory compliance, and fee structures",
      priorityDataSources: "coingecko.com, coinmarketcap.com, kaiko.com",
      
      analysisDepth: `- Extract 24h/7d/30d trading volumes and trends
- Analyze liquidity depth and market maker programs
- Research security incidents and insurance coverage`,
      
      userPrompt: `This is a crypto exchange - prioritize volume, liquidity, and user metrics.`,
      
      searchPlan: [
        'Search "{} coingecko trading volume" for market metrics',
        'Search "{} security audit insurance" for security measures',
        'Search "{} regulatory license compliance" for regulatory status',
        'Search "{} user reviews trustpilot" for user sentiment'
      ],
      
      requiredData: `- Trading volume and market ranking
- Liquidity metrics and trading pairs
- Security measures and insurance coverage
- Regulatory compliance and licensing
- Fee structure and user benefits`
    }
  }

  // Service provider context (includes professional services)
  if (orgType === 'service') {
    return {
      analysisInstructions: "This is a Web3 service provider. Focus on services, clients, revenue model, team expertise, market positioning, service offerings, and client retention metrics",
      priorityDataSources: "linkedin.com",
      
      analysisDepth: `- Extract service delivery methodologies and pricing models
- Map client success stories and retention rates
- Analyze team expertise and professional credentials`,
      
      userPrompt: `This is a Web3 service provider - prioritize services, clients, and capabilities.`,
      
      searchPlan: [
        'Search "{} web3 services clients" for business model',
        'Search "{} case studies testimonials" for client success',
        'Search "{} team expertise background" for capabilities'
      ],
      
      requiredData: `- Service offerings and business model
- Client segments and success stories
- Team expertise and professional credentials
- Competitive positioning and market differentiation`
    }
  }

  // Community/DAO context
  if (orgType === 'community') {
    return {
      analysisInstructions: "This is a Web3 community or DAO forum. Focus on governance, treasury, member engagement, community health, governance proposals, treasury management, and member contribution systems",
      priorityDataSources: "snapshot.org, commonwealth.im, tally.xyz",
      
      analysisDepth: `- Extract governance proposal frequency and voting patterns
- Analyze treasury allocation and fund management strategies
- Research member contribution tracking and reward mechanisms`,
      
      userPrompt: `This is a Web3 community/DAO - prioritize governance, treasury, and member engagement.`,
      
      searchPlan: [
        'Search "{} DAO governance proposals" for decision-making activity',
        'Search "{} community discord members" for engagement metrics',
        'Search "{} treasury token distribution" for economic structure',
        'Search "{} member contributions incentives" for participation systems'
      ],
      
      requiredData: `- Community size and engagement across platforms
- Governance structure and proposal/voting activity
- Treasury size, management, and token distribution
- Member contribution systems and reward mechanisms`
    }
  }

  // NFT/Digital Assets specific context
  if (orgType === 'nft') {
    return {
      analysisInstructions: "This is a Digital Assets and NFTs platform. Focus on collection metrics, trading volume, floor prices, creator economy, marketplace integrations, and utility features",
      priorityDataSources: "opensea.io, blur.io, x2y2.io, looksrare.org",
      
      analysisDepth: `- Extract NFT collection metrics: floor price, volume, holders
- Map creator royalty structures and marketplace integrations
- Analyze utility features and community engagement mechanisms`,
      
      userPrompt: `This is a Digital Assets and NFTs platform - prioritize collection metrics, creator economy, and marketplace data.`,
      
      searchPlan: [
        'Search "{} opensea collection" for marketplace data',
        'Search "{} NFT community discord" for community metrics'
      ],
      
      requiredData: `- NFT collection metrics: floor price, trading volume, holder count
- Creator economy: royalty rates, artist onboarding, launch mechanisms
- Marketplace integrations and technical standards
- Community features and holder benefits`
    }
  }

  // Default fallback
  return getDefaultProtocolContext()
}

function getDefaultProtocolContext() {
  return {
    analysisInstructions: "This is a Web3 project. Focus on technical metrics, user adoption, protocol integrations, quantitative metrics, partnerships, and community engagement",
    priorityDataSources: "defillama.com, dune.com, messari.io, coingecko.com, coinmarketcap.com",
    analysisDepth: `- Extract quantitative metrics (TVL, user counts, transaction volumes)
- Identify recent partnerships, integrations, and developments  
- Analyze community sentiment and engagement patterns
- Research governance structure and tokenomics details
- Map competitive landscape and positioning`,
    userPrompt: `Focus on comprehensive Web3 analysis across all relevant metrics and data sources.`,
    searchPlan: [
      'Search "{} defillama" for DeFi metrics and TVL data',
      'Search "{} github" for technical development activity',
      'Search "{} dune analytics" for on-chain metrics',
      'Search "{} news 2024 2025" for recent developments',
      'Search "{} messari" for detailed protocol analysis'
    ],
    requiredData: `- Current TVL, user metrics, and transaction volumes
- Recent partnerships, integrations, and protocol updates  
- Community size across platforms (X, Discord, Farcaster)
- Development activity and GitHub statistics
- News mentions and market sentiment from 2024-2025
- Competitive positioning and market narratives
- Governance structure and token utility details`
  }
}

/**
 * Create a structured ICP analysis using Grok with guaranteed schema compliance
 * @param twitterUsername - The Twitter username to analyze
 * @param config - Configuration object (defaults to FULL)
 * @param classification - Optional classification info for tailored analysis
 * @returns Promise<ICPAnalysisType>
 */
export async function createStructuredICPAnalysis(
  twitterUsername: string, 
  config: ICPAnalysisConfig = ICPAnalysisConfig.FULL,
  classification?: {
    org_type?: string
    org_subtype?: string[]
    web3_focus?: string
  }
): Promise<z.infer<ReturnType<typeof createClassificationSpecificSchema>>> {
  try {
    // Check API key configuration
    if (!process.env.GROK_API_KEY) {
      throw new Error('GROK_API_KEY environment variable is not configured');
    }
    
    console.log(`🚀 Starting ICP analysis for @${twitterUsername.replace('@', '')} with API key: ${process.env.GROK_API_KEY.substring(0, 10)}...`);
    
    // Generate dynamic schema based on classification
    const dynamicSchema = createClassificationSpecificSchema(classification)
    
    // Get classification-specific context (single call for all context)
    const context = getClassificationSpecificContext(classification)
    
    // Step: Fetch Neo4j data for context enhancement
    console.log(`🔍 Fetching existing Neo4j data for @${twitterUsername}`);
    const neo4jData = await getOrganizationProperties(twitterUsername);
    
    // Map config enum to actual Grok configuration
    const grokConfig = config === ICPAnalysisConfig.MINI_FAST ? GROK_CONFIGS.MINI_FAST :
                       config === ICPAnalysisConfig.MINI ? GROK_CONFIGS.MINI :
                       GROK_CONFIGS.FULL
    
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert Web3 and crypto analyst specializing in Ideal Customer Profile (ICP) analysis. Your task is to research and analyze organizations to create comprehensive customer profiles.

CRITICAL: Live search is ENABLED. You have access to current web data, X posts, news, and web3 platforms. Use this live data extensively.
ANALYSIS FOCUS: ${context.analysisInstructions}

SEARCH PRIORITY: 
- ${context.priorityDataSources}, site:dune.com, site:github.com, site:messari.com, site:coingecko.com, site:coinmarketcap.com, app.nansen.ai, site:tokenterminal.com, app.santiment.net, site:lunarcrush.com, thegraph.com/explorer, kaito.com, intel.arkm.com
- official website, documentation and whitepapers
- X posts, discord, linkedin, telegram, farcaster and community groups
- Recent articles, news and press releases
- General web search

RESEARCH REQUIREMENTS:
- Use DIVERSE sources including official AND third-party analysis
- Focus on data from 2024-2025 for recent developments
- Cross-validate information across multiple sources
- Include Web3 analytics platforms, news outlets, and community discussions
- Balance official sources with independent analysis and market data

ANALYSIS DEPTH:
- Extract quantitative metrics from analytics platforms
- Identify all partnerships, blockchain networks, integrations, and developments
- Analyze community sentiment and engagement patterns
- Research governance structure and tokenomics details
- Map competitive landscape and positioning using market analysis
${context.analysisDepth}

Base your entire analysis on actual live search findings from BOTH official and third-party sources. Provide specific, up-to-date insights from multiple perspectives.`
      },
      {
        role: 'user',
        content: `LIVE SEARCH ENABLED: Research @${twitterUsername.replace('@', '')} and create detailed ICP analysis.

${neo4jData && Object.keys(neo4jData).length > 0 ? `KNOWN DATA FROM DATABASE (use as verified facts):
${Object.entries(neo4jData)
  .filter(([_, value]) => value != null && value !== '' && !(Array.isArray(value) && value.length === 0))
  .map(([key, value]) => `✅ ${key}: ${Array.isArray(value) || typeof value === 'object' ? JSON.stringify(value) : value}`)
  .join('\n')}

` : ''}SEARCH EXECUTION PLAN:
- Search "@${twitterUsername.replace('@', '')}" on X to find official profile and recent posts
- Search "${twitterUsername.replace('@', '')} official website" for company information
- ${context.searchPlan.map(plan => plan.replace('{}', twitterUsername.replace('@', ''))).join('\n- ')}
- Search "${twitterUsername.replace('@', '')} whitepaper docs github" for whitepaper, documentation, and technical details
- Search "${twitterUsername.replace('@', '')} partnerships integrations" for ecosystem positioning
- Search "${twitterUsername.replace('@', '')} tokenomics governance" for economic model and governance
- Search "${twitterUsername.replace('@', '')} github" for technical development activity
- Search "${twitterUsername.replace('@', '')} dune analytics" for on-chain metrics
- Search "${twitterUsername.replace('@', '')} news 2024 2025" for recent developments
- Search "${twitterUsername.replace('@', '')} messari" for detailed protocol analysis
- Search "${twitterUsername.replace('@', '')}" for other sources

REQUIRED DATA TO EXTRACT:
${context.requiredData}

OUTPUT REQUIREMENTS:
- Include specific numbers from live search
- Note if information is conflicting across sources
- Only give verified data, not estimates

Execute comprehensive live search across Web3 data platforms, official sources, and recent news to build an accurate, data-driven ICP analysis.`
      }
    ];

    console.log(`🚀 Starting ICP analysis for @${twitterUsername.replace('@', '')} with ${Object.keys(dynamicSchema.shape).length} schema sections`);
    console.log('   Classification:', classification?.org_type || 'default');

    console.log(`📝 System Message:\n${messages[0].content}\n`);
    console.log(`📝 User Message:\n${messages[1].content}\n`);

    console.log('🔄 Making Grok API request...');
    let completion;
    try {
      completion = await grokClient.chat.completions.create({
        ...grokConfig,
        messages,
        response_format: zodResponseFormat(dynamicSchema, "icp_analysis"),
        // Enable live search with comprehensive data sources (Grok-specific extension)
        search_parameters: {
          mode: "on", // Force live search to be enabled
          return_citations: true, // Return sources for transparency
          from_date: "2024-01-01", // Focus on recent data (2024-2025)
          max_search_results: 30, // Increase for more comprehensive research
          sources: [
            { 
              "type": "web"
            },
            {
              "type": "x",
              "included_x_handles": [twitterUsername.replace('@', '')] // Search specific Twitter handle
            },
            {
              "type": "news",
              "excluded_websites": ["reddit.com"] // Exclude low-quality sources
            }
          ]
        }
      } as any);
    } catch (apiError) {
      console.error('❌ Grok API call failed:', apiError);
      throw new Error(`Grok API request failed: ${apiError instanceof Error ? apiError.message : 'Unknown API error'}`);
    }

    console.log('✅ Grok API response received');
    console.log('📊 API Response overview:', {
      status: completion ? 'success' : 'failed',
      hasChoices: !!completion?.choices,
      choicesCount: completion?.choices?.length || 0,
      model: completion?.model,
      usage: completion?.usage
    });
    
    const content = completion.choices[0]?.message?.content;
    
    // Enhanced debugging for content inspection
    console.log('📋 Raw API response structure:', {
      choices: completion.choices?.length || 0,
      hasContent: !!content,
      contentType: typeof content,
      contentLength: content?.length || 0,
      contentPreview: content?.substring(0, 200) || 'null/empty'
    });
    
    if (!content) {
      console.error('❌ No content in API response:', JSON.stringify(completion, null, 2));
      throw new Error('No content returned from Grok API');
    }

    if (content.trim() === '') {
      console.error('❌ Empty content returned from Grok API');
      throw new Error('Empty content returned from Grok API');
    }

    // Parse the structured response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      console.log('✅ JSON parsing successful');
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError);
      console.error('🔍 Content that failed to parse:', {
        content: content,
        contentLength: content.length,
        firstChars: content.substring(0, 50),
        lastChars: content.substring(content.length - 50)
      });
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }

    let analysis;
    try {
      analysis = dynamicSchema.parse(parsedContent);
      console.log('✅ Schema validation successful');
    } catch (schemaError) {
      console.log('❌ Schema validation failed:', schemaError);
      throw new Error(`Schema validation failed: ${schemaError}`);
    }

    // Step: Update Neo4j with complete analysis results
    if (neo4jData?.userId && analysis) {
      console.log(`💾 Storing complete analysis results to Neo4j for user ${neo4jData.userId}...`);
      try {
        await Neo4jAnalysisMapper.storeAnalysisToNeo4j(
          neo4jData.userId, 
          analysis as any, 
          classification
        );
      } catch (updateError) {
        console.error(`❌ Failed to store complete analysis to Neo4j:`, updateError);
        // Continue with analysis even if Neo4j update fails
      }
    }

    // Log final validated schema
    console.log(`🔍 Final schema validation successful`);
    console.log(`📋 Final Flattened ICP Analysis completed with ${Object.keys(analysis).length} fields`);

    return analysis;
  } catch (error) {
    console.error('❌ ICP Analysis failed:', error);
    throw new Error(`ICP analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}/**
 * Find people associated with an organization using Grok with enhanced X search
 * @param orgUsername - Twitter username of the organization
 * @returns Promise<string[]> - Array of associated usernames
 */
export async function findOrgAffiliatesWithGrok(orgUsername: string): Promise<string[]> {
  try {
    const prompt = `
Find all X accounts associated with ${orgUsername}, including the official accounts, team members accounts, community members accounts, contributor accounts.
Perform a real-time search for ${orgUsername} on X, web sources, and official documentation to to ensure comprehensive results.
IMPORTANT: 
Return only the usernames in a structured JSON array in this exact format:
["username1", "username2", "username3"]
Do not assume or build any made-up usernames. Do not include any explanations, just the JSON array.`;

    const searchParams = {
      mode: "on", // Force live search to be enabled
      return_citations: true, // Return sources for transparency
      from_date: "2024-01-01", // Focus on recent data (2024-2025)
      max_search_results: 30, // Increase for more comprehensive research
      sources: [
        {
          "type": "x",
          "included_x_handles": [orgUsername.replace('@', '')] // Search specific Twitter handle
        }
      ],
    };

    const completion = await grokClient.chat.completions.create({
      ...GROK_CONFIGS.FULL,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      // Enable live search with comprehensive data sources (Grok-specific extension)
      search_parameters: searchParams
    } as any);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from Grok API');
    }

    // Try to extract JSON array from the response
    let jsonMatch = content.match(/\[([^\]]*)\]/);
    if (!jsonMatch) {
      // Try to find the content within the text
      const cleanContent = content.trim();
      if (cleanContent.startsWith('[') && cleanContent.endsWith(']')) {
        jsonMatch = [cleanContent];
      }
    }
    
    if (jsonMatch) {
      const usernames = JSON.parse(jsonMatch[0]);
      
      if (Array.isArray(usernames)) {
        // Filter and clean usernames
        const cleanedUsernames = usernames
          .filter((username: any) => typeof username === 'string' && username.trim().length > 0)
          .map((username: string) => username.trim().replace(/^@/, ''));
        
        return cleanedUsernames;
      }
    }
    
    return [];
  } catch (error) {
    throw error;
  }
}

/**
 * UNIFIED CLASSIFICATION SYSTEM
 * The unified classification system has been moved to /src/lib/classifier.ts
 * Import from there for all classification needs
 */

// Re-export types and functions for backward compatibility
export type { 
  UnifiedProfileInput, 
  UnifiedClassificationResult 
} from './classifier';

export { classifyProfilesWithGrok } from './classifier';
