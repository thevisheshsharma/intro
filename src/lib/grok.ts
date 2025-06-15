import OpenAI from 'openai';

// Grok API configuration
export const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Available Grok models - Updated for latest API
export const GROK_MODELS = {
  GROK_3: 'grok-3', // Main Grok 3 model with live search
  GROK_3_MINI: 'grok-3-mini',
  GROK_3_MINI_FAST: 'grok-3-mini-fast',
  // Legacy support
  GROK_3_LATEST: 'grok-3-latest',
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
  // For detailed analysis and complex tasks with live search
  FULL: {
    model: GROK_MODELS.GROK_3, // Use the main Grok 3 model for live search
    temperature: 0.3,
    max_tokens: 4000,
  },
} as const;

// Helper function to create chat completion with live search support
export async function createGrokChatCompletion(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  config: typeof GROK_CONFIGS.MINI_FAST | typeof GROK_CONFIGS.MINI | typeof GROK_CONFIGS.FULL = GROK_CONFIGS.FULL,
  options?: {
    stream?: boolean;
    functions?: OpenAI.Chat.Completions.ChatCompletionCreateParams.Function[];
    function_call?: 'auto' | 'none' | { name: string };
    enableLiveSearch?: boolean;
  }
) {
  try {
    const params: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
      ...config,
      messages,
      ...options,
    };

    // Enable live search if requested - this allows Grok to search the web in real-time
    if (options?.enableLiveSearch) {
      // Live search is enabled by default in Grok models when accessing real-time information
      // No additional parameters needed - Grok automatically uses live search when appropriate
    }

    const completion = await grokClient.chat.completions.create(params);
    return completion;
  } catch (error) {
    console.error('Grok API Error:', error);
    throw error;
  }
}

// Helper function specifically for live search analysis
export async function createGrokLiveSearchAnalysis(
  query: string,
  context: string,
  config: typeof GROK_CONFIGS.MINI_FAST | typeof GROK_CONFIGS.MINI | typeof GROK_CONFIGS.FULL = GROK_CONFIGS.FULL
) {
  try {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are Grok, an expert research analyst with live web search capabilities. You MUST use your real-time search functionality to gather the most current information. 

CRITICAL: Use live search to find:
1. Official websites and social media profiles
2. Recent news and developments (within the last 6 months)
3. Industry reports and market data
4. Competitor analysis and comparisons
5. Public information about target markets and customers
6. Current trends and insights

SEARCH INSTRUCTIONS:
- Always search for the Twitter profile mentioned: @username
- Search for the company's official website 
- Look for recent news articles about the company
- Find competitor information and industry context
- Search for customer testimonials and reviews
- Look for recent funding, partnerships, or business developments

Only provide analysis based on ACTUAL live search results. If you cannot find specific information through search, clearly state "Not found in current search results."`
      },
      {
        role: 'user',
        content: `Please perform live web searches to analyze this organization comprehensively:

${context}

Query: ${query}

IMPORTANT: Use your live search capabilities to find current, real information about this organization. Base your entire response on actual search results, not assumptions or generic advice.`
      }
    ];

    const completion = await grokClient.chat.completions.create({
      ...config,
      messages,
      // Grok automatically uses live search when appropriate based on the prompt context
    });

    return completion;
  } catch (error) {
    console.error('Grok Live Search Error:', error);
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
