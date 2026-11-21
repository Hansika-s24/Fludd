# Use a camera you already have

A security camera that already looks at your driveway or the street can be Fludd's water gauge. Fludd does not connect to the camera. A few lines on a computer in your home take **one still** from it and send that still to Fludd, the same way the app's photo report does. Nothing is streamed, the picture's metadata is stripped on arrival, and a person checks every reading before it reaches the map.

## Why it works this way

- A web page on `https://fludd.app` is not allowed to reach a camera on your home network: cameras answer over plain `http` or `rtsp` on a private address, and browsers block that from a secure site. So the still has to be **pushed from your side**, not pulled by ours.
- That also keeps the camera's address and password at home. Fludd never sees either.

## What works, what does not

| Camera | Works? | How |
|---|---|---|
| CCTV and IP cameras, and recorders (NVR/DVR), that offer an RTSP video address | Yes | The script below |
| Cameras that offer a snapshot link (a URL that returns a JPEG) | Yes | Replace the `ffmpeg` line with `curl -o frame.jpg "<snapshot link>"` |
| A spare phone | Yes | No script: open Fludd, then You, then Flood camera |
| Ring, Google Nest and other cloud-only doorbells | Not today | They keep their video inside their own apps and offer no still for another program to take |
| Public traffic cameras | Not built | Would need an agreement or a data feed from the agency that runs them |

## The script

Needs `ffmpeg` and `curl` on any computer that stays on at home (a laptop, a Raspberry Pi, the recorder itself if it runs Linux). Fill in the four values at the top. The camera address and password stay in this file on your machine.

```bash
#!/usr/bin/env bash
# One still from a camera you own, sent to Fludd as a flood report.
set -euo pipefail

CAMERA="rtsp://USER:PASSWORD@192.168.1.50:554/stream1"   # from your camera's manual or app
LAT="28.0587"                                            # where the camera is looking
LNG="-82.4139"
FLUDD="https://fludd.app/api/reports"

frame="$(mktemp --suffix=.jpg)"
trap 'rm -f "$frame"' EXIT

# One frame, as a JPEG, then stop.
ffmpeg -loglevel error -y -rtsp_transport tcp -i "$CAMERA" -frames:v 1 -q:v 3 "$frame"

# Same fields as the app's own photo report (docs/shortcut.md has the full contract).
curl --fail-with-body -sS -m 60 -X POST "$FLUDD" \
  -F "photo=@${frame};type=image/jpeg" \
  --form-string "lat=${LAT}" \
  --form-string "lng=${LNG}" \
  --form-string "source=pin" \
  --form-string "takenAt=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo
```

Run it by hand first. The answer is the same JSON the app gets: the report's id, `waiting`, and what Gemini read (water present, a depth range, the object it judged against).

To check every 10 minutes while it rains, add a line to `crontab -e`:

```
*/10 * * * * /home/you/fludd-camera.sh >> /home/you/fludd-camera.log 2>&1
```

Windows: the same two commands work in PowerShell with `ffmpeg.exe` and `curl.exe`, run from Task Scheduler.

## Good manners

- Point it at your own property or the public street. Do not send stills that look into a neighbour's windows.
- Every 10 minutes is plenty. Water at a kerb does not change faster than that in a way that matters.
- One camera per spot: several cameras on the same puddle add nothing.

## What was checked, and what was not

- Checked on 21 Nov: `ffmpeg` taking one frame from a video source and `curl` sending it with these fields is accepted and validated by the report route (a position outside the covered area was refused with `outside_area`, as it should be).
- Not checked: a real RTSP camera. The `ffmpeg` line is the standard way to take one frame from RTSP; camera brands differ in the address after the IP, so use the one in your camera's manual.
- The live site needs its report service configured for any report, from a phone or from this script, to be stored.
