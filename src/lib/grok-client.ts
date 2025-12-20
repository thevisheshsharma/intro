/**
 * Centralized xAI Grok client configuration
 * Uses the official @ai-sdk/xai SDK for all Grok API interactions
 */

import { xai } from '@ai-sdk/xai';

// Model configurations
export const GROK_MODELS = {
  // Primary model for comprehensive analysis (ICP, detailed classification)
  ANALYSIS: 'grok-3-beta',
  // Fast model for quick classification tasks
  CLASSIFICATION: 'grok-2-1212',
  // Vision-capable model
  VISION: 'grok-2-vision-1212',
} as const;

// Default generation settings
export const GROK_CONFIG = {
  temperature: 0.7,
  maxTokens: 4096,
  // For classification tasks - lower temperature for consistency
  classification: {
    temperature: 0.3,
    maxTokens: 2048,
  },
  // For analysis tasks - slightly higher temperature for nuance
  analysis: {
    temperature: 0.7,
    maxTokens: 8192,
  },
} as const;

// Export the xai provider factory for use with generateObject/generateText
export { xai };

// Helper to create model instances with default settings
export function createAnalysisModel() {
  return xai(GROK_MODELS.ANALYSIS);
}

export function createClassificationModel() {
  return xai(GROK_MODELS.CLASSIFICATION);
}

export function createVisionModel() {
  return xai(GROK_MODELS.VISION);
}
