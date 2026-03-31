const axios = require("axios");
const rateLimiter = require("./rate_limiter");
const circuitBreaker = require("./circuit_breaker");
const settings = require("../config/settings");
const logger = require("../utils/logger");

async function forwardRequest(req) {
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  logger.info({ clientIp, path: req.originalUrl }, "Incoming request");

  logger.info("Before rate limiter");
  // ✅ RATE LIMIT
  const { allowed, retryAfter } = await rateLimiter.allowRequest(clientIp);

  logger.info("After rate limiter");
  if (!allowed) {
    logger.warn({ clientIp }, "Rate limit exceeded");

    return {
      status: 429,
      body: { error: "Too many requests, please try again later." },
      headers: {
        "Retry-After": retryAfter.toString(),
        "Content-Type": "application/json",
      },
    };
  }
logger.info("Before circuit breaker");
  // ✅ CIRCUIT BREAKER
  const allowedByCircuit = await circuitBreaker.beforeRequest();

  logger.info("After circuit breaker");
  if (!allowedByCircuit) {
    logger.warn("Circuit breaker OPEN - request blocked");

    return {
      status: 503,
      body: {
        error: "Service temporarily unavailable due to circuit open.",
      },
      headers: {
        "Content-Type": "application/json",
      },
    };
  }

  try {
  // ✅ Use the path extracted in proxy_routes
  const path = req.proxyPath || "";

  // ✅ Clean headers
  const headers = { ...req.headers };
  delete headers.host;
  delete headers["content-length"];

  headers["x-forwarded-for"] = clientIp;

  // ✅ Build correct upstream URL
  const url = `${settings.UPSTREAM_URL}/${path}`;

  logger.info({ url }, "Proxying to URL");

  const response = await axios({
    method: req.method,
    url, // ✅ use the correct URL
    headers,
    params: req.query, // ✅ forward query params
    data: req.body,
    validateStatus: () => true,
  });

  // ✅ Circuit breaker update
  if (response.status >= 500) {
    await circuitBreaker.onFailure();
  } else {
    await circuitBreaker.onSuccess();
  }

  logger.info(
    { status: response.status },
    "Upstream response received"
  );

  return {
    status: response.status,
    body: response.data,
    headers: response.headers, // ✅ forward headers
  };

} catch (err) {
  logger.error({ err: err.message }, "Upstream request failed");

  await circuitBreaker.onFailure();

  return {
    status: 500,
    body: { error: "Upstream error" },
    headers: {
      "Content-Type": "application/json",
    },
  };
}
}

module.exports = { forwardRequest };