import { useState, useCallback } from 'react';

interface GrokResponse {
  response: string;
  model: string;
  usage?: any;
  analysisType: 'general' | 'profile';
  config: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
}

interface GrokAnalysisOptions {
  context?: string;
  isProfileAnalysis?: boolean;
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
          isProfileAnalysis: options.isProfileAnalysis || false,
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


