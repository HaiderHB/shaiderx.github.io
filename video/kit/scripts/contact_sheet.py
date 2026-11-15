#!/usr/bin/env python3
"""
kit/scripts/contact_sheet.py — labelled contact sheet from frames (used by qa.mjs).

  python3 contact_sheet.py spec.json

spec = {"out": "sheet.jpg", "cols": 4, "thumb": 480, "title": "distru · 48.2 s",
        "items": [{"path": "f.png", "label": "12.40s run2", "sub": "shot 3 · trace",
                   "fail": false, "rects": [{"x":..,"y":..,"w":..,"h":.., "color": "#00e5ff", "dash": false}]}]}
Rects are in 1920x1080 frame pixels (the focus rect and the safe area from the framing check).
"""
import json
import sys
from PIL import Image, ImageDraw, ImageFont

FONT_PATHS = [
    "/usr/share/fonts/opentype/inter/Inter-Bold.otf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]


def font(size):
    for p in FONT_PATHS:
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            pass
    return ImageFont.load_default()


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def dashed_rect(d, box, color, width, dash=10):
    x0, y0, x1, y1 = box
    for (a, b, horiz, fixed) in ((x0, x1, True, y0), (x0, x1, True, y1), (y0, y1, False, x0), (y0, y1, False, x1)):
        p = a
        while p < b:
            q = min(b, p + dash)
            if horiz:
                d.line([(p, fixed), (q, fixed)], fill=color, width=width)
            else:
                d.line([(fixed, p), (fixed, q)], fill=color, width=width)
            p += dash * 2


def main():
    spec = json.load(open(sys.argv[1]))
    cols = spec.get("cols", 4)
    tw = spec.get("thumb", 480)
    th = round(tw * 9 / 16)
    lab_h = 46
    pad = 10
    items = spec["items"]
    rows = (len(items) + cols - 1) // cols
    head = 56 if spec.get("title") else 0
    W = cols * tw + (cols + 1) * pad
    H = head + rows * (th + lab_h) + (rows + 1) * pad
    sheet = Image.new("RGB", (W, H), (24, 24, 24))
    d = ImageDraw.Draw(sheet)
    f1, f2, ft = font(17), font(14), font(26)
    if head:
        d.text((pad + 4, 14), spec["title"], fill=(250, 250, 250), font=ft)
    for i, it in enumerate(items):
        r, c = divmod(i, cols)
        x = pad + c * (tw + pad)
        y = head + pad + r * (th + lab_h + pad)
        try:
            im = Image.open(it["path"]).convert("RGB")
        except Exception:
            im = Image.new("RGB", (1920, 1080), (60, 0, 0))
        sx = tw / im.width
        im = im.resize((tw, th), Image.LANCZOS)
        dd = ImageDraw.Draw(im)
        for rc in it.get("rects", []):
            col = hex2rgb(rc.get("color", "#00e5ff"))
            box = (rc["x"] * sx, rc["y"] * sx, (rc["x"] + rc["w"]) * sx, (rc["y"] + rc["h"]) * sx)
            if rc.get("dash"):
                dashed_rect(dd, box, col, 1, 6)
            else:
                dd.rectangle(box, outline=col, width=2)
        sheet.paste(im, (x, y))
        border = (230, 60, 60) if it.get("fail") else (60, 60, 60)
        d.rectangle((x - 1, y - 1, x + tw, y + th), outline=border, width=2 if it.get("fail") else 1)
        d.text((x + 2, y + th + 5), it.get("label", ""), fill=(250, 250, 250), font=f1)
        if it.get("sub"):
            d.text((x + 2, y + th + 26), it["sub"][:70], fill=(165, 165, 165), font=f2)
    sheet.save(spec["out"], quality=88)
    print(spec["out"])


if __name__ == "__main__":
    main()
