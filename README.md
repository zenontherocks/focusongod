# Focus On God — website

A plain HTML/CSS/JS site (no build tools required). Just open `index.html`
in a browser to preview, or upload the whole folder to any static host
(Netlify, GitHub Pages, etc.).

## Pages

- `index.html` — the book sale section (fully built) — this is the site's landing page
- `jewelry.html` — "Jewelry/Other for Sale" (fully built) — listings managed via `admin.html`, see below
- `dog-treats.html` — "Mack's Snacks" (fully built) — same hero/detail/checkout pattern as the book page, see below
- `admin.html` — password-protected console for adding/removing jewelry listings, see below
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

The book (`index.html`), dog treats (`dog-treats.html`), and jewelry
(`jewelry.html`) pages all share one popup pattern, driven by a single
script: `js/checkout-modal.js`. Each page has its own `#checkout-modal`
markup (same structure every time — copy it from an existing page if a
new section needs it), and any number of `.buy-button` elements telling
the modal what to sell. A button's `data-item-*` attributes are all the
script needs:

- `data-item-title` — used to build the order subject and the Venmo note
- `data-item-price` — a plain number string, e.g. `"34.95"`
- `data-item-subject` — text for the shipping form's hidden `_subject`
  field, so Formspree emails arrive labeled with what was ordered
- `data-item-heading` (optional) — payment-step heading prefix, defaults
  to "Complete Your Purchase" if omitted

Book and dog treats each have one hardcoded `.buy-button` with these
attributes set directly in the HTML. The jewelry page instead has one
per listing, rendered dynamically by `js/jewelry-listings.js` from
whatever's in `data/jewelry-listings.json` — so its payment links and
subject line are always correct without any code changes when a listing
is added, priced, or removed through `admin.html`.

Clicking any `.buy-button` opens the shared popup to two steps shown one
at a time:

1. **Shipping form** — collects name/address so orders can be shipped.
   Submits to Formspree (`https://formspree.io/f/meaqdvbv`) over
   `fetch`, so the page never reloads. Every submission emails straight
   to the inbox that endpoint was created with, and also shows up in the
   Formspree dashboard. Free tier: 50 submissions/month, resets monthly.
   To point every page at a different Formspree form later, change the
   `action` URL on each page's `<form id="shipping-form" ...>`.
2. **Payment step** — shown automatically once the shipping form succeeds
   (no page navigation, no second click). Has the three payment buttons
   (CashApp, PayPal, Venmo), all pointed at the same three accounts —
   `$FocusonGod4ever`, `focusingongod`, and `irishjam7` respectively —
   with the amount and Venmo note filled in from whichever `.buy-button`
   was clicked.

To change a book/dog-treats price, just update that page's one
`.buy-button`'s `data-item-price` (and the button's own visible text,
which isn't derived automatically since it doesn't need to be). Jewelry
prices are set per-listing through `admin.html` and need no HTML edits
at all.

The popup closes via its X button, clicking outside it, or the Escape
key, and returns focus to the button that opened it.

## Jewelry/Other for Sale — admin console (no eBay involved)

An eBay-based sync was tried and abandoned (bot-protection blocked
scraping, and once switched to eBay's official API, the seller's
Production keyset turned out to be disabled pending an eBay compliance
process he didn't want to deal with). `jewelry.html` is now fully
self-hosted: listings live in `data/jewelry-listings.json`, managed
through `admin.html`, a password-protected page for adding and
removing listings — no third party involved at all.

**How it works:**

- `admin.html` + `js/admin.js` — the console itself. Enter the admin
  password once (stored in `sessionStorage`, so it's re-asked each new
  browser session) to unlock a form (photo, title, optional
  description, price) and a list of current listings with a Delete
  button on each. Photos are resized/compressed client-side (max 1200px
  on the long edge, JPEG) before upload, to keep things fast and the
  repo lean.
- This site actually deploys as a **Cloudflare Worker with static
  assets** (not classic "Pages" — that distinction matters for how the
  backend is wired up). `wrangler.jsonc` at the repo root configures
  it: `assets.directory` serves every file in this repo (minus the
  handful listed in `.assetsignore`, like `src/` and this README) as
  the static site, and `main` points at `src/worker.js`, a small Worker
  script that only runs for requests that *don't* match a static file
  — i.e. just our three API routes below; every normal page/image/CSS
  request is served directly without the Worker running at all.
- `src/worker.js` routes `/api/jewelry-create`, `/api/jewelry-delete`,
  and `/api/jewelry-auth-check` (each implemented in `src/routes/`,
  shared GitHub-API helpers in `src/lib/github.js`) to the matching
  handler. They check the password, then use the GitHub Contents API to
  commit the new/removed image and the updated
  `data/jewelry-listings.json` **directly to `main`** — which triggers
  a normal deploy, same as any other change to this site. That means a
  new or deleted listing takes roughly **30-90 seconds** to actually
  appear live (a real deploy happens) — that's expected, not a bug.
- `js/jewelry-listings.js` — renders `data/jewelry-listings.json` into
  the grid of cards on `jewelry.html` (image, title, price,
  description).

**One-time setup required** (two secrets in the Cloudflare dashboard —
Workers & Pages → this project → Settings → Variables and secrets —
**not** GitHub secrets, a different place):

- `ADMIN_PASSWORD` — whatever password should unlock `admin.html`.
  Pick something only you and your friend know.
- `GITHUB_TOKEN` — a GitHub personal access token with write access to
  this repo (Settings → Developer settings → Personal access tokens on
  GitHub → generate one scoped to just this repository, contents:
  read/write). This is what lets the Worker commit changes on his
  behalf.

Until both secrets are set, `admin.html` will unlock (or reject) based
on `ADMIN_PASSWORD`, but any create/delete will fail with a clear error
if `GITHUB_TOKEN` is missing or lacks permission.

**Cleanup:** the two now-unused `EBAY_APP_ID` / `EBAY_CERT_ID` GitHub
repository secrets from the abandoned eBay attempt can be deleted
(GitHub → repo → Settings → Secrets and variables → Actions) — they're
not doing anything anymore.

**Security note:** `admin.html` is reachable by anyone who knows its
URL, but nothing on it works without the correct password (checked
server-side on every request) — this is a lightweight, appropriate
level of protection for a small personal site, not enterprise-grade
auth. Treat the admin password and the GitHub token as real secrets.

## Shared navbar/footer

The navbar and footer are shared across every page and defined once in
`js/site-shell.js`. Edit that file to change the menu or footer text
everywhere at once — you shouldn't need to edit the navbar HTML on each
page individually.
