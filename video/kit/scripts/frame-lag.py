#!/usr/bin/env python3
"""
kit/scripts/frame-lag.py — how late the screencast shows a DOM change (for audio and box sync).

CDP screencast frames carry the compositor's timestamp, which lands a little AFTER the DOM change
it shows (about 0.1-0.2 s on this machine). Boxes, marks and the fake mic's audio times are DOM
times, so sound placed at those times plays slightly early against the footage. This measures
the lag on a captured take from events whose time AND screen region are known:

  - clicks in raw/<clip>/events.json (the drawn cursor shrinks on mouse down: region = 60 px
    around the click point, event time = mouse-down = click t - 0.09 s)
  - watched attribute changes in raw/<clip>/audio.json (kit/scripts/fake-mic.cjs `watch`), with
    --watch name=component: region = that component's recorded box (e.g. a voice dock whose
    label changes with its phase)

For each event it finds the first frame after (t - 0.05) whose region differs from the frame
before it, and reports frame time - event time. The median is the lag to ADD to DOM times.

  python3 kit/scripts/frame-lag.py films/<slug>/raw/<clip> [--watch dock=dock] [--json out.json]

Prints one line per event and "median lag 0.183 s (n=17)"; --json writes {lag, n, events}.
Used by: films/great-question (audio placement, kit/scripts/place-audio.mjs --lag).
"""
import json, os, sys
import numpy as np
from PIL import Image

args = sys.argv[1:]
if not args or args[0] in ("-h", "--help"):
    print(__doc__)
    sys.exit(0)
raw = os.path.abspath(args[0])
watch = {}
out_json = None
i = 1
while i < len(args):
    if args[i] == "--watch":
        k, v = args[i + 1].split("=")
        watch[k] = v
        i += 2
    elif args[i] == "--json":
        out_json = args[i + 1]
        i += 2
    else:
        i += 1

fj = json.load(open(os.path.join(raw, "frames.json")))
t0 = fj["t0"]
frames = sorted(fj["frames"], key=lambda f: f["ts"])
ft = np.array([f["ts"] - t0 for f in frames])
boxes = json.load(open(os.path.join(raw, "boxes.json")))["samples"] if os.path.exists(os.path.join(raw, "boxes.json")) else []
events = json.load(open(os.path.join(raw, "events.json"))) if os.path.exists(os.path.join(raw, "events.json")) else []
audio = json.load(open(os.path.join(raw, "audio.json"))) if os.path.exists(os.path.join(raw, "audio.json")) else {}
W, H = fj.get("viewport", {}).get("width", 1920), fj.get("viewport", {}).get("height", 1080)


def box_at(name, t):
    cur = None
    for s in boxes:
        if s["name"] == name and s["t"] <= t + 1e-6:
            cur = s
    if not cur or cur.get("absent"):
        return None
    return (cur["x"], cur["y"], cur["w"], cur["h"])


cache = {}


def region(idx, r):
    key = (idx, r)
    if key not in cache:
        im = Image.open(os.path.join(raw, "frames", frames[idx]["file"])).convert("L")
        x, y, w, h = r
        x0, y0 = max(0, int(x)), max(0, int(y))
        x1, y1 = min(W, int(x + w)), min(H, int(y + h))
        cache[key] = np.asarray(im.crop((x0, y0, x1, y1)), dtype=np.float32)
    return cache[key]


def first_change(t, r, thresh=2.0, window=1.0):
    j = int(np.searchsorted(ft, t - 0.05))
    j = max(1, j)
    while j < len(frames) and ft[j] <= t + window:
        a, b = region(j - 1, r), region(j, r)
        if a.shape == b.shape and a.size and np.abs(a - b).mean() > thresh:
            return ft[j]
        j += 1
    return None


rows = []
for e in events:
    if e.get("type") != "click":
        continue
    t = e["t"] - 0.09
    r = (e["x"] - 30, e["y"] - 30, 60, 60)
    f = first_change(t, r, thresh=1.5)
    if f is not None:
        rows.append({"kind": "click", "label": e.get("label"), "t": round(t, 3), "frame": round(float(f), 3), "lag": round(float(f) - t, 3)})
for w in audio.get("watch", []):
    comp = watch.get(w["name"])
    if not comp or w["t"] < 0:
        continue
    r = box_at(comp, w["t"] + 0.02) or box_at(comp, w["t"] - 0.02)
    if not r:
        continue
    f = first_change(w["t"], r)
    if f is not None:
        rows.append({"kind": "watch:" + w["name"], "label": w["value"], "t": w["t"], "frame": round(float(f), 3), "lag": round(float(f) - w["t"], 3)})

rows.sort(key=lambda r: r["t"])
for r in rows:
    print(f'{r["t"]:8.3f}  {r["kind"]:<12} {str(r["label"]):<16} frame {r["frame"]:8.3f}  lag {r["lag"]:+.3f}')
lags = [r["lag"] for r in rows if -0.1 < r["lag"] < 0.6]
med = float(np.median(lags)) if lags else 0.0
print(f"median lag {med:.3f} s (n={len(lags)}, of {len(rows)} events)")
if out_json:
    json.dump({"lag": round(med, 3), "n": len(lags), "events": rows}, open(out_json, "w"), indent=1)
