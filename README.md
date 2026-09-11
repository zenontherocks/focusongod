# Focus On God — website

A plain HTML/CSS/JS site (no build tools required). Just open `index.html`
in a browser to preview, or upload the whole folder to any static host
(Netlify, GitHub Pages, etc.).

## Pages

- `index.html` — the book sale section (fully built) — this is the site's landing page
- `jewelry.html`, `dog-treats.html`, `discussion.html` — placeholder "coming soon" pages for future sections

## Editing text

Open the relevant `.html` file in any text editor and change the text
between the tags. Lines marked `<!-- PLACEHOLDER COPY -->` are meant to
be replaced with real content.

## Swapping in real images

Drop your image files into the matching folder using these exact names —
no code changes needed, the pages will pick them up automatically:

- `images/book/hero-bg.jpg` — background photo behind the book page's top banner
- `images/book/cover.jpg` — the book cover photo

(The other sections — jewelry, dog treats, discussion — will use the same
`images/<section>/hero-bg.jpg` pattern once those pages are built.)

## Payment links

The checkout buttons in `index.html` are already set to the $34.95 book price:

- CashApp: `https://cash.app/$FocusonGod4ever/34.95`
- PayPal: `https://paypal.me/focusingongod/34.95`
- Venmo: `https://venmo.com/u/irishjam7?txn=pay&amount=34.95&note=Book`

If the price changes, update both the `$34.95` shown in the "Get Your
Copy" heading and the amount in each of the three links above.

To change any of them later, open `index.html` and edit the `href` on the
matching `btn--cashapp` / `btn--paypal` / `btn--venmo` link.

## Setting up the shipping form (Formspree)

Before payment, buyers fill out a name/address form so orders can actually
be shipped. That form needs a one-time setup to start working:

1. Go to [formspree.io](https://formspree.io) and sign up free (using
   `focusingongod4ever@yahoo.com` makes sense, so submissions land in that
   inbox).
2. Create a new form. Formspree gives you an endpoint URL that looks like
   `https://formspree.io/f/xxxxxxxx`.
3. Open `index.html`, find `PASTE_FORMSPREE_FORM_ID_HERE` in the
   `<form action="...">` line, and replace the whole placeholder URL with
   your real endpoint.

That's it — no other code changes needed. Every submission emails
straight to the inbox you signed up with, and also shows up in your
Formspree dashboard. The free tier allows 50 submissions/month, which
resets monthly.

Until the real endpoint is in place, submitting the form will show an
error message (expected) instead of revealing the payment buttons.

## Shared navbar/footer

The navbar and footer are shared across every page and defined once in
`js/site-shell.js`. Edit that file to change the menu or footer text
everywhere at once — you shouldn't need to edit the navbar HTML on each
page individually.
