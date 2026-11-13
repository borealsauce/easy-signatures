# Easy Digital Signatures

A paid e-signature product. Senders create an account, place fields on a PDF, and email each signer a unique link. Signers finish in the browser without an account. The completed file is a flattened PDF with an audit certificate and a SHA-256 fingerprint.

The homepage is the navy-and-teal page at `/`. Older layout experiments remain at `/layouts`.

## Stack

**Supabase** for accounts, Postgres, and private file storage. **Node (Express)** for everything that must not trust the browser: abuse checks, Stripe, the audit trail, and the sealed PDF. **Vercel** is the recommended host. GitHub Pages cannot run webhooks, hide secret keys, or accept payment, and its terms are a poor fit for a paid product.

With no environment variables, `npm start` runs a local database and prints email and SMS codes in the terminal. `NODE_ENV=production` refuses to boot until the real keys in [DEPLOY.md](DEPLOY.md) are set.

## Scripts

```bash
npm install
npm start          # http://localhost:3000
npm test           # signup, free send, signing, payment, abuse checks
```

Local mail and text messages are also at `http://localhost:3000/api/dev/mailbox` (disabled in production). A fake card checkout is at `/dev/checkout`.

## Product rules

- 1 free document per account, only after the email is confirmed **and** a mobile number is verified.
- One phone number can unlock one free document, ever.
- The same device (cookie + local storage), a Gmail alias of an address that already used the free document, or a shared IP that has already claimed 3 free documents in 30 days does not get another free document.
- A card fingerprint already used on another account blocks the free document once Stripe has seen the card. It cannot be known before the first payment.
- None of those checks block a paid send.
- After the free document, each send spends one credit: **$1** for 1, **$5** for 10, or **$10** for 50. There is no subscription.
- Stripe webhooks are the source of truth. The browser cannot grant itself a credit.

See [DEPLOY.md](DEPLOY.md) for the accounts to create and [MANUAL_TEST.md](MANUAL_TEST.md) for a click-through. [LAYOUTS.md](LAYOUTS.md) explains the front-page previews.
