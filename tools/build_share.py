#!/usr/bin/env python3
"""Refresh the read-only share page's copy of the v3 design.

The share page (share/) loads its data live from the read-only Apps Script
feed (google-apps-script/ShareFeed.gs) set as FEED_URL in share/index.html.
This script only copies the stylesheet, icons, and cover-image map from v3/
into share/, so the folder stays self-contained and can be hosted by itself.
Run it after changing the v3 design, then re-upload share/ to the host.

Usage: python3 tools/build_share.py
"""
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
V3 = ROOT / "v3"
SHARE = ROOT / "share"


def main():
    SHARE.mkdir(exist_ok=True)
    shutil.copy2(V3 / "cabinet.css", SHARE / "cabinet.css")
    shutil.copy2(V3 / "bgg-images.js", SHARE / "bgg-images.js")
    assets = SHARE / "assets"
    (assets / "dinos").mkdir(parents=True, exist_ok=True)
    for name in ("ui-icons.svg", "logo-192.png", "icon-192.png", "icon-512.png"):
        shutil.copy2(V3 / "assets" / name, assets / name)
    shutil.copy2(V3 / "assets" / "dinos" / "trex.png", assets / "dinos" / "trex.png")
    shutil.copy2(ROOT / "powered-by-bgg-rgb.svg", assets / "powered-by-bgg-rgb.svg")
    print("share/: stylesheet, icons, and cover map copied from v3/.")

    # Guardrail: the only Google address allowed in share/ is the read-only feed
    # (script.google.com/.../exec). Spreadsheet addresses must never appear.
    for path in SHARE.glob("*.*"):
        if path.suffix in (".html", ".js") and re.search(r"docs\.google\.com|2PACX-", path.read_text()):
            sys.exit(f"ERROR: {path.name} contains a Google Sheets address.")


if __name__ == "__main__":
    main()
