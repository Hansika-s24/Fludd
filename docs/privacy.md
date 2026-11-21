# Privacy, security and compliance

Fludd asks residents for ground truth during storms: photos, and optionally a spare phone used as a flood camera. Later it could read public-safety cameras too. This page says what is collected, how it is kept anonymous and secure, and how that maps to GDPR-style rules. **"Built" means it is in the code today. "Planned" means it is not.**

## 1. What Fludd collects

| Data | Where it lives | Who can see it | Built |
|---|---|---|---|
| Home, car spot, home type, insurance answers | The phone's own storage (`localStorage`, key `fludd-profile-v1`) | Only that phone. Never sent to a server | Built |
| Rewards history | The phone's own storage | Only that phone | Built |
| Flood photo report: photo, position, time | Supabase: private storage bucket and `reports` table | Admins only, until a person approves it | Built |
| Approved report on the public map | `public_reports` | Everyone, at a **street-level** position (snapped to the nearest road segment), never the exact point | Built |
| Flood camera snapshot (spare phone) | Sent as an ordinary photo report | As above | Built |
| Weather and Shortcut brief position | Not stored; used for one answer | Nobody | Built |
| Public-safety camera frames | Not collected | — | Planned (section 4) |

**No accounts for residents.** A report carries no name, email, phone number, device ID or user ID. The `reports` table has no column for one. Admin accounts are the only accounts.

## 2. How reports stay anonymous and secure (built)

- **Metadata stripped on upload.** EXIF, GPS tags, camera serials and other embedded data are removed from every photo before it is stored (`web/lib/reports/strip.ts`, tested). Only the position the person chose to send is kept.
- **Exact position is admin-only.** The public map shows the report snapped to a street midpoint (`public_lng`/`public_lat`); the exact point is readable only through admin-only row-level-security policies.
- **A person approves every report** before anything becomes public. Every decision is written to an append-only `moderation_log`.
- **Private storage.** Photos sit in a private Supabase bucket; there are no public links. Row-level security is on for every table.
- **Secrets stay server-side.** The service-role key and the Gemini key are server environment variables, never sent to the browser and never committed (`.env.example` documents each one).
- **The flood camera records nothing.** It takes one still photo when asked or once an hour, sends it as a report, and can be turned off under You. No video or audio leaves the phone.
- **Gemini sees the photo, not the person.** It is asked only for water present, depth range and the reference object used.

## 3. Rights and GDPR-style rules

Fludd is built at a US hackathon and does not target the EU, but it follows GDPR's principles so a city or county partner can adopt it without redesign. Florida's Digital Bill of Rights and California's CCPA set similar duties (notice, access, deletion, no sale of data).

| Principle | How Fludd meets it |
|---|---|
| **Lawful basis and purpose** | Reports are sent by the person for one purpose: showing flood depth to neighbours and checking the model. Consent is the act of sending; nothing is collected in the background. |
| **Data minimisation** | No identity fields exist. Metadata is stripped. The public sees a street position, not an address. |
| **Storage limitation** | **Planned:** delete photos 30 days after the storm ends and keep only the depth figure; reject-and-delete within 7 days. Today photos are kept until an admin deletes them. |
| **Right to erasure** | Everything on the phone: You > "Forget my home, car and insurance on this device" (built). Server reports: **planned** a delete link returned with each upload, since reports carry no identity to look up. |
| **Right of access** | On-device data is visible under You. Server reports: **planned** with the same per-report link. |
| **Security** | Row-level security, private bucket, server-only keys, metadata stripping (built). **Planned:** encryption-at-rest confirmation in the Supabase project settings, admin two-factor sign-in. |
| **No sale or advertising use** | Data is never sold or used for ads. No analytics or tracking scripts are loaded. |
| **Transparency** | This page, linked from the README. **Planned:** a short in-app notice on the report screen. |

## 4. Public-safety cameras (future, not built)

Reading city or FDOT traffic cameras would add coverage, but those frames can show faces and licence plates. Before any of it is built:

1. **Use only feeds the agency publishes** for public viewing, under a written data-sharing agreement that names the purpose (flood depth) and forbids other uses.
2. **Process at the edge, keep the number, drop the image.** Read the water depth from the frame and store only `{camera id, time, depth, confidence}`. Discard the frame immediately; never build an archive of footage.
3. **Blur before any frame is kept** for model checking: faces and plates blurred on the server before storage, and those samples deleted after 30 days.
4. **No identification, ever.** No face recognition, plate reading or tracking across cameras. This is a hard rule in the agreement and in code review.
5. **A data protection impact assessment** with the agency before launch, plus a public list of which cameras are used.

## 5. Known gaps (honest list)

- Photo retention is manual until the scheduled delete job exists.
- A person who sent a report cannot yet delete it themselves.
- Face and plate blurring is not built; today a person reviews every photo before it is shown, and photos are never shown publicly, only the depth reading and position.
- No formal security review or penetration test has been done.
