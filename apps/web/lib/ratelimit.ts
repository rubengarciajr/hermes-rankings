import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Returns an Upstash-backed rate limiter when KV credentials exist, or an
 * in-memory fallback for local dev. The fallback is per-process and resets
 * on restart — fine for dev, never deploy to production without real KV.
 */
type Limiter = {
  limit: (key: string) => Promise<{ success: boolean; reset: number }>;
};

class MemoryLimiter implements Limiter {
  private bucket = new Map<string, number[]>();
  constructor(
    private readonly windowMs: number,
    private readonly max: number,
  ) {}
  async limit(key: string) {
    const now = Date.now();
    const cutoff = now - this.windowMs;
    const arr = (this.bucket.get(key) ?? []).filter((t) => t > cutoff);
    if (arr.length >= this.max) {
      const reset = (arr[0] ?? now) + this.windowMs;
      this.bucket.set(key, arr);
      return { success: false, reset };
    }
    arr.push(now);
    this.bucket.set(key, arr);
    return { success: true, reset: now + this.windowMs };
  }
}

function makeLimiter(opts: {
  prefix: string;
  windowSec: number;
  max: number;
}): Limiter {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    const rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(opts.max, `${opts.windowSec} s`),
      prefix: `hr:${opts.prefix}`,
      analytics: false,
    });
    return {
      async limit(key: string) {
        const r = await rl.limit(key);
        return { success: r.success, reset: r.reset };
      },
    };
  }
  return new MemoryLimiter(opts.windowSec * 1000, opts.max);
}

export const limiters = {
  // Register limits are deliberately generous because a) the actual dedupe
  // is the unique-fingerprint check inside /register/start, b) legit users
  // retry after schema bumps, browser closes, network blips, etc.
  registerStartByIp: makeLimiter({
    prefix: "reg-start-ip",
    windowSec: 3600,
    max: 10,
  }),
  registerStartByFingerprint: makeLimiter({
    prefix: "reg-start-fp",
    windowSec: 3600,
    max: 10,
  }),
  // Submit limits are tight — once registered, you shouldn't need many.
  submitByKey: makeLimiter({
    prefix: "submit-key",
    windowSec: 60,
    max: 1,
  }),
  submitByIp: makeLimiter({
    prefix: "submit-ip",
    windowSec: 86400,
    max: 30,
  }),
};
