'use client'

import { useState } from 'react'
import { useGrokAnalysis, useGrokStream } from '@/lib/hooks/useGrok'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function GrokTestPage() {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [streamResult, setStreamResult] = useState('')
  
  const { analyze, loading: analyzing, error: analyzeError } = useGrokAnalysis()
  const { stream, streaming, error: streamError } = useGrokStream()

  const testAnalyze = async () => {
    if (!message.trim()) return
    
    const response = await analyze(message, {
      analysisType: 'general',
      useFullModel: true
    })
    
    if (response?.response) {
      setResult(response.response)
    }
  }

  const testStream = async () => {
    if (!message.trim()) return
    
    setStreamResult('')
    
    await stream(
      message,
      (chunk) => {
        if (chunk.content) {
          setStreamResult(prev => prev + chunk.content)
        }
      },
      {
        analysisType: 'general',
        useFullModel: true
      }
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Grok API Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Grok something..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
            />
          </div>
          
          <div className="flex gap-4 mb-6">
            <Button 
              onClick={testAnalyze}
              disabled={!message.trim() || analyzing}
              className="flex items-center gap-2"
            >
              {analyzing && <LoadingSpinner />}
              Test Standard API
            </Button>
            
            <Button 
              onClick={testStream}
              disabled={!message.trim() || streaming}
              variant="outline"
              className="flex items-center gap-2"
            >
              {streaming && <LoadingSpinner />}
              Test Stream API
            </Button>
          </div>
          
          {(analyzeError || streamError) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-800 text-sm">
                Error: {analyzeError || streamError}
              </p>
            </div>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Standard API Response</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{result}</pre>
            </div>
          </div>
        )}

        {streamResult && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Stream API Response {streaming && '(Streaming...)'}
            </h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-800">{streamResult}</pre>
            </div>
          </div>
        )}
        
        <div className="mt-8 text-center">
          <a 
            href="/"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← Back to Main App
          </a>
        </div>
      </div>
    </div>
  )
}
