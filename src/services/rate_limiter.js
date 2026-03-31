const redis = require("./redis_client");
const settings = require("../config/settings");

class RateLimiter {
  async allowRequest(clientIp) {
    const key = `rate_limit:${clientIp}`;
    const now = Math.floor(Date.now() / 1000);

    const result = await redis.tokenBucket(
      key,
      settings.RATE_LIMIT_CAPACITY,
      now,
      settings.RATE_LIMIT_REFILL_RATE
    );

    const allowed = result[0] === 1;
    const tokens = result[1];

    if (!allowed) {
      const retryAfter = Math.ceil(
        (1 - tokens) / settings.RATE_LIMIT_REFILL_RATE
      );
      return { allowed: false, retryAfter };
    }

    return { allowed: true, retryAfter: 0 };
  }
}

module.exports = new RateLimiter();