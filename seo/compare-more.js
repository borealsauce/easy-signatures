import { APP_LD, checklist } from './layout.js'
import { PRICING_BLOCK, HOW_IT_WORKS, FEATURES } from './shared-blocks.js'

// Third batch (2026-11-16): SignNow, Smallpdf / iLovePDF, FormSwift, best-free guide, bulk send, templates.
// Every competitor fact below was read on the vendor's own public page on CHECKED_3 (pricing pages rendered in a US
// English browser). Prices that didn't load or differed between loads were left out on purpose. Re-check before editing.
const CHECKED_3 = 'November 16, 2026'
const card = inner => `<section class="card"><div class="prose">${inner}</div></section>`
const wide = inner => `<section class="card">${inner}</section>`
const ext = (href, text) => `<a href="${href}" rel="nofollow noopener" target="_blank">${text}</a>`
const table = (head, rows, us = 0) => `<div class="tbl-wrap"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr${i < us ? ' class="us"' : ''}>${r.map((c, j) => `<td>${i < us && j === 0 ? `<b>${c}</b>` : c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
const src = links => `<p class="src">Read on each company’s public page on ${CHECKED_3}: ${links.map(([h, t]) => ext(h, t)).join(', ')}. Prices and limits change often, so check the vendor’s page before you decide. Trademarks belong to their owners; we’re not affiliated with them.</p>`

const S = {
  signnow: ['https://www.signnow.com/pricing', 'SignNow pricing'],
  signcom: ['https://sign.com/pricing', 'Sign.com pricing'],
  smallpdf: ['https://smallpdf.com/pricing', 'Smallpdf pricing'],
  ilovepdf: ['https://www.ilovepdf.com/pricing', 'iLovePDF pricing'],
  formswift: ['https://formswift.com/lp/goodbye/', 'FormSwift closing notice'],
  signwell: ['https://www.signwell.com/pricing/', 'SignWell pricing'],
  docuseal: ['https://www.docuseal.com/pricing', 'DocuSeal pricing'],
  zoho: ['https://www.zoho.com/sign/pricing.html', 'Zoho Sign pricing'],
  pandadoc: ['https://www.pandadoc.com/pricing/', 'PandaDoc pricing'],
  dropbox: ['https://sign.dropbox.com/products/dropbox-sign/pricing', 'Dropbox Sign pricing'],
  docusign: ['https://ecom.docusign.com/plans-and-pricing/esignature', 'DocuSign pricing'],
  docusignTrial: ['https://www.docusign.com/products/electronic-signature/free-trial', 'DocuSign free trial'],
  adobe: ['https://www.adobe.com/acrobat/online/sign-pdf.html', 'Adobe Acrobat online Sign PDF']
}

const US_ROW = ['Easy Digital Signatures', 'First document free, then $1 each, 10 for $5, or 50 for $10', 'No subscription and no monthly cap. Signing your own PDF with our <a href="/sign-pdf-online">free PDF signer</a> is free and unlimited.']
const TOOL_LINK = `<a href="/sign-pdf-online">free PDF signer</a>`
const SIGNER_FAQ = ['Do my signers need an account?', 'No. Each signer gets a secure link by email and signs in any browser on a phone, tablet, or computer.']
const card3 = (h, items) => card(`<h2>${h}</h2>${checklist(items)}`)

export const COMPARE_PAGES = [
  {
    path: '/signnow-alternative',
    title: 'Free SignNow Alternative: Pay Per Document, No Annual Plan',
    description: 'Looking for a free SignNow alternative? SignNow has a 7-day trial and paid plans. Easy Digital Signatures is free for your first document, then $1 or less.',
    eyebrow: 'SignNow alternative', crumb: 'SignNow alternative',
    h1: 'A free SignNow alternative for occasional senders',
    lede: 'SignNow is built around yearly plans with an invite allowance. If you send a handful of documents, paying per document is simpler and usually cheaper.',
    jsonld: [APP_LD],
    body: [
      card3('SignNow at a glance', [
        'No free sending plan: SignNow offers a 7-day free trial, then a paid plan.',
        'Business is listed at $8/month billed annually; the page’s monthly-billing price for the same plan is $20/month.',
        'Annual plans include up to 100 signature invites per account per year; monthly plans include up to 10 a month. Extra invites are billed pay-as-you-go.',
        'Bulk send and reusable signing links start on Business Premium; SMS delivery and custom branding are on Enterprise.',
        'A Site License plan starts at $1.50 per signature invite, with volume discounts.'
      ]) + `<p class="src">Source: ${ext(...S.signnow)}, read ${CHECKED_3}.</p>`,
      wide(`<h2>What a year of light use costs</h2><p>Annual cost at small volumes, using only listed prices. SignNow’s figure is its Business plan on annual billing ($8 × 12).</p>${table(['Documents per year', 'SignNow Business (annual)', 'Easy Digital Signatures'], [
        ['1', '$96', 'Free (your first document)'],
        ['11', '$96', '$5 (first free + a 10-pack)'],
        ['51', '$96', '$10 (first free + a 50-pack)'],
        ['100', '$96 (within the 100-invite allowance)', '$20 (two 50-packs) or less with your free first document']
      ])}<p class="src">If you send more than 100 invites a year, SignNow bills the extra invites pay-as-you-go; check its page for the current rate. Our credits don’t expire on a monthly cycle; see our <a href="/terms">terms</a> for promotional credits.</p>`),
      card(`<h2>When SignNow is the better fit</h2>${checklist(['You need SMS delivery, advanced signer authentication by phone, or payment collection inside the document.', 'You want formula or conditional fields and approval workflows.', 'You have a large team and want unlimited users on one plan.', 'You need its compliance programs (it lists SOC 2 Type II, HIPAA, and 21 CFR Part 11 on its pricing page).'])}<h3>When Easy Digital Signatures fits better</h3>${checklist(['You send a few documents a month, or in bursts, and don’t want a yearly commitment.', 'You want bulk send and public signing links without moving up a plan tier: they’re included, and each copy uses one credit.', 'You just need to sign something yourself: our ' + TOOL_LINK + ' is free, needs no account, and never uploads your file.'])}`),
      card(`<h2>What you get with us</h2>${FEATURES}<h3>How it works</h3>${HOW_IT_WORKS}`),
      card(`<h2>Our pricing</h2>${PRICING_BLOCK}<p>Compare more: <a href="/best-free-e-signature-software">best free e-signature software</a>, <a href="/docusign-alternative">DocuSign alternative</a>, <a href="/dropbox-sign-alternative">Dropbox Sign alternative</a>.</p>`)
    ].join('\n'),
    faqs: [
      ['Is SignNow free?', 'SignNow offers a 7-day free trial. After that you need a paid plan; Business was listed at $8/month billed annually when we checked on November 16, 2026. Check SignNow’s pricing page for current terms.'],
      ['How many documents can I send on SignNow?', 'Its pricing FAQ says annual Business, Business Premium, and Enterprise plans include up to 100 signature invites per account per year, and monthly plans up to 10 per month, with extra invites billed pay-as-you-go.'],
      ['What’s the cheapest way to send a few documents for signature?', 'If you send only occasionally, pay per document avoids a yearly plan. With Easy Digital Signatures the first document is free, then $1 each, 10 for $5, or 50 for $10.'],
      ['Can I switch from SignNow without losing my documents?', 'Download your signed PDFs and audit trails from SignNow before you cancel. To keep reusing a form, upload the blank PDF to Easy Digital Signatures and save it as a template.'],
      SIGNER_FAQ
    ]
  },
  {
    path: '/smallpdf-sign-alternative',
    title: 'Smallpdf Sign & iLovePDF Sign Alternative: Free PDF Signing',
    description: 'Compare Smallpdf’s Sign.com and iLovePDF’s iLoveSign free limits with a private, free PDF signer and $1 pay-per-document signature requests.',
    eyebrow: 'Smallpdf and iLovePDF alternative', crumb: 'Smallpdf / iLovePDF Sign alternative',
    h1: 'An alternative to Smallpdf Sign and iLovePDF Sign',
    lede: 'PDF suites bundle signing with dozens of other tools behind one subscription. If signing is all you need, you can sign for free and pay only when you ask others to sign.',
    jsonld: [APP_LD],
    body: [
      wide(`<h2>Free limits, side by side</h2>${table(['Service', 'Signing it yourself', 'Asking others to sign', 'Paid plan'], [
        ['Easy Digital Signatures', 'Free and unlimited with our ' + TOOL_LINK + '; the PDF never leaves your browser', 'First document free, then $1 each, 10 for $5, or 50 for $10', 'No subscription'],
        ['Smallpdf (Sign.com)', 'Smallpdf’s free plan includes Sign with a daily download limit', 'Sign.com’s free account is limited to 2 documents a month', 'Sign.com Premium listed at USD 7/month billed yearly; Smallpdf Pro includes unlimited Sign.com Premium'],
        ['iLovePDF (iLoveSign)', 'Free plan: unlimited self-signed (simple) signatures', 'Free plan: signature requests are limited', 'Premium listed at $5/month billed annually ($60/year) or $9 billed monthly, with unlimited requests']
      ], 1)}${src([S.smallpdf, S.signcom, S.ilovepdf])}`),
      card(`<h2>Why look for an alternative?</h2>
<h3>You only need to sign</h3><p>Smallpdf and iLovePDF are full PDF toolkits (compress, convert, merge, OCR, AI tools). That’s great if you use them every week. If you just need a signature on a PDF now and then, a subscription is more than you need. Our ${TOOL_LINK} lets you draw, type, or upload a signature, add text, dates, and check marks, and download, with no account and no watermark.</p>
<h3>Privacy</h3><p>Our free signer opens, signs, and saves the PDF on your own device. The file is never uploaded to our servers. That matters for tax forms, leases, and medical or HR paperwork.</p>
<h3>Asking other people to sign</h3><p>When someone else needs to sign, a 2-documents-a-month cap runs out quickly. With Easy Digital Signatures you buy credits only when you send, and each document includes an audit certificate with timestamps, IP addresses, and SHA-256 fingerprints.</p>`),
      card(`<h2>When Smallpdf or iLovePDF is the better fit</h2>${checklist(['You also compress, convert, merge, or OCR PDFs every week and want one subscription for all of it.', 'You need a desktop or mobile PDF app, not just a browser tool.', 'You need advanced electronic signatures (AES): iLovePDF lists 5 on Premium.'])}`),
      card(`<h2>How sending for signature works with us</h2>${HOW_IT_WORKS}`),
      card(`<h2>Pricing</h2>${PRICING_BLOCK}<p>More comparisons: <a href="/best-free-e-signature-software">best free e-signature software</a> and <a href="/free-docusign-alternative">free DocuSign alternatives</a>.</p>`)
    ].join('\n'),
    faqs: [
      ['Is Smallpdf’s e-sign free?', 'Smallpdf’s free plan includes signing with a daily download limit, and its pricing page says the Sign.com free account is limited to 2 documents a month (checked November 16, 2026).'],
      ['Is iLovePDF Sign free?', 'iLovePDF’s pricing page lists unlimited self-signed signatures on the free plan and limited signature requests; Premium removes the request limit.'],
      ['Can I sign a PDF without uploading it?', 'Yes. Our <a href="/sign-pdf-online">free PDF signer</a> runs entirely in your browser, so your file is never uploaded.'],
      ['Which is cheapest for sending 10 documents for signature?', 'With Easy Digital Signatures your first document is free and a 10-pack is $5, with no subscription. Subscription tools charge every month or year whether you send or not.'],
      SIGNER_FAQ
    ]
  },
  {
    path: '/formswift-alternative',
    title: 'FormSwift Alternative: FormSwift Closed in September 2026',
    description: 'FormSwift has closed. Here’s how to keep filling and signing forms: a free in-browser PDF filler and signer, and $1 e-signature requests when others must sign.',
    eyebrow: 'FormSwift alternative', crumb: 'FormSwift alternative',
    h1: 'FormSwift has closed. Here’s what to use instead',
    lede: 'FormSwift’s site now shows a notice that it “has closed its doors as of September 2026.” If you used it to fill and sign PDFs, you can keep doing that for free.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>What happened to FormSwift?</h2><p>FormSwift’s homepage and sign-in page now redirect to a closing notice. The notice says <i>“FormSwift has closed its doors as of September 2026”</i>, directs billing and refund questions to FormSwift support, and suggests Dropbox for creating, storing, and signing documents. The notice’s footer is credited to Dropbox, Inc. Before it closed, FormSwift’s sign-in page told users it would close on September 30, 2026 and to download their documents before then.</p><p class="src">Source: ${ext(...S.formswift)} (formswift.com redirected there when we checked on ${CHECKED_3}).</p>`),
      card(`<h2>What FormSwift did, and what replaces each part</h2>${checklist([
        '<b>Filling in PDF forms</b>: use our ' + TOOL_LINK + '. Type into blanks, add dates and check marks, sign, and download. It’s free, needs no account, and the file never leaves your browser.',
        '<b>Signing a document yourself</b>: same free tool. Draw, type, or upload your signature.',
        '<b>Getting someone else’s signature</b>: <a href="/send-document-for-signature">send it for signature</a> with Easy Digital Signatures. First document free, then $1 or less.',
        '<b>Sending the same form to many people</b>: save it as a <a href="/e-signature-templates">template</a> and use <a href="/bulk-send-documents-for-signature">bulk send</a>.',
        '<b>Ready-made legal templates</b>: we don’t offer a forms library. Get blank government forms from the agency that issues them (for example, IRS.gov for W-9 and 1099 forms), and use a lawyer or a template provider for contracts.'
      ])}`),
      card(`<h2>If you still need your FormSwift documents</h2><p>FormSwift’s closing notice doesn’t describe a way to export documents now. Look for copies you downloaded before the shutdown (check your Downloads folder and email attachments). For billing or refund questions, the notice gives FormSwift’s support address. If a document is lost, you can recreate it from a blank PDF and sign it with our ${TOOL_LINK}.</p>`),
      card(`<h2>How sending for signature works</h2>${HOW_IT_WORKS}<h3>Pricing</h3>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [
      ['Is FormSwift shut down?', 'Yes. FormSwift’s site redirects to a notice saying it “has closed its doors as of September 2026.” Its earlier banner gave September 30, 2026 as the closing date.'],
      ['Can I still download my FormSwift documents?', 'The closing notice doesn’t offer an export. Check your downloads and email for copies, and contact FormSwift support at the address on the notice about billing or refunds.'],
      ['What’s a free FormSwift alternative for filling and signing PDFs?', 'Our <a href="/sign-pdf-online">free PDF signer</a> fills and signs PDFs in your browser with no account, and your file is never uploaded.'],
      ['Does Easy Digital Signatures have legal form templates?', 'No. We don’t sell or provide legal templates. You bring your own PDF or Word file, and you can save it as your own reusable template.'],
      SIGNER_FAQ
    ]
  },
  {
    path: '/best-free-e-signature-software',
    title: 'Best Free E-Signature Software (2026): Free Plans Compared',
    description: 'The best free e-signature software in 2026, compared honestly: free plan limits for Sign.com, SignWell, PandaDoc, Zoho Sign, DocuSeal, iLovePDF, and more.',
    eyebrow: 'Buyer’s guide 2026', crumb: 'Best free e-signature software',
    h1: 'Best free e-signature software (2026)',
    lede: 'Every free plan has a catch, usually a small monthly cap. Here are the real limits, read from each vendor’s pricing page, and which one fits which kind of sender.',
    ogType: 'article',
    jsonld: [APP_LD, {
      '@context': 'https://schema.org', '@type': 'Article', headline: 'Best free e-signature software (2026)',
      datePublished: '2026-11-16', dateModified: '2026-11-16', author: { '@type': 'Organization', name: 'Easy Digital Signatures' },
      publisher: { '@id': 'https://easydigitalsignatures.com/#organization' }, mainEntityOfPage: 'https://easydigitalsignatures.com/best-free-e-signature-software'
    }],
    body: [
      card(`<h2>Quick picks</h2>${checklist([
        '<b>Just signing your own PDF:</b> a free in-browser signer such as our ' + TOOL_LINK + ' (no account, nothing uploaded), or Adobe Acrobat’s free online Sign PDF tool.',
        '<b>A few requests every month:</b> a capped free plan, such as PandaDoc or Zoho Sign (5 a month) or DocuSeal (10 request emails a month).',
        '<b>Uneven volume, no subscription:</b> pay per document with Easy Digital Signatures: first free, then $1, or as low as 20¢ in a 50-pack.',
        '<b>Technical teams with zero license cost:</b> self-host an open-source signer such as DocuSeal.',
        '<b>Large teams with integrations and compliance needs:</b> a paid plan from DocuSign, Dropbox Sign, or SignNow.'
      ])}<p class="src">We make Easy Digital Signatures, so we’re listed here too. We’ve tried to describe every option, ours included, using only what each company publishes.</p>`),
      wide(`<h2>Free e-signature plans compared</h2>${table(['Service', 'Free option', 'Free limit (as listed)', 'Paid plans start at'], [
        US_ROW.slice(0, 1).concat(['First document free; free unlimited self-signing tool', 'No monthly cap; you buy credits only when you send', '$1 per document (no subscription)']),
        ['Sign.com (Smallpdf)', 'Free plan', '2 documents a month', 'USD 7/month billed yearly'],
        ['SignWell', 'Free plan', '3 documents a month, 1 sender, 1 template', '$10/month billed yearly'],
        ['PandaDoc', 'Free plan', '5 documents a month', '$19/month billed annually'],
        ['Zoho Sign', 'Free plan', 'Single user, 5 envelopes a month', 'US$10/user/month billed annually'],
        ['DocuSeal (cloud)', 'Basic plan', '10 request emails a month', '$20/user/month'],
        ['iLovePDF (iLoveSign)', 'Free plan', 'Unlimited self-signing; limited signature requests', '$5/month billed annually'],
        ['Adobe Acrobat online', 'Free Sign PDF tool', 'Fill and sign yourself; sign in to download', 'Paid Acrobat plans'],
        ['DocuSign eSignature', 'Free trial only', 'Personal plan: 5 envelopes a month', '$11/month on an annual plan'],
        ['Dropbox Sign', 'Free plan for signing yourself; 30-day trial of paid plans', 'Free-plan limits aren’t listed on the pricing page', '$15/month billed monthly'],
        ['SignNow', '7-day free trial', 'Annual plans: 100 invites a year', '$8/month billed annually']
      ], 1)}${src([S.signcom, S.signwell, S.pandadoc, S.zoho, S.docuseal, S.ilovepdf, S.adobe, S.docusign, S.docusignTrial, S.dropbox, S.signnow])}`),
      card(`<h2>How we compared them</h2><p>We read each vendor’s public pricing page on ${CHECKED_3} and listed only what it states: the free plan’s cap, who can send, and the lowest listed paid price. We didn’t include promotions, sales-negotiated plans, or features we couldn’t confirm on the page.</p>
<h3>What to check before you pick</h3>${checklist(['<b>The cap and how it resets.</b> “5 a month” means a busy month forces an upgrade.', '<b>Senders and templates.</b> Many free plans allow one sender and one template.', '<b>Audit trail.</b> For agreements with other people, you want a record of who signed and when.', '<b>Where your file goes.</b> Most online tools upload your PDF. Ours signs it on your device when you’re the only signer.', '<b>What happens if the service closes.</b> <a href="/formswift-alternative">FormSwift closed in September 2026</a>; always download your signed copies.'])}`),
      card(`<h2>Easy Digital Signatures, honestly</h2><p><b>Good for:</b> people and small businesses who send a few documents a month, or in bursts, and don’t want a subscription. Signers don’t need an account, and every document gets a flattened PDF with an audit certificate. Templates, <a href="/bulk-send-documents-for-signature">bulk send</a>, and public signing links are included.</p><p><b>Not the best fit if:</b> you need CRM integrations, SSO, SMS delivery, or formal compliance certifications. A larger provider’s paid plan will suit you better.</p>${PRICING_BLOCK}`),
      card(`<h2>Related guides</h2><p><a href="/free-docusign-alternative">Free DocuSign alternatives</a> · <a href="/signnow-alternative">SignNow alternative</a> · <a href="/smallpdf-sign-alternative">Smallpdf and iLovePDF alternative</a> · <a href="/blog/are-electronic-signatures-legal">Are e-signatures legal?</a> · <a href="/blog/e-signature-cost-comparison">E-signature cost comparison</a></p>`)
    ].join('\n'),
    faqs: [
      ['What is the best free e-signature software?', 'It depends on what you need. To sign your own PDF, a free in-browser signer is enough. For a few requests a month, a capped free plan (PandaDoc, Zoho Sign, DocuSeal) works. For uneven volume without a subscription, pay per document with Easy Digital Signatures.'],
      ['Is there a completely free e-signature tool with no limits?', 'For signing your own documents, yes: our <a href="/sign-pdf-online">free PDF signer</a> has no limit and needs no account. For sending to others, free cloud plans have monthly caps; self-hosted open-source tools have no cap but you run the server.'],
      ['Does DocuSign have a free plan?', 'DocuSign offers a free trial. Its lowest listed plan, Personal, was $11/month on an annual plan with 5 envelopes a month when we checked on November 16, 2026.'],
      ['Are free e-signatures legally binding?', 'Price doesn’t change the legal effect. In the US, the ESIGN Act and state UETA laws generally treat e-signatures like handwritten ones, with exceptions such as wills. See <a href="/blog/are-electronic-signatures-legal">our guide</a>. This isn’t legal advice.'],
      ['Which free plan allows the most documents?', 'Among the free cloud plans we checked, DocuSeal’s Basic plan listed the most (10 request emails a month). Easy Digital Signatures has no monthly cap, but after your first free document you pay $1 or less per document.']
    ]
  },
  {
    path: '/bulk-send-documents-for-signature',
    title: 'Bulk Send Documents for Signature: One Template, Many Signers',
    description: 'Bulk send a document for e-signature: paste a list or upload a CSV of names and emails, and each person gets their own copy to sign. 1 credit per copy, from 20¢.',
    eyebrow: 'Bulk send', crumb: 'Bulk send for signature',
    h1: 'Bulk send a document for signature',
    lede: 'Send the same form to a whole list at once. Each person gets their own private copy and signing link, and you track every one from your dashboard.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>How bulk send works</h2><ol class="steps">
<li><b>Make a template</b> with one signer role and the fields they fill in (signature, initials, date, name, text).</li>
<li><b>Add your list.</b> Paste names and emails, one per line, or a CSV with Name and Email columns. Commas, semicolons, and tabs all work, and we flag duplicates and bad emails before sending.</li>
<li><b>Check the cost.</b> Each copy uses 1 credit, and we show how many you have before you send.</li>
<li><b>Send.</b> Up to 100 people per batch. Each gets their own email and link, and each copy gets its own signed PDF and audit certificate.</li>
</ol>`),
      card3('Good uses for bulk send', ['Policy acknowledgements and handbook sign-offs for every employee', 'Permission slips, waivers, and releases for a class, team, or event', 'Annual contractor agreements or W-9 collection', 'Tenant notices and lease addenda across a building']),
      card(`<h2>What it costs</h2><p>Bulk send is included; there’s no plan to upgrade. Each copy you send uses one document credit: 50 copies cost $10 with a 50-pack (20¢ each). On many subscription tools, bulk send is reserved for a higher plan tier; for example, SignNow lists it on Business Premium and SignWell doesn’t include it on its free plan.</p>${PRICING_BLOCK}<p class="src">Competitor details read on ${ext(...S.signnow)} and ${ext(...S.signwell)} on ${CHECKED_3}.</p>`),
      card(`<h2>Prefer a link instead of a list?</h2><p>Turn a one-signer template into a public signing link and share it anywhere, such as on your website or in a group email. Each person who opens it enters their name and email and signs their own copy. You can switch the link off at any time. See <a href="/e-signature-templates">templates and signing links</a>.</p><p>Only need to sign one PDF yourself? Use the ${TOOL_LINK}.</p>`)
    ].join('\n'),
    faqs: [
      ['How many people can I bulk send to?', 'Up to 100 recipients per batch. Send another batch for more.'],
      ['How much does bulk send cost?', 'Each copy uses one document credit: $1 each, 10 for $5, or 50 for $10. Bulk send itself has no extra fee.'],
      ['What format should my CSV be?', 'A header row with Name and Email columns works best. You can also paste “Name, email” lines. Commas, semicolons, and tabs are detected automatically.'],
      ['Can a bulk-sent document have more than one signer?', 'Bulk send uses a template with one signer role, so each recipient signs their own copy. For documents with several signers, send them individually.'],
      SIGNER_FAQ
    ]
  },
  {
    path: '/e-signature-templates',
    title: 'E-Signature Templates and Reusable Signing Links',
    description: 'Save any PDF as a reusable e-signature template with fields, signer roles, signing order, and reminders. Share a public signing link or bulk send it.',
    eyebrow: 'Templates', crumb: 'E-signature templates',
    h1: 'Reusable e-signature templates',
    lede: 'Set up a form once, with every field in place, and send it again in seconds. Turn it into a public signing link or bulk send it to a list.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>What a template saves</h2>${checklist(['Your PDF (or a Word file converted to PDF) and every field you placed', 'Signer roles, such as Client and Contractor, with their own fields', 'Signing order, reminder schedule, expiration, and your message to signers'])}<p>Create a template from scratch, or save any document you’ve prepared as a template. To use it, pick the template, type in each signer’s name and email, and send. Templates are your own documents; we don’t sell prebuilt legal forms.</p>`),
      card(`<h2>Three ways to use a template</h2>
<h3>1. Send it to specific people</h3><p>Start a new document from the template and fill in the signers. Everything else is already set up.</p>
<h3>2. Share a public signing link</h3><p>For a template with one signer, create a link anyone can open. Each person enters their name and email and signs their own copy. You see how many responses the link has and can turn it off any time. Each response uses one of your document credits.</p>
<h3>3. Bulk send to a list</h3><p>Paste or upload up to 100 names and emails and everyone gets their own copy. See <a href="/bulk-send-documents-for-signature">bulk send</a>.</p>`),
      card(`<h2>Templates for teams</h2><p>Teams can share templates so everyone sends the same up-to-date form. Developers can list templates through our API.</p>`),
      card(`<h2>Pricing</h2><p>Saving templates is free. You use one credit each time a document is sent from a template.</p>${PRICING_BLOCK}<p>Signing a one-off PDF yourself? Use the ${TOOL_LINK}. Comparing tools? See <a href="/best-free-e-signature-software">best free e-signature software</a>.</p>`)
    ].join('\n'),
    faqs: [
      ['Do templates cost extra?', 'No. Saving templates is free; each document you send from one uses one credit.'],
      ['Can I make a template from a Word document?', 'Yes. Upload the .docx and it’s converted to a PDF, then place your fields and save it as a template.'],
      ['What is a public signing link?', 'A link to a one-signer template that anyone can open to sign their own copy, handy for waivers and intake forms. You can deactivate it at any time.'],
      ['Does Easy Digital Signatures include ready-made contract templates?', 'No. Templates are built from your own documents. We don’t provide legal forms.'],
      SIGNER_FAQ
    ]
  }
]
