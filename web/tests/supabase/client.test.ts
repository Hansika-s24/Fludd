// The shared browser client: lazy, and "not configured" instead of throwing when env is empty.
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("browser Supabase client", () => {
  it("is null, without throwing at import, when the URL is empty", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const mod = await import("@/lib/supabase/client");
    expect(mod.isSupabaseConfigured()).toBe(false);
    expect(mod.getBrowserClient()).toBeNull();
  });

  it("is one shared instance when configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
    const mod = await import("@/lib/supabase/client");
    expect(mod.isSupabaseConfigured()).toBe(true);
    const a = mod.getBrowserClient();
    expect(a).not.toBeNull();
    expect(mod.getBrowserClient()).toBe(a);
  });
});
