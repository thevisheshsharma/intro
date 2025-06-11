'use client'

import { useState, useRef, useEffect } from 'react'
import { useGrokAnalysis, useGrokStream } from '@/lib/hooks/useGrok'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Send, Bot, User, Zap, ZapOff } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
  analysisType?: string
}

interface GrokChatProps {
  context?: string
  analysisType?: 'general' | 'twitter' | 'profile' | 'content'
  onAnalysisComplete?: (analysis: string) => void
}

export function GrokChat({ context, analysisType = 'general', onAnalysisComplete }: GrokChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [useStream, setUseStream] = useState(true)
  const [modelType, setModelType] = useState<'fast' | 'standard' | 'full'>('standard')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const { analyze, loading: analyzing } = useGrokAnalysis()
  const { stream, streaming } = useGrokStream()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || analyzing || streaming) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')

    if (useStream) {
      // Handle streaming response
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        analysisType
      }

      setMessages(prev => [...prev, assistantMessage])

      await stream(
        userMessage.content,
        (chunk) => {
          if (chunk.content) {
            setMessages(prev => 
              prev.map(msg => 
                msg.id === assistantMessage.id 
                  ? { ...msg, content: msg.content + chunk.content }
                  : msg
              )
            )
          }
          
          if (chunk.done && onAnalysisComplete) {
            const finalMessage = messages.find(m => m.id === assistantMessage.id)
            if (finalMessage) {
              onAnalysisComplete(finalMessage.content)
            }
          }
        },
        { context, analysisType, useFullModel: modelType === 'full', useFastModel: modelType === 'fast' }
      )
    } else {
      // Handle regular response
      const result = await analyze(userMessage.content, {
        context,
        analysisType,
        useFullModel: modelType === 'full',
        useFastModel: modelType === 'fast'
      })

      if (result?.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.response,
          timestamp: new Date(),
          model: result.model,
          analysisType: result.analysisType
        }

        setMessages(prev => [...prev, assistantMessage])
        
        if (onAnalysisComplete) {
          onAnalysisComplete(result.response)
        }
      }
    }
  }

  const clearChat = () => {
    setMessages([])
  }

  const getAnalysisTypeLabel = (type: string) => {
    const labels = {
      general: 'General',
      twitter: 'Twitter Analysis',
      profile: 'Profile Analysis',
      content: 'Content Strategy'
    }
    return labels[type as keyof typeof labels] || type
  }

  return (
    <div className="flex flex-col h-full max-h-[600px] border rounded-lg bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Grok AI</span>
          <span className="text-sm text-gray-500">({getAnalysisTypeLabel(analysisType)})</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseStream(!useStream)}
            className="text-xs"
          >
            {useStream ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            {useStream ? 'Stream' : 'Standard'}
          </Button>
          
          <select
            value={modelType}
            onChange={(e) => setModelType(e.target.value as 'fast' | 'standard' | 'full')}
            className="text-xs px-2 py-1 border rounded bg-white"
          >
            <option value="fast">Grok-3 Mini Fast</option>
            <option value="standard">Grok-3 Mini</option>
            <option value="full">Grok-3 Latest</option>
          </select>
          
          <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs">
            Clear
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Start a conversation with Grok AI</p>
            <p className="text-xs text-gray-400 mt-1">
              {context ? 'Context provided for analysis' : 'Ask anything about your data'}
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-blue-600" />
              </div>
            )}
            
            <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <div
                className={`p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white ml-auto'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                
                {message.role === 'assistant' && (message.model || message.analysisType) && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                    {message.model && <span>Model: {message.model}</span>}
                    {message.analysisType && <span>Type: {getAnalysisTypeLabel(message.analysisType)}</span>}
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-400 mt-1 px-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>

            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {(analyzing || streaming) && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-blue-600" />
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-600 ml-2">
                Grok is {streaming ? 'streaming' : 'thinking'}...
              </span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Grok anything..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={analyzing || streaming}
          />
          <Button
            type="submit"
            disabled={!input.trim() || analyzing || streaming}
            className="px-4 py-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
