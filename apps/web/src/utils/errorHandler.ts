/**
 * Centralized error handling utility
 * Makes error messages easy to maintain and consistent across the app
 */

export interface ErrorConfig {
  message: string;
  title?: string;
  code?: string;
}

export const ERROR_MESSAGES: Record<string, ErrorConfig> = {
  // User deletion errors
  USER_DELETE_FAILED: {
    message: 'Failed to delete user. Please try again.',
    title: 'Delete Failed',
  },
  USER_DELETE_SELF: {
    message: 'You cannot delete your own account.',
    title: 'Invalid Action',
  },
  USER_NOT_FOUND: {
    message: 'User not found. They may have already been deleted.',
    title: 'User Not Found',
  },
  
  // Generic errors
  NETWORK_ERROR: {
    message: 'Network error. Please check your connection and try again.',
    title: 'Connection Error',
  },
  UNAUTHORIZED: {
    message: 'You do not have permission to perform this action.',
    title: 'Access Denied',
  },
  SERVER_ERROR: {
    message: 'Server error. Please try again later.',
    title: 'Server Error',
  },
  UNKNOWN_ERROR: {
    message: 'An unexpected error occurred. Please try again.',
    title: 'Error',
  },
};

export function getErrorMessage(error: any): ErrorConfig {
  // Check if it's a known error code
  if (error?.response?.data?.code && ERROR_MESSAGES[error.response.data.code]) {
    return ERROR_MESSAGES[error.response.data.code];
  }

  // Check for specific HTTP status codes
  if (error?.response?.status === 400) {
    return {
      message: error.response.data?.message || ERROR_MESSAGES.USER_DELETE_FAILED.message,
      title: 'Bad Request',
    };
  }

  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return ERROR_MESSAGES.UNAUTHORIZED;
  }

  if (error?.response?.status === 404) {
    return ERROR_MESSAGES.USER_NOT_FOUND;
  }

  if (error?.response?.status >= 500) {
    return ERROR_MESSAGES.SERVER_ERROR;
  }

  // Check for network errors
  if (error?.message?.includes('Network Error') || !error?.response) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // Use custom message if provided
  if (error?.response?.data?.message) {
    return {
      message: error.response.data.message,
      title: 'Error',
    };
  }

  // Fallback to unknown error
  return ERROR_MESSAGES.UNKNOWN_ERROR;
}
