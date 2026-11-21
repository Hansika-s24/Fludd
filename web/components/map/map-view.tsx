"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, Marker, setWorkerUrl, type CanvasSource } from "maplibre-gl";
import { loadGold, loadLevels } from "@/lib/data";
import type { GoldData, Hour, LngLat, PumpState, Scenario } from "@/lib/types";

// ponytail: the bundler breaks MapLibre's relative worker URL; predev/prebuild copy the worker into public/.
setWorkerUrl("/maplibre-gl-worker.mjs");

const USF_CENTER: [number, number] = [-82.4139, 28.0587];
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Water ramp, sRGB versions of --color-water-1..5 in globals.css. Band edges: 6 in, 1 ft, 2 ft, 4 ft.
const RAMP: [maxDepthM: number, r: number, g: number, b: number][] = [
  [0.15, 169, 211, 242],
  [0.3, 116, 174, 230],
  [0.61, 63, 134, 208],
  [1.22, 42, 95, 174],
  [Infinity, 31, 63, 125],
];
const MIN_SHOWN_M = 0.02;
const ALPHA = 190;

/**
 * Paints depth = bowl level - ground, per cell, into the canvas.
 * ponytail: CPU pass over every cell (about 4.5M on real data) on each hour change.
 * The WebGL water with a moving surface replaces this when there is time.
 */
function paintWater(canvas: HTMLCanvasElement, gold: GoldData, levels: Record<string, number[]>, hour: Hour) {
  const { width, height } = gold.manifest.grid;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  let maxId = 0;
  for (const b of gold.bowls) maxId = Math.max(maxId, b.id);
  const level = new Float32Array(maxId + 1).fill(-Infinity);
  for (const [id, series] of Object.entries(levels)) level[Number(id)] = series[Math.min(hour, series.length - 1)];

  const img = ctx.createImageData(width, height);
  const px = img.data;
  for (let i = 0; i < width * height; i++) {
    const id = gold.bowlIds[i];
    if (id === 0) continue;
    const d = level[id] - gold.groundM[i];
    if (d < MIN_SHOWN_M) continue;
    let k = 0;
    while (d >= RAMP[k][0]) k++;
    const o = i * 4;
    px[o] = RAMP[k][1];
    px[o + 1] = RAMP[k][2];
    px[o + 2] = RAMP[k][3];
    px[o + 3] = ALPHA;
  }
  ctx.putImageData(img, 0, 0);
}

export interface MapViewProps {
  scenario: Scenario;
  pump: PumpState;
  hour: Hour;
  focus: LngLat | null;
  onError: (message: string) => void;
}

export function MapView({ scenario, pump, hour, focus, onError }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const gold = useRef<GoldData | null>(null);
  const marker = useRef<Marker | null>(null);
  const ready = useRef<Promise<void> | null>(null);

  // Map, basemap quieting and the water source: once.
  useEffect(() => {
    if (!container.current) return;
    const m = new MapLibreMap({
      container: container.current,
      style: STYLE_URL,
      center: USF_CENTER,
      zoom: 14,
      attributionControl: { compact: true },
    });
    map.current = m;
    const c = document.createElement("canvas");
    canvas.current = c;
    let disposed = false;

    ready.current = Promise.all([
      new Promise<void>((resolve) => m.once("load", () => resolve())),
      loadGold().then((g) => {
        gold.current = g;
      }),
    ]).then(() => {
      const g = gold.current;
      if (disposed || !g || m.getSource("flood-water")) return;
      // The map is the content and water is the showpiece: drop points of interest and transit.
      for (const layer of m.getStyle().layers) {
        if (/poi|transit|aerialway/.test(layer.id)) m.setLayoutProperty(layer.id, "visibility", "none");
      }
      c.width = g.manifest.grid.width;
      c.height = g.manifest.grid.height;
      const [w, s, e, n] = g.manifest.bbox;
      m.addSource("flood-water", { type: "canvas", canvas: c, animate: false, coordinates: [[w, n], [e, n], [e, s], [w, s]] });
      const firstLabel = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
      m.addLayer(
        { id: "flood-water", type: "raster", source: "flood-water", paint: { "raster-resampling": "nearest", "raster-fade-duration": 0 } },
        firstLabel,
      );
    });
    ready.current.catch((e: unknown) => onError(e instanceof Error ? e.message : "The flood data failed to load"));

    return () => {
      disposed = true;
      m.remove();
      map.current = null;
    };
  }, [onError]);

  // Repaint water when the storm, pump or hour changes.
  useEffect(() => {
    let stale = false;
    (async () => {
      await ready.current;
      const levels = await loadLevels(scenario, pump);
      const m = map.current, c = canvas.current, g = gold.current;
      if (stale || !m || !c || !g) return;
      paintWater(c, g, levels.levels, hour);
      const src = m.getSource<CanvasSource>("flood-water");
      // A non-animated canvas source re-uploads on play(); pause right after so it stays still.
      src?.play();
      src?.pause();
      m.triggerRepaint();
    })().catch((e: unknown) => onError(e instanceof Error ? e.message : "The flood data failed to load"));
    return () => {
      stale = true;
    };
  }, [scenario, pump, hour, onError]);

  // The searched address.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    marker.current?.remove();
    marker.current = null;
    if (!focus) return;
    marker.current = new Marker({ color: "#0a6cff" }).setLngLat(focus).addTo(m);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    m.flyTo({ center: focus, zoom: 16.5, essential: false, animate: !reduce });
  }, [focus]);

  // maplibre-gl.css sets the map element to position: relative, so the wrapper does the positioning.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" aria-label="Map of the area around USF" role="region" />
    </div>
  );
}
