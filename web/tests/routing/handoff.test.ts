// Links that open a Fludd route in the phone's own maps app.
import { describe, expect, it } from "vitest";
import { MAX_WAYPOINTS, mapsHandoff as maybeHandoff, type MapsHandoff } from "@/lib/routing/handoff";
import type { LngLat } from "@/lib/types";

function mapsHandoff(l: LngLat[], vehicle?: "car" | "foot"): MapsHandoff {
  const h = maybeHandoff(l, vehicle);
  if (!h) throw new Error("expected links");
  return h;
}

const line: LngLat[] = [
  [-82.44, 28.07],
  [-82.439, 28.071],
  [-82.438, 28.072],
  [-82.437, 28.073],
  [-82.436, 28.074],
  [-82.435, 28.075],
  [-82.434, 28.076],
];

describe("mapsHandoff", () => {
  it("sends Google Maps our own path through waypoints, in lat,lng order", () => {
    const { google } = mapsHandoff(line);
    const url = new URL(google);
    expect(url.origin + url.pathname).toBe("https://www.google.com/maps/dir/");
    expect(url.searchParams.get("api")).toBe("1");
    expect(url.searchParams.get("origin")).toBe("28.07,-82.44");
    expect(url.searchParams.get("destination")).toBe("28.076,-82.434");
    expect(url.searchParams.get("travelmode")).toBe("driving");
    const waypoints = url.searchParams.get("waypoints")!.split("|");
    expect(waypoints.length).toBe(MAX_WAYPOINTS);
    for (const w of waypoints) expect(line.map(([lng, lat]) => `${lat},${lng}`)).toContain(w);
  });

  it("gives Apple Maps the start and the end only, and says so", () => {
    const { apple, appleFollowsRoute } = mapsHandoff(line);
    const url = new URL(apple);
    expect(url.origin).toBe("https://maps.apple.com");
    expect(url.searchParams.get("saddr")).toBe("28.07,-82.44");
    expect(url.searchParams.get("daddr")).toBe("28.076,-82.434");
    expect(url.searchParams.get("dirflg")).toBe("d");
    expect(appleFollowsRoute).toBe(false);
  });

  it("uses walking mode for people on foot", () => {
    const { google, apple } = mapsHandoff(line, "foot");
    expect(new URL(google).searchParams.get("travelmode")).toBe("walking");
    expect(new URL(apple).searchParams.get("dirflg")).toBe("w");
  });

  it("skips waypoints on a short route and returns null without two points", () => {
    expect(new URL(mapsHandoff(line.slice(0, 2)).google).searchParams.has("waypoints")).toBe(false);
    expect(maybeHandoff([line[0]])).toBeNull();
  });
});
