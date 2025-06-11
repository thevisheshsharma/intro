import { NextRequest, NextResponse } from 'next/server';
import { createGrokStreamCompletion, GROK_CONFIGS } from '@/lib/grok';
import { getAuth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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
      content: 'You are Grok, analyzing content and providing creative suggestions. Focus on content strategy, engagement optimization, and audience insights.',
      realtime: 'You are Grok with access to real-time information. Use your knowledge and provide current, accurate information about recent events and trends.'
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
    
    const stream = await createGrokStreamCompletion(messages, config);

    // Create a readable stream for the response
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = `data: ${JSON.stringify({ content, done: false })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          
          // Send completion message
          const finalData = `data: ${JSON.stringify({ content: '', done: true })}\n\n`;
          controller.enqueue(encoder.encode(finalData));
          controller.close();
        } catch (error) {
          const errorData = `data: ${JSON.stringify({ error: 'Stream error', done: true })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('Grok stream error:', error);
    return NextResponse.json(
      { error: 'Failed to stream with Grok', details: error.message },
      { status: 500 }
    );
  }
}
