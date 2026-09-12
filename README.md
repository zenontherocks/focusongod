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

## Jewelry/Other for Sale (currently a link-out; auto-sync is paused)

`jewelry.html` right now just points visitors to the
[eBay store](https://www.ebay.com/usr/northst9155) directly with a
plain link — no listing data is pulled into the site.

An automated sync was built but is **paused** because eBay's
bot-protection blocks the approach it used (scraping the RSS export of
the seller's search results returns an HTTP 403 block page — confirmed,
not a guess — and isn't fixable by adjusting request headers). The
pieces are still in the repo, unused, ready to be revived once the
seller signs up for eBay's official Developer API instead of scraping:

- `.github/workflows/update-ebay-listings.yml` — a GitHub Action
  (schedule currently commented out; `workflow_dispatch` still works for
  manual testing) meant to keep `data/ebay-listings.json` up to date
- `.github/scripts/update_ebay_listings.py` — fetches and parses
  eBay's RSS feed — **this is the part that needs replacing** with a
  real eBay Browse API call once API credentials exist
- `js/ebay-listings.js` — renders `data/ebay-listings.json` into a grid
  of cards (image, title, price, "View on eBay" button) — not currently
  linked from `jewelry.html`, but ready to reuse once there's real data
  flowing into that JSON file again

To pick this back up: get eBay Developer Program credentials (App ID +
Cert ID) for the seller account, rework
`update_ebay_listings.py` to call eBay's Browse API with those
credentials instead of scraping RSS, re-enable the `schedule:` block in
the workflow file, and swap `jewelry.html`'s content back to the
`#ebay-listings-grid` + `js/ebay-listings.js` version.

## Shared navbar/footer

The navbar and footer are shared across every page and defined once in
`js/site-shell.js`. Edit that file to change the menu or footer text
everywhere at once — you shouldn't need to edit the navbar HTML on each
page individually.
