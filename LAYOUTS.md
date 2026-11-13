# Front-page previews

The live homepage is still the original page at `/`. Nothing in the app shell imports these files, so picking a design later means replacing the homepage markup, not the signing flow.

| Preview | Path | Direction |
|---|---|---|
| A Corporate | `/layouts/a` | Deep navy hero, dot grid, teal glass. DocuSign / Dropbox Sign. |
| B Aurora | `/layouts/b` | Indigo mesh, fine grid, glass pricing. Stripe / Linear. |
| C Grove | `/layouts/c` | Forest hero, warm paper sections, product frame. PandaDoc / SignWell. |
| Index | `/layouts` | Links to all three plus the current homepage. |

Each file is self-contained (`layouts/a.html`, `b.html`, `c.html`) plus a shared preview bar in `layouts/preview.css` and `layouts/preview.js`. All three use a tinted page, a dark or deep hero, a sample “Signed vs out for signature” chart marked as sample data, line icons, and the real prices: 1 free document, $1 per document, $10/month for 100.

When a direction is chosen, keep that file as the reference and restyle the homepage in `app.js` (`landing()`). Leave the editor, signer, and API alone.
