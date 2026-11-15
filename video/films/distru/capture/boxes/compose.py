# Distru legacy footage: component boxes for the four takes recorded 2026-11-14 (before the kit's
# capture.cjs logged DOM boxes). Card boxes come from measure-boxes.py (flood, see *.spec.json);
# inner components were measured on full-resolution frames (crops checked by eye) and are given with
# the media-time windows in which they are on screen. Output: <clip>.final.json (capture format).
import json

def load(c):
    return json.load(open(f"{c}.boxes.json"))["samples"]

def box(name, t, x0, y0, x1, y1):
    return {"name": name, "t": t, "x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0}

def absent(name, t):
    return {"name": name, "t": t, "absent": True}

def email_parts(shift_at, back_at):
    # the email card is sticky: it moves up 36 px while the trace card is short (during the run)
    out = []
    for name, (x0, y0, x1, y1) in {
        "emailHead": (459, 96, 837, 124),
        "samples": (459, 140, 837, 312),
        "emailText": (459, 328, 837, 717),
        "runButton": (459, 734, 582, 778),
    }.items():
        out += [box(name, 0, x0, y0, x1, y1), box(name, shift_at, x0, y0 - 36, x1, y1 - 36), box(name, back_at, x0, y0, x1, y1)]
    return out

s2 = [s for s in load("s2") if s["name"] in ("email", "trace", "decision", "reply", "order")]
s2 = [dict(s, name="emailCard") if s["name"] == "email" else s for s in s2]
s2 += email_parts(6.55, 25.15)
s2 += [absent("extract", 0), box("extract", 24.15, 905, 98, 1470, 430)]
s2 += [absent("check", 0), box("check", 24.6, 905, 438, 1470, 950)]
for n, b in {
    "routeBars": (459, 100, 837, 205), "finalRoute": (459, 222, 837, 363), "subBar": (459, 380, 837, 450),
    "replyBody": (911, 98, 1461, 465), "oneQuestion": (911, 480, 1460, 545),
    "orderBody": (434, 595, 1486, 1062), "orderTotal": (459, 995, 1461, 1022),
}.items():
    s2 += [absent(n, 0), box(n, 28.7, *b)]
for n in ("decision", "reply", "order"):
    s2.insert(0, absent(n, 0))

s3 = [s for s in load("s3") if s["name"] in ("email", "trace", "decision", "reply")]
s3 = [dict(s, name="emailCard") if s["name"] == "email" else s for s in s3]
s3 += email_parts(6.6, 15.3)
for n, b in {
    "routeBars": (459, 100, 837, 205), "finalRoute": (459, 222, 837, 432),
    "replyBody": (911, 98, 1461, 349), "oneQuestion": (911, 365, 1460, 430),
}.items():
    s3 += [absent(n, 0), box(n, 18.7, *b)]
for n in ("decision", "reply"):
    s3.insert(0, absent(n, 0))

ev = [absent("evalsSection", 0), box("evalsSection", 2.2, 434, 333, 1486, 746),
      absent("cards", 0), box("cards", 2.2, 434, 501, 1486, 746),
      absent("runEvals", 0), box("runEvals", 2.2, 433, 441, 551, 487),
      absent("score", 0), box("score", 18.1, 566, 452, 717, 474)]

mc = [s for s in load("mcp") if s["name"] == "toolPanel"]
mc.insert(0, absent("toolPanel", 0))
for n, b in {"tabs": (450, 290, 682, 695), "toolDef": (705, 298, 1071, 832), "args": (1095, 298, 1461, 545)}.items():
    mc += [absent(n, 0), box(n, 2.5, *b), box(n, 11.35, *b), absent(n, 11.4)]
for n, b in {"result": (1095, 650, 1461, 958), "statusLine": (1135, 876, 1395, 894)}.items():
    mc += [absent(n, 0), box(n, 13.0, *b)]

for c, samples in (("s2", s2), ("s3", s3), ("evals", ev), ("mcp", mc)):
    json.dump({"source": "frame", "samples": samples}, open(f"{c}.final.json", "w"), indent=1)
    print(c, len(samples), "samples")
