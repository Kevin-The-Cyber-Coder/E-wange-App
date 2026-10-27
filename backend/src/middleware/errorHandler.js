import env from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Central error handler. Every error funnels through here so the client
 * always receives the same JSON shape.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal server error";
  let details = err.details || null;

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation failed";
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid value for field "${err.path}"`;
  }

  // Duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    message = "Duplicate value";
    details = err.keyValue || null;
  }

  if (statusCode >= 500) {
    console.error("[error]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details,
    ...(env.isProd ? {} : { stack: err.stack }),
  });
}

export { ApiError };
export default errorHandler;
