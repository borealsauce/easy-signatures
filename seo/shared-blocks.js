import { CHECKED, checklist } from './layout.js'

export const SOURCES = {
  docusign: ['DocuSign eSignature plans and pricing', 'https://ecom.docusign.com/plans-and-pricing/esignature'],
  dropbox: ['Dropbox Sign plans and pricing', 'https://sign.dropbox.com/products/dropbox-sign/pricing'],
  adobe: ['Adobe Acrobat plans and pricing', 'https://www.adobe.com/acrobat/pricing.html'],
  pandadoc: ['PandaDoc pricing', 'https://www.pandadoc.com/pricing/']
}
const link = k => `<a href="${SOURCES[k][1]}" rel="nofollow noopener" target="_blank">${SOURCES[k][0]}</a>`

// Only list prices we read on each vendor's public pricing page on CHECKED. US list prices, before tax.
export const COMPETITORS = {
  docusign: { name: 'DocuSign eSignature', rows: [
    ['Personal', '$11/month (annual plan, billed monthly)', '5 envelopes per month'],
    ['Standard', '$30/user/month (annual plan, billed monthly)', '100 envelopes per user per year'],
    ['Business Pro', '$45/user/month (annual plan, billed monthly)', '100 envelopes per user per year']
  ] },
  dropbox: { name: 'Dropbox Sign', rows: [
    ['Essentials', 'From $15/month on monthly billing (lower with annual billing)', 'Single user'],
    ['Standard', 'From $25/user/month on monthly billing (lower with annual billing)', 'Teams of 2 or more']
  ] },
  adobe: { name: 'Adobe Acrobat (includes Acrobat Sign e-signatures)', rows: [
    ['Acrobat Standard', 'US$14.99/month (annual plan, billed monthly)', 'Fill, sign, and request e-signatures'],
    ['Acrobat Pro', 'US$19.99/month (annual plan, billed monthly)', 'Adds templates, bulk send, web forms, branding']
  ] },
  pandadoc: { name: 'PandaDoc', rows: [
    ['Free', '$0', '5 documents per month'],
    ['Starter', '$19/seat/month (billed annually)', 'Unlimited document uploads and e-signatures'],
    ['Business', '$49/seat/month (billed annually)', 'Proposal and workflow features']
  ] }
}

export function competitorTable(keys, { withUs = true } = {}) {
  const us = withUs ? `<tr class="us"><td><b>Easy Digital Signatures</b></td><td>First document free</td><td>$1 per document, 10 for $5, or 50 for $10. No subscription.</td></tr>` : ''
  const rows = keys.flatMap(k => COMPETITORS[k].rows.map(([plan, price, note]) => `<tr><td>${COMPETITORS[k].name} – ${plan}</td><td>${price}</td><td>${note}</td></tr>`)).join('')
  return `<div class="tbl-wrap"><table><thead><tr><th>Service and plan</th><th>Listed price</th><th>What the price covers</th></tr></thead><tbody>${us}${rows}</tbody></table></div>
<p class="src">Competitor prices are US list prices shown on each vendor’s public pricing page on ${CHECKED}: ${keys.map(link).join(', ')}. Prices, taxes, and plan limits change; check the vendor’s page before you decide. Trademarks belong to their owners; we’re not affiliated with them.</p>`
}

export const PRICING_BLOCK = `<div class="price-row">
<div class="price"><b>Free</b><span>Your first document</span></div>
<div class="price"><b>$1</b><span>1 document</span></div>
<div class="price"><b>$5</b><span>10 documents · 50¢ each</span></div>
<div class="price best"><b>$10</b><span>50 documents · 20¢ each</span></div>
</div><p class="src">One credit covers one document you send, however many signers it has. Buy a pack once and use the credits whenever you send. Pay with card, Apple Pay, or Google Pay through Stripe Checkout.</p>`

export const HOW_IT_WORKS = `<ol class="steps">
<li><b>Upload a PDF</b> or start from a blank page or a saved template.</li>
<li><b>Place fields</b> for each signer: signature, initials, date, name, and text.</li>
<li><b>Send a secure link by email.</b> Signers open it in any browser on phone or computer. No account or app needed.</li>
<li><b>Get the finished file.</b> Everyone gets a flattened PDF plus a certificate page with timestamps, IP addresses, and SHA-256 fingerprints you can check on our verify page.</li>
</ol>`

export const FEATURES = checklist([
  'Signature, initials, date, name, and text fields you drag onto any PDF',
  'Signers don’t need an account, and signing works in a mobile browser',
  'Signing order (one after another) or everyone at once',
  'Automatic email reminders and an expiration date for each request',
  'Reusable <a href="/e-signature-templates">templates</a> and <a href="/bulk-send-documents-for-signature">bulk send</a> for the same document to many people',
  'In-person signing on your device, and signers can decline with a reason',
  'Audit certificate with timestamps, IP addresses, and SHA-256 document fingerprints',
  'Pay per document: first one free, then $1, 10 for $5, or 50 for $10'
])

export const LEGAL_NOTE = `<p class="src">This page is general information, not legal advice. Laws differ by state and by document type; ask a lawyer about your situation.</p>`
