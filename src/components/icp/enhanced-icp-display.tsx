'use client'

import React, { useState, useMemo } from 'react'
import { logParsingError } from '@/lib/error-utils'
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
  Award
} from 'lucide-react'
import type { OrganizationICP, DetailedICPAnalysisResponse } from '@/lib/organization'

interface EnhancedICPDisplayProps {
  icp: OrganizationICP
  onEdit?: () => void
  editable?: boolean
}

// Helper function to safely parse JSON from grok_response
function parseGrokResponse(grokResponse?: string): DetailedICPAnalysisResponse | null {
  if (!grokResponse) return null
  
  try {
    return JSON.parse(grokResponse)
  } catch (error) {
    logParsingError(error, 'parsing Grok response', 'JSON')
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
  <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
    <div className="flex items-center gap-2 mb-3">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <h4 className="text-lg font-medium text-white">{title}</h4>
    </div>
    {children}
  </div>
)

const InfoCard = ({ label, value, highlight = false }: { 
  label: string
  value: string | number | undefined
  highlight?: boolean 
}) => {
  if (!value) return null
  
  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 ${highlight ? 'border border-blue-500/30' : ''}`}>
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  )
}

const TagList = ({ items, colorClass = "bg-blue-900/50 text-blue-300" }: {
  items: string[] | undefined
  colorClass?: string
}) => {
  if (!items || items.length === 0) return null
  
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <span key={index} className={`px-3 py-1 rounded-full text-sm ${colorClass}`}>
          {item}
        </span>
      ))}
    </div>
  )
}

export const EnhancedICPDisplay = React.memo(function EnhancedICPDisplay({ 
  icp, 
  onEdit, 
  editable = false 
}: EnhancedICPDisplayProps) {
  // Parse the detailed Grok response
  const detailedData = useMemo(() => parseGrokResponse(icp.grok_response), [icp.grok_response])
  
  const confidenceColor = 
    (icp.confidence_score || 0) >= 0.8 ? 'text-green-400' :
    (icp.confidence_score || 0) >= 0.6 ? 'text-yellow-400' : 'text-red-400'

  const confidenceText = 
    (icp.confidence_score || 0) >= 0.8 ? 'High' :
    (icp.confidence_score || 0) >= 0.6 ? 'Medium' : 'Low'

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-400" />
          <h3 className="text-2xl font-bold text-white">
            Enhanced ICP Analysis
          </h3>
          {/* Removed icp.is_custom, which does not exist on OrganizationICP */}
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${confidenceColor} bg-gray-700`}>
            {confidenceText} Confidence ({Math.round((icp.confidence_score || 0) * 100)}%)
          </div>
          {editable && (
            <button
              onClick={onEdit}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Edit ICP
            </button>
          )}
        </div>
      </div>

      {/* Basic Information from Detailed Response */}
      {detailedData?.basic_identification && (
        <DetailedSection title="Organization Overview" icon={Building2} iconColor="text-blue-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoCard 
              label="Project Name" 
              value={detailedData.basic_identification.project_name} 
              highlight={true}
            />
            <InfoCard 
              label="Industry" 
              value={detailedData.basic_identification.industry_classification} 
            />
            <InfoCard 
              label="Protocol Category" 
              value={detailedData.basic_identification.protocol_category} 
            />
            {detailedData.basic_identification.website_url && (
              <div className="bg-gray-800/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Website</p>
                <a 
                  href={detailedData.basic_identification.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm underline"
                >
                  {detailedData.basic_identification.website_url}
                </a>
              </div>
            )}
          </div>
          
          {/* Technical & Community Links */}
          <div className="mt-4 space-y-3">
            {detailedData.basic_identification.technical_links && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Technical Resources</p>
                <div className="flex flex-wrap gap-2">
                  {detailedData.basic_identification.technical_links.github_url && (
                    <a href={detailedData.basic_identification.technical_links.github_url} 
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                      <Code className="w-4 h-4" />
                      GitHub
                    </a>
                  )}
                  {detailedData.basic_identification.technical_links.npmjs_url && (
                    <a href={detailedData.basic_identification.technical_links.npmjs_url}
                       target="_blank" rel="noopener noreferrer" 
                       className="inline-flex items-center gap-1 bg-red-700 hover:bg-red-600 text-white px-3 py-1 rounded text-sm transition-colors">
                      <Database className="w-4 h-4" />
                      NPM
                    </a>
                  )}
                  {detailedData.basic_identification.technical_links.whitepaper_url && (
                    <a href={detailedData.basic_identification.technical_links.whitepaper_url}
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 bg-purple-700 hover:bg-purple-600 text-white px-3 py-1 rounded text-sm transition-colors">
                      <Shield className="w-4 h-4" />
                      Whitepaper
                    </a>
                  )}
                </div>
              </div>
            )}
            
            {detailedData.basic_identification.community_links && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Community Channels</p>
                <div className="flex flex-wrap gap-2">
                  {detailedData.basic_identification.community_links.discord && (
                    <a href={detailedData.basic_identification.community_links.discord}
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 bg-indigo-700 hover:bg-indigo-600 text-white px-3 py-1 rounded text-sm transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      Discord
                    </a>
                  )}
                  {detailedData.basic_identification.community_links.telegram && (
                    <a href={detailedData.basic_identification.community_links.telegram}
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 bg-blue-700 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors">
                      <MessageSquare className="w-4 h-4" />
                      Telegram
                    </a>
                  )}
                  {detailedData.basic_identification.community_links.farcaster && (
                    <a href={detailedData.basic_identification.community_links.farcaster}
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors">
                      <Globe className="w-4 h-4" />
                      Warpcast
                    </a>
                  )}
                  {detailedData.basic_identification.community_links.governance_forum && (
                    <a href={detailedData.basic_identification.community_links.governance_forum}
                       target="_blank" rel="noopener noreferrer"
                       className="inline-flex items-center gap-1 bg-blue-500 hover:bg-blue-400 text-white px-3 py-1 rounded text-sm transition-colors">
                      <Link className="w-4 h-4" />
                      Governance
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </DetailedSection>
      )}

      {/* Core Metrics */}
      {detailedData?.core_metrics && (
        <DetailedSection title="Key Metrics & Performance" icon={BarChart3} iconColor="text-green-400">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {detailedData.core_metrics.market_position.total_value_locked_usd && (
              <InfoCard 
                label="Total Value Locked" 
                value={`$${detailedData.core_metrics.market_position.total_value_locked_usd.toLocaleString()}`}
                highlight={true}
              />
            )}
            {detailedData.core_metrics.market_position.twitter_followers && (
              <InfoCard 
                label="Twitter Followers" 
                value={detailedData.core_metrics.market_position.twitter_followers.toLocaleString()}
              />
            )}
            {detailedData.core_metrics.market_position.discord_members_est && (
              <InfoCard 
                label="Discord Members (Est.)" 
                value={detailedData.core_metrics.market_position.discord_members_est.toLocaleString()}
              />
            )}
            {detailedData.core_metrics.market_position.chains_supported && (
              <InfoCard 
                label="Chains Supported" 
                value={detailedData.core_metrics.market_position.chains_supported}
              />
            )}
            {/* NEW: Active Addresses 30d */}
            {detailedData.core_metrics.market_position.active_addresses_30d && (
              <InfoCard 
                label="Active Addresses (30d)" 
                value={detailedData.core_metrics.market_position.active_addresses_30d.toLocaleString()} 
              />
            )}
            {/* NEW: Sentiment Score */}
            {typeof detailedData.core_metrics.market_position.sentiment_score === 'number' && (
              <InfoCard 
                label="Sentiment Score" 
                value={detailedData.core_metrics.market_position.sentiment_score.toFixed(2)} 
              />
            )}
          </div>
          
          {/* Key Features */}
          {detailedData.core_metrics.key_features && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-300 mb-2">Key Features</p>
              <TagList items={detailedData.core_metrics.key_features} colorClass="bg-green-900/50 text-green-300" />
            </div>
          )}
          
          {/* Operational Chains */}
          {detailedData.core_metrics.operational_chains && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-300 mb-2">Operational Chains</p>
              <TagList items={detailedData.core_metrics.operational_chains} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}

          {/* NEW: Audit Info */}
          {detailedData.core_metrics.audit_info && (
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-300 mb-2">Audit Information</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {detailedData.core_metrics.audit_info.auditor && (
                  <InfoCard 
                    label="Auditor" 
                    value={detailedData.core_metrics.audit_info.auditor} 
                  />
                )}
                {detailedData.core_metrics.audit_info.date && (
                  <InfoCard 
                    label="Audit Date" 
                    value={detailedData.core_metrics.audit_info.date} 
                  />
                )}
                {detailedData.core_metrics.audit_info.report_url && (
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Audit Report</p>
                    <a 
                      href={detailedData.core_metrics.audit_info.report_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-sm underline"
                    >
                      View Report
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </DetailedSection>
      )}

      {/* ICP Synthesis - The core of the analysis */}
      {detailedData?.icp_synthesis && (
        <DetailedSection title="Ideal Customer Profile Synthesis" icon={Target} iconColor="text-blue-400">
          <div className="space-y-6">
            {/* Target Segment */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h5 className="text-lg font-medium text-blue-300 mb-2">Target Web3 Segment</h5>
              <p className="text-white">{detailedData.icp_synthesis.target_web3_segment}</p>
            </div>
            
            {/* User Archetypes */}
            {detailedData.icp_synthesis.primary_user_archetypes && (
              <div>
                <h5 className="text-sm font-medium text-gray-300 mb-2">Primary User Archetypes</h5>
                <TagList items={detailedData.icp_synthesis.primary_user_archetypes} colorClass="bg-blue-900/50 text-blue-300" />
              </div>
            )}
            
            {/* Demographics */}
            {detailedData.icp_synthesis.demographic_profile && (
              <div>
                <h5 className="text-lg font-medium text-green-400 mb-3">Demographics</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <InfoCard 
                    label="Vibe Range" 
                    value={detailedData.icp_synthesis.demographic_profile.vibe_range}
                  />
                  <InfoCard 
                    label="Experience Level" 
                    value={detailedData.icp_synthesis.demographic_profile.experience_level}
                  />
                  <InfoCard 
                    label="Geographic Distribution" 
                    value={detailedData.icp_synthesis.demographic_profile.geographic_distribution}
                  />
                </div>
                {detailedData.icp_synthesis.demographic_profile.roles && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-300 mb-2">Target Roles</p>
                    <TagList items={detailedData.icp_synthesis.demographic_profile.roles} colorClass="bg-green-900/50 text-green-300" />
                  </div>
                )}
              </div>
            )}
            
            {/* Psychographics */}
            {detailedData.icp_synthesis.psychographic_drivers && (
              <div>
                <h5 className="text-lg font-medium text-red-400 mb-3">Psychographic Drivers</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailedData.icp_synthesis.psychographic_drivers.core_values && (
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-2">Core Values</p>
                      <TagList items={detailedData.icp_synthesis.psychographic_drivers.core_values} colorClass="bg-red-900/50 text-red-300" />
                    </div>
                  )}
                  {detailedData.icp_synthesis.psychographic_drivers.primary_motivations && (
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-2">Primary Motivations</p>
                      <TagList items={detailedData.icp_synthesis.psychographic_drivers.primary_motivations} colorClass="bg-orange-900/50 text-orange-300" />
                    </div>
                  )}
                  {detailedData.icp_synthesis.psychographic_drivers.key_challenges && (
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-2">Key Challenges</p>
                      <TagList items={detailedData.icp_synthesis.psychographic_drivers.key_challenges} colorClass="bg-yellow-900/50 text-yellow-300" />
                    </div>
                  )}
                  {detailedData.icp_synthesis.psychographic_drivers.trending_interests && (
                    <div>
                      <p className="text-sm font-medium text-gray-300 mb-2">Trending Interests</p>
                      <TagList items={detailedData.icp_synthesis.psychographic_drivers.trending_interests} colorClass="bg-pink-900/50 text-pink-300" />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Behavioral Indicators */}
            {detailedData.icp_synthesis.behavioral_indicators && (
              <div>
                <h5 className="text-lg font-medium text-purple-400 mb-3">Behavioral Indicators</h5>
                {detailedData.icp_synthesis.behavioral_indicators.purchase_motives && (
                  <div>
                    <p className="text-sm font-medium text-gray-300 mb-2">Purchase Motives</p>
                    <TagList items={detailedData.icp_synthesis.behavioral_indicators.purchase_motives} colorClass="bg-purple-900/50 text-purple-300" />
                  </div>
                )}
              </div>
            )}
          </div>
        </DetailedSection>
      )}

      {/* User Behavior Insights */}
      {detailedData?.user_behavior_insights && (
        <DetailedSection title="User Behavior Insights" icon={Activity} iconColor="text-purple-400">
          {detailedData.user_behavior_insights.onchain_activity_patterns && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-300 mb-2">On-Chain Activity Patterns</p>
              <TagList items={detailedData.user_behavior_insights.onchain_activity_patterns} colorClass="bg-purple-900/50 text-purple-300" />
            </div>
          )}
          
          {detailedData.user_behavior_insights.engagement_characteristics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InfoCard 
                label="Participation Style" 
                value={detailedData.user_behavior_insights.engagement_characteristics.participation_style}
              />
              <InfoCard 
                label="Engagement Level" 
                value={detailedData.user_behavior_insights.engagement_characteristics.engagement_level}
              />
              <InfoCard 
                label="Decision Making Style" 
                value={detailedData.user_behavior_insights.engagement_characteristics.decision_making_style}
              />
            </div>
          )}
        </DetailedSection>
      )}

      {/* Messaging Strategy */}
      {detailedData?.messaging_strategy && (
        <DetailedSection title="Messaging Strategy" icon={MessageSquare} iconColor="text-yellow-400">
          <div className="space-y-4">
            <InfoCard 
              label="Communication Style" 
              value={detailedData.messaging_strategy.communication_style}
              highlight={true}
            />
            
            {detailedData.messaging_strategy.key_messaging_angles && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Key Messaging Angles</p>
                <TagList items={detailedData.messaging_strategy.key_messaging_angles} colorClass="bg-yellow-900/50 text-yellow-300" />
              </div>
            )}
            
            {detailedData.messaging_strategy.content_keywords && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Content Keywords</p>
                <TagList items={detailedData.messaging_strategy.content_keywords} colorClass="bg-orange-900/50 text-orange-300" />
              </div>
            )}
          </div>
        </DetailedSection>
      )}

      {/* Governance & Tokenomics */}
      {detailedData?.governance_tokenomics && (
        <DetailedSection title="Governance & Tokenomics" icon={DollarSign} iconColor="text-green-400">
          {detailedData.governance_tokenomics.tokenomics && (
            <div className="space-y-4">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <h5 className="text-lg font-medium text-green-300 mb-2">Token Information</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InfoCard 
                    label="Native Token" 
                    value={detailedData.governance_tokenomics.tokenomics.native_token}
                    highlight={true}
                  />
                </div>
                <p className="text-white mt-3">{detailedData.governance_tokenomics.tokenomics.description}</p>
                
                {/* Token Utilities */}
                {detailedData.governance_tokenomics.tokenomics.utility && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-300 mb-2">Token Utilities</p>
                    <div className="flex flex-wrap gap-2">
                      {detailedData.governance_tokenomics.tokenomics.utility.governance && (
                        <span className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full text-sm">Governance</span>
                      )}
                      {detailedData.governance_tokenomics.tokenomics.utility.staking && (
                        <span className="bg-green-900/50 text-green-300 px-3 py-1 rounded-full text-sm">Staking</span>
                      )}
                      {detailedData.governance_tokenomics.tokenomics.utility.fee_discount && (
                        <span className="bg-yellow-900/50 text-yellow-300 px-3 py-1 rounded-full text-sm">Fee Discount</span>
                      )}
                      {detailedData.governance_tokenomics.tokenomics.utility.collateral && (
                        <span className="bg-purple-900/50 text-purple-300 px-3 py-1 rounded-full text-sm">Collateral</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Organizational Structure */}
              {detailedData.governance_tokenomics.organizational_structure && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <InfoCard 
                    label="Governance Model" 
                    value={detailedData.governance_tokenomics.organizational_structure.governance}
                  />
                  <InfoCard 
                    label="Team Structure" 
                    value={detailedData.governance_tokenomics.organizational_structure.team_structure}
                  />
                  <InfoCard 
                    label="Funding Information" 
                    value={detailedData.governance_tokenomics.organizational_structure.funding_info}
                  />
                </div>
              )}
            </div>
          )}
        </DetailedSection>
      )}

      {/* Ecosystem Analysis */}
      {detailedData?.ecosystem_analysis && (
        <DetailedSection title="Ecosystem Analysis" icon={Network} iconColor="text-cyan-400">
          <div className="space-y-4">
            {detailedData.ecosystem_analysis.market_narratives && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Market Narratives</p>
                <TagList items={detailedData.ecosystem_analysis.market_narratives} colorClass="bg-cyan-900/50 text-cyan-300" />
              </div>
            )}
            
            {detailedData.ecosystem_analysis.notable_partnerships && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Notable Partnerships</p>
                <TagList items={detailedData.ecosystem_analysis.notable_partnerships} colorClass="bg-teal-900/50 text-teal-300" />
              </div>
            )}
            
            {detailedData.ecosystem_analysis.recent_developments && (
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Recent Developments</p>
                <div className="space-y-2">
                  {detailedData.ecosystem_analysis.recent_developments.map((development: string, index: number) => (
                    <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                      <p className="text-white text-sm">{development}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DetailedSection>
      )}

      {/* Research Sources */}
      {detailedData?.research_sources && (
        <DetailedSection title="Research Sources & Confidence" icon={Award} iconColor="text-amber-400">
          <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-4">
            <p className="text-sm font-medium text-amber-300 mb-2">Analysis Based On</p>
            <TagList items={detailedData.research_sources} colorClass="bg-amber-900/50 text-amber-300" />
          </div>
        </DetailedSection>
      )}

      {/* Fallback to Legacy Display if no detailed data */}
      {!detailedData && (
        <div className="space-y-6">
          {/* Core ICP Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Target Industry & Role from structured data */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-blue-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Target Industry</h4>
                  <p className="text-white">
                    {icp.basic_identification?.industry_classification || 
                     icp.basic_identification?.protocol_category || 
                     'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-green-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Target Role</h4>
                  <p className="text-white">
                    {icp.icp_synthesis?.primary_user_archetypes?.join(', ') || 
                     icp.icp_synthesis?.target_web3_segment || 
                     'Not specified'}
                  </p>
                </div>
              </div>
            </div>

            {/* Company Size & Location */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-yellow-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Experience Level</h4>
                  <p className="text-white">
                    {icp.icp_synthesis?.demographic_profile?.experience_level || 
                     icp.icp_synthesis?.demographic_profile?.vibe_range || 
                     'Not specified'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-purple-400 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-300 mb-1">Geographic Distribution</h4>
                  <p className="text-white">
                    {icp.icp_synthesis?.demographic_profile?.geographic_distribution || 'Not specified'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pain Points from structured data */}
          {icp.icp_synthesis?.psychographic_drivers?.key_challenges && 
           icp.icp_synthesis.psychographic_drivers.key_challenges.length > 0 && (
            <DetailedSection title="Key Challenges" icon={AlertCircle} iconColor="text-red-400">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {icp.icp_synthesis.psychographic_drivers.key_challenges.map((point: string, index: number) => (
                  <div key={index} className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-white text-sm">{point}</p>
                  </div>
                ))}
              </div>
            </DetailedSection>
          )}

          {/* Keywords from structured data */}
          {icp.messaging_strategy?.content_keywords && 
           icp.messaging_strategy.content_keywords.length > 0 && (
            <DetailedSection title="Content Keywords" icon={Zap} iconColor="text-blue-400">
              <TagList items={icp.messaging_strategy.content_keywords} />
            </DetailedSection>
          )}
        </div>
      )}

      {/* Custom Notes */}
      {icp.custom_notes && (
        <div className="bg-purple-900/20 border border-purple-600/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <h4 className="text-sm font-medium text-purple-300">Custom Notes</h4>
          </div>
          <p className="text-white text-sm">{icp.custom_notes}</p>
        </div>
      )}
    </div>
  )
})
