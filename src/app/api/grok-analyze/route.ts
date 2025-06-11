import { NextRequest, NextResponse } from 'next/server';
import { createGrokChatCompletion, GROK_CONFIGS } from '@/lib/grok';
import { getAuth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

// Add GET method for debugging
export async function GET() {
  return NextResponse.json({ 
    message: 'Grok analyze endpoint is working',
    methods: ['POST'],
    timestamp: new Date().toISOString()
  });
}

export async function POST(request: NextRequest) {
  try {
    console.log('Grok analyze POST request received');

    // Check if API key is available first
    if (!process.env.GROK_API_KEY) {
      console.error('GROK_API_KEY environment variable is not set');
      return NextResponse.json({ error: 'Grok API key not configured' }, { status: 500 });
    }

    const { userId } = getAuth(request);
    console.log('User ID:', userId);
    
    if (!userId) {
      console.log('No user ID found, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('Request body:', JSON.stringify(body, null, 2));
    const { 
      message, 
      context, 
      analysisType = 'general',
      useFullModel = true,
      useFastModel = false
    } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Build the system prompt based on analysis type
    const systemPrompts = {
      general: 'You are Grok, an AI assistant that provides helpful, accurate, and engaging responses. Be conversational but informative.',
      twitter: 'You are Grok, analyzing Twitter/social media data. Provide insights about user behavior, follower patterns, engagement, and social media strategy.',
      profile: 'You are Grok, analyzing user profiles and social media presence. Focus on professional insights, networking opportunities, and social media optimization.',
      content: 'You are Grok, analyzing content and providing creative suggestions. Focus on content strategy, engagement optimization, and audience insights.'
    };

    const systemPrompt = systemPrompts[analysisType as keyof typeof systemPrompts] || systemPrompts.general;

    const messages = [
      {
        role: 'system' as const,
        content: systemPrompt
      },
      ...(context ? [{
        role: 'user' as const,
        content: `Context: ${context}`
      }] : []),
      {
        role: 'user' as const,
        content: message
      }
    ];

    // Select the appropriate config based on user preferences
    let config;
    if (useFastModel) {
      config = GROK_CONFIGS.MINI_FAST;
    } else if (useFullModel) {
      config = GROK_CONFIGS.FULL;
    } else {
      config = GROK_CONFIGS.MINI;
    }

    console.log('Selected config:', config);
    console.log('Messages to send:', JSON.stringify(messages, null, 2));

    console.log('Calling Grok API...');
    const completion = await createGrokChatCompletion(messages, config, { stream: false }) as OpenAI.Chat.Completions.ChatCompletion;
    
    console.log('Grok API response received:', {
      model: completion.model,
      usage: completion.usage,
      hasContent: !!completion.choices[0]?.message?.content
    });

    if (!completion.choices[0]?.message?.content) {
      console.error('No content in Grok response:', completion);
      return NextResponse.json({ error: 'No response from Grok' }, { status: 500 });
    }

    console.log('Returning successful response');
    return NextResponse.json({
      response: completion.choices[0].message.content,
      model: completion.model,
      usage: completion.usage,
      analysisType
    });

  } catch (error: any) {
    console.error('Grok analyze error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze with Grok', details: error.message },
      { status: 500 }
    );
  }
}
