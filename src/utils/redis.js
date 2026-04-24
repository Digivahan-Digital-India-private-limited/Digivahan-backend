const Redis = require("ioredis");

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({ host: "127.0.0.1", port: 6379 });

redis.on("connect", () => console.log("Redis connected 🚀"));
redis.on("error", (err) => console.log("Redis error ❌", err));

