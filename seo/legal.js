// Privacy policy and terms of service. Generic by design; have a lawyer review before relying on them.
const UPDATED = 'Last updated Nov 14, 2026'
const doc = inner => `<article class="card"><div class="prose"><p class="byline">${UPDATED}</p>${inner}</div></article>`

export const PRIVACY = {
  path: '/privacy',
  title: 'Privacy Policy | Easy Digital Signatures',
  description: 'How Easy Digital Signatures collects, uses, stores, and deletes personal information and documents, and which service providers process it.',
  eyebrow: 'Legal', crumb: 'Privacy policy', h1: 'Privacy policy',
  lede: UPDATED,
  compactHero: true, noHeroCta: true, noBottomCta: true,
  body: doc(`<p>This policy explains what information Easy Digital Signatures (“we”, “us”, “the service”) collects when you use easydigitalsignatures.com, how we use it, and the choices you have. The service is operated by the owner of this website.</p>
<h2>Information we collect</h2>
<h3>Account holders (senders)</h3>
<ul><li><b>Account details:</b> your name, email address, and password. Passwords are handled by our authentication provider and we never see them in plain text.</li>
<li><b>Documents and signing data:</b> files you upload, fields you place, signer names and email addresses you enter, messages, templates, and branding such as a logo or company name.</li>
<li><b>Purchases:</b> which credit packs you bought, amounts, and payment status. Card details are entered on Stripe’s checkout page and are not stored by us.</li>
<li><b>Support:</b> messages you send through the contact form and questions you type into the help chat.</li></ul>
<h3>Signers</h3>
<ul><li>Your name and email address (provided by the sender), the signatures, initials, and other values you enter, and any reason you give for declining.</li></ul>
<h3>Everyone</h3>
<ul><li><b>Audit and security data:</b> IP address, browser user agent, timestamps of viewing, signing, and other actions, and device identifiers. These go into the document’s audit certificate and help prevent abuse of the free document.</li>
<li><b>Cookies and local storage:</b> we use a first-party cookie and browser storage to keep you signed in and to recognize a device for fraud prevention. We don’t use advertising cookies.</li>
<li><b>Analytics:</b> we use Vercel Web Analytics, which counts page views without cookies, and we record anonymous events such as signups and purchases to understand how the site is used.</li></ul>
<h2>How we use information</h2>
<ul><li>To provide the service: store documents, send signing links, reminders, and completion emails, and produce signed PDFs with audit certificates.</li>
<li>To process payments and keep your credit balance.</li>
<li>To prevent fraud and abuse, including limiting the free document to one per person.</li>
<li>To answer support requests and improve the service.</li>
<li>To meet legal obligations.</li></ul>
<p>We don’t sell personal information, and we don’t use your documents to train AI models.</p>
<h2>Service providers (processors)</h2>
<p>We share information only with providers that help us run the service, under their own terms and security programs:</p>
<ul><li><b>Supabase:</b> authentication, database, and file storage.</li>
<li><b>Stripe:</b> payment processing and checkout.</li>
<li><b>Resend:</b> sending account and signing emails.</li>
<li><b>Vercel:</b> website hosting, serverless computing, and cookie-free analytics.</li>
<li><b>xAI:</b> answering questions typed into the help chat (only the chat messages are sent).</li>
<li><b>Twilio:</b> phone verification by text message, only if that feature is turned on.</li></ul>
<p>We may also disclose information if required by law, to protect the rights and safety of users or the public, or as part of a sale or transfer of the service.</p>
<h2>Who can see a document</h2>
<p>A document is visible to the sender and to the people the sender adds as signers or recipients. Anyone with a document’s verification link can see its name, completion date, and SHA-256 fingerprints, but not its contents.</p>
<h2>Retention</h2>
<p>We keep your account, documents, and audit records while your account is open, so that you and your signers can download them. You can delete drafts and templates from your dashboard. Sent and completed documents stay in your account to preserve the audit trail; to have them deleted, ask us to close your account or contact us about specific documents. Signers should download their copy when a document is completed, because the sender controls whether it stays in the service. We keep payment records and limited audit or fraud-prevention records for as long as needed for accounting, legal, and security purposes.</p>
<h2>Account deletion</h2>
<p>To close your account and delete your documents, send a request through our <a href="/contact">contact form</a> from your account email. We’ll confirm the request and delete your account data within 30 days, except records we must keep as described above. Copies that signers already downloaded aren’t affected.</p>
<h2>Security</h2>
<p>Data is encrypted in transit, signing links use long random tokens, and access to stored documents requires your account or a valid signing link. No system is perfectly secure, so please protect your password and signing links.</p>
<h2>Your choices and rights</h2>
<p>You can update your account details, delete drafts and templates, or ask us for a copy, correction, or deletion of your personal information through the <a href="/contact">contact form</a>. Depending on where you live, you may have additional rights under local law; we’ll honor requests as the law requires.</p>
<h2>Children</h2>
<p>The service isn’t meant for children under 13 (or the minimum age in your country), and we don’t knowingly collect their information.</p>
<h2>Changes</h2>
<p>We may update this policy. We’ll change the “Last updated” date and, for significant changes, notify account holders by email or on the site.</p>
<h2>Contact</h2>
<p>Questions about privacy? Use our <a href="/contact">contact form</a>.</p>`)
}

export const TERMS = {
  path: '/terms',
  title: 'Terms of Service | Easy Digital Signatures',
  description: 'The terms for using Easy Digital Signatures, including electronic consent, acceptable use, credits and refunds, and limitation of liability.',
  eyebrow: 'Legal', crumb: 'Terms of service', h1: 'Terms of service',
  lede: UPDATED,
  compactHero: true, noHeroCta: true, noBottomCta: true,
  body: doc(`<p>These terms govern your use of Easy Digital Signatures at easydigitalsignatures.com (“the service”), operated by the owner of this website (“we”, “us”). By creating an account, sending a document, or signing a document, you agree to these terms and to our <a href="/privacy">privacy policy</a>.</p>
<h2>1. The service</h2>
<p>The service lets account holders upload documents, place fields, send them to others for electronic signature, and download completed PDFs with an audit certificate. Signers don’t need an account. We may change, add, or remove features over time.</p>
<h2>2. Consent to do business electronically</h2>
<p>By using the service, you agree to receive records, notices, and disclosures electronically and to sign documents with electronic signatures, which you intend to have the same effect as handwritten signatures under the U.S. Electronic Signatures in Global and National Commerce Act (ESIGN) and state laws based on the Uniform Electronic Transactions Act (UETA). Signers confirm this consent on the signing page before they sign.</p>
<p>To use the service you need a device with a current web browser, an email address, and the ability to view and save PDF files. You may ask the sender of a document for a paper copy, and you may withdraw your consent to electronic signing by not signing, declining the document, or contacting the sender. Withdrawing consent doesn’t affect documents already signed.</p>
<h2>3. Your responsibilities</h2>
<ul><li>You’re responsible for the content of documents you send and for getting any consents or disclosures the law requires from your signers.</li>
<li>Some documents can’t be signed electronically or need extra steps such as notarization, witnesses, or specific delivery methods. Deciding whether electronic signing is appropriate for a document is your responsibility.</li>
<li>Keep your password and signing links confidential. You’re responsible for activity in your account.</li>
<li>Give accurate information and use your real name and email address.</li></ul>
<h2>4. Acceptable use</h2>
<p>You may not use the service to:</p>
<ul><li>break any law or help anyone else break it, including fraud, forgery, or impersonation;</li>
<li>send spam, phishing, malware, or documents to people who didn’t expect them;</li>
<li>upload content that infringes others’ rights or is abusive, harassing, or exploitative;</li>
<li>create multiple accounts or use other tricks to get more free documents, or abuse promo codes;</li>
<li>probe, overload, scrape, or interfere with the service or its security.</li></ul>
<p>We may suspend or close accounts and void pending documents that violate these terms.</p>
<h2>5. Payments, credits, and refunds</h2>
<ul><li>Your first document may be free, subject to fraud-prevention checks. After that, sending a document uses one credit.</li>
<li>Credits are sold in packs at the prices shown on the site when you buy. Payments are processed by Stripe. Prices may change, but changes don’t affect credits you already bought.</li>
<li><b>Credits are non-refundable once used.</b> If you believe you were charged in error, or want to ask about a refund of unused credits, contact us within 30 days of purchase and we’ll review it.</li>
<li>Credits have no cash value and can’t be transferred between accounts. Promotional credits may be limited, may expire, and may be turned off at any time.</li>
<li>Voiding, expiring, or declining a sent document doesn’t return its credit, unless the site says otherwise.</li></ul>
<h2>6. Your content</h2>
<p>You keep ownership of your documents. You give us permission to store, process, and transmit them only as needed to provide the service. See the <a href="/privacy">privacy policy</a> for retention and deletion.</p>
<h2>7. Not legal advice</h2>
<p>We provide software, not legal services. Guides and information on the site are general and aren’t legal advice. We don’t provide legal forms and aren’t a party to the agreements you sign.</p>
<h2>8. Availability</h2>
<p>We work to keep the service available, but it may be interrupted for maintenance, outages, or reasons beyond our control. Download and keep copies of your completed documents.</p>
<h2>9. Disclaimer of warranties</h2>
<p>The service is provided “as is” and “as available”, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement, to the fullest extent the law allows. We don’t warrant that any document signed through the service will be enforceable in every situation.</p>
<h2>10. Limitation of liability</h2>
<p>To the fullest extent the law allows, we won’t be liable for any indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, or business opportunities, arising from your use of the service. Our total liability for any claim relating to the service is limited to the amount you paid us in the 12 months before the claim, or $50 if you paid nothing. Some places don’t allow these limits, so they may not apply to you.</p>
<h2>11. Indemnity</h2>
<p>You agree to defend and hold us harmless from claims arising from documents you send, your violation of these terms, or your violation of anyone else’s rights.</p>
<h2>12. Termination</h2>
<p>You can stop using the service and ask us to close your account at any time. We may suspend or end access for violations of these terms or to protect the service. Sections that by their nature should survive termination, including payments, disclaimers, limitation of liability, and indemnity, will survive.</p>
<h2>13. Changes</h2>
<p>We may update these terms. We’ll change the “Last updated” date and, for significant changes, notify account holders. Continuing to use the service after changes take effect means you accept them.</p>
<h2>14. Contact</h2>
<p>Questions about these terms? Use our <a href="/contact">contact form</a>.</p>`)
}
