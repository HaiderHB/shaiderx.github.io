#!/usr/bin/env python3
"""
kit/scripts/measure-boxes.py — component boxes for footage recorded WITHOUT DOM boxes (older takes).
New footage should come from capture.cjs, which records DOM boxes; use this only for legacy clips.

Two ways to find a component in a frame:
  "approx": [x, y, w, h]  snap each edge of a rough box (within +-"radius" px, default 24) to the
                          strongest straight line near it: card borders on a flat ground. Best for
                          outlined cards whose fill equals the page ground.
  "point": [x, y]         filled cards: every pixel brighter than ground + threshold is UI; the
                          connected region holding the seed is the card.
A box touching the frame edge is marked clipped (the component is cut off in the footage itself,
and QA will refuse to frame it as whole). Always check the --debug overlays.

  python3 measure-boxes.py <clip.mp4> <spec.json> [--out boxes.json] [--debug dir]

spec = {"ground": 17, "threshold": 4,
        "queries": [
          {"name": "email",  "approx": [446, 60, 410, 760], "times": [0.5, 3.0, 5.5]},
          {"name": "card",   "point": [600, 520], "times": [0.5]},
          {"name": "trace",  "point": [1200, 300], "every": 0.5, "from": 6.0, "to": 24.0},
          {"name": "badge",  "point": [1290, 400], "times": [20], "ground": 24, "threshold": 6}
        ]}
  ground/threshold can be set per query (e.g. ground = a card's own fill to find a panel inside it).
  "region": [x, y, w, h] (top level or per query) limits the search, e.g. below a sticky header.
Output: {"source": "frame", "samples": [{name, t, x, y, w, h, clipped?}]}  -> build-footage --boxes
"""
import json
import subprocess
import sys

import numpy as np
from scipy import ndimage


def frame_at(video, t, w=1920, h=1080):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", str(t), "-i", video, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, np.uint8)[: w * h].reshape(h, w)


def measure(img, point, ground, threshold, region=None):
    mask = img.astype(np.int16) > ground + threshold
    if region:
        # only look inside [x, y, w, h], e.g. below a sticky page header that would join every card
        rx, ry, rw, rh = region
        keep = np.zeros_like(mask)
        keep[max(0, ry):ry + rh, max(0, rx):rx + rw] = True
        mask &= keep
    # close 2 px gaps (anti-aliased borders) so a card is one region
    # (pad first: closing erodes the outermost rows, which would hide a card running off the frame)
    mask = ndimage.binary_closing(np.pad(mask, 2, mode="edge"), structure=np.ones((3, 3)), iterations=1)[2:-2, 2:-2]
    lab, _ = ndimage.label(mask)
    x, y = point
    k = lab[y, x]
    if k == 0:
        return None
    ys, xs = np.nonzero(lab == k)
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()) + 1, int(ys.min()), int(ys.max()) + 1
    H, W = img.shape
    clipped = x0 <= 0 or y0 <= 0 or x1 >= W or y1 >= H
    return {"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "clipped": clipped}


def snap(img, approx, ground, threshold, radius):
    H, W = img.shape
    diff = np.abs(img.astype(np.int16) - ground) > threshold
    x, y, w, h = approx
    out, scores = {}, {}

    def best(lines, lo, hi, a0, a1, horiz):
        top_s, top_v = -1.0, None
        for v in range(max(0, lo), min((H if horiz else W) - 1, hi) + 1):
            seg = diff[v, a0:a1] if horiz else diff[a0:a1, v]
            sc = float(seg.mean()) if seg.size else 0.0
            if sc > top_s + 1e-9:
                top_s, top_v = sc, v
        return top_v, top_s

    m = 12
    xa, xb = max(0, x + m), min(W, x + w - m)
    ya, yb = max(0, y + m), min(H, y + h - m)
    t, st = best(None, y - radius, y + radius, xa, xb, True)
    b, sb = best(None, y + h - radius, y + h + radius, xa, xb, True)
    l, sl = best(None, x - radius, x + radius, ya, yb, False)
    r, sr = best(None, x + w - radius, x + w + radius, ya, yb, False)
    res = {"x": l, "y": t, "w": r - l + 1, "h": b - t + 1}
    weak = [k for k, sc in (("top", st), ("bottom", sb), ("left", sl), ("right", sr)) if sc < 0.6]
    clipped = l <= 0 or t <= 0 or r >= W - 1 or b >= H - 1
    return res, weak, clipped


def main():
    video, spec_path = sys.argv[1], sys.argv[2]
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
    debug = sys.argv[sys.argv.index("--debug") + 1] if "--debug" in sys.argv else None
    spec = json.load(open(spec_path))
    g0, th0 = spec.get("ground", 17), spec.get("threshold", 4)
    samples, cache = [], {}
    for q in spec["queries"]:
        times = q.get("times")
        if times is None:
            t, times = q["from"], []
            while t <= q["to"] + 1e-6:
                times.append(round(t, 3))
                t += q["every"]
        for t in times:
            if t not in cache:
                cache[t] = frame_at(video, t)
            weak = []
            if "approx" in q:
                b, weak, clipped = snap(cache[t], q["approx"], q.get("ground", g0), q.get("threshold", th0), q.get("radius", 24))
                b["clipped"] = clipped
                if weak:
                    print(f"warning: {q['name']} @ {t}s weak edge(s) {weak}: check the overlay", file=sys.stderr)
            else:
                b = measure(cache[t], q["point"], q.get("ground", g0), q.get("threshold", th0), q.get("region", spec.get("region")))
            if b is None:
                samples.append({"name": q["name"], "t": t, "absent": True})
                continue
            rec = {"name": q["name"], "t": t, **b}
            if not b["clipped"]:
                rec.pop("clipped")
            samples.append(rec)
            if debug:
                from PIL import Image, ImageDraw
                im = Image.fromarray(cache[t]).convert("RGB")
                ImageDraw.Draw(im).rectangle((b["x"], b["y"], b["x"] + b["w"], b["y"] + b["h"]), outline=(0, 229, 255), width=3)
                im.save(f"{debug}/{q['name']}_{t:.2f}.jpg", quality=80)
    # drop repeats so the series only changes when the box changes
    dedup, last = [], {}
    for s in sorted(samples, key=lambda s: (s["name"], s["t"])):
        key = (s.get("x"), s.get("y"), s.get("w"), s.get("h"), s.get("absent"))
        if last.get(s["name"]) != key:
            dedup.append(s)
            last[s["name"]] = key
    res = {"source": "frame", "video": video, "samples": dedup}
    txt = json.dumps(res, indent=1)
    if out:
        open(out, "w").write(txt + "\n")
    else:
        print(txt)


if __name__ == "__main__":
    main()
