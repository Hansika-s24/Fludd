// Gold-file loaders and depth lookups (Hansika). Names and types as in docs/contracts.md.
// Files are fetched from DATA_BASE (the toy/real switch in lib/config.ts) and checked against the contract;
// a broken file fails with an error naming the file and the field.
import { DATA_BASE } from "@/lib/config";
import type {
  DepthResult, GoldData, Hour, LayerName, Levels, LngLat, Manifest, PumpState, Scenario, Validation,
} from "@/lib/types";
import { decodePng } from "./png";
import {
  DataContractError, validateBowls, validateLayer, validateLevels, validateManifest, validateValidation,
} from "./validate";

export { DataContractError } from "./validate";

// ---------- fetching ----------

async function getFile(path: string): Promise<Response> {
  const res = await fetch(`${DATA_BASE}/${path}`);
  if (!res.ok) throw new Error(`${path} failed to load from ${DATA_BASE} (HTTP ${res.status})`);
  return res;
}

async function getJson(path: string): Promise<unknown> {
  const res = await getFile(path);
  try {
    return (await res.json()) as unknown;
  } catch {
    throw new Error(`${path} is not valid JSON`);
  }
}

async function getPng(path: string) {
  return decodePng(new Uint8Array(await (await getFile(path)).arrayBuffer()), path);
}

// ---------- cache (one load per session; a failed load is retried next call) ----------

const cache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit) return hit as Promise<T>;
  const p = load();
  cache.set(key, p);
  p.catch(() => cache.delete(key));
  return p;
}

/** Forget every loaded file (tests, or after switching data sets). */
export function clearDataCache(): void {
  cache.clear();
}

// ---------- loaders ----------

/** Load the gold files: manifest, ground and bowl grids, bowl table. */
export function loadGold(): Promise<GoldData> {
  return cached("gold", async () => {
    const [manifestRaw, bowlsRaw, g, b] = await Promise.all([
      getJson("manifest.json"), getJson("bowls.json"), getPng("ground.png"), getPng("bowls.png"),
    ]);
    const manifest = validateManifest(manifestRaw, "manifest.json");
    const bowls = validateBowls(bowlsRaw, "bowls.json");
    const { width, height } = manifest.grid;
    for (const [file, img] of [["ground.png", g], ["bowls.png", b]] as const) {
      if (img.width !== width || img.height !== height) {
        throw new DataContractError(file, "size", `is ${img.width} x ${img.height}, manifest grid is ${width} x ${height}`);
      }
    }
    const n = width * height;
    const { min, max } = manifest.groundRange;
    const known = new Set(bowls.map((x) => x.id));
    const groundM = new Float32Array(n);
    const bowlIds = new Uint16Array(n);
    for (let i = 0; i < n; i++) {
      groundM[i] = min + ((g.rgba[i * 4] * 256 + g.rgba[i * 4 + 1]) / 65535) * (max - min);
      const id = b.rgba[i * 4] + b.rgba[i * 4 + 1] * 256;
      if (id !== 0 && !known.has(id)) {
        throw new DataContractError("bowls.png", `cell ${i % width},${Math.floor(i / width)}`, `has bowl id ${id}, which is not in bowls.json`);
      }
      bowlIds[i] = id;
    }
    return {
      manifest, groundM, bowlIds, bowls,
      textures: { ground: `${DATA_BASE}/ground.png`, bowls: `${DATA_BASE}/bowls.png` },
    };
  });
}

/** Load levels/<scenario>-pump-<on|off>.json, checked against the manifest hours and every bowl. */
export function loadLevels(scenario: Scenario, pump: PumpState): Promise<Levels> {
  const file = `levels/${scenario}-pump-${pump}.json`;
  return cached(file, async () => {
    const [gold, raw] = await Promise.all([loadGold(), getJson(file)]);
    return validateLevels(raw, file, {
      scenario, pump, hours: gold.manifest.hours, bowlIds: gold.bowls.map((x) => x.id),
    });
  });
}

export function loadLayer(name: LayerName): Promise<GeoJSON.FeatureCollection> {
  const file = `layers/${name}.geojson`;
  return cached(file, async () => validateLayer(await getJson(file), file));
}

export function loadValidation(): Promise<Validation> {
  return cached("validation.json", async () => validateValidation(await getJson("validation.json"), "validation.json"));
}

// ---------- depth (pure, synchronous: usable per frame once the files are loaded) ----------

/** Cells within this many cells of the address point count as "at the building" (agreed in contracts). */
export const BUILDING_RADIUS_CELLS = 3;
/** Percentile of depth over those cells (agreed in contracts). */
export const BUILDING_PERCENTILE = 0.9;

/** Row-major cell index (north row first) for a position, or null off the grid. bbox edges count as inside. */
export function cellIndex(manifest: Manifest, position: LngLat): number | null {
  const [west, south, east, north] = manifest.bbox;
  const { width, height } = manifest.grid;
  const [lng, lat] = position;
  if (!(lng >= west && lng <= east && lat >= south && lat <= north)) return null;
  const col = Math.min(width - 1, Math.floor(((lng - west) / (east - west)) * width));
  const row = Math.min(height - 1, Math.floor(((north - lat) / (north - south)) * height));
  return row * width + col;
}

/** Depth at one cell: its bowl's level at that hour minus ground, never below zero; 0 where the cell drains away. */
export function depthAtCell(gold: GoldData, levels: Levels, index: number, hour: Hour): number {
  const bowl = gold.bowlIds[index];
  if (bowl === 0) return 0;
  const series = levels.levels[String(bowl)];
  if (!series) throw new Error(`levels/${levels.scenario}-pump-${levels.pump}.json has no series for bowl ${bowl}`);
  if (!Number.isInteger(hour) || hour < 0 || hour >= series.length) {
    throw new RangeError(`hour ${hour} is not a whole hour from 0 to ${series.length - 1}`);
  }
  return Math.max(0, series[hour] - gold.groundM[index]);
}

/**
 * Depth at a building: the 90th percentile of depth over grid cells within 3 cells (Euclidean, centre to centre)
 * of the address cell, using only cells on the grid. Nearest-rank percentile: the ceil(0.9 * n)-th smallest.
 */
export function buildingDepth(gold: GoldData, levels: Levels, position: LngLat, hour: Hour): DepthResult {
  const centre = cellIndex(gold.manifest, position);
  if (centre === null) return { kind: "outside" };
  const { width, height } = gold.manifest.grid;
  const cx = centre % width, cy = Math.floor(centre / width);
  const r = BUILDING_RADIUS_CELLS;
  const depths: number[] = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (dx * dx + dy * dy > r * r || x < 0 || y < 0 || x >= width || y >= height) continue;
      depths.push(depthAtCell(gold, levels, y * width + x, hour));
    }
  }
  depths.sort((a, b) => a - b);
  return { kind: "ok", depthM: depths[Math.ceil(BUILDING_PERCENTILE * depths.length) - 1] };
}

/** Highest depth at the building over every hour of the levels file. */
export function peakBuildingDepth(gold: GoldData, levels: Levels, position: LngLat): DepthResult {
  if (cellIndex(gold.manifest, position) === null) return { kind: "outside" };
  const hours = gold.manifest.hours;
  let peak = 0;
  for (let h = 0; h < hours; h++) {
    const d = buildingDepth(gold, levels, position, h);
    if (d.kind === "ok" && d.depthM > peak) peak = d.depthM;
  }
  return { kind: "ok", depthM: peak };
}

/** Depth at a point (one cell) for a scenario, pump state and hour. */
export async function depthAt(position: LngLat, scenario: Scenario, pump: PumpState, hour: Hour): Promise<DepthResult> {
  const gold = await loadGold();
  const i = cellIndex(gold.manifest, position);
  if (i === null) return { kind: "outside" };
  const levels = await loadLevels(scenario, pump);
  return { kind: "ok", depthM: depthAtCell(gold, levels, i, hour) };
}

/** Depth at a building (90th percentile within 3 cells) for a scenario, pump state and hour. */
export async function depthAtBuilding(position: LngLat, scenario: Scenario, pump: PumpState, hour: Hour): Promise<DepthResult> {
  const gold = await loadGold();
  if (cellIndex(gold.manifest, position) === null) return { kind: "outside" };
  return buildingDepth(gold, await loadLevels(scenario, pump), position, hour);
}
