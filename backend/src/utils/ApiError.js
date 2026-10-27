/**
 * Small wrapper so controllers can throw and let the central error
 * handler produce a consistent JSON response.
 */
export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message = "Bad request", details = null) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Unauthorized", details = null) {
    return new ApiError(401, message, details);
  }

  static forbidden(message = "Forbidden", details = null) {
    return new ApiError(403, message, details);
  }

  static notFound(message = "Resource not found", details = null) {
    return new ApiError(404, message, details);
  }

  static conflict(message = "Conflict", details = null) {
    return new ApiError(409, message, details);
  }
}

export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export default ApiError;
