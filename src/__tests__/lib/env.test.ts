import { describe, it, expect, vi, beforeEach } from "vitest";

// Must mock before importing
vi.mock("zod", async (importOriginal) => {
  const actual = await importOriginal<typeof import("zod")>();
  return actual;
});

describe("checkEnvironmentVariables", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should return check results for all monitored variables", async () => {
    const { checkEnvironmentVariables } = await import("@/lib/env");
    const results = checkEnvironmentVariables();

    expect(results).toBeInstanceOf(Array);
    expect(results.length).toBeGreaterThan(0);

    // Every result should have required shape
    for (const result of results) {
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("category");
      expect(result).toHaveProperty("configured");
      expect(result).toHaveProperty("required");
      expect(typeof result.name).toBe("string");
      expect(typeof result.configured).toBe("boolean");
    }
  });

  it("should mark DATABASE_URL as required", async () => {
    const { checkEnvironmentVariables } = await import("@/lib/env");
    const results = checkEnvironmentVariables();

    const dbCheck = results.find((r) => r.name === "DATABASE_URL");
    expect(dbCheck).toBeDefined();
    expect(dbCheck!.required).toBe(true);
  });

  it("should mark CRON_SECRET as optional", async () => {
    const { checkEnvironmentVariables } = await import("@/lib/env");
    const results = checkEnvironmentVariables();

    const cronCheck = results.find((r) => r.name === "CRON_SECRET");
    expect(cronCheck).toBeDefined();
    expect(cronCheck!.required).toBe(false);
  });

  it("should detect configured variables from process.env", async () => {
    process.env.NEXT_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123";
    const { checkEnvironmentVariables } = await import("@/lib/env");
    const results = checkEnvironmentVariables();

    const sentryCheck = results.find((r) => r.name === "NEXT_PUBLIC_SENTRY_DSN");
    expect(sentryCheck?.configured).toBe(true);

    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });
});
