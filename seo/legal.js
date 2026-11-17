// Privacy policy and terms of service. Have a licensed attorney review before relying on them.
// Versions and dated changes: seo/legal-more.js (POLICY_VERSIONS) and /legal/changelog.
export const OPERATOR = 'Boreal MT LLC'
const UPDATED = 'Version 2026-11-16 · Last updated Nov 16, 2026 · <a href="/legal/changelog">Changelog</a>'
export const SUPPORT_EMAIL = 'support@easydigitalsignatures.com'
const MAIL = `<a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>`
const doc = inner => `<article class="card"><div class="prose"><p class="byline">${UPDATED}</p>${inner}</div></article>`

export const PRIVACY = {
  path: '/privacy',
  title: 'Privacy Policy | Easy Digital Signatures',
  description: 'How Easy Digital Signatures collects, uses, stores, and deletes personal information and documents, which subprocessors handle it, and your California privacy rights.',
  eyebrow: 'Legal', crumb: 'Privacy policy', h1: 'Privacy policy',
  lede: UPDATED,
  compactHero: true, noHeroCta: true, noBottomCta: true,
  body: doc(`<p>This policy explains what information Easy Digital Signatures (“we”, “us”, “the service”) collects when you use easydigitalsignatures.com, how we use it, and the choices you have. The service is operated by <b>Boreal MT LLC</b> (“Boreal MT”), a limited liability company, which is responsible for your information under this policy.</p>
<h2>Information we collect</h2>
<h3>Account holders (senders)</h3>
<ul><li><b>Account details:</b> your name, email address, and password. Passwords are handled by our authentication provider and we never see them in plain text.</li>
<li><b>Documents and signing data:</b> files you upload (including a file you choose from Google Drive or Dropbox, if you use those buttons), fields you place, signer names and email addresses you enter, messages, templates, and branding such as a logo or company name. If you pick a file from Google Drive or Dropbox, those companies’ file pickers run in your browser, and we receive only the file you select.</li>
<li><b>Purchases:</b> which credit packs you bought, amounts, and payment status. Card details are entered on Stripe’s checkout page and are not stored by us.</li>
<li><b>Support:</b> messages you send through the contact form and questions you type into the help chat.</li></ul>
<h3>Signers</h3>
<ul><li>Your name and email address (provided by the sender), the signatures, initials, and other values you enter, and any reason you give for declining.</li></ul>
<h3>Everyone</h3>
<ul><li><b>Audit and security data:</b> IP address, browser user agent, timestamps of viewing, signing, and other actions, and device identifiers. These go into the document’s audit certificate and help prevent abuse of the free document.</li>
<li><b>Cookies and local storage:</b> we use a first-party cookie and browser storage to keep you signed in and to recognize a device for fraud prevention. We don’t use advertising cookies.</li>
<li><b>Analytics:</b> we use Vercel Web Analytics and Vercel Speed Insights, which count page views and measure page speed without cookies. We also record first-party events such as page views, clicks on sign-up buttons, signups, and purchases. To count unique visitors, your browser keeps a random visitor ID in local storage (not a cookie). Each event stores a salted one-way hash of your IP address, never the raw IP. We use the hash only to count visitors and to leave our own visits out of the numbers. If you’re part of our team, an <code>eds_internal</code> cookie marks your browser so your visits aren’t counted. We don’t use these events for advertising, and we don’t combine them with your account.</li>
<li><b>Email delivery events:</b> signing, reminder, and completion emails are sent through Resend, which tells us when a message is accepted, delivered, delayed, bounced, or marked as spam. These emails also contain a small tracking image, so we may learn when one is first opened. Some mail apps load images automatically, so an “opened” event doesn’t prove a person read the email. These events are added to the document’s audit trail.</li>
<li><b>Two-factor authentication:</b> if you turn it on, we store an encrypted authenticator secret and one-way hashes of your recovery codes.</li></ul>
<h2>How we use information</h2>
<ul><li>To provide the service: store documents, send signing links, reminders, and completion emails, and produce signed PDFs with audit certificates.</li>
<li>To process payments and keep your credit balance.</li>
<li>To prevent fraud and abuse, including limiting the free document to one per person.</li>
<li>To answer support requests and improve the service.</li>
<li>To meet legal obligations.</li></ul>
<p>We don’t sell personal information, we don’t share it for cross-context behavioral advertising, and we don’t use your documents to train AI models.</p>
<h2>Data processing summary and subprocessors</h2>
<p>We act as the business (controller) for account data, and process documents and signer data on behalf of the sender who uploads them. Business customers can use our <a href="/dpa">Data Processing Addendum</a>. The current list, with links to each provider’s security and compliance pages, is on our <a href="/subprocessors">subprocessors page</a>. We use these subprocessors to run the service, each under its own terms and security program. Data is processed in the United States.</p>
<div class="tbl-wrap"><table><thead><tr><th>Subprocessor</th><th>Purpose</th><th>Data involved</th></tr></thead><tbody>
<tr><td><b>Vercel</b></td><td>Website hosting, serverless computing, cookie-free analytics</td><td>Requests, IP addresses, page views, data passing through the app</td></tr>
<tr><td><b>Supabase</b></td><td>Authentication, database, file storage</td><td>Account details, documents, signing data, audit records</td></tr>
<tr><td><b>Resend</b></td><td>Sending account, signing, reminder, and completion emails</td><td>Names, email addresses, email content</td></tr>
<tr><td><b>Stripe</b></td><td>Payment processing and checkout</td><td>Purchase details, billing email, payment card data (handled by Stripe)</td></tr>
</tbody></table></div>
<p>We also use <b>xAI</b> to answer questions typed into the help chat (only the chat messages are sent) and <b>Twilio</b> for phone verification by text message, only if that feature is turned on. We may disclose information if required by law, to protect the rights and safety of users or the public, or as part of a sale or transfer of the service.</p>
<h2>Who can see a document</h2>
<p>A document is visible to the sender and to the people the sender adds as signers or recipients. Anyone with a document’s verification link can see its name, completion date, and SHA-256 fingerprints, but not its contents.</p>
<h2 id="retention">Retention</h2>
<p>Our full <a href="/court-evidence#retention">records retention policy</a> is on the court evidence page. In short:</p>
<ul><li><b>Documents (PDF files and the values typed into fields):</b> kept while your account is open, so you and your signers can download them. You control deletion. You can delete drafts and templates at any time. For a completed, declined, expired, or voided document, use <b>Delete files, keep audit record</b> on its certificate page. That deletes the stored PDF files and field values right away.</li>
<li><b>Audit-trail records:</b> for every document that was sent, we keep the audit trail and a summary record: document name and ID, SHA-256 fingerprints, signer names, email addresses, roles, IP addresses, browsers, consent text and version, timestamps, and email delivery events. We keep this for <b>at least 7 years</b> after the document was completed (or after the snapshot was taken, for documents that were never completed), even if you delete the document’s files or close your account. Longer if the law, a court order, or a pending dispute requires it. We keep it so that signed documents can still be verified and so that we can respond to legal requests.</li>
<li><b>Payment records:</b> kept as long as tax and accounting law requires (generally 7 years).</li>
<li><b>Security and fraud-prevention records</b> (such as rate-limit entries and free-document claims): kept for as long as needed to prevent abuse.</li>
<li><b>Server error logs:</b> deleted after about 30 days.</li></ul>
<p>Signers should download their copy when a document is completed, because the sender controls whether the files stay in the service.</p>
<h2>Account deletion</h2>
<p>To close your account and delete your documents, send a request through our <a href="/contact">contact form</a> from your account email. We’ll confirm the request and delete your account, documents, and files within 30 days. We keep the audit-trail records and payment records described in “Retention”. Copies that signers already downloaded aren’t affected.</p>
<h2>Security</h2>
<p>Data is encrypted in transit (HTTPS/TLS) and at rest by our hosting and database providers. Signing links use long random tokens, sensitive field values are encrypted again by our application, you can turn on two-factor authentication, and access to stored documents requires your account or a valid signing link. See our <a href="/security">security page</a>. No system is perfectly secure, so please protect your password and signing links.</p>
<h2>Your choices and rights</h2>
<p>You can update your account details, delete drafts and templates, or ask us for a copy, correction, or deletion of your personal information through the <a href="/contact">contact form</a>. Depending on where you live, you may have additional rights under local law; we’ll honor requests as the law requires.</p>
<h2 id="california">Your California privacy rights (CCPA/CPRA)</h2>
<p>If you are a California resident, the California Consumer Privacy Act, as amended by the California Privacy Rights Act, gives you these rights, subject to legal exceptions:</p>
<ul><li><b>Right to know and access:</b> the categories and specific pieces of personal information we collected about you, the sources, the purposes, and the categories of third parties we disclose it to.</li>
<li><b>Right to delete</b> personal information we collected from you.</li>
<li><b>Right to correct</b> inaccurate personal information.</li>
<li><b>Right to opt out of sale or sharing:</b> we don’t sell personal information or share it for cross-context behavioral advertising, and haven’t done so in the past 12 months.</li>
<li><b>Right to limit use of sensitive personal information:</b> we use account login credentials only to provide the service, and don’t use sensitive personal information to infer characteristics about you.</li>
<li><b>Right to non-discrimination:</b> we won’t treat you differently for exercising these rights.</li></ul>
<p><b>Categories we collect</b> (described above): identifiers (name, email, IP address, device identifiers), commercial information (purchases), internet activity (audit and usage events), documents and signatures you provide, and account login credentials. We collect them from you, from senders who add you as a signer, and automatically from your device, for the purposes listed in “How we use information”, and disclose them only to the subprocessors listed above. We keep each category for the periods described in “Retention”.</p>
<p><b>Retention by category:</b> account identifiers and login data are kept while your account is open. Documents and field values are kept until you delete them or close your account. Audit-trail records, including identifiers and internet activity tied to a signing, are kept for at least 7 years after completion. Commercial (purchase) information is kept for about 7 years for tax and accounting. More detail is in “Retention” above.</p>
<p><b>Exceptions to deletion:</b> the law lets us keep some information after a deletion request. Examples are records needed to complete a transaction, detect security incidents or fraud, comply with a legal obligation, or establish, exercise, or defend legal claims. Signing audit trails fall under these exceptions, so we keep them for the retention period even after a deletion request, and we tell you when that applies.</p>
<p><b>Global Privacy Control:</b> we don’t sell or share personal information, so there is nothing to opt out of. We still treat a browser’s Global Privacy Control signal as a valid opt-out request.</p>
<p><b>How to make a request:</b> use our <a href="/contact">contact form</a> or email ${MAIL}. We’ll verify your request by confirming control of your account email, and respond within 45 days (extendable by 45 more days where the law allows). An authorized agent may submit a request with your signed permission, and we may ask you to confirm your identity directly. For documents a sender uploaded, we may refer your request to that sender.</p>
<h2>Children</h2>
<p>The service is only for people 18 and older. We don’t knowingly collect personal information from anyone under 18, and we’ll delete it if we learn we have.</p>
<h2>Changes</h2>
<p>We may update this policy. We’ll change the “Last updated” date and, for significant changes, notify account holders by email or on the site.</p>
<h2>Contact</h2>
<p>Questions about privacy? Use our <a href="/contact">contact form</a> or email ${MAIL}. Boreal MT LLC operates Easy Digital Signatures.</p>`)
}

export const TERMS = {
  path: '/terms',
  title: 'Terms of Service | Easy Digital Signatures',
  description: 'The terms for using Easy Digital Signatures: acceptance by use, electronic consent, excluded documents, acceptable use, credits and refunds, liability limits, arbitration, and more.',
  eyebrow: 'Legal', crumb: 'Terms of service', h1: 'Terms of service',
  lede: UPDATED,
  compactHero: true, noHeroCta: true, noBottomCta: true,
  body: doc(`<p>These terms govern your use of Easy Digital Signatures at easydigitalsignatures.com (“the service”), operated by <b>Boreal MT LLC</b>, a limited liability company (“Boreal MT”, “we”, “us”). Boreal MT LLC is the only party providing the service and the only party to these Terms on our side. These terms apply together with our <a href="/privacy">privacy policy</a>, <a href="/acceptable-use">Acceptable Use Policy</a>, and, for business customers who use it, our <a href="/dpa">Data Processing Addendum</a>.</p>
<div class="note" id="acceptance" role="note"><h2 style="margin-top:0">Acceptance of Terms</h2>
<p><b>By accessing or using this website or any of our services in any way, whether free or paid, you accept these Terms, including the disclaimers, limitation of liability, time limit for claims, indemnity, and arbitration agreement below.</b> This includes simply visiting the site; using the free signature generator or any other free tool; sending a free document; using an account with free, trial, or promotional credits; signing, reviewing, approving, or declining a document as a signer or approver, even if you never create an account; using our API, webhooks, or other developer features; and buying or using paid credits.</p>
<p>If you don’t agree, don’t access or use the site or services. If you use the services on behalf of a business or other organization, you accept these Terms for it and confirm you have authority to do so.</p>
<p style="margin-bottom:0"><b>Arbitration notice:</b> Section 19 requires most disputes to be resolved by binding individual arbitration and waives class actions and jury trials. You can opt out within 30 days, as explained in Section 19.</p></div>
<h2>1. The service</h2>
<p>The service lets account holders upload documents, place fields, send them to others for electronic signature or approval, and download completed PDFs with an audit certificate. Signers don’t need an account. We may change, add, or remove features over time.</p>
<h2>2. Eligibility</h2>
<p>You must be at least 18 years old and able to form a binding contract to use the service, including to sign a document. By using the service, you confirm that you meet these requirements. We may close any account we believe belongs to someone under 18.</p>
<h2>3. Consent to do business electronically</h2>
<p>By using the service, you agree to receive records, notices, and disclosures electronically and to sign documents with electronic signatures, which you intend to have the same effect as handwritten signatures under the U.S. Electronic Signatures in Global and National Commerce Act (ESIGN) and state laws based on the Uniform Electronic Transactions Act (UETA). Signers confirm this consent on the signing page before they sign.</p>
<p>To use the service you need a device with a current web browser, an email address, and the ability to view and save PDF files. You may ask the sender of a document for a paper copy, and you may withdraw your consent to electronic signing by not signing, declining the document, or contacting the sender. Withdrawing consent doesn’t affect documents already signed.</p>
<h2>4. We are a platform only</h2>
<ul><li><b>Not a party.</b> We provide software that lets you send and sign documents. We aren’t a party to any document, agreement, or transaction made through the service, and we have no obligations under them.</li>
<li><b>Not a law firm; no legal advice.</b> Boreal MT LLC is not a law firm, doesn’t practice law, and doesn’t provide legal services, legal forms, or legal advice. No attorney-client relationship is created by using the service, by contacting us, or by any records request. Guides, templates, and other information on the site are general and aren’t a substitute for advice from a lawyer licensed where you are.</li>
<li><b>No identity verification.</b> We don’t verify the identity, authority, or capacity of senders, signers, or approvers. An email address or phone number on a document doesn’t confirm who used it.</li>
<li><b>Enforceability is your responsibility.</b> You alone are responsible for deciding whether electronic signing is valid and appropriate for your document type, your signers, and every place where the document will be used. You’re also responsible for following any laws that apply to it, for any consumer disclosures those laws require, and for whether it is valid and enforceable. We don’t promise that any electronic signature or record will be legally binding or admissible in every case.</li></ul>
<h2>5. Documents you may not sign with the service</h2>
<p>Don’t use the service for documents that the law excludes from electronic signing or that need special formalities, including:</p>
<ul><li>wills, codicils, and testamentary trusts, and other trusts where electronic signing isn’t allowed;</li>
<li>family-law documents, such as those for adoption, divorce, child custody, or other family matters;</li>
<li>court orders, notices, and official court documents, including briefs, pleadings, and other writings required to be executed in connection with court proceedings;</li>
<li>notices of cancellation or termination of utility services (including water, heat, and power);</li>
<li>notices of default, acceleration, repossession, foreclosure, or eviction, or the right to cure, under a credit agreement secured by or a rental agreement for a primary residence;</li>
<li>notices of cancellation or termination of health or life insurance benefits (other than annuities);</li>
<li>product recall notices and notices of material failure of a product that risks health or safety;</li>
<li>documents required to accompany the transport or handling of hazardous materials, pesticides, or other toxic or dangerous materials; and</li>
<li>any other document excluded from electronic signing under ESIGN, UETA as adopted in the relevant state, or other applicable law, or that requires notarization, witnesses, or delivery methods the service doesn’t provide. The service doesn’t provide notarization.</li></ul>
<p><b>Check local law.</b> These lists aren’t complete, and the rules differ by state and country. Some states also restrict specific documents, such as certain real-estate, insurance, or consumer-credit notices. Before you use the service for a document, check with a lawyer licensed where you are if you aren’t sure. Our <a href="/electronic-signature-laws-by-state">state law summary</a> is general information, not advice.</p>
<h2>6. Your responsibilities</h2>
<ul><li>You’re responsible for the content of documents you send and for getting any consents or disclosures the law requires from your signers.</li>
<li>Keep your password and signing links confidential. You’re responsible for activity in your account.</li>
<li>Give accurate information and use your real name and email address.</li>
<li>Download and keep copies of your completed documents.</li></ul>
<h2>7. Acceptable use and abuse policy</h2>
<p>You may not use the service to:</p>
<ul><li>commit or help anyone commit fraud, forgery, or identity theft, or sign or send a document in someone else’s name without their authority;</li>
<li>impersonate any person or organization, or misrepresent your affiliation with them;</li>
<li>upload, send, or store illegal content, or content that is defamatory, threatening, harassing, hateful, obscene, or exploits minors;</li>
<li>infringe anyone’s copyright, trademark, privacy, or other rights;</li>
<li>send spam, phishing, malware, or documents to people who didn’t expect them;</li>
<li>break any law or help anyone else break it;</li>
<li>create multiple accounts or use other tricks to get more free documents, or abuse promo codes;</li>
<li>probe, overload, scrape, reverse engineer, or interfere with the service or its security.</li></ul>
<p>Our full <a href="/acceptable-use">Acceptable Use Policy</a> is part of these Terms. We may, at our discretion and without notice or refund, investigate suspected violations, remove content, void pending documents, suspend or close accounts, forfeit credits obtained through abuse, and report activity to law enforcement. To report abuse, use our <a href="/contact">contact form</a> or email ${MAIL}.</p>
<h2>8. Payments, credits, and refunds</h2>
<ul><li>Your first document may be free, subject to fraud-prevention checks. After that, sending a document uses one credit.</li>
<li>Credits are sold in packs at the prices shown on the site when you buy. Payments are processed by Stripe. Prices may change, but changes don’t affect credits you already bought.</li>
<li><b>Credits are non-refundable once used.</b> If you believe you were charged in error, or want to ask about a refund of unused credits, contact us within 30 days of purchase and we’ll review it.</li>
<li>Credits have no cash value and can’t be transferred between accounts. Promotional credits may be limited, may expire, and may be turned off at any time.</li>
<li>Voiding, expiring, or declining a sent document doesn’t return its credit, unless the site says otherwise.</li></ul>
<h2>9. Your content</h2>
<p>You keep ownership of your documents. You give us permission to store, process, and transmit them only as needed to provide the service. See the <a href="/privacy">privacy policy</a> for retention and deletion.</p>
<h2>10. Copyright complaints (DMCA)</h2>
<p>We respect intellectual property rights and respond to notices of alleged infringement under the Digital Millennium Copyright Act (17 U.S.C. § 512). Boreal MT LLC’s designated agent to receive notices is registered with the U.S. Copyright Office (designation number DMCA-1086348) and can be reached at ${MAIL}, subject line “DMCA Notice”. A notice must include:</p>
<ol><li>your physical or electronic signature;</li>
<li>identification of the copyrighted work you claim is infringed;</li>
<li>identification of the material you claim is infringing, with enough information for us to locate it;</li>
<li>your name, address, telephone number, and email address;</li>
<li>a statement that you have a good-faith belief that the use isn’t authorized by the copyright owner, its agent, or the law; and</li>
<li>a statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on the owner’s behalf.</li></ol>
<p>When we receive a valid notice, we will remove or disable access to the material and notify the user who provided it. That user may send a counter-notice to the same address with their signature, identification of the removed material and where it appeared, a statement under penalty of perjury that they have a good-faith belief it was removed by mistake or misidentification, and their name, address, telephone number, and consent to the jurisdiction of the federal court for their district (or, outside the U.S., any district where we may be found). We may restore the material 10 to 14 business days after receiving a valid counter-notice unless the complaining party tells us it has filed a court action. We will terminate the accounts of repeat infringers in appropriate circumstances. Knowingly false notices or counter-notices may create liability under 17 U.S.C. § 512(f).</p>
<h2>11. Tamper evidence, audit trail, and records</h2>
<p>Completed documents include an audit trail of key events, with UTC timestamps, IP addresses, and browser details. These events include sending, email delivery, viewing, consent, signing, and declining. Completed documents also include SHA-256 fingerprints that can be used to detect later changes to the file, and audit events are hash-chained. We keep audit-trail records as described in our <a href="/court-evidence#retention">retention policy</a>. On request, and subject to <a href="/court-evidence">our records process</a>, Boreal MT LLC may provide a business-records certification about the records we hold. These features and records are supporting evidence only, provided “as is”. We don’t guarantee that they will be accepted by any court or other party, that they prove a signer’s identity, authority, or intent, or that a document is valid. Keep your own copies.</p>
<p><b>Legal process.</b> We may disclose records in response to a valid subpoena, court order, or other legal process, or to protect the rights and safety of users, the public, or Boreal MT LLC. Where the law allows, we’ll try to tell the affected account holder first. We may charge reasonable costs for producing records and for any certification or testimony, and we don’t provide expert or legal opinions.</p>
<h2>12. Availability</h2>
<p>We work to keep the service available, but it may be interrupted for maintenance, outages, or reasons beyond our control. We describe our security practices on our <a href="/security">security page</a>. You’re responsible for protecting your password, for turning on two-factor authentication if you want that protection, and for activity in your account.</p>
<h2>13. Disclaimer of warranties</h2>
<p>In Sections 13 to 15, “we” and “us” mean Boreal MT LLC and its members, managers, officers, employees, contractors, and agents (together, the “Boreal MT Parties”). This section applies to everyone who uses the site or services, including free, trial, promotional, signer, and API use. The service is provided “as is” and “as available”, without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, title, and non-infringement, to the fullest extent the law allows. We don’t warrant that the service will be uninterrupted, secure, or error-free, or that any document signed through the service will be valid or enforceable in any situation.</p>
<h2>14. Limitation of liability</h2>
<p>This section applies to every user and every kind of use, whether free or paid, including visitors, users of free tools, free-document and promotional-credit users, signers and approvers without an account, and API users. To the fullest extent the law allows, we won’t be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenue, data, or business opportunities, arising from your use of the service or any document signed through it, even if we were told they were possible. Our total liability for all claims relating to the site or services, combined, is limited to the greater of (a) $50 or (b) the amount you paid us in the 12 months before the event giving rise to the claim. If you paid nothing, including if you used only free or promotional features, our total liability is limited to $50. These limits apply to all Boreal MT Parties together, not to each of them, and they apply even if a remedy fails of its essential purpose. Some places don’t allow these limits, so they may not apply to you.</p>
<p><b>Claims only against the company.</b> Boreal MT LLC is a limited liability company. You agree that any claim relating to the site or the services may be brought only against Boreal MT LLC. You agree not to bring a claim against any of its members, managers, officers, employees, contractors, or agents personally, to the fullest extent the law allows.</p>
<h2>15. Indemnity</h2>
<p>This section applies to every user, whether free or paid. You agree to defend, indemnify, and hold harmless the Boreal MT Parties from all claims, demands, losses, liabilities, damages, fines, and expenses, including reasonable attorneys’ fees and the cost of responding to subpoenas or records requests. This covers anything arising from or relating to documents you send, sign, or ask others to sign, and your content. It also covers your use of the service, any dispute between you and a signer, sender, or other third party, your violation of these Terms or the <a href="/acceptable-use">Acceptable Use Policy</a>, and your violation of any law or anyone else’s rights. We may take control of the defense of any claim at your expense, and you won’t settle a claim that affects us without our written consent.</p>
<h2>16. Termination</h2>
<p>You can stop using the service and ask us to close your account at any time. We may suspend or end access for violations of these terms or to protect the service. Sections that by their nature should survive termination, including payments, platform-only terms, disclaimers, limitation of liability, indemnity, the time limit for claims, and dispute resolution, will survive.</p>
<h2>17. Time limit to bring claims</h2>
<p>To the fullest extent permitted by law, any claim or cause of action arising out of or relating to the site, the services, or these Terms must be filed within six (6) months after the claim or cause of action arises, or it is permanently barred. This limit applies to claims brought in arbitration, in small claims court, and in any other forum. If this six-month period is held unenforceable for a particular claim, the claim must be filed within the shortest period permitted by applicable law.</p>
<h2>18. Governing law and venue</h2>
<p>These Terms and any dispute arising out of or relating to them or the service are governed by the laws of the State of California, without regard to its conflict-of-law rules, except that the Federal Arbitration Act governs Section 19. Any dispute that isn’t subject to arbitration, and any action to compel arbitration or to confirm or vacate an award, must be brought exclusively in the state or federal courts located in San Diego County, California, and you and we consent to the personal jurisdiction of those courts.</p>
<h2 id="arbitration">19. Dispute resolution: binding arbitration and waivers</h2>
<p><b>Please read this section carefully. It affects your rights.</b></p>
<ul><li><b>Arbitration.</b> Except as stated below, you and we agree that any dispute, claim, or controversy arising out of or relating to these Terms, the site, or the service, including questions about the scope or enforceability of this section, will be resolved only by final and binding individual arbitration administered by the American Arbitration Association (AAA) under its Consumer Arbitration Rules then in effect (available at adr.org). Payment of filing, administration, and arbitrator fees will follow those rules. The arbitration may be held by video, phone, or written submissions, or in person in San Diego County, California or the county where you live. The arbitrator may award the same individual relief a court could, but only to the individual party seeking relief and only as needed for that party’s individual claim.</li>
<li><b>Class-action waiver.</b> You and we may bring claims against each other only in an individual capacity, not as a plaintiff or class member in any purported class, collective, consolidated, or representative proceeding. The arbitrator may not consolidate claims of more than one person or preside over any class or representative proceeding.</li>
<li><b>Jury-trial waiver.</b> To the extent any dispute proceeds in court rather than arbitration, you and we waive any right to a jury trial.</li>
<li><b>Small claims.</b> Either party may instead bring an individual claim in small claims court in San Diego County, California or the county where you live, if it qualifies and stays there on an individual basis.</li>
<li><b>Intellectual property and injunctions.</b> Either party may seek an injunction in court to stop actual or threatened infringement or misuse of intellectual property or unauthorized access to the service.</li>
<li><b>30-day opt-out.</b> You may opt out of this arbitration agreement by emailing ${MAIL} within 30 days after you first accept these Terms (for example, by first using the site), with the subject line “Arbitration Opt-Out” and your name and the email address you use with the service. Opting out doesn’t affect any other part of these Terms, including the class-action waiver, the jury-trial waiver, and the time limit for claims.</li>
<li><b>If something is unenforceable.</b> If the class-action waiver is found unenforceable for a claim, that claim (and only that claim) will be decided in court under Section 18, not in arbitration. If any claim for public injunctive relief can’t be arbitrated under applicable law, it will be decided in court after any arbitrable claims are resolved. If any other part of this section is found unenforceable, the rest of it remains in effect.</li>
<li><b>Changes.</b> If we change this section, the change won’t apply to a dispute we already had notice of before the change took effect.</li></ul>
<h2>20. Force majeure</h2>
<p>We aren’t liable for any delay or failure to perform caused by events beyond our reasonable control, including natural disasters, fire, flood, pandemics, war, terrorism, civil unrest, labor disputes, government action, power or internet failures, failures of hosting, email, payment, or other third-party providers, and cyberattacks.</p>
<h2>21. General terms</h2>
<ul><li><b>Entire agreement.</b> These Terms, together with our privacy policy and any terms shown at checkout, are the entire agreement between you and us about the service and replace any earlier agreements or statements about it.</li>
<li><b>No waiver.</b> If we don’t enforce a provision, or delay enforcing it, that doesn’t waive our right to enforce it later.</li>
<li><b>Assignment.</b> You may not assign or transfer these Terms or your account without our written consent. We may assign or transfer these Terms, in whole or in part, without your consent, including in connection with a merger, acquisition, or sale of the service.</li>
<li><b>Severability.</b> If any part of these Terms is held invalid or unenforceable, that part will be enforced to the maximum extent permitted and modified only as much as needed to make it enforceable, and the rest of these Terms will remain in full effect.</li>
<li><b>Third-party beneficiaries.</b> The Boreal MT Parties may enforce Sections 13 to 15 and Section 19. Otherwise, these Terms don’t give rights to anyone other than you and Boreal MT LLC.</li>
<li><b>Notices.</b> We may give you notices by email to your account address or by posting them on the site.</li></ul>
<h2>22. Changes to these terms</h2>
<p>We may modify these Terms at any time by posting the updated version on this page and changing the “Last updated” date. For significant changes, we’ll also try to notify account holders by email or on the site. Changes take effect when posted unless we say otherwise. Your continued access to or use of the site or services after changes take effect means you accept the updated Terms. If you don’t agree, stop using the site and services. Each version has a version number, and dated changes are listed in our <a href="/legal/changelog">legal changelog</a>. When you create an account, we record the version you accepted and the time.</p>
<h2>23. Contact</h2>
<p>Questions about these terms? Use our <a href="/contact">contact form</a> or email ${MAIL}. Records requests and legal process: <a href="mailto:legal@easydigitalsignatures.com">legal@easydigitalsignatures.com</a> (see <a href="/court-evidence">court evidence</a>). Easy Digital Signatures is operated by Boreal MT LLC.</p>`)
}
