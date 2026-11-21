// Server only. Reads the gold files from web/public/data on disk (fs, not fetch: a route handler has no
// page origin to fetch relative URLs from). The toy/real switch is DATA_SET from lib/config.ts.
// Decoding and checks reuse lib/data and lib/routing, so the server sees exactly what the browser sees.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { DATA_BASE, DATA_SET } from "@/lib/config";
import { peakBuildingDepth } from "@/lib/data";
import { decodePng } from "@/lib/data/png";
import { DataContractError, validateBowls, validateLevels, validateManifest } from "@/lib/data/validate";
import { decodeGraph, type GraphLayout, type RoadGraph } from "@/lib/routing/graph";
import type { GoldData, Levels, LngLat, Manifest } from "@/lib/types";

/** Written out per data set so the build's file tracing can see which folder is read. */
function dataDir(): string {
  return DATA_SET === "real" ? join(process.cwd(), "public", "data") : join(process.cwd(), "public", "data", "toy");
}

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  let hit = cache.get(key) as Promise<T> | undefined;
  if (!hit) {
    hit = load();
    cache.set(key, hit);
    hit.catch(() => cache.delete(key)); // a failed load is retried next request
  }
  return hit;
}

/** Forget every file read (tests). */
export function clearServerDataCache(): void {
  cache.clear();
}

async function readBytes(path: string): Promise<Uint8Array> {
  return new Uint8Array(await readFile(join(dataDir(), path)));
}
async function readJson(path: string): Promise<unknown> {
  const text = await readFile(join(dataDir(), path), "utf8");
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
}

export function loadManifestFromDisk(): Promise<Manifest> {
  return cached("manifest", async () => validateManifest(await readJson("manifest.json"), "manifest.json"));
}

export function loadGraphFromDisk(): Promise<RoadGraph> {
  return cached("graph", async () => {
    const [layout, bin] = await Promise.all([readJson("graph.json"), readBytes("graph.bin")]);
    const buffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength) as ArrayBuffer;
    return decodeGraph(layout as GraphLayout, buffer);
  });
}

/** Same decoding as loadGold in lib/data, from disk. */
export function loadGoldFromDisk(): Promise<GoldData> {
  return cached("gold", async () => {
    const [manifest, bowlsRaw, groundBytes, bowlBytes] = await Promise.all([
      loadManifestFromDisk(), readJson("bowls.json"), readBytes("ground.png"), readBytes("bowls.png"),
    ]);
    const bowls = validateBowls(bowlsRaw, "bowls.json");
    const [g, b] = await Promise.all([decodePng(groundBytes, "ground.png"), decodePng(bowlBytes, "bowls.png")]);
    const { width, height } = manifest.grid;
    for (const [file, img] of [["ground.png", g], ["bowls.png", b]] as const) {
      if (img.width !== width || img.height !== height) {
        throw new DataContractError(file, "size", `is ${img.width} x ${img.height}, manifest grid is ${width} x ${height}`);
      }
    }
    const n = width * height;
    const { min, max } = manifest.groundRange;
    const groundM = new Float32Array(n);
    const bowlIds = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      groundM[i] = min + ((g.rgba[i * 4] * 256 + g.rgba[i * 4 + 1]) / 65535) * (max - min);
      bowlIds[i] = b.rgba[i * 4] + b.rgba[i * 4 + 1] * 256;
    }
    return { manifest, groundM, bowlIds, bowls, textures: { ground: `${DATA_BASE}/ground.png`, bowls: `${DATA_BASE}/bowls.png` } };
  });
}

function loadMiltonPumpOff(): Promise<Levels> {
  const file = "levels/milton-pump-off.json";
  return cached(file, async () => {
    const [gold, raw] = await Promise.all([loadGoldFromDisk(), readJson(file)]);
    return validateLevels(raw, file, {
      scenario: "milton", pump: "off", hours: gold.manifest.hours, bowlIds: gold.bowls.map((x) => x.id),
    });
  });
}

/** True when the position is inside the manifest box [west, south, east, north] (edges count as inside). */
export function insideBox(bbox: Manifest["bbox"], [lng, lat]: LngLat): boolean {
  return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

/**
 * Model depth recorded with each report: the Hurricane Milton replay, pumps off, peak depth at the building
 * (90th percentile within 3 cells, highest over every hour) for the report's exact position.
 * This is the calibration baseline: admins compare it with the depth they confirm from the photo.
 * null when the position is off the grid.
 */
export async function miltonPeakDepthM(position: LngLat): Promise<number | null> {
  const [gold, levels] = await Promise.all([loadGoldFromDisk(), loadMiltonPumpOff()]);
  const d = peakBuildingDepth(gold, levels, position);
  return d.kind === "ok" ? d.depthM : null;
}
