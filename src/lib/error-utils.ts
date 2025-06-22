/**
 * Unified Error Handling Utility
 * Centralizes error logging and handling patterns across the application
 */

export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
} as const

export const ErrorCategory = {
  DATABASE: 'database',
  API: 'api', 
  VALIDATION: 'validation',
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  PARSING: 'parsing',
  EXTERNAL_SERVICE: 'external_service'
} as const

type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity]
type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory]

interface ErrorContext {
  operation: string
  category: ErrorCategory
  severity?: ErrorSeverity
  userId?: string
  metadata?: Record<string, any>
}

interface ErrorLogEntry {
  timestamp: string
  message: string
  operation: string
  category: ErrorCategory
  severity: ErrorSeverity
  error?: any
  context?: Record<string, any>
}

// Utility functions for error checking and formatting
const isDatabaseNotFoundError = (error: any): boolean => 
  error?.code === 'PGRST116' || error?.message?.includes('No rows returned')

const sanitizeError = (error: any) => error ? {
  message: error.message,
  code: error.code,
  status: error.status,
  statusCode: error.statusCode,
  name: error.name
} : null

const inferSeverity = (error: any, category: ErrorCategory): ErrorSeverity => {
  if (category === ErrorCategory.DATABASE && isDatabaseNotFoundError(error)) {
    return ErrorSeverity.LOW
  }
  if (category === ErrorCategory.AUTHENTICATION) {
    return ErrorSeverity.HIGH
  }
  return ErrorSeverity.MEDIUM
}

const buildErrorMessage = (error: any, context: ErrorContext): string => {
  const baseMessage = `${context.category} error in ${context.operation}`
  return error?.message ? `${baseMessage}: ${error.message}` : `${baseMessage}: Unknown error`
}

const logToConsole = (logEntry: ErrorLogEntry): void => {
  const prefix = `[${logEntry.category.toUpperCase()}] ${logEntry.operation}`
  
  if (logEntry.severity === ErrorSeverity.LOW) {
    // Only log low severity errors in development
    if (process.env.NODE_ENV === 'development') {
      console.warn(prefix, logEntry.message)
    }
  } else {
    const isHighSeverity = logEntry.severity === ErrorSeverity.CRITICAL || logEntry.severity === ErrorSeverity.HIGH
    console.error(prefix, logEntry.message, ...(isHighSeverity && logEntry.error ? [logEntry.error] : []))
  }
}

// Core logging function
const logError = (
  error: any,
  context: ErrorContext,
  customMessage?: string
): ErrorLogEntry => {
  const severity = context.severity || inferSeverity(error, context.category)
  const message = customMessage || buildErrorMessage(error, context)
  
  const logEntry: ErrorLogEntry = {
    timestamp: new Date().toISOString(),
    message,
    operation: context.operation,
    category: context.category,
    severity,
    error: sanitizeError(error),
    context: context.metadata
  }

  logToConsole(logEntry)
  return logEntry
}

// Specialized logging functions
export const logDatabaseError = (
  error: any,
  operation: string,
  table?: string,
  userId?: string
): ErrorLogEntry => logError(error, {
  operation,
  category: ErrorCategory.DATABASE,
  severity: isDatabaseNotFoundError(error) ? ErrorSeverity.LOW : ErrorSeverity.MEDIUM,
  userId,
  metadata: { table }
})

export const logAPIError = (
  error: any,
  operation: string,
  endpoint?: string,
  userId?: string
): ErrorLogEntry => logError(error, {
  operation,
  category: ErrorCategory.API,
  severity: ErrorSeverity.MEDIUM,
  userId,
  metadata: { endpoint }
})

export const logExternalServiceError = (
  error: any,
  operation: string,
  service: string,
  userId?: string
): ErrorLogEntry => logError(error, {
  operation,
  category: ErrorCategory.EXTERNAL_SERVICE,
  severity: ErrorSeverity.HIGH,
  userId,
  metadata: { service }
})

export const logParsingError = (
  error: any,
  operation: string,
  dataType?: string,
  userId?: string
): ErrorLogEntry => logError(error, {
  operation,
  category: ErrorCategory.PARSING,
  severity: ErrorSeverity.LOW,
  userId,
  metadata: { dataType }
})

// Error handling functions that return appropriate values
export const handleDatabaseError = (
  error: any,
  operation: string,
  table?: string,
  userId?: string
): null => {
  // Don't log "not found" as errors
  if (!isDatabaseNotFoundError(error)) {
    logDatabaseError(error, operation, table, userId)
  }
  return null
}

export const handleAPIError = (
  error: any,
  operation: string,
  endpoint?: string,
  userId?: string
): { error: string; details?: string } => {
  logAPIError(error, operation, endpoint, userId)
  
  const getUserFriendlyMessage = (category: ErrorCategory): string => {
    const messages = {
      [ErrorCategory.DATABASE]: 'Database operation failed',
      [ErrorCategory.API]: 'API request failed',
      [ErrorCategory.NETWORK]: 'Network connection failed',
      [ErrorCategory.AUTHENTICATION]: 'Authentication failed',
      [ErrorCategory.EXTERNAL_SERVICE]: 'External service unavailable',
      [ErrorCategory.PARSING]: 'Data parsing failed',
      [ErrorCategory.VALIDATION]: 'Validation failed'
    }
    return messages[category] || 'An unexpected error occurred'
  }

  return {
    error: getUserFriendlyMessage(ErrorCategory.API),
    details: error.message || 'Unknown error occurred'
  }
}

// Utility function for quick error logging with minimal setup
export const quickLog = {
  database: (error: any, operation: string, table?: string) => 
    logDatabaseError(error, operation, table),
  
  api: (error: any, operation: string, endpoint?: string) => 
    logAPIError(error, operation, endpoint),
  
  parsing: (error: any, operation: string, dataType?: string) => 
    logParsingError(error, operation, dataType),
  
  external: (error: any, operation: string, service: string) => 
    logExternalServiceError(error, operation, service)
}

/**
 * Legacy compatibility - maintains existing function signature
 * @deprecated Use handleDatabaseError instead
 */
export function handleError(error: any, operation: string, context?: string): null {
  return handleDatabaseError(error, operation, context)
}
