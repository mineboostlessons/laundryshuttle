import { describe, it, expect, beforeEach, vi } from "vitest";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

// No need to mock — rate-limit is pure in-memory logic

describe("rateLimit", () => {
  beforeEach(() => {
    // Reset the rate limit store between tests by advancing time far ahead
    vi.useFakeTimers();
    vi.advanceTimersByTime(120_000); // 2 minutes — clears all windows
  });

  it("should allow requests within the limit", () => {
    const config = { limit: 5, windowSeconds: 60 };

    const result1 = rateLimit("test-key-1", config);
    expect(result1.success).toBe(true);
    expect(result1.remaining).toBe(4);

    const result2 = rateLimit("test-key-1", config);
    expect(result2.success).toBe(true);
    expect(result2.remaining).toBe(3);
  });

  it("should block requests over the limit", () => {
    const config = { limit: 3, windowSeconds: 60 };

    rateLimit("test-key-2", config);
    rateLimit("test-key-2", config);
    rateLimit("test-key-2", config);

    const result = rateLimit("test-key-2", config);
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should reset after window expires", () => {
    const config = { limit: 2, windowSeconds: 10 };

    rateLimit("test-key-3", config);
    rateLimit("test-key-3", config);

    const blocked = rateLimit("test-key-3", config);
    expect(blocked.success).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(11_000);

    const afterReset = rateLimit("test-key-3", config);
    expect(afterReset.success).toBe(true);
    expect(afterReset.remaining).toBe(1);
  });

  it("should track different keys independently", () => {
    const config = { limit: 1, windowSeconds: 60 };

    const r1 = rateLimit("key-a", config);
    expect(r1.success).toBe(true);

    const r2 = rateLimit("key-b", config);
    expect(r2.success).toBe(true);

    // key-a is now blocked, key-b is independent
    const r3 = rateLimit("key-a", config);
    expect(r3.success).toBe(false);
  });
});

describe("rateLimitHeaders", () => {
  it("should return standard rate limit headers", () => {
    const headers = rateLimitHeaders({
      success: true,
      limit: 60,
      remaining: 59,
      resetAt: Date.now() + 60_000,
    });

    expect(headers["X-RateLimit-Limit"]).toBe("60");
    expect(headers["X-RateLimit-Remaining"]).toBe("59");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
    expect(headers["Retry-After"]).toBeUndefined();
  });

  it("should include Retry-After when rate limited", () => {
    const headers = rateLimitHeaders({
      success: false,
      limit: 10,
      remaining: 0,
      resetAt: Date.now() + 30_000,
    });

    expect(headers["X-RateLimit-Remaining"]).toBe("0");
    expect(headers["Retry-After"]).toBeDefined();
  });
});
