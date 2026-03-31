const rateLimiter = require("../../src/services/rate_limiter");

test("should allow requests within limit", async () => {
  const res = await rateLimiter.allowRequest("test-ip");
  expect(res.allowed).toBe(true);
});