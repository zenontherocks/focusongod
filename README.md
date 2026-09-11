# Focus On God — website

A plain HTML/CSS/JS site (no build tools required). Just open `index.html`
in a browser to preview, or upload the whole folder to any static host
(Netlify, GitHub Pages, etc.).

## Pages

- `index.html` — the book sale section (fully built) — this is the site's landing page
- `jewelry.html` — "Jewelry/Other for Sale" (fully built) — auto-synced from eBay, see below
- `dog-treats.html`, `discussion.html` — placeholder "coming soon" pages for future sections

## Editing text

Open the relevant `.html` file in any text editor and change the text
between the tags. Lines marked `<!-- PLACEHOLDER COPY -->` are meant to
be replaced with real content.

## Swapping in real images

Drop your image files into the matching folder using these exact names —
no code changes needed, the pages will pick them up automatically:

- `images/book/hero-bg.jpg` — background photo behind the book page's top banner
- `images/book/cover.jpg` — the book cover photo

(The remaining sections — dog treats, discussion — will use the same
`images/<section>/hero-bg.jpg` pattern once those pages are built.)

## Checkout popup

Clicking "Buy the Book" opens a popup (`#checkout-modal` in `index.html`,
behavior in `js/checkout-modal.js`) with two steps shown one at a time in
the same popup:

1. **Shipping form** — collects name/address so orders can be shipped.
   Submits to Formspree (`https://formspree.io/f/meaqdvbv`) over
   `fetch`, so the page never reloads. Every submission emails straight
   to the inbox that endpoint was created with, and also shows up in the
   Formspree dashboard. Free tier: 50 submissions/month, resets monthly.
   To point it at a different Formspree form later, change the `action`
   URL on `<form id="shipping-form" ...>`.
2. **Payment step** — shown automatically once the shipping form succeeds
   (no page navigation, no second click). Has the three payment buttons,
   already set to the $34.95 book price:
   - CashApp: `https://cash.app/$FocusonGod4ever/34.95`
   - PayPal: `https://paypal.me/focusingongod/34.95`
   - Venmo: `https://venmo.com/u/irishjam7?txn=pay&amount=34.95&note=Book`

If the price changes, update the `$34.95` shown on both the "Buy the
Book" button and the "Get Your Copy" heading, plus the amount in each of
the three payment links — all in `index.html`.

The popup closes via its X button, clicking outside it, or the Escape
key, and returns focus to the "Buy the Book" button.

## Jewelry/Other for Sale (auto-synced from eBay)

`jewelry.html` shows whatever is currently listed on the
[eBay store](https://www.ebay.com/usr/northst9155) — no manual editing
needed. This is kept fresh by:

- `.github/workflows/update-ebay-listings.yml` — a GitHub Action that
  runs every 6 hours (and can be run on demand from the repo's Actions
  tab via "Run workflow")
- `.github/scripts/update_ebay_listings.py` — the script it runs, which
  fetches eBay's RSS export of the seller's listings and writes
  `data/ebay-listings.json`
- `js/ebay-listings.js` — loads that JSON on page view and renders the
  grid of cards (image, title, price, "View on eBay" button)

If the Action's commit changes `data/ebay-listings.json`, the site
redeploys automatically (Cloudflare Pages watches `main`) with the new
listings — nobody needs to touch any code when he adds, removes, or
reprices something on eBay.

**Known fragility:** the script parses eBay's RSS feed with a couple of
regular expressions. If eBay changes that feed's format, the Action will
either fail outright (visible as a red run in the Actions tab) or parse
zero items (logged as a warning, and it deliberately leaves the last
good `data/ebay-listings.json` in place rather than blanking the page).
Check the Action's run history if listings look stale.

## Shared navbar/footer

The navbar and footer are shared across every page and defined once in
`js/site-shell.js`. Edit that file to change the menu or footer text
everywhere at once — you shouldn't need to edit the navbar HTML on each
page individually.
