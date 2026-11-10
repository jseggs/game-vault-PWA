#!/usr/bin/env python3
"""Generate the v3 arcade assets: the pixel icon sprite and the app icons.

Usage: python3 tools/build_arcade_assets.py
Requires Pillow for the app icons. Outputs go to v3/assets/.
"""
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "v3" / "assets"

# 16x16 bitmaps. '#' is a filled pixel.
ICONS = {
    "collection": """
................
.######..######.
.######..######.
.######..######.
.######..######.
.######..######.
.######..######.
................
................
.######..######.
.######..######.
.######..######.
.######..######.
.######..######.
.######..######.
................
""",
    "picker": """
................
..############..
.##############.
.##############.
.###..####..###.
.###..####..###.
.##############.
.######..######.
.######..######.
.##############.
.###..####..###.
.###..####..###.
.##############.
.##############.
..############..
................
""",
    "plays": """
................
..############..
..############..
..##........##..
..##.######.##..
..##........##..
..##.######.##..
..##........##..
..##.####...##..
..##........##..
..##.######.##..
..##........##..
..##........##..
..############..
..############..
................
""",
    "stats": """
................
................
...........###..
...........###..
...........###..
......###..###..
......###..###..
......###..###..
.###..###..###..
.###..###..###..
.###..###..###..
.###..###..###..
.###..###..###..
................
.##############.
................
""",
    "settings": """
................
......####......
..##..####..##..
..############..
...##########...
...###....###...
.####......####.
.####......####.
.####......####.
.####......####.
...###....###...
...##########...
..############..
..##..####..##..
......####......
................
""",
    "search": """
................
...######.......
..########......
.###....###.....
.##......##.....
.##......##.....
.##......##.....
.##......##.....
.###....###.....
..#########.....
...#########....
.........####...
..........####..
...........###..
............#...
................
""",
    "chevron": """
................
................
....###.........
....####........
.....####.......
......####......
.......####.....
........####....
........####....
.......####.....
......####......
.....####.......
....####........
....###.........
................
................
""",
    "close": """
................
................
..###......###..
..####....####..
...####..####...
....########....
.....######.....
......####......
......####......
.....######.....
....########....
...####..####...
..####....####..
..###......###..
................
................
""",
    "eye": """
................
................
................
.....######.....
...##########...
..###..##..###..
.###..####..###.
.###..####..###.
..###..##..###..
...##########...
.....######.....
................
................
................
................
................
""",
}


def bitmap_path(bitmap):
    rows = [r for r in bitmap.strip().splitlines()]
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), "icons must be 16x16"
    parts = []
    for y, row in enumerate(rows):
        x = 0
        while x < 16:
            if row[x] == "#":
                start = x
                while x < 16 and row[x] == "#":
                    x += 1
                parts.append(f"M{start} {y}h{x - start}v1h-{x - start}z")
            else:
                x += 1
    return "".join(parts)


def build_sprite():
    out = ['<svg xmlns="http://www.w3.org/2000/svg">', "  <defs>"]
    for name, bitmap in ICONS.items():
        out.append(f'    <symbol id="{name}" viewBox="0 0 16 16"><path d="{bitmap_path(bitmap)}"/></symbol>')
    out += ["  </defs>", "</svg>", ""]
    (ASSETS / "ui-icons.svg").write_text("\n".join(out))


def build_app_icons():
    from PIL import Image, ImageDraw

    BG = (10, 8, 24)
    PINK = (255, 45, 149)
    CYAN = (34, 227, 242)
    YELLOW = (255, 224, 74)
    ORANGE = (255, 138, 42)
    PURPLE = (86, 52, 190)

    def scene(n=64, border=True, dino_scale=0.62):
        img = Image.new("RGB", (n, n), BG)
        d = ImageDraw.Draw(img)
        horizon = int(n * 0.64)

        # Stars
        for i in range(26):
            x = (i * 37 + 11) % n
            y = (i * 23 + 5) % (horizon - 6)
            d.point((x, y), fill=(120, 110, 190) if i % 3 else (240, 236, 255))

        # Striped sun
        cx, cy, r = n // 2, int(n * 0.40), int(n * 0.27)
        for y in range(cy - r, min(cy + r, horizon)):
            half = int(math.sqrt(max(r * r - (y - cy) ** 2, 0)))
            t = (y - (cy - r)) / (2 * r)
            if t > 0.5 and (y % 4 == 0 or (t > 0.72 and y % 4 == 1)):
                continue
            color = tuple(int(YELLOW[i] + (PINK[i] - YELLOW[i]) * min(t * 1.25, 1)) for i in range(3))
            d.line((cx - half, y, cx + half, y), fill=color)

        # Grid floor
        d.rectangle((0, horizon, n, n), fill=(16, 10, 44))
        d.line((0, horizon, n, horizon), fill=CYAN)
        y, step = horizon + 2, 2.0
        while y < n:
            d.line((0, int(y), n, int(y)), fill=PURPLE)
            step *= 1.45
            y += step
        for k in range(-9, 10):
            d.line((cx + k * 3, horizon + 1, cx + k * 14, n), fill=PURPLE)

        # Dino sprite, re-pixelated onto the logical grid
        src = Image.open(ASSETS / "dinos" / "trex.png").convert("RGBA")
        src = src.crop(src.getbbox())
        size = int(n * dino_scale)
        w = size if src.width >= src.height else int(size * src.width / src.height)
        h = size if src.height >= src.width else int(size * src.height / src.width)
        small = src.resize((w, h), Image.BOX)
        alpha = small.getchannel("A").point(lambda a: 255 if a > 110 else 0)
        rgb = small.convert("RGB").quantize(colors=8, dither=Image.NONE).convert("RGB")
        ox, oy = (n - w) // 2, horizon + 4 - h + int(n * 0.06)
        # hard drop shadow
        shadow = Image.new("RGB", (w, h), (0, 0, 0))
        img.paste(shadow, (ox + 1, oy + 1), alpha)
        img.paste(rgb, (ox, oy), alpha)

        if border:
            d.rectangle((0, 0, n - 1, n - 1), outline=PINK)
            d.rectangle((1, 1, n - 2, n - 2), outline=PINK)
            d.rectangle((2, 2, n - 3, n - 3), outline=YELLOW)
            for x, y in ((0, 0), (n - 1, 0), (0, n - 1), (n - 1, n - 1)):
                d.point((x, y), fill=BG)
        return img

    # The detailed sunset scene is the in-app logo (small, in the sidebar corner).
    scene(64, border=True, dino_scale=0.62).resize((192, 192), Image.NEAREST).save(ASSETS / "logo-192.png", optimize=True)

    # App icons are deliberately simple so they read at home-screen size: the dino
    # on a deep indigo field with a soft neon glow. No border, grid, or stars.
    from PIL import ImageFilter

    def app_icon(size, dino_scale):
        big = size * 2  # draw at 2x, then downsample for smooth edges on the background
        yy = Image.linear_gradient("L").resize((big, big))
        top, bottom = (30, 20, 84), (8, 6, 20)
        img = Image.merge("RGB", [yy.point(lambda v, a=a, b=b: int(a + (b - a) * v / 255)) for a, b in zip(top, bottom)])

        glow = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        g = ImageDraw.Draw(glow)
        r = int(big * 0.30)
        g.ellipse((big // 2 - r, int(big * 0.47) - r, big // 2 + r, int(big * 0.47) + r), fill=PINK + (150,))
        r2 = int(big * 0.17)
        g.ellipse((big // 2 - r2, int(big * 0.50) - r2, big // 2 + r2, int(big * 0.50) + r2), fill=CYAN + (90,))
        glow = glow.filter(ImageFilter.GaussianBlur(big * 0.11))
        img.paste(glow, (0, 0), glow)

        src = Image.open(ASSETS / "dinos" / "trex.png").convert("RGBA")
        src = src.crop(src.getbbox())
        w = int(big * dino_scale)
        h = int(w * src.height / src.width)
        dino = src.resize((w, h), Image.NEAREST)
        ox, oy = (big - w) // 2, (big - h) // 2
        shadow = Image.new("RGBA", (big, big), (0, 0, 0, 0))
        shadow.paste((0, 0, 0, 170), (ox + int(big * 0.012), oy + int(big * 0.022)), dino.getchannel("A"))
        shadow = shadow.filter(ImageFilter.GaussianBlur(big * 0.012))
        img.paste(shadow, (0, 0), shadow)
        img.paste(dino, (ox, oy), dino)
        return img.resize((size, size), Image.LANCZOS)

    app_icon(512, 0.60).save(ASSETS / "icon-512.png", optimize=True)
    app_icon(192, 0.60).save(ASSETS / "icon-192.png", optimize=True)
    # Maskable: launchers may crop to a circle, so the dino stays inside the central safe zone.
    app_icon(512, 0.46).save(ASSETS / "icon-maskable-512.png", optimize=True)


DINOS = {
    "trex": "green-t-rex.png",
    "velociraptor": "Velociraptor-cyan.png",
    "triceratops": "Triceratops.png",
    "ankylosaurus": "Ankylosaurus-blue.png",
    "brachiosaurus": "Brachiosaurus-yellow.png",
    "pterodactyl": "Pterodactyl-light-blue.png",
    "spinosaurus": "Spinosaurus-pink.png",
    "stegosaurus": "Stegosaurus-purple.png",
}


def build_dinos():
    """Copy the dino sprites into v3/assets/dinos with hard pixel edges.

    Some source sprites are semi-transparent throughout, which reads as washed
    out on the dark arcade background. Alpha is snapped to fully on or off.
    """
    from PIL import Image

    out = ASSETS / "dinos"
    out.mkdir(exist_ok=True)
    for key, filename in DINOS.items():
        img = Image.open(ROOT / filename).convert("RGBA")
        alpha = img.getchannel("A")
        peak = alpha.getextrema()[1] or 255
        cutoff = max(24, int(peak * 0.3))
        img.putalpha(alpha.point(lambda a: 255 if a >= cutoff else 0))
        img.save(out / f"{key}.png", optimize=True)


if __name__ == "__main__":
    ASSETS.mkdir(parents=True, exist_ok=True)
    build_sprite()
    build_dinos()
    build_app_icons()
    print("Wrote", ", ".join(sorted(p.name for p in ASSETS.iterdir())))
