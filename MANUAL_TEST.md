# Manual test

`npm test` already runs the full server path: signup, email confirmation, SMS code, one free document, signer consent, sealed PDF with certificate and hashes, a second document that requires checkout, and the phone, device, Gmail-alias, VoIP, IP-threshold, and card-fingerprint blocks. This page is the same path in a browser, using the local drivers (no Supabase, Twilio, or Stripe account).

## Setup

```bash
npm install
npm start
```

Open http://localhost:3000. Leave the terminal visible. Every email and SMS code is printed there, and also listed at http://localhost:3000/api/dev/mailbox.

## Free document

1. **Sign up** with a name, a normal email (not mailinator or yopmail), and a password of at least 8 characters.
2. Copy the confirmation URL from the terminal and open it. You should land on the login page.
3. Log in. Open **Verify your phone**. The note under the field must say the number is only used to verify the account and will not be used for marketing.
4. Enter a number such as `415 555 0101`. Read the 6-digit code from the terminal and submit it.
5. **New document → Create a template → Blank page**, or upload a small PDF or photo. Place a signature field (click the field type, then the page; Shift+click places another; Esc cancels). Type the signer’s full name. If you include a middle name, the initials preview is three letters.
6. Enter the signer’s email and click **Send**. The usage meter should show the free document was used. The terminal prints the signer’s link.
7. Open that link in a private window. Check the consent box (it names ESIGN and UETA). Adopt the generated signature and finish.
8. Download the sealed PDF. The last page is **Certificate of Completion**, with the signer’s IP, the consent time, and two SHA-256 values. Open the public fingerprint link from the certificate page and confirm the complete-file hash matches.

## Second document needs payment

1. Back in the sender account, create and send a second document.
2. The app must refuse and offer **$1 for this document**, **10 for $10**, **25 for $25**, and **$10/month**.
3. Choose $1. The local checkout page is labeled test mode and does not charge a card. Complete it.
4. The document status becomes **sent**, and the signer email appears in the terminal. Sending again does not charge a second time.

## Abuse checks block only the free document

Use a second browser profile, or clear site data, so the device id changes when you want it to.

| What you repeat | Expected result |
|---|---|
| Same phone number on a new account | Phone verification succeeds. Send says the number was already used. **Pay $1** still opens checkout. |
| Same browser (do not clear cookies or local storage), new email and phone | Send says this browser was already used. Checkout still works. |
| `name@gmail.com` and later `name+tag@gmail.com` | The second account does not get a free document. |
| A phone number ending in `0000` (local stand-in for a virtual line) | The account verifies. The free document stays locked. Checkout works. |
| Four accounts on one IP (the dev server trusts `X-Forwarded-For` only when `TRUST_PROXY=1`; from a normal browser they share 127.0.0.1) | The fourth free document is refused. A pack purchase still sends. |
| Signup from a `mailinator.com` address | Signup is rejected. |
| Six signups in an hour from one IP | The sixth is rate-limited. |

A payment card can only be recognized after Stripe has seen it. In local mode the test suite passes an explicit card fingerprint. With real Stripe test keys, pay once on account A and once on account B with the same `4242` card **before** B sends the free document. B’s free document is then refused; the paid credits still send.

## With real test keys

Copy `.env.example` to `.env`, fill in Supabase, Resend, Twilio, and Stripe **test** keys, and set `APP_URL` to the URL you opened. Restart `npm start`. Repeat the free-document steps. The confirmation email, the SMS, and the Checkout page are now the real services. Use card `4242 4242 4242 4242`. Wallet buttons appear only on a device that has Apple Pay or Google Pay set up.
