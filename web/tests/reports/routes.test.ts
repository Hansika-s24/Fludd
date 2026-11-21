// The route files and the Supabase-backed store, with supabase-js mocked (no network).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface Call {
  table: string;
  op: string;
  args: unknown[];
}
const calls: Call[] = [];
let nextResult: { data: unknown; error: { message: string; code?: string } | null } = { data: null, error: null };
let user: { id: string } | null = null;

/** A chainable stand-in for the query builder: records each step, resolves to nextResult. */
function builder(table: string): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  for (const op of ["select", "insert", "update", "eq", "order", "limit"]) {
    b[op] = (...args: unknown[]) => {
      calls.push({ table, op, args });
      return b;
    };
  }
  b.maybeSingle = async () => nextResult;
  b.single = async () => nextResult;
  b.then = (resolve: (v: unknown) => unknown) => resolve(nextResult);
  return b;
}

vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, key: string) => ({
    key,
    from: (table: string) => builder(table),
    storage: {
      from: (bucket: string) => ({
        upload: async (...args: unknown[]) => {
          calls.push({ table: `storage:${bucket}`, op: "upload", args });
          return { error: null };
        },
        remove: async (...args: unknown[]) => {
          calls.push({ table: `storage:${bucket}`, op: "remove", args });
          return { error: null };
        },
      }),
    },
    auth: {
      getUser: async (token: string) => {
        calls.push({ table: "auth", op: "getUser", args: [token] });
        return user ? { data: { user }, error: null } : { data: { user: null }, error: { message: "bad jwt" } };
      },
    },
  }),
}));

beforeEach(() => {
  calls.length = 0;
  nextResult = { data: null, error: null };
  user = null;
  vi.resetModules();
});
afterEach(() => vi.unstubAllEnvs());

function configure() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://supabase.test");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-test");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-test");
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("routes without Supabase settings", () => {
  it("answer 503 not_configured in the error shape", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    const { GET } = await import("@/app/api/reports/route");
    const res = await GET(new Request("http://localhost/api/reports?status=approved"));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: { code: "not_configured", message: expect.any(String) } });
  });
});

describe("GET /api/reports route", () => {
  it("reads public_reports only, through the anon key", async () => {
    configure();
    nextResult = {
      data: [{ id: "r1", lng: -82.41, lat: 28.06, depth_m: 0.3, source: "pin", created_at: "2026-11-21T16:00:00+00:00" }],
      error: null,
    };
    const { GET } = await import("@/app/api/reports/route");
    const res = await GET(new Request("http://localhost/api/reports?status=approved"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      reports: [{ id: "r1", position: [-82.41, 28.06], depthM: 0.3, createdAt: "2026-11-21T16:00:00+00:00", source: "pin" }],
    });
    expect(new Set(calls.map((c) => c.table))).toEqual(new Set(["public_reports"]));
  });
});

describe("POST /api/reports/[id]/moderate route", () => {
  const ID = "11111111-2222-4333-8444-555555555555";
  const post = (token: string | null) =>
    new Request(`http://localhost/api/reports/${ID}/moderate`, {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: JSON.stringify({ decision: "reject" }),
    });

  it("401 without a token and never touches the tables", async () => {
    configure();
    const { POST } = await import("@/app/api/reports/[id]/moderate/route");
    const res = await POST(post(null), ctx(ID) as never);
    expect(res.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("401 when Supabase rejects the token", async () => {
    configure();
    const { POST } = await import("@/app/api/reports/[id]/moderate/route");
    expect((await POST(post("bad"), ctx(ID) as never)).status).toBe(401);
  });

  it("403 when the user is not in admins", async () => {
    configure();
    user = { id: "bbbbbbbb-0000-4000-8000-000000000002" };
    nextResult = { data: null, error: null };
    const { POST } = await import("@/app/api/reports/[id]/moderate/route");
    const res = await POST(post("good"), ctx(ID) as never);
    expect(res.status).toBe(403);
    expect(calls.find((c) => c.table === "admins" && c.op === "eq")?.args).toEqual(["user_id", user.id]);
  });
});
