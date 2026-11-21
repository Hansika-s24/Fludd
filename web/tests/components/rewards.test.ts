import { describe, expect, it } from "vitest";
import {
  POINTS,
  addContribution,
  blockedReason,
  rankFor,
  totalPoints,
  type Contribution,
} from "@/components/rewards/contributions";

const at = (iso: string) => new Date(iso);

describe("rankFor", () => {
  it("starts at Puddle Spotter with progress toward Rain Watcher", () => {
    const r = rankFor(0);
    expect(r.name).toBe("Puddle Spotter");
    expect(r.next).toEqual({ name: "Rain Watcher", min: 25 });
    expect(r.progress).toBe(0);
  });
  it("moves up exactly at each boundary", () => {
    expect(rankFor(24).name).toBe("Puddle Spotter");
    expect(rankFor(25).name).toBe("Rain Watcher");
    expect(rankFor(74).name).toBe("Rain Watcher");
    expect(rankFor(75).name).toBe("Storm Scout");
    expect(rankFor(150).name).toBe("Pelican");
    expect(rankFor(299).name).toBe("Pelican");
    expect(rankFor(300).name).toBe("Harbor Keeper");
  });
  it("measures progress inside the band", () => {
    expect(rankFor(50).progress).toBeCloseTo(0.5);
  });
  it("tops out with no next rank and full progress", () => {
    const r = rankFor(1000);
    expect(r.next).toBeNull();
    expect(r.progress).toBe(1);
  });
});

describe("addContribution rules", () => {
  const now = at("2026-11-21T14:00:00");

  it("adds a report every time", () => {
    let list: Contribution[] = [];
    for (let i = 0; i < 3; i++) {
      const r = addContribution(list, "report", now);
      expect(r.added).toBe(true);
      expect(r.points).toBe(20);
      list = r.list;
    }
    expect(totalPoints(list)).toBe(60);
  });

  it("allows an inlet and a check-in once per day", () => {
    for (const kind of ["inlet", "checkin"] as const) {
      const first = addContribution([], kind, now);
      expect(first.added).toBe(true);
      const again = addContribution(first.list, kind, at("2026-11-21T23:59:00"));
      expect(again.added).toBe(false);
      expect(again.points).toBe(0);
      expect(blockedReason(first.list, kind, now)).toBe("today");
      const tomorrow = addContribution(first.list, kind, at("2026-11-22T00:01:00"));
      expect(tomorrow.added).toBe(true);
    }
  });

  it("allows camera, prepared and onboarded only once ever", () => {
    for (const kind of ["camera", "prepared", "onboarded"] as const) {
      const first = addContribution([], kind, now);
      expect(first.added).toBe(true);
      expect(first.points).toBe(POINTS[kind]);
      const later = addContribution(first.list, kind, at("2027-01-01T10:00:00"));
      expect(later.added).toBe(false);
      expect(blockedReason(first.list, kind, now)).toBe("once");
    }
  });

  it("sums points by kind", () => {
    const list: Contribution[] = [
      { kind: "camera", at: now.toISOString() },
      { kind: "onboarded", at: now.toISOString() },
      { kind: "prepared", at: now.toISOString() },
    ];
    expect(totalPoints(list)).toBe(60);
  });
});
