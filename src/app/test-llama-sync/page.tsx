"use client";

import { useState } from 'react'

interface SyncStats {
  startTime: string
  endTime?: string
  totalProtocols: number
  groupedProtocols: number
  protocolsWithTwitter: number
  existingMatches: number
  newProtocols: number
  updatedProtocols: number
  neo4jUpserts: number
  errors: string[]
  duration?: number
}

interface SyncResponse {
  success: boolean
  message: string
  stats?: SyncStats
  error?: string
}

export default function LlamaSyncTestPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SyncResponse | null>(null)

  const triggerSync = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      const response = await fetch('/api/llama-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      const data: SyncResponse = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: 'Failed to call sync API',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-lg font-medium text-gray-900 mb-6">
              Llama Protocol Sync Test
            </h1>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                This will trigger a manual sync of all protocols from the Llama API to Neo4j.
                The process will:
              </p>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Fetch all protocols from Llama API</li>
                <li>Group protocols by parent protocol</li>
                <li>Match Twitter handles with existing Neo4j nodes</li>
                <li>Update existing nodes or create new protocol nodes</li>
              </ul>
            </div>

            <button
              onClick={triggerSync}
              disabled={isLoading}
              className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? 'Syncing...' : 'Trigger Manual Sync'}
            </button>

            {result && (
              <div className="mt-6">
                <div className={`p-4 rounded-md ${
                  result.success ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {result.success ? (
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className={`text-sm font-medium ${
                        result.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {result.success ? 'Sync Completed' : 'Sync Failed'}
                      </h3>
                      <div className={`mt-2 text-sm ${
                        result.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        <p>{result.message}</p>
                        {result.error && (
                          <p className="mt-1 font-mono text-xs">{result.error}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {result.stats && (
                  <div className="mt-4 bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Sync Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Total Protocols:</span>
                        <span className="ml-2 font-medium">{result.stats.totalProtocols}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Grouped Protocols:</span>
                        <span className="ml-2 font-medium">{result.stats.groupedProtocols}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">With Twitter:</span>
                        <span className="ml-2 font-medium">{result.stats.protocolsWithTwitter}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Existing Matches:</span>
                        <span className="ml-2 font-medium">{result.stats.existingMatches}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">New Protocols:</span>
                        <span className="ml-2 font-medium">{result.stats.newProtocols}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Updated Protocols:</span>
                        <span className="ml-2 font-medium">{result.stats.updatedProtocols}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Neo4j Upserts:</span>
                        <span className="ml-2 font-medium">{result.stats.neo4jUpserts}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 font-medium">
                          {result.stats.duration ? `${Math.round(result.stats.duration / 1000)}s` : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Errors:</span>
                        <span className="ml-2 font-medium">{result.stats.errors.length}</span>
                      </div>
                    </div>
                    
                    {result.stats.errors.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-red-800 mb-2">Errors:</h5>
                        <div className="bg-red-50 p-2 rounded text-xs font-mono">
                          {result.stats.errors.map((error, index) => (
                            <div key={index} className="text-red-700">{error}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
