#!/usr/bin/env python3
"""Fetch northst9155's current eBay listings and write data/ebay-listings.json.

Uses eBay's official Browse API (not scraping — that got blocked by eBay's
bot-protection, see git history) via the OAuth Client Credentials flow.
Requires EBAY_APP_ID and EBAY_CERT_ID (Production keys) as environment
variables, set from GitHub Actions repository secrets.

Uses only the Python standard library (no pip dependencies) since this
project has no other build tooling. Run by
.github/workflows/update-ebay-listings.yml on demand / on a schedule.
"""

import base64
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

SELLER_USERNAME = "northst9155"
MARKETPLACE_ID = "EBAY_US"
TOKEN_URL = "https://api.ebay.com/identity/v1/oauth2/token"
SEARCH_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search"
OUTPUT_PATH = Path(__file__).resolve().parent.parent.parent / "data" / "ebay-listings.json"

PAGE_LIMIT = 100


def http_request(request):
    try:
        return urllib.request.urlopen(request, timeout=30)
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:2000]
        raise RuntimeError(
            f"HTTP {exc.code} {exc.reason} calling {request.full_url}\n"
            f"Response body (truncated): {body}"
        ) from exc


def get_access_token(app_id, cert_id):
    credentials = f"{app_id}:{cert_id}".encode("utf-8")
    basic_auth = base64.b64encode(credentials).decode("ascii")
    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "scope": "https://api.ebay.com/oauth/api_scope",
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        TOKEN_URL,
        data=body,
        headers={
            "Authorization": f"Basic {basic_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
        method="POST",
    )
    with http_request(request) as response:
        payload = json.loads(response.read())
    return payload["access_token"]


def search_seller_items(access_token, offset):
    params = {
        "filter": f"sellers:{{{SELLER_USERNAME}}}",
        "limit": str(PAGE_LIMIT),
        "offset": str(offset),
    }
    url = f"{SEARCH_URL}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "X-EBAY-C-MARKETPLACE-ID": MARKETPLACE_ID,
            "Accept": "application/json",
        },
    )
    with http_request(request) as response:
        return json.loads(response.read())


def extract_item(raw):
    price_info = raw.get("price") or {}
    value = price_info.get("value")
    currency = price_info.get("currency", "")
    price = None
    if value:
        price = f"${value}" if currency == "USD" else f"{value} {currency}"

    image = (raw.get("image") or {}).get("imageUrl")
    if not image:
        thumbnails = raw.get("thumbnailImages") or []
        if thumbnails:
            image = thumbnails[0].get("imageUrl")

    return {
        "title": (raw.get("title") or "").strip(),
        "price": price,
        "url": raw.get("itemWebUrl"),
        "image": image,
    }


def fetch_all_items(access_token):
    items = []
    offset = 0
    while True:
        data = search_seller_items(access_token, offset)
        batch = data.get("itemSummaries") or []
        items.extend(extract_item(raw) for raw in batch)

        total = data.get("total", len(items))
        offset += len(batch)
        if not batch or len(batch) < PAGE_LIMIT or offset >= total:
            break

    return [item for item in items if item["title"] and item["url"]]


def main():
    app_id = os.environ.get("EBAY_APP_ID")
    cert_id = os.environ.get("EBAY_CERT_ID")
    if not app_id or not cert_id:
        print(
            "ERROR: EBAY_APP_ID and/or EBAY_CERT_ID environment variables are not set.",
            file=sys.stderr,
        )
        return 1

    try:
        access_token = get_access_token(app_id, cert_id)
    except Exception as exc:
        print(f"ERROR: failed to get an eBay access token: {exc}", file=sys.stderr)
        return 1

    try:
        items = fetch_all_items(access_token)
    except Exception as exc:
        print(f"ERROR: failed to search eBay listings: {exc}", file=sys.stderr)
        return 1

    if not items:
        print(
            "WARNING: eBay search returned 0 items (the store may be temporarily "
            "empty, or the seller filter may need adjusting). Leaving existing "
            "data file untouched.",
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
