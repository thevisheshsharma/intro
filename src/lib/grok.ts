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
 * Comprehensive Zod schema for ICP (Ideal Customer Profile) analysis
 */
const BasicIdentificationSchema = z.object({
  project_name: z.string().describe("The official name of the project/organization"),
  website_url: z.string().nullable().describe("Official website URL"),
  industry_classification: z.string().describe("Primary industry or sector classification"),
  protocol_category: z.string().nullable().describe("Specific protocol category (e.g., DeFi, Gaming, Infrastructure)"),
  technical_links: z.object({
    github_url: z.string().nullable().describe("GitHub repository URL"),
    npmjs_url: z.string().nullable().describe("NPM package URL"),
    whitepaper_url: z.string().nullable().describe("Whitepaper or documentation URL")
  }).describe("Technical development links"),
  community_links: z.object({
    discord: z.string().nullable().describe("Discord server URL"),
    telegram: z.string().nullable().describe("Telegram group URL"),
    farcaster: z.string().nullable().describe("Farcaster profile URL"),
    governance_forum: z.string().nullable().describe("Governance forum URL")
  }).describe("Community platform links")
});

const MarketPositionSchema = z.object({
  total_value_locked_usd: z.number().nullable().describe("Total Value Locked in USD for DeFi protocols"),
  twitter_followers: z.number().nullable().describe("Number of Twitter followers"),
  discord_members_est: z.number().nullable().describe("Estimated Discord member count"),
  active_addresses_30d: z.number().nullable().describe("Active addresses in the last 30 days"),
  chains_supported: z.number().nullable().describe("Number of blockchain networks supported"),
  sentiment_score: z.number().min(0).max(1).nullable().describe("Overall sentiment score (0-1)")
});

const CoreMetricsSchema = z.object({
  key_features: z.array(z.string()).describe("List of key features or capabilities"),
  market_position: MarketPositionSchema.describe("Quantitative market metrics"),
  audit_info: z.object({
    auditor: z.string().nullable().describe("Security audit firm name"),
    date: z.string().nullable().describe("Date of latest audit"),
    report_url: z.string().nullable().describe("Audit report URL")
  }).describe("Security audit information"),
  operational_chains: z.array(z.string()).describe("List of blockchain networks where the protocol operates")
});

const EcosystemAnalysisSchema = z.object({
  market_narratives: z.array(z.string()).describe("Current market narratives or themes associated with the project"),
  notable_partnerships: z.array(z.string()).describe("List of key partnerships or integrations"),
  recent_developments: z.array(z.string()).describe("Recent major developments or milestones")
});

const TokenomicsSchema = z.object({
  native_token: z.string().nullable().describe("Native token symbol"),
  utility: z.object({
    governance: z.boolean().describe("Whether token is used for governance"),
    staking: z.boolean().describe("Whether token can be staked"),
    fee_discount: z.boolean().describe("Whether token provides fee discounts"),
    collateral: z.boolean().describe("Whether token can be used as collateral")
  }).describe("Token utility functions"),
  description: z.string().describe("Description of token economics and utility")
});

const OrganizationalStructureSchema = z.object({
  governance: z.string().describe("Description of governance structure"),
  team_structure: z.string().describe("Information about team size and structure"),
  funding_info: z.string().nullable().describe("Funding history and investment information")
});

const GovernanceTokenomicsSchema = z.object({
  tokenomics: TokenomicsSchema.nullable().describe("Token economics information"),
  organizational_structure: OrganizationalStructureSchema.describe("Organizational and governance structure")
});

const UserBehaviorInsightsSchema = z.object({
  onchain_activity_patterns: z.array(z.string()).describe("Common on-chain activity patterns of users"),
  engagement_characteristics: z.object({
    participation_style: z.string().describe("How users typically participate with the protocol"),
    engagement_level: z.string().describe("Level of user engagement (high/medium/low)"),
    decision_making_style: z.string().describe("How users make decisions about protocol interaction")
  }).describe("User engagement characteristics")
});

const DemographicProfileSchema = z.object({
  vibe_range: z.string().describe("Age ranges or generational cohorts that engage with the project"),
  experience_level: z.string().describe("Typical Web3/crypto experience level of users"),
  roles: z.array(z.string()).describe("Common roles or archetypes of users"),
  geographic_distribution: z.string().describe("Geographic distribution of the user base")
});

const PsychographicDriversSchema = z.object({
  core_values: z.array(z.string()).describe("Core values that resonate with the target audience"),
  primary_motivations: z.array(z.string()).describe("Primary motivations for using the protocol"),
  key_challenges: z.array(z.string()).describe("Key challenges or pain points users face"),
  trending_interests: z.array(z.string()).describe("Current trending topics or interests among users")
});

const BehavioralIndicatorsSchema = z.object({
  purchase_motives: z.array(z.string()).describe("Primary reasons users purchase or acquire tokens")
});

const ICPSynthesisSchema = z.object({
  target_web3_segment: z.string().describe("Primary Web3 market segment being targeted"),
  primary_user_archetypes: z.array(z.string()).describe("Main user archetypes or personas"),
  demographic_profile: DemographicProfileSchema.describe("Demographic characteristics of ideal customers"),
  psychographic_drivers: PsychographicDriversSchema.describe("Psychological and behavioral drivers"),
  behavioral_indicators: BehavioralIndicatorsSchema.describe("Observable behavioral patterns")
});

const MessagingStrategySchema = z.object({
  communication_style: z.string().describe("Recommended communication style and tone"),
  key_messaging_angles: z.array(z.string()).describe("Key messaging angles to emphasize"),
  content_keywords: z.array(z.string()).describe("Important keywords for content and marketing")
});

export const ICPAnalysisSchema = z.object({
  twitter_username: z.string().describe("Twitter username of the analyzed organization"),
  timestamp_utc: z.string().describe("UTC timestamp of when the analysis was performed"),
  basic_identification: BasicIdentificationSchema.describe("Basic project identification and links"),
  core_metrics: CoreMetricsSchema.describe("Core metrics and capabilities"),
  ecosystem_analysis: EcosystemAnalysisSchema.describe("Ecosystem positioning and relationships"),
  governance_tokenomics: GovernanceTokenomicsSchema.describe("Governance and tokenomics information"),
  user_behavior_insights: UserBehaviorInsightsSchema.describe("Insights into user behavior patterns"),
  icp_synthesis: ICPSynthesisSchema.describe("Synthesized ideal customer profile"),
  messaging_strategy: MessagingStrategySchema.describe("Recommended messaging strategy"),
  confidence_score: z.number().min(0).max(1).describe("Confidence score for the analysis (0-1)"),
  research_sources: z.array(z.string()).describe("List of sources used for the analysis")
});

type ICPAnalysisType = z.infer<typeof ICPAnalysisSchema>;

/**
 * Create a structured ICP analysis using Grok with guaranteed schema compliance
 * @param twitterUsername - The Twitter username to analyze
 * @param config - Configuration object (defaults to FULL)
 * @returns Promise<ICPAnalysisType>
 */
export async function createStructuredICPAnalysis(
  twitterUsername: string,
  config: typeof GROK_CONFIGS.MINI_FAST | typeof GROK_CONFIGS.MINI | typeof GROK_CONFIGS.FULL = GROK_CONFIGS.FULL
): Promise<ICPAnalysisType> {
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are an expert Web3 and crypto analyst specializing in Ideal Customer Profile (ICP) analysis. Your task is to research and analyze organizations to create comprehensive customer profiles.

CRITICAL: Live search is ENABLED. You have access to current web data, X posts, news, and specific Web3 platforms. Use this live data extensively.

LIVE SEARCH STRATEGY:
1. First, search for the organization's official presence (website, X profile, GitHub)
2. Then search Web3 data platforms (DeFiLlama, Dune, Messari, CoinGecko) for metrics
3. Search recent news and developments from 2024-2025
4. Cross-reference information across multiple sources for accuracy

PRIORITIZED DATA SOURCES (automatically searched):
🔍 WEB3 DATA: defillama.com, dune.com, messari.io, coingecko.com, coinmarketcap.com
🔍 DEVELOPMENT: github.com and official documentation sites  
🔍 SOCIAL: X posts from the specific handle and related accounts
🔍 NEWS: Recent articles from credible crypto/tech news sources
🔍 WEB: General web search for additional context

RESEARCH REQUIREMENTS:
- Use live search results as your PRIMARY data source
- Cross-validate information across multiple platforms
- Focus on data from 2024-2025 for recent developments
- Include actual URLs and specific data points found
- If contradictory information is found, note the discrepancies
- Clearly distinguish between verified facts and estimates

ANALYSIS DEPTH:
- Extract quantitative metrics (TVL, user counts, transaction volumes)
- Identify recent partnerships, integrations, and developments  
- Analyze community sentiment and engagement patterns
- Research governance structure and tokenomics details
- Map competitive landscape and positioning

Base your entire analysis on actual live search findings. The search is configured to access current Web3 data, so provide specific, up-to-date insights rather than general analysis.`
      },
      {
        role: 'user',
        content: `LIVE SEARCH ENABLED: Research @${twitterUsername.replace('@', '')} using your live search capabilities and create a comprehensive ICP analysis.

SEARCH EXECUTION PLAN:
1. 🔍 Search "@${twitterUsername.replace('@', '')}" on X to find official profile and recent posts
2. 🔍 Search "${twitterUsername.replace('@', '')} official website" for company information
3. 🔍 Search "${twitterUsername.replace('@', '')} defillama" for DeFi metrics and TVL data
4. 🔍 Search "${twitterUsername.replace('@', '')} github" for technical development activity
5. 🔍 Search "${twitterUsername.replace('@', '')} dune analytics" for on-chain metrics
6. 🔍 Search "${twitterUsername.replace('@', '')} news 2024 2025" for recent developments
7. 🔍 Search "${twitterUsername.replace('@', '')} messari" for detailed protocol analysis
8. 🔍 Search governance and tokenomics information

REQUIRED LIVE DATA EXTRACTION:
✅ Current TVL, user metrics, and transaction volumes
✅ Recent partnerships, integrations, and protocol updates  
✅ Community size across platforms (X, Discord, Telegram)
✅ Development activity and GitHub statistics
✅ News mentions and market sentiment from 2024-2025
✅ Competitive positioning and market narratives
✅ Governance structure and token utility details

OUTPUT REQUIREMENTS:
- Include specific numbers, dates, and URLs from live search
- Reference actual data sources found during search
- Note if information is conflicting across sources
- Distinguish between verified data and estimates
- Focus on 2024-2025 timeframe for recent developments

Execute comprehensive live search across Web3 data platforms, official sources, and recent news to build an accurate, data-driven ICP analysis.`
      }
    ];

    const completion = await grokClient.chat.completions.create({
      ...config,
      messages,
      response_format: zodResponseFormat(ICPAnalysisSchema, "icp_analysis"),
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
            "x_handles": [twitterUsername.replace('@', '')] // Search specific Twitter handle
          },
          {
            "type": "news",
            "excluded_websites": ["reddit.com"] // Exclude low-quality sources
          }
        ]
      }
    } as any);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content returned from Grok API');
    }

    // Parse the structured response
    const analysis = ICPAnalysisSchema.parse(JSON.parse(content));

    return analysis;
  } catch (error) {
    throw error;
  }
}
