/**
 * Client-side API utilities for handling responses and errors
 */

import { APIResponse } from './api-utils';

/**
 * Generic fetch wrapper with error handling
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data: APIResponse<T> = await response.json();

    if (!response.ok) {
      throw new APIClientError(
        data.error?.message || `HTTP ${response.status}`,
        response.status,
        data.error?.code
      );
    }

    if (!data.success) {
      throw new APIClientError(
        data.error?.message || 'API request failed',
        response.status,
        data.error?.code
      );
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof APIClientError) {
      throw error;
    }

    // Network or parsing errors
    throw new APIClientError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      0
    );
  }
}

/**
 * Client-side API error class
 */
export class APIClientError extends Error {
  constructor(
    message: string,
    public statusCode: number = 0,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIClientError';
  }

  get isNetworkError(): boolean {
    return this.statusCode === 0;
  }

  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  url: string,
  data?: any,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(
  url: string,
  options: Omit<RequestInit, 'method'> = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(
  url: string,
  data?: any,
  options: Omit<RequestInit, 'method' | 'body'> = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(
  url: string,
  options: Omit<RequestInit, 'method'> = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'DELETE',
  });
}
