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

## Adding the real payment links

In `index.html`, search for:

- `PASTE_CASHAPP_LINK_HERE` — replace with your CashApp payment link
- `PASTE_PAYPAL_LINK_HERE` — replace with your PayPal payment link
- `PASTE_CONTACT_EMAIL_OR_HANDLE_HERE` — replace with a contact email/handle for order questions

## Shared navbar/footer

The navbar and footer are shared across every page and defined once in
`js/site-shell.js`. Edit that file to change the menu or footer text
everywhere at once — you shouldn't need to edit the navbar HTML on each
page individually.
