import { z } from "zod";
import { ApiError } from "../utils/ApiError.js";

/**
 * Validates `req[source]` against a zod schema and replaces it with the
 * parsed (and type-coerced) value.
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || source,
        message: issue.message,
      }));

      return next(ApiError.badRequest("Validation failed", details));
    }

    req[source] = result.data;
    return next();
  };
}

export const objectId = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ObjectId");

export default validate;
