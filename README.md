# Focus On God — website

A plain HTML/CSS/JS site (no build tools required). Just open `index.html`
in a browser to preview, or upload the whole folder to any static host
(Netlify, GitHub Pages, etc.).

## Pages

- `index.html` — the book sale section (fully built) — this is the site's landing page
- `jewelry.html` — "Jewelry/Other for Sale" — currently just a link out to the eBay store; auto-sync is built but paused, see below
- `dog-treats.html` — "Mack's Snacks" (fully built) — same hero/detail/checkout pattern as the book page, see below
- `discussion.html` — placeholder "coming soon" page for a future section

## Editing text

Open the relevant `.html` file in any text editor and change the text
between the tags. Lines marked `<!-- PLACEHOLDER COPY -->` are meant to
be replaced with real content.

## Swapping in real images

Drop your image files into the matching folder using these exact names —
no code changes needed, the pages will pick them up automatically:

- `images/book/hero-bg.jpg` — background photo behind the book page's top banner
- `images/book/cover.jpg` — the book cover photo
- `images/dog-treats/hero-bg.jpg` — background photo behind the dog treats page's top banner
- `images/dog-treats/cover.jpg` — a real product photo of the treats

Until real dog treats photos exist, both of those spots show
`images/dog-treats/placeholder.svg` (a simple drawn dog-bone graphic) as
a stand-in — it's a second background layer behind the `hero-bg.jpg` /
`cover.jpg` slot, so dropping in the real photos with those exact
filenames works with zero code changes, same as everywhere else.

(`discussion.html` will use the same `images/<section>/hero-bg.jpg`
pattern once that page is built.)

## Checkout popup

Both the book (`index.html`) and dog treats (`dog-treats.html`) pages
use the same pattern: clicking the "Buy" button opens a popup
(`#checkout-modal`, behavior in `js/checkout-modal.js`, shared by both
pages) with two steps shown one at a time in the same popup:

1. **Shipping form** — collects name/address so orders can be shipped.
   Submits to Formspree (`https://formspree.io/f/meaqdvbv`) over
   `fetch`, so the page never reloads. Every submission emails straight
   to the inbox that endpoint was created with, and also shows up in the
   Formspree dashboard. Free tier: 50 submissions/month, resets monthly.
   To point it at a different Formspree form later, change the `action`
   URL on `<form id="shipping-form" ...>`. The dog treats page's form
   also sets a hidden `_subject` field so those emails arrive labeled
   "New order: Dog Treats" instead of looking like book orders.
2. **Payment step** — shown automatically once the shipping form succeeds
   (no page navigation, no second click). Has the three payment buttons:
   - Book ($34.95): `https://cash.app/$FocusonGod4ever/34.95`,
     `https://paypal.me/focusingongod/34.95`,
     `https://venmo.com/u/irishjam7?txn=pay&amount=34.95&note=Book`
   - Dog Treats ($27.49): same three accounts with `/27.49` amounts and
     `note=Dog+Treats` on the Venmo link

If a price changes, update it in three places on that page: the "Buy"
button text, the "Get Your Copy"/"Get Your Treats" heading, and the
amount in each of the three payment links.

The popup closes via its X button, clicking outside it, or the Escape
key, and returns focus to the button that opened it.

## Jewelry/Other for Sale (auto-synced from eBay via the Browse API)

`jewelry.html` shows whatever is currently listed on the
[eBay store](https://www.ebay.com/usr/northst9155) — no manual editing
needed. An earlier version of this tried scraping eBay's RSS feed
directly and got blocked by eBay's bot-protection (HTTP 403 — confirmed
via the Action's logs, not fixable by adjusting headers). It's now
rebuilt on eBay's official **Browse API**, authenticated with real
Developer Program credentials:

- `.github/workflows/update-ebay-listings.yml` — a GitHub Action that
  runs the script below. Schedule is **paused** (commented out) until a
  manual run has been verified to work end-to-end; `workflow_dispatch`
  is enabled for that manual test. Once verified, uncomment the
  `schedule:` block to run automatically (every 6 hours by default).
- `.github/scripts/update_ebay_listings.py` — logs in to eBay's API
  using the OAuth Client Credentials flow, searches for the seller's
  active items (`filter=sellers:{northst9155}` on the Browse API's
  `item_summary/search` endpoint, paginated), and writes
  `data/ebay-listings.json`. Requires two **repository secrets**:
  `EBAY_APP_ID` and `EBAY_CERT_ID` (the seller's Production App ID /
  Cert ID from developer.ebay.com — already added as of this writing).
  A failure (bad credentials, API error) fails the Action run loudly; a
  successful call that finds zero items logs a warning and leaves the
  existing data file untouched, rather than blanking the page.
- `js/ebay-listings.js` — renders `data/ebay-listings.json` into a grid
  of cards (image, title, price, "View on eBay" button), with a
  fallback message linking to the eBay store directly if the data isn't
  available for any reason.

If the Action's commit changes `data/ebay-listings.json`, the site
redeploys automatically (Cloudflare Pages watches `main`) with the new
listings — nobody needs to touch any code when the seller adds,
removes, or reprices something on eBay.

## Shared navbar/footer

The navbar and footer are shared across every page and defined once in
`js/site-shell.js`. Edit that file to change the menu or footer text
everywhere at once — you shouldn't need to edit the navbar HTML on each
page individually.
