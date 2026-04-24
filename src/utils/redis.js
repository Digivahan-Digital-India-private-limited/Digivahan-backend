// Mock Redis class to run without an actual Redis server
class MemoryRedis {
  constructor() {
    this.store = new Map();
    this.timers = new Map();
  }

  on(event, handler) {
    if (event === "connect") {
      setTimeout(() => {
        console.log("In-Memory Redis mock connected 🚀");
        handler();
      }, 10);
    }
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async set(key, value, ex, seconds) {
    this.store.set(key, String(value));
    if (ex === "EX" && seconds) {
      if (this.timers.has(key)) clearTimeout(this.timers.get(key));
      this.timers.set(key, setTimeout(() => {
        this.store.delete(key);
        this.timers.delete(key);
      }, seconds * 1000));
    }
    return "OK";
  }

  async del(key) {
    if (this.store.has(key)) {
      this.store.delete(key);
      if (this.timers.has(key)) {
        clearTimeout(this.timers.get(key));
        this.timers.delete(key);
      }
      return 1;
    }
    return 0;
  }

  async incr(key) {
    let val = parseInt(this.store.get(key) || "0", 10);
    if (isNaN(val)) val = 0;
    val += 1;
    this.store.set(key, String(val));
    return val;
  }

  async expire(key, seconds) {
    if (this.store.has(key)) {
      if (this.timers.has(key)) clearTimeout(this.timers.get(key));
      this.timers.set(key, setTimeout(() => {
        this.store.delete(key);
        this.timers.delete(key);
      }, seconds * 1000));
      return 1;
    }
    return 0;
  }
}

const redis = new MemoryRedis();
module.exports = redis;
