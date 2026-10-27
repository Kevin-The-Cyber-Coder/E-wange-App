import jwt from "jsonwebtoken";
import env from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Verifies the `Authorization: Bearer <token>` header and attaches the
 * decoded payload to `req.user`.
 */
export function authenticate(req, res, next) {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed authorization header"));
  }

  const token = header.slice(7).trim();

  if (!token) {
    return next(ApiError.unauthorized("Missing token"));
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    return next();
  } catch {
    return next(ApiError.unauthorized("Invalid or expired token"));
  }
}

/**
 * Restricts a route to one or more roles. Use after `authenticate`.
 */
export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return next(ApiError.forbidden("Insufficient permissions"));
    }

    return next();
  };
}

export default authenticate;
