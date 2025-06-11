'use client'

import { useState } from 'react'
import { useGrokAnalysis } from '@/lib/hooks/useGrok'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Bot, 
  Lightbulb, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Target,
  Zap
} from 'lucide-react'

interface QuickGrokAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  prompt: string
  analysisType: 'general' | 'twitter' | 'profile' | 'content'
  description: string
}

interface GrokQuickActionsProps {
  data?: any
  context?: string
  onResult?: (result: string, action: QuickGrokAction) => void
  modelType?: 'fast' | 'standard' | 'full'
}

const quickActions: QuickGrokAction[] = [
  {
    id: 'profile-optimization',
    label: 'Optimize Profile',
    icon: Users,
    prompt: 'Analyze this profile and provide specific recommendations for optimization, including bio, profile picture, and overall presentation tips.',
    analysisType: 'profile',
    description: 'Get profile improvement suggestions'
  },
  {
    id: 'content-ideas',
    label: 'Content Ideas',
    icon: Lightbulb,
    prompt: 'Based on this data, generate 5-10 specific content ideas that would resonate with the audience and drive engagement.',
    analysisType: 'content',
    description: 'Generate engaging content ideas'
  },
  {
    id: 'growth-strategy',
    label: 'Growth Strategy',
    icon: TrendingUp,
    prompt: 'Analyze this data and provide a comprehensive growth strategy including follower acquisition, engagement tactics, and networking opportunities.',
    analysisType: 'twitter',
    description: 'Get growth and engagement tactics'
  },
  {
    id: 'audience-insights',
    label: 'Audience Analysis',
    icon: Target,
    prompt: 'Analyze the audience data and provide insights about demographics, interests, engagement patterns, and how to better connect with them.',
    analysisType: 'twitter',
    description: 'Understand your audience better'
  },
  {
    id: 'engagement-boost',
    label: 'Boost Engagement',
    icon: MessageSquare,
    prompt: 'Analyze current engagement patterns and provide specific, actionable recommendations to increase likes, comments, shares, and overall interaction.',
    analysisType: 'content',
    description: 'Improve post engagement'
  },
  {
    id: 'quick-summary',
    label: 'Quick Summary',
    icon: Zap,
    prompt: 'Provide a quick, comprehensive summary of the key insights and most important takeaways from this data.',
    analysisType: 'general',
    description: 'Get key insights summary'
  }
]

export function GrokQuickActions({ data, context, onResult, modelType = 'standard' }: GrokQuickActionsProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})
  const [selectedModelType, setSelectedModelType] = useState<'fast' | 'standard' | 'full'>(modelType)
  const { analyze, loading } = useGrokAnalysis()

  const executeAction = async (action: QuickGrokAction) => {
    if (!data && !context) return

    setActiveAction(action.id)

    try {
      const contextString = context || (data ? JSON.stringify(data, null, 2) : '')
      
      const result = await analyze(action.prompt, {
        context: contextString,
        analysisType: action.analysisType,
        useFullModel: selectedModelType === 'full',
        useFastModel: selectedModelType === 'fast'
      })

      if (result?.response) {
        setResults(prev => ({
          ...prev,
          [action.id]: result.response || ''
        }))
        
        if (onResult) {
          onResult(result.response, action)
        }
      }
    } catch (error) {
      console.error('Action execution error:', error)
    } finally {
      setActiveAction(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Model Selector */}
      <div className="mb-3">
        <label className="text-xs text-gray-500 block mb-1">AI Model:</label>
        <select
          value={selectedModelType}
          onChange={(e) => setSelectedModelType(e.target.value as 'fast' | 'standard' | 'full')}
          className="text-xs px-2 py-1 border rounded bg-white w-full"
        >
          <option value="fast">Grok-3 Mini Fast (Quick insights)</option>
          <option value="standard">Grok-3 Mini (Balanced)</option>
          <option value="full">Grok-3 Latest (Comprehensive)</option>
        </select>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          const hasResult = results[action.id]
          const isActive = activeAction === action.id

          return (
            <Button
              key={action.id}
              variant={hasResult ? "default" : "outline"}
              size="sm"
              onClick={() => executeAction(action)}
              disabled={loading || (!data && !context)}
              className="h-auto p-3 flex flex-col items-center gap-2 relative"
            >
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded">
                  <LoadingSpinner size="sm" />
                </div>
              )}
              
              <Icon className={`w-5 h-5 ${hasResult ? 'text-white' : 'text-gray-600'}`} />
              <div className="text-center">
                <div className={`text-xs font-medium ${hasResult ? 'text-white' : 'text-gray-900'}`}>
                  {action.label}
                </div>
                <div className={`text-xs ${hasResult ? 'text-blue-100' : 'text-gray-500'} mt-1`}>
                  {action.description}
                </div>
              </div>
              
              {hasResult && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></div>
              )}
            </Button>
          )
        })}
      </div>

      {/* Results Display */}
      {Object.keys(results).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-600" />
            <h4 className="font-medium text-gray-900">AI Insights</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setResults({})}
              className="text-xs ml-auto"
            >
              Clear All
            </Button>
          </div>

          {Object.entries(results).map(([actionId, result]) => {
            const action = quickActions.find(a => a.id === actionId)
            if (!action) return null

            const Icon = action.icon

            return (
              <div key={actionId} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm text-gray-900">
                    {action.label}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newResults = { ...results }
                      delete newResults[actionId]
                      setResults(newResults)
                    }}
                    className="ml-auto text-xs"
                  >
                    ×
                  </Button>
                </div>
                
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {result}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => executeAction(action)}
                  disabled={loading}
                  className="mt-3 text-xs"
                >
                  Refresh Analysis
                </Button>
              </div>
            )
          })}
        </div>
      )}

      {(!data && !context) && (
        <div className="text-center py-6 text-gray-500">
          <Bot className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">Provide data or context to use quick actions</p>
        </div>
      )}
    </div>
  )
}
