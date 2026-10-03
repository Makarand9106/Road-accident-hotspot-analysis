/**
 * Custom API Error classes and error response formatters.
 */

export class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code
   * @param {string} message - Human-readable error message
   * @param {any} [details=null] - Additional validation or contextual details
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
  }
}

export function badRequest(message, details = null) {
  return new ApiError(400, message, details);
}

export function notFound(message = 'Requested resource not found') {
  return new ApiError(404, message);
}

export function internal(message = 'Internal server error', details = null) {
  return new ApiError(500, message, details);
}
