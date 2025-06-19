import React from 'react'
import { 
  Building2, 
  Users, 
  MapPin, 
  Target, 
  TrendingUp, 
  MessageSquare,
  Brain,
  Heart,
  Zap,
  AlertCircle
} from 'lucide-react'
import type { OrganizationICP } from '@/lib/organization'

interface ICPDisplayProps {
  icp: OrganizationICP
  onEdit?: () => void
  editable?: boolean
}

export const ICPDisplay = React.memo(function ICPDisplay({ icp, onEdit, editable = false }: ICPDisplayProps) {
  const confidenceColor = 
    (icp.confidence_score || 0) >= 0.8 ? 'text-green-400' :
    (icp.confidence_score || 0) >= 0.6 ? 'text-yellow-400' : 'text-red-400'

  const confidenceText = 
    (icp.confidence_score || 0) >= 0.8 ? 'High' :
    (icp.confidence_score || 0) >= 0.6 ? 'Medium' : 'Low'

  return (
    <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-semibold text-white">
            Ideal Customer Profile
          </h3>
          {icp.is_custom && (
            <span className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs">
              Custom
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${confidenceColor} bg-gray-700`}>
            {confidenceText} Confidence
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

      {/* Summary */}
      {icp.analysis_summary && (
        <div className="bg-gray-900/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Analysis Summary</h4>
          <p className="text-white leading-relaxed">{icp.analysis_summary}</p>
        </div>
      )}

      {/* Core ICP Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Industry & Role */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-1">Target Industry</h4>
              <p className="text-white">{icp.target_industry || 'Not specified'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-1">Target Role</h4>
              <p className="text-white">{icp.target_role || 'Not specified'}</p>
            </div>
          </div>
        </div>

        {/* Company Size & Location */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-1">Company Size</h4>
              <p className="text-white">{icp.company_size || 'Not specified'}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-gray-300 mb-1">Geographic Location</h4>
              <p className="text-white">{icp.geographic_location || 'Not specified'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pain Points */}
      {icp.pain_points && icp.pain_points.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h4 className="text-sm font-medium text-gray-300">Pain Points</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {icp.pain_points.map((point, index) => (
              <div key={index} className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-white text-sm">{point}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {icp.keywords && icp.keywords.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-5 h-5 text-blue-400" />
            <h4 className="text-sm font-medium text-gray-300">Keywords</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {icp.keywords.map((keyword, index) => (
              <span 
                key={index} 
                className="bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Demographics */}
      {icp.demographics && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-green-400" />
            <h4 className="text-sm font-medium text-gray-300">Demographics</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {icp.demographics.age_range && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Age Range</p>
                <p className="text-white text-sm">{icp.demographics.age_range}</p>
              </div>
            )}
            {icp.demographics.education_level && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Education</p>
                <p className="text-white text-sm">{icp.demographics.education_level}</p>
              </div>
            )}
            {icp.demographics.income_level && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Income Level</p>
                <p className="text-white text-sm">{icp.demographics.income_level}</p>
              </div>
            )}
            {icp.demographics.job_seniority && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Job Seniority</p>
                <p className="text-white text-sm">{icp.demographics.job_seniority}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Psychographics */}
      {icp.psychographics && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-5 h-5 text-red-400" />
            <h4 className="text-sm font-medium text-gray-300">Psychographics</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {icp.psychographics.values && icp.psychographics.values.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Values</p>
                <div className="flex flex-wrap gap-1">
                  {icp.psychographics.values.map((value: string, index: number) => (
                    <span key={index} className="bg-red-900/50 text-red-300 px-2 py-1 rounded text-xs">
                      {value}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {icp.psychographics.interests && icp.psychographics.interests.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Interests</p>
                <div className="flex flex-wrap gap-1">
                  {icp.psychographics.interests.map((interest: string, index: number) => (
                    <span key={index} className="bg-green-900/50 text-green-300 px-2 py-1 rounded text-xs">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Behavioral Traits */}
      {icp.behavioral_traits && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h4 className="text-sm font-medium text-gray-300">Behavioral Traits</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {icp.behavioral_traits.preferred_channels && icp.behavioral_traits.preferred_channels.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Preferred Channels</p>
                <div className="flex flex-wrap gap-1">
                  {icp.behavioral_traits.preferred_channels.map((channel: string, index: number) => (
                    <span key={index} className="bg-purple-900/50 text-purple-300 px-2 py-1 rounded text-xs">
                      {channel}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {icp.behavioral_traits.communication_style && (
              <div className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-1">Communication Style</p>
                <p className="text-white text-sm">{icp.behavioral_traits.communication_style}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Research Sources & Live Search Data */}
      {icp.research_sources && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Research Sources & Findings
          </h4>
          
          <div className="bg-gray-900/50 rounded-lg p-4 space-y-3">
            {icp.research_sources.twitter_analysis && (
              <div>
                <h5 className="text-sm font-medium text-blue-300 mb-1">Twitter Analysis</h5>
                <p className="text-gray-300 text-sm">{icp.research_sources.twitter_analysis}</p>
              </div>
            )}
            
            {icp.research_sources.website_insights && (
              <div>
                <h5 className="text-sm font-medium text-green-300 mb-1">Website Insights</h5>
                <p className="text-gray-300 text-sm">{icp.research_sources.website_insights}</p>
              </div>
            )}
            
            {icp.research_sources.news_mentions && (
              <div>
                <h5 className="text-sm font-medium text-yellow-300 mb-1">News & Media Coverage</h5>
                <p className="text-gray-300 text-sm">{icp.research_sources.news_mentions}</p>
              </div>
            )}
            
            {icp.research_sources.competitor_insights && (
              <div>
                <h5 className="text-sm font-medium text-orange-300 mb-1">Competitor Analysis</h5>
                <p className="text-gray-300 text-sm">{icp.research_sources.competitor_insights}</p>
              </div>
            )}
            
            {icp.research_sources.search_confidence && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-400">
                  Search Confidence: <span className="text-white font-medium">{icp.research_sources.search_confidence}</span>
                </span>
              </div>
            )}
          </div>
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
