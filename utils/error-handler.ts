
export interface StructuredError {
  error: {
    code: string
    message: string
    details?: any
    timestamp?: string
    request_id?: string
  }
}

export interface ValidationError {
  error: {
    code: string
    message: string
    details: {
      field_errors: Array<{
        field: string
        message: string
        type: string
        value?: any
      }>
      total_errors: number
    }
    timestamp?: string
    request_id?: string
  }
}

/**
 * Extract user-friendly error message from backend response
 */
export function extractErrorMessage(response: Response, responseData?: any): string {
  try {
    if (responseData) {
      if (responseData.error && responseData.error.message) {
        return responseData.error.message
      }
      
      if (responseData.error && responseData.error.details && responseData.error.details.field_errors) {
        const fieldErrors = responseData.error.details.field_errors
        if (fieldErrors.length > 0) {
          return fieldErrors[0].message
        }
      }
      
      if (responseData.detail) {
        return responseData.detail
      }
      
      if (responseData.message) {
        return responseData.message
      }
    }
    
    switch (response.status) {
      case 400:
        return 'Bad request. Please check your input.'
      case 401:
        return 'Authentication failed. Please check your credentials.'
      case 403:
        return 'Access denied. You don\'t have permission to perform this action.'
      case 404:
        return 'Resource not found.'
      case 409:
        return 'Conflict. The resource already exists.'
      case 422:
        return 'Validation failed. Please check your input.'
      case 429:
        return 'Too many requests. Please wait before trying again.'
      case 500:
        return 'Internal server error. Please try again later.'
      case 502:
        return 'Bad gateway. Service temporarily unavailable.'
      case 503:
        return 'Service unavailable. Please try again later.'
      default:
        return 'An unexpected error occurred. Please try again.'
    }
  } catch (error) {
    console.error('Error extracting error message:', error)
    return 'An unexpected error occurred. Please try again.'
  }
}

export function extractErrorDetails(response: Response, responseData?: any): {
  message: string
  code?: string
  details?: any
  status: number
} {
  const message = extractErrorMessage(response, responseData)
  
  let code: string | undefined
  let details: any = undefined
  
  if (responseData) {
    if (responseData.error && responseData.error.code) {
      code = responseData.error.code
    }
    if (responseData.error && responseData.error.details) {
      details = responseData.error.details
    }
  }
  
  return {
    message,
    code,
    details,
    status: response.status
  }
}

export function isValidationError(responseData: any): boolean {
  return responseData?.error?.details?.field_errors && 
         Array.isArray(responseData.error.details.field_errors)
}

export function getFieldErrors(responseData: any): Array<{ field: string; message: string }> {
  if (!isValidationError(responseData)) {
    return []
  }
  
  return responseData.error.details.field_errors.map((error: any) => ({
    field: error.field,
    message: error.message
  }))
}

export function formatValidationErrors(fieldErrors: Array<{ field: string; message: string }>): string {
  if (fieldErrors.length === 0) {
    return 'Validation failed. Please check your input.'
  }
  
  if (fieldErrors.length === 1) {
    return fieldErrors[0].message
  }
  
  const errorMessages = fieldErrors.map(error => `${error.field}: ${error.message}`)
  return errorMessages.join('; ')
}
