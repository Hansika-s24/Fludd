import { Group } from "@/components/ui/surface";
import { STORM_WORDS } from "@/components/ui/storm-words";
import { SCENARIOS, type DepthBand, type Grade, type Letter } from "@/lib/types";

const BAND_WORDS: Record<DepthBand, string> = {
  none: "Dry",
  under_6in: "Under 6 in",
  "6_12in": "6 to 12 in",
  "1_2ft": "1 to 2 ft",
  over_2ft: "Over 2 ft",
};
const STORM_ROWS = SCENARIOS.map((key) => ({ key, label: STORM_WORDS[key].name, often: STORM_WORDS[key].often }));
// Meaning colours only: green safe, orange warning, red too late. The letter itself always carries the meaning too.
const LETTER_COLOR: Record<Letter, string> = { A: "text-safe", B: "text-safe", C: "text-warn", D: "text-late", F: "text-late" };
const BAND_COLOR: Record<DepthBand, string> = {
  none: "text-label-2", under_6in: "text-label", "6_12in": "text-warn", "1_2ft": "text-late", over_2ft: "text-late",
};

export function GradeCard({ label, grade }: { label: string; grade: Grade }) {
  const range = grade.range[0] === grade.range[1] ? null : `${grade.range[0]} to ${grade.range[1]}`;
  return (
    <>
      <Group>
        <div className="flex items-center gap-4 px-4 py-4">
          <p className={`text-grade font-bold ${LETTER_COLOR[grade.letter]}`} aria-label={`Grade ${grade.letter}`}>
            {grade.letter}
          </p>
          <div className="min-w-0">
            <p className="text-headline font-semibold">{label}</p>
            <p className="text-subhead text-label-2">
              Flood grade{range ? `, range ${range}` : ""}
              {grade.lowConfidence ? " · low confidence" : ""}
            </p>
          </div>
        </div>
        {grade.action && (
          <p className="border-t border-separator px-4 py-3 text-subhead">{grade.action}</p>
        )}
      </Group>

      <Group title="What the flood map doesn't tell you">
        <Row label="Official map says" value={grade.officialMapSays} />
        <Row label="We found" value={grade.weFound} last />
      </Group>

      <Group title="Water at the door">
        {STORM_ROWS.map((s, i) => (
          <div
            key={s.key}
            className={`flex min-h-11 items-center justify-between gap-3 px-4 text-subhead ${i < STORM_ROWS.length - 1 ? "border-b border-separator" : ""}`}
          >
            <span className="py-2">
              <span className="block">{s.label}</span>
              <span className="block text-footnote text-label-2">{s.often}</span>
            </span>
            <span className={`font-medium ${BAND_COLOR[grade.depthByStorm[s.key]]}`}>{BAND_WORDS[grade.depthByStorm[s.key]]}</span>
          </div>
        ))}
      </Group>

      <Group title="Why">
        {grade.reasons.map((r, i) => (
          <p key={i} className={`px-4 py-2.5 text-subhead ${i < grade.reasons.length - 1 ? "border-b border-separator" : ""}`}>
            {r.text}
          </p>
        ))}
      </Group>
    </>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`px-4 py-2.5 ${last ? "" : "border-b border-separator"}`}>
      <p className="text-footnote text-label-2">{label}</p>
      <p className="text-subhead">{value}</p>
    </div>
  );
}
