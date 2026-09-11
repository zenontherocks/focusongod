#!/usr/bin/env python3
"""Fetch northst9155's current eBay listings and write data/ebay-listings.json.

Uses only the Python standard library (no pip dependencies) since this
project has no other build tooling. Run by
.github/workflows/update-ebay-listings.yml on a schedule.
"""

import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

RSS_URL = "https://www.ebay.com/sch/i.html?_ssn=northst9155&_rss=1"
OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "ebay-listings.json"

PRICE_RE = re.compile(r"(?:US\s*)?\$[\d,]+\.\d{2}")
IMG_SRC_RE = re.compile(r'<img[^>]+src="([^"]+)"', re.IGNORECASE)


def fetch_feed(url):
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        if response.status != 200:
            raise RuntimeError(f"Unexpected status {response.status} fetching {url}")
        return response.read()


def parse_items(rss_bytes):
    root = ET.fromstring(rss_bytes)
    items = []
    for item_el in root.findall("./channel/item"):
        title = (item_el.findtext("title") or "").strip()
        link = (item_el.findtext("link") or "").strip()
        description = item_el.findtext("description") or ""

        price_match = PRICE_RE.search(description)
        price = price_match.group(0) if price_match else None

        img_match = IMG_SRC_RE.search(description)
        image = img_match.group(1) if img_match else None

        if not title or not link:
            continue

        items.append({"title": title, "price": price, "url": link, "image": image})
    return items


def main():
    try:
        rss_bytes = fetch_feed(RSS_URL)
    except Exception as exc:  # network/HTTP failure -> fail the job loudly
        print(f"ERROR: failed to fetch eBay RSS feed: {exc}", file=sys.stderr)
        return 1

    try:
        items = parse_items(rss_bytes)
    except ET.ParseError as exc:
        print(f"ERROR: failed to parse eBay RSS feed as XML: {exc}", file=sys.stderr)
        return 1

    if not items:
        print(
            "WARNING: parsed 0 items from the eBay feed (format may have changed, "
            "or the store may be temporarily empty). Leaving existing data file untouched.",
            file=sys.stderr,
        )
        return 0

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "items": items,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"Wrote {len(items)} listing(s) to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
