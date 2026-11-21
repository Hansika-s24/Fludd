// Checks each gold file against the contract (docs/contracts.md, lib/types.ts).
// Every error names the file and the field, e.g. `manifest.json: field "grid.width" ...`.
import { z } from "zod";
import { SCENARIOS, type Bowl, type Levels, type Manifest, type Validation } from "@/lib/types";

export class DataContractError extends Error {
  constructor(file: string, field: string, problem: string) {
    super(`${file}: field "${field}" ${problem}`);
    this.name = "DataContractError";
  }
}

const num = z.number().refine(Number.isFinite, "must be a finite number");
const lngLat = z.tuple([num, num]);
const scenario = z.enum(SCENARIOS);
const pump = z.enum(["on", "off"]);

const manifestSchema = z.object({
  version: z.string(),
  bbox: z.tuple([num, num, num, num]),
  grid: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), cellSizeM: num.refine((v) => v > 0, "must be > 0") }),
  groundRange: z.object({ min: num, max: num }),
  hourZero: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "must be an ISO 8601 time"),
  hours: z.number().int().positive(),
  scenarios: z.array(scenario),
  units: z.literal("m"),
  sources: z.array(z.object({ name: z.string(), url: z.string(), date: z.string() })),
});

const bowlSchema = z.object({
  id: z.number().int().min(1, "must be 1 or more (0 means drains away)").max(65535),
  lowestPoint: z.object({ position: lngLat, heightM: num }),
  spillHeightM: num,
  spillsTo: z.number().int().nullable(),
  parent: z.number().int().nullable(),
  pump: z.boolean(),
  storageAtSpillM3: num,
});

const levelsSchema = z.object({
  scenario,
  pump,
  levels: z.record(z.string().regex(/^\d+$/, "must be a bowl id"), z.array(num)),
});

const validationSchema = z.object({
  hitRate: num,
  hits: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  falseAlarmAreaKm2: num,
  femaBaseline: z.object({ insideHighRisk: z.number().int().nonnegative(), total: z.number().int().nonnegative() }),
  computedAt: z.string(),
});

const layerSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(z.object({
    type: z.literal("Feature"),
    geometry: z.object({ type: z.string() }).loose().nullable(),
    properties: z.record(z.string(), z.unknown()).nullable(),
  }).loose()),
}).loose();

function check<T>(schema: z.ZodType<T>, value: unknown, file: string): T {
  const r = schema.safeParse(value);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  const field = issue.path.length ? issue.path.map(String).join(".") : "(root)";
  throw new DataContractError(file, field, issue.message);
}

export function validateManifest(value: unknown, file: string): Manifest {
  const m: Manifest = check(manifestSchema, value, file);
  if (!(m.bbox[0] < m.bbox[2] && m.bbox[1] < m.bbox[3])) {
    throw new DataContractError(file, "bbox", "must be [west, south, east, north] with west < east and south < north");
  }
  if (!(m.groundRange.min < m.groundRange.max)) throw new DataContractError(file, "groundRange", "must have min < max");
  return m;
}

export function validateBowls(value: unknown, file: string): Bowl[] {
  const bowls: Bowl[] = check(z.array(bowlSchema), value, file);
  const seen = new Set<number>();
  bowls.forEach((b, i) => {
    if (seen.has(b.id)) throw new DataContractError(file, `${i}.id`, `repeats bowl id ${b.id}`);
    seen.add(b.id);
  });
  bowls.forEach((b, i) => {
    if (b.spillsTo !== null && !seen.has(b.spillsTo)) throw new DataContractError(file, `${i}.spillsTo`, `names bowl ${b.spillsTo}, which is not in the file`);
    if (b.parent !== null && !seen.has(b.parent)) throw new DataContractError(file, `${i}.parent`, `names bowl ${b.parent}, which is not in the file`);
  });
  return bowls;
}

/** Shape check, plus (when given) the cross-checks against the manifest and bowl table. */
export function validateLevels(
  value: unknown, file: string,
  expect?: { scenario: string; pump: string; hours: number; bowlIds: number[] },
): Levels {
  const l: Levels = check(levelsSchema, value, file);
  if (!expect) return l;
  if (l.scenario !== expect.scenario) throw new DataContractError(file, "scenario", `is "${l.scenario}", expected "${expect.scenario}"`);
  if (l.pump !== expect.pump) throw new DataContractError(file, "pump", `is "${l.pump}", expected "${expect.pump}"`);
  for (const id of expect.bowlIds) {
    const series = l.levels[String(id)];
    if (!series) throw new DataContractError(file, `levels.${id}`, "is missing (every bowl in bowls.json needs a series)");
    if (series.length !== expect.hours) {
      throw new DataContractError(file, `levels.${id}`, `has ${series.length} hours, expected manifest.hours = ${expect.hours}`);
    }
  }
  return l;
}

export function validateValidation(value: unknown, file: string): Validation {
  const v: Validation = check(validationSchema, value, file);
  if (v.hits > v.total) throw new DataContractError(file, "hits", `(${v.hits}) is more than total (${v.total})`);
  return v;
}

export function validateLayer(value: unknown, file: string): GeoJSON.FeatureCollection {
  check(layerSchema, value, file);
  // The shape matches a GeoJSON FeatureCollection; geometry coordinates are left to the map library.
  return value as GeoJSON.FeatureCollection;
}
