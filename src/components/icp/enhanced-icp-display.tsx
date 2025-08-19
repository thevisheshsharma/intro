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
  Info
} from 'lucide-react'

// Use the inferred type from the actual Zod schema but make it more flexible for dynamic content
type ComprehensiveICPAnalysis = z.infer<typeof ICPAnalysisSchema> & {
  // Extend with all possible category-specific fields as optional
  basic_identification: z.infer<typeof ICPAnalysisSchema>['basic_identification'] & {
    // Protocol fields
    protocol_category?: string
    chains_supported?: number | null
    supported_chains?: string[]
    protocol_type?: string
    // Gaming fields
    game_category?: string
    platform_type?: string
    nft_integration?: string
    // Investment fields
    fund_type?: 'VC' | 'Accelerator' | 'Family Office' | 'Corporate VC'
    investment_stage?: 'Agnostic' | 'Pre-seed' | 'Seed' | 'Series A'
    sector_focus?: string[]
    // Business fields
    service_category?: string[]
    target_clients?: string[]
    // Community fields
    community_type?: string[]
    governance_structure?: string
    mission_focus?: string
    membership_model?: string
    [key: string]: any
  }
  market_position: z.infer<typeof ICPAnalysisSchema>['market_position'] & {
    // DeFi metrics
    total_value_locked_usd?: number | null
    trading_volume_24h?: number | null
    active_users_30d?: number | null
    liquidity_depth?: 'high' | 'medium' | 'low' | null
    // Gaming metrics
    daily_active_players?: number | null
    game_economy_health?: string
    // Investment metrics
    fund_size_usd?: number | null
    portfolio_size?: number | null
    investments?: string[]
    market_reputation?: 'Tier S' | 'Tier A' | 'Tier B' | 'Tier C' | null
    // Business metrics
    client_portfolio?: string[]
    team_size?: number | null
    market_positioning?: string
    client_retention?: number | null
    // Community metrics
    member_count?: number | null
    community_health?: number | null
    influence_reach?: number | null
    [key: string]: any
  }
  core_metrics: z.infer<typeof ICPAnalysisSchema>['core_metrics'] & {
    // Protocol metrics
    audit_info?: {
      auditor: string
      date: Date
      report_url: string
    } | null
    // Gaming metrics
    gameplay_features?: string[]
    play_to_earn_mechanics?: string
    asset_ownership?: string
    // Business metrics
    service_offerings?: string[]
    delivery_methodology?: string
    // Community metrics
    community_initiatives?: string[]
    member_benefits?: string[]
    participation_mechanisms?: string[]
    impact_metrics?: string
    [key: string]: any
  }
}

interface EnhancedICPDisplayProps {
  icp: {
    grok_response?: string
    confidence_score?: number
    [key: string]: any
  }
  onEdit?: () => void
  editable?: boolean
}

// Helper function to safely parse the comprehensive ICP analysis JSON
function parseComprehensiveICPResponse(grokResponse?: string): ComprehensiveICPAnalysis | null {
  if (!grokResponse) return null
  
  try {
    const parsed = JSON.parse(grokResponse)
    console.log('🔍 Parsed comprehensive ICP analysis:', parsed)
    return parsed as ComprehensiveICPAnalysis
  } catch (error) {
    logParsingError(error, 'parsing comprehensive ICP response', 'JSON')
    return null
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  const comprehensiveData = useMemo(() => parseComprehensiveICPResponse(icp.grok_response), [icp.grok_response])

  if (!comprehensiveData) {
    return (
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-yellow-400" />
          <h3 className="text-xl font-bold text-white">ICP Analysis Unavailable</h3>
        </div>
        <p className="text-gray-400 mt-2">No comprehensive analysis data available.</p>
      </div>
    )
  }

  // Extract classification info for conditional rendering
  const orgType = comprehensiveData.classification_used?.org_type || 'protocol'
  const orgSubtype = comprehensiveData.classification_used?.org_subtype || 'general'

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

      {/* Analysis Metadata */}
      {comprehensiveData.analysis_metadata && (
        <DetailedSection title="Analysis Quality & Sources" icon={Info} iconColor="text-gray-400">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard 
              label="Confidence Score" 
              value={Math.round(comprehensiveData.analysis_metadata.confidence_score * 100)}
              suffix="%" 
              icon={CheckCircle}
              color="text-green-400"
            />
            <InfoCard 
              label="Sources Count" 
              value={comprehensiveData.analysis_metadata.research_sources?.length || 0}
            />
          </div>
        </DetailedSection>
      )}

      {/* Basic Identification - Universal + Category-Specific */}
      {comprehensiveData.basic_identification && (
        <DetailedSection title="Organization Overview" icon={Building2} iconColor="text-blue-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard 
              label="Project Name" 
              value={comprehensiveData.basic_identification.project_name} 
              highlight={true}
            />
            <InfoCard 
              label="Industry Classification" 
              value={comprehensiveData.basic_identification.industry_classification} 
            />
            <InfoCard 
              label="Website" 
              value={comprehensiveData.basic_identification.website_url} 
              link={true}
            />
          
          {/* TGE Status - Universal Field */}
          {comprehensiveData.basic_identification.tge_status && (
            <InfoCard 
              label="TGE Status" 
              value={comprehensiveData.basic_identification.tge_status === 'pre-tge' ? 'Pre-TGE' : 'Post-TGE'} 
              highlight={comprehensiveData.basic_identification.tge_status === 'post-tge'}
            />
          )}
        </div>

        {/* Technical Links */}
        {comprehensiveData.basic_identification.technical_links && (
          <div className="mt-6">
            <h5 className="text-white font-medium mb-3 flex items-center gap-2">
              <Code className="w-4 h-4 text-green-400" />
              Technical Resources
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comprehensiveData.basic_identification.technical_links.github_url && (
                <InfoCard 
                  label="GitHub Repository" 
                  value={comprehensiveData.basic_identification.technical_links.github_url} 
                  link={true}
                />
              )}
              {comprehensiveData.basic_identification.technical_links.whitepaper_url && (
                <InfoCard 
                  label="Documentation" 
                  value={comprehensiveData.basic_identification.technical_links.whitepaper_url} 
                  link={true}
                />
              )}
            </div>
          </div>
        )}

        {/* Community Links - Updated for new schema */}
        {comprehensiveData.basic_identification.community_links && (
          <div className="mt-6">
            <h5 className="text-white font-medium mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Community Platforms
            </h5>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {comprehensiveData.basic_identification.community_links.discord && (
                <InfoCard 
                  label="Discord" 
                  value={comprehensiveData.basic_identification.community_links.discord} 
                  link={true}
                />
              )}
              {comprehensiveData.basic_identification.community_links.telegram && (
                <InfoCard 
                  label="Telegram" 
                  value={comprehensiveData.basic_identification.community_links.telegram} 
                  link={true}
                />
              )}
              {comprehensiveData.basic_identification.community_links.farcaster && (
                <InfoCard 
                  label="Farcaster" 
                  value={comprehensiveData.basic_identification.community_links.farcaster} 
                  link={true}
                />
              )}
              {comprehensiveData.basic_identification.community_links.governance_forum && (
                <InfoCard 
                  label="Governance Forum" 
                  value={comprehensiveData.basic_identification.community_links.governance_forum} 
                  link={true}
                />
              )}
            </div>
          </div>
        )}

        {/* Category-Specific Fields */}
        <div className="mt-6 space-y-4">
          {/* Protocol-Specific Fields */}
          {orgType === 'protocol' && (
            <>
              {comprehensiveData.basic_identification.protocol_category && (
                <InfoCard 
                  label="Protocol Category" 
                  value={comprehensiveData.basic_identification.protocol_category} 
                />
              )}
              {comprehensiveData.basic_identification.supported_chains && comprehensiveData.basic_identification.supported_chains.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Supported Chains ({comprehensiveData.basic_identification.supported_chains.length})</p>
                  <TagList items={comprehensiveData.basic_identification.supported_chains} colorClass="bg-green-900/50 text-green-300" />
                </div>
              )}
            </>
          )}
          
          {/* Investment-Specific Fields */}
          {orgType === 'investment' && (
            <>
              {comprehensiveData.basic_identification.fund_type && (
                <InfoCard 
                  label="Fund Type" 
                  value={comprehensiveData.basic_identification.fund_type} 
                />
              )}
              {comprehensiveData.basic_identification.sector_focus && comprehensiveData.basic_identification.sector_focus.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Sector Focus</p>
                  <TagList items={comprehensiveData.basic_identification.sector_focus} colorClass="bg-purple-900/50 text-purple-300" />
                </div>
              )}
            </>
          )}
          
          {/* Service Provider-Specific Fields */}
          {orgType === 'service' && (
            <>
              {comprehensiveData.basic_identification.service_category && comprehensiveData.basic_identification.service_category.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Service Categories</p>
                  <TagList items={comprehensiveData.basic_identification.service_category} colorClass="bg-orange-900/50 text-orange-300" />
                </div>
              )}
            </>
          )}
          
          {/* Community-Specific Fields */}
          {orgType === 'community' && (
            <>
              {comprehensiveData.basic_identification.community_type && comprehensiveData.basic_identification.community_type.length > 0 && (
                <div>
                  <p className="text-gray-400 text-sm mb-2">Community Types</p>
                  <TagList items={comprehensiveData.basic_identification.community_type} colorClass="bg-purple-900/50 text-purple-300" />
                </div>
              )}
            </>
          )}
        </div>
      </DetailedSection>
      )}

      {/* Market Position - Updated for new schema */}
      {comprehensiveData.market_position && (
        <DetailedSection title="Market Position & Competitive Landscape" icon={BarChart3} iconColor="text-green-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard 
              label="Sentiment Score" 
              value={comprehensiveData.market_position.sentiment_score}
              suffix="/1.0"
              icon={TrendingUp}
              color="text-yellow-400"
            />
            <InfoCard 
              label="Market Presence" 
              value={comprehensiveData.market_position.market_presence}
              highlight={true}
            />
            <InfoCard 
              label="Competitive Position" 
              value={comprehensiveData.market_position.competitive_position}
            />
          </div>

        {/* Competitors List - New field */}
        {comprehensiveData.market_position.competitors && comprehensiveData.market_position.competitors.length > 0 && (
          <div className="mt-6">
            <p className="text-gray-400 text-sm mb-2">Primary Competitors ({comprehensiveData.market_position.competitors.length})</p>
            <TagList items={comprehensiveData.market_position.competitors} colorClass="bg-red-900/50 text-red-300" />
          </div>
        )}

        {/* Category-Specific Market Metrics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* DeFi Metrics */}
          {orgType === 'protocol' && orgSubtype === 'defi' && (
            <>
              {comprehensiveData.market_position.total_value_locked_usd && (
                <MetricCard 
                  label="Total Value Locked" 
                  value={`$${(comprehensiveData.market_position.total_value_locked_usd / 1000000).toFixed(1)}M`}
                  icon={DollarSign}
                  color="text-green-400"
                />
              )}
              {comprehensiveData.market_position.trading_volume_24h && (
                <MetricCard 
                  label="24h Volume" 
                  value={`$${(comprehensiveData.market_position.trading_volume_24h / 1000000).toFixed(1)}M`}
                  icon={Activity}
                  color="text-blue-400"
                />
              )}
            </>
          )}
          
          {/* Investment Metrics */}
          {orgType === 'investment' && (
            <>
              {comprehensiveData.market_position.fund_size_usd && (
                <MetricCard 
                  label="Fund Size" 
                  value={`$${(comprehensiveData.market_position.fund_size_usd / 1000000).toFixed(0)}M`}
                  icon={Coins}
                  color="text-blue-400"
                />
              )}
              {comprehensiveData.market_position.portfolio_size && (
                <MetricCard 
                  label="Portfolio Size" 
                  value={comprehensiveData.market_position.portfolio_size}
                  icon={PieChart}
                  color="text-purple-400"
                />
              )}
            </>
          )}
          
          {/* Community Metrics */}
          {orgType === 'community' && (
            <>
              {comprehensiveData.market_position.member_count && (
                <MetricCard 
                  label="Member Count" 
                  value={comprehensiveData.market_position.member_count}
                  icon={Users}
                  color="text-blue-400"
                />
              )}
            </>
          )}
        </div>
      </DetailedSection>
      )}

      {/* Core Metrics - Updated for new schema */}
      {comprehensiveData.core_metrics && (
        <DetailedSection title="Core Capabilities & Features" icon={Target} iconColor="text-purple-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard 
              label="Primary Value Proposition" 
              value={comprehensiveData.core_metrics.primary_value_proposition}
              highlight={true}
            />
            <InfoCard 
              label="Target Audience" 
              value={comprehensiveData.core_metrics.target_audience}
            />
            <InfoCard 
              label="Operational Status" 
              value={comprehensiveData.core_metrics.operational_status}
            />
          </div>

        {/* Geographic Focus - New field */}
        {comprehensiveData.core_metrics.geographic_focus && comprehensiveData.core_metrics.geographic_focus.length > 0 && (
          <div className="mt-6">
            <p className="text-gray-400 text-sm mb-2">Geographic Focus ({comprehensiveData.core_metrics.geographic_focus.length} regions)</p>
            <TagList items={comprehensiveData.core_metrics.geographic_focus} colorClass="bg-indigo-900/50 text-indigo-300" />
          </div>
        )}

        {comprehensiveData.core_metrics.key_features && comprehensiveData.core_metrics.key_features.length > 0 && (
          <div className="mt-6">
            <p className="text-gray-400 text-sm mb-2">Key Features & Capabilities</p>
            <TagList items={comprehensiveData.core_metrics.key_features} colorClass="bg-yellow-900/50 text-yellow-300" />
          </div>
        )}
      </DetailedSection>
      )}

      {/* ICP Synthesis - Updated for new simplified schema */}
      {comprehensiveData.icp_synthesis && (
        <DetailedSection title="Ideal Customer Profile Synthesis" icon={Target} iconColor="text-red-400">
          <div className="space-y-8">
            
            {/* User Archetypes - Simplified Structure */}
            {comprehensiveData.icp_synthesis.user_archetypes && comprehensiveData.icp_synthesis.user_archetypes.length > 0 && (
              <div className="space-y-6">
                <h5 className="text-white font-medium mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  User Archetypes ({comprehensiveData.icp_synthesis.user_archetypes.length})
                </h5>
                
                <div className="grid gap-4">
                  {comprehensiveData.icp_synthesis.user_archetypes.map((archetype, index) => (
                    <div key={index} className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h6 className="text-lg font-semibold text-white">{archetype.archetype_name}</h6>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            archetype.size_estimate === 'large' ? 'bg-green-900/50 text-green-300' :
                            archetype.size_estimate === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
                            'bg-gray-900/50 text-gray-300'
                          }`}>
                            {archetype.size_estimate} segment
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            archetype.priority_level === 'primary' ? 'bg-blue-900/50 text-blue-300' :
                            archetype.priority_level === 'secondary' ? 'bg-purple-900/50 text-purple-300' :
                            'bg-gray-900/50 text-gray-300'
                          }`}>
                            {archetype.priority_level}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unified Profiles - Applied across all archetypes */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Unified Demographics */}
              {comprehensiveData.icp_synthesis.unified_demographics && (
                <div>
                  <h5 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Unified Demographics (All Archetypes)
                  </h5>
                  <div className="space-y-3 bg-gray-800/20 border border-gray-700/30 rounded-lg p-4">
                    <InfoCard 
                      label="Age Demographics" 
                      value={comprehensiveData.icp_synthesis.unified_demographics.age_demographics.join(', ')}
                    />
                    <InfoCard 
                      label="Experience Level" 
                      value={comprehensiveData.icp_synthesis.unified_demographics.experience_level.join(', ')}
                    />
                    {comprehensiveData.icp_synthesis.unified_demographics.professional_roles && comprehensiveData.icp_synthesis.unified_demographics.professional_roles.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Professional Roles</p>
                        <TagList items={comprehensiveData.icp_synthesis.unified_demographics.professional_roles} colorClass="bg-blue-900/50 text-blue-300" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Unified Psychographics */}
              {comprehensiveData.icp_synthesis.unified_psychographics && (
                <div>
                  <h5 className="text-pink-400 font-medium mb-3 flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    Unified Psychographics (All Archetypes)
                  </h5>
                  <div className="space-y-3 bg-gray-800/20 border border-gray-700/30 rounded-lg p-4">
                    {comprehensiveData.icp_synthesis.unified_psychographics.core_motivations && comprehensiveData.icp_synthesis.unified_psychographics.core_motivations.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Core Motivations</p>
                        <TagList items={comprehensiveData.icp_synthesis.unified_psychographics.core_motivations} colorClass="bg-green-900/50 text-green-300" />
                      </div>
                    )}
                    {comprehensiveData.icp_synthesis.unified_psychographics.decision_drivers && comprehensiveData.icp_synthesis.unified_psychographics.decision_drivers.length > 0 && (
                      <div>
                        <p className="text-gray-400 text-xs mb-1">Decision Drivers</p>
                        <TagList items={comprehensiveData.icp_synthesis.unified_psychographics.decision_drivers} colorClass="bg-purple-900/50 text-purple-300" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Unified Behavioral Patterns */}
            {comprehensiveData.icp_synthesis.unified_behavioral_patterns && (
              <div>
                <h5 className="text-green-400 font-medium mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Unified Behavioral Patterns (All Archetypes)
                </h5>
                <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 space-y-3">
                  {comprehensiveData.icp_synthesis.unified_behavioral_patterns.interaction_preferences && comprehensiveData.icp_synthesis.unified_behavioral_patterns.interaction_preferences.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Interaction Preferences</p>
                      <TagList items={comprehensiveData.icp_synthesis.unified_behavioral_patterns.interaction_preferences} colorClass="bg-cyan-900/50 text-cyan-300" />
                    </div>
                  )}
                  {comprehensiveData.icp_synthesis.unified_behavioral_patterns.activity_patterns && comprehensiveData.icp_synthesis.unified_behavioral_patterns.activity_patterns.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Activity Patterns</p>
                      <TagList items={comprehensiveData.icp_synthesis.unified_behavioral_patterns.activity_patterns} colorClass="bg-orange-900/50 text-orange-300" />
                    </div>
                  )}
                  {comprehensiveData.icp_synthesis.unified_behavioral_patterns.conversion_factors && comprehensiveData.icp_synthesis.unified_behavioral_patterns.conversion_factors.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Conversion Factors</p>
                      <TagList items={comprehensiveData.icp_synthesis.unified_behavioral_patterns.conversion_factors} colorClass="bg-green-900/50 text-green-300" />
                    </div>
                  )}
                  {comprehensiveData.icp_synthesis.unified_behavioral_patterns.loyalty_indicators && comprehensiveData.icp_synthesis.unified_behavioral_patterns.loyalty_indicators.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Loyalty Indicators</p>
                      <TagList items={comprehensiveData.icp_synthesis.unified_behavioral_patterns.loyalty_indicators} colorClass="bg-purple-900/50 text-purple-300" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Unified Messaging Approach */}
            {comprehensiveData.icp_synthesis.unified_messaging_approach && (
              <div>
                <h5 className="text-yellow-400 font-medium mb-3 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Unified Messaging Strategy (All Archetypes)
                </h5>
                <div className="bg-gray-800/20 border border-gray-700/30 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoCard 
                      label="Preferred Tone" 
                      value={comprehensiveData.icp_synthesis.unified_messaging_approach.preferred_tone}
                      highlight={true}
                    />
                  </div>
                  
                  {comprehensiveData.icp_synthesis.unified_messaging_approach.key_messages && comprehensiveData.icp_synthesis.unified_messaging_approach.key_messages.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Key Messages</p>
                      <TagList items={comprehensiveData.icp_synthesis.unified_messaging_approach.key_messages} colorClass="bg-blue-900/50 text-blue-300" />
                    </div>
                  )}
                  
                  {comprehensiveData.icp_synthesis.unified_messaging_approach.content_strategy && comprehensiveData.icp_synthesis.unified_messaging_approach.content_strategy.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Content Strategy</p>
                      <TagList items={comprehensiveData.icp_synthesis.unified_messaging_approach.content_strategy} colorClass="bg-indigo-900/50 text-indigo-300" />
                    </div>
                  )}
                  
                  {comprehensiveData.icp_synthesis.unified_messaging_approach.channel_strategy && comprehensiveData.icp_synthesis.unified_messaging_approach.channel_strategy.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Channel Strategy</p>
                      <TagList items={comprehensiveData.icp_synthesis.unified_messaging_approach.channel_strategy} colorClass="bg-green-900/50 text-green-300" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </DetailedSection>
      )}

      {/* Research Sources */}
      {comprehensiveData.analysis_metadata?.research_sources && comprehensiveData.analysis_metadata.research_sources.length > 0 && (
        <DetailedSection title="Research Sources" icon={Globe} iconColor="text-gray-400">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {comprehensiveData.analysis_metadata.research_sources.map((source, index) => (
              <div key={index} className="text-sm text-gray-400 flex items-center gap-2">
                <Link className="w-3 h-3" />
                {source.startsWith('http') ? (
                  <a href={source} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                    {source}
                  </a>
                ) : (
                  <span>{source}</span>
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
