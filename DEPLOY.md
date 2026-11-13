# Deploy Easy Digital Signatures

Recommended host: **Vercel**. The API, the site, Stripe webhooks, and the daily reminder job are one Node app. GitHub Pages cannot do this.

`NODE_ENV=production` will not start until every variable in the checklist below is set. Do that on purpose: a half-configured production server should refuse traffic rather than silently use the local test drivers.

## 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL editor → New query.** Paste and run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/rls.sql`](supabase/rls.sql).
3. **Storage → New bucket.** Name it `documents`. Turn **Public** off. Do not add a public policy. The server uploads with the service role key.
4. **Authentication → Providers → Email.** Leave email/password enabled. You can leave “Confirm email” on; this app sends its own confirmation link and does not rely on Supabase’s built-in mail.
5. **Authentication → URL configuration.**
   - Site URL: `https://easydigitalsignatures.com`
   - Redirect URLs: `https://easydigitalsignatures.com/auth/confirmed` and `http://localhost:3000/auth/confirmed`
6. Copy these into the host’s environment (never into the browser bundle):

| Variable | Where to copy it |
|---|---|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → `service_role` secret |
| `SUPABASE_ANON_KEY` | Project Settings → API → `anon` public key (optional; login falls back to the service role if it is empty) |
| `DATABASE_URL` | Project Settings → Database → Connection string → **URI**, pooled (port 6543). Use the database password, not the anon key. |

The tables are created again on boot when `AUTO_MIGRATE` is not `0`, so the SQL editor step is also safe to re-run.

## 2. Resend (email)

1. Create an account at [resend.com](https://resend.com).
2. **Domains → Add domain → `easydigitalsignatures.com`.** Resend shows DNS records (usually a TXT for SPF and DKIM CNAMEs). Add those at GoDaddy in addition to the records in section 6. Wait until Resend says the domain is verified.
3. Create an API key.

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | The API key |
| `EMAIL_FROM` | `Easy Digital Signatures <signatures@easydigitalsignatures.com>` |

Use an address on the verified domain. Confirmation mail, signing invitations, reminders, and the completed PDF all go out through this key.

## 3. Twilio (optional SMS)

Phone verification is optional. If `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_VERIFY_SERVICE_SID` are all unset, production still starts. The phone screen, the “verify your phone” banner, and the settings phone link stay hidden. Signers still get email links, and the free document unlocks after email confirmation. Device, email-alias, IP, and card checks still apply. A phone number is not collected, so the one-number and virtual-number checks are not available until Twilio is turned on.

Set **all three** variables to turn SMS back on. Behavior is then the same as before: the free document requires a verified mobile number, and virtual numbers are blocked when Lookup can see the line type.

1. Create an account at [twilio.com](https://www.twilio.com).
2. **Verify → Services → Create.** Copy the Service SID. The channel is SMS.
3. **Phone Numbers → Geo permissions.** Enable the countries you will text.
4. Lookup line-type is optional but recommended. In the Twilio console, open Lookup and allow **Line Type Intelligence**. When it is available, virtual numbers (`nonFixedVoip`, `fixedVoip`, and similar) can verify an account but cannot unlock the free document. If Lookup is not enabled, the line type is stored as unknown and the free document is not blocked for that reason.

| Variable | Where |
|---|---|
| `TWILIO_ACCOUNT_SID` | Account dashboard. Optional. |
| `TWILIO_AUTH_TOKEN` | Account dashboard. Optional. |
| `TWILIO_VERIFY_SERVICE_SID` | Verify → Services. Optional. |

Trial accounts can only text verified destination numbers. Upgrade the Twilio account before real customers use SMS. If only one or two of the three variables are set, SMS stays off.

## 4. Stripe (one-time packs)

The first document is free and never creates a Stripe charge. After that, customers buy credits. Each send spends one credit. There is no subscription.

Apple Pay and Google Pay appear on Stripe’s hosted Checkout page when those wallets are enabled. Hosted Checkout runs on Stripe’s domain, which is already registered for Apple Pay.

1. **Settings → Payment methods.** Confirm **Cards**, **Apple Pay**, and **Google Pay** are on.
2. **Settings → Billing → Customer portal.** Turn the portal on so Settings → Receipts can open past payments. Cancellation is optional because there is no subscription.
3. The live prices already exist. Put these ids in the environment (they are price ids, not secret keys):

| What the customer buys | Amount | Credits | Env var | Live price id |
|---|---|---|---|---|
| 1 document | $1 | 1 | `STRIPE_PRICE_1DOC` | `price_1UbOacBLGpe8m3IgCuYdvFMy` |
| 10 documents | $5 | 10 | `STRIPE_PRICE_10DOC` | `price_1UbOZxBLGpe8m3IgmA5H99rB` |
| 50 documents | $10 | 50 | `STRIPE_PRICE_50DOC` | `price_1UbOZzBLGpe8m3IghWSiKz9C` |

4. **Developers → Webhooks → Add endpoint.**

- URL: `https://easydigitalsignatures.com/api/billing/webhook`
- Event: `checkout.session.completed` (this is the only event the app uses)
- Copy the signing secret (`whsec_...`).

| Variable | Where |
|---|---|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret key. Use `sk_test_...` until you are ready to charge the live prices. |
| `STRIPE_PUBLISHABLE_KEY` | Developers → API keys → Publishable key |
| `STRIPE_WEBHOOK_SECRET` | The webhook signing secret |
| `STRIPE_PRICE_1DOC` | `price_1UbOacBLGpe8m3IgCuYdvFMy` |
| `STRIPE_PRICE_10DOC` | `price_1UbOZxBLGpe8m3IgmA5H99rB` |
| `STRIPE_PRICE_50DOC` | `price_1UbOZzBLGpe8m3IghWSiKz9C` |

Test card, while the secret key is a test key: `4242 4242 4242 4242`. Wallet buttons show only on a device that can use Apple Pay or Google Pay.

Credits are added only after Stripe tells the server the session is paid. The return URL cannot grant a credit by itself.

## 4b. Contact form and help chat

| Variable | Required | Purpose |
|---|---|---|
| `SUPPORT_TO_EMAIL` | Yes in production | Inbox that receives contact-form messages. Reply-To is the customer’s address. |
| `AI_API_KEY` | No | Turns on the help chat. If empty, the widget is hidden. |
| `AI_BASE_URL` | No | OpenAI-compatible base URL. Default `https://api.x.ai/v1`. |
| `AI_MODEL` | No | Chat model. Default `grok-3`. |

The chat answers from `content/help-faq.md` only. It does not see customer documents.

## 5. The rest of the environment

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `APP_URL` | `https://easydigitalsignatures.com` (no trailing slash) |
| `JWT_SECRET` | A long random string. `openssl rand -base64 48` |
| `CRON_SECRET` | Another long random string. Vercel Cron sends it as `Authorization: Bearer ...` |
| `SUPPORT_TO_EMAIL` | Inbox for the contact form, for example `help@easydigitalsignatures.com` |
| `AI_API_KEY` | Optional. Help chat stays hidden without it. |
| `AI_BASE_URL` | Optional. Default `https://api.x.ai/v1`. |
| `AI_MODEL` | Optional. Default `grok-3`. |
| `TRUST_PROXY` | `1` on Vercel |
| `IP_FREE_LIMIT` | Optional. Default `3` free documents per IP per 30 days. Offices share an IP, so this is a threshold, not a hard block, and it never blocks a paid send. |
| `SIGNUP_PER_HOUR` | Optional. Default `5`. |
| `SIGNUP_PER_DAY` | Optional. Default `20`. |

## 6. Vercel

1. Import this Git repository at [vercel.com/new](https://vercel.com/new). Framework preset can stay empty; `vercel.json` routes every path to the Node server.
2. Add every variable from the sections above. Mark the secrets as sensitive.
3. Deploy.
4. **Settings → Domains → add `easydigitalsignatures.com` and `www.easydigitalsignatures.com`.** Vercel will show the DNS records. Prefer those if they differ from the ones below.
5. **Settings → Cron Jobs** should list `GET /api/cron/reminders` daily at 15:00 UTC (from `vercel.json`). The `CRON_SECRET` variable is what authorizes it.

`vercel.json` gives the function 60 seconds. PDF stamping for a normal agreement finishes well inside that. Vercel’s hobby plan caps duration lower; if a large PDF times out, move the project to Vercel Pro or run `npm start` on a Node host (Railway, Render, Fly). The same environment variables work there. Set the process command to `npm start` and the health check to `GET /api/health`.

## 7. GoDaddy DNS

The domain `easydigitalsignatures.com` stays registered at GoDaddy. Point it at Vercel:

1. GoDaddy → My Products → `easydigitalsignatures.com` → DNS.
2. Delete parking records (an A record to GoDaddy’s parking IPs, or a CNAME to a parking host). Do not delete the Resend or Twilio records you added above.
3. Add:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `76.76.21.21` | 600 |
| CNAME | `www` | `cname.vercel-dns.com` | 600 |

4. Wait for Vercel to issue the certificate. This is often a few minutes and occasionally a few hours.

`www` should redirect to the apex (Vercel does this when both names are on the project). Confirm the exact records in the Vercel domain panel; Vercel occasionally changes the apex IP, and the panel is the source of truth.

### Netlify instead of Vercel

Netlify can host the same Node server, but it is a worse fit: the daily cron and the long PDF request are clumsier, and you would wrap Express with a function adapter. Use Vercel, or any host that runs `npm start`, unless you have a reason not to. If you do use Netlify:

1. New site from this repo. Build command `npm install`. Publish directory can be empty because the function serves the files.
2. Add the same environment variables. Set `TRUST_PROXY=1`.
3. Add `netlify/functions` only if you later add a wrapper. This repository does not ship a Netlify-specific entry on purpose; `npm start` behind Netlify is not how their static hosting works.
4. Domain → add `easydigitalsignatures.com`. Netlify’s current apex instructions are an A record to `75.2.60.5` and a CNAME from `www` to the site subdomain Netlify assigns. Copy the records Netlify shows, then remove the Vercel records so the two hosts do not fight.

## 8. Switch Stripe from test to live

When you are ready to charge real cards, repeat section 4 in **live mode** (new prices, new webhook, `sk_live_...`). Apple Pay in live mode may ask you to register `easydigitalsignatures.com` under Settings → Payment methods → Apple Pay → Add domain. Stripe gives you a file to host at `/.well-known/apple-developer-merchantid-domain-association`. Hosted Checkout often works without it; follow the Stripe prompt if wallets do not appear.

## 9. What you do not put in Git

`.env` is gitignored. Keys live only in the host’s environment settings and in your local `.env` for development.
