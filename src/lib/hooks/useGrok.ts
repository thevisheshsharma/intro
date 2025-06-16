import { useState, useCallback } from 'react';
import { ANALYSIS_TYPES, type AnalysisType } from '@/lib/constants';

export interface GrokResponse {
  response: string;
  model: string;
  usage?: any;
  analysisType: AnalysisType;
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

export interface GrokStreamResponse {
  content: string;
  done: boolean;
  error?: string;
}

export interface GrokFunctionResponse {
  type: 'text' | 'function_call';
  response?: string;
  function_call?: any;
  message?: string;
  model?: string;
  usage?: any;
}

export interface GrokAnalysisOptions {
  context?: string;
  analysisType?: AnalysisType;
  useFullModel?: boolean;
  useFastModel?: boolean;
}

/**
 * Hook for basic Grok analysis
 */
export function useGrokAnalysis() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    message: string,
    options: GrokAnalysisOptions = {}
  ): Promise<GrokResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/grok-analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: options.context,
          analysisType: options.analysisType || ANALYSIS_TYPES.GENERAL,
          useFullModel: options.useFullModel ?? true,
          useFastModel: options.useFastModel ?? false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to analyze');
      }

      const data = await response.json();
      return data.success ? data.data : data;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { analyze, loading, error };
}

// Hook for streaming Grok responses
export function useGrokStream() {
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stream = useCallback(async (
    message: string,
    onChunk: (chunk: GrokStreamResponse) => void,
    options?: {
      context?: string;
      analysisType?: 'general' | 'twitter' | 'profile' | 'content' | 'realtime';
      useFullModel?: boolean;
      useFastModel?: boolean;
    }
  ) => {
    setStreaming(true);
    setError(null);

    try {
      const response = await fetch('/api/grok-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: options?.context,
          analysisType: options?.analysisType || 'general',
          useFullModel: options?.useFullModel ?? true,
          useFastModel: options?.useFastModel ?? false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stream');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No reader available');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
        
        for (const line of lines) {
          const data = line.slice(6); // Remove 'data: '
          try {
            const parsed = JSON.parse(data);
            onChunk(parsed);
            
            if (parsed.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
      onChunk({ content: '', done: true, error: err.message });
    } finally {
      setStreaming(false);
    }
  }, []);

  return { stream, streaming, error };
}

// Hook for Grok function calling
export function useGrokFunctions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callFunction = useCallback(async (
    message: string,
    options?: {
      context?: string;
      functions?: any[];
      useFullModel?: boolean;
      useFastModel?: boolean;
    }
  ): Promise<GrokFunctionResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/grok-functions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          context: options?.context,
          functions: options?.functions,
          useFullModel: options?.useFullModel ?? true,
          useFastModel: options?.useFastModel ?? false,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to call function');
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const executeFunction = useCallback(async (
    functionName: string,
    functionArgs: any
  ) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/grok-functions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          functionName,
          arguments: functionArgs,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute function');
      }

      const data = await response.json();
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { callFunction, executeFunction, loading, error };
}

// Utility function to format Grok responses
export function formatGrokResponse(response: string): string {
  // Add basic formatting for better readability
  return response
    .replace(/\n\n/g, '\n')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/```[\s\S]*?```/g, (match) => `<pre><code>${match.slice(3, -3)}</code></pre>`);
}

// Utility to estimate token usage
export function estimateTokens(text: string): number {
  // Rough estimation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}
