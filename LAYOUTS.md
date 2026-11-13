# Front-page previews

The live homepage is still the original page at `/`. Nothing in the app shell imports these files, so picking a design later means replacing the homepage markup, not the signing flow.

| Preview | Path | Direction |
|---|---|---|
| A Corporate | `/layouts/a` | Deep navy hero, dot grid, teal glass. DocuSign / Dropbox Sign. |
| B Aurora | `/layouts/b` | Indigo mesh, fine grid, glass pricing. Stripe / Linear. |
| C Grove | `/layouts/c` | Forest hero, warm paper sections, product frame. PandaDoc / SignWell. |
| Index | `/layouts` | Links to all three plus the current homepage. |

The live homepage now follows the navy-and-teal mockup. These files are the earlier options and are not the prices in the app.

When you change the homepage again, edit `marketing.js` and `home.css`. Leave the editor, signer, and API alone.
