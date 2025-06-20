'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useGrokAnalysis } from '@/lib/hooks/useGrok'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Bot, Briefcase, Building2, Star, User, Database, RefreshCw } from 'lucide-react'
import { 
  getCachedGrokAnalysis, 
  saveGrokAnalysis, 
  type StructuredAnalysis,
  type TwitterProfile 
} from '@/lib/grok-database'

interface ProfileAnalysisProps {
  user: {
    name: string;
    screen_name: string;
    description: string;
    location?: string;
    url?: string;
  };
}

export function ProfileAnalysis({ user }: ProfileAnalysisProps) {
  const { isSignedIn } = useUser()
  const [analysis, setAnalysis] = useState<StructuredAnalysis | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { analyze } = useGrokAnalysis()

  // Don't render if user is not signed in
  if (!isSignedIn) {
    return null
  }

  const handleAnalyze = async (forceRefresh: boolean = false) => {
    if (analysis && !forceRefresh) {
      setIsExpanded(!isExpanded)
      return
    }

    setLoading(true)
    setError(null)
    setIsFromCache(false)

    try {
      const twitterProfile: TwitterProfile = {
        name: user.name,
        screen_name: user.screen_name,
        description: user.description,
        location: user.location,
        url: user.url
      }

      // First, try to get cached analysis
      if (!forceRefresh) {
        const cachedAnalysis = await getCachedGrokAnalysis(twitterProfile, 24) // 24 hours cache
        if (cachedAnalysis) {
          console.log('Using cached analysis for', user.screen_name)
          setAnalysis(cachedAnalysis)
          setIsFromCache(true)
          setIsExpanded(true)
          setLoading(false)
          return
        }
      }

      // If no cache or force refresh, call Grok API
      console.log('Fetching new analysis for', user.screen_name)
      
      const prompt = `Analyze this Twitter profile and provide a structured analysis in JSON format:

Name: ${user.name}
Username: @${user.screen_name}
Bio: ${user.description}
Location: ${user.location || 'Not specified'}
Website: ${user.url || 'Not specified'}

Please respond with a JSON object containing:
{
  "role": "Their likely job title/profession",
  "company": "Probable company/organization name or 'Independent/Freelance'",
  "expertise": "Main area of expertise or industry",
  "summary": "One sentence professional summary",
  "confidence": "high/medium/low based on how clear the profile information is"
}

Only respond with valid JSON, no other text.`

      const result = await analyze(prompt, {
        analysisType: 'profile',
        useFullModel: false,
        useFastModel: true
      })

      if (result?.response) {
        try {
          // Parse the JSON response
          const structuredAnalysis = JSON.parse(result.response.trim()) as StructuredAnalysis
          
          // Save to database
          await saveGrokAnalysis(twitterProfile, structuredAnalysis, {
            rawResponse: result.response,
            modelUsed: result.model,
            analysisType: result.analysisType,
            tokenUsage: result.usage?.total_tokens
          })
          
          setAnalysis(structuredAnalysis)
          setIsFromCache(false)
          setIsExpanded(true)
        } catch (parseError) {
          console.error('Failed to parse analysis JSON:', parseError)
          // Fallback to a default structure if JSON parsing fails
          const fallbackAnalysis: StructuredAnalysis = {
            role: 'Unknown',
            company: 'Not determined',
            expertise: 'Not specified',
            summary: result.response,
            confidence: 'low'
          }
          
          // Still save the fallback analysis
          await saveGrokAnalysis(twitterProfile, fallbackAnalysis, {
            rawResponse: result.response,
            modelUsed: result.model,
            analysisType: result.analysisType,
            tokenUsage: result.usage?.total_tokens
          })
          
          setAnalysis(fallbackAnalysis)
          setIsFromCache(false)
          setIsExpanded(true)
        }
      }
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await handleAnalyze(true) // Force refresh
  }

  return (
    <div className="mt-3 w-full">
      <div className="flex gap-2">
        <button
          onClick={() => handleAnalyze(false)}
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white text-sm px-3 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <LoadingSpinner className="w-4 h-4" />
              Analyzing...
            </>
          ) : (
            <>
              <Bot className="w-4 h-4" />
              {analysis ? (isExpanded ? 'Hide Analysis' : 'Show Analysis') : 'Quick Analysis'}
            </>
          )}
        </button>

        {analysis && (
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white text-sm px-3 py-2 rounded-lg flex items-center justify-center transition-colors"
            title="Refresh analysis"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {analysis && isExpanded && (
        <div className="mt-3 bg-gray-800/50 border border-gray-600 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-3">
            {isFromCache ? (
              <Database className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
            ) : (
              <Bot className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            )}
            <h4 className="text-sm font-medium text-white">
              Profile Analysis {isFromCache && '(Cached)'}
            </h4>
            <div className={`ml-auto px-2 py-1 rounded text-xs font-medium ${
              analysis.confidence === 'high' ? 'bg-green-900/50 text-green-300' :
              analysis.confidence === 'medium' ? 'bg-yellow-900/50 text-yellow-300' :
              'bg-red-900/50 text-red-300'
            }`}>
              {analysis.confidence} confidence
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Role</div>
                  <div className="text-sm text-white font-medium">{analysis.role}</div>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Company</div>
                  <div className="text-sm text-white font-medium">{analysis.company}</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Star className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Expertise</div>
                <div className="text-sm text-blue-300">{analysis.expertise}</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Summary</div>
                <div className="text-sm text-gray-200 leading-relaxed">{analysis.summary}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-red-400 text-xs">
          Failed to analyze profile: {error}
        </div>
      )}
    </div>
  )
}