// Standing food sites in Tampa, checked by hand against each organisation's own page on 2026-11-21.
// Shown always, so Food & help works even when the live search agent is down. Hours change, especially in storms:
// the app says so and links each source. Re-check before relying on this after November 2026.
import type { LngLat } from "@/lib/types";

export interface FoodSite {
  name: string;
  org: string;
  what: string;
  when: string;
  where: string;
  /** null where the place moves (mobile pantries). */
  position: LngLat | null;
  url: string;
}

export const CHECKED_ON = "Nov 21, 2026";

export const FOOD_SITES: FoodSite[] = [
  {
    name: "Trinity Cafe",
    org: "Feeding Tampa Bay",
    what: "Free 3-course hot meal, eat in or take away. No ID or questions asked.",
    when: "Mon–Fri 11:30 am–12:30 pm · Sat–Sun 9–10 am",
    where: "2801 N Nebraska Ave, Tampa",
    position: [-82.45102, 27.96794],
    url: "https://feedingtampabay.org/ways-we-serve/trinity-cafe/",
  },
  {
    name: "Metro Market food pantry",
    org: "Metropolitan Ministries",
    what: "Groceries: fresh produce, bread, meat and pantry staples. Bring ID and proof of address.",
    when: "Mon–Fri 9 am–5 pm · Tue until 7 pm",
    where: "Family Support Center, 2301 N Tampa St, Tampa",
    position: [-82.45978, 27.96388],
    url: "https://www.metromin.org/our-work/food/",
  },
  {
    name: "The Bistro at Causeway Center",
    org: "Feeding Tampa Bay",
    what: "Hot meals and small bites from the Trinity Cafe kitchen.",
    when: "Weekdays; hours vary by day, check the page",
    where: "3624 Causeway Blvd, Tampa",
    position: [-82.41408, 27.92437],
    url: "https://feedingtampabay.org/ways-we-serve/trinity-cafe/",
  },
  {
    name: "Feed-A-Bull food pantry",
    org: "University of South Florida",
    what: "Free groceries for USF Tampa students.",
    when: "Weekdays, about 11 am–4 pm",
    where: "Student Services Building, SVC 0002, 4202 E Fowler Ave",
    position: [-82.42175, 28.0623],
    url: "https://www.usf.edu/student-affairs/student-health-services/services/feed-a-bull-food-pantry.aspx",
  },
  {
    name: "Mobile pantries and Groceries on the Go",
    org: "Feeding Tampa Bay",
    what: "A truck brings fresh groceries to neighbourhoods. Text FTBFYI to 833-530-3663 for the nearest stop.",
    when: "Changes daily",
    where: "Across Hillsborough County",
    position: null,
    url: "https://feedingtampabay.org/findfood",
  },
];
