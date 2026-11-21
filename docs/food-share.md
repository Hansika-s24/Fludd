# Food share: restaurants feed neighbours during a flood (design, not built)

Two portals on one map. **Givers** (restaurants, grocers, churches) offer food or water during a storm within a radius they choose. **Receivers** (anyone who needs a meal) sign up anonymously and are told where and when to pick up. A leaderboard thanks givers publicly; receivers are never named or counted individually.

Status: designed at Harshith's request on 2026-11-21. Today the "Food & help" shortcut shows mapped food banks, shelters, 911 and 211, and a "Coming next" slot for this.

## Who sees what

| | Giver (restaurant) | Receiver (person) | Public |
|---|---|---|---|
| Identity | Business name, address, a contact for the admin | **None.** No name, phone or email | Business name only |
| Position | Exact (it is a public business) | Rounded to about 500 m, kept on the server only | Givers' pins and radius circles |
| What they see of the other side | **Only a count** of sign-ups inside their radius ("about 40 people nearby asked for meals") | Givers within reach, what they offer, the pickup window | Givers, offers, totals |

No giver ever sees a receiver's position, list or identity. No receiver sees other receivers.

## Flow

1. **Giver signs up.** Business name, address, offer ("100 hot meals", "bottled water"), pickup window, radius (1, 2 or 3 miles). A person checks the business before it goes live, the same review gate as photo reports.
2. **Storm mode switches on.** Offers are active only while a National Weather Service flood or tropical alert is active for the county, or an admin opens them. Outside a storm the portals are quiet.
3. **Receiver asks.** One tap: "I need food" (and how many people). Fludd stores a rounded position and a random **pickup code** in the browser. No account.
4. **Matching.** The server finds givers whose radius covers the rounded position and shows them to the receiver with the pickup window and a route from Ask Pelican that avoids flooded roads. The giver sees only the count rising.
5. **Pickup.** The receiver shows the code; the giver marks "served" in their portal. That count feeds the leaderboard. The code carries no identity.
6. **Afterwards.** Receiver rows are deleted 48 hours after the storm's alerts end. Giver totals are kept.

## Leaderboard

Givers ranked by meals served this storm and all time, with neighbourhoods covered ("Ella's Kitchen served 312 meals across Sulphur Springs and Seminole Heights"). Totals only, rounded to the nearest 10 below 100, so a count can never point to one household.

## Safety and fairness

- **Never send people through water.** Offers inside the model's flooded area for the current hour are hidden; pickups route around closed roads; every screen keeps "Never drive or walk into floodwater".
- **No ranking of receivers, no proof of need.** Asking is enough.
- **Abuse limits:** one active request per browser and per rounded area per day; givers can pause when they run out.
- **Food safety stays the giver's duty;** Fludd shows the offer as written and does not certify it.

## Data model (Supabase)

- `givers(id, name, address, lng, lat, radius_m, contact_admin_only, status, created_at)` with row-level security: public read of approved rows without `contact_admin_only`.
- `offers(id, giver_id, what, quantity, window_start, window_end, active)`.
- `requests(id, cell_lng, cell_lat, people, code_hash, created_at)`: **no identity column**, insert-only for anonymous users, readable only by a server function that returns counts per giver.
- `served(offer_id, at, people)` for the leaderboard.
- A scheduled job deletes `requests` 48 h after the last active alert.

Same privacy rules as `docs/privacy.md`: minimisation, no accounts for receivers, deletion by default.

## Build order (about a day)

1. Tables, row-level security and the count function, with tests.
2. Giver sign-up form and admin approval (reuse the report review screen).
3. Receiver "I need food" button in Food & help, with the pickup code.
4. Map layer of active givers with their radius circles.
5. Leaderboard card, replacing the "Coming next" slot.
