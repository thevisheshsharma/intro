import { NextRequest, NextResponse } from 'next/server'
import { grokClient, GROK_CONFIGS } from '@/lib/grok'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Grok API connection...')
    
    // Check if API key is available
    if (!process.env.GROK_API_KEY) {
      console.error('GROK_API_KEY environment variable is not set')
      return NextResponse.json({ 
        error: 'Grok API key not configured',
        hasApiKey: false 
      }, { status: 500 })
    }

    console.log('API Key exists:', !!process.env.GROK_API_KEY)
    console.log('API Key length:', process.env.GROK_API_KEY.length)
    console.log('API Key prefix:', process.env.GROK_API_KEY.substring(0, 8) + '...')

    // Test a simple completion
    const completion = await grokClient.chat.completions.create({
      ...GROK_CONFIGS.MINI_FAST,
      messages: [
        {
          role: 'user',
          content: 'Hello, please respond with a simple JSON object: {"status": "working", "message": "Grok API is functional"}'
        }
      ]
    })

    const response = completion.choices[0]?.message?.content
    console.log('Grok response:', response)

    return NextResponse.json({
      success: true,
      hasApiKey: true,
      apiKeyLength: process.env.GROK_API_KEY.length,
      model: completion.model,
      response: response,
      usage: completion.usage
    })

  } catch (error: any) {
    console.error('Grok API test error:', error)
    return NextResponse.json({ 
      error: error.message,
      hasApiKey: !!process.env.GROK_API_KEY,
      details: error
    }, { status: 500 })
  }
}
