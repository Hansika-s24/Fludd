import { MapView } from "@/components/map/map-view";
import { Group, Surface } from "@/components/ui/surface";

// Wording from prep/04-depth-model-and-routing.md section 5.3. Shown on every card.
const SAFETY_FOOTNOTE =
  "Screening estimate from a simplified model. It leaves out storm sewers, storm surge, river flooding and groundwater, and is checked against one storm. Not a FEMA flood determination, and not for insurance, lending or purchase decisions. In a storm, follow Hillsborough County Emergency Management and the National Weather Service. Never drive or walk into floodwater.";

export default function Home() {
  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <MapView />
      <Surface>
        <div className="px-4 pt-3 md:pt-1">
          <h1 className="px-1 text-title font-bold">Fludd</h1>
          <form role="search" className="mt-3">
            <label htmlFor="address" className="sr-only">Address near USF</label>
            <input
              id="address"
              type="search"
              inputMode="search"
              autoComplete="street-address"
              placeholder="Search an address near USF"
              className="h-11 w-full rounded-[var(--radius-control)] bg-fill px-3.5 text-body text-label
                placeholder:text-label-3 outline-none focus-visible:ring-2 focus-visible:ring-tint"
            />
          </form>
        </div>

        <Group>
          <div className="px-4 py-5 text-center">
            <p className="text-headline font-semibold">No address yet</p>
            <p className="mt-1 text-subhead text-label-2">
              Search for one to see its flood grade, where the water goes and when to move your car.
            </p>
          </div>
        </Group>

        <p className="px-7 pt-3 text-footnote text-label-3">{SAFETY_FOOTNOTE}</p>
      </Surface>
    </main>
  );
}
