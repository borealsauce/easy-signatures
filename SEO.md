# SEO, analytics, and conversion tracking

## What's here
- `seo/routes.js` registers server-rendered pages (real HTML for crawlers), `/robots.txt`, `/sitemap.xml`,
  favicons, `/og.png`, and prerenders the homepage (`marketingHtml`) into `index.html` with full meta.
- `seo/pages.js` (alternatives, pricing, use cases), `seo/blog.js` (articles), `seo/tool-page.js` (signature generator).
- `seo/layout.js` holds titles/meta/OG/Twitter/JSON-LD helpers. `shared/site-footer.js` is the site-wide footer
  (also used by the homepage), `shared/home-faq.js` the homepage FAQ (mirrored into FAQPage JSON-LD).
- `scripts/build-seo-assets.js` regenerates `seo/assets` (og.png 1200x630, favicon.ico, icons, manifest).
- Competitor prices were read on each vendor's public pricing page on 2026-11-14 (`seo/shared-blocks.js`).
  Re-check them before relying on them; update `CHECKED` in `seo/layout.js` when you do.

## Google Search Console (owner steps)
Option A, DNS (recommended, covers http/https and all subdomains):
1. https://search.google.com/search-console → Add property → **Domain** → `easydigitalsignatures.com`.
2. Copy the `google-site-verification=...` TXT value Google shows.
3. Add it as a TXT record on the root (`@`) at whoever hosts the domain's DNS (Vercel: Project → Settings →
   Domains, or `vercel dns add easydigitalsignatures.com @ TXT "google-site-verification=..."`).
4. Back in Search Console click **Verify** (DNS can take a few minutes to an hour).

Option B, HTML tag (URL-prefix property `https://easydigitalsignatures.com/`):
1. Choose **URL prefix**, pick **HTML tag**, copy only the `content="..."` value.
2. Set it in Vercel: `vercel env add GOOGLE_SITE_VERIFICATION production` (paste the value), then redeploy.
   Every page then carries `<meta name="google-site-verification" ...>`.
3. Click **Verify**.

Then: Sitemaps → submit `sitemap.xml`. Optionally URL Inspection → Request indexing for `/`, `/e-signature-pricing`,
`/docusign-alternative`, and `/signature-generator`.

## Analytics (cookie-free)
- `seo/analytics.js` loads on every page (homepage, app shell, SEO pages). On the production domain it loads
  Vercel Web Analytics (`/_vercel/insights/script.js`), which doesn't use cookies. Enable it in the Vercel
  dashboard: Project → Analytics → Enable.
- `window.edsTrack(name, data)` is the conversion hook. It forwards to Vercel custom events (Pro plan only)
  and pushes to `window.dataLayer`.
- Fired automatically, without changes to app code, by watching the app's own API calls:
  `signup` (POST /api/auth/signup succeeded), `begin_checkout`, `purchase` (with `pack`, `value` in USD,
  `transaction_id` = Stripe session id, deduped per tab), `cta_click` (any `[data-cta]` link), `signature_download`.
- First-touch UTM / gclid / landing page are kept per tab in sessionStorage (no cookies) and attached to events.

## PPC test plan (cost per signup)
1. Tag every ad URL with `utm_source`, `utm_medium=cpc`, `utm_campaign` (Google Ads auto-tagging adds `gclid`).
2. Land ads on matching pages (`/docusign-alternative`, `/e-signature-pricing`, `/sign-pdf-online`).
3. For Google Ads conversions, add the Google tag and map `dataLayer` events `signup` and `purchase` to conversion
   actions (purchase value = `value`). That tag sets cookies, so add a consent banner first if you target the EEA/UK.
4. Cost per signup = ad spend ÷ `signup` conversions; also compare with new rows in `profiles` for the same dates.
5. Judge on cost per paying customer too: a 50-pack is $10, so a signup is worth roughly
   (paid-conversion rate × average order value).
