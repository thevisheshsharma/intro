/**
 * Field validation and standardization for user classification data
 */

// Strict enum definitions for vibe field
export enum VibeType {
  INDIVIDUAL = 'individual',
  ORGANIZATION = 'organization',
  SPAM = 'spam',
  UNCLASSIFIED = ''
}

// Valid vibe values as array for validation
export const VALID_VIBE_VALUES = Object.values(VibeType) as string[]

// Validation functions
export interface ValidationResult {
  isValid: boolean
  sanitizedValue: string
  error?: string
}

/**
 * Validate and sanitize vibe field value
 */
export function validateVibe(value: any): ValidationResult {
  // Handle null, undefined, or empty values
  if (value === null || value === undefined) {
    return {
      isValid: true,
      sanitizedValue: VibeType.UNCLASSIFIED,
      error: undefined
    }
  }

  // Convert to string and trim
  const stringValue = String(value).trim()

  // Check if it's a valid vibe value
  if (VALID_VIBE_VALUES.includes(stringValue)) {
    return {
      isValid: true,
      sanitizedValue: stringValue,
      error: undefined
    }
  }

  // Invalid value - log the error and return fallback
  const error = `Invalid vibe value: "${stringValue}". Must be one of: ${VALID_VIBE_VALUES.join(', ')}`
  
  return {
    isValid: false,
    sanitizedValue: VibeType.UNCLASSIFIED, // Fallback to unclassified
    error
  }
}

/**
 * Strict vibe validation that throws on invalid values
 */
export function validateVibeStrict(value: any): string {
  const result = validateVibe(value)
  
  if (!result.isValid) {
    throw new Error(result.error!)
  }
  
  return result.sanitizedValue
}

/**
 * Batch validate vibe values for multiple users
 */
export function validateVibesBatch(users: Array<{ userId: string; vibe: any }>): {
  validUsers: Array<{ userId: string; vibe: string }>
  invalidUsers: Array<{ userId: string; originalVibe: any; error: string }>
} {
  const validUsers: Array<{ userId: string; vibe: string }> = []
  const invalidUsers: Array<{ userId: string; originalVibe: any; error: string }> = []

  users.forEach(user => {
    const validation = validateVibe(user.vibe)
    
    if (validation.isValid) {
      validUsers.push({
        userId: user.userId,
        vibe: validation.sanitizedValue
      })
    } else {
      invalidUsers.push({
        userId: user.userId,
        originalVibe: user.vibe,
        error: validation.error!
      })
      
      // Also add to valid users with sanitized fallback value
      validUsers.push({
        userId: user.userId,
        vibe: validation.sanitizedValue
      })
    }
  })

  return { validUsers, invalidUsers }
}

/**
 * Log validation errors for monitoring
 */
export function logValidationError(field: string, value: any, error: string, context?: string) {
  const logMessage = `[VALIDATION ERROR] Field: ${field}, Value: "${value}", Error: ${error}`
  const fullMessage = context ? `${logMessage}, Context: ${context}` : logMessage
  
  console.error(fullMessage)
  
  // In production, you might want to send this to a monitoring service
  // Example: sendToMonitoring({ type: 'validation_error', field, value, error, context })
}

/**
 * Helper function to check if a vibe value is valid without sanitization
 */
export function isValidVibe(value: string): boolean {
  return VALID_VIBE_VALUES.includes(value)
}

/**
 * Get all valid vibe values for reference
 */
export function getValidVibeValues(): string[] {
  return [...VALID_VIBE_VALUES]
}
