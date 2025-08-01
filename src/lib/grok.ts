import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { getCachedTwitterUser } from './twitter-cache';

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
 * Create a chat completion with Grok
 * @param messages - Array of chat messages
 * @param config - Configuration object (defaults to FULL)
 * @param options - Additional options for the request
 * @returns Promise<OpenAI.Chat.Completions.ChatCompletion>
 */
export async function createGrokChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  config: typeof GROK_CONFIGS.MINI_FAST | typeof GROK_CONFIGS.MINI | typeof GROK_CONFIGS.FULL = GROK_CONFIGS.FULL,
  options?: {
    functions?: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[];
    function_call?: 'auto' | 'none' | { name: string };
    enableLiveSearch?: boolean;
  }
) {
  try {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      ...config,
      messages,
      ...options,
    };

    // Enable live search if requested
    if (options?.enableLiveSearch) {
      // Live search is enabled by default in Grok models when accessing real-time information
    }

    const completion = await grokClient.chat.completions.create(params);
    return completion;
  } catch (error) {
    throw error;
  }
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
  project_name: z.string().describe("The official name of the project/organization"),
  website_url: z.string().nullable().describe("Official website URL"),
  industry_classification: z.string().describe("Primary industry sector classification"),
  tge_status: z.enum(['pre-tge', 'post-tge']).nullable().describe("Token Generation Event (TGE) status: Pre-TGE or Post-TGE"),
  technical_links: z.object({
    github_url: z.string().nullable().describe("GitHub repository URL"),
    whitepaper_url: z.string().nullable().describe("Whitepaper or documentation URL")
  }).describe("Technical development links"),
  community_links: z.object({
    discord: z.string().nullable().describe("Discord server URL"),
    farcaster: z.string().nullable().describe("Farcaster profile URL"),
    telegram: z.string().nullable().describe("Telegram group URL"),
    governance_forum: z.string().nullable().describe("Governance or DAO forum URL"),
  }).describe("Community platform links")
});

/**
 * Universal base schema for market positioning metrics
 * Core metrics applicable to all organization types
 */
const UniversalBaseMarketPositionSchema = z.object({
  sentiment_score: z.number().min(0).max(1).nullable().describe("Overall market sentiment score (0-1)"),
  market_presence: z.string().describe("Overall market presence and visibility assessment"),
  competitors: z.array(z.string()).describe("List of primary competitors in the space. Only @usernames, no names or context")
});

/**
 * Universal base schema for core operational metrics
 * Fundamental capabilities and features across all types
 */
const UniversalBaseCoreMetricsSchema = z.object({
  key_features: z.array(z.string()).describe("List of key features and capabilities"),
  primary_value_proposition: z.string().describe("Core value proposition and unique selling points"),
  target_audience: z.string().describe("Primary target audience base"),
  geographic_focus: z.array(z.enum(['North America', 'Europe', 'Asia', 'LaTam', 'China', 'Global'])).describe("Geographic focus and presence"),
  operational_status: z.enum(['under_development', 'testnet', 'mainnet', 'active', 'other']).describe("Current operational status"),
});

/**
 * Universal base schema for ecosystem analysis
 * Relationship and positioning data applicable to all types
 */
const UniversalEcosystemAnalysisSchema = z.object({
  market_narratives: z.array(z.string()).describe("Current market narratives and themes associated"),
  notable_partnerships: z.array(z.string()).describe("All partnerships and collaborations. Only @usernames, no names or context"),
  recent_developments: z.array(z.string()).describe("Recent major developments")
});

/**
 * Universal base schema for organizational structure
 * Governance and operational structure basics
 */
const UniversalOrganizationalStructureSchema = z.object({
  governance_model: z.string().describe("Governance structure"),
  funding_status: z.enum(['bootstrapped', 'seed', 'series_a', 'series_b', 'series_c', 'self-sustaining', 'ICO', 'Public']).describe("Funding status"),
  funding_amount: z.number().nullable().describe("Funding amount in USD"),
  funded_by: z.array(z.string()).nullable().optional().describe("Investors, only @usernames, no names or context")
});

// ================================================================================================
// CATEGORY-SPECIFIC EXTENSION SCHEMAS
// ================================================================================================

/**
 * DeFi Protocol Extensions - Additional fields specific to DeFi protocols
 */
const DeFiProtocolExtensions = {
  identification: z.object({
    protocol_category: z.string().describe("DeFi protocol category (DEX, Lending, Yield, Derivatives, etc.)"),
    chains_supported: z.number().nullable().describe("Number of blockchain networks supported"),
    supported_chains: z.array(z.string()).describe("Username of Blockchain networks supported. Only give @username."),
    protocol_type: z.string().describe("Technical protocol type (AMM, Order Book, Lending Pool, etc.)")
  }),
  
  marketPosition: z.object({
    total_value_locked_usd: z.number().nullable().describe("Current Total Value Locked in USD"),
    active_addresses_30d: z.number().nullable().describe("Active addresses in the last 30 days"),
  }),
  
  coreMetrics: z.object({
    audit_info: z.object({
      auditor: z.string().nullable().describe("Security audit firm name"),
      date: z.string().nullable().describe("Date of latest audit"),
      report_url: z.string().nullable().describe("Audit report URL")
    }).describe("Security audit information"),
  }),
  
  tokenomics: z.object({
    native_token: z.string().nullable().describe("Native governance/utility token symbol"),
    token_utility: z.object({
        governance: z.boolean().describe("Governance token utility"),
        staking: z.boolean().describe("Staking token utility"),
        fee_discount: z.boolean().describe("Fee discount token utility"),
        collateral: z.boolean().describe("Collateral token utility")
      }),
    tokenomics_model: z.string().describe("Tokenomics model, distribution and value accrual mechanisms")
  }).describe("Token utility functions"),
};

/**
 * GameFi Protocol Extensions - Gaming and NFT-focused protocols
 */
const GameFiProtocolExtensions = {
  identification: z.object({
    game_category: z.string().describe("Gaming category (MMORPG, Strategy, Casual, etc.)"),
    platform_type: z.string().describe("Platform type (Mobile, Web, Desktop, VR)"),
    nft_integration: z.string().describe("NFT integration and asset ownership model")
  }),
  
  marketPosition: z.object({
    daily_active_players: z.number().nullable().describe("Daily active players"),
    game_economy_health: z.string().describe("Overall game economy health assessment")
  }),
  
  coreMetrics: z.object({
    gameplay_features: z.array(z.string()).describe("Core gameplay features"),
    play_to_earn_mechanics: z.string().describe("Play-to-earn model and reward structures"),
    asset_ownership: z.string().describe("Player asset ownership and trading capabilities"),
  }),
  
  tokenomics: z.object({
    game_tokens: z.array(z.string()).describe("In-game tokens and their utilities"),
    nft_assets: z.array(z.string()).describe("Types of NFT assets and their functions"),
    economic_model: z.string().describe("Game economic model and sustainability mechanisms"),
    reward_distribution: z.string().describe("Player reward distribution and earning potential")
  })
};

/**
 * Investment Fund Extensions - VC funds, accelerators, and investment entities
 */
const InvestmentFundExtensions = {
  identification: z.object({
    fund_type: z.enum(['VC', 'Accelerator', 'Family Office', 'Corporate VC']).describe("Type of investment fund"),
    investment_stage: z.enum(['Agnostic', 'Pre-seed', 'Seed', 'Series A']).describe("Primary investment stage focus"),
    sector_focus: z.array(z.string()).describe("Primary sector and technology focus areas or Agnostic")
  }),
  
  marketPosition: z.object({
    fund_size_usd: z.number().nullable().describe("Total fund size in USD (if public)"),
    portfolio_size: z.number().nullable().describe("Number of portfolio companies"),
    investments: z.array(z.string()).describe("All portfolio investments. Only @usernames, no names or context"),
    market_reputation: z.enum(['Tier S', 'Tier A', 'Tier B', 'Tier C']).nullable().describe("Market reputation in investments")
  }),
  
  tokenomics: z.object({
    fund_token: z.string().nullable().describe("Fund token or investment vehicle (if applicable)"),
    investment_model: z.array(z.enum(['Equity', 'Debt', 'Tokens'])).describe("Investment deployment strategy"),
  })
};

/**
 * Business Service Extensions - Agencies, consultancies, and service providers
 */
const BusinessServiceExtensions = {
  identification: z.object({
    service_category: z.array(z.enum(['Development', 'Marketing', 'Legal', 'PR', 'Audits', 'Community Management', 'Tokenomics', 'Design', 'Governance Advisory', 'Content', 'Partnerships', 'Education & Training', 'Localization', 'Event Management'])).describe("Primary service category"),
    target_clients: z.array(z.string()).describe("Target client segments and industries")
  }),
  
  marketPosition: z.object({
    client_portfolio: z.array(z.string()).describe("All clients. Only @usernames, no names or context"),
    team_size: z.number().nullable().describe("Team size and capacity"),
    market_positioning: z.string().describe("Market positioning and competitive differentiation"),
    client_retention: z.number().min(0).max(1).nullable().describe("Rating from reviews of posts")
  }),
  
  coreMetrics: z.object({
    service_offerings: z.array(z.string()).describe("Comprehensive service offerings and capabilities"),
    delivery_methodology: z.string().describe("Service delivery methodology and process")
  }),
  
  tokenomics: z.object({
    business_growth: z.string().describe("Business growth strategy and expansion plans")
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
    member_count: z.number().nullable().describe("Total community member count"),
    community_health: z.number().min(0).max(1).nullable().describe("Overall community health and engagement assessment"),
    influence_reach: z.number().min(0).max(1).nullable().describe("Community influence and reach within the ecosystem")
  }),
  
  coreMetrics: z.object({
    community_initiatives: z.array(z.string()).describe("Key community initiatives and programs"),
    member_benefits: z.array(z.string()).describe("Benefits and value provided to members"),
    participation_mechanisms: z.array(z.string()).describe("Ways members can participate and contribute"),
    impact_metrics: z.string().describe("Community impact and achievement metrics")
  }),
  
  tokenomics: z.object({
    governance_token: z.string().nullable().describe("Governance token and voting mechanism"),
    incentive_structure: z.string().describe("Member incentive and reward structure"),
    treasury_management: z.string().describe("Treasury management and fund allocation")
  })
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
  age_demographics: z.string().describe("Age ranges or generational cohorts"),
  experience_level: z.string().describe("Typical Web3/crypto experience level of users"),
  professional_roles: z.array(z.string()).describe("Common professional roles of the users"),
  geographic_distribution: z.string().describe("Geographic distribution of users")
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
    description: z.string().describe("Brief description of this user type"),
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
  console.log('🔍 Schema generation - received classification:', classification);
  
  const orgType = classification?.org_type || 'protocol'
  const orgSubtype = classification?.org_subtype || 'general'
  const web3Focus = classification?.web3_focus || 'native'
  
  console.log(`📋 Building MODULAR schema for: orgType="${orgType}", orgSubtype="${orgSubtype}", web3Focus="${web3Focus}"`);
  
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
    console.log(`🔧 Applying protocol extensions for subtype: ${orgSubtype}`);
    
    if (orgSubtype === 'defi') {
      console.log('💰 Using DeFi Protocol Extensions');
      identificationSchema = identificationSchema.extend(DeFiProtocolExtensions.identification.shape)
      marketPositionSchema = marketPositionSchema.extend(DeFiProtocolExtensions.marketPosition.shape)
      coreMetricsSchema = coreMetricsSchema.extend(DeFiProtocolExtensions.coreMetrics.shape)
      tokenomicsSchema = DeFiProtocolExtensions.tokenomics
    } else if (orgSubtype === 'gaming') {
      console.log('🎮 Using GameFi Protocol Extensions');
      identificationSchema = identificationSchema.extend(GameFiProtocolExtensions.identification.shape)
      marketPositionSchema = marketPositionSchema.extend(GameFiProtocolExtensions.marketPosition.shape)
      coreMetricsSchema = coreMetricsSchema.extend(GameFiProtocolExtensions.coreMetrics.shape)
      tokenomicsSchema = GameFiProtocolExtensions.tokenomics
    } else {
      console.log('⚡ Using General Protocol configuration (infrastructure/social/other)');
      // For general protocols, use minimal extensions
      identificationSchema = identificationSchema.extend({
        protocol_category: z.string().describe("Protocol category (Infrastructure, Social, Data, etc.)"),
        technical_focus: z.string().describe("Primary technical focus and innovation area")
      })
      marketPositionSchema = marketPositionSchema.extend({
        user_count_estimate: z.number().nullable().describe("Estimated active users"),
        integration_count: z.number().nullable().describe("Number of integrations or partnerships")
      })
      coreMetricsSchema = coreMetricsSchema.extend({
        technical_metrics: z.object({
          development_activity: z.string().describe("Development activity and momentum"),
          network_effects: z.string().describe("Network effects and adoption metrics")
        }).describe("Technical and adoption metrics")
      })
      tokenomicsSchema = z.object({
        description: z.string().describe("General description of economics and value model"),
        native_token: z.string().nullable().describe("Native token symbol"),
        token_utility: z.array(z.string()).describe("Token utility functions")
      })
    }
  } else if (orgType === 'investment') {
    console.log('💼 Using Investment Fund Extensions');
    identificationSchema = identificationSchema.extend(InvestmentFundExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(InvestmentFundExtensions.marketPosition.shape)
    // Investment funds don't have coreMetrics extensions in the defined schemas
    // Keep the base coreMetricsSchema as-is
    tokenomicsSchema = InvestmentFundExtensions.tokenomics
  } else if (orgType === 'business') {
    console.log('🏢 Using Business Service Extensions');
    identificationSchema = identificationSchema.extend(BusinessServiceExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(BusinessServiceExtensions.marketPosition.shape)
    coreMetricsSchema = coreMetricsSchema.extend(BusinessServiceExtensions.coreMetrics.shape)
    tokenomicsSchema = BusinessServiceExtensions.tokenomics
  } else if (orgType === 'community') {
    console.log('🏛️ Using Community/DAO Extensions');
    identificationSchema = identificationSchema.extend(CommunityDAOExtensions.identification.shape)
    marketPositionSchema = marketPositionSchema.extend(CommunityDAOExtensions.marketPosition.shape)
    coreMetricsSchema = coreMetricsSchema.extend(CommunityDAOExtensions.coreMetrics.shape)
    tokenomicsSchema = CommunityDAOExtensions.tokenomics
  }

  console.log(`✅ Schema composition complete - ${Object.keys(identificationSchema.shape).length} identification fields, ${Object.keys(marketPositionSchema.shape).length} market position fields`);

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
  console.log('🔍 createClassificationSpecificSchema called with:', classification);
  
  const schemas = getClassificationSpecificSchemas(classification)
  console.log('📋 Generated modular schemas for org_type:', classification?.org_type || 'undefined');
  
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
      organizational_structure: UniversalOrganizationalStructureSchema.describe("Organizational structure and governance")
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
  
  console.log('✅ Final modular schema created successfully with', Object.keys(finalSchema.shape).length, 'top-level sections');
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

  // Business service context (includes professional services)
  if (orgType === 'business') {
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
    console.log('🔍 ICP Analysis - received classification:', classification);
    
    const cachedUserData = await getCachedTwitterUser(twitterUsername.replace('@', ''));
    const followerCount = cachedUserData?.user_data?.followers_count;
    
    // Generate dynamic schema based on classification
    const dynamicSchema = createClassificationSpecificSchema(classification)
    console.log('🔍 Dynamic schema generated, checking response_format compatibility...');
    
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

    console.log('🚀 About to call Grok API with:');
    console.log('   - Dynamic schema keys:', Object.keys(dynamicSchema.shape));  
    console.log('   - Classification used:', classification);
    console.log('   - Context from single call:', Object.keys(context));
    
    // Log the complete Grok prompt for debugging
    console.log('\n📝 GROK PROMPT DETAILS:');
    console.log('   - System prompt length:', (messages[0].content as string)?.length || 0, 'characters');
    console.log('   - User prompt length:', (messages[1].content as string)?.length || 0, 'characters');
    console.log('\n🔍 SYSTEM PROMPT:');
    console.log(messages[0].content);
    console.log('\n👤 USER PROMPT:');
    console.log(messages[1].content);
    console.log('\n📋 SCHEMA STRUCTURE:');
    console.log('   Schema type:', typeof dynamicSchema);
    console.log('   Schema fields:', Object.keys(dynamicSchema.shape));
    console.log('   Response format name: "icp_analysis"');
    console.log('\n🔧 API CONFIGURATION:');
    console.log('   Grok config:', JSON.stringify(grokConfig, null, 2));
    console.log('   Search parameters enabled: true');
    console.log('   Live search mode: on');
    console.log('   Max search results: 30');
    console.log('   Target Twitter handle:', twitterUsername.replace('@', ''));
    console.log('\n🚀 Sending request to Grok API...\n');

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

    console.log('✅ Grok API response received!');
    console.log('📊 RESPONSE DETAILS:');
    console.log('   - Response choices:', completion.choices?.length || 0);
    console.log('   - Finish reason:', completion.choices[0]?.finish_reason);
    console.log('   - Usage tokens:', completion.usage);
    
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      console.log('❌ No content returned from Grok API');
      throw new Error('No content returned from Grok API');
    }
    
    console.log('📝 RAW GROK RESPONSE:');
    console.log('   - Content length:', content.length, 'characters');
    console.log('   - First 500 chars:', content.substring(0, 500));
    console.log('   - Last 500 chars:', content.substring(Math.max(0, content.length - 500)));

    // Parse the structured response
    let parsedContent;
    try {
      parsedContent = JSON.parse(content);
      console.log('✅ JSON parsing successful');
      console.log('📋 PARSED RESPONSE STRUCTURE:');
      console.log('   - Top-level keys:', Object.keys(parsedContent));
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError);
      console.log('🔍 Raw content that failed to parse:');
      console.log(content);
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }

    let analysis;
    try {
      analysis = dynamicSchema.parse(parsedContent);
      console.log('✅ Schema validation successful');
      console.log('🎯 FINAL ANALYSIS STRUCTURE:');
      if (analysis && typeof analysis === 'object') {
        console.log('   - Analysis keys:', Object.keys(analysis));
        // Log some key fields if they exist
        if ('basic_identification' in analysis) {
          console.log('   - Project name:', (analysis as any).basic_identification?.project_name);
        }
        if ('market_position' in analysis) {
          console.log('   - Twitter followers:', (analysis as any).market_position?.twitter_followers);
        }
      }
    } catch (schemaError) {
      console.log('❌ Schema validation failed:', schemaError);
      console.log('🔍 Content that failed schema validation:');
      console.log(JSON.stringify(parsedContent, null, 2));
      throw new Error(`Schema validation failed: ${schemaError}`);
    }

    // Skip adding twitter followers to avoid type errors
    // The follower count will be handled separately if needed

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
 * Zod schema for profile analysis results
 */
const ProfileAnalysisSchema = z.object({
  profiles: z.array(z.object({
    screen_name: z.string().describe("Twitter username"),
    type: z.enum(["individual", "organization"]).describe("Whether this is an individual person or an organization"),
    current_position: z.object({
      organizations: z.array(z.string()).describe("Current organizations or companies they work for"),
      department: z.enum(["engineering", "product", "marketing", "business", "community", "leadership", "other"]).describe("Department classification based on role")
    }).optional().describe("Current professional position"),
    employment_history: z.array(z.object({
      organization: z.string().describe("Previous organization or company")
    })).describe("Previous employment history")
  })).describe("Analysis results for each profile")
});

type ProfileAnalysisType = z.infer<typeof ProfileAnalysisSchema>;

/**
 * Analyze a batch of profiles to determine if they are individuals or organizations
 * and extract role/organization information for individuals
 * @param profiles - Array of profile objects with screen_name, name, and description
 * @returns Promise<ProfileAnalysisType>
 */
export async function analyzeProfileBatch(profiles: Array<{
  screen_name: string;
  name: string;
  description?: string;
}>): Promise<ProfileAnalysisType> {
  try {
    const prompt = `Analyze Twitter profiles. For each: determine if individual or organization. For individuals, extract current organizations/dept and employment history. Do NOT include any education details or role information.

For organizations, provide Twitter handles (e.g., @company) not company names.

Departments: engineering, product, marketing, business, community, leadership, other

Profiles:
${profiles.map(p => `@${p.screen_name}: ${p.name} - ${p.description || 'No bio'}`).join('\n')}

JSON response:
{
  "profiles": [
    {
      "screen_name": "username",
      "type": "individual|organization",
      "current_position": {
        "organizations": ["@company1", "@company2"], 
        "department": "engineering"
      },
      "employment_history": [
        {
          "organization": "@previous_co"
        }
      ]
    }
  ]
}`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: prompt
      }
    ];

    const response = await grokClient.chat.completions.create({
      ...GROK_CONFIGS.MINI_FAST,
      messages,
      max_tokens: 3000 // Increase token limit for batch analysis
    });

    const content = response.choices[0]?.message?.content;
    const finishReason = response.choices[0]?.finish_reason;

    if (!content) {
      throw new Error('No content received from Grok');
    }
    
    let analysis: ProfileAnalysisType;

    try {
      // Try to parse the full content first
      analysis = JSON.parse(content) as ProfileAnalysisType;
    } catch (parseError) {
      // If parsing fails, try to extract a valid JSON object
      const jsonStart = content.indexOf('{');
      if (jsonStart === -1) {
        throw new Error(`No valid JSON found in Grok response`);
      }
      
      let jsonContent = content.substring(jsonStart);
      
      // If the response was truncated, try to find the last complete profile entry
      if (finishReason === 'length') {
        // Find the profiles array and try to close it properly
        const profilesStart = jsonContent.indexOf('"profiles":[');
        if (profilesStart !== -1) {
          const arrayStart = jsonContent.indexOf('[', profilesStart);
          if (arrayStart !== -1) {
            // Find all complete profile objects
            const afterArray = jsonContent.substring(arrayStart + 1);
            const completeProfiles = [];
            let braceCount = 0;
            let currentProfile = '';
            let inProfile = false;
            
            for (let i = 0; i < afterArray.length; i++) {
              const char = afterArray[i];
              if (char === '{') {
                if (!inProfile) {
                  inProfile = true;
                  currentProfile = '{';
                } else {
                  currentProfile += char;
                }
                braceCount++;
              } else if (char === '}') {
                currentProfile += char;
                braceCount--;
                if (braceCount === 0 && inProfile) {
                  // Complete profile found
                  try {
                    const profileObj = JSON.parse(currentProfile);
                    completeProfiles.push(profileObj);
                    currentProfile = '';
                    inProfile = false;
                  } catch {
                    // Invalid profile, skip
                    currentProfile = '';
                    inProfile = false;
                  }
                }
              } else if (inProfile) {
                currentProfile += char;
              }
            }
            
            if (completeProfiles.length > 0) {
              analysis = { profiles: completeProfiles };
            } else {
              throw new Error('Could not recover any complete profiles from truncated response');
            }
          } else {
            throw new Error('Could not find profiles array in response');
          }
        } else {
          throw new Error('Could not find profiles field in response');
        }
      } else {
        throw new Error(`Failed to parse Grok response: ${parseError}`);
      }
    }

    // Validate the response structure
    if (!analysis.profiles || !Array.isArray(analysis.profiles)) {
      throw new Error('Invalid response structure from Grok');
    }

    // Validate and clean up each profile
    const validProfiles = analysis.profiles.map(profile => {
      // Ensure required fields exist
      if (!profile.screen_name || !profile.type) {
        return null;
      }

      // Fill in defaults for missing fields
      const cleanProfile = {
        screen_name: profile.screen_name,
        type: profile.type as 'individual' | 'organization',
        current_position: profile.current_position || {
          organizations: ['Unknown'],
          department: 'other' as const
        },
        employment_history: profile.employment_history || []
      };

      // Ensure current_position has all required fields
      if (cleanProfile.current_position) {
        cleanProfile.current_position = {
          organizations: cleanProfile.current_position.organizations || ['Unknown'],
          department: cleanProfile.current_position.department || 'other' as const
        };
      }

      return cleanProfile;
    }).filter((profile): profile is NonNullable<typeof profile> => profile !== null);

    analysis.profiles = validProfiles;

    return analysis;

  } catch (error: any) {
    // Return fallback analysis - treat all as individuals with minimal data
    const fallbackAnalysis: ProfileAnalysisType = {
      profiles: profiles.map(profile => ({
        screen_name: profile.screen_name,
        type: 'individual' as const,
        current_position: {
          organizations: ['Unknown'],
          department: 'other' as const
        },
        employment_history: []
      }))
    };
    
    return fallbackAnalysis;
  }
}
