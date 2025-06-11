'use client'

import { useState } from 'react'
import { useGrokAnalysis } from '@/lib/hooks/useGrok'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Bot, Brain, Users, MessageSquare, TrendingUp } from 'lucide-react'

interface GrokAnalysisPanelProps {
  data?: any
  dataType?: 'profile' | 'followers' | 'tweets' | 'general'
  title?: string
  modelType?: 'fast' | 'standard' | 'full'
}

export function GrokAnalysisPanel({ data, dataType = 'general', title, modelType = 'full' }: GrokAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState<'general' | 'twitter' | 'profile' | 'content'>('general')
  const [selectedModelType, setSelectedModelType] = useState<'fast' | 'standard' | 'full'>(modelType)
  const { analyze, loading, error } = useGrokAnalysis()

  const analyzeData = async (type: typeof analysisType) => {
    if (!data) return

    setAnalysisType(type)
    
    // Create context based on data type and analysis type
    let context = ''
    let prompt = ''

    switch (dataType) {
      case 'profile':
        context = `Profile data: ${JSON.stringify(data, null, 2)}`
        switch (type) {
          case 'profile':
            prompt = 'Analyze this Twitter profile. Provide insights about the user\'s online presence, engagement patterns, and professional positioning.'
            break
          case 'content':
            prompt = 'Based on this profile data, suggest content strategies that would resonate with their audience and improve engagement.'
            break
          case 'twitter':
            prompt = 'Analyze this Twitter profile\'s social media strategy. What\'s working well and what could be improved?'
            break
          default:
            prompt = 'Provide a comprehensive analysis of this profile data.'
        }
        break

      case 'followers':
        context = `Followers data: ${JSON.stringify(data, null, 2)}`
        switch (type) {
          case 'twitter':
            prompt = 'Analyze this followers data. What insights can you provide about the audience demographics, engagement patterns, and potential networking opportunities?'
            break
          case 'content':
            prompt = 'Based on this followers data, what type of content would best engage this audience?'
            break
          default:
            prompt = 'Analyze this followers data and provide actionable insights.'
        }
        break

      case 'tweets':
        context = `Tweet data: ${JSON.stringify(data, null, 2)}`
        switch (type) {
          case 'content':
            prompt = 'Analyze these tweets for content performance. What patterns do you see in successful posts?'
            break
          case 'twitter':
            prompt = 'Analyze the Twitter strategy evident in these tweets. What\'s the engagement pattern and how can it be improved?'
            break
          default:
            prompt = 'Analyze these tweets and provide insights about content performance and strategy.'
        }
        break

      default:
        context = `Data: ${JSON.stringify(data, null, 2)}`
        prompt = 'Analyze this data and provide relevant insights.'
    }

    const result = await analyze(prompt, {
      context,
      analysisType: type,
      useFullModel: selectedModelType === 'full',
      useFastModel: selectedModelType === 'fast'
    })

    if (result?.response) {
      setAnalysis(result.response)
    }
  }

  const getAnalysisIcon = (type: string) => {
    const icons = {
      general: Brain,
      twitter: MessageSquare,
      profile: Users,
      content: TrendingUp
    }
    const Icon = icons[type as keyof typeof icons] || Brain
    return <Icon className="w-4 h-4" />
  }

  const getAnalysisDescription = (type: string) => {
    const descriptions = {
      general: 'General insights and overview',
      twitter: 'Social media strategy analysis',
      profile: 'Profile optimization suggestions',
      content: 'Content strategy recommendations'
    }
    return descriptions[type as keyof typeof descriptions] || 'Analysis'
  }

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">
          {title || 'Grok AI Analysis'}
        </h3>
      </div>

      {!data && (
        <div className="text-center py-8 text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm">No data available for analysis</p>
        </div>
      )}

      {data && !analysis && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 mb-2">
            Choose an analysis type to get AI-powered insights:
          </p>
          
          <div className="mb-3">
            <label className="text-xs text-gray-500 block mb-1">Model:</label>
            <select
              value={selectedModelType}
              onChange={(e) => setSelectedModelType(e.target.value as 'fast' | 'standard' | 'full')}
              className="text-xs px-2 py-1 border rounded bg-white w-full"
            >
              <option value="fast">Grok-3 Mini Fast (Quick responses)</option>
              <option value="standard">Grok-3 Mini (Balanced)</option>
              <option value="full">Grok-3 Latest (Detailed analysis)</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {(['general', 'twitter', 'profile', 'content'] as const).map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => analyzeData(type)}
                disabled={loading}
                className="justify-start"
              >
                {getAnalysisIcon(type)}
                <span className="ml-2 text-xs">
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner />
          <span className="ml-2 text-sm text-gray-600">
            Analyzing with Grok AI...
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-800 text-sm">Error: {error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => analyzeData(analysisType)}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              {getAnalysisIcon(analysisType)}
              <span>{getAnalysisDescription(analysisType)}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAnalysis(null)}
              className="text-xs"
            >
              New Analysis
            </Button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900">
              {analysis}
            </div>
          </div>

          <div className="flex gap-2">
            {(['general', 'twitter', 'profile', 'content'] as const)
              .filter(type => type !== analysisType)
              .map((type) => (
                <Button
                  key={type}
                  variant="outline"
                  size="sm"
                  onClick={() => analyzeData(type)}
                  disabled={loading}
                  className="text-xs"
                >
                  {getAnalysisIcon(type)}
                  <span className="ml-1">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                </Button>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
