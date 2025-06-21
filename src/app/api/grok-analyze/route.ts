import { NextRequest, NextResponse } from 'next/server';
import { createGrokChatCompletion, GROK_CONFIGS } from '@/lib/grok';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  ValidationError, 
  AuthenticationError,
  validateRequiredFields 
} from '@/lib/api-utils';
import { getAuth } from '@clerk/nextjs/server';
import OpenAI from 'openai';

/**
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json(createSuccessResponse({
    message: 'Grok analyze endpoint is working',
    methods: ['POST'],
    supportedModes: ['general', 'profile'],
  }));
}

interface GrokAnalyzeRequest {
  message: string;
  context?: string;
  isProfileAnalysis?: boolean;
  useFullModel?: boolean;
  useFastModel?: boolean;
}

/**
 * System prompts for different analysis modes
 */
const GENERAL_PROMPT = 'You are Grok, an AI assistant that provides helpful, accurate, and engaging responses. Be conversational but informative.';
const PROFILE_PROMPT = 'You are Grok, analyzing user profiles and social media presence. Focus on professional insights, networking opportunities, and social media optimization.';

export async function POST(request: NextRequest) {
  try {
    // Environment validation
    if (!process.env.GROK_API_KEY) {
      return NextResponse.json(
        createErrorResponse('Grok API key not configured'),
        { status: 500 }
      );
    }

    // Authentication
    const { userId } = getAuth(request);
    if (!userId) {
      throw new AuthenticationError();
    }

    // Request validation
    const body: GrokAnalyzeRequest = await request.json();
    validateRequiredFields(body, ['message']);

    const { 
      message, 
      context, 
      isProfileAnalysis = false,
      useFullModel = true,
      useFastModel = false
    } = body;

    // Build system prompt based on analysis mode
    const systemPrompt = isProfileAnalysis ? PROFILE_PROMPT : GENERAL_PROMPT;

    // Build messages array
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...(context ? [{ role: 'user' as const, content: `Context: ${context}` }] : []),
      { role: 'user', content: message }
    ];

    // Select configuration based on preferences
    const config = useFastModel 
      ? GROK_CONFIGS.MINI_FAST 
      : useFullModel 
        ? GROK_CONFIGS.FULL 
        : GROK_CONFIGS.MINI;

    // Make API call
    const completion = await createGrokChatCompletion(
      messages, 
      config
    ) as OpenAI.Chat.Completions.ChatCompletion;

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return NextResponse.json(
        createErrorResponse('No response from Grok'),
        { status: 500 }
      );
    }

    return NextResponse.json(createSuccessResponse({
      response: responseContent,
      model: completion.model,
      usage: completion.usage,
      analysisType: isProfileAnalysis ? 'profile' : 'general',
      config: {
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.max_tokens,
      }
    }));

  } catch (error: any) {
    if (error instanceof ValidationError || error instanceof AuthenticationError) {
      return NextResponse.json(
        createErrorResponse(error),
        { status: error.statusCode }
      );
    }

    return NextResponse.json(
      createErrorResponse('Failed to analyze with Grok', { originalError: error.message }),
      { status: 500 }
    );
  }
}
