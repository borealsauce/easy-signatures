import { APP_LD, checklist } from './layout.js'
import { PRICING_BLOCK, HOW_IT_WORKS, FEATURES, LEGAL_NOTE } from './shared-blocks.js'

// Second batch of search landing pages (2026-11-15), chosen from keyword research on "free e-signature" searches.
// Competitor facts below were read on each vendor's own public pricing page on FREE_CHECKED. Re-check before editing.
const FREE_CHECKED = 'November 15, 2026'
const card = inner => `<section class="card"><div class="prose">${inner}</div></section>`
const wide = inner => `<section class="card">${inner}</section>`
const ext = (href, text) => `<a href="${href}" rel="nofollow noopener" target="_blank">${text}</a>`

const FILE_TYPES = 'PDF, Word (.docx), Excel, CSV, text, RTF, ODT, HTML, and photos or scans (JPG, PNG, HEIC and more), up to 25 MB each'
const FREE_FAQ = ['Is it really free?', 'Your first document is free after you verify your email, and no credit card is needed. After that you pay only when you send: $1 for one document, $5 for 10, or $10 for 50. There’s no subscription.']
const SIGNER_FAQ = ['Do the people signing need an account?', 'No. Each signer gets a secure link by email and signs in their browser on a phone, tablet, or computer. Only the sender has an account.']

const FREE_PLANS = [
  ['Easy Digital Signatures', 'First document free, then $1 per document (or 20¢ each in a 50-pack)', 'No monthly limit; you buy credits only when you send', null],
  ['SignWell – Free plan', '$0', '3 documents a month, 1 sender, 1 template', ['https://www.signwell.com/pricing/', 'SignWell pricing']],
  ['DocuSeal – Cloud Basic', '$0', '10 signature-request emails a month; the open-source edition is free if you host it yourself', ['https://www.docuseal.com/pricing', 'DocuSeal pricing']],
  ['Zoho Sign – Free plan', '$0', 'Single user, 5 envelopes a month', ['https://www.zoho.com/sign/pricing.html', 'Zoho Sign pricing']],
  ['PandaDoc – Free plan', '$0', '5 documents a month (read on November 14, 2026)', ['https://www.pandadoc.com/pricing/', 'PandaDoc pricing']],
  ['Dropbox Sign', 'Paid plans from $15/month on monthly billing', 'Its pricing page lists a 30-day free trial of paid plans', ['https://sign.dropbox.com/products/dropbox-sign/pricing', 'Dropbox Sign pricing']],
  ['DocuSign eSignature – Personal', '$11/month (annual plan, read on November 14, 2026)', '5 envelopes a month; DocuSign offers a free trial', ['https://ecom.docusign.com/plans-and-pricing/esignature', 'DocuSign pricing']]
]
const freeTable = () => `<div class="tbl-wrap"><table><thead><tr><th>Service and plan</th><th>Listed price</th><th>What the free or entry plan covers</th></tr></thead><tbody>${FREE_PLANS.map(([n, p, c], i) => `<tr${i === 0 ? ' class="us"' : ''}><td>${i === 0 ? `<b>${n}</b>` : n}</td><td>${p}</td><td>${c}</td></tr>`).join('')}</tbody></table></div>
<p class="src">Read on each vendor’s public pricing page on ${FREE_CHECKED} unless noted: ${FREE_PLANS.filter(r => r[3]).map(r => ext(r[3][0], r[3][1])).join(', ')}. Plans and limits change often; check the vendor’s page before you decide. Trademarks belong to their owners; we’re not affiliated with them.</p>`

export const MORE_PAGES = [
  {
    path: '/free-docusign-alternative',
    title: 'Free DocuSign Alternatives: Free E-Signature Plans Compared (2026)',
    description: 'Looking for a free DocuSign alternative? Compare the free e-signature plans of SignWell, DocuSeal, Zoho Sign, PandaDoc, and pay-per-document Easy Digital Signatures.',
    eyebrow: 'Free DocuSign alternative', crumb: 'Free DocuSign alternatives',
    h1: 'Free DocuSign alternatives, compared honestly',
    lede: 'Most “free” e-signature plans cap you at a few documents a month. Here’s what each free plan actually covers, and when paying 20¢ to $1 per document is the better deal.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>The short answer</h2>${checklist([
        'DocuSign’s eSignature plans are paid; DocuSign offers a free trial rather than a free sending plan.',
        'Several competitors have free plans, usually limited to 3–10 documents a month and a single sender.',
        'If you can run your own server, open-source tools such as DocuSeal can be free without a monthly cap.',
        'If you send an unpredictable number of documents, pay per document avoids both the monthly cap and the monthly bill.'
      ])}`),
      wide(`<h2>Free and entry e-signature plans side by side</h2><p>Only what each company publishes on its own pricing page. We left out promotions and sales-negotiated plans.</p>${freeTable()}`),
      card(`<h2>How to pick</h2>
<h3>You send 1–3 documents a month, every month</h3><p>A free plan with a 3- or 5-document cap may cover you. Watch for per-plan limits on templates and senders, and what happens to old documents if you stop using the service.</p>
<h3>You send in bursts</h3><p>A busy month can blow through a monthly cap, then you’re asked to upgrade to a subscription. With Easy Digital Signatures you buy a pack once (10 for $5 or 50 for $10) and the credits are there when you need them.</p>
<h3>You’re technical and want zero software cost</h3><p>Self-hosting an open-source signer (DocuSeal, OpenSign, Documenso) costs nothing in licenses, but you run the server, email delivery, backups, and updates yourself.</p>
<h3>You need enterprise features</h3><p>CRM integrations, SSO, SMS delivery, ID verification, or compliance programs usually mean a paid plan from a larger provider. See our <a href="/docusign-alternative">DocuSign alternative</a> page for when DocuSign itself is the better fit.</p>`),
      card(`<h2>What you get with Easy Digital Signatures</h2>${FEATURES}<h3>How it works</h3>${HOW_IT_WORKS}`),
      card(`<h2>Our pricing</h2>${PRICING_BLOCK}<p>More detail: <a href="/e-signature-pricing">e-signature pricing</a>, our <a href="/blog/e-signature-cost-comparison">cost comparison</a>, and the <a href="/best-free-e-signature-software">best free e-signature software (2026)</a> guide.</p>`)
    ].join('\n'),
    faqs: [
      ['Does DocuSign have a free plan?', 'DocuSign advertises a free trial of its eSignature plans. Its listed sending plans are paid, starting with Personal at $11/month on an annual plan when we checked on November 14, 2026. Check DocuSign’s site for current terms.'],
      ['What is the best free DocuSign alternative?', 'It depends on volume. For a few documents every month, a free plan with a small cap can work. For uneven volume, pay per document is usually cheaper than upgrading to a subscription. For no license cost at all, a self-hosted open-source tool works if you can run a server.'],
      ['Are free e-signatures legally binding?', 'Price doesn’t change the legal effect. In the US, the ESIGN Act and state UETA laws generally treat e-signatures like handwritten ones, with exceptions such as wills. See our <a href="/blog/are-electronic-signatures-legal">guide to e-signature law</a>. This isn’t legal advice.'],
      SIGNER_FAQ, FREE_FAQ
    ]
  },
  {
    path: '/sign-document-online-free',
    title: 'Sign Documents Online Free: Contracts, PDFs, and Word Files',
    description: 'Sign documents online free. Upload a contract, PDF, Word file, or photo, add signature fields, and email a secure link. Your first document is free, no card needed.',
    eyebrow: 'Sign documents online', crumb: 'Sign documents online free',
    h1: 'Sign documents online, free for your first one',
    lede: 'Upload a contract, agreement, or form, show each person where to sign, and email them a link. They sign on any phone or computer, with no account.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>Sign a PDF yourself in seconds</h2><p>If you’re the only signer, our <a href="/sign-pdf-online">free PDF signer</a> lets you add your signature, text, and dates to a PDF right in your browser and download it. No account, and nothing is uploaded.</p>`),
      card(`<h2>What you can sign</h2>${checklist(['Contracts and service agreements', 'Leases, offers, and addenda', 'NDAs and confidentiality agreements', 'Estimates, invoices, and change orders', 'Offer letters and policy acknowledgments', 'Consent, waiver, and permission forms'])}<p>Upload ${FILE_TYPES}. Word files and photos are turned into a PDF for signing, and several photos can become one document.</p>`),
      card(`<h2>How to sign a document online</h2>${HOW_IT_WORKS}<p>Signing only for yourself? Choose “Skip, just me” when you add people, place your own fields, and sign.</p>`),
      card(`<h2>Sign a contract online with the other party</h2><p>For a contract, everyone should end up with the same final copy. Add each party as a signer, turn on signing order if you want to countersign last, and set reminders so it doesn’t stall. When everyone has signed, each person gets the flattened PDF and an audit certificate showing who signed and when.</p><p>For businesses that sign the same agreement often, save it as a template. See also <a href="/nda">NDAs</a>, <a href="/contractors">contractor agreements</a>, and <a href="/leases">leases</a>.</p>`),
      card(`<h2>What it costs</h2>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [FREE_FAQ, SIGNER_FAQ,
      ['Can I sign a Word document online?', 'Yes. Upload the .docx file and it’s converted to a PDF for signing. Older .doc files need to be saved as .docx or PDF first. See <a href="/sign-word-document-online">signing a Word document online</a>.'],
      ['Is signing a contract online legally binding?', 'In the US, the ESIGN Act and state UETA laws generally give e-signatures the same effect as handwritten ones for most business documents, with listed exceptions. This isn’t legal advice.']]
  },
  {
    path: '/send-document-for-signature',
    title: 'Send a Document for Signature by Email: Free First Send',
    description: 'Send a PDF or Word document for e-signature in minutes. Place fields, email a secure link, track who has signed, and get one signed copy. First document free.',
    eyebrow: 'Request signatures', crumb: 'Send a document for signature',
    h1: 'Send a document for signature in a few minutes',
    lede: 'Upload the file, add each signer’s name and email, drag on the fields they need, and send. You can see who has opened and signed, and remind anyone who hasn’t.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>Step by step</h2><ol class="steps">
<li><b>Create a free account</b> and verify your email. Your first document is free.</li>
<li><b>Upload your document.</b> ${FILE_TYPES}. You can also start from a blank page or a saved template.</li>
<li><b>Add signers.</b> Enter each person’s name and email. Turn on signing order if they should sign one after another.</li>
<li><b>Place fields</b> for each signer: signature, initials, date, name, and text.</li>
<li><b>Send.</b> Each signer gets a secure link by email and signs in the browser, no account or app needed.</li>
<li><b>Track and remind.</b> See who has signed, resend to anyone who hasn’t, and let the link expire on the date you choose.</li>
<li><b>Download the signed PDF</b> with its audit certificate. Everyone gets a copy.</li>
</ol>`),
      card(`<h2>Options that save time</h2>${checklist(['Templates for documents you send again and again', 'Bulk send: one document to many people, each with their own copy', 'In-person signing on your phone or tablet', 'Automatic reminders and an expiration date', 'Signers can decline with a reason, so you know where things stand'])}`),
      card(`<h2>Why not just email the PDF?</h2><p>Emailing a file back and forth means each person prints, signs, scans, and returns it, and you end up with several copies. An e-signature request gives everyone one finished copy and a certificate page recording timestamps, IP addresses, and SHA-256 fingerprints you can check on our verify page.</p>`),
      card(`<h2>Pricing</h2>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [FREE_FAQ, SIGNER_FAQ,
      ['How many signers can one document have?', 'As many as it needs. One credit covers one document, however many people sign it.'],
      ['Can I see when someone has signed?', 'Yes. Your dashboard shows each document’s status, and you get an email when it’s complete.']]
  },
  {
    path: '/pay-per-document-e-signature',
    title: 'Pay-Per-Document E-Signature: No Subscription, From 20¢',
    description: 'E-signatures without a subscription. First document free, then $1 each, 10 for $5, or 50 for $10. No seats, no monthly fee, nothing to cancel.',
    eyebrow: 'No subscription', crumb: 'Pay-per-document e-signature',
    h1: 'E-signatures without the subscription',
    lede: 'Pay only for the documents you send. Your first one is free, then $1 each, or as little as 20¢ in a 50-pack. No monthly fee and no per-user seats.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>Prices</h2>${PRICING_BLOCK}`),
      card(`<h2>Who pay per document is for</h2>${checklist(['Small businesses and solo professionals who send a few documents a month', 'Landlords with a handful of leases and renewals a year', 'Contractors who need estimates and change orders signed in bursts', 'Anyone who has paid for a subscription they barely used'])}<p>Most e-signature services are subscriptions, often priced per user with a document allowance. That suits teams that send every day. If your volume is low or uneven, a pack of credits can cost a fraction of a year’s subscription. See the worked examples in our <a href="/blog/e-signature-cost-comparison">e-signature cost comparison</a>.</p>`),
      card(`<h2>What a credit includes</h2>${checklist(['One document sent for signature, with as many signers as it needs', 'Email signing links, reminders, and an expiration date', 'The flattened signed PDF and its audit certificate', 'Copies for every signer when it’s complete'])}`),
      card(`<h2>Everything else is included</h2>${FEATURES}`)
    ].join('\n'),
    faqs: [FREE_FAQ,
      ['Is there a monthly allowance that resets?', 'No. Credits you buy aren’t a monthly allowance; you use them when you send. Promotional credits can be limited or expire; see our <a href="/terms">terms</a>.'],
      ['Is there a per-user fee?', 'No. There are no seats; you pay per document sent.'],
      ['How do I pay?', 'Card, Apple Pay, or Google Pay through Stripe Checkout.']]
  },
  {
    path: '/fill-and-sign-pdf',
    title: 'Fill and Sign PDF Online: Add Text, Dates, and Signatures',
    description: 'Fill and sign PDF forms online. Add text, dates, names, initials, and signatures to any PDF, then sign it yourself or send it to others. First document free.',
    eyebrow: 'Fill and sign', crumb: 'Fill and sign PDF',
    h1: 'Fill and sign a PDF online',
    lede: 'Add text, dates, initials, and signatures to any PDF in your browser, for yourself or for the people who need to complete it.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>Fill and sign it yourself, free</h2><p>Only you need to fill it in? Use our <a href="/sign-pdf-online"><b>free Fill &amp; Sign PDF tool</b></a>: type into the blanks, add the date and your signature, and download. No account, and the PDF never leaves your browser.</p><p><a class="s-btn" href="/sign-pdf-online">Open the free PDF signer</a></p>`),
      card(`<h2>Two ways to fill and sign</h2>
<h3>Fill and sign it yourself</h3><p>Upload the PDF, choose “Skip, just me,” and place your text, date, name, initials, and signature fields where they belong. Then sign and download the finished PDF.</p>
<h3>Have someone else fill and sign</h3><p>Add the other person as a signer and place text fields for the details they need to enter, plus their signature and date. They complete it from their phone or computer, and you both get the finished copy.</p>`),
      card(`<h2>Field types</h2>${checklist(['Signature (typed, drawn, or uploaded image)', 'Initials', 'Date', 'Name', 'Free text for anything else, such as addresses or amounts'])}<p>The finished file is flattened, so what was filled in becomes part of the page.</p>`),
      card(`<h2>How it works</h2>${HOW_IT_WORKS}`),
      card(`<h2>Only need a signature image?</h2><p>Our <a href="/signature-generator">free signature generator</a> makes a transparent PNG of your signature right in your browser, nothing uploaded. Free desktop tools like Adobe Acrobat Reader’s Fill &amp; Sign and Apple Preview can also sign a PDF for one person; see <a href="/blog/how-to-sign-a-pdf">how to sign a PDF</a>.</p>`),
      card(`<h2>Pricing</h2>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [FREE_FAQ, SIGNER_FAQ,
      ['Can I fill out a scanned form?', 'Yes. Upload the scan or a photo of the paper form and place text and signature fields on top of it.']]
  },
  {
    path: '/sign-word-document-online',
    title: 'Sign a Word Document Online: E-Sign .docx Files',
    description: 'Sign a Word document online or send it to others to sign. Upload a .docx, place signature fields, and get a signed PDF with an audit certificate. First one free.',
    eyebrow: 'Word documents', crumb: 'Sign a Word document online',
    h1: 'Sign a Word document online',
    lede: 'Upload your .docx file and it’s turned into a PDF ready for signatures. Sign it yourself or email a signing link to everyone who needs to sign.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>How to e-sign a Word document</h2><ol class="steps">
<li><b>Upload the .docx</b> (up to 25 MB). It’s converted to a PDF so the layout is fixed before anyone signs.</li>
<li><b>Check the preview.</b> Complex Word layouts can shift in conversion; if something looks off, save it as PDF from Word (File → Save As → PDF) and upload that instead.</li>
<li><b>Add signers and place fields</b> for signature, initials, date, name, and text.</li>
<li><b>Send or sign.</b> Signers get a secure link; or choose “Skip, just me” to sign it yourself.</li>
<li><b>Download the signed PDF</b> with its audit certificate.</li>
</ol>`),
      card(`<h2>Why sign as a PDF, not inside Word?</h2><p>A Word file stays editable, so anyone can change the text after it’s signed. A signed PDF is flattened and our certificate records SHA-256 fingerprints of the original and signed files, so you can tell if it was altered later.</p><p>Prefer to do it inside Word? Read <a href="/blog/how-to-sign-a-word-document">how to sign a Word document</a> for the built-in options.</p>`),
      card(`<h2>Pricing</h2>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [FREE_FAQ, SIGNER_FAQ,
      ['Can I upload an older .doc file?', 'Not yet. In Word, choose File → Save As and pick .docx or PDF, then upload that.'],
      ['Does the signed file stay a Word document?', 'No. The finished file is a PDF, which keeps the signed version from being edited.']]
  }
]
