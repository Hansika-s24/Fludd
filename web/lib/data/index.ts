// STUB (Harshith's 11:00 scaffold). Hansika replaces these; names and types stay as in docs/contracts.md.
// The loaders already read the real files under DATA_BASE; validation against the contract is still to do.
import { DATA_BASE } from "@/lib/config";
import type {
  Bowl, DepthResult, GoldData, LayerName, Levels, LngLat, Manifest, PumpState, Scenario, Validation, Hour,
} from "@/lib/types";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA_BASE}/${path}`);
  if (!res.ok) throw new Error(`Data file ${path} failed to load (${res.status})`);
  return (await res.json()) as T;
}

async function pixels(path: string): Promise<Uint8ClampedArray> {
  const bitmap = await createImageBitmap(await (await fetch(`${DATA_BASE}/${path}`)).blob(), {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  return ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
}

/** Load the gold files. Browser only. */
export async function loadGold(): Promise<GoldData> {
  const [manifest, bowls, g, b] = await Promise.all([
    getJson<Manifest>("manifest.json"),
    getJson<Bowl[]>("bowls.json"),
    pixels("ground.png"),
    pixels("bowls.png"),
  ]);
  const n = manifest.grid.width * manifest.grid.height;
  const { min, max } = manifest.groundRange;
  const groundM = new Float32Array(n);
  const bowlIds = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    groundM[i] = min + ((g[i * 4] * 256 + g[i * 4 + 1]) / 65535) * (max - min);
    bowlIds[i] = b[i * 4] + b[i * 4 + 1] * 256;
  }
  return { manifest, groundM, bowlIds, bowls, textures: { ground: `${DATA_BASE}/ground.png`, bowls: `${DATA_BASE}/bowls.png` } };
}

export function loadLevels(scenario: Scenario, pump: PumpState): Promise<Levels> {
  return getJson<Levels>(`levels/${scenario}-pump-${pump}.json`);
}

export function loadLayer(name: LayerName): Promise<GeoJSON.FeatureCollection> {
  return getJson<GeoJSON.FeatureCollection>(`layers/${name}.geojson`);
}

export function loadValidation(): Promise<Validation> {
  return getJson<Validation>("validation.json");
}

/** STUB: fixed answer. */
export async function depthAt(_position: LngLat, _scenario: Scenario, _pump: PumpState, _hour: Hour): Promise<DepthResult> {
  return { kind: "ok", depthM: 0.2 };
}
