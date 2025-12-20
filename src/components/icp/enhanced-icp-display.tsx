'use client'

import React, { useState, useMemo } from 'react'
import { logParsingError } from '@/lib/error-utils'
import { ICPAnalysisSchema } from '@/lib/grok'
import { z } from 'zod'
import { 
  Building2, 
  Users, 
  MapPin, 
  Target, 
  TrendingUp, 
  MessageSquare,
  Zap,
  AlertCircle,
  Globe,
  Shield,
  Link,
  Database,
  Code,
  BarChart3,
  DollarSign,
  Activity,
  Network,
  Award,
  Coins,
  TrendingDown,
  User,
  CheckCircle,
  ExternalLink,
  Calendar,
  Briefcase,
  GitBranch,
  Star,
  Clock,
  FileText,
  Settings,
  Vote,
  Brain,
  Heart,
  Eye,
  Lightbulb,
  Flag,
  GamepadIcon,
  PieChart,
  LineChart,
  BarChart,
  Timer,
  Layers,
  Workflow,
  Gauge,
  UserCheck,
  Lock,
  Unlock,
  Package,
  Truck,
  Handshake,
  Medal,
  Info,
  Hash,
  Percent,
  Palette,
  Image as ImageIcon
} from 'lucide-react'

// Use the flattened schema type directly - all fields are now at root level
type ComprehensiveICPAnalysis = z.infer<typeof ICPAnalysisSchema> & {
  // Extended fields that might exist in database
  [key: string]: any
}

interface EnhancedICPDisplayProps {
  icp: {
    [key: string]: any
  }
  onEdit?: () => void
  editable?: boolean
}

// Helper function for safe JSON parsing
const safeJsonParse = (jsonString: string, fallback: any = null) => {
  try {
    return JSON.parse(jsonString)
  } catch {
    return fallback
  }
}

// Component to display detailed sections from raw Grok response
const DetailedSection = ({ title, icon: Icon, children, iconColor = "text-blue-400" }: {
  title: string
  icon: any
  children: React.ReactNode
  iconColor?: string
}) => (
  <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
    <h4 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      {title}
    </h4>
    {children}
  </div>
)

// Simple info card component
const InfoCard = ({ label, value, link = false, highlight = false }: {
  label: string
  value: string | number | null | undefined
  link?: boolean
  highlight?: boolean
}) => {
  if (!value && value !== 0) return null

  const displayValue = typeof value === 'number' ? value.toLocaleString() : String(value)

  return (
    <div className={`p-3 rounded-lg border ${highlight ? 'bg-blue-900/20 border-blue-800/30' : 'bg-gray-800/30 border-gray-700/30'}`}>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      {link && typeof value === 'string' && value.startsWith('http') ? (
        <a 
          href={value} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-400 hover:text-blue-300 text-sm break-all flex items-center gap-1"
        >
          {displayValue}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <p className={`text-sm font-medium ${highlight ? 'text-blue-300' : 'text-white'}`}>
          {displayValue}
        </p>
      )}
    </div>
  )
}

// Metric card with icons
const MetricCard = ({ label, value, suffix = '', icon: Icon, color }: {
  label: string
  value: string | number | null | undefined
  suffix?: string
  icon: any
  color: string
}) => {
  if (!value && value !== 0) return null

  const displayValue = typeof value === 'number' ? value.toLocaleString() : String(value)

  return (
    <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <p className="text-gray-400 text-sm">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-white text-lg font-semibold">
        {displayValue}{suffix}
      </p>
    </div>
  )
}

// Tag list component
const TagList = ({ items, colorClass }: {
  items: string[]
  colorClass: string
}) => (
  <div className="flex flex-wrap gap-2">
    {items.map((item, index) => (
      <span 
        key={index} 
        className={`px-3 py-1 rounded-full text-sm font-medium ${colorClass}`}
      >
        {item}
      </span>
    ))}
  </div>
)

export const EnhancedICPDisplay = React.memo(({ icp, onEdit, editable = false }: EnhancedICPDisplayProps) => {
  console.log('🚀 EnhancedICPDisplay render start - icp exists:', !!icp)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Helper function to check if a field has meaningful content
  const hasContent = (value: any): boolean => {
    if (value === null || value === undefined || value === '') return false
    if (Array.isArray(value)) return value.length > 0
    if (typeof value === 'string') return value.trim().length > 0
    if (typeof value === 'number') return !isNaN(value)
    if (typeof value === 'object') return Object.keys(value).length > 0
    return Boolean(value)
  }

  // ✅ Updated to handle flattened Neo4j data structure
  const comprehensiveData = useMemo(() => {
    console.log('🔍 Processing ICP data:', icp)
    console.log('🔍 ICP keys:', icp ? Object.keys(icp) : 'no icp')
    
    // ✅ Handle new flattened structure - fields are directly accessible
    console.log('🔍 Checking condition: twitter_username =', icp?.twitter_username) 
    console.log('🔍 Checking condition: screenName =', icp?.screenName)
    console.log('🔍 Checking condition: name =', icp?.name)
    
    if (icp && (icp.twitter_username || icp.screenName || icp.name)) {
      console.log('🔍 ✅ CONDITION MATCHED - Processing flattened Neo4j data structure')
      console.log('🔍 Available Neo4j fields:', Object.keys(icp))
      console.log('🔍 Sample field values:', {
        name: icp.name,
        url: icp.url,
        website: icp.website,
        discord: icp.discord,
        blog: icp.blog
      })
      
      try {
        // Helper function for safe JSON parsing
        const safeJsonParse = (jsonString: string, fallback: any = null) => {
          try {
            return JSON.parse(jsonString)
          } catch {
            return fallback
          }
        }
        
        // Helper function to ensure arrays
        const ensureArray = <T = string>(value: any, fallback: T[] = [] as T[]) => {
          if (Array.isArray(value)) return value as T[];
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return fallback;
            try {
              const parsed = JSON.parse(trimmed);
              return Array.isArray(parsed) ? (parsed as T[]) : fallback;
            } catch {
              // If it's a plain string, return as single-item array
              return (trimmed ? [trimmed] : fallback) as T[];
            }
          }
          return fallback;
        }
        
        // Create flattened analysis object - spread raw data first, then override with normalized fields
        const flatAnalysis: Partial<ComprehensiveICPAnalysis> = {
          // Spread raw first so our normalized fields override problematic JSON strings
          ...icp,

          // Core analysis fields
          twitter_username: icp.twitter_username || icp.screenName || '',
          timestamp_utc: icp.timestamp_utc || new Date().toISOString(),
          
          // ✅ FIXED: Use individual classification fields directly
          classification_used: {
            org_type: icp.org_type || 'protocol',
            org_subtype: typeof icp.org_subtype === 'string' 
              ? safeJsonParse(icp.org_subtype, ['general'])
              : (Array.isArray(icp.org_subtype) ? icp.org_subtype : ['general']),
            web3_focus: icp.web3_focus || 'native'
          },
          
          // Basic identification fields - Direct Neo4j field mapping
          name: icp.name || '',
          website: icp.website || null,
          industry_classification: icp.industry || '',
          
          // Social platform links (direct Neo4j field names)
          discord_url: icp.discord || null,
          farcaster_url: icp.farcaster || null,
          telegram_url: icp.telegram || null,
          governance_forum_url: icp.governance_forum || null,
          linkedin_url: icp.linkedin || null,
          youtube_url: icp.youtube || null,
          medium_url: icp.medium || null,
          blog_url: icp.blog || null,
          
          // Technical links (direct Neo4j field names)
          github_url: (() => {
            // Handle array format
            if (Array.isArray(icp.github)) {
              return icp.github[0] || null;
            }
            
            // Handle JSON string format from Neo4j
            if (typeof icp.github === 'string') {
              // Check if it's a JSON array string
              if (icp.github.startsWith('[') && icp.github.endsWith(']')) {
                try {
                  const parsed = JSON.parse(icp.github);
                  return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
                } catch {
                  return null;
                }
              }
              // Handle regular URL string
              if (icp.github.startsWith('http')) {
                return icp.github;
              }
            }
            
            return null;
          })(),
          whitepaper_url: icp.whitepaper || null,
          docs_url: icp.docs || null,
          explorer_url: icp.explorer || null,
          api_docs_url: icp.api_docs || null,
          audit_report_url: icp.audit_links || null,
          
          // Market position fields (direct Neo4j field names)
          sentiment_score: icp.sentiment_score || null,
          market_presence: icp.market_presence || null,
          competitors: ensureArray<string>(icp.competitors, []),
          
          // Strategic Intelligence Parameters (direct Neo4j field names)
          monetization_readiness: icp.monetization_stage || null,
          market_maturity: icp.maturity || null,
          product_lifecycle_stage: icp.product_stage || null,
          community_health_score: icp.community_health_score || null,
          
          // Core operational metrics (direct Neo4j field names)
          key_features: ensureArray<string>(icp.key_features, []),
          target_audience: ensureArray<string>(icp.audience, []),
          geographic_focus: ensureArray<any>(icp.geography, []),
          operational_status: icp.status || null,
          
          // Ecosystem analysis (direct Neo4j field names)
          market_narratives: ensureArray<string>(icp.narratives, []),
          notable_partnerships: ensureArray<string>(icp.partners, []),
          recent_developments: ensureArray<string>(icp.recent_updates, []),
          
          // Funding structure (direct Neo4j field names)
          funding_status: icp.funding_stage || null,
          funding_amount: icp.funding_amount || null,
          investors: ensureArray<string>(icp.investors, []),
          
          // Universal tokenomics (direct Neo4j field names)
          tge_status: icp.tge || null,
          token: icp.token || null,
          token_utilities: ensureArray<any>(icp.utilities, []),
          tokenomics_model: icp.tokenomics_model || null,
          governance_structure: icp.governance || null,
          
          // Universal audit/security (direct Neo4j field names)
          auditor: ensureArray<string>(icp.auditor, []),
          audit_date: icp.audit_date || null,
          
          // Technical infrastructure (direct Neo4j field names)
          chains_supported: typeof icp.chains_supported === 'number' ? icp.chains_supported : (Number(icp.chains_supported) || null),
          chains: ensureArray<string>(icp.chains, []),
          technical_stack: ensureArray<string>(icp.tech_stack, []),
          developer_tools: ensureArray<string>(icp.dev_tools, []),
          
          // User behavior and ICP fields (direct Neo4j field names)
          engagement_patterns: ensureArray<string>(icp.engagement_patterns, []),
          user_journey: icp.user_journey || null,
          retention_factors: ensureArray<string>(icp.retention_factors, []),
          engagement_depth: icp.engagement_depth || null,
          
          // Demographics (direct Neo4j field names)
          age_demographics: ensureArray<any>(icp.age_groups, []),
          experience_level: ensureArray<any>(icp.experience, []),
          professional_roles: ensureArray<any>(icp.roles, []),
          
          // Psychographics (direct Neo4j field names)
          core_motivations: ensureArray<string>(icp.motivations, []),
          decision_drivers: ensureArray<string>(icp.decision_factors, []),
          
          // Behavioral indicators (direct Neo4j field names)
          interaction_preferences: ensureArray<string>(icp.interaction_preferences, []),
          activity_patterns: ensureArray<string>(icp.activity_patterns, []),
          conversion_factors: ensureArray<string>(icp.conversion_factors, []),
          loyalty_indicators: ensureArray<string>(icp.loyalty_indicators, []),
          
          // User behavior insights (direct Neo4j field names)
          user_archetypes: ensureArray<any>(icp.user_archetypes, []),
          unified_messaging_approach: typeof icp.messaging_strategy === 'string' 
            ? safeJsonParse(icp.messaging_strategy, {}) 
            : (icp.messaging_strategy || {}),
          
          // DeFi Protocol Extensions (direct Neo4j field names)
          defi_protocol_category: icp.category || null,
          defi_total_value_locked_usd: icp.tvl || null,
          defi_yield_mechanisms: ensureArray<string>(icp.yield, []),
          defi_liquidity_incentives: icp.liquidity_incentives || null,
          defi_fee_sharing_model: icp.fee_model || null,
          
          // GameFi Protocol Extensions (direct Neo4j field names)
          gamefi_game_category: icp.category || null,
          gamefi_platform_type: ensureArray<string>(icp.platforms, []),
          gamefi_nft_integration: icp.nft_model || null,
          gamefi_gameplay_features: ensureArray<string>(icp.gameplay, []),
          gamefi_game_tokens: ensureArray<string>(icp.game_token, []),
          gamefi_nft_assets: ensureArray<string>(icp.nft_assets, []),
          gamefi_play_to_earn_model: icp.p2e_model || null,
          gamefi_asset_trading: icp.trading || null,
          
          // Social Protocol Extensions (direct Neo4j field names)
          social_category: icp.category || null,
          social_monthly_active_users: icp.monthly_users || null,
          social_content_creators_count: icp.creators || null,
          social_creator_monetization: icp.monetization || null,
          social_content_rewards: icp.rewards || null,
          
          // Infrastructure Extensions (direct Neo4j field names)
          infra_category: icp.category || null,
          infra_daily_transactions: icp.tx_per_day || null,
          infra_projects_building: icp.projects || null,
          infra_market_share: icp.market_share || null,
          infra_throughput: icp.throughput || null,
          infra_cost_per_transaction: icp.cost_per_tx || null,
          infra_validator_economics: icp.validator_economics || null,
          infra_staking_mechanics: icp.staking || null,
          infra_network_fees: icp.fee_model || null,
          
          // Exchange Extensions (direct Neo4j field names)
          exchange_type: icp.category || null,
          exchange_trading_pairs: icp.trading_pairs || null,
          exchange_supported_assets: ensureArray<string>(icp.assets, []),
          exchange_trading_volume_24h_usd: icp.volume_24h || null,
          exchange_market_rank: icp.rank || null,
          exchange_liquidity_depth: icp.liquidity || null,
          exchange_fiat_support: ensureArray<string>(icp.fiat, []),
          exchange_maker_fee: icp.maker_fee || null,
          exchange_taker_fee: icp.taker_fee || null,
          exchange_withdrawal_fees: icp.withdrawal_fee || null,
          exchange_liquidity_incentives: icp.liquidity_incentives || null,
          
          // Investment Fund Extensions (direct Neo4j field names)
          fund_type: icp.category || null,
          fund_investment_stage: icp.stage || null,
          fund_sector_focus: ensureArray<string>(icp.sectors, []),
          fund_portfolio_link: icp.portfolio || null,
          fund_size_usd: icp.fund_size || null,
          fund_portfolio_size: icp.portfolio_size || null,
          fund_investments: ensureArray<string>(icp.investments, []),
          fund_market_reputation: icp.reputation || null,
          fund_token: icp.symbol || null,
          fund_investment_model: ensureArray<string>(icp.model, []),
          
          // Service Provider Extensions (direct Neo4j field names)
          service_category: ensureArray<string>(icp.category, []),
          service_case_studies_url: icp.case_studies || null,
          service_testimonials_url: icp.testimonials || null,
          service_client_portfolio: ensureArray<string>(icp.clients, []),
          service_team_size: icp.team_size || null,
          
          // Community/DAO Extensions (direct Neo4j field names)
          community_type: ensureArray<string>(icp.category, []),
          community_mission_focus: icp.mission || null,
          community_membership_model: icp.membership || null,
          community_member_count: icp.members || null,
          community_influence_reach: icp.reach || null,
          community_initiatives: ensureArray<string>(icp.initiatives, []),
          community_member_benefits: ensureArray<string>(icp.benefits, []),
          community_treasury_management: icp.treasury || null,

          // NFT/Digital Assets Extensions (ensure array initialization)
          category: icp.category || null,
          collection_size: icp.collection_size || null,
          floor_price: icp.floor_price || null,
          total_volume: icp.total_volume || null,
          unique_holders: icp.unique_holders || null,
          creator_royalties: icp.creator_royalties || null,
          launch_mechanism: icp.launch_mechanism || null,
          utility_features: ensureArray<string>(icp.utility_features, []),
          marketplace_integrations: ensureArray<string>(icp.marketplace_integrations, []),
          asset_types: ensureArray<string>(icp.asset_types, []),
          community_features: ensureArray<string>(icp.community_features, []),

          // Security Extensions
          security_measures: ensureArray<string>(icp.security_measures, []),
        }
        
        console.log('✅ Successfully processed flattened Neo4j data:', flatAnalysis)
        console.log('🚨 ABOUT TO RETURN flatAnalysis:', !!flatAnalysis)
        return flatAnalysis
        
      } catch (parseError) {
        console.error('❌ Error processing flattened data:', parseError)
        console.log('Raw icp data:', icp)
        return null
      }
    }
    
    // No comprehensive data available
    console.log('❌ No comprehensive ICP data found in:', icp)
    console.log('🔍 Final fallback - returning null')
    return null
  }, [icp])
  
  // 🚨 DEBUG: Add comprehensive logging
  console.log('🎯 Final comprehensiveData:', comprehensiveData)
  console.log('🎯 comprehensiveData is null?', comprehensiveData === null)
  console.log('🎯 comprehensiveData is undefined?', comprehensiveData === undefined)
  console.log('🎯 Will render sections:', !!comprehensiveData)
  
  // ✅ Check if analysis is older than 60 days
  const isAnalysisStale = useMemo(() => {
    if (!icp?.last_icp_analysis) return true
    
    const lastAnalysis = new Date(icp.last_icp_analysis)
    const now = new Date()
    const daysDiff = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60 * 60 * 24)
    
    console.log(`📅 ICP analysis age: ${daysDiff.toFixed(1)} days (stale if > 60)`)
    return daysDiff > 60
  }, [icp?.last_icp_analysis])
  if (!comprehensiveData) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">
            {isAnalysisStale ? 'ICP Analysis Outdated' : 'ICP Analysis Unavailable'}
          </h3>
        </div>
        <p className="text-gray-400 mt-2">
          {isAnalysisStale 
            ? 'Analysis is older than 60 days. Please run a new analysis for updated insights.'
            : 'No comprehensive analysis data available. Run an analysis to see detailed insights.'
          }
        </p>
        {isAnalysisStale && (
          <div className="mt-4 text-sm text-orange-300">
            Last analysis: {new Date(icp?.last_icp_analysis).toLocaleDateString()}
          </div>
        )}
      </div>
    )
  }

  // Extract classification info for conditional rendering
  const orgType = comprehensiveData.classification_used?.org_type || 'protocol'
  const orgSubtype = Array.isArray(comprehensiveData.classification_used?.org_subtype) 
    ? comprehensiveData.classification_used.org_subtype[0] || 'general'
    : comprehensiveData.classification_used?.org_subtype || 'general'

  // 🎯 DEBUG: Check section rendering conditions
  console.log('🎯 Section 1 - Organization Overview check:', {
    name: comprehensiveData.name,
    website: comprehensiveData.website,
    industry_classification: comprehensiveData.industry_classification,
    shouldRender: !!(comprehensiveData.name || comprehensiveData.website || comprehensiveData.industry_classification)
  })

  console.log('🎯 Section 2 - Market Position check:', {
    sentiment_score: comprehensiveData.sentiment_score,
    market_presence: comprehensiveData.market_presence,
    competitors: comprehensiveData.competitors,
    competitorsLength: comprehensiveData.competitors?.length,
    shouldRender: !!(comprehensiveData.sentiment_score || comprehensiveData.market_presence || comprehensiveData.competitors)
  })

  console.log('🎯 Section 3 - Core Features check:', {
    key_features: comprehensiveData.key_features,
    key_featuresLength: comprehensiveData.key_features?.length,
    target_audience: comprehensiveData.target_audience,
    operational_status: comprehensiveData.operational_status,
    shouldRender: !!(comprehensiveData.key_features || comprehensiveData.target_audience || comprehensiveData.operational_status)
  })

  console.log('🎯 Section 4 - Tokenomics check:', {
    token: comprehensiveData.token,
    tge_status: comprehensiveData.tge_status,
    governance_structure: comprehensiveData.governance_structure,
    shouldRender: !!(comprehensiveData.token || comprehensiveData.tge_status || comprehensiveData.governance_structure)
  })

  console.log('🎯 Section 5 - Funding check:', {
    funding_status: comprehensiveData.funding_status,
    funding_amount: comprehensiveData.funding_amount,
    investors: comprehensiveData.investors,
    investorsLength: comprehensiveData.investors?.length,
    shouldRender: !!(comprehensiveData.funding_status || comprehensiveData.funding_amount || comprehensiveData.investors)
  })

  console.log('🚀 About to return JSX - comprehensiveData exists:', !!comprehensiveData)

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-400" />
          <h3 className="text-2xl font-bold text-white">
            Comprehensive ICP Analysis
          </h3>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm font-medium capitalize">
              {orgType}
            </span>
            {orgSubtype !== 'general' && (
              <span className="px-3 py-1 bg-blue-700 text-blue-300 rounded-full text-sm font-medium capitalize">
                {orgSubtype}
              </span>
            )}
          </div>
        </div>
        {editable && onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Edit Analysis
          </button>
        )}
      </div>

      {/* Basic Information - Direct Neo4j field mapping */}
      {(hasContent(comprehensiveData.name) || hasContent(comprehensiveData.website) || hasContent(comprehensiveData.industry_classification) || hasContent(comprehensiveData.tge_status)) && (
        <DetailedSection title="Organization Overview" icon={Building2} iconColor="text-blue-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comprehensiveData.name && (
              <InfoCard 
                label="Project Name" 
                value={comprehensiveData.name} 
                highlight={true}
              />
            )}
            {comprehensiveData.industry_classification && (
              <InfoCard 
                label="Industry Classification" 
                value={comprehensiveData.industry_classification} 
              />
            )}
            {comprehensiveData.website && (
              <InfoCard 
                label="Website" 
                value={comprehensiveData.website} 
                link={true}
              />
            )}
            {comprehensiveData.tge_status && (
              <InfoCard 
                label="TGE Status" 
                value={comprehensiveData.tge_status === 'pre-tge' ? 'Pre-TGE' : 'Post-TGE'} 
                highlight={comprehensiveData.tge_status === 'post-tge'}
              />
            )}
          </div>

          {/* Technical Links - UPDATED to include missing technical links */}
          {(comprehensiveData.github_url || comprehensiveData.whitepaper_url || comprehensiveData.docs_url || comprehensiveData.explorer_url || comprehensiveData.api_docs_url || comprehensiveData.audit_report_url) && (
            <div className="mt-6">
              <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                <Code className="w-4 h-4 text-green-400" />
                Technical Resources
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {comprehensiveData.github_url && (
                  <InfoCard 
                    label="GitHub" 
                    value={comprehensiveData.github_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.whitepaper_url && (
                  <InfoCard 
                    label="Whitepaper" 
                    value={comprehensiveData.whitepaper_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.docs_url && (
                  <InfoCard 
                    label="Documentation" 
                    value={comprehensiveData.docs_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.api_docs_url && (
                  <InfoCard 
                    label="API Documentation" 
                    value={comprehensiveData.api_docs_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.explorer_url && (
                  <InfoCard 
                    label="Block Explorer" 
                    value={comprehensiveData.explorer_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.audit_report_url && (
                  <InfoCard 
                    label="Audit Report" 
                    value={comprehensiveData.audit_report_url} 
                    link={true}
                  />
                )}
              </div>
            </div>
          )}

          {/* Community Links - UPDATED to include all social platforms */}
          {(comprehensiveData.discord_url || comprehensiveData.telegram_url || comprehensiveData.farcaster_url || comprehensiveData.governance_forum_url || comprehensiveData.linkedin_url || comprehensiveData.youtube_url || comprehensiveData.medium_url || comprehensiveData.blog_url) && (
            <div className="mt-6">
              <h5 className="text-white font-medium mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Community & Social Platforms
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {comprehensiveData.discord_url && (
                  <InfoCard 
                    label="Discord" 
                    value={comprehensiveData.discord_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.telegram_url && (
                  <InfoCard 
                    label="Telegram" 
                    value={comprehensiveData.telegram_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.farcaster_url && (
                  <InfoCard 
                    label="Farcaster" 
                    value={comprehensiveData.farcaster_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.governance_forum_url && (
                  <InfoCard 
                    label="Governance Forum" 
                    value={comprehensiveData.governance_forum_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.linkedin_url && (
                  <InfoCard 
                    label="LinkedIn" 
                    value={comprehensiveData.linkedin_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.youtube_url && (
                  <InfoCard 
                    label="YouTube" 
                    value={comprehensiveData.youtube_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.medium_url && (
                  <InfoCard 
                    label="Medium" 
                    value={comprehensiveData.medium_url} 
                    link={true}
                  />
                )}
                {comprehensiveData.blog_url && (
                  <InfoCard 
                    label="Blog" 
                    value={comprehensiveData.blog_url} 
                    link={true}
                  />
                )}
              </div>
            </div>
          )}
        </DetailedSection>
      )}

      {/* Market Position - Flattened */}
      {(hasContent(comprehensiveData.sentiment_score) || hasContent(comprehensiveData.market_presence) || hasContent(comprehensiveData.competitors)) && (
        <DetailedSection title="Market Position" icon={BarChart3} iconColor="text-green-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {comprehensiveData.sentiment_score && (
              <MetricCard 
                label="Sentiment Score" 
                value={comprehensiveData.sentiment_score}
                suffix="/1.0"
                icon={TrendingUp}
                color="text-yellow-400"
              />
            )}
            {comprehensiveData.market_presence && (
              <InfoCard 
                label="Market Presence" 
                value={comprehensiveData.market_presence}
                highlight={true}
              />
            )}
          </div>

          {comprehensiveData.competitors && comprehensiveData.competitors.length > 0 && (
            <div className="mt-6">
              <p className="text-gray-400 text-sm mb-2">Primary Competitors ({comprehensiveData.competitors.length})</p>
              <TagList items={comprehensiveData.competitors} colorClass="bg-red-900/50 text-red-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* Strategic Intelligence - NEW SECTION for the 4 strategic parameters */}
      {(hasContent(comprehensiveData.monetization_readiness) || hasContent(comprehensiveData.market_maturity) || hasContent(comprehensiveData.product_lifecycle_stage) || hasContent(comprehensiveData.community_health_score)) && (
        <DetailedSection title="Strategic Intelligence" icon={Brain} iconColor="text-indigo-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {comprehensiveData.monetization_readiness && (
              <InfoCard 
                label="Monetization Readiness" 
                value={comprehensiveData.monetization_readiness.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                highlight={true}
              />
            )}
            {comprehensiveData.market_maturity && (
              <InfoCard 
                label="Market Maturity" 
                value={comprehensiveData.market_maturity.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                highlight={true}
              />
            )}
            {comprehensiveData.product_lifecycle_stage && (
              <InfoCard 
                label="Product Lifecycle" 
                value={comprehensiveData.product_lifecycle_stage.replace(/_/g, ' ').toUpperCase()}
                highlight={true}
              />
            )}
            {comprehensiveData.community_health_score !== undefined && comprehensiveData.community_health_score !== null && (
              <MetricCard 
                label="Community Health" 
                value={Math.round(comprehensiveData.community_health_score * 100)}
                suffix="%"
                icon={Heart}
                color="text-pink-400"
              />
            )}
          </div>
        </DetailedSection>
      )}

      {/* Core Features - Flattened */}
      {(hasContent(comprehensiveData.key_features) || hasContent(comprehensiveData.target_audience) || hasContent(comprehensiveData.operational_status) || hasContent(comprehensiveData.geographic_focus)) && (
        <DetailedSection title="Core Features & Capabilities" icon={Target} iconColor="text-purple-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comprehensiveData.target_audience && comprehensiveData.target_audience.length > 0 && (
              <div className="p-3 rounded-lg border bg-blue-900/20 border-blue-800/30">
                <p className="text-blue-300 font-medium text-sm mb-1">Target Audience</p>
                <div className="flex flex-wrap gap-1">
                  {comprehensiveData.target_audience.map((audience: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-blue-800/30 text-blue-200 text-xs rounded">
                      {audience}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {comprehensiveData.operational_status && (
              <InfoCard 
                label="Operational Status" 
                value={comprehensiveData.operational_status}
              />
            )}
          </div>

          {comprehensiveData.key_features && comprehensiveData.key_features.length > 0 && (
            <div className="mt-6">
              <p className="text-gray-400 text-sm mb-2">Key Features & Capabilities</p>
              <TagList items={comprehensiveData.key_features} colorClass="bg-yellow-900/50 text-yellow-300" />
            </div>
          )}

          {comprehensiveData.geographic_focus && comprehensiveData.geographic_focus.length > 0 && (
            <div className="mt-6">
              <p className="text-gray-400 text-sm mb-2">Geographic Focus ({comprehensiveData.geographic_focus.length} regions)</p>
              <TagList items={comprehensiveData.geographic_focus} colorClass="bg-indigo-900/50 text-indigo-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* Tokenomics - Flattened */}
      {(hasContent(comprehensiveData.token) || hasContent(comprehensiveData.tge_status) || hasContent(comprehensiveData.governance_structure) || hasContent(comprehensiveData.token_utilities) || hasContent(comprehensiveData.tokenomics_model)) && (
        <DetailedSection title="Tokenomics" icon={Coins} iconColor="text-yellow-400">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comprehensiveData.token && (
              <InfoCard 
                label="Token Symbol" 
                value={comprehensiveData.token} 
                highlight={true}
              />
            )}
            {comprehensiveData.tge_status && (
              <InfoCard 
                label="TGE Status" 
                value={comprehensiveData.tge_status === 'pre-tge' ? 'Pre-TGE' : 'Post-TGE'} 
                highlight={comprehensiveData.tge_status === 'post-tge'}
              />
            )}
            {comprehensiveData.governance_structure && (
              <InfoCard 
                label="Governance" 
                value={comprehensiveData.governance_structure} 
              />
            )}
          </div>

          {comprehensiveData.token_utilities && comprehensiveData.token_utilities.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Token Utilities</p>
              <TagList items={comprehensiveData.token_utilities} colorClass="bg-yellow-900/50 text-yellow-300" />
            </div>
          )}

          {comprehensiveData.tokenomics_model && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Tokenomics Model</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.tokenomics_model}
              </p>
            </div>
          )}
        </DetailedSection>
      )}

      {/* Funding Information - Flattened */}
      {(hasContent(comprehensiveData.funding_status) || hasContent(comprehensiveData.funding_amount) || hasContent(comprehensiveData.investors)) && (
        <DetailedSection title="Funding & Investment" icon={Briefcase} iconColor="text-green-400">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comprehensiveData.funding_status && (
              <InfoCard 
                label="Funding Status" 
                value={comprehensiveData.funding_status} 
                highlight={true}
              />
            )}
            {comprehensiveData.funding_amount && (
              <MetricCard 
                label="Funding Amount" 
                value={typeof comprehensiveData.funding_amount === 'string' ? 
                  comprehensiveData.funding_amount :
                  `$${(Number(comprehensiveData.funding_amount) / 1000000).toFixed(1)}M`}
                icon={DollarSign}
                color="text-green-400"
              />
            )}
          </div>
          {comprehensiveData.investors && comprehensiveData.investors.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Key Investors ({comprehensiveData.investors.length})</p>
              <TagList items={comprehensiveData.investors} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* Technical Infrastructure */}
      {(hasContent(comprehensiveData.technical_stack) || hasContent(comprehensiveData.developer_tools) || hasContent(comprehensiveData.chains) || hasContent(comprehensiveData.chains_supported) || hasContent(comprehensiveData.auditor) || hasContent(comprehensiveData.audit_date) || hasContent(comprehensiveData.security_measures)) && (
        <DetailedSection title="Technical Infrastructure" icon={Code} iconColor="text-cyan-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comprehensiveData.chains_supported && (
              <MetricCard 
                label="Chains Supported" 
                value={comprehensiveData.chains_supported}
                icon={Network}
                color="text-cyan-400"
              />
            )}
            {comprehensiveData.auditor && comprehensiveData.auditor.length > 0 && (
              <InfoCard 
                label="Security Auditors" 
                value={comprehensiveData.auditor.join(', ')}
              />
            )}
            {comprehensiveData.audit_date && (
              <InfoCard 
                label="Last Audit Date" 
                value={comprehensiveData.audit_date}
              />
            )}
          </div>

          {comprehensiveData.technical_stack && comprehensiveData.technical_stack.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Technical Stack</p>
              <TagList items={comprehensiveData.technical_stack} colorClass="bg-cyan-900/50 text-cyan-300" />
            </div>
          )}

          {comprehensiveData.developer_tools && comprehensiveData.developer_tools.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Developer Tools</p>
              <TagList items={comprehensiveData.developer_tools} colorClass="bg-green-900/50 text-green-300" />
            </div>
          )}

          {comprehensiveData.chains && comprehensiveData.chains.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Supported Blockchains</p>
              <TagList items={comprehensiveData.chains} colorClass="bg-blue-900/50 text-blue-300" />
            </div>
          )}

          {comprehensiveData.security_measures && comprehensiveData.security_measures.length > 0 && (
            <div className="mt-4">
              <p className="text-gray-400 text-sm mb-2">Security Measures</p>
              <TagList items={comprehensiveData.security_measures} colorClass="bg-red-900/50 text-red-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* Ecosystem Analysis */}
      {(hasContent(comprehensiveData.market_narratives) || hasContent(comprehensiveData.notable_partnerships) || hasContent(comprehensiveData.recent_developments)) && (
        <DetailedSection title="Ecosystem Analysis" icon={Network} iconColor="text-orange-400">
          {comprehensiveData.market_narratives && comprehensiveData.market_narratives.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Market Narratives ({comprehensiveData.market_narratives.length})</p>
              <TagList items={comprehensiveData.market_narratives} colorClass="bg-orange-900/50 text-orange-300" />
            </div>
          )}

          {comprehensiveData.notable_partnerships && comprehensiveData.notable_partnerships.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Notable Partnerships ({comprehensiveData.notable_partnerships.length})</p>
              <TagList items={comprehensiveData.notable_partnerships} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}

          {comprehensiveData.recent_developments && comprehensiveData.recent_developments.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">Recent Developments ({comprehensiveData.recent_developments.length})</p>
              <TagList items={comprehensiveData.recent_developments} colorClass="bg-indigo-900/50 text-indigo-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* User Demographics */}
      {(hasContent(comprehensiveData.age_demographics) || hasContent(comprehensiveData.professional_roles) || hasContent(comprehensiveData.experience_level)) && (
        <DetailedSection title="User Demographics" icon={Users} iconColor="text-pink-400">
          {comprehensiveData.age_demographics && comprehensiveData.age_demographics.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Age Demographics</p>
              <TagList items={comprehensiveData.age_demographics} colorClass="bg-pink-900/50 text-pink-300" />
            </div>
          )}

          {comprehensiveData.professional_roles && comprehensiveData.professional_roles.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Professional Roles</p>
              <TagList items={comprehensiveData.professional_roles} colorClass="bg-blue-900/50 text-blue-300" />
            </div>
          )}

          {comprehensiveData.experience_level && comprehensiveData.experience_level.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">Experience Levels</p>
              <TagList items={comprehensiveData.experience_level} colorClass="bg-green-900/50 text-green-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* User Behavior & Engagement */}
      {(comprehensiveData.engagement_patterns || comprehensiveData.activity_patterns || comprehensiveData.interaction_preferences || comprehensiveData.core_motivations) && (
        <DetailedSection title="User Behavior & Engagement" icon={Activity} iconColor="text-violet-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {comprehensiveData.user_journey && (
              <InfoCard 
                label="User Journey" 
                value={comprehensiveData.user_journey}
                highlight={true}
              />
            )}
            {comprehensiveData.engagement_depth && (
              <InfoCard 
                label="Engagement Depth" 
                value={comprehensiveData.engagement_depth}
                highlight={true}
              />
            )}
          </div>

          {comprehensiveData.engagement_patterns && comprehensiveData.engagement_patterns.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Engagement Patterns</p>
              <TagList items={comprehensiveData.engagement_patterns} colorClass="bg-violet-900/50 text-violet-300" />
            </div>
          )}

          {comprehensiveData.activity_patterns && comprehensiveData.activity_patterns.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Activity Patterns</p>
              <TagList items={comprehensiveData.activity_patterns} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}

          {comprehensiveData.interaction_preferences && comprehensiveData.interaction_preferences.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Interaction Preferences</p>
              <TagList items={comprehensiveData.interaction_preferences} colorClass="bg-indigo-900/50 text-indigo-300" />
            </div>
          )}

          {comprehensiveData.core_motivations && comprehensiveData.core_motivations.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">Core Motivations</p>
              <TagList items={comprehensiveData.core_motivations} colorClass="bg-orange-900/50 text-orange-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* User Psychology & Behavior */}
      {(comprehensiveData.decision_drivers || comprehensiveData.conversion_factors || comprehensiveData.retention_factors || comprehensiveData.loyalty_indicators) && (
        <DetailedSection title="User Psychology & Behavior" icon={Brain} iconColor="text-teal-400">
          {comprehensiveData.decision_drivers && comprehensiveData.decision_drivers.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Decision Drivers</p>
              <TagList items={comprehensiveData.decision_drivers} colorClass="bg-teal-900/50 text-teal-300" />
            </div>
          )}

          {comprehensiveData.conversion_factors && comprehensiveData.conversion_factors.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Conversion Factors</p>
              <TagList items={comprehensiveData.conversion_factors} colorClass="bg-emerald-900/50 text-emerald-300" />
            </div>
          )}

          {comprehensiveData.retention_factors && comprehensiveData.retention_factors.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Retention Factors</p>
              <TagList items={comprehensiveData.retention_factors} colorClass="bg-cyan-900/50 text-cyan-300" />
            </div>
          )}

          {comprehensiveData.loyalty_indicators && comprehensiveData.loyalty_indicators.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">Loyalty Indicators</p>
              <TagList items={comprehensiveData.loyalty_indicators} colorClass="bg-blue-900/50 text-blue-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* DeFi Protocol Specific Section */}
      {orgSubtype === 'defi' && (comprehensiveData.defi_protocol_category || comprehensiveData.defi_total_value_locked_usd || comprehensiveData.defi_yield_mechanisms) && (
        <DetailedSection title="DeFi Protocol Metrics" icon={DollarSign} iconColor="text-emerald-400">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {comprehensiveData.defi_protocol_category && (
              <InfoCard 
                label="Protocol Category" 
                value={comprehensiveData.defi_protocol_category}
                highlight={true}
              />
            )}
            {comprehensiveData.defi_total_value_locked_usd && (
              <MetricCard 
                label="Total Value Locked" 
                value={`$${(comprehensiveData.defi_total_value_locked_usd / 1000000).toFixed(1)}M`}
                icon={Lock}
                color="text-emerald-400"
              />
            )}
          </div>

          {comprehensiveData.defi_yield_mechanisms && comprehensiveData.defi_yield_mechanisms.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Yield Mechanisms</p>
              <TagList items={comprehensiveData.defi_yield_mechanisms} colorClass="bg-emerald-900/50 text-emerald-300" />
            </div>
          )}

          {comprehensiveData.defi_liquidity_incentives && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Liquidity Incentives</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.defi_liquidity_incentives}
              </p>
            </div>
          )}

          {comprehensiveData.defi_fee_sharing_model && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Fee Sharing Model</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.defi_fee_sharing_model}
              </p>
            </div>
          )}
        </DetailedSection>
      )}

      {/* GameFi Protocol Specific Section */}
      {orgSubtype === 'gaming' && (comprehensiveData.gamefi_game_category || comprehensiveData.gamefi_platform_type || comprehensiveData.gamefi_gameplay_features) && (
        <DetailedSection title="GameFi Protocol Metrics" icon={GamepadIcon} iconColor="text-purple-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {comprehensiveData.gamefi_game_category && (
              <InfoCard 
                label="Game Category" 
                value={comprehensiveData.gamefi_game_category}
                highlight={true}
              />
            )}
            {comprehensiveData.gamefi_nft_integration && (
              <InfoCard 
                label="NFT Integration" 
                value={comprehensiveData.gamefi_nft_integration}
              />
            )}
          </div>

          {comprehensiveData.gamefi_platform_type && comprehensiveData.gamefi_platform_type.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Platform Types</p>
              <TagList items={comprehensiveData.gamefi_platform_type} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}

          {comprehensiveData.gamefi_gameplay_features && comprehensiveData.gamefi_gameplay_features.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Gameplay Features</p>
              <TagList items={comprehensiveData.gamefi_gameplay_features} colorClass="bg-indigo-900/50 text-indigo-300" />
            </div>
          )}

          {comprehensiveData.gamefi_game_tokens && comprehensiveData.gamefi_game_tokens.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Game Tokens</p>
              <TagList items={comprehensiveData.gamefi_game_tokens} colorClass="bg-yellow-900/50 text-yellow-300" />
            </div>
          )}

          {comprehensiveData.gamefi_nft_assets && comprehensiveData.gamefi_nft_assets.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">NFT Assets</p>
              <TagList items={comprehensiveData.gamefi_nft_assets} colorClass="bg-pink-900/50 text-pink-300" />
            </div>
          )}

          {comprehensiveData.gamefi_play_to_earn_model && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Play-to-Earn Model</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.gamefi_play_to_earn_model}
              </p>
            </div>
          )}

          {comprehensiveData.gamefi_asset_trading && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Asset Trading</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.gamefi_asset_trading}
              </p>
            </div>
          )}
        </DetailedSection>
      )}

      {/* Social Protocol Specific Section */}
      {orgSubtype === 'social' && (comprehensiveData.social_category || comprehensiveData.social_monthly_active_users) && (
        <DetailedSection title="Social Protocol Metrics" icon={MessageSquare} iconColor="text-pink-400">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {comprehensiveData.social_category && (
              <InfoCard 
                label="Social Category" 
                value={comprehensiveData.social_category}
                highlight={true}
              />
            )}
            {comprehensiveData.social_monthly_active_users && (
              <MetricCard 
                label="Monthly Active Users" 
                value={comprehensiveData.social_monthly_active_users}
                icon={Users}
                color="text-blue-400"
              />
            )}
            {comprehensiveData.social_content_creators_count && (
              <MetricCard 
                label="Content Creators" 
                value={comprehensiveData.social_content_creators_count}
                icon={User}
                color="text-purple-400"
              />
            )}
          </div>

          {comprehensiveData.social_creator_monetization && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Creator Monetization</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.social_creator_monetization}
              </p>
            </div>
          )}

          {comprehensiveData.social_content_rewards && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Content Rewards</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.social_content_rewards}
              </p>
            </div>
          )}
        </DetailedSection>
      )}

      {/* Infrastructure Specific Section */}
      {orgType === 'infrastructure' && (comprehensiveData.infra_category || comprehensiveData.infra_daily_transactions || comprehensiveData.infra_throughput) && (
        <DetailedSection title="Infrastructure Metrics" icon={Network} iconColor="text-cyan-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {comprehensiveData.infra_category && (
              <InfoCard 
                label="Infrastructure Category" 
                value={comprehensiveData.infra_category}
                highlight={true}
              />
            )}
            {comprehensiveData.infra_daily_transactions && (
              <MetricCard 
                label="Daily Transactions" 
                value={comprehensiveData.infra_daily_transactions}
                icon={Activity}
                color="text-cyan-400"
              />
            )}
            {comprehensiveData.infra_projects_building && (
              <MetricCard 
                label="Projects Building" 
                value={comprehensiveData.infra_projects_building}
                icon={Building2}
                color="text-blue-400"
              />
            )}
            {comprehensiveData.infra_market_share && (
              <MetricCard 
                label="Market Share" 
                value={Math.round(comprehensiveData.infra_market_share * 100)}
                suffix="%"
                icon={PieChart}
                color="text-green-400"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {comprehensiveData.infra_throughput && (
              <InfoCard 
                label="Throughput" 
                value={comprehensiveData.infra_throughput}
              />
            )}
            {comprehensiveData.infra_cost_per_transaction && (
              <MetricCard 
                label="Cost per Transaction" 
                value={`$${comprehensiveData.infra_cost_per_transaction.toFixed(4)}`}
                icon={DollarSign}
                color="text-yellow-400"
              />
            )}
          </div>

          {comprehensiveData.infra_validator_economics && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Validator Economics</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.infra_validator_economics}
              </p>
            </div>
          )}

          {comprehensiveData.infra_staking_mechanics && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Staking Mechanics</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.infra_staking_mechanics}
              </p>
            </div>
          )}

          {comprehensiveData.infra_network_fees && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Network Fee Structure</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.infra_network_fees}
              </p>
            </div>
          )}
        </DetailedSection>
      )}

      {/* Exchange Specific Section */}
      {orgType === 'exchange' && (comprehensiveData.exchange_type || comprehensiveData.exchange_trading_volume_24h_usd) && (
        <DetailedSection title="Exchange Metrics" icon={BarChart3} iconColor="text-green-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {comprehensiveData.exchange_type && (
              <InfoCard 
                label="Exchange Type" 
                value={comprehensiveData.exchange_type}
                highlight={true}
              />
            )}
            {comprehensiveData.exchange_trading_volume_24h_usd && (
              <MetricCard 
                label="24h Volume" 
                value={`$${(comprehensiveData.exchange_trading_volume_24h_usd / 1000000).toFixed(1)}M`}
                icon={TrendingUp}
                color="text-green-400"
              />
            )}
            {comprehensiveData.exchange_market_rank && (
              <MetricCard 
                label="Market Rank" 
                value={`#${comprehensiveData.exchange_market_rank}`}
                icon={Award}
                color="text-yellow-400"
              />
            )}
            {comprehensiveData.exchange_trading_pairs && (
              <MetricCard 
                label="Trading Pairs" 
                value={comprehensiveData.exchange_trading_pairs}
                icon={Link}
                color="text-blue-400"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {comprehensiveData.exchange_maker_fee && (
              <MetricCard 
                label="Maker Fee" 
                value={comprehensiveData.exchange_maker_fee}
                suffix="%"
                icon={DollarSign}
                color="text-emerald-400"
              />
            )}
            {comprehensiveData.exchange_taker_fee && (
              <MetricCard 
                label="Taker Fee" 
                value={comprehensiveData.exchange_taker_fee}
                suffix="%"
                icon={DollarSign}
                color="text-orange-400"
              />
            )}
            {comprehensiveData.exchange_liquidity_depth && (
              <MetricCard 
                label="Liquidity Depth" 
                value={Math.round(comprehensiveData.exchange_liquidity_depth * 100)}
                suffix="%"
                icon={Activity}
                color="text-cyan-400"
              />
            )}
          </div>

          {comprehensiveData.exchange_supported_assets && comprehensiveData.exchange_supported_assets.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Supported Assets</p>
              <TagList items={comprehensiveData.exchange_supported_assets} colorClass="bg-blue-900/50 text-blue-300" />
            </div>
          )}

          {comprehensiveData.exchange_fiat_support && comprehensiveData.exchange_fiat_support.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Fiat Support</p>
              <TagList items={comprehensiveData.exchange_fiat_support} colorClass="bg-yellow-900/50 text-yellow-300" />
            </div>
          )}

          {comprehensiveData.exchange_liquidity_incentives && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Liquidity Incentives</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.exchange_liquidity_incentives}
              </p>
            </div>
          )}
        </DetailedSection>
      )}

      {/* Investment Fund Specific Section */}
      {orgType === 'investment' && (comprehensiveData.fund_type || comprehensiveData.fund_size_usd || comprehensiveData.fund_investments) && (
        <DetailedSection title="Investment Fund Metrics" icon={Briefcase} iconColor="text-amber-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {comprehensiveData.fund_type && (
              <InfoCard 
                label="Fund Type" 
                value={comprehensiveData.fund_type}
                highlight={true}
              />
            )}
            {comprehensiveData.fund_investment_stage && (
              <InfoCard 
                label="Investment Stage" 
                value={comprehensiveData.fund_investment_stage}
              />
            )}
            {comprehensiveData.fund_size_usd && (
              <MetricCard 
                label="Fund Size" 
                value={`$${(comprehensiveData.fund_size_usd / 1000000).toFixed(1)}M`}
                icon={DollarSign}
                color="text-green-400"
              />
            )}
            {comprehensiveData.fund_portfolio_size && (
              <MetricCard 
                label="Portfolio Size" 
                value={comprehensiveData.fund_portfolio_size}
                icon={Building2}
                color="text-blue-400"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {comprehensiveData.fund_market_reputation && (
              <InfoCard 
                label="Market Reputation" 
                value={comprehensiveData.fund_market_reputation}
                highlight={true}
              />
            )}
            {comprehensiveData.fund_token && (
              <InfoCard 
                label="Fund Token" 
                value={comprehensiveData.fund_token}
              />
            )}
            {comprehensiveData.fund_portfolio_link && (
              <InfoCard 
                label="Portfolio Link" 
                value={comprehensiveData.fund_portfolio_link}
                link={true}
              />
            )}
          </div>

          {comprehensiveData.fund_sector_focus && comprehensiveData.fund_sector_focus.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Sector Focus</p>
              <TagList items={comprehensiveData.fund_sector_focus} colorClass="bg-amber-900/50 text-amber-300" />
            </div>
          )}

          {comprehensiveData.fund_investment_model && comprehensiveData.fund_investment_model.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Investment Model</p>
              <TagList items={comprehensiveData.fund_investment_model} colorClass="bg-green-900/50 text-green-300" />
            </div>
          )}

          {comprehensiveData.fund_investments && comprehensiveData.fund_investments.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Portfolio Investments ({comprehensiveData.fund_investments.length})</p>
              <TagList items={comprehensiveData.fund_investments} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* Service Provider Specific Section */}
      {orgType === 'service' && (comprehensiveData.service_category) && (
        <DetailedSection title="Service Provider Metrics" icon={Handshake} iconColor="text-teal-400">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {comprehensiveData.service_team_size && (
              <InfoCard 
                label="Team Size" 
                value={comprehensiveData.service_team_size}
                highlight={true}
              />
            )}
            {comprehensiveData.service_case_studies_url && (
              <InfoCard 
                label="Case Studies" 
                value={comprehensiveData.service_case_studies_url}
                link={true}
              />
            )}
            {comprehensiveData.service_testimonials_url && (
              <InfoCard 
                label="Testimonials" 
                value={comprehensiveData.service_testimonials_url}
                link={true}
              />
            )}
          </div>

          {comprehensiveData.service_category && comprehensiveData.service_category.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Service Categories</p>
              <TagList items={comprehensiveData.service_category} colorClass="bg-teal-900/50 text-teal-300" />
            </div>
          )}

          {comprehensiveData.service_client_portfolio && comprehensiveData.service_client_portfolio.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Client Portfolio ({comprehensiveData.service_client_portfolio.length})</p>
              <TagList items={comprehensiveData.service_client_portfolio} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* Community/DAO Specific Section */}
      {orgType === 'community' && (comprehensiveData.community_type || comprehensiveData.community_member_count || comprehensiveData.community_initiatives) && (
        <DetailedSection title="Community/DAO Metrics" icon={Users} iconColor="text-indigo-400">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {comprehensiveData.community_member_count && (
              <MetricCard 
                label="Member Count" 
                value={comprehensiveData.community_member_count}
                icon={Users}
                color="text-blue-400"
              />
            )}
            {comprehensiveData.community_influence_reach && (
              <MetricCard 
                label="Influence Reach" 
                value={Math.round(comprehensiveData.community_influence_reach * 100)}
                suffix="%"
                icon={TrendingUp}
                color="text-green-400"
              />
            )}
          </div>

          {comprehensiveData.community_type && comprehensiveData.community_type.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Community Types</p>
              <TagList items={comprehensiveData.community_type} colorClass="bg-indigo-900/50 text-indigo-300" />
            </div>
          )}

          {comprehensiveData.community_initiatives && comprehensiveData.community_initiatives.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Community Initiatives</p>
              <TagList items={comprehensiveData.community_initiatives} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}

          {comprehensiveData.community_member_benefits && comprehensiveData.community_member_benefits.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Member Benefits</p>
              <TagList items={comprehensiveData.community_member_benefits} colorClass="bg-green-900/50 text-green-300" />
            </div>
          )}

          {comprehensiveData.community_mission_focus && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Mission Focus</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.community_mission_focus}
              </p>
            </div>
          )}

          {comprehensiveData.community_membership_model && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Membership Model</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.community_membership_model}
              </p>
            </div>
          )}

          {comprehensiveData.community_treasury_management && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Treasury Management</p>
              <p className="text-gray-300 text-sm bg-gray-800/30 border border-gray-700/30 rounded-lg p-3">
                {comprehensiveData.community_treasury_management}
              </p>
            </div>
          )}
        </DetailedSection>
      )}

      {/* NFT/Digital Assets Specific Section */}
      {orgType === 'nft' && (comprehensiveData.category || comprehensiveData.floor_price || comprehensiveData.collection_size) && (
        <DetailedSection title="NFT & Digital Assets" icon={ImageIcon} iconColor="text-purple-400">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {comprehensiveData.category && (
              <InfoCard label="Category" value={comprehensiveData.category} highlight={true} />
            )}
            {comprehensiveData.collection_size && (
              <MetricCard label="Collection Size" value={comprehensiveData.collection_size} suffix=" NFTs" icon={Hash} color="text-purple-400" />
            )}
            {comprehensiveData.floor_price && (
              <MetricCard label="Floor Price" value={comprehensiveData.floor_price} icon={DollarSign} color="text-green-400" />
            )}
            {comprehensiveData.total_volume && (
              <MetricCard label="Total Volume" value={comprehensiveData.total_volume} icon={TrendingUp} color="text-blue-400" />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {comprehensiveData.unique_holders && (
              <MetricCard 
                label="Unique Holders" 
                value={comprehensiveData.unique_holders}
                icon={Users}
                color="text-indigo-400"
              />
            )}
            {comprehensiveData.creator_royalties && (
              <MetricCard 
                label="Creator Royalties" 
                value={comprehensiveData.creator_royalties}
                suffix="%"
                icon={Percent}
                color="text-yellow-400"
              />
            )}
            {comprehensiveData.launch_mechanism && (
              <InfoCard 
                label="Launch Mechanism" 
                value={comprehensiveData.launch_mechanism}
              />
            )}
          </div>

          {comprehensiveData.utility_features && comprehensiveData.utility_features.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Utility Features</p>
              <TagList items={comprehensiveData.utility_features} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}

          {comprehensiveData.marketplace_integrations && comprehensiveData.marketplace_integrations.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Marketplace Integrations</p>
              <TagList items={comprehensiveData.marketplace_integrations} colorClass="bg-green-900/50 text-green-300" />
            </div>
          )}

          {comprehensiveData.asset_types && comprehensiveData.asset_types.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Asset Types</p>
              <TagList items={comprehensiveData.asset_types} colorClass="bg-indigo-900/50 text-indigo-300" />
            </div>
          )}

          {comprehensiveData.community_features && comprehensiveData.community_features.length > 0 && (
            <div className="mb-6">
              <p className="text-gray-400 text-sm mb-2">Community Features</p>
              <TagList items={comprehensiveData.community_features} colorClass="bg-rose-900/50 text-rose-300" />
            </div>
          )}
        </DetailedSection>
      )}

      {/* User Archetypes */}
      {comprehensiveData.user_archetypes && comprehensiveData.user_archetypes.length > 0 && (
        <DetailedSection title="User Archetypes" icon={User} iconColor="text-rose-400">
          <div className="space-y-4">
            {comprehensiveData.user_archetypes.map((archetype: any, index: number) => (
              <div key={index} className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                {typeof archetype === 'string' ? (
                  <p className="text-white">{archetype}</p>
                ) : (
                  <>
                    {archetype.archetype_name && (
                      <h5 className="text-white font-semibold mb-2">{archetype.archetype_name}</h5>
                    )}
                    <div className="flex gap-2 mb-2">
                      {archetype.size_estimate && (
                        <span className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-xs">
                          Size: {archetype.size_estimate}
                        </span>
                      )}
                      {archetype.priority_level && (
                        <span className="px-2 py-1 bg-purple-900/50 text-purple-300 rounded text-xs">
                          Priority: {archetype.priority_level}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </DetailedSection>
      )}

      {/* Unified Messaging Strategy */}
      {comprehensiveData.unified_messaging_approach && Object.keys(comprehensiveData.unified_messaging_approach).length > 0 && (
        <DetailedSection title="Unified Messaging Strategy" icon={MessageSquare} iconColor="text-amber-400">
          <div className="space-y-4">
            {Object.entries(comprehensiveData.unified_messaging_approach).map(([key, value]) => (
              <div key={key} className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg">
                <h5 className="text-white font-semibold mb-2 capitalize">{key.replace(/_/g, ' ')}</h5>
                {key === 'primary_channels' && Array.isArray(value) ? (
                  <div className="flex flex-wrap gap-2">
                    {value.map((channel: string) => (
                      <span 
                        key={channel}
                        className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-xs font-medium border border-amber-500/30"
                      >
                        {channel.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : Array.isArray(value) ? (
                  <div className="space-y-1">
                    {value.map((item: any, index: number) => (
                      <p key={index} className="text-gray-300 text-sm">• {String(item)}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm">{String(value)}</p>
                )}
              </div>
            ))}
          </div>
        </DetailedSection>
      )}
    </div>
  )
})

EnhancedICPDisplay.displayName = 'EnhancedICPDisplay'

export default EnhancedICPDisplay
