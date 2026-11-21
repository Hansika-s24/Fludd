# Prompt: build the Fludd boot animation in Blender

Paste everything below the line into the Claude session that has Blender connected.

---

Build Fludd's boot animation in Blender and wire it into the app. You have the Blender tools; Blender is open with the MCP add-on connected. Work in `C:\Users\hanst\claude skills\fludd.app`.

**Time-box: 75 minutes. Feature freeze is 16:30.** If you do not have a clean render by the 60-minute mark, stop and tell me; the fallback is to ship the CSS version of this same animation, which already exists as a design.

## What you are recreating

Two 2D designs of the same 4.9-second intro, one for desktop and one for iPhone. Read both before you touch Blender:

- `design/boot/reference/boot-desktop-1440x900.html`
- `design/boot/reference/boot-iphone-390x844.html`
- `design/boot/reference/fludd-logo.svg` (the logo: a pelican perched on a wave)
- `design/boot/reference/drop.svg` (the hero raindrop)

They are references for shapes, colours and timing. Open them in a browser if you want to watch them. The goal is the same story with real depth, light and water, not a pixel copy.

## The story, beat by beat (30 fps, 147 frames)

| Time (s) | Frames | What happens |
|---|---|---|
| 0.00 to 0.45 | 0 to 13 | Rain. Thin streaks fall across the frame, all tilted 19 degrees, fast and slightly varied in length, speed and opacity |
| 0.45 to 0.95 | 14 to 28 | The rain rushes past the camera and thins out, as if we push through it. One streak becomes the hero drop: it swings from 19 degrees to vertical and swells from a sliver to a full teardrop |
| 0.90 to 1.18 | 27 to 35 | The drop falls, accelerating the whole way (ease-in, no ease-out), and hits the surface |
| 1.15 to 1.65 | 35 to 50 | Impact. A splash ring spreads flat across the surface and fades. Add a small crown of droplets; keep it brief |
| 1.20 to 1.85 | 36 to 56 | The wave rises out of the impact point, growing upward from its base to full height, and curls into the logo's crest. Fast start, soft landing, no bounce |
| 1.70 to 2.10 | 51 to 63 | Four foam beads pop onto the crest one after another, 0.05 s apart, each taking 0.25 s |
| 1.80 to 2.20 | 54 to 66 | The pelican lands on the crest from the upper right. It settles with a small squash and a wing tuck, then is still |
| 2.15 to 2.95 | 64 to 88 | The wordmark and caption appear below the logo. **These are HTML text over the video, not rendered in Blender** (see Integration) |
| 2.95 to 4.30 | 88 to 129 | Hold. Keep it alive with very little: a slow shimmer on the water, one pelican blink, a camera push of about 2 percent |
| 4.30 to 4.90 | 129 to 147 | Handoff. The logo shrinks to about 30 percent and travels to where the app's title sits (desktop: up and left; iPhone: down and left), fading as it goes, while the scene clears to plain background |

## Look

- **Palette, exact:** background `#f2f1ec`, water light `#5b8fd6`, water deep `#23467f`, wave highlight `#9cc7ea`, foam `#fbfaf6`, pelican body `#5a4e44`, wing stripe `#e4d8bf`, beak `#e8964a`, ink `#1c1d21`.
- **Set the view transform to Standard**, not Filmic or AgX, and convert hex values to linear when you assign them. Otherwise the background will not match the app and the seam will show.
- **Style:** soft, matte, slightly rounded forms, like a clay model lit by an overcast sky. One large soft key light from the upper left, gentle ambient fill, soft contact shadows. Water gets a little gloss and a light edge; nothing else is shiny.
- **Camera:** orthographic or a very long lens, so the logo keeps the proportions of the SVG.
- **Renderer:** EEVEE. This has to render in minutes.
- **Background:** render on the solid background colour. Do not render transparency; alpha video does not play reliably on iPhone.

## How to build it

1. Inspect the scene first. If the open file has work in it, stop and ask me before changing anything. Otherwise start a new file and save it as `design/boot/fludd-boot.blend`.
2. Import `fludd-logo.svg` and `drop.svg` as curves. Give the wave, foam beads and pelican parts depth with extrusion and a small bevel, each as its own object with a clear name, so they can be animated separately. Keep the pelican's parts (body, wing stripe, neck, head, beak, eye) parented to one empty.
3. Build the rain as instanced thin capsules, tilted 19 degrees, with seeded variation so every render is identical.
4. Animate one beat at a time, in the order of the table. **After each beat, render a still at its first, middle and last frame and look at it before moving on.** Check the silhouette reads, nothing clips, and the colours match the palette.
5. Check these frames in particular: 13, 28, 35, 42, 56, 63, 66, 100, 129, 140, 147.
6. Render two image sequences from the same animation with two cameras:
   - desktop: 1440 by 900
   - iPhone: 780 by 1688 (the 390 by 844 design at double density). Re-frame for the tall screen: logo centred in the upper half, with clear space below it for the text
7. Encode with ffmpeg (already installed): H.264 MP4 with `yuv420p` and fast start, and a VP9 WebM, for each size. Export the frame at 3.5 s as a poster image for each. Target under 1.5 MB per video. Put outputs in `web/public/boot/`.

## Integration (in `web/components/boot/`)

Read `web/AGENTS.md` first; this Next.js version has breaking changes.

- A full-screen intro layer over the app. The app mounts underneath and is never blocked by the intro.
- `<video>` with `autoplay muted playsinline preload="auto"` and the poster. Pick the iPhone file on narrow or tall viewports.
- **Text is HTML over the video, timed to it:** the wordmark "Fludd" types one letter every 0.1 s from 2.15 s with a caret that blinks once and disappears at 2.95 s; the caption fades up at 2.6 s. Caption: "Be a pelican. Watch the water, then move." on two lines. Start these timers from the video's `playing` event so they never drift.
- A "Skip intro" button, at least 44 px tall, bottom right. Clicking anywhere also skips.
- When the video ends or is skipped, cross-fade to the app over 450 ms.
- Show it once per browser session.
- With reduced motion on, show no video: a 200 ms fade into the app.
- If the video has not started within 1.5 s, skip it. A slow network must never leave someone staring at a blank screen.

## Rules

- Stay in `web/components/`, `web/public/boot/`, `web/app/` pages and `design/`. Do not touch `web/lib/`, `web/app/api/`, `pipeline/` or `supabase/`.
- Small conventional commits, no AI attribution in commit messages. Commit the `.blend` and the reference files under `design/boot/`; do not commit the raw frame sequences.
- Add one line to the README's "How AI was used" section: the boot animation was designed with an AI design tool and built in Blender by Claude through Blender's MCP add-on, under our direction.
- Verify before you report: play both videos, load the app on desktop and at phone width, test skip, test reduced motion, and tell me the file sizes.
