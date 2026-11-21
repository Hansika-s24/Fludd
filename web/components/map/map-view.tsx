"use client";

import { useEffect, useRef } from "react";
import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";

// ponytail: the bundler breaks MapLibre's relative worker URL; predev/prebuild copy the worker into public/.
setWorkerUrl("/maplibre-gl-worker.mjs");

// ponytail: centre and style are fixed here until the manifest (study box) lands from web/lib.
const USF_CENTER: [number, number] = [-82.4139, 28.0587];
const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";

export function MapView() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const map = new MapLibreMap({
      container: container.current,
      style: STYLE_URL,
      center: USF_CENTER,
      zoom: 14,
      attributionControl: { compact: true },
    });
    return () => map.remove();
  }, []);

  // maplibre-gl.css sets the map element to position: relative, so the wrapper does the positioning.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" aria-label="Map of the area around USF" role="region" />
    </div>
  );
}
