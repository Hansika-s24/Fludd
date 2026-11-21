import type { ApiError } from "@/lib/types";

/** The one error shape every route returns. */
export function apiError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } } satisfies ApiError, { status });
}
