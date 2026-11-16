import { APP_LD, checklist } from './layout.js'
import { competitorTable, PRICING_BLOCK, HOW_IT_WORKS, FEATURES, LEGAL_NOTE } from './shared-blocks.js'

const card = (inner, cls = '') => `<section class="card ${cls}"><div class="prose">${inner}</div></section>`
const wide = inner => `<section class="card">${inner}</section>`

function alternative({ slug, key, name, h1, lede, intro, theyFit, faqs }) {
  return {
    path: '/' + slug,
    title: `${name} Alternative: Pay Per Document, No Subscription`,
    description: `Looking for a ${name} alternative? Easy Digital Signatures charges per document: first one free, then $1, 10 for $5, or 50 for $10. Compare listed prices.`,
    eyebrow: `${name} alternative`,
    crumb: `${name} alternative`,
    h1, lede,
    jsonld: [APP_LD],
    body: [
      card(`<h2>Why people look for a ${name} alternative</h2>${intro}`),
      wide(`<h2>Listed prices side by side</h2><p>This compares only what each company publishes on its own pricing page. We haven’t included discounts, promotions, or sales-negotiated plans.</p>${competitorTable([key])}`),
      card(`<h2>What it costs at small volumes</h2>
<p>Our credits are sold in packs, so the math is simple. Your first document is free. After that:</p>
${checklist(['5 documents a month (60 a year): one 50-pack plus one 10-pack is <b>$15 for the year</b>.', '2 documents a month (24 a year): two 10-packs plus four single credits is <b>$14</b>, or one 50-pack for <b>$10</b> with credits left over.', '1 document now and then: <b>$1</b> each, with no monthly bill to remember to cancel.'])}
<p>Compare that with the subscription prices in the table above, and use whichever fits how often you actually send.</p>`),
      card(`<h2>What you get with Easy Digital Signatures</h2>${FEATURES}<h3>How it works</h3>${HOW_IT_WORKS}`),
      card(`<h2>When ${name} may be the better choice</h2>${theyFit}<p>If you mostly need to send PDFs, collect signatures, and keep a clean signed copy with an audit trail, a pay-per-document tool can cost far less.</p>`),
      card(`<h2>Our pricing</h2>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [
      ['Is Easy Digital Signatures really pay per document?', 'Yes. Your first document is free after you verify your email. After that you buy credits: $1 for one, $5 for 10, or $10 for 50. There’s no subscription and no monthly fee.'],
      ['Do my signers need an account?', 'No. Signers get a secure link by email and sign in their browser on a phone or computer.'],
      ['Are electronic signatures legally binding?', 'In the US, the federal ESIGN Act and state laws based on the Uniform Electronic Transactions Act generally give electronic signatures the same legal effect as handwritten ones, with some exceptions such as wills and certain court and family-law documents. See our <a href="/blog/are-electronic-signatures-legal">guide to e-signature law</a>. This isn’t legal advice.'],
      ...(faqs || [])
    ]
  }
}

export const PAGES = [
  alternative({
    slug: 'docusign-alternative', key: 'docusign', name: 'DocuSign',
    h1: 'A simple DocuSign alternative that charges per document',
    lede: 'Send PDFs for signature without an annual plan. Your first document is free, then it’s $1 each, 10 for $5, or 50 for $10.',
    intro: `<p>DocuSign is the best-known name in e-signatures, and its plans are built around subscriptions with envelope allowances. According to DocuSign’s own pricing page, the Personal plan includes 5 envelopes a month and the Standard and Business Pro annual plans include 100 envelopes per user per year.</p>
<p>That works well for teams that send every day. If you send a lease, an estimate, or an NDA a few times a month, paying a monthly or annual fee for features you don’t use adds up. Easy Digital Signatures lets you pay only when you send.</p>`,
    theyFit: checklist(['You need integrations DocuSign lists on its pricing page, such as Salesforce, Microsoft Dynamics, or its 1,000+ partner integrations.', 'You need SMS delivery, ID verification, single sign-on, or compliance programs DocuSign offers on higher plans or as add-ons.', 'You manage many users who need shared templates, permissions, and team reporting.'])
  }),
  alternative({
    slug: 'dropbox-sign-alternative', key: 'dropbox', name: 'Dropbox Sign',
    h1: 'A Dropbox Sign alternative without the monthly plan',
    lede: 'Upload a PDF, place fields, and email a signing link. Pay once per document: first one free, then from 20¢ each in a 50-pack.',
    intro: `<p>Dropbox Sign (formerly HelloSign) is known for a clean signing experience, and its plans are monthly or annual subscriptions. Its pricing page lists the Essentials plan for individuals starting at $15 a month on monthly billing, with lower per-month prices when you pay yearly.</p>
<p>A subscription makes sense when you send often. If your volume is uneven, say a handful of agreements in a busy month and none the next, buying document credits can be cheaper and there’s nothing to cancel.</p>`,
    theyFit: checklist(['You already live in Dropbox and want signing built into it.', 'You need team features Dropbox Sign lists, such as an admin console, team roles, and integrations with tools like Salesforce or HubSpot.', 'You want a free trial of a subscription product before you commit.'])
  }),
  alternative({
    slug: 'adobe-sign-alternative', key: 'adobe', name: 'Adobe Sign',
    h1: 'An Adobe Acrobat Sign alternative for sending PDFs to sign',
    lede: 'You don’t need a full PDF suite to get a signature. Send your first document free, then pay $1 each, 10 for $5, or 50 for $10.',
    intro: `<p>Adobe Acrobat Sign is now sold as part of Adobe Acrobat. On Adobe’s pricing page, Acrobat Standard and Acrobat Pro are both subscriptions, and Adobe says both let you request e-signatures; Pro adds features like reusable e-sign templates, bulk sending, and branding.</p>
<p>Acrobat is a full PDF editor, with conversion, OCR, redaction, and more. If all you need is to get a PDF signed and keep a signed copy with an audit trail, paying for the whole suite may be more than you need.</p>`,
    theyFit: checklist(['You also need to edit PDF text, convert files, run OCR on scans, or redact information.', 'Your company already pays for Adobe licenses.', 'You need enterprise integrations Adobe offers through its sales team, such as Acrobat Sign Solutions.']),
    faqs: [['Can I still use Adobe Acrobat Reader to view the signed PDF?', 'Yes. The finished file is a standard PDF you can open in Acrobat Reader, Apple Preview, your browser, or any PDF viewer.']]
  }),
  alternative({
    slug: 'pandadoc-alternative', key: 'pandadoc', name: 'PandaDoc',
    h1: 'A PandaDoc alternative focused on getting signatures',
    lede: 'Skip the proposal builder when you just need a signed PDF. First document free, then $1 each or as low as 20¢ in a 50-pack.',
    intro: `<p>PandaDoc is a document platform built around proposals, quotes, and sales workflows, with e-signatures included. Its pricing page lists a Free plan with 5 documents a month, and paid Starter and Business plans priced per seat.</p>
<p>If you write proposals inside a document builder, that’s a strength. If you already have the PDF and just need it signed, a focused e-signature tool is quicker to learn and you only pay for what you send.</p>`,
    theyFit: checklist(['You build proposals or quotes with pricing tables and a product catalog.', 'You need CRM integrations, approval workflows, or document analytics.', 'Your team works inside shared workspaces with per-seat roles.'])
  }),
  {
    path: '/free-electronic-signature',
    title: 'Free Electronic Signature Online: Your First Document Free',
    description: 'Free electronic signature online: upload a PDF or Word file, add signature fields, and email a secure signing link. First document free, no credit card. Signers need no account.',
    eyebrow: 'Free e-signature', crumb: 'Free electronic signature',
    h1: 'Free electronic signature online: your first document is free',
    lede: 'Create an account, verify your email, and send one document for signature at no cost. No credit card needed to start.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>What “free” means here</h2><p>Your first document is completely free: upload it, place fields for your signers, send it, and download the signed PDF with its audit certificate. We don’t ask for a card to get started.</p><p>After the free document, you buy credits only if you need them: $1 for one document, $5 for 10, or $10 for 50. There’s no subscription, so there’s nothing to cancel.</p>${PRICING_BLOCK}`),
      card(`<h2>How to send a document for e-signature</h2>${HOW_IT_WORKS}`),
      card(`<h2>What’s included, even on the free document</h2>${FEATURES}`),
      card(`<h2>Only need to sign something yourself?</h2><p>If you just want an image of your signature to paste into a document, try our <a href="/signature-generator">free signature generator</a>. It makes a transparent PNG from a typed or drawn signature right in your browser.</p><p>When the other side needs to sign too, send it through Easy Digital Signatures so everyone gets the same signed copy and an audit trail.</p>`),
      card(`<h2>Comparing free e-signature plans?</h2><p>Most free plans cap you at a few documents a month. See how they compare in <a href="/free-docusign-alternative">free DocuSign alternatives</a>, or why some people prefer <a href="/pay-per-document-e-signature">pay-per-document e-signatures</a>.</p>`)
    ].join('\n'),
    faqs: [
      ['Is the free e-signature really free?', 'Yes. Your first document costs nothing and doesn’t need a credit card. You only pay if you send more documents.'],
      ['Is a free electronic signature legally valid?', 'The price doesn’t change the legal effect. In the US, the ESIGN Act and state UETA laws generally treat e-signatures like handwritten ones for most business documents, with listed exceptions. This isn’t legal advice.'],
      ['How many people can sign the free document?', 'A document uses one credit no matter how many signers you add to it.']
    ]
  },
  {
    path: '/sign-pdf-online',
    title: 'Sign PDF Online Free: Add a Signature or Send for E-Signature',
    description: 'Sign a PDF online free in your browser, or send it to others to sign. Add signature, initials, date, and text fields to any PDF. First document free.',
    eyebrow: 'Sign PDF online', crumb: 'Sign a PDF online',
    h1: 'Sign a PDF online and send it to others to sign',
    lede: 'Upload any PDF, drag on signature, initials, and date fields, and email a secure signing link. Works in any modern browser.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>Three ways to sign a PDF</h2>
<h3>1. Only you need to sign</h3><p>Free tools such as Adobe Acrobat Reader’s Fill &amp; Sign or the Markup tools in Apple Preview let you add your own signature to a PDF. Our <a href="/signature-generator">signature generator</a> also makes a signature image you can place in any document.</p>
<h3>2. Someone else needs to sign</h3><p>Use an e-signature service so each signer gets a link, signs in their browser, and everyone ends up with the same finished file and a record of who signed and when. That’s what Easy Digital Signatures does.</p>
<h3>3. Several people, in a set order</h3><p>Turn on signing order and each signer gets the link after the person before them finishes.</p>
<p>For a full walkthrough, read <a href="/blog/how-to-sign-a-pdf">how to sign a PDF</a>. Need to fill in text too? See <a href="/fill-and-sign-pdf">fill and sign a PDF</a>.</p>`),
      card(`<h2>How it works</h2>${HOW_IT_WORKS}`),
      card(`<h2>Built for PDFs</h2>${checklist(['Upload PDFs up to 25 MB (Word files and photos work too), or start from a blank page', 'Signature, initials, date, name, and text fields', 'The finished file is flattened, so the signatures are part of the page', 'A certificate page records timestamps, IP addresses, and SHA-256 fingerprints', 'Signers can sign on a phone, tablet, or computer'])}`),
      card(`<h2>Pricing</h2>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [
      ['Do I need to install anything to sign a PDF online?', 'No. Easy Digital Signatures runs in your web browser, and so does signing.'],
      ['What file size can I upload?', 'Files up to 25 MB each.'],
      ['Can signers download the signed PDF?', 'Yes. When everyone has signed, the finished PDF with its audit certificate is available to download.']
    ]
  },
  {
    path: '/e-signature-pricing',
    title: 'E-Signature Pricing: $1 per Document, No Subscription',
    description: 'Simple e-signature pricing: first document free, then $1 each, 10 for $5, or 50 for $10. No monthly plan. Compare with DocuSign, Dropbox Sign, Adobe, and PandaDoc.',
    eyebrow: 'Pricing', crumb: 'E-signature pricing',
    h1: 'E-signature pricing that’s simple: pay per document',
    lede: 'Your first document is free. After that, $1 each, 10 for $5, or 50 for $10. No subscription, no seats, no envelope allowance to track.',
    jsonld: [APP_LD],
    body: [
      card(`<h2>Our prices</h2>${PRICING_BLOCK}<h3>What a credit covers</h3>${checklist(['One document sent for signature, with as many signers as it needs', 'Email delivery of signing links and reminders', 'The flattened, signed PDF and its audit certificate', 'Copies for everyone when the document is complete'])}`),
      wide(`<h2>How this compares with subscription e-signature plans</h2><p>Most e-signature services sell monthly or annual plans. Here are the list prices they publish.</p>${competitorTable(['docusign', 'dropbox', 'adobe', 'pandadoc'])}`),
      card(`<h2>Which is cheaper for you?</h2><p>It depends on how often you send. A few examples using our packs:</p>${checklist(['12 documents a year: one 10-pack and two single credits, <b>$7</b> (or $6 counting your free first document).', '60 documents a year: a 50-pack and a 10-pack, <b>$15</b>.', '200 documents a year: four 50-packs, <b>$40</b>.'])}<p>If your team sends hundreds of documents a month and needs CRM integrations, SSO, or advanced identity checks, an enterprise plan from a larger provider may suit you better. For a deeper breakdown, read our <a href="/blog/e-signature-cost-comparison">e-signature cost comparison</a>.</p>`)
    ].join('\n'),
    faqs: [
      ['Is there a monthly fee?', 'No. You buy document credits only when you need them.'],
      ['What payment methods do you accept?', 'Cards, Apple Pay, and Google Pay through Stripe Checkout.'],
      ['Does each signer cost extra?', 'No. One credit covers one document, however many people sign it.']
    ]
  },
  useCase({
    slug: 'real-estate', crumb: 'Real estate',
    title: 'E-Signatures for Real Estate Agents and Investors | Easy Digital Signatures',
    description: 'Send listing agreements, offers, addenda, and disclosures for e-signature. Pay per document, no subscription. First document free.',
    h1: 'E-signatures for real estate deals',
    lede: 'Send listing agreements, offers, counteroffers, and addenda in minutes. Buyers and sellers sign from their phone. Pay only for the documents you send.',
    docs: ['Listing agreements', 'Purchase offers and counteroffers', 'Addenda and amendments', 'Seller disclosures', 'Buyer representation agreements', 'Property management agreements'],
    why: `<p>Deals move fast, and the other side is often on a phone. With Easy Digital Signatures, each party gets a link, signs in the browser, and you get one finished PDF with an audit certificate showing when each person signed.</p><p>Use signing order when the seller must sign after the buyer, set reminders so offers don’t sit, and set an expiration date that matches your offer deadline.</p>`,
    caution: `<p>Federal and state e-signature laws generally allow purchase agreements and similar contracts to be signed electronically. Documents that must be notarized or recorded, such as deeds, follow your state’s notary rules and your county recorder’s requirements, which vary. Your brokerage or state association may also require specific forms.</p>`,
    faqs: [['Can buyers sign an offer on their phone?', 'Yes. Signing works in mobile browsers, with no app or account.'], ['Can I reuse my listing agreement?', 'Yes. Save it as a template with the fields already placed and send it again with one click.']]
  }),
  useCase({
    slug: 'leases', crumb: 'Leases',
    title: 'Sign Leases Online: E-Signatures for Landlords | Easy Digital Signatures',
    description: 'Send residential and commercial leases for e-signature. Tenants sign on any device. First lease free, then $1 per document or less.',
    h1: 'Sign leases online with your tenants',
    lede: 'Send a lease, renewal, or addendum and have every tenant sign from their phone. First document free, then $1 each or as little as 20¢ in a 50-pack.',
    docs: ['Residential lease agreements', 'Lease renewals and extensions', 'Pet, parking, and other addenda', 'Move-in and move-out checklists', 'Commercial leases', 'Rental applications'],
    why: `<p>Getting every adult on a lease to sign used to mean meetings or mailing paper. Now each tenant gets their own link and signs in the browser, and everyone receives the same signed copy.</p><p>Add each roommate as a signer, use initials fields on key clauses, and set reminders so nobody holds up move-in. Small landlords who sign a few leases a year pay a few dollars, not a monthly plan.</p><p>Step-by-step instructions are in <a href="/blog/how-to-sign-a-lease-online">how to sign a lease online</a>.</p>`,
    caution: `<p>Leases can generally be signed electronically under the ESIGN Act and state UETA laws. But the federal ESIGN Act specifically excludes some notices, including notices of default, foreclosure, or eviction for a primary residence, from its electronic-delivery rules. State landlord-tenant laws also set rules for required disclosures and how notices must be delivered, so check your state’s requirements.</p>`,
    faqs: [['Does each tenant need to sign?', 'You can add every tenant as a signer. Each gets a separate link, and the document completes when all of them have signed.'], ['Can I send the same lease to new tenants?', 'Yes. Save it as a template and reuse it.']]
  }),
  useCase({
    slug: 'contractors', crumb: 'Contractors',
    title: 'E-Signatures for Contractors: Estimates, Change Orders | Easy Digital Signatures',
    description: 'Get estimates, contracts, and change orders signed from the job site. Clients sign on their phone. First document free, then $1 or less per document.',
    h1: 'Get estimates and change orders signed from the job site',
    lede: 'Send a contract or change order from your phone and get it signed before you start work. Pay per document, not per month.',
    docs: ['Estimates and bids', 'Service and construction contracts', 'Change orders', 'Subcontractor agreements', 'Completion and sign-off forms', 'Warranty acknowledgments'],
    why: `<p>Approval is often the slowest part of the job. Send the estimate as a PDF, place a signature and date field, and the client signs from their phone. You get a finished PDF with a certificate showing when they signed.</p><p>For a client standing in front of you, use in-person signing and hand them your phone or tablet. Save your standard contract as a template so the next one takes seconds.</p>`,
    caution: `<p>Most construction contracts and change orders can be signed electronically. Some states prescribe specific forms or notarization for certain documents, such as lien waivers or home-improvement contracts with required notices. Use your state’s required wording and forms.</p>`,
    faqs: [['Can a client sign on my phone at the job site?', 'Yes. In-person signing lets someone sign on your device on the spot.'], ['Is there a monthly fee?', 'No. You pay per document: $1 each, 10 for $5, or 50 for $10, after your free first document.']]
  }),
  useCase({
    slug: 'hr-onboarding', crumb: 'HR onboarding',
    title: 'E-Signatures for HR Onboarding and Offer Letters | Easy Digital Signatures',
    description: 'Send offer letters, handbook acknowledgments, and onboarding forms for e-signature. New hires sign from any device. Pay per document.',
    h1: 'Offer letters and onboarding paperwork, signed online',
    lede: 'Send offer letters and policy acknowledgments the same day you make the hire. New employees sign from their phone, without creating an account.',
    docs: ['Offer letters', 'Employee handbook acknowledgments', 'Confidentiality and invention-assignment agreements', 'Contractor agreements', 'Policy acknowledgments', 'Separation agreements'],
    why: `<p>A signed offer letter shouldn’t wait on a printer. Send it with a signature and date field, set a reminder, and set the link to expire when the offer does.</p><p>Use templates for documents every new hire signs, and bulk send to deliver a policy update to the whole team, each person getting their own copy to sign.</p>`,
    caution: `<p>Many employment documents can be signed electronically. Some government forms have their own rules: for example, Form I-9 and Form W-4 can be completed electronically only with systems that meet the requirements set by the Department of Homeland Security and the IRS. Check agency guidance before using a general e-signature tool for those forms.</p>`,
    faqs: [['Can I send the same document to the whole team?', 'Yes. Bulk send gives each person their own copy to sign.'], ['Do new hires need an account?', 'No. They sign through a secure link.']]
  }),
  useCase({
    slug: 'nda', crumb: 'NDAs',
    title: 'Sign NDAs Online: Fast E-Signatures for NDAs | Easy Digital Signatures',
    description: 'Send a non-disclosure agreement for e-signature in minutes. Mutual or one-way NDAs, signed from any device. First NDA free, then $1 or less.',
    h1: 'Get an NDA signed in minutes',
    lede: 'Upload your mutual or one-way NDA, place the signature fields, and send. Both parties get the signed PDF with an audit certificate.',
    docs: ['Mutual NDAs', 'One-way (unilateral) NDAs', 'Vendor and supplier confidentiality agreements', 'Employee and contractor confidentiality agreements', 'Investor and partner NDAs', 'Event and beta-tester agreements'],
    why: `<p>An NDA is often the first document in a new relationship, and it shouldn’t take a week. Save your standard NDA as a template, add the other party’s email, and send.</p><p>For mutual NDAs, use signing order so the counterparty signs first and you countersign. When it’s done, both sides get the same finished PDF.</p>`,
    caution: `<p>NDAs are ordinary commercial contracts, and in the US they can generally be signed electronically under the ESIGN Act and state UETA laws. Whether a particular clause is enforceable is a separate question of contract law in your state.</p>`,
    faqs: [['Can I reuse my NDA?', 'Yes. Save it as a template with fields placed, then send it to each new party.'], ['Can I countersign after the other party?', 'Yes. Turn on signing order and put yourself last.']]
  })
]

function useCase({ slug, crumb, title, description, h1, lede, docs, why, caution, faqs }) {
  return {
    path: '/' + slug, title, description, h1, lede, crumb, eyebrow: 'Use case',
    jsonld: [APP_LD],
    body: [
      card(`<h2>Documents people send</h2>${checklist(docs)}<p class="src">Upload your own documents. We don’t provide legal forms.</p>`),
      card(`<h2>Why it works</h2>${why}`),
      card(`<h2>How it works</h2>${HOW_IT_WORKS}`),
      card(`<h2>Know the rules</h2>${caution}${LEGAL_NOTE}`),
      card(`<h2>Pricing</h2>${PRICING_BLOCK}`)
    ].join('\n'),
    faqs: [...faqs, ['Is there a free option?', 'Yes. Your first document is free after you verify your email.']]
  }
}
