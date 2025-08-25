import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { getOrganizationProperties, updateOrganizationProperties, removeOrganizationProperties } from './neo4j/services/user-service';

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
  discord_url: z.string().nullable().describe("Discord server URL"),
  farcaster_url: z.string().nullable().describe("Farcaster profile URL"),
  telegram_url: z.string().nullable().describe("Telegram group URL"),
  governance_forum_url: z.string().nullable().describe("Governance or DAO or treasury link"),
  linkedin_url: z.string().nullable().describe("LinkedIn profile URL"),
  youtube_url: z.string().nullable().describe("YouTube channel URL"),
  medium_url: z.string().nullable().describe("Medium blog URL"),
  blog_url: z.string().nullable().describe("Official blog URL"),
});

/**
 * Universal Technical Schema - Technical infrastructure and development fields
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange
 */
const UniversalTechnicalSchema = z.object({
  github_url: z.array(z.string()).nullable().describe("GitHub repository URLs"),
  whitepaper_url: z.string().nullable().describe("Whitepaper or documentation URL"),
  docs_url: z.string().nullable().describe("Developer documentation URL"),
  explorer_url: z.string().nullable().describe("Block explorer or network dashboard URL"),
  api_docs_url: z.string().nullable().describe("API documentation URL"),
  chains_supported: z.number().int().min(0).nullable().describe("Number of blockchain networks supported"),
  supported_chains: z.array(z.string()).nullable().describe("Blockchain network slugs (e.g., ethereum, polygon, arbitrum)"),
  technical_stack: z.array(z.string()).nullable().describe("Core technical components and architecture"),
  developer_tools: z.array(z.string()).nullable().describe("Developer tools and SDKs provided"),
});

/**
 * Universal Security Audit Schema - Security and audit related fields
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange
 */
const UniversalSecurityAuditSchema = z.object({
  auditor: z.string().nullable().describe("Security audit firm name"),
  audit_date: z.string().nullable().describe("Date of latest audit"),
  audit_report_url: z.string().nullable().describe("Security audit report URL"),
  security_measures: z.array(z.string()).nullable().describe("Security features and measures"),
});

/**
 * Universal Tokenomics Schema - Universal tokenomics fields that apply to most Web3 organizations
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange, Community/DAO
 */
const UniversalTokenomicsSchema = z.object({
  tge_status: z.enum(['pre-tge', 'post-tge']).nullable().describe("Token Generation Event (TGE) status"),
  token_symbol: z.string().nullable().describe("Native token symbol"),
  token_utilities: z.array(z.enum(['governance', 'staking', 'fee_payment', 'fee_discount', 'collateral', 'rewards', 'access', 'liquidity_mining', 'other'])).nullable().describe("Core token utilities and use cases"),
  tokenomics_model: z.string().nullable().describe("Token distribution, allocation, and value accrual mechanisms"),
  governance_structure: z.string().nullable().describe("Governance structure if applicable"),
});

/**
 * Universal Funding Schema - Funding and investment related fields
 * Used in: DeFi, GameFi, Social, Infrastructure, Exchange, Service Providers
 */
const UniversalFundingSchema = z.object({
  funding_status: z.enum(['bootstrapped', 'pre-seed', 'seed', 'series_a', 'series_b', 'series_c', 'Grants', 'Private', 'self-sustaining', 'ICO', 'Public']).nullable().describe("Funding status"),
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
  monetization_readiness: z.enum(['no_revenue', 'pilot_customers', 'early_revenue', 'scaling_revenue', 'mature_revenue']).nullable().describe("Current monetization and revenue generation readiness"),
  market_maturity: z.enum(['emerging', 'early_growth', 'rapid_growth', 'maturing', 'mature', 'declining']).nullable().describe("Overall market maturity level for this sector"),
  product_lifecycle_stage: z.enum(['concept', 'mvp', 'beta', 'ga', 'growth', 'maturity', 'sunset']).nullable().describe("Current product development lifecycle stage"),
  community_health_score: z.number().min(0).max(1).nullable().describe("Overall community engagement and health score (0-1)"),
  market_narratives: z.array(z.string()).nullable().describe("Current market narratives and themes associated"),
  notable_partnerships: z.array(z.string()).nullable().describe("All partnerships and collaborations. X handles only (@username format)"),
  recent_developments: z.array(z.string()).nullable().describe("Recent major developments"),
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
  age_demographics: z.array(z.enum(['Gen Z (18-26)', 'Millennials (27-42)', 'Gen X (43-58)', 'Boomers (59+)', 'Mixed Generational', 'Young Professionals (22-35)', 'Mid-Career (35-50)', 'Experienced (50+)', 'Institutions'])).nullable().describe("Age ranges or generational cohorts"),
  experience_level: z.array(z.enum(['Beginner', 'Beginner to Intermediate', 'Intermediate', 'Intermediate to Advanced', 'Advanced', 'Expert', 'Mixed Experience'])).nullable().describe("Web3/crypto experience level ranges of users"),
  professional_roles: z.array(z.string()).nullable().describe("Common professional roles of the users"),
  core_motivations: z.array(z.string()).nullable().describe("Primary motivations for engagement and participation"),
  decision_drivers: z.array(z.string()).nullable().describe("Key factors influencing user decisions and actions"),
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
  project_name: z.string().describe("Official name"),
  website_url: z.string().nullable().describe("Official website URL"),
  industry_classification: z.string().describe("Primary industry sector classification"),
  
  // Core Operational Metrics
  key_features: z.array(z.string()).nullable().describe("List of key features and capabilities"),
  target_audience: z.string().nullable().describe("Primary target audience base"),
  geographic_focus: z.array(z.enum(['North America', 'Europe', 'Asia', 'LaTam', 'China', 'Africa', 'Oceania', 'Global'])).nullable().describe("Geographic focus and presence"),
  operational_status: z.enum(['development', 'testnet', 'mainnet', 'active', 'other', 'deprecated', 'acquired']).nullable().describe("Current operational status"),
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
  defi_protocol_category: z.string().nullable().describe("DeFi protocol category (DEX, Lending, Yield, Derivatives, etc.)"),
  
  // DeFi Market Metrics
  defi_total_value_locked_usd: z.number().min(0).nullable().describe("Current Total Value Locked in USD"),
  
  // DeFi Tokenomics
  defi_yield_mechanisms: z.array(z.string()).nullable().describe("Yield generation mechanisms"),
  defi_liquidity_incentives: z.string().nullable().describe("Liquidity provision incentives"),
  defi_fee_sharing_model: z.string().nullable().describe("How fees are shared with token holders"),
});

/**
 * GameFi Protocol Extensions - Flat fields specific to GameFi protocols
 */
const GameFiProtocolFlatExtensions = z.object({
  // GameFi Identification
  gamefi_game_category: z.string().nullable().describe("Gaming category (MMORPG, Strategy, Casual, etc.)"),
  gamefi_platform_type: z.array(z.enum(['Mobile', 'Web', 'Desktop', 'VR', 'other'])).nullable().describe("Platform type (Mobile, Web, Desktop, VR, other)"),
  gamefi_nft_integration: z.string().nullable().describe("NFT integration and asset ownership model"),
  
  // GameFi Core Metrics
  gamefi_gameplay_features: z.array(z.string()).nullable().describe("Core gameplay features"),
  
  // GameFi Tokenomics
  gamefi_game_tokens: z.array(z.string()).nullable().describe("In-game tokens and their utilities"),
  gamefi_nft_assets: z.array(z.string()).nullable().describe("Types of NFT assets and their functions"),
  gamefi_play_to_earn_model: z.string().nullable().describe("Play-to-earn mechanics and sustainability"),
  gamefi_asset_trading: z.string().nullable().describe("In-game asset trading and marketplace mechanics"),
});

/**
 * Social Protocol Extensions - Flat fields specific to SocialFi protocols
 */
const SocialProtocolFlatExtensions = z.object({
  // Social Identification
  social_category: z.string().nullable().describe("Social protocol category (Content, Identity, Communication, etc.)"),
  social_features: z.array(z.string()).nullable().describe("Core social features and capabilities"),
  
  // Social Market Metrics
  social_monthly_active_users: z.number().int().min(0).nullable().describe("Monthly active users"),
  social_content_creators_count: z.number().int().min(0).nullable().describe("Number of content creators"),
  
  // Social Tokenomics
  social_creator_monetization: z.string().nullable().describe("Creator monetization model"),
  social_content_rewards: z.string().nullable().describe("Content creation and curation rewards"),
  social_token_utility: z.array(z.string()).nullable().describe("Social token use cases"),
});

/**
 * Infrastructure Extensions - Flat fields specific to blockchain infrastructure
 */
const InfrastructureFlatExtensions = z.object({
  // Infrastructure Identification
  infra_category: z.enum(['Layer1', 'Layer2', 'Rollup', 'Bridge', 'Oracle', 'Storage', 'Compute', 'Indexing', 'RPC', 'Node', 'Validator', 'Wallet', 'Account Abstraction', 'Interoperability', 'MEV', 'ZK', 'Data Availability', 'Sequencer', 'Security', 'Identity', 'Dev Tooling', 'Monitoring', 'Messaging', 'Governance', 'Other']).nullable().describe("Infrastructure category"),
  
  // Infrastructure Market Metrics
  infra_daily_transactions: z.number().int().min(0).nullable().describe("Daily transaction count"),
  infra_projects_building: z.number().int().min(0).nullable().describe("Number of projects building on/with this infrastructure"),
  infra_market_share: z.number().min(0).max(1).nullable().describe("Market share in category (0-1)"),
  
  // Infrastructure Performance
  infra_throughput: z.string().nullable().describe("Transaction throughput (TPS)"),
  infra_cost_per_transaction: z.number().min(0).nullable().describe("Average cost per transaction in USD"),
  
  // Infrastructure Tokenomics
  infra_validator_economics: z.string().nullable().describe("Validator/operator economics and requirements"),
  infra_staking_mechanics: z.string().nullable().describe("Staking requirements and rewards"),
  infra_network_fees: z.string().nullable().describe("Network fee structure and distribution"),
});

/**
 * Exchange Extensions - Flat fields specific to crypto exchanges
 */
const ExchangeFlatExtensions = z.object({
  // Exchange Identification
  exchange_type: z.enum(['CEX', 'DEX', 'Hybrid', 'Aggregator']).nullable().describe("Exchange type"),
  exchange_trading_pairs: z.number().int().min(0).nullable().describe("Number of trading pairs"),
  exchange_supported_assets: z.array(z.string()).nullable().describe("Major supported asset categories"),
  
  // Exchange Market Metrics
  exchange_trading_volume_24h_usd: z.number().min(0).nullable().describe("24-hour trading volume in USD"),
  exchange_market_rank: z.number().int().min(1).nullable().describe("Market ranking by volume"),
  exchange_liquidity_depth: z.number().min(0).max(1).nullable().describe("Overall liquidity depth assessment"),
  
  // Exchange Features
  exchange_trading_features: z.array(z.enum(['spot', 'futures', 'options', 'margin', 'derivatives', 'lending', 'staking', 'otc', 'p2p', 'perpetuals', 'swaps', 'orderbook', 'amm', 'other'])).nullable().describe("Trading features available on the exchange"),
  exchange_fiat_support: z.array(z.string()).nullable().describe("Supported fiat currencies"),
  
  // Exchange Fees
  exchange_maker_fee: z.number().min(0).nullable().describe("Maker fee percentage"),
  exchange_taker_fee: z.number().min(0).nullable().describe("Taker fee percentage"),
  exchange_withdrawal_fees: z.number().min(0).nullable().describe("Withdrawal fee percentage"),
  
  // Exchange Tokenomics
  exchange_token_benefits: z.array(z.string()).nullable().describe("Benefits for exchange token holders"),
  exchange_liquidity_incentives: z.string().nullable().describe("Liquidity provision incentives"),
});

/**
 * Investment Fund Extensions - Flat fields specific to investment funds
 */
const InvestmentFundFlatExtensions = z.object({
  // Fund Identification
  fund_type: z.enum(['Venture Capital', 'Accelerator', 'Family Office', 'Corporate VC', 'Other']).nullable().describe("Type of investment fund"),
  fund_investment_stage: z.enum(['Agnostic', 'Grants', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Institutional', 'ICO']).nullable().describe("Primary investment stage focus"),
  fund_sector_focus: z.array(z.string()).nullable().describe("Primary sector and technology focus areas or Agnostic"),
  fund_portfolio_link: z.string().nullable().describe("Portfolio companies listing URL"),
  
  // Fund Market Metrics
  fund_size_usd: z.number().min(0).nullable().describe("Total fund size in USD (if public)"),
  fund_portfolio_size: z.number().int().min(0).nullable().describe("Number of portfolio companies"),
  fund_investments: z.array(z.string()).nullable().describe("All portfolio investments. X handles only (@username format)"),
  fund_market_reputation: z.enum(['Tier S', 'Tier A', 'Tier B', 'Tier C']).nullable().describe("Market reputation in investments"),
  
  // Fund Investment Model
  fund_token: z.string().nullable().describe("Fund token or investment vehicle (if applicable)"),
  fund_investment_model: z.array(z.enum(['Equity', 'Debt', 'Tokens', 'Hybrid', 'Other'])).nullable().describe("Investment deployment strategy"),
});

/**
 * Service Provider Extensions - Flat fields specific to service providers
 */
const ServiceProviderFlatExtensions = z.object({
  // Service Identification
  service_category: z.array(z.enum(['Development', 'Marketing', 'Legal', 'PR', 'Audits', 'Community Management', 'Tokenomics', 'Design', 'Governance Advisory', 'Content', 'Partnerships', 'Education & Training', 'Localization', 'Event Management'])).nullable().describe("Primary service category"),
  service_target_clients: z.array(z.string()).nullable().describe("Target client segments and industries"),
  service_competitive_advantages: z.array(z.string()).nullable().describe("Key competitive advantages"),
  service_case_studies_url: z.string().nullable().describe("Case studies or portfolio URL"),
  service_testimonials_url: z.string().nullable().describe("Client testimonials or reviews URL"),
  
  // Service Market Metrics
  service_client_portfolio: z.array(z.string()).nullable().describe("All clients. X handles only (@username format)"),
  service_team_size: z.enum(['1-5', '6-15', '16-50', '51-100', '100+', 'undisclosed']).nullable().describe("Team size range"),
});

/**
 * Community/DAO Extensions - Flat fields specific to communities and DAOs
 */
const CommunityDAOFlatExtensions = z.object({
  // Community Identification
  community_type: z.array(z.enum(['DAO', 'Guild', 'Regional', 'Builder', 'Grants', 'Supporter', 'Collector', 'Research', 'Creator'])).nullable().describe("Type of community or DAO"),
  community_mission_focus: z.string().nullable().describe("Mission and primary focus areas"),
  community_membership_model: z.string().nullable().describe("Membership model and participation requirements"),
  
  // Community Market Metrics
  community_member_count: z.number().int().min(0).nullable().describe("Total community member count"),
  community_influence_reach: z.number().min(0).max(1).nullable().describe("Community influence and reach within the ecosystem"),
  
  // Community Core Metrics
  community_initiatives: z.array(z.string()).nullable().describe("Key community initiatives and programs"),
  community_member_benefits: z.array(z.string()).nullable().describe("Benefits and value provided to members"),
  
  // Community Tokenomics
  community_treasury_management: z.string().nullable().describe("Treasury allocation and management"),
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
  
  unified_messaging_approach: z.object({
    preferred_tone: z.string().describe("Overall recommended communication tone"),
    key_messages: z.array(z.string()).describe("Core messages that resonate across all archetypes"),
    content_strategy: z.array(z.string()).describe("Content types, formats, and strategic recommendations"),
    channel_strategy: z.array(z.string()).describe("Channel preferences and optimization recommendations")
  }).describe("Comprehensive messaging strategy that works across all archetypes")
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
  const orgSubtype = classification?.org_subtype?.[0] || 'general'
  
  console.log(`📋 Building modular schema for: orgType="${orgType}", orgSubtype="${orgSubtype}"`);
  
  // Helper function to determine which universal modules to include
  function needsTokenomics(type: string): boolean {
    return ['protocol', 'infrastructure', 'exchange', 'community'].includes(type);
  }
  
  function needsTechnical(type: string): boolean {
    return ['protocol', 'infrastructure', 'exchange'].includes(type);
  }
  
  function needsSecurity(type: string): boolean {
    return ['protocol', 'infrastructure', 'exchange'].includes(type);
  }
  
  function needsFunding(type: string): boolean {
    return ['protocol', 'infrastructure', 'exchange', 'service'].includes(type);
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
  
  // Apply category-specific extensions based on classification
  if (orgType === 'protocol') {
    if (orgSubtype === 'defi') {
      finalSchema = finalSchema.extend(DeFiProtocolFlatExtensions.shape)
    } else if (orgSubtype === 'gaming') {
      finalSchema = finalSchema.extend(GameFiProtocolFlatExtensions.shape)
    } else if (orgSubtype === 'social') {
      finalSchema = finalSchema.extend(SocialProtocolFlatExtensions.shape)
    }
    // General protocols use just the universal modules
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
  }

  // Combine with universal user behavior insights
  const completeSchema = z.object({
    twitter_username: z.string().describe("Twitter username of the analyzed organization"),
    timestamp_utc: z.string().describe("UTC timestamp of when the analysis was performed"),
    classification_used: z.object({
      org_type: z.string().describe("Organization type used for analysis"),
      org_subtype: z.array(z.string()).describe("Organization subtypes used for analysis"),
      web3_focus: z.string().describe("Web3 focus classification")
    }).describe("Classification parameters used for this analysis"),
    
    // All fields flattened at root level
    ...finalSchema.shape,
    
    // Universal user behavior and ICP insights
    ...UniversalUserBehaviorInsightsSchema.shape,
    
    // Analysis metadata
    analysis_metadata: z.object({
      confidence_score: z.number().min(0).max(1).describe("Confidence score for the analysis (0-1)"),
      research_sources: z.array(z.string()).describe("Primary sources used for the analysis")
    }).describe("Analysis quality and source metadata")
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
  const orgSubtype = classification?.org_subtype?.[0] || 'general'
  const web3Focus = classification?.web3_focus || 'native'

  // Protocol-specific context
  if (orgType === 'protocol') {
    switch (orgSubtype) {
      case 'defi':
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
      
      case 'gaming':
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
      
      case 'social':
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
      
      default:
        return getDefaultProtocolContext()
    }
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
    console.log('   Classification:', classification?.org_type || 'default', classification?.org_subtype || '');

    console.log(`📝 System Message:\n${messages[0].content}\n`);
    console.log(`📝 User Message:\n${messages[1].content}\n`);

    const completion = await grokClient.chat.completions.create({
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

    console.log('✅ Grok API response received');
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from Grok API');
    }

    // Parse the structured response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      console.log('✅ JSON parsing successful');
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError);
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
        // Convert complete analysis to Neo4j-compatible format
        const comprehensiveProperties: Record<string, any> = {};
        
        // All fields are now flattened at root level - direct property mapping
        const flatAnalysis = analysis as any;
        
        // Basic identification fields
        if (flatAnalysis.project_name) comprehensiveProperties.project_name = flatAnalysis.project_name;
        if (flatAnalysis.website_url) comprehensiveProperties.website_url = flatAnalysis.website_url;
        if (flatAnalysis.industry_classification) comprehensiveProperties.industry_classification = flatAnalysis.industry_classification;
        
        // Social platform links (flattened)
        if (flatAnalysis.discord_url) comprehensiveProperties.discord = flatAnalysis.discord_url;
        if (flatAnalysis.farcaster_url) comprehensiveProperties.farcaster = flatAnalysis.farcaster_url;
        if (flatAnalysis.telegram_url) comprehensiveProperties.telegram = flatAnalysis.telegram_url;
        if (flatAnalysis.governance_forum_url) comprehensiveProperties.governance_forum = flatAnalysis.governance_forum_url;
        if (flatAnalysis.linkedin_url) comprehensiveProperties.linkedin = flatAnalysis.linkedin_url;
        if (flatAnalysis.youtube_url) comprehensiveProperties.youtube = flatAnalysis.youtube_url;
        if (flatAnalysis.medium_url) comprehensiveProperties.medium = flatAnalysis.medium_url;
        if (flatAnalysis.blog_url) comprehensiveProperties.blog = flatAnalysis.blog_url;
        
        // Technical links (flattened) - Handle arrays properly
        if (flatAnalysis.github_url) comprehensiveProperties.github_url = Array.isArray(flatAnalysis.github_url) ? JSON.stringify(flatAnalysis.github_url) : flatAnalysis.github_url;
        if (flatAnalysis.whitepaper_url) comprehensiveProperties.whitepaper_url = flatAnalysis.whitepaper_url;
        if (flatAnalysis.docs_url) comprehensiveProperties.docs_url = flatAnalysis.docs_url;
        if (flatAnalysis.explorer_url) comprehensiveProperties.explorer_url = flatAnalysis.explorer_url;
        if (flatAnalysis.api_docs_url) comprehensiveProperties.api_docs_url = flatAnalysis.api_docs_url;
        if (flatAnalysis.audit_report_url) comprehensiveProperties.audit_report_url = flatAnalysis.audit_report_url;
        
        // Market position fields
        if (flatAnalysis.sentiment_score) comprehensiveProperties.sentiment_score = flatAnalysis.sentiment_score;
        if (flatAnalysis.market_presence) comprehensiveProperties.market_presence = flatAnalysis.market_presence;
        if (flatAnalysis.competitors) comprehensiveProperties.competitors = JSON.stringify(flatAnalysis.competitors);
        
        // Strategic Intelligence Parameters
        if (flatAnalysis.monetization_readiness) comprehensiveProperties.monetization_readiness = flatAnalysis.monetization_readiness;
        if (flatAnalysis.market_maturity) comprehensiveProperties.market_maturity = flatAnalysis.market_maturity;
        if (flatAnalysis.product_lifecycle_stage) comprehensiveProperties.product_lifecycle_stage = flatAnalysis.product_lifecycle_stage;
        if (flatAnalysis.community_health_score) comprehensiveProperties.community_health_score = flatAnalysis.community_health_score;
        
        // Core operational metrics
        if (flatAnalysis.key_features) comprehensiveProperties.key_features = JSON.stringify(flatAnalysis.key_features);
        if (flatAnalysis.target_audience) comprehensiveProperties.target_audience = flatAnalysis.target_audience;
        if (flatAnalysis.geographic_focus) comprehensiveProperties.geographic_focus = JSON.stringify(flatAnalysis.geographic_focus);
        if (flatAnalysis.operational_status) comprehensiveProperties.operational_status = flatAnalysis.operational_status;
        
        // Ecosystem analysis
        if (flatAnalysis.market_narratives) comprehensiveProperties.market_narratives = JSON.stringify(flatAnalysis.market_narratives);
        if (flatAnalysis.notable_partnerships) comprehensiveProperties.notable_partnerships = JSON.stringify(flatAnalysis.notable_partnerships);
        if (flatAnalysis.recent_developments) comprehensiveProperties.recent_developments = JSON.stringify(flatAnalysis.recent_developments);
        
        // Funding structure (flattened)
        if (flatAnalysis.funding_status) comprehensiveProperties.funding_status = flatAnalysis.funding_status;
        if (flatAnalysis.funding_amount) comprehensiveProperties.funding_amount = flatAnalysis.funding_amount;
        if (flatAnalysis.investors) comprehensiveProperties.investors = JSON.stringify(flatAnalysis.investors);
        
        // Universal tokenomics (flattened)
        if (flatAnalysis.tge_status) comprehensiveProperties.tge_status = flatAnalysis.tge_status;
        if (flatAnalysis.token_symbol) comprehensiveProperties.token_symbol = flatAnalysis.token_symbol;
        if (flatAnalysis.token_utilities) comprehensiveProperties.token_utilities = JSON.stringify(flatAnalysis.token_utilities);
        if (flatAnalysis.tokenomics_model) comprehensiveProperties.tokenomics_model = flatAnalysis.tokenomics_model;
        if (flatAnalysis.governance_structure) comprehensiveProperties.governance_structure = flatAnalysis.governance_structure;
        
        // Universal audit/security (flattened)
        if (flatAnalysis.auditor) comprehensiveProperties.audit_auditor = flatAnalysis.auditor;
        if (flatAnalysis.audit_date) comprehensiveProperties.audit_date = flatAnalysis.audit_date;
        if (flatAnalysis.security_measures) comprehensiveProperties.security_measures = JSON.stringify(flatAnalysis.security_measures);
        
        // Technical infrastructure
        if (flatAnalysis.chains_supported) comprehensiveProperties.chains_supported = flatAnalysis.chains_supported;
        if (flatAnalysis.supported_chains) comprehensiveProperties.supported_chains = JSON.stringify(flatAnalysis.supported_chains);
        if (flatAnalysis.technical_stack) comprehensiveProperties.technical_stack = JSON.stringify(flatAnalysis.technical_stack);
        if (flatAnalysis.developer_tools) comprehensiveProperties.developer_tools = JSON.stringify(flatAnalysis.developer_tools);
        
        // User behavior and ICP fields
        if (flatAnalysis.engagement_patterns) comprehensiveProperties.engagement_patterns = JSON.stringify(flatAnalysis.engagement_patterns);
        if (flatAnalysis.user_journey) comprehensiveProperties.user_journey = flatAnalysis.user_journey;
        if (flatAnalysis.retention_factors) comprehensiveProperties.retention_factors = JSON.stringify(flatAnalysis.retention_factors);
        if (flatAnalysis.engagement_depth) comprehensiveProperties.engagement_depth = flatAnalysis.engagement_depth;
        
        // Demographics (flattened)
        if (flatAnalysis.age_demographics) comprehensiveProperties.age_demographics = JSON.stringify(flatAnalysis.age_demographics);
        if (flatAnalysis.experience_level) comprehensiveProperties.experience_level = JSON.stringify(flatAnalysis.experience_level);
        if (flatAnalysis.professional_roles) comprehensiveProperties.professional_roles = JSON.stringify(flatAnalysis.professional_roles);
        
        // Psychographics (flattened)
        if (flatAnalysis.core_motivations) comprehensiveProperties.core_motivations = JSON.stringify(flatAnalysis.core_motivations);
        if (flatAnalysis.decision_drivers) comprehensiveProperties.decision_drivers = JSON.stringify(flatAnalysis.decision_drivers);
        
        // Behavioral indicators (flattened)
        if (flatAnalysis.interaction_preferences) comprehensiveProperties.interaction_preferences = JSON.stringify(flatAnalysis.interaction_preferences);
        if (flatAnalysis.activity_patterns) comprehensiveProperties.activity_patterns = JSON.stringify(flatAnalysis.activity_patterns);
        if (flatAnalysis.conversion_factors) comprehensiveProperties.conversion_factors = JSON.stringify(flatAnalysis.conversion_factors);
        if (flatAnalysis.loyalty_indicators) comprehensiveProperties.loyalty_indicators = JSON.stringify(flatAnalysis.loyalty_indicators);
        
        // Category-specific extensions - DeFi
        if (flatAnalysis.defi_protocol_category) comprehensiveProperties.defi_protocol_category = flatAnalysis.defi_protocol_category;
        if (flatAnalysis.defi_total_value_locked_usd) comprehensiveProperties.total_value_locked_usd = flatAnalysis.defi_total_value_locked_usd;
        if (flatAnalysis.defi_yield_mechanisms) comprehensiveProperties.defi_yield_mechanisms = JSON.stringify(flatAnalysis.defi_yield_mechanisms);
        if (flatAnalysis.defi_liquidity_incentives) comprehensiveProperties.defi_liquidity_incentives = flatAnalysis.defi_liquidity_incentives;
        if (flatAnalysis.defi_fee_sharing_model) comprehensiveProperties.defi_fee_sharing_model = flatAnalysis.defi_fee_sharing_model;
        
        // Category-specific extensions - GameFi
        if (flatAnalysis.gamefi_game_category) comprehensiveProperties.gamefi_game_category = flatAnalysis.gamefi_game_category;
        if (flatAnalysis.gamefi_platform_type) comprehensiveProperties.gamefi_platform_type = JSON.stringify(flatAnalysis.gamefi_platform_type);
        if (flatAnalysis.gamefi_nft_integration) comprehensiveProperties.gamefi_nft_integration = flatAnalysis.gamefi_nft_integration;
        if (flatAnalysis.gamefi_gameplay_features) comprehensiveProperties.gamefi_gameplay_features = JSON.stringify(flatAnalysis.gamefi_gameplay_features);
        if (flatAnalysis.gamefi_game_tokens) comprehensiveProperties.gamefi_game_tokens = JSON.stringify(flatAnalysis.gamefi_game_tokens);
        if (flatAnalysis.gamefi_nft_assets) comprehensiveProperties.gamefi_nft_assets = JSON.stringify(flatAnalysis.gamefi_nft_assets);
        if (flatAnalysis.gamefi_play_to_earn_model) comprehensiveProperties.gamefi_play_to_earn_model = flatAnalysis.gamefi_play_to_earn_model;
        if (flatAnalysis.gamefi_asset_trading) comprehensiveProperties.gamefi_asset_trading = flatAnalysis.gamefi_asset_trading;
        
        // Category-specific extensions - Social
        if (flatAnalysis.social_category) comprehensiveProperties.social_category = flatAnalysis.social_category;
        if (flatAnalysis.social_features) comprehensiveProperties.social_features = JSON.stringify(flatAnalysis.social_features);
        if (flatAnalysis.social_monthly_active_users) comprehensiveProperties.monthly_active_users = flatAnalysis.social_monthly_active_users;
        if (flatAnalysis.social_content_creators_count) comprehensiveProperties.social_content_creators_count = flatAnalysis.social_content_creators_count;
        if (flatAnalysis.social_creator_monetization) comprehensiveProperties.social_creator_monetization = flatAnalysis.social_creator_monetization;
        if (flatAnalysis.social_content_rewards) comprehensiveProperties.social_content_rewards = flatAnalysis.social_content_rewards;
        if (flatAnalysis.social_token_utility) comprehensiveProperties.social_token_utility = JSON.stringify(flatAnalysis.social_token_utility);
        
        // Category-specific extensions - Infrastructure
        if (flatAnalysis.infra_category) comprehensiveProperties.infra_category = flatAnalysis.infra_category;
        if (flatAnalysis.infra_daily_transactions) comprehensiveProperties.daily_transactions = flatAnalysis.infra_daily_transactions;
        if (flatAnalysis.infra_projects_building) comprehensiveProperties.infra_projects_building = flatAnalysis.infra_projects_building;
        if (flatAnalysis.infra_market_share) comprehensiveProperties.infra_market_share = flatAnalysis.infra_market_share;
        if (flatAnalysis.infra_throughput) comprehensiveProperties.throughput = flatAnalysis.infra_throughput;
        if (flatAnalysis.infra_cost_per_transaction) comprehensiveProperties.cost_per_transaction = flatAnalysis.infra_cost_per_transaction;
        if (flatAnalysis.infra_validator_economics) comprehensiveProperties.infra_validator_economics = flatAnalysis.infra_validator_economics;
        if (flatAnalysis.infra_staking_mechanics) comprehensiveProperties.infra_staking_mechanics = flatAnalysis.infra_staking_mechanics;
        if (flatAnalysis.infra_network_fees) comprehensiveProperties.infra_network_fees = flatAnalysis.infra_network_fees;
        
        // Category-specific extensions - Exchange
        if (flatAnalysis.exchange_type) comprehensiveProperties.exchange_type = flatAnalysis.exchange_type;
        if (flatAnalysis.exchange_trading_pairs) comprehensiveProperties.exchange_trading_pairs = flatAnalysis.exchange_trading_pairs;
        if (flatAnalysis.exchange_supported_assets) comprehensiveProperties.exchange_supported_assets = JSON.stringify(flatAnalysis.exchange_supported_assets);
        if (flatAnalysis.exchange_trading_volume_24h_usd) comprehensiveProperties.trading_volume_24h_usd = flatAnalysis.exchange_trading_volume_24h_usd;
        if (flatAnalysis.exchange_market_rank) comprehensiveProperties.market_rank = flatAnalysis.exchange_market_rank;
        if (flatAnalysis.exchange_liquidity_depth) comprehensiveProperties.exchange_liquidity_depth = flatAnalysis.exchange_liquidity_depth;
        if (flatAnalysis.exchange_trading_features) comprehensiveProperties.trading_features = JSON.stringify(flatAnalysis.exchange_trading_features);
        if (flatAnalysis.exchange_fiat_support) comprehensiveProperties.exchange_fiat_support = JSON.stringify(flatAnalysis.exchange_fiat_support);
        if (flatAnalysis.exchange_maker_fee) comprehensiveProperties.maker_fee = flatAnalysis.exchange_maker_fee;
        if (flatAnalysis.exchange_taker_fee) comprehensiveProperties.taker_fee = flatAnalysis.exchange_taker_fee;
        if (flatAnalysis.exchange_withdrawal_fees) comprehensiveProperties.withdrawal_fees = flatAnalysis.exchange_withdrawal_fees;
        if (flatAnalysis.exchange_token_benefits) comprehensiveProperties.exchange_token_benefits = JSON.stringify(flatAnalysis.exchange_token_benefits);
        if (flatAnalysis.exchange_liquidity_incentives) comprehensiveProperties.exchange_liquidity_incentives = flatAnalysis.exchange_liquidity_incentives;
        
        // Category-specific extensions - Investment Fund
        if (flatAnalysis.fund_type) comprehensiveProperties.fund_type = flatAnalysis.fund_type;
        if (flatAnalysis.fund_investment_stage) comprehensiveProperties.fund_investment_stage = flatAnalysis.fund_investment_stage;
        if (flatAnalysis.fund_sector_focus) comprehensiveProperties.fund_sector_focus = JSON.stringify(flatAnalysis.fund_sector_focus);
        if (flatAnalysis.fund_portfolio_link) comprehensiveProperties.fund_portfolio_link = flatAnalysis.fund_portfolio_link;
        if (flatAnalysis.fund_size_usd) comprehensiveProperties.fund_size_usd = flatAnalysis.fund_size_usd;
        if (flatAnalysis.fund_portfolio_size) comprehensiveProperties.portfolio_size = flatAnalysis.fund_portfolio_size;
        if (flatAnalysis.fund_investments) comprehensiveProperties.investments = JSON.stringify(flatAnalysis.fund_investments);
        if (flatAnalysis.fund_market_reputation) comprehensiveProperties.fund_market_reputation = flatAnalysis.fund_market_reputation;
        if (flatAnalysis.fund_token) comprehensiveProperties.fund_token = flatAnalysis.fund_token;
        if (flatAnalysis.fund_investment_model) comprehensiveProperties.fund_investment_model = JSON.stringify(flatAnalysis.fund_investment_model);
        
        // Category-specific extensions - Service Provider
        if (flatAnalysis.service_category) comprehensiveProperties.service_category = JSON.stringify(flatAnalysis.service_category);
        if (flatAnalysis.service_target_clients) comprehensiveProperties.service_target_clients = JSON.stringify(flatAnalysis.service_target_clients);
        if (flatAnalysis.service_competitive_advantages) comprehensiveProperties.service_competitive_advantages = JSON.stringify(flatAnalysis.service_competitive_advantages);
        if (flatAnalysis.service_case_studies_url) comprehensiveProperties.service_case_studies_url = flatAnalysis.service_case_studies_url;
        if (flatAnalysis.service_testimonials_url) comprehensiveProperties.service_testimonials_url = flatAnalysis.service_testimonials_url;
        if (flatAnalysis.service_client_portfolio) comprehensiveProperties.client_portfolio = JSON.stringify(flatAnalysis.service_client_portfolio);
        if (flatAnalysis.service_team_size) comprehensiveProperties.service_team_size = flatAnalysis.service_team_size;
        
        // Category-specific extensions - Community/DAO
        if (flatAnalysis.community_type) comprehensiveProperties.community_type = JSON.stringify(flatAnalysis.community_type);
        if (flatAnalysis.community_mission_focus) comprehensiveProperties.community_mission_focus = flatAnalysis.community_mission_focus;
        if (flatAnalysis.community_membership_model) comprehensiveProperties.community_membership_model = flatAnalysis.community_membership_model;
        if (flatAnalysis.community_member_count) comprehensiveProperties.member_count = flatAnalysis.community_member_count;
        if (flatAnalysis.community_influence_reach) comprehensiveProperties.community_influence_reach = flatAnalysis.community_influence_reach;
        if (flatAnalysis.community_initiatives) comprehensiveProperties.community_initiatives = JSON.stringify(flatAnalysis.community_initiatives);
        if (flatAnalysis.community_member_benefits) comprehensiveProperties.community_member_benefits = JSON.stringify(flatAnalysis.community_member_benefits);
        if (flatAnalysis.community_treasury_management) comprehensiveProperties.community_treasury_management = flatAnalysis.community_treasury_management;
        
        // User behavior insights
        if (flatAnalysis.user_archetypes) comprehensiveProperties.user_archetypes = JSON.stringify(flatAnalysis.user_archetypes);
        if (flatAnalysis.unified_messaging_approach) comprehensiveProperties.unified_messaging_approach = JSON.stringify(flatAnalysis.unified_messaging_approach);

        
        // Store flattened analysis timestamp
        comprehensiveProperties.last_icp_analysis = new Date().toISOString();
        comprehensiveProperties.classification_used = JSON.stringify({
          org_type: classification?.org_type || 'protocol',
          org_subtype: classification?.org_subtype || ['general'],
          web3_focus: classification?.web3_focus || 'native'
        });

        console.log(`📊 Preparing to store ${Object.keys(comprehensiveProperties).length} properties to Neo4j`);
        console.log(`   📋 Key fields: ${Object.keys(comprehensiveProperties).slice(0, 10).join(', ')}...`);
        
        if (Object.keys(comprehensiveProperties).length > 0) {
          await updateOrganizationProperties(neo4jData.userId, comprehensiveProperties);
          console.log(`✅ Successfully stored complete flattened ICP analysis to Neo4j`);
          console.log(`   📊 Total properties stored: ${Object.keys(comprehensiveProperties).length}`);
        } else {
          console.log(`⚠️  No properties extracted from analysis to store`);
        }
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
