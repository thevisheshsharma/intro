import { NextRequest, NextResponse } from 'next/server';
import { createGrokFunctionCall, GROK_CONFIGS } from '@/lib/grok';
import { getAuth } from '@clerk/nextjs/server';

// Define functions that Grok can call
const availableFunctions = [
  {
    name: 'analyze_twitter_profile',
    description: 'Analyze a Twitter profile and provide insights',
    parameters: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'The Twitter username to analyze'
        },
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific metrics to focus on (followers, engagement, content, etc.)'
        }
      },
      required: ['username']
    }
  },
  {
    name: 'generate_content_suggestions',
    description: 'Generate content suggestions based on profile analysis',
    parameters: {
      type: 'object',
      properties: {
        profileData: {
          type: 'object',
          description: 'Profile data to base suggestions on'
        },
        contentType: {
          type: 'string',
          enum: ['tweets', 'threads', 'replies', 'general'],
          description: 'Type of content to suggest'
        },
        targetAudience: {
          type: 'string',
          description: 'Target audience for the content'
        }
      },
      required: ['profileData', 'contentType']
    }
  },
  {
    name: 'compare_profiles',
    description: 'Compare multiple Twitter profiles and provide insights',
    parameters: {
      type: 'object',
      properties: {
        profiles: {
          type: 'array',
          items: { type: 'object' },
          description: 'Array of profile data to compare'
        },
        comparisonMetrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Metrics to use for comparison'
        }
      },
      required: ['profiles']
    }
  }
];

export async function POST(request: NextRequest) {
  try {
    console.log('Grok functions POST request received');

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
      functions = [],
      useFullModel = true,
      useFastModel = false
    } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Use provided functions or default ones
    const functionsToUse = functions.length > 0 ? functions : availableFunctions;

    const messages = [
      {
        role: 'system' as const,
        content: 'You are Grok, an AI assistant with function calling capabilities. Use the available functions to provide comprehensive analysis and insights. Always explain your reasoning and the results of function calls.'
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
    
    const completion = await createGrokFunctionCall(messages, functionsToUse, config);

    const choice = completion.choices[0];
    if (!choice) {
      return NextResponse.json({ error: 'No response from Grok' }, { status: 500 });
    }

    // Check if Grok wants to call a function
    if (choice.message.function_call) {
      const functionCall = choice.message.function_call;
      
      // Here you would implement the actual function execution
      // For now, we'll return the function call intent
      return NextResponse.json({
        type: 'function_call',
        function_call: functionCall,
        message: choice.message.content,
        model: completion.model,
        usage: completion.usage
      });
    }

    // Regular text response
    return NextResponse.json({
      type: 'text',
      response: choice.message.content,
      model: completion.model,
      usage: completion.usage
    });

  } catch (error: any) {
    console.error('Grok function call error:', error);
    return NextResponse.json(
      { error: 'Failed to process function call with Grok', details: error.message },
      { status: 500 }
    );
  }
}

// Helper endpoint to execute functions (you can extend this)
export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { functionName, arguments: functionArgs } = body;

    // Execute the function based on name
    let result = null;
    
    switch (functionName) {
      case 'analyze_twitter_profile':
        // Implement Twitter profile analysis
        result = { 
          analysis: `Analysis for ${functionArgs.username}`,
          metrics: functionArgs.metrics || [],
          status: 'completed'
        };
        break;
        
      case 'generate_content_suggestions':
        // Implement content generation
        result = {
          suggestions: [
            'Content suggestion 1 based on profile data',
            'Content suggestion 2 based on target audience',
            'Content suggestion 3 for engagement'
          ],
          contentType: functionArgs.contentType,
          status: 'completed'
        };
        break;
        
      case 'compare_profiles':
        // Implement profile comparison
        result = {
          comparison: 'Detailed comparison results',
          profiles: functionArgs.profiles.length,
          metrics: functionArgs.comparisonMetrics || [],
          status: 'completed'
        };
        break;
        
      default:
        return NextResponse.json({ error: 'Unknown function' }, { status: 400 });
    }

    return NextResponse.json({
      function: functionName,
      result,
      executed_at: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Function execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute function', details: error.message },
      { status: 500 }
    );
  }
}
