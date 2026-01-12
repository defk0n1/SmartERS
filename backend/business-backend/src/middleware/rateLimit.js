import rateLimit from "express-rate-limit";

// Skip rate limiting in test and development environments
const isTest = process.env.NODE_ENV === "test";
const isDevelopment = process.env.NODE_ENV === "development";
const skipRateLimiting = isTest || isDevelopment;

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: skipRateLimiting ? 1000 : 5, // Much higher limit for test/dev, 5 for production
  message: { message: "Too many requests, try again later." },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => skipRateLimiting // Skip entirely in test/dev mode
});
