/**
 * API error handling utilities
 */

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string, _field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

/**
 * Standard API response wrapper
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  timestamp: string;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(data: T): APIResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(
  error: string | Error | APIError,
  details?: any
): APIResponse {
  let message: string;
  let code: string | undefined;

  if (error instanceof APIError) {
    message = error.message;
    code = error.code;
  } else if (error instanceof Error) {
    message = error.message;
  } else {
    message = error;
  }

  return {
    success: false,
    error: {
      message,
      code,
      details,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[]
): void {
  const missingFields = requiredFields.filter(field => 
    body[field] === undefined || body[field] === null || body[field] === ''
  );

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Missing required fields: ${missingFields.join(', ')}`
    );
  }
}