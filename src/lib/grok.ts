import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';

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
// UNIVERSAL BASE SCHEMAS - Applied to all organization types
// ================================================================================================

/**
 * Universal base schema for basic organizational identification
 * Applied to all organizations regardless of type/category
 */
const UniversalBaseIdentificationSchema = z.object({
  project_name: z.string().describe("Official name"),
  website_url: z.string().nullable().describe("Official website URL"),
  industry_classification: z.string().describe("Primary industry sector classification"),
  links: z.object({
    discord: z.string().nullable().describe("Discord server URL"),
    farcaster: z.string().nullable().describe("Farcaster profile URL"),
    telegram: z.string().nullable().describe("Telegram group URL"),
    governance_forum: z.string().nullable().describe("Governance or DAO or treasury link"),
  }).describe("Social platform links")
});

/**
 * Universal base schema for market positioning metrics
 * Core metrics applicable to all organization types
 */
const UniversalBaseMarketPositionSchema = z.object({
  sentiment_score: z.number().min(0).max(1).nullable().describe("Overall market sentiment score (0-1)"),
  market_presence: z.string().describe("Overall market presence and visibility assessment"),
  competitors: z.array(z.string()).describe("List of primary competitors in the space. X handles only (@username format)")
});

/**
 * Universal base schema for core operational metrics
 * Fundamental capabilities and features across all types
 */
const UniversalBaseCoreMetricsSchema = z.object({
  key_features: z.array(z.string()).describe("List of key features and capabilities"),
  target_audience: z.string().describe("Primary target audience base"),
  geographic_focus: z.array(z.enum(['North America', 'Europe', 'Asia', 'LaTam', 'China', 'Africa', 'Oceania', 'Global'])).describe("Geographic focus and presence"),
  operational_status: z.enum(['development', 'testnet', 'mainnet', 'active', 'other', 'deprecated', 'acquired']).describe("Current operational status"),
});

/**
 * Universal base schema for ecosystem analysis
 * Relationship and positioning data applicable to all types
 */
const UniversalEcosystemAnalysisSchema = z.object({
  market_narratives: z.array(z.string()).describe("Current market narratives and themes associated"),
  notable_partnerships: z.array(z.string()).describe("All partnerships and collaborations. X handles only (@username format)"),
  recent_developments: z.array(z.string()).describe("Recent major developments")
});

/**
 * Universal base schema for funding structure
 * Funding and investment information
 */
const UniversalFundingStructureSchema = z.object({
  funding_status: z.enum(['bootstrapped', 'pre-seed', 'seed', 'series_a', 'series_b', 'series_c', 'Grants', 'Private', 'self-sustaining', 'ICO', 'Public']).describe("Funding status"),
  funding_amount: z.enum(['<1M', '1-5M', '5-10M', '10-50M', '50-100M', '>100M', 'undisclosed']),
  investors: z.array(z.string()).nullable().describe("Investors, X handles only (@username format)")
}).describe("Funding history");

/**
 * Base Tokenomics Schema - Core tokenomics fields without nullable wrapper
 * Applied directly within token-bearing organization extensions
 */
const BaseTokenomicsSchema = z.object({
  tge_status: z.enum(['pre-tge', 'post-tge']).nullable().describe("Token Generation Event (TGE) status"),
  token_symbol: z.string().nullable().describe("Native token symbol"),
  utilities: z.array(z.enum(['governance', 'staking', 'fee_payment', 'fee_discount', 'collateral', 'rewards', 'access', 'liquidity_mining', 'other'])).nullable().describe("Core token utilities and use cases"),
  tokenomics_model: z.string().nullable().describe("Token distribution, allocation, and value accrual mechanisms"),
  governance_structure: z.string().nullable().describe("Governance structure if applicable"),
});

/**
 * Base Tokenomics Extensions - Wrapped with nullable/optional for direct use
 */
const BaseTokenomicsExtensions = {
  tokenomics: BaseTokenomicsSchema.nullable().describe("Token details if native token exists"),
};

/**
 * Base Audit Schema - Core audit/security fields without nullable wrapper
 * Applied directly within auditable organization extensions
 */
const BaseAuditSchema = z.object({
  auditor: z.string().nullable().describe("Security audit firm name"),
  date: z.string().nullable().describe("Date of latest audit"),
  report_url: z.string().nullable().describe("Audit report URL")
});

/**
 * Base Audit Extensions - Wrapped with nullable/optional for direct use
 */
const BaseAuditExtensions = {
  audit_info: BaseAuditSchema.describe("Security audit information"),
};

/// ================================================================================================
/// CATEGORY-SPECIFIC EXTENSION SCHEMAS
/// ================================================================================================

/**
 * Protocol Base Extensions - Common fields for ALL protocol subtypes
 * Applied to all protocols regardless of subtype (defi, gaming, social, etc.)
 */
const ProtocolBaseExtensions = {
  identification: z.object({
    protocol_category: z.enum(['DeFi', 'GameFi', 'Social', 'Infrastructure', 'Other']).describe("Protocol category"),
    chains_supported: z.number().int().min(0).nullable().describe("Number of blockchain networks supported"),
    supported_chains: z.array(z.string()).describe("Blockchain network slugs (e.g., ethereum, polygon, arbitrum)"),
    technical_links: z.object({
      github_url: z.string().nullable().describe("GitHub repository URL"),
      whitepaper_url: z.string().nullable().describe("Whitepaper or documentation URL")
    }).describe("Technical development links")
  }),
  coreMetrics: z.object(BaseAuditExtensions),
  tokenomics: BaseTokenomicsSchema.nullable().describe("Token details if native token exists")
};

/**
 * DeFi Protocol Extensions - Additional fields specific to DeFi protocols
 */
const DeFiProtocolExtensions = {
  identification: z.object({
    protocol_category: z.string().describe("DeFi protocol category (DEX, Lending, Yield, Derivatives, etc.)")
  }),
  
  marketPosition: z.object({
    total_value_locked_usd: z.number().min(0).nullable().describe("Current Total Value Locked in USD")
  }),
  
  // Extend base tokenomics with DeFi-specific fields
  tokenomics: BaseTokenomicsSchema.extend({
    defi_specific: z.object({
      yield_mechanisms: z.array(z.string()).describe("Yield generation mechanisms"),
      liquidity_incentives: z.string().describe("Liquidity provision incentives"),
      fee_sharing_model: z.string().nullable().describe("How fees are shared with token holders")
    }).describe("DeFi-specific tokenomics")
  }).nullable().describe("Token details if native token exists")
};

/**
 * GameFi Protocol Extensions - Gaming and NFT-focused protocols
 */
const GameFiProtocolExtensions = {
  identification: z.object({
    game_category: z.string().describe("Gaming category (MMORPG, Strategy, Casual, etc.)"),
    platform_type: z.array(z.enum(['Mobile', 'Web', 'Desktop', 'VR', 'other'])).describe("Platform type (Mobile, Web, Desktop, VR, other)"),
    nft_integration: z.string().describe("NFT integration and asset ownership model")
  }),
  
  coreMetrics: z.object({
    gameplay_features: z.array(z.string()).describe("Core gameplay features"),
  }),
  
  // Extend base tokenomics with GameFi-specific fields
  tokenomics: BaseTokenomicsSchema.extend({
    gamefi_specific: z.object({
      game_tokens: z.array(z.string()).nullable().describe("In-game tokens and their utilities"),
      nft_assets: z.array(z.string()).nullable().describe("Types of NFT assets and their functions"),
      play_to_earn_model: z.string().nullable().describe("Play-to-earn mechanics and sustainability"),
      asset_trading: z.string().nullable().describe("In-game asset trading and marketplace mechanics")
    }).describe("GameFi-specific tokenomics")
  }).nullable().describe("Token details if native token exists")
};

/**
 * Social Protocol Extensions - SocialFi and social infrastructure protocols
 */
const SocialProtocolExtensions = {
  identification: z.object({
    social_category: z.string().describe("Social protocol category (Content, Identity, Communication, etc.)"),
    social_features: z.array(z.string()).describe("Core social features and capabilities")
  }),
  
  marketPosition: z.object({
    monthly_active_users: z.number().int().min(0).nullable().describe("Monthly active users"),
    content_creators_count: z.number().int().min(0).nullable().describe("Number of content creators")
  }),
  
  // Extend base tokenomics with Social-specific fields
  tokenomics: BaseTokenomicsSchema.extend({
    social_specific: z.object({
      creator_monetization: z.string().describe("Creator monetization model"),
      content_rewards: z.string().describe("Content creation and curation rewards"),
      social_token_utility: z.array(z.string()).describe("Social token use cases")
    }).describe("Social-specific tokenomics")
  }).nullable().describe("Token details if native token exists")
};

/**
 * General Protocol Extensions - For protocols that don't fit specific categories
 */
const GeneralProtocolExtensions = {
  identification: z.object({
    protocol_category: z.string().describe("Protocol category (Infrastructure, Social, Data, etc.)"),
    technical_focus: z.string().describe("Primary technical focus and innovation area")
  }),
  
  marketPosition: z.object({
    user_count_estimate: z.number().int().min(0).nullable().describe("Estimated active users"),
    integration_count: z.number().int().min(0).nullable().describe("Number of integrations or partnerships")
  }),
  
  coreMetrics: z.object({
    technical_metrics: z.object({
      development_activity: z.string().describe("Development activity and momentum"),
      network_effects: z.string().describe("Network effects and adoption metrics")
    }).describe("Technical and adoption metrics")
  })
};

/**
 * Investment Fund Extensions - VC funds, accelerators, and investment entities
 */
const InvestmentFundExtensions = {
  identification: z.object({
    fund_type: z.enum(['Venture Capital', 'Accelerator', 'Family Office', 'Corporate VC', 'Other']).describe("Type of investment fund"),
    investment_stage: z.enum(['Agnostic', 'Grants', 'Pre-seed', 'Seed', 'Series A', 'Series B', 'Institutional', 'ICO']).describe("Primary investment stage focus"),
    sector_focus: z.array(z.string()).describe("Primary sector and technology focus areas or Agnostic"),
    portfolio_link: z.string().nullable().describe("Portfolio companies listing URL")
  }),
  
  marketPosition: z.object({
    fund_size_usd: z.number().min(0).nullable().describe("Total fund size in USD (if public)"),
    portfolio_size: z.number().int().min(0).nullable().describe("Number of portfolio companies"),
    investments: z.array(z.string()).describe("All portfolio investments. X handles only (@username format)"),
    market_reputation: z.enum(['Tier S', 'Tier A', 'Tier B', 'Tier C']).nullable().describe("Market reputation in investments")
  }),
  
  tokenomics: z.object({
    fund_token: z.string().nullable().describe("Fund token or investment vehicle (if applicable)"),
    investment_model: z.array(z.enum(['Equity', 'Debt', 'Tokens', 'Hybrid', 'Other'])).describe("Investment deployment strategy"),
  })
};

/**
 * Infrastructure Extensions - Blockchain infrastructure and developer tools
 */
const InfrastructureExtensions = {
  identification: z.object({
    infra_category: z.enum(['Layer1', 'Layer2', 'Rollup', 'Bridge', 'Oracle', 'Storage', 'Compute', 'Indexing', 'RPC', 'Node', 'Validator', 'Wallet', 'Account Abstraction', 'Interoperability', 'MEV', 'ZK', 'Data Availability', 'Sequencer', 'Security', 'Identity', 'Dev Tooling', 'Monitoring', 'Messaging', 'Governance', 'Other']).describe("Infrastructure category"),
    technical_stack: z.array(z.string()).describe("Core technical components and architecture"),
    chains_supported: z.number().int().min(0).nullable().describe("Number of blockchain networks supported"),
    supported_chains: z.array(z.string()).describe("Blockchain network slugs (e.g., ethereum, polygon, arbitrum)"),
    technical_links: z.object({
      github_url: z.string().nullable().describe("GitHub repository URL"),
      whitepaper_url: z.string().nullable().describe("Technical whitepaper URL"),
      docs_url: z.string().nullable().describe("Developer documentation URL"),
      explorer_url: z.string().nullable().describe("Block explorer or network dashboard URL")
    }).describe("Technical development and monitoring links")
  }),
  
  marketPosition: z.object({
    network_usage_metrics: z.object({
      daily_transactions: z.number().int().min(0).nullable().describe("Daily transaction count")
    }).describe("Core network usage metrics"),
    project_building: z.number().int().min(0).nullable().describe("Number of projects building on/with this infrastructure"),
    market_share: z.number().min(0).max(1).nullable().describe("Market share in category (0-1)")
  }),
  
  coreMetrics: z.object(BaseAuditExtensions).extend({
    performance_metrics: z.object({
      throughput: z.string().nullable().describe("Transaction throughput (TPS)"),
      cost_per_transaction: z.number().min(0).nullable().describe("Average cost per transaction in USD")
    }).describe("Performance benchmarks"),
    developer_tools: z.array(z.string()).describe("Developer tools and SDKs provided")
  }),
  
  // Include base tokenomics with infrastructure-specific extensions
  tokenomics: BaseTokenomicsSchema.extend({
    infrastructure_specific: z.object({
      validator_economics: z.string().nullable().describe("Validator/operator economics and requirements"),
      staking_mechanics: z.string().nullable().describe("Staking requirements and rewards"),
      network_fees: z.string().describe("Network fee structure and distribution")
    }).describe("Infrastructure-specific tokenomics")
  }).nullable().describe("Token details if native token exists")
};

/**
 * Exchange Extensions - Centralized and decentralized exchanges
 */
const ExchangeExtensions = {
  identification: z.object({
    exchange_type: z.enum(['CEX', 'DEX', 'Hybrid', 'Aggregator']).describe("Exchange type"),
    trading_pairs: z.number().int().min(0).nullable().describe("Number of trading pairs"),
    supported_assets: z.array(z.string()).describe("Major supported asset categories"),
    technical_links: z.object({
      github_url: z.string().nullable().describe("GitHub repository URL (for DEXs)"),
      api_docs_url: z.string().nullable().describe("API documentation URL"),
      audit_report_url: z.string().nullable().describe("Security audit report URL")
    }).describe("Technical and security documentation links")
  }),
  
  marketPosition: z.object({
    trading_volume_24h_usd: z.number().min(0).nullable().describe("24-hour trading volume in USD"),
    market_rank: z.number().int().min(1).nullable().describe("Market ranking by volume"),
    liquidity_depth: z.number().min(0).max(1).nullable().describe("Overall liquidity depth assessment")
  }),
  
  coreMetrics: z.object(BaseAuditExtensions).extend({
    trading_features: z.array(z.enum(['spot', 'futures', 'options', 'margin', 'derivatives', 'lending', 'staking', 'otc', 'p2p', 'perpetuals', 'swaps', 'orderbook', 'amm', 'other'])).describe("Trading features available on the exchange"),
    security_measures: z.array(z.string()).describe("Security features and insurance"),
    fiat_support: z.array(z.string()).describe("Supported fiat currencies"),
    trading_fees: z.object({
        maker_fee: z.number().min(0).nullable().describe("Maker fee percentage"),
        taker_fee: z.number().min(0).nullable().describe("Taker fee percentage"),
        withdrawal_fees: z.number().min(0).nullable().describe("Withdrawal fee percentage")
      }).describe("Trading fee structure"),
  }),
  
  // Include base tokenomics with exchange-specific extensions
  tokenomics: BaseTokenomicsSchema.extend({
    exchange_specific: z.object({
      token_benefits: z.array(z.string()).describe("Benefits for exchange token holders"),
      liquidity_incentives: z.string().describe("Liquidity provision incentives")
    }).describe("Exchange-specific tokenomics")
  }).nullable().describe("Token details if native token exists")
};

/**
 * Service Extensions - Agencies, consultancies, and service providers
 */
const ServiceExtensions = {
  identification: z.object({
    service_category: z.array(z.enum(['Development', 'Marketing', 'Legal', 'PR', 'Audits', 'Community Management', 'Tokenomics', 'Design', 'Governance Advisory', 'Content', 'Partnerships', 'Education & Training', 'Localization', 'Event Management'])).describe("Primary service category"),
    target_clients: z.array(z.string()).describe("Target client segments and industries"),
    competitive_advantages: z.array(z.string()).describe("Key competitive advantages"),
    service_links: z.object({
      case_studies_url: z.string().nullable().describe("Case studies or portfolio URL"),
      testimonials_url: z.string().nullable().describe("Client testimonials or reviews URL")
    }).describe("Service documentation and portfolio links")
  }),
  
  marketPosition: z.object({
    client_portfolio: z.array(z.string()).describe("All clients. X handles only (@username format)"),
    team_size: z.enum(['1-5', '6-15', '16-50', '51-100', '100+', 'undisclosed']).nullable().describe("Team size range")
  })
};

/**
 * Community/DAO Extensions - DAOs, communities, and governance-focused organizations
 */
const CommunityDAOExtensions = {
  identification: z.object({
    community_type: z.array(z.enum(['DAO', 'Guild', 'Regional', 'Builder', 'Grants', 'Supporter', 'Collector', 'Research', 'Creator'])).describe("Type of community or DAO"),
    governance_structure: z.string().describe("Governance structure and decision-making model"),
    mission_focus: z.string().describe("Mission and primary focus areas"),
    membership_model: z.string().describe("Membership model and participation requirements")
  }),
  
  marketPosition: z.object({
    member_count: z.number().int().min(0).nullable().describe("Total community member count"),
    influence_reach: z.number().min(0).max(1).nullable().describe("Community influence and reach within the ecosystem")
  }),
  
  coreMetrics: z.object({
    community_initiatives: z.array(z.string()).describe("Key community initiatives and programs"),
    member_benefits: z.array(z.string()).describe("Benefits and value provided to members")
  }),
  
  // Include base tokenomics with DAO-specific extensions
  tokenomics: BaseTokenomicsSchema.extend({
    dao_specific: z.object({
      treasury_management: z.string().describe("Treasury allocation and management")
    }).describe("DAO-specific tokenomics")
  }).nullable().describe("Token details if native token exists")
};

// ================================================================================================
// USER BEHAVIOR AND ICP SYNTHESIS SCHEMAS (Universal across all types)
// ================================================================================================


/**
 * User behavior insights - applicable to all organization types
 */
const UniversalUserBehaviorInsightsSchema = z.object({
  engagement_patterns: z.array(z.string()).describe("Common user engagement and interaction patterns"),
  user_journey: z.string().describe("Typical user journey and onboarding experience"),
  retention_factors: z.array(z.string()).describe("Key factors that drive user retention and loyalty"),
  engagement_depth: z.string().describe("Depth of user engagement and participation levels")
});

/**
 * Demographic profile - universal user demographic characteristics
 */
const UniversalDemographicProfileSchema = z.object({
  age_demographics: z.array(z.enum(['Gen Z (18-26)', 'Millennials (27-42)', 'Gen X (43-58)', 'Boomers (59+)', 'Mixed Generational', 'Young Professionals (22-35)', 'Mid-Career (35-50)', 'Experienced (50+)', 'Institutions'])).describe("Age ranges or generational cohorts"),
  experience_level: z.array(z.enum(['Beginner', 'Beginner to Intermediate', 'Intermediate', 'Intermediate to Advanced', 'Advanced', 'Expert', 'Mixed Experience'])).describe("Web3/crypto experience level ranges of users"),
  professional_roles: z.array(z.string()).describe("Common professional roles of the users")
});

/**
 * Psychographic drivers - universal motivational factors
 */
const UniversalPsychographicSchema = z.object({
  core_motivations: z.array(z.string()).describe("Primary motivations for engagement and participation"),
  decision_drivers: z.array(z.string()).describe("Key factors influencing user decisions and actions")
});

/**
 * Behavioral indicators - observable user behaviors across all types
 */
const UniversalBehavioralIndicatorsSchema = z.object({
  interaction_preferences: z.array(z.string()).describe("Preferred interaction methods and channels"),
  activity_patterns: z.array(z.string()).describe("Common activity patterns and usage behaviors"),
  conversion_factors: z.array(z.string()).describe("Factors that lead to deeper engagement or conversion"),
  loyalty_indicators: z.array(z.string()).describe("Indicators of user loyalty and long-term engagement")
});

/**
 * Simplified ICP Synthesis schema with unified profiling
 */
const UniversalICPSynthesisSchema = z.object({
  user_archetypes: z.array(z.object({
    archetype_name: z.string().describe("Name/label for this user archetype"),
    size_estimate: z.enum(['small', 'medium', 'large']).describe("Relative size of this user segment"),
    priority_level: z.enum(['primary', 'secondary', 'tertiary']).describe("Strategic importance for targeting")
  })).describe("Different user archetypes (names and basic info only)"),
  
  unified_demographics: UniversalDemographicProfileSchema.describe("Single demographic profile that applies across all archetypes"),
  unified_psychographics: UniversalPsychographicSchema.describe("Single psychographic profile that applies across all archetypes"),
  unified_behavioral_patterns: UniversalBehavioralIndicatorsSchema.describe("Single behavioral profile that applies across all archetypes"),
  unified_messaging_approach: z.object({
    preferred_tone: z.string().describe("Overall recommended communication tone"),
    key_messages: z.array(z.string()).describe("Core messages that resonate across all archetypes"),
    content_strategy: z.array(z.string()).describe("Content types, formats, and strategic recommendations"),
    channel_strategy: z.array(z.string()).describe("Channel preferences and optimization recommendations")
  }).describe("Comprehensive messaging strategy that works across all archetypes")
});

type ICPAnalysisType = z.infer<ReturnType<typeof createClassificationSpecificSchema>>;

/**
 * DYNAMIC SCHEMA BUILDER - Combines universal base schemas with category-specific extensions
 * Architecture: Base + Extensions = Complete Schema for each organization type
 */
function getClassificationSpecificSchemas(classification?: {
  org_type?: string
  org_subtype?: string
  web3_focus?: string
}) {
  const orgType = classification?.org_type || 'protocol'
  const orgSubtype = classification?.org_subtype || 'general'
  const web3Focus = classification?.web3_focus || 'native'
  
  console.log(`📋 Building schema for: orgType="${orgType}", orgSubtype="${orgSubtype}"`);
  
  // Start with universal base schemas (clone them to avoid mutations)
  let identificationSchema = UniversalBaseIdentificationSchema
  let marketPositionSchema = UniversalBaseMarketPositionSchema
  let coreMetricsSchema = UniversalBaseCoreMetricsSchema
  
  // Initialize with basic tokenomics schema - use flexible typing to allow different schema shapes
  let tokenomicsSchema: z.ZodType<any> = z.object({
    description: z.string().describe("General description of economics and value model")
  })

  // Apply category-specific extensions based on classification
  if (orgType === 'protocol') {
    // First apply common protocol extensions (includes technical_links, audit_info, and tge_status)
    identificationSchema = identificationSchema.extend(ProtocolBaseExtensions.identification.shape)
    coreMetricsSchema = coreMetricsSchema.extend(ProtocolBaseExtensions.coreMetrics.shape)
    
    // Then apply subtype-specific extensions
    if (orgSubtype === 'defi') {
      identificationSchema = identificationSchema.extend(DeFiProtocolExtensions.identification.shape)
      marketPositionSchema = marketPositionSchema.extend(DeFiProtocolExtensions.marketPosition.shape)
      tokenomicsSchema = DeFiProtocolExtensions.tokenomics
    } else if (orgSubtype === 'gaming') {
      identificationSchema = identificationSchema.extend(GameFiProtocolExtensions.identification.shape)
      coreMetricsSchema = coreMetricsSchema.extend(GameFiProtocolExtensions.coreMetrics.shape)
      tokenomicsSchema = GameFiProtocolExtensions.tokenomics
    } else if (orgSubtype === 'social') {
      identificationSchema = identificationSchema.extend(SocialProtocolExtensions.identification.shape)
      marketPositionSchema = marketPositionSchema.extend(SocialProtocolExtensions.marketPosition.shape)
      tokenomicsSchema = SocialProtocolExtensions.tokenomics
    } else {
      // For general protocols, use the GeneralProtocolExtensions
      identificationSchema = identificationSchema.extend(GeneralProtocolExtensions.identification.shape)
      marketPositionSchema = marketPositionSchema.extend(GeneralProtocolExtensions.marketPosition.shape)
      coreMetricsSchema = coreMetricsSchema.extend(GeneralProtocolExtensions.coreMetrics.shape)
      tokenomicsSchema = ProtocolBaseExtensions.tokenomics
    }
  } else if (orgType === 'investment') {
    identificationSchema = identificationSchema.extend(InvestmentFundExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(InvestmentFundExtensions.marketPosition.shape)
    tokenomicsSchema = InvestmentFundExtensions.tokenomics
  } else if (orgType === 'infrastructure') {
    identificationSchema = identificationSchema.extend(InfrastructureExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(InfrastructureExtensions.marketPosition.shape)
    coreMetricsSchema = coreMetricsSchema.extend(InfrastructureExtensions.coreMetrics.shape)
    tokenomicsSchema = InfrastructureExtensions.tokenomics
  } else if (orgType === 'exchange') {
    identificationSchema = identificationSchema.extend(ExchangeExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(ExchangeExtensions.marketPosition.shape)
    coreMetricsSchema = coreMetricsSchema.extend(ExchangeExtensions.coreMetrics.shape)
    tokenomicsSchema = ExchangeExtensions.tokenomics
  } else if (orgType === 'service') {
    identificationSchema = identificationSchema.extend(ServiceExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(ServiceExtensions.marketPosition.shape)
    // Service providers use base schemas only (no specific coreMetrics or tokenomics extensions)
    tokenomicsSchema = z.object({
      description: z.string().describe("General description of economics and value model")
    })
  } else if (orgType === 'community') {
    identificationSchema = identificationSchema.extend(CommunityDAOExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(CommunityDAOExtensions.marketPosition.shape)
    coreMetricsSchema = coreMetricsSchema.extend(CommunityDAOExtensions.coreMetrics.shape)
    tokenomicsSchema = CommunityDAOExtensions.tokenomics
  }

  return {
    BasicIdentificationSchema: identificationSchema,
    MarketPositionSchema: marketPositionSchema,
    CoreMetricsSchema: coreMetricsSchema,
    TokenomicsSchema: tokenomicsSchema
  }
}

/**
 * Generate dynamic ICP Analysis schema based on classification using modular architecture
 * Combines universal base schemas with category-specific extensions
 */
function createClassificationSpecificSchema(classification?: {
  org_type?: string
  org_subtype?: string
  web3_focus?: string
}) {
  const schemas = getClassificationSpecificSchemas(classification)
  
  // Combine with universal ecosystem and user behavior schemas
  const finalSchema = z.object({
    twitter_username: z.string().describe("Twitter username of the analyzed organization"),
    timestamp_utc: z.string().describe("UTC timestamp of when the analysis was performed"),
    classification_used: z.object({
      org_type: z.string().describe("Organization type used for analysis"),
      org_subtype: z.string().describe("Organization subtype used for analysis"),
      web3_focus: z.string().describe("Web3 focus classification")
    }).describe("Classification parameters used for this analysis"),
    
    // Core identification and metrics using dynamic schemas
    basic_identification: schemas.BasicIdentificationSchema.describe("Basic project identification and links"),
    market_position: schemas.MarketPositionSchema.describe("Market positioning and metrics"),
    core_metrics: schemas.CoreMetricsSchema.describe("Core capabilities and operational metrics"),
    
    // Universal ecosystem analysis
    ecosystem_analysis: UniversalEcosystemAnalysisSchema.describe("Ecosystem positioning and relationships"),
    
    // Category-specific economics/tokenomics
    economics_tokenomics: z.object({
      tokenomics: schemas.TokenomicsSchema.nullable().describe("Economics and tokenomics information"),
      organizational_structure: UniversalFundingStructureSchema.describe("Funding structure and investors")
    }).describe("Economic model and organizational structure"),
    
    // Universal user behavior and ICP insights
    user_behavior_insights: UniversalUserBehaviorInsightsSchema.describe("User behavior patterns and engagement"),
    icp_synthesis: UniversalICPSynthesisSchema.describe("Comprehensive ideal customer profile synthesis"),
    
    // Analysis metadata
    analysis_metadata: z.object({
      confidence_score: z.number().min(0).max(1).describe("Confidence score for the analysis (0-1)"),
      research_sources: z.array(z.string()).describe("Primary sources used for the analysis")
    }).describe("Analysis quality and source metadata")
  });
  
  return finalSchema;
}

// Legacy schema export for backward compatibility - moved after function definition
export const ICPAnalysisSchema = createClassificationSpecificSchema();

/**
 * Generate classification-specific context for ICP analysis
 */
function getClassificationSpecificContext(classification?: {
  org_type?: string
  org_subtype?: string
  web3_focus?: string
}) {
  const orgType = classification?.org_type || 'protocol'
  const orgSubtype = classification?.org_subtype || 'general'
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
    org_subtype?: string
    web3_focus?: string
  }
): Promise<z.infer<ReturnType<typeof createClassificationSpecificSchema>>> {
  try {
    
    // Generate dynamic schema based on classification
    const dynamicSchema = createClassificationSpecificSchema(classification)
    
    // Get classification-specific context (single call for all context)
    const context = getClassificationSpecificContext(classification)
    
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

SEARCH EXECUTION PLAN:
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

    return analysis;
  } catch (error) {
    throw error;
  }
}

/**
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
