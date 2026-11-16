import { SITE, BRAND, checklist } from './layout.js'
import { competitorTable, PRICING_BLOCK } from './shared-blocks.js'

const PUBLISHED = '2026-11-14'
const art = (inner, date = 'November 14, 2026') => `<article class="card"><div class="prose"><p class="byline">By the Easy Digital Signatures team · Published ${date}</p>${inner}<p class="src">This article is general information, not legal advice. Laws change and differ by state and document type; ask a lawyer about your situation.</p></div></article>`

export const POSTS = [
  {
    slug: 'are-electronic-signatures-legal',
    title: 'Are Electronic Signatures Legal? ESIGN Act and UETA Explained',
    h1: 'Are electronic signatures legal? The ESIGN Act and UETA explained',
    description: 'How the federal ESIGN Act and state UETA laws make e-signatures legally valid in the US, what they require, and which documents are excluded.',
    summary: 'How the federal ESIGN Act and state UETA laws give e-signatures legal effect, what they require, and which documents are excluded.',
    body: art(`<p>In the United States, an electronic signature is generally just as valid as a handwritten one. Two laws do most of the work: the federal <b>ESIGN Act</b> and the state-level <b>Uniform Electronic Transactions Act (UETA)</b>. Here’s what each says, what they require, and where they don’t apply.</p>
<h2>The federal ESIGN Act (2000)</h2>
<p>The Electronic Signatures in Global and National Commerce Act was signed into law in 2000 and is codified at <a href="https://www.law.cornell.edu/uscode/text/15/chapter-96" rel="noopener" target="_blank">15 U.S.C. chapter 96</a>. Its core rule, in section 7001, is that for transactions in or affecting interstate or foreign commerce, a signature, contract, or other record may not be denied legal effect, validity, or enforceability solely because it’s in electronic form.</p>
<p>ESIGN defines an electronic signature broadly: an electronic sound, symbol, or process attached to or logically associated with a record and executed or adopted by a person with the intent to sign it. A typed name, a drawn signature, or clicking a clearly labeled “sign” button can all qualify. What matters is intent and the link between the signature and the record.</p>
<h3>Consumer consent</h3>
<p>When a law requires that information be given to a consumer in writing, ESIGN lets you provide it electronically only if the consumer affirmatively consents after receiving certain disclosures, such as the right to get paper copies and how to withdraw consent, and consents in a way that shows they can access the electronic format.</p>
<h2>UETA: the state law</h2>
<p>The Uniform Law Commission approved UETA in 1999. It has been enacted in 49 states, the District of Columbia, Puerto Rico, and the U.S. Virgin Islands. New York is the exception: it relies on its own Electronic Signatures and Records Act, and ESIGN still applies there to interstate transactions (<a href="https://www.nycbar.org/issues-policy/advocacy-campaigns/ueta-esra-new-york-electronic-transactions-law/" rel="noopener" target="_blank">New York City Bar</a>).</p>
<p>UETA says a record or signature may not be denied legal effect solely because it’s electronic, and that where a law requires a signature, an electronic signature satisfies it. UETA applies only when the parties have agreed to do business electronically, which can be shown by their conduct and the circumstances.</p>
<h2>Documents the laws exclude</h2>
<p>ESIGN (15 U.S.C. § 7003) excludes certain records from its rules, including:</p>
${checklist(['Wills, codicils, and testamentary trusts', 'Adoption, divorce, and other family-law matters', 'Court orders, notices, and official court documents', 'Notices of cancellation or termination of utility services', 'Notices of default, acceleration, repossession, foreclosure, or eviction, or the right to cure, under a credit agreement secured by or a rental agreement for a primary residence', 'Notices of cancellation or termination of health or life insurance benefits (excluding annuities)', 'Product recall notices for risks to health or safety', 'Documents required to accompany the transport or handling of hazardous materials', 'Most of the Uniform Commercial Code, other than certain sections and Articles 2 and 2A (sales and leases of goods)'])}
<p>State UETA versions have similar exclusions, and other laws can add specific requirements, for example notarization, witnessing, or particular delivery methods.</p>
<h2>What makes an e-signature hold up</h2>
<p>The laws are technology-neutral, so no particular software is required. In practice you want to be able to show:</p>
${checklist(['<b>Intent to sign</b>: the signer took a clear action to sign.', '<b>Consent to do business electronically</b>.', '<b>Attribution</b>: evidence linking the signature to the person, such as the email address the link was sent to, timestamps, and IP address.', '<b>Record integrity</b>: proof the document hasn’t changed since it was signed.', '<b>Record retention</b>: a copy all parties can keep and reproduce.'])}
<p>Easy Digital Signatures records each step on a certificate page attached to the finished PDF: who was sent the document, when they opened and signed it, their IP address, and SHA-256 fingerprints of the original and signed content that anyone can compare on our verify page.</p>
<h2>Outside the US</h2>
<p>Other countries have their own laws. The European Union, for example, uses the eIDAS Regulation, which defines simple, advanced, and qualified electronic signatures. If your agreement crosses borders, check the rules that apply.</p>`)
  },
  {
    slug: 'how-to-sign-a-pdf',
    title: 'How to Sign a PDF for Free (With or Without Adobe): 4 Ways',
    h1: 'How to sign a PDF: four easy ways',
    description: 'Step-by-step ways to sign a PDF on a computer or phone, and how to send a PDF for someone else to sign online with an audit trail.',
    summary: 'Sign a PDF yourself on a Mac, PC, or phone, or send it to others to sign online with an audit trail.',
    body: art(`<p>How you sign a PDF depends on one question: <b>does anyone else need to sign it?</b> If it’s just you, a free PDF app is enough. If others need to sign, an e-signature service saves the back and forth.</p>
<p><b>Fastest option:</b> our <a href="/sign-pdf-online">free online PDF signer</a> works on any computer or phone. Draw, type, or upload your signature, place it, and download. No account, and your file never leaves your browser.</p>
<h2>1. Sign it yourself in Adobe Acrobat Reader (Windows or Mac)</h2>
<p>Acrobat Reader is Adobe’s free PDF viewer, and it includes a Fill &amp; Sign tool.</p>
<ol class="steps"><li>Open the PDF in Acrobat Reader.</li><li>Choose <b>Fill &amp; Sign</b> from the tools.</li><li>Choose <b>Sign</b>, then add your signature by typing, drawing, or uploading an image.</li><li>Place it on the page and save the file.</li></ol>
<p>Menu names change between versions, so look for “Fill &amp; Sign” or “Sign” if the layout looks different.</p>
<h2>2. Sign it yourself in Preview (Mac)</h2>
<ol class="steps"><li>Open the PDF in Preview.</li><li>Show the Markup toolbar and click the <b>Sign</b> button.</li><li>Create a signature with your trackpad, camera, or iPhone.</li><li>Click the signature to place it, resize it, and save.</li></ol>
<h2>3. Sign it on an iPhone or Android phone</h2>
<p>Full steps are in <a href="/blog/how-to-sign-a-pdf-on-iphone-or-android">how to sign a PDF on your phone</a>.</p>
<p>On iPhone, open the PDF in Files or Mail, tap the <b>Markup</b> icon, tap <b>+</b>, and choose <b>Add Signature</b>. On Android, a PDF app such as Adobe Acrobat Reader offers a similar Fill &amp; Sign tool.</p>
<p>Want a clean signature image to reuse? Our <a href="/signature-generator">free signature generator</a> creates a transparent PNG from a typed or drawn signature, entirely in your browser.</p>
<h2>4. Send the PDF for others to sign online</h2>
<p>Emailing a PDF back and forth for each person to sign, save, and return gets messy fast. An e-signature service sends each signer a link and assembles one finished copy. With Easy Digital Signatures:</p>
<ol class="steps"><li>Create a free account and upload your PDF (up to 25 MB).</li><li>Add signers by name and email, and drag signature, initials, date, name, and text fields onto the page for each person.</li><li>Choose whether they sign in order or all at once, and optionally set reminders and an expiration date.</li><li>Click send. Each signer gets a secure link, no account needed.</li><li>When everyone has signed, download the flattened PDF with its audit certificate.</li></ol>
<p>Your first document is free. After that it’s $1 each, 10 for $5, or 50 for $10.</p>
<h2>Print, sign, and scan</h2>
<p>You can always print the PDF, sign it with a pen, and scan or photograph it. It works, but it’s slower, the scan can be hard to read, and you don’t get a record of when each person signed.</p>`)
  },
  {
    slug: 'how-to-sign-a-lease-online',
    title: 'How to Sign a Lease Online: A Guide for Landlords and Tenants',
    h1: 'How to sign a lease online',
    description: 'A step-by-step guide for landlords to send a lease for e-signature, get every tenant to sign, and keep a signed copy, plus the legal points to check.',
    summary: 'Send a lease for e-signature, get every tenant to sign, and keep a clean signed copy, plus the legal points to check first.',
    body: art(`<p>Signing a lease online saves everyone a trip, and it’s easy to keep a clean copy. Here’s how landlords and property managers can do it, and what to check before you start.</p>
<h2>Before you send</h2>
${checklist(['<b>Finalize the lease as a PDF.</b> Use your state-specific lease or your attorney’s template.', '<b>List every adult who must sign</b>, with each person’s email address.', '<b>Gather required disclosures and addenda</b>, such as pet, parking, or any disclosures your state or federal law requires, so they’re signed together.', '<b>Check your state’s rules</b> on required disclosures and how notices must be delivered.'])}
<h2>Step by step with Easy Digital Signatures</h2>
<ol class="steps"><li><b>Upload the lease.</b> Create a free account and upload the PDF.</li><li><b>Add the signers.</b> Add each tenant and, if needed, a co-signer or guarantor, then add yourself as landlord.</li><li><b>Place the fields.</b> Put signature and date fields on the signature page, and initials fields on key clauses like rent, deposit, and pet terms.</li><li><b>Choose the order.</b> Turn on signing order if you want tenants to sign first and countersign last.</li><li><b>Set reminders and a deadline.</b> Automatic reminders keep things moving, and an expiration date closes the link if it isn’t signed in time.</li><li><b>Send.</b> Each tenant gets a secure link and signs on a phone or computer, no account required.</li><li><b>Keep the signed copy.</b> When everyone has signed, all parties get the finished PDF with an audit certificate.</li></ol>
<h2>Tips for tenants</h2>
${checklist(['Read the whole lease before you sign; you can download it from the signing link.', 'Use your real name and sign from the email address the landlord sent it to.', 'If something is wrong, decline with a reason instead of signing.', 'Save the finished PDF somewhere safe.'])}
<h2>Is an online lease signature legal?</h2>
<p>In the US, leases can generally be signed electronically under the federal ESIGN Act and state laws based on UETA. ESIGN does exclude some records from its rules, including notices of default, foreclosure, or eviction for a primary residence, so serve those notices the way your state requires. Read more in <a href="/blog/are-electronic-signatures-legal">are electronic signatures legal?</a></p>
<h2>What it costs</h2>
<p>Your first document is free. After that each lease is one credit: $1 for one, 10 for $5, or 50 for $10. Save your lease as a template to reuse it for the next tenant. See <a href="/leases">e-signatures for leases</a>.</p>`)
  },
  {
    slug: 'electronic-signature-vs-digital-signature',
    title: 'Electronic Signature vs Digital Signature: What’s the Difference?',
    h1: 'Electronic signature vs digital signature: what’s the difference?',
    description: 'An electronic signature is a legal concept; a digital signature is a cryptographic technique. Learn how they differ and which one you need.',
    summary: 'One is a legal concept, the other a cryptographic technique. How they differ, and which one you need.',
    body: art(`<p>People use “electronic signature” and “digital signature” interchangeably, but they mean different things.</p>
<h2>Electronic signature: a legal concept</h2>
<p>An <b>electronic signature</b> is any electronic sound, symbol, or process that a person adopts with the intent to sign a record. That’s the definition in the US ESIGN Act. A typed name, a drawn signature on a touchscreen, or a click on an “I agree and sign” button can all be electronic signatures.</p>
<p>The law doesn’t require a specific technology. What makes an electronic signature hold up is the evidence around it: who signed, when, that they meant to sign, and that the document hasn’t changed.</p>
<h2>Digital signature: a cryptographic technique</h2>
<p>A <b>digital signature</b> is a specific technology that uses public-key cryptography. The signer’s software computes a hash of the document and encrypts it with the signer’s private key. Anyone with the matching public key can confirm who signed and that the document hasn’t changed. In certificate-based systems, a certificate authority issues the certificate that ties the public key to a person or organization.</p>
<p>PDF software such as Adobe Acrobat can apply certificate-based digital signatures, and some regulated settings require them. In the EU, eIDAS “advanced” and “qualified” electronic signatures typically rely on this kind of technology.</p>
<h2>Side by side</h2>
<div class="tbl-wrap"><table><thead><tr><th></th><th>Electronic signature</th><th>Digital signature</th></tr></thead><tbody>
<tr><td>What it is</td><td>A legal category: any electronic mark made with intent to sign</td><td>A cryptographic method using a key pair, often with a certificate</td></tr>
<tr><td>Proves identity by</td><td>Supporting evidence: email delivery, timestamps, IP address, audit trail</td><td>Possession of a private key tied to a certificate</td></tr>
<tr><td>Detects tampering by</td><td>Depends on the service; often document hashes in an audit record</td><td>Built in: any change breaks the signature check</td></tr>
<tr><td>Typical use</td><td>Most business contracts, leases, HR forms, NDAs, sales agreements</td><td>Regulated industries, government filings, some cross-border deals</td></tr>
</tbody></table></div>
<h2>Which do you need?</h2>
<p>For most everyday US business documents, a well-documented electronic signature is enough. Use a certificate-based digital signature when a regulator, agency, court, or counterparty specifically requires one.</p>
<h2>Where Easy Digital Signatures fits</h2>
<p>Easy Digital Signatures provides electronic signatures. Each finished document includes a certificate page with each signer’s email, timestamps, and IP address, plus SHA-256 fingerprints of the original and signed content. Anyone can compare those fingerprints on our verify page to confirm the file hasn’t changed. We don’t issue certificate-based (PKI) digital signatures.</p>`)
  },
  {
    slug: 'e-signature-cost-comparison',
    title: 'E-Signature Cost Comparison: DocuSign, Dropbox Sign, Adobe, PandaDoc',
    h1: 'E-signature cost comparison: what popular tools charge',
    description: 'A side-by-side look at listed prices for DocuSign, Dropbox Sign, Adobe Acrobat, PandaDoc, and pay-per-document e-signatures, with yearly cost examples.',
    summary: 'Listed prices for DocuSign, Dropbox Sign, Adobe Acrobat, PandaDoc, and pay-per-document pricing, with yearly cost examples.',
    body: art(`<p>E-signature tools mostly charge one of two ways: a <b>subscription</b> (monthly or annual, often per user, sometimes with a cap on documents) or <b>pay per document</b>. Which is cheaper depends on how many documents you send.</p>
<h2>Listed prices</h2>
<p>These are the US list prices each company shows on its public pricing page. We haven’t included discounts, promotions, taxes, or sales-negotiated plans.</p>
</div>${competitorTable(['docusign', 'dropbox', 'adobe', 'pandadoc'])}<div class="prose">
<h2>Worked examples (one user, one year)</h2>
<p>Here’s the arithmetic using the listed prices above. We used the annual-plan price where a vendor lists one, so these are the lowest per-month figures, not month-to-month prices.</p>
<div class="tbl-wrap"><table><thead><tr><th>Option</th><th>Cost for a year</th><th>Notes</th></tr></thead><tbody>
<tr><td>DocuSign Personal at $11/month</td><td>$132</td><td>Covers up to 5 envelopes a month (60 a year)</td></tr>
<tr><td>Adobe Acrobat Standard at US$14.99/month</td><td>$179.88</td><td>Also includes the Acrobat PDF editor</td></tr>
<tr><td>PandaDoc Starter at $19/seat/month, billed annually</td><td>$228</td><td>Also includes PandaDoc’s document builder</td></tr>
<tr class="us"><td>Easy Digital Signatures, 60 documents</td><td>$15</td><td>One 50-pack ($10) plus one 10-pack ($5)</td></tr>
<tr class="us"><td>Easy Digital Signatures, 12 documents</td><td>$6</td><td>Free first document, then a 10-pack ($5) and one $1 credit</td></tr>
</tbody></table></div>
<p>PandaDoc’s Free plan (5 documents a month) costs nothing if it covers your needs, and Dropbox Sign offers a 30-day free trial of its paid plans.</p>
<h2>What subscriptions give you for the money</h2>
<p>Bigger platforms bundle more: deep integrations, team management, single sign-on, mobile apps, ID verification add-ons, and, for Adobe, a full PDF editor. If you need those, the subscription can be worth it.</p>
<h2>When pay per document makes sense</h2>
${checklist(['You send a few documents a month or your volume is uneven.', 'You’re a solo professional, landlord, contractor, or small business.', 'You want a signed PDF with an audit trail, without paying for features you won’t use.', 'You don’t want to remember to cancel a subscription.'])}
<h2>Our pricing</h2>
${PRICING_BLOCK}
<p>See <a href="/e-signature-pricing">e-signature pricing</a> for details.</p>`)
  },
  {
    slug: 'how-to-electronically-sign-a-document',
    published: '2026-11-15',
    title: 'How to Electronically Sign a Document for Free',
    h1: 'How to electronically sign a document for free',
    description: 'The free ways to electronically sign a PDF, Word file, or contract, on a computer or phone, and how to get other people to e-sign a document with an audit trail.',
    summary: 'Free ways to e-sign a PDF, Word file, or contract yourself, and how to get others to sign with an audit trail.',
    body: art(`<p>An electronic signature is any sign of agreement made electronically: a typed name, a drawn signature, or a click to accept. Which method you should use depends on <b>who needs to sign</b> and <b>what record you need afterwards</b>.</p>
<h2>If only you need to sign</h2>
<p>Free tools already on your devices are enough:</p>
<ol class="steps"><li><b>Mac:</b> open the PDF in Preview, click the Markup tool, then Sign.</li><li><b>Windows or Mac:</b> Adobe Acrobat Reader is free and has a Fill &amp; Sign tool.</li><li><b>iPhone or iPad:</b> open the PDF in Files, tap Markup, then + and Add Signature. Details in <a href="/blog/how-to-sign-a-pdf-on-iphone-or-android">signing a PDF on your phone</a>.</li><li><b>Any device:</b> make a transparent signature image with our <a href="/signature-generator">free signature generator</a> and place it in the document.</li></ol>
<p>Menu names change between app versions, so look for “Sign,” “Fill &amp; Sign,” or “Markup” if yours looks different.</p>
<h2>If someone else needs to sign</h2>
<p>Use an e-signature service. It sends each person a link, records when they opened and signed, and produces one finished copy for everyone. With Easy Digital Signatures:</p>
<ol class="steps"><li>Create a free account and upload the document. PDFs, Word files, and photos all work.</li><li>Add each signer’s name and email and drag signature, initials, date, and text fields onto the page.</li><li>Send. Signers open the link on a phone or computer, with no account.</li><li>Download the signed PDF and its audit certificate when everyone is done.</li></ol>
<p>Your first document is free; after that it’s $1, 10 for $5, or 50 for $10. See <a href="/send-document-for-signature">sending a document for signature</a>.</p>
<h2>Word documents and Google Docs</h2>
<p>For Word, see <a href="/blog/how-to-sign-a-word-document">how to sign a Word document</a>. For Google Docs, see <a href="/blog/how-to-sign-a-google-doc">how to sign a Google Doc</a>. In both cases, signing a PDF copy keeps the signed version from being edited later.</p>
<h2>Is it legally binding?</h2>
<p>In the US, the federal ESIGN Act and state laws based on the Uniform Electronic Transactions Act generally give electronic signatures the same effect as handwritten ones, with exceptions such as wills and some court and family-law documents. Read <a href="/blog/are-electronic-signatures-legal">are electronic signatures legal?</a> for more.</p>
<h2>Electronic vs digital signatures</h2>
<p>A “digital signature” usually means a certificate-based cryptographic signature, which some government filings require. Most everyday contracts only need an electronic signature. The difference is explained in <a href="/blog/electronic-signature-vs-digital-signature">electronic vs digital signatures</a>.</p>`, 'November 15, 2026')
  },
  {
    slug: 'how-to-sign-a-pdf-on-iphone-or-android',
    published: '2026-11-15',
    title: 'How to Sign a PDF on Your Phone (iPhone or Android), Free',
    h1: 'How to sign a PDF on your phone, iPhone or Android',
    description: 'Free ways to sign a PDF on an iPhone or Android phone with your finger, and how to send a PDF from your phone for someone else to sign.',
    summary: 'Sign a PDF with your finger on iPhone or Android, for free, or send it from your phone for others to sign.',
    body: art(`<p>You don’t need to print anything to sign a PDF that arrived on your phone. Here are the free options, then how to get someone <i>else</i> to sign from your phone.</p>
<h2>iPhone and iPad: Markup (built in)</h2>
<ol class="steps"><li>Open the PDF from the Files app or a Mail attachment.</li><li>Tap the <b>Markup</b> icon (a pen tip).</li><li>Tap <b>+</b>, then <b>Add Signature</b>, and sign with your finger.</li><li>Drag the signature onto the line, resize it, and tap <b>Done</b>. Share or save the signed copy.</li></ol>
<p>Apple moves these buttons between iOS versions; Apple’s own help page for “fill out forms, sign documents” has the current steps.</p>
<h2>Android: use a free PDF app</h2>
<p>Android doesn’t have one built-in PDF signer across all phones. A free PDF app such as Adobe Acrobat Reader has a <b>Fill &amp; Sign</b> tool: open the PDF, choose Fill &amp; Sign, create your signature with your finger, place it, and save. Some phone makers include their own PDF markup tools too.</p>
<h2>Any phone: a signature image</h2>
<p>Our <a href="/signature-generator">free signature generator</a> works in your phone’s browser. Draw your signature with your finger and save a transparent PNG to reuse.</p>
<h2>Send a PDF from your phone for someone else to sign</h2>
<p>When a client, tenant, or customer needs to sign, use an e-signature service so you both end up with the same signed copy and a record of when it was signed. Easy Digital Signatures works in a mobile browser, with no app to install:</p>
<ol class="steps"><li>Open easydigitalsignatures.com on your phone and create a free account.</li><li>Upload the PDF, or take a photo of a paper document with the camera option.</li><li>Add the signer’s name and email and place the signature fields.</li><li>Send, or use in-person signing and hand them your phone.</li></ol>
<p>Your first document is free. After that it’s $1 each, 10 for $5, or 50 for $10.</p>`, 'November 15, 2026')
  },
  {
    slug: 'how-to-sign-a-word-document',
    published: '2026-11-15',
    title: 'How to Sign a Word Document Electronically (3 Free Ways)',
    h1: 'How to sign a Word document electronically',
    description: 'Three free ways to sign a Word document: insert a signature image, draw it in Word, or convert to PDF and e-sign, plus how to get others to sign a .docx.',
    summary: 'Insert a signature image, draw it in Word, or convert to PDF and e-sign, plus how to get others to sign.',
    body: art(`<p>Word can hold a signature, but a Word file stays editable after you sign it. For anything that matters, sign a PDF copy. Here are three free ways, from quickest to most reliable.</p>
<h2>1. Insert a picture of your signature</h2>
<ol class="steps"><li>Make a signature image: sign white paper and photograph it, or use our <a href="/signature-generator">free signature generator</a> for a transparent PNG.</li><li>In Word, click where the signature goes, then <b>Insert → Pictures</b> and choose the image.</li><li>Resize it, and set text wrapping to “In front of text” if you need to move it freely.</li></ol>
<h2>2. Draw it in Word</h2>
<p>On a touchscreen or with a trackpad, Word’s <b>Draw</b> tab lets you write your signature with a pen tool. Availability depends on your version of Word and device.</p>
<h2>3. Save as PDF and e-sign (best for agreements)</h2>
<p>Choose <b>File → Save As → PDF</b> (or File → Export on some versions) and sign the PDF. A PDF keeps the layout fixed, and an e-signature service adds a record of who signed and when. See <a href="/blog/how-to-sign-a-pdf">how to sign a PDF</a>.</p>
<h2>What about Word’s “Signature Line”?</h2>
<p>Word for Windows has <b>Insert → Signature Line</b>, which adds a line for a certificate-based digital signature. Signing it requires a digital ID (certificate), which most people don’t have, so it’s rarely the easiest route for everyday agreements.</p>
<h2>When someone else needs to sign the Word document</h2>
<p>Upload the .docx to Easy Digital Signatures; it’s converted to a PDF for signing. Add each signer’s email, place the fields, and send. Everyone gets the signed PDF with an audit certificate. Older .doc files need to be saved as .docx or PDF first. More on <a href="/sign-word-document-online">signing Word documents online</a>.</p>`, 'November 15, 2026')
  },
  {
    slug: 'how-to-sign-a-google-doc',
    published: '2026-11-15',
    title: 'How to Sign a Google Doc (Free) and Get Others to Sign',
    h1: 'How to sign a Google Doc',
    description: 'How to add your signature to a Google Doc with a drawing or image, and how to get a Google Doc signed by others as a PDF with an audit trail.',
    summary: 'Add your signature to a Google Doc with a drawing or image, or download it as a PDF and send it for e-signature.',
    body: art(`<p>Google Docs gives you a couple of free ways to add your own signature. When other people need to sign, it’s usually easiest to download the doc as a PDF and send it for e-signature.</p>
<h2>1. Draw your signature</h2>
<ol class="steps"><li>Click where the signature goes.</li><li>Choose <b>Insert → Drawing → + New</b>.</li><li>Pick the <b>Scribble</b> tool from the line menu and draw your signature with the mouse or trackpad.</li><li>Click <b>Save and close</b>. Resize the drawing in the document.</li></ol>
<h2>2. Insert a signature image</h2>
<p>Make a transparent PNG with our <a href="/signature-generator">free signature generator</a>, then use <b>Insert → Image → Upload from computer</b>.</p>
<h2>3. Google’s built-in eSignature</h2>
<p>Some Google Workspace plans include an eSignature feature in Docs for requesting signatures. Whether you have it depends on your account type and plan; Google’s Docs help pages list the eligible plans.</p>
<h2>Getting a Google Doc signed by someone else</h2>
<ol class="steps"><li>In Google Docs, choose <b>File → Download → PDF document (.pdf)</b>. (Microsoft Word .docx also works with our uploader.)</li><li>Upload it to Easy Digital Signatures and add each signer’s name and email.</li><li>Place signature, initials, date, and text fields, then send.</li><li>When everyone has signed, download the flattened PDF with its audit certificate.</li></ol>
<p>Signing a PDF copy means the signed version can’t be quietly edited afterwards, which can happen with a shared doc. Your first document is free. See <a href="/send-document-for-signature">sending a document for signature</a>.</p>`, 'November 15, 2026')
  }
].map(p => ({
  ...p,
  path: '/blog/' + p.slug,
  title: (p.title + ' | ' + BRAND).length <= 70 ? `${p.title} | ${BRAND}` : p.title,
  ogType: 'article',
  published: p.published || PUBLISHED,
  breadcrumbs: [['Home', '/'], ['Blog', '/blog'], [p.h1.replace(/<[^>]+>/g, ''), '/blog/' + p.slug]],
  eyebrow: 'Guide',
  noHeroCta: true,
  compactHero: true,
  jsonld: [{
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline: p.h1, description: p.description,
    datePublished: p.published || PUBLISHED, dateModified: p.published || PUBLISHED, mainEntityOfPage: SITE + '/blog/' + p.slug,
    image: SITE + '/og.png', author: { '@type': 'Organization', name: BRAND, url: SITE + '/' },
    publisher: { '@type': 'Organization', name: BRAND, logo: { '@type': 'ImageObject', url: SITE + '/icon-512.png' } }
  }]
}))

export const BLOG_INDEX = {
  path: '/blog',
  title: 'E-Signature Guides and Articles | Easy Digital Signatures Blog',
  description: 'Plain-English guides to electronic signatures: e-signature law, how to sign a PDF or lease online, digital vs electronic signatures, and cost comparisons.',
  eyebrow: 'Blog', crumb: 'Blog',
  h1: 'E-signature guides',
  lede: 'Plain-English answers about signing documents online: what the law says, how to do it, and what it costs.',
  compactHero: true, noHeroCta: true,
  body: `<section class="posts">${POSTS.map(p => `<a class="post" href="${p.path}"><div class="meta">Guide · ${p.published === '2026-11-15' ? 'November 15, 2026' : 'November 14, 2026'}</div><h2>${p.h1}</h2><p>${p.summary}</p></a>`).join('')}</section><div style="height:22px"></div>`,
  jsonld: [{ '@context': 'https://schema.org', '@type': 'Blog', name: `${BRAND} Blog`, url: SITE + '/blog', blogPost: POSTS.map(p => ({ '@type': 'BlogPosting', headline: p.h1, url: SITE + p.path, datePublished: p.published })) }]
}
