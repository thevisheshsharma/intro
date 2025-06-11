import OpenAI from 'openai';

// Grok API configuration
export const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Available Grok models
export const GROK_MODELS = {
  GROK_3_LATEST: 'grok-3-latest',
  GROK_3_MINI: 'grok-3-mini',
  GROK_3_MINI_FAST: 'grok-3-mini-fast',
} as const;

// Default configuration for different use cases
export const GROK_CONFIGS = {
  // For quick responses and simpler tasks
  MINI_FAST: {
    model: GROK_MODELS.GROK_3_MINI_FAST,
    temperature: 0.7,
    max_tokens: 1000,
  },
  // For standard tasks with good balance of speed and quality
  MINI: {
    model: GROK_MODELS.GROK_3_MINI,
    temperature: 0.5,
    max_tokens: 2000,
  },
  // For detailed analysis and complex tasks
  FULL: {
    model: GROK_MODELS.GROK_3_LATEST,
    temperature: 0.3,
    max_tokens: 4000,
  },
} as const;

// Helper function to create chat completion
export async function createGrokChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  config: typeof GROK_CONFIGS.MINI_FAST | typeof GROK_CONFIGS.MINI | typeof GROK_CONFIGS.FULL = GROK_CONFIGS.FULL,
  options?: {
    stream?: boolean;
    functions?: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[];
    function_call?: 'auto' | 'none' | { name: string };
  }
) {
  try {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      ...config,
      messages,
      ...options,
    };

    const completion = await grokClient.chat.completions.create(params);
    return completion;
  } catch (error) {
    console.error('Grok API Error:', error);
    throw error;
  }
}

// Helper function for streaming responses
export async function createGrokStreamCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  config: typeof GROK_CONFIGS.MINI_FAST | typeof GROK_CONFIGS.MINI | typeof GROK_CONFIGS.FULL = GROK_CONFIGS.FULL
) {
  try {
    const stream = await grokClient.chat.completions.create({
      ...config,
      messages,
      stream: true,
    });
    
    return stream;
  } catch (error) {
    console.error('Grok Stream API Error:', error);
    throw error;
  }
}

// Helper function for function calling
export async function createGrokFunctionCall(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  functions: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[],
  config: typeof GROK_CONFIGS.MINI_FAST | typeof GROK_CONFIGS.MINI | typeof GROK_CONFIGS.FULL = GROK_CONFIGS.FULL
) {
  try {
    const completion = await grokClient.chat.completions.create({
      ...config,
      messages,
      functions,
      function_call: 'auto',
    });
    
    return completion;
  } catch (error) {
    console.error('Grok Function Call Error:', error);
    throw error;
  }
}

export type GrokModel = typeof GROK_MODELS[keyof typeof GROK_MODELS];
export type GrokConfig = typeof GROK_CONFIGS[keyof typeof GROK_CONFIGS];
