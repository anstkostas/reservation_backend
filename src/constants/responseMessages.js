const RESPONSE_MESSAGES = {
  SUCCESS: 'Request successful',
  FAILURE: 'Request failed',
  BAD_REQUEST: 'Bad request',
  NOT_FOUND: 'Resource not found',
  INTERNAL_ERROR: 'Internal server error',

  RESERVATION: {
    CREATED: 'Reservation created successfully',
    UPDATED: 'Reservation updated successfully',
    CANCELED: 'Reservation canceled successfully',
    COMPLETED: 'Reservation successfully updated as completed',
    NO_SHOW: 'Reservation successfully updated as no-show',
    RETRIEVED: 'Reservations retrieved successfully',
    NOT_FOUND: 'Reservation not found',
    INVALID_STATUS_UPDATE: 'Invalid status update',
    ALREADY_CANCELED: 'Reservation is already canceled',
  },

  AUTH: {
    LOGIN_SUCCESS: 'Logged in successfully',
    LOGOUT_SUCCESS: 'Logged out successfully',
    SIGNUP_SUCCESS: 'Account created successfully',
    USER_RETRIEVED: 'User profile retrieved successfully',
    NOT_AUTHENTICATED: 'Not authenticated',
    FORBIDDEN: 'Access denied',
    INVALID_CREDENTIALS: 'Invalid email or password',
    EMAIL_EXISTS: 'User with this email already exists',
    NOT_FOUND: 'User not found',
  },

  RESTAURANT: {
    LIST_RETRIEVED: 'Restaurants retrieved successfully',
    RETRIEVED: 'Restaurant details retrieved successfully',
    NOT_FOUND: 'Restaurant not found',
  }
};

module.exports = { RESPONSE_MESSAGES };
