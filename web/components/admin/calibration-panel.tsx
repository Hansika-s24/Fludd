import { Group } from "@/components/ui/surface";
import { centimetres, depthWords, inches } from "@/components/report/depth-words";
import type { Calibration } from "@/lib/types";

/** How far the model's depth was from what admins confirmed: one number, then the pairs behind it. */
export function CalibrationPanel({ calibration, error }: { calibration: Calibration | null; error: string | null }) {
  if (error) {
    return (
      <Group title="Calibration">
        <p role="alert" className="px-4 py-3 text-subhead text-late">
          {error}
        </p>
      </Group>
    );
  }
  if (!calibration) {
    return (
      <Group title="Calibration">
        <p className="px-4 py-3 text-subhead text-label-2">Loading</p>
      </Group>
    );
  }

  const { pairs, meanAbsErrorM } = calibration;
  return (
    <>
      <Group title="Calibration">
        <div className="px-4 py-4">
          <p className="text-footnote text-label-2">Mean absolute error, model vs confirmed</p>
          {pairs.length === 0 ? (
            <p className="pt-1 text-subhead text-label-2">No approved reports with a model depth yet.</p>
          ) : (
            <>
              <p className="pt-1 text-grade font-bold tabular-nums">
                {inches(meanAbsErrorM)}
                <span className="pl-1 text-title font-semibold"> in</span>
              </p>
              <p className="pt-1 text-subhead text-label-2">
                {centimetres(meanAbsErrorM)} cm, over {pairs.length} approved {pairs.length === 1 ? "report" : "reports"}
              </p>
            </>
          )}
        </div>
      </Group>

      {pairs.length > 0 && (
        <Group title="Model vs confirmed">
          <div className="flex min-h-11 items-center gap-3 border-b border-separator px-4 text-footnote text-label-2">
            <span className="flex-1">Model</span>
            <span className="flex-1">Confirmed</span>
            <span className="w-20 text-right">Off by</span>
          </div>
          {pairs.map((p, i) => (
            <div
              key={i}
              className={`flex min-h-11 items-center gap-3 px-4 text-subhead tabular-nums ${i < pairs.length - 1 ? "border-b border-separator" : ""}`}
            >
              <span className="flex-1">{depthWords(p.modelM)}</span>
              <span className="flex-1">{depthWords(p.confirmedM)}</span>
              <span className="w-20 text-right text-label-2">{inches(Math.abs(p.modelM - p.confirmedM))} in</span>
            </div>
          ))}
        </Group>
      )}
    </>
  );
}
