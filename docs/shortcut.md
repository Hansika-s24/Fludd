# "Report flooding" Apple Shortcut

One press of the Action Button: take a photo of the water, send it to Fludd with where and when, and hear back what Gemini read. A person approves every report before it shows on the map.

## The route it calls

`POST https://fludd.app/api/reports`, multipart form (contract in `docs/contracts.md`, decision 6; handler in `web/lib/reports/intake.ts`).

| Field | Value | Notes |
|---|---|---|
| `photo` | the photo, as a file | JPEG or PNG, up to 10 MB. iPhone photos are HEIC, so the Shortcut converts first |
| `lat` | latitude, decimal degrees | must be inside the area Fludd covers, else `400 outside_area` |
| `lng` | longitude, decimal degrees | |
| `source` | `gps` | the phone's own position (the in-app report uses `pin`) |
| `takenAt` | time, ISO 8601 | optional |

Answer on success, `201`:

```json
{ "id": "…", "status": "waiting", "aiReading": { "waterPresent": true, "depthRangeM": [0.15, 0.3], "reference": "car tyre", "confidence": 0.7 } }
```

`aiReading` is `null` when Gemini could not read the photo. Errors come back as `{ "error": { "code", "message" } }`.

Checked 21 Nov, 14:20: `GET /api/health` answers `real-2026-11-21`; a POST with no photo answers `400 photo is required (a JPEG or PNG file)`, so the route is live and validating. A full upload was not sent from the laptop so no test report lands in the moderation queue; the first real one is the phone test in step 6.

## 1. Build it (Shortcuts app, about 5 minutes)

New Shortcut (+), name it **Report flooding**. Add these actions in order. The words in **bold** are the action names to type in the search bar.

1. **Take Photo**. Tap the arrow: Camera = Back, Show Camera Preview = on. (Leave the count at 1.)
2. **Convert Image**: Convert *Photo* to **JPEG**, Quality 0.7, Preserve Metadata = **off**. (The server strips metadata too; this keeps the upload small.)
3. **Get Current Location**.
4. **Get Details of Locations**: Get **Latitude** from *Current Location*. Tap the result, rename the variable **Lat**. (Long-press the action > Rename is fine too.)
5. **Get Details of Locations** again: Get **Longitude** from *Current Location*. Rename **Lng**.
6. **Current Date**, then **Format Date**: Date Format = **ISO 8601**, Include ISO 8601 Time = on. Rename **Taken**.
7. **Get Contents of URL**. Rename the action **Send to Fludd**.
   - URL: `https://fludd.app/api/reports`
   - Tap *Show More*. Method: **POST**. Request Body: **Form**.
   - Add new field > **File**: key `photo`, value *Converted Image*.
   - Add new field > **Text**: key `lat`, value *Lat*.
   - Add new field > **Text**: key `lng`, value *Lng*.
   - Add new field > **Text**: key `source`, value `gps`.
   - Add new field > **Text**: key `takenAt`, value *Taken*.
8. **Get Dictionary Value**: Get **Value** for `aiReading` in *Contents of URL*. Rename **Reading**.
9. **If** *Reading* **has any value**:
   1. **Get Dictionary Value**: Value for `waterPresent` in *Reading*.
   2. **If** *Dictionary Value* **is** *false* (choose Boolean): **Text** `Sent. Fludd saw no standing water in that photo. A person will check it.` **Otherwise**:
      1. **Get Dictionary Value**: Value for `depthRangeM` in *Reading*.
      2. **Get Item from List**: **Last Item** of *Dictionary Value*.
      3. **Calculate**: *Item from List* × `39.37`.
      4. **Round Number**: *Calculation Result*, to Ones Place.
      5. **Text**: `Sent. Fludd read up to about [Rounded Number] inches of water. A person checks it before it goes on the map. Never drive or walk into floodwater.`
   3. **End If**.
10. **Otherwise** (no reading): **Get Dictionary Value**: Value for `error.message` in *Contents of URL*.
    - **If** *Dictionary Value* **has any value**: **Text** `Not sent: [Dictionary Value]` **Otherwise**: **Text** `Sent for manual review.` **End If**.
11. **End If**.
12. **Show Result**: *Text*. (Shortcuts reads it aloud when run by Siri.)

First run asks for Camera, Location and permission to send to fludd.app: allow all three (Always Allow for the URL, or the demo stalls on a prompt).

## 2. Put it on the phone

- **Action Button** (iPhone 15 Pro and later): Settings > Action Button > swipe to **Shortcut** > choose **Report flooding**.
- **Home Screen**: in Shortcuts, long-press the Shortcut > Share > **Add to Home Screen**. Pick a water-drop glyph and blue.
- **Voice**: "Hey Siri, report flooding." The Shortcut's name is the phrase.
- **Back Tap** (any iPhone, optional): Settings > Accessibility > Touch > Back Tap > Double Tap > Report flooding.

## 3. Share link (for the README)

Long-press the Shortcut > Share > **Copy iCloud Link**. Paste it into the README under "Report flooding Shortcut". Anyone who opens it gets the same Shortcut.

## 4. Test it before the demo

1. On Wi-Fi at the venue, point the camera at a printed flood photo and press the Action Button.
2. Expect: `Sent. Fludd read up to about N inches of water…` within ~5 s. If it says `Sent for manual review.`, the upload worked but Gemini did not answer in time; that is fine on stage.
3. `Not sent: This position is outside the area Fludd covers` means the phone's GPS is outside the model area. ENB is inside it; a dropped pin in the app is the fallback.
4. Open `fludd.app/admin`, sign in, approve the report, and check it appears on the public map (checklist item F5; not yet verified on the live site).
5. Reject the test report afterwards if it was not a real flood.

## What it never does

It never says a road is safe. The reply only describes the photo and always ends with the floodwater warning when water is seen. Positions shown on the public map are snapped to the street; the exact point stays admin-only.

---

# "Flood brief" Shortcut and Home Screen widget

**What iPhone allows.** Fludd is a Home Screen web app, not an App Store app, so it cannot ship its own live widget: that needs a native app with WidgetKit. What works today without one:

| Option | What you see | Live? |
|---|---|---|
| **Shortcuts widget** (built in) | A Home Screen or Lock Screen button; one tap shows the brief | On tap |
| **Personal automation** (built in) | The brief as a notification at set times, e.g. 7 am and 5 pm | On schedule |
| **Scriptable widget** (free App Store app) | The brief's text on the Home Screen, refreshed by iOS every 15–30 min | Yes |

All three read one URL: `https://fludd.app/api/brief?lat=<lat>&lng=<lng>&format=text`. It returns one paragraph, for example:

> Weather Service alert: Flood Watch. Rain likely from 4 pm until 7 pm, about 1.2 in. Now 74° and rain, feels 80°. Air quality good (33). Never drive or walk into floodwater.

Sources: Open-Meteo (weather, hourly rain chance, US air quality index) and National Weather Service active alerts. Nothing is stored; the position is used for that one answer.

## 1. Build "Flood brief" (about 2 minutes)

1. New Shortcut, name it **Flood brief**.
2. **Get Current Location**. (For a fixed home instead, use **Text** with your home's latitude and longitude and skip steps 3–4.)
3. **Get Details of Locations**: **Latitude** of *Current Location*. Rename **Lat**.
4. **Get Details of Locations**: **Longitude** of *Current Location*. Rename **Lng**.
5. **URL**: `https://fludd.app/api/brief?lat=[Lat]&lng=[Lng]&format=text`
6. **Get Contents of URL** (method GET).
7. **Show Result**: *Contents of URL*. (Or **Speak Text** for hands-free; Siri reads it when you say "Hey Siri, flood brief".)

## 2. Put it on the Home Screen as a widget

- Long-press the Home Screen > Edit > **Add Widget** > **Shortcuts** > choose the small size > tap the widget > pick **Flood brief**.
- Lock Screen: Customize > Lock Screen > add the **Shortcuts** widget > **Flood brief**.

## 3. Get it as a notification on a schedule

Shortcuts > **Automation** > **+** > **Time of Day** (7:00, Daily) > **Run Immediately** > **Run Shortcut: Flood brief**, then replace its last action with **Show Notification** (*Contents of URL*). Add a second automation for 5 pm.

## 4. Live text widget with Scriptable (optional)

Install **Scriptable** (free), create a script with:

```js
const loc = await Location.current();
const url = `https://fludd.app/api/brief?lat=${loc.latitude}&lng=${loc.longitude}&format=text`;
const text = await new Request(url).loadString();
const w = new ListWidget();
w.addText("Fludd").font = Font.boldSystemFont(14);
w.addSpacer(4);
w.addText(text).font = Font.systemFont(12);
w.url = "https://fludd.app";
Script.setWidget(w);
Script.complete();
```

Add a Scriptable widget to the Home Screen and pick this script. Tapping it opens Fludd.

**Tradeoff:** a true Fludd widget with the grade and a mini map needs a native iOS app (WidgetKit); that is out of scope for a web app and listed as future work.
