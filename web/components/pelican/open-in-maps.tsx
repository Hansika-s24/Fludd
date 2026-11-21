// "Open in Maps" under Pelican's best route: hands the route to the phone's own maps app.
// Google Maps gets points along Fludd's route as waypoints, so it follows the flood-avoiding path.
// Apple Maps links cannot carry waypoints, so it gets start and end only, and we say so.
"use client";

import { mapsHandoff } from "@/lib/routing/handoff";
import type { LngLat, VehicleClass } from "@/lib/types";

export function OpenInMaps({ line, vehicle }: { line: LngLat[]; vehicle: VehicleClass }) {
  const links = mapsHandoff(line, vehicle);
  if (!links) return null;
  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex flex-wrap gap-2">
        <a
          href={links.google}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-flex min-h-11 items-center rounded-control bg-tint px-3.5 text-subhead font-semibold text-white active:bg-tint-pressed"
        >
          Open in Google Maps
        </a>
        <a
          href={links.apple}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-flex min-h-11 items-center rounded-control px-3.5 text-subhead font-medium text-tint active:bg-fill"
        >
          Apple Maps
        </a>
      </div>
      <p className="text-footnote text-label-2">
        Google Maps follows Fludd&apos;s route. Apple Maps may choose other roads. Never drive through water.
      </p>
    </div>
  );
}
