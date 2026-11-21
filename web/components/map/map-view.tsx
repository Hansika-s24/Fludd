"use client";

import { useEffect, useRef } from "react";
import { GeolocateControl, Map as MapLibreMap, Marker, Popup, setWorkerUrl, type CanvasSource, type ExpressionSpecification, type PointLike } from "maplibre-gl";
import { cellIndex, depthAtCell, loadGold, loadLayer, loadLevels } from "@/lib/data";
import type { GoldData, Hour, LayerName, Levels, LngLat, PumpState, Scenario } from "@/lib/types";
import { STORM_WORDS } from "@/components/ui/storm-words";
import { SHEET_HALF_EVENT } from "@/components/ui/sheet";
import { onBootDone } from "@/components/boot/boot-signal";

// ponytail: the bundler breaks MapLibre's relative worker URL; predev/prebuild copy the worker into public/.
setWorkerUrl("/maplibre-gl-worker.mjs");

const USF_CENTER: [number, number] = [-82.4139, 28.0587];
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

// Floodwater ramp. Band edges: 6 in, 1 ft, 2 ft, 4 ft. The map key in app-shell reads the same table.
// Cyan to violet on purpose: the basemap draws lakes and ponds in pale blue, and floodwater must never read as a lake.
export const RAMP: [maxDepthM: number, r: number, g: number, b: number][] = [
  [0.15, 94, 214, 222],
  [0.3, 33, 172, 204],
  [0.61, 25, 118, 196],
  [1.22, 52, 64, 176],
  [Infinity, 88, 34, 140],
];
const MIN_SHOWN_M = 0.02;

/** The depth callout's HTML. Styled inline: the Popup lives outside React and the app's class names. */
function callout(title: string, detail: string): string {
  return `<div style="font:500 13px/1.35 var(--font-sans);color:#1d1f24"><div style="font-weight:600;font-size:15px">${title}</div><div style="color:#646a73">${detail}</div></div>`;
}

/** "about 7 in", "about 1.5 ft": depth the way people say it. */
function depthWords(m: number): string {
  const inches = m * 39.37;
  if (inches < 12) return `About ${Math.max(1, Math.round(inches))} in`;
  return `About ${Math.round((inches / 12) * 2) / 2} ft`;
}
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
  /** The user's saved home and car, drawn as pins. */
  pins: { home: LngLat | null; car: LngLat | null };
  /** false while the intro plays: the map waits zoomed out, then flies in when this turns true. */
  arrived: boolean;
  /** Map layers to show (drainage network etc.); [] hides them all. */
  overlays: LayerName[];
  /** A suggested route to draw in the tint colour, or null. */
  route: LngLat[] | null;
  /** A tap or click on the map: grade that spot (a building, usually). */
  onSelect?: (position: LngLat) => void;
  onError: (message: string) => void;
}

export function MapView({ scenario, pump, hour, focus, pins, arrived, overlays, route, onSelect, onError }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const gold = useRef<GoldData | null>(null);
  const marker = useRef<Marker | null>(null);
  const ready = useRef<Promise<void> | null>(null);
  const pinMarkers = useRef<Marker[]>([]);
  // What the water layer shows right now, for the depth readout under the pointer.
  const shown = useRef<{ levels: Levels; hour: Hour; scenario: Scenario } | null>(null);
  const select = useRef(onSelect);
  useEffect(() => {
    select.current = onSelect;
  }, [onSelect]);

  // Map, basemap quieting and the water source: once.
  useEffect(() => {
    if (!container.current) return;
    const m = new MapLibreMap({
      container: container.current,
      style: STYLE_URL,
      center: USF_CENTER,
      zoom: 11.6,
      pitch: 0,
      attributionControl: { compact: true },
    });
    // Current location: a live blue dot with accuracy circle; follows the user until they pan.
    m.addControl(
      new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showAccuracyCircle: true }),
      "top-right",
    );
    map.current = m;
    const c = document.createElement("canvas");
    canvas.current = c;
    let disposed = false;
    let breathe = 0;

    // Parsing the flood data blocks the main thread for a few hundred ms (much longer on a phone), which froze the
    // intro film. Tiles load meanwhile off the main thread; the data waits until the intro hands over (6 s at most).
    const afterIntro = new Promise<void>((resolve) => {
      onBootDone(resolve);
      window.setTimeout(resolve, 6000);
    });
    ready.current = Promise.all([
      new Promise<void>((resolve) => m.once("load", () => resolve())),
      afterIntro
        .then(() => loadGold())
        .then((g) => {
          gold.current = g;
        }),
    ]).then(() => {
      const g = gold.current;
      if (disposed || !g || m.getSource("flood-water")) return;
      // Keep place names (apartment communities, shops, campus buildings) so people know where they are; drop transit.
      for (const layer of m.getStyle().layers) {
        if (/transit|aerialway/.test(layer.id)) m.setLayoutProperty(layer.id, "visibility", "none");
        // ponytail: parking and bus-stop icons crowd out the names people navigate by; hide those classes only.
        else if (/^poi_r/.test(layer.id)) {
          const noise: ExpressionSpecification = ["match", ["get", "class"], ["parking", "bus", "bicycle_parking", "railway", "entrance"], false, true];
          const base = m.getFilter(layer.id) as ExpressionSpecification | undefined;
          m.setFilter(layer.id, base ? ["all", base, noise] : noise);
        }
      }
      c.width = g.manifest.grid.width;
      c.height = g.manifest.grid.height;
      const [w, s, e, n] = g.manifest.bbox;
      m.addSource("flood-water", { type: "canvas", canvas: c, animate: false, coordinates: [[w, n], [e, n], [e, s], [w, s]] });
      const firstLabel = m.getStyle().layers.find((l) => l.type === "symbol")?.id;
      m.addLayer(
        { id: "flood-water", type: "raster", source: "flood-water", paint: { "raster-resampling": "linear", "raster-fade-duration": 0, "raster-opacity": 0.85 } },
        firstLabel,
      );
      // Floodwater breathes slowly so it reads as moving water, unlike the still lakes. 8 updates a second is enough.
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        const t0 = performance.now();
        breathe = window.setInterval(() => {
          if (!m.getLayer("flood-water")) return;
          m.setPaintProperty("flood-water", "raster-opacity", 0.8 + 0.12 * Math.sin((performance.now() - t0) / 700));
        }, 125);
      }
    });

    // Depth under the pointer (mouse) and on tap; a tap also picks the spot.
    const popup = new Popup({ closeButton: false, closeOnClick: false, className: "fludd-popup", offset: 12, maxWidth: "240px" });
    const lakeLayers = () => m.getStyle().layers.filter((l) => l.type === "fill" && /^water/.test(l.id)).map((l) => l.id);
    const describe = (lngLat: { lng: number; lat: number }, point: PointLike): string | null => {
      const g = gold.current, now = shown.current;
      if (!g || !now) return null;
      const i = cellIndex(g.manifest, [lngLat.lng, lngLat.lat]);
      const d = i === null ? 0 : depthAtCell(g, now.levels, i, now.hour);
      const storm = STORM_WORDS[now.scenario].name;
      if (d >= MIN_SHOWN_M) return callout(`${depthWords(d)} of floodwater`, `${storm}, this hour`);
      if (m.queryRenderedFeatures(point, { layers: lakeLayers() }).length) return callout("Pond or lake", "Normal water, there in dry weather too");
      return null;
    };
    const hoverable = window.matchMedia("(hover: hover)").matches;
    let frame = 0;
    if (hoverable) {
      m.on("mousemove", (e) => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          const html = describe(e.lngLat, e.point);
          if (html) popup.setLngLat(e.lngLat).setHTML(html).addTo(m);
          else popup.remove();
        });
      });
      m.on("mouseout", () => popup.remove());
    }
    m.on("click", (e) => {
      const html = describe(e.lngLat, e.point);
      if (html) popup.setLngLat(e.lngLat).setHTML(html).addTo(m);
      select.current?.([e.lngLat.lng, e.lngLat.lat]);
    });
    ready.current.catch((e: unknown) => onError(e instanceof Error ? e.message : "The flood data failed to load"));

    return () => {
      disposed = true;
      window.clearInterval(breathe);
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
      shown.current = { levels, hour, scenario };
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

  // First impression: fly in from the wide view once the intro hands over (skipped when an address is focused).
  useEffect(() => {
    const m = map.current;
    if (!arrived || !m || focus) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const padding = narrow ? { top: 0, right: 0, left: 0, bottom: 260 } : { top: 0, right: 0, bottom: 0, left: 396 };
    const fly = () =>
      m.flyTo({ center: USF_CENTER, zoom: 14.2, pitch: 40, bearing: -12, padding, duration: 2600, curve: 1.2, essential: false, animate: !reduce });
    // With the intro already seen, the hand-over comes before the style loads; a flyTo then is dropped.
    if (m.loaded()) fly();
    else m.once("load", fly);
    // focus is read, not watched: an address picked later flies on its own.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrived]);

  // Overlay layers (drainage). Each source gets line, point and fill sublayers filtered by geometry type.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    let stale = false;
    (async () => {
      await ready.current;
      if (stale || !map.current) return;
      const shown = new Set(overlays);
      for (const layer of m.getStyle().layers) {
        const name = layer.id.match(/^overlay-(.+)-(line|point|fill)$/)?.[1];
        if (name) m.setLayoutProperty(layer.id, "visibility", shown.has(name as LayerName) ? "visible" : "none");
      }
      for (const name of overlays) {
        if (m.getSource(`overlay-${name}`)) continue;
        const data = await loadLayer(name);
        if (stale || m.getSource(`overlay-${name}`)) return;
        m.addSource(`overlay-${name}`, { type: "geojson", data });
        const color = name === "pump-stations" ? "#e8964a" : name === "ponds" ? "#5b8fd6" : "#23467f";
        m.addLayer({ id: `overlay-${name}-fill`, type: "fill", source: `overlay-${name}`, filter: ["==", ["geometry-type"], "Polygon"], paint: { "fill-color": color, "fill-opacity": 0.25 } });
        m.addLayer({ id: `overlay-${name}-line`, type: "line", source: `overlay-${name}`, filter: ["==", ["geometry-type"], "LineString"], paint: { "line-color": color, "line-width": ["interpolate", ["linear"], ["zoom"], 13, 1, 17, 3], "line-dasharray": [2, 1] } });
        m.addLayer({
          id: `overlay-${name}-point`, type: "circle", source: `overlay-${name}`, filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-color": color,
            "circle-radius": name === "pump-stations" ? 7 : ["interpolate", ["linear"], ["zoom"], 13, 1.5, 17, 4],
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": name === "pump-stations" ? 2 : 0.5,
          },
        });
      }
    })().catch((e: unknown) => onError(e instanceof Error ? e.message : "A map layer failed to load"));
    return () => {
      stale = true;
    };
  }, [overlays, onError]);

  // Suggested route.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    (async () => {
      await ready.current;
      const end = route && route.length > 1 ? route[route.length - 1] : null;
      const data: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: route ?? [] } },
          ...(end ? [{ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: end } }] : []),
        ],
      };
      const src = m.getSource("pelican-route") as { setData?: (d: GeoJSON.FeatureCollection) => void } | undefined;
      if (src?.setData) src.setData(data);
      else {
        m.addSource("pelican-route", { type: "geojson", data });
        m.addLayer({ id: "pelican-route-casing", type: "line", source: "pelican-route", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 9 } });
        m.addLayer({ id: "pelican-route", type: "line", source: "pelican-route", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#0a6cff", "line-width": 5 } });
        // The destination: a dot at the end of the line.
        m.addLayer({ id: "pelican-route-end", type: "circle", source: "pelican-route", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 7, "circle-color": "#0a6cff", "circle-stroke-color": "#ffffff", "circle-stroke-width": 3 } });
      }
      if (route && route.length > 1) {
        let [w, s, e, n] = [route[0][0], route[0][1], route[0][0], route[0][1]];
        for (const [x, y] of route) { w = Math.min(w, x); e = Math.max(e, x); s = Math.min(s, y); n = Math.max(n, y); }
        const narrow = window.matchMedia("(max-width: 767px)").matches;
        // The padding below assumes the phone sheet at half: put it there.
        if (narrow) window.dispatchEvent(new Event(SHEET_HALF_EVENT));
        // flyTo leaves its padding on the map and fitBounds adds to it: clear it so the fit is the same every time.
        m.setPadding({ top: 0, right: 0, bottom: 0, left: 0 });
        m.fitBounds([[w, s], [e, n]], { padding: narrow ? { top: 100, left: 40, right: 40, bottom: window.innerHeight * 0.5 + 24 } : { top: 60, right: 60, bottom: 60, left: 440 }, maxZoom: 16, pitch: 0 });
      }
    })().catch(() => undefined);
  }, [route]);

  // Home and car pins.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    for (const p of pinMarkers.current) p.remove();
    pinMarkers.current = [];
    const add = (pos: LngLat | null, label: string, svg: string) => {
      if (!pos) return;
      const el = document.createElement("div");
      el.className = "map-pin";
      el.setAttribute("role", "img");
      el.setAttribute("aria-label", label);
      el.innerHTML = svg; // static markup from this file, no user text
      pinMarkers.current.push(new Marker({ element: el }).setLngLat(pos).addTo(m));
    };
    const stroke = 'width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"';
    add(pins.home, "Your home", `<svg ${stroke}><path d="m3 11 9-7 9 7M5 10v10h14V10"/></svg>`);
    add(pins.car, "Your car", `<svg ${stroke}><path d="M5 17h14v-5l-2-5H7l-2 5v5Z"/><circle cx="8" cy="17" r="1.6"/><circle cx="16" cy="17" r="1.6"/></svg>`);
  }, [pins.home, pins.car]);

  // The searched address.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    marker.current?.remove();
    marker.current = null;
    if (!focus) return;
    marker.current = new Marker({ color: "#0a6cff" }).setLngLat(focus).addTo(m);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Keep the address clear of the surface: the sheet covers the bottom 46% on phones, the sidebar 396 px on desktop.
    const narrow = window.matchMedia("(max-width: 767px)").matches;
    const padding = narrow ? { top: 0, right: 0, left: 0, bottom: 260 } : { top: 0, right: 0, bottom: 0, left: 396 };
    m.flyTo({ center: focus, zoom: 16.5, padding, essential: false, animate: !reduce });
  }, [focus]);

  // maplibre-gl.css sets the map element to position: relative, so the wrapper does the positioning.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" aria-label="Flood map" role="region" />
    </div>
  );
}
