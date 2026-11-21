// Server only. Food share storage: one private Supabase Storage bucket of small JSON files, so it runs today with
// the service key and no database migration. ponytail: lists and downloads every file per read, fine for hundreds
// of rows; move to tables (docs/food-share.md, "Data model") before a real storm's volume.
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { REQUEST_TTL_MS, toCell, type FoodRequest, type Giver } from "./share";
import type { z } from "zod";
import type { NewGiver, NewRequest } from "./share";

const BUCKET = "food-share";

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function bucket() {
  const db = createServiceClient();
  const { error } = await db.storage.createBucket(BUCKET, { public: false });
  if (error && !/exist/i.test(error.message)) throw new Error(`Food share storage failed: ${error.message}`);
  return db.storage.from(BUCKET);
}

async function readAll<T>(folder: "givers" | "requests"): Promise<T[]> {
  const b = await bucket();
  const { data, error } = await b.list(folder, { limit: 1000 });
  if (error) throw new Error(`Food share list failed: ${error.message}`);
  const rows = await Promise.all(
    (data ?? []).filter((f) => f.name.endsWith(".json")).map(async (f) => {
      const { data: blob } = await b.download(`${folder}/${f.name}`);
      return blob ? (JSON.parse(await blob.text()) as T) : null;
    }),
  );
  return rows.filter((r): r is NonNullable<typeof r> => r !== null) as T[];
}

async function write(folder: "givers" | "requests", id: string, row: unknown): Promise<void> {
  const b = await bucket();
  const { error } = await b.upload(`${folder}/${id}.json`, JSON.stringify(row), { contentType: "application/json", upsert: true });
  if (error) throw new Error(`Food share save failed: ${error.message}`);
}

export const listGivers = () => readAll<Giver>("givers");

/** Live requests only; requests past their 48 h are deleted on the way. */
export async function listRequests(now = Date.now()): Promise<FoodRequest[]> {
  const all = await readAll<FoodRequest>("requests");
  const old = all.filter((r) => now - Date.parse(r.createdAt) >= REQUEST_TTL_MS);
  if (old.length) await (await bucket()).remove(old.map((r) => `requests/${r.id}.json`));
  return all.filter((r) => now - Date.parse(r.createdAt) < REQUEST_TTL_MS);
}

/** Saves a giver; returns the private token for their dashboard (only its hash is stored). */
export async function addGiver(input: z.infer<typeof NewGiver>): Promise<{ giver: Giver; token: string }> {
  const token = randomBytes(18).toString("base64url");
  const giver: Giver = { ...input, id: randomUUID(), served: 0, tokenHash: sha256(token), createdAt: new Date().toISOString() };
  await write("givers", giver.id, giver);
  return { giver, token };
}

export async function findGiver(id: string, token: string): Promise<Giver | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const g = (await listGivers()).find((x) => x.id === id);
  return g && g.tokenHash === sha256(token) ? g : null;
}

export async function saveGiver(g: Giver): Promise<void> {
  await write("givers", g.id, g);
}

/** Saves an anonymous request at its rounded cell; returns the pickup code (only its hash is stored). */
export async function addRequest(input: z.infer<typeof NewRequest>): Promise<{ request: FoodRequest; code: string }> {
  const code = String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
  const request: FoodRequest = {
    id: randomUUID(), cell: toCell(input.position), people: input.people, needs: input.needs,
    codeHash: sha256(code), createdAt: new Date().toISOString(),
  };
  await write("requests", request.id, request);
  return { request, code };
}
