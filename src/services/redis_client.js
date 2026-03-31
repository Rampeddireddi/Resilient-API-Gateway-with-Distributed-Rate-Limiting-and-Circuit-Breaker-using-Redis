const Redis = require("ioredis");
const settings = require("../config/settings");

const client = new Redis({
  host: settings.REDIS_HOST,
  port: settings.REDIS_PORT,
});

client.on("connect", () => {
  console.log("✅ Redis connected");
});

// ✅ NOW this works
client.defineCommand("tokenBucket", {
  numberOfKeys: 1,
  lua: `
    local tokens = tonumber(redis.call("HGET", KEYS[1], "tokens")) or tonumber(ARGV[1])
    local last_refill = tonumber(redis.call("HGET", KEYS[1], "last_refill_time")) or tonumber(ARGV[2])

    local capacity = tonumber(ARGV[1])
    local refill_rate = tonumber(ARGV[3])
    local now = tonumber(ARGV[2])

    local elapsed = now - last_refill
    local refill = elapsed * refill_rate

    tokens = math.min(capacity, tokens + refill)

    if tokens < 1 then
      return {0, tokens}
    end

    tokens = tokens - 1

    redis.call("HSET", KEYS[1],
      "tokens", tokens,
      "last_refill_time", now
    )

    return {1, tokens}
  `,
});

module.exports = client;