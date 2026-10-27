/**
 * Wraps an async route handler so rejected promises are forwarded to
 * Express' error middleware instead of crashing the process.
 */
export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export default asyncHandler;
