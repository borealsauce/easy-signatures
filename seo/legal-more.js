// Security, court evidence and retention, DPA, Acceptable Use, subprocessors, legal index and changelog, and /verify.
// Every statement here must match what the code does. Versions are listed in POLICY_VERSIONS and on /legal/changelog.
import { CONSENT_VERSION, CONSENT_HISTORY } from '../shared/consent.js'
import { TERMS_VERSION } from '../shared/terms.js'
import { RETENTION_YEARS } from '../server/evidence.js'

const OP = 'Boreal MT LLC'
const SUPPORT = '<a href="mailto:support@easydigitalsignatures.com">support@easydigitalsignatures.com</a>'
const SECURITY = '<a href="mailto:security@easydigitalsignatures.com">security@easydigitalsignatures.com</a>'
const LEGAL = '<a href="mailto:legal@easydigitalsignatures.com">legal@easydigitalsignatures.com</a>'
const wrap = (version, inner) => `<article class="card"><div class="prose"><p class="byline">Version ${version} · Last updated Nov 16, 2026 · <a href="/legal/changelog">Changelog</a></p>${inner}</div></article>`
const base = { eyebrow: 'Legal', compactHero: true, noHeroCta: true, noBottomCta: true }

export const POLICY_VERSIONS = [
  ['Terms of Service', '/terms', TERMS_VERSION],
  ['Privacy Policy', '/privacy', '2026-11-16'],
  ['Acceptable Use Policy', '/acceptable-use', '2026-11-16'],
  ['Data Processing Addendum', '/dpa', '2026-11-16'],
  ['Subprocessors', '/subprocessors', '2026-11-16'],
  ['Security', '/security', '2026-11-16'],
  ['Court evidence and records retention', '/court-evidence', '2026-11-16'],
  ['Signer consent text', '/legal/changelog#consent', CONSENT_VERSION]
]

export const SUBPROCESSORS = [
  ['Vercel', 'Website hosting and serverless computing (US, San Francisco region), cookie-free analytics', 'Requests, IP addresses, page views, data passing through the app', 'https://vercel.com/security', 'Vercel lists ISO 27001, SOC 2, PCI DSS, and HIPAA on its security page, and says data is encrypted at rest (AES-256) and in transit.'],
  ['Supabase', 'Database, file storage, and sign-in (authentication)', 'Account details, documents, signing data, audit records', 'https://supabase.com/security', 'Supabase says it is SOC 2 Type 2 compliant and ISO 27001 certified, and that all customer data is encrypted at rest with AES-256 and in transit with TLS.'],
  ['Resend', 'Sending account, signing, reminder, and completion emails; delivery events', 'Names, email addresses, email content and attachments', 'https://resend.com/security', 'Resend says it is SOC 2 Type II compliant and encrypts data at rest (AES-256) and in transit (TLS).'],
  ['Stripe', 'Payment processing and checkout', 'Purchase details, billing email; card data is entered on Stripe and never reaches us', 'https://docs.stripe.com/security', 'Stripe says it is certified PCI Service Provider Level 1 and audited under SOC 1 and SOC 2.'],
  ['xAI', 'Answers questions typed into the optional help chat', 'Only the chat messages you type', 'https://trust.x.ai', 'Used only when you use the help chat. Don’t type document contents or personal details into it.']
]

const subTable = () => `<div class="tbl-wrap"><table><thead><tr><th>Subprocessor</th><th>Purpose</th><th>Data involved</th><th>Security and compliance</th></tr></thead><tbody>${SUBPROCESSORS.map(([n, p, d, u, note]) => `<tr><td><b>${n}</b></td><td>${p}</td><td>${d}</td><td><a href="${u}" rel="noopener">${u.replace('https://', '')}</a><br><small>${note}</small></td></tr>`).join('')}</tbody></table></div>`

export const SECURITY_PAGE = {
  ...base,
  path: '/security',
  title: 'Security | Easy Digital Signatures',
  description: 'How Easy Digital Signatures protects documents: encryption in transit and at rest, hash-chained audit trails, two-factor login, access controls, subprocessors, and how to report a vulnerability.',
  crumb: 'Security', h1: 'Security',
  lede: 'What we do to protect documents and signing records, and what we don’t claim.',
  body: wrap('2026-11-16', `<div class="note" role="note"><p style="margin:0"><b>Plain statement:</b> Easy Digital Signatures and its operator, ${OP}, have <b>not</b> completed a SOC 2 audit or any other third-party security certification. We run on providers that publish their own SOC 2 or ISO 27001 reports (listed below). Their certifications cover their systems, not ours.</p></div>
<h2>Encryption</h2>
<ul><li><b>In transit:</b> the site and API are served only over HTTPS (TLS), with HTTP Strict Transport Security. Our connections to the database, file storage, email, and payment providers also use TLS.</li>
<li><b>At rest:</b> documents, the database, and backups are stored by Supabase, which encrypts customer data at rest with AES-256. Vercel and Resend also encrypt their data at rest.</li>
<li><b>Application-level encryption:</b> we encrypt Social Security numbers and bank routing numbers again with AES-256-GCM before storing them. We do the same for signing-link tokens and two-factor secrets. Signing links are looked up by a SHA-256 hash of the token, not the token itself.</li>
<li><b>Payments:</b> card details are entered on Stripe’s checkout page and never reach our servers.</li></ul>
<h2>Signing records and tamper evidence</h2>
<ul><li>Every document event, such as sending, email delivery, viewing, consent, signing, declining, and completion, is written to an append-only audit trail. Each event records UTC timestamps, IP addresses, and browser details.</li>
<li>Each event is hash-chained: its SHA-256 hash covers the previous event’s hash. Database triggers reject edits to audit events. They also reject deletions, except for drafts that were never sent and for whole-account deletion after a retention copy has been saved.</li>
<li>Completed PDFs include a certificate page with the original, signed-content, and chain-head SHA-256 values. Anyone can check a file at <a href="/verify">/verify</a> without uploading it.</li>
<li>Details: <a href="/court-evidence">court evidence and records retention</a>.</li></ul>
<h2>Access controls</h2>
<ul><li><b>Your account:</b> password sign-in through Supabase Auth, with optional two-factor authentication using an authenticator app (TOTP) and one-time recovery codes. You can turn it on in Settings. A session without the second factor can’t use the app’s API. Login is rate-limited.</li>
<li><b>Documents:</b> visible only to the sender (and teammates the sender shares a template with) and to recipients through their own unique signing link. Optional access codes add a second check for signers.</li>
<li><b>Database:</b> the app connects with a dedicated database role. Row-level security is enabled so the public API key can’t read app tables.</li>
<li><b>Our staff:</b> admin tools are limited to the operator’s verified owner accounts. We access customer documents only to provide support you ask for, to investigate abuse or security issues, or when the law requires it.</li></ul>
<h2>Subprocessors</h2>
<p>We rely on these providers. Each one’s own security and compliance page is linked. The full list is on our <a href="/subprocessors">subprocessors page</a>.</p>
${subTable()}
<h2 id="incidents">Incident notification</h2>
<p>If we confirm a security incident that led to unauthorized access to your personal information or documents, we’ll notify affected account holders by email without undue delay, and as required by applicable law. The notice will say what happened, what information was involved, and what we’re doing about it. Business customers under our <a href="/dpa">Data Processing Addendum</a> are notified as it describes.</p>
<h2 id="report">Report a vulnerability</h2>
<p>Email ${SECURITY} (or ${SUPPORT}) with the steps to reproduce. Please don’t access other people’s data, don’t degrade the service, and give us reasonable time to fix the issue before you disclose it. We won’t pursue legal action against good-faith research that follows these rules. We don’t run a paid bug bounty.</p>
<h2>What you can do</h2>
<ul><li>Turn on two-factor authentication in Settings.</li><li>Use access codes for sensitive documents, and don’t forward signing links.</li><li>Download completed PDFs and keep your own copies.</li><li>Delete files you no longer need with <b>Delete files, keep audit record</b> on the certificate page.</li></ul>`)
}

const AFFIDAVIT = `<pre style="white-space:pre-wrap;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px;font-size:13.5px;line-height:1.55">[CAPTION OF THE CASE, COURT, AND CASE NUMBER]

DECLARATION OF CUSTODIAN OF RECORDS OF BOREAL MT LLC
(Fed. R. Evid. 803(6) and 902(11); 28 U.S.C. § 1746)

I, [NAME], declare:

1. I am the [TITLE] of Boreal MT LLC, which operates the Easy Digital Signatures
   service at easydigitalsignatures.com. I am a custodian of its records, or am
   otherwise qualified by my position, and I am familiar with how the records
   described below are created and kept. I am over 18 and competent to make
   this declaration.

2. Attached as Exhibit A are true and correct copies of records maintained by
   Boreal MT LLC for the document identified as:
     Document ID: [UUID]
     Document name: [NAME]
     Complete-file SHA-256: [64 HEX CHARACTERS]
   Exhibit A consists of [NUMBER] pages and includes [the audit-trail export,
   the certificate of completion, and/or the stored PDF].

3. The records were made at or near the time of the acts and events they
   describe, by the Easy Digital Signatures software automatically recording
   information transmitted by, or from information transmitted by, persons
   with knowledge (including the IP address, browser user agent, and UTC time
   of each request), as described at easydigitalsignatures.com/court-evidence.

4. The records were kept in the course of the regularly conducted activity of
   Boreal MT LLC, and it is the regular practice of that activity to make and
   keep such records.

5. Each audit event is stored with a SHA-256 hash that incorporates the
   previous event's hash. On [DATE], I recomputed the hash chain for this
   document and it [verified with no breaks / showed the following problems:
   ___]. The chain head value was [64 HEX CHARACTERS].

6. Boreal MT LLC does not verify signers' identities beyond the email address,
   signing link, and (if used) access code, and is not a party to the document.
   I offer no opinion about the document's legal validity or about any
   person's identity or intent.

I declare under penalty of perjury under the laws of the United States of
America that the foregoing is true and correct.

Executed on [DATE] at [CITY, STATE].

______________________________
[NAME], [TITLE], Boreal MT LLC</pre>`

export const COURT_EVIDENCE = {
  ...base,
  path: '/court-evidence',
  title: 'Court Evidence, Records Requests and Retention | Easy Digital Signatures',
  description: 'What Easy Digital Signatures records for each signature, how the hash-chained audit trail works, how long records are kept, and how to request a business-records certification.',
  crumb: 'Court evidence', h1: 'Court evidence, records requests, and retention',
  lede: 'What we record when a document is signed, how long we keep it, and how to ask Boreal MT LLC, the neutral operator, to certify the record.',
  body: wrap('2026-11-16', `<div class="note" role="note"><p style="margin:0">${OP} isn’t a law firm and isn’t a party to the documents signed on the service. Whether a record is admissible, and what it proves, is up to the court. Talk to a lawyer licensed where your case is.</p></div>
<h2>What we record for each document</h2>
<ul><li><b>Document fingerprints:</b> the SHA-256 of the original file when it was sent (before anyone signed). The SHA-256 of the signed content (after signatures, before the certificate page). The SHA-256 of the complete sealed PDF.</li>
<li><b>Signers:</b> the name and email the sender entered, the name the signer confirmed, role, signing order, and the access code check, if one was used.</li>
<li><b>Events, in UTC:</b> created, sent, signing email accepted by the mail provider, delivered, delayed, bounced, or marked as spam. Also first email open (from a tracking image, which some mail apps load automatically), link viewed, consent accepted, signed or approved, declined with the reason, reminders, expiry, voiding, completion, and completed copies emailed. Each event has the IP address and browser user agent when a person caused it.</li>
<li><b>Consent and intent:</b> each signer must check the electronic-signature consent and then click <b>Finish</b> (or <b>Approve</b>). We store the exact consent text and its version, the SHA-256 of that text, the time, the IP address, and the browser. The audit event also records that the Finish (or Approve) click is what applied the signature.</li></ul>
<h2>How tamper evidence works</h2>
<ol class="steps"><li>Each audit event is saved with a sequence number and a hash: <code>SHA-256(previous event hash + "|" + the event's exact stored data)</code>. Changing, removing, or reordering any event breaks every later hash.</li>
<li>The database rejects edits to audit events. It rejects deletions too, except for drafts that were never sent and for whole-account deletion after a retention copy is saved.</li>
<li>When the last person signs, the app checks the chain and prints its head hash on the certificate page. That certificate goes into the sealed PDF, which is emailed to every party, so each party holds an independent copy of the values.</li>
<li>Anyone with the PDF can check it at <a href="/verify">easydigitalsignatures.com/verify</a>. The file is hashed in their browser and only the fingerprint is sent. The answer shows only whether it matches, the completion date, and the number of signers.</li>
<li>The document owner can download the full evidence record (JSON with every event, hash, and a fresh chain check) from the document’s certificate page.</li></ol>
<h2 id="retention">Records retention policy</h2>
<ul><li><b>Audit-trail records:</b> for every document that was sent, we save a retention copy of the audit trail and the summary record. This happens when the document is completed, declined, expired, or voided, and again before its files are deleted or its account is closed. The copy has the document name and ID, fingerprints, signers, consent text and version, and every hash-chained event. We keep it for <b>at least ${RETENTION_YEARS} years</b> after completion (or after the copy was made, for documents never completed). Longer if the law, a court order, a litigation hold, or a pending dispute requires it. The database refuses to delete a retention copy before its retain-until date.</li>
<li><b>Document files and field values:</b> controlled by the document owner. Drafts and templates can be deleted at any time. A completed, declined, expired, or voided document’s PDFs and field values can be deleted with <b>Delete files, keep audit record</b>. The files are removed from storage right away, and the audit record stays. Closing an account deletes its files within 30 days.</li>
<li><b>After a deletion:</b> /verify and the document’s verification link still work from the retention copy for completed documents, and we can still certify the audit trail. We can’t produce a PDF that has been deleted, so every party should keep their own copy.</li></ul>
<h2 id="requests">Records requests and certifications</h2>
<p>On request, ${OP} will check its records and, where they exist, provide a certified copy of a document’s audit record with a declaration from a custodian of records. The declaration follows Federal Rules of Evidence 803(6) and 902(11) (business records), or a state equivalent, so the other side may not need live testimony to authenticate the record.</p>
<ul><li><b>Who can ask:</b> the document’s sender, any signer or recipient of that document, or their lawyer. Anyone else needs a subpoena or court order.</li>
<li><b>How:</b> email ${LEGAL} with the document ID (on the certificate page), the complete-file SHA-256 if you have it, the case caption if one exists, and what you need. We verify that the request comes from a party, for example from the email address on the document.</li>
<li><b>Subpoenas and court orders:</b> serve them on Boreal MT LLC through its registered agent and send a courtesy copy to ${LEGAL}. Where the law allows, we tell the document owner before producing records.</li>
<li><b>Timing and cost:</b> we aim to respond within 10 business days. We may charge reasonable costs for large or expedited productions and for any deposition or testimony, and we’ll tell you before we do.</li>
<li><b>What we don’t do:</b> verify a signer’s identity beyond what the record shows, give legal or expert opinions, or notarize.</li></ul>
<h3>Template declaration</h3>
<p>This is the form ${OP} uses. We fill it in and sign it only after checking the records. Your lawyer should confirm it meets your court’s requirements.</p>
${AFFIDAVIT}`)
}

export const AUP = {
  ...base,
  path: '/acceptable-use',
  title: 'Acceptable Use Policy | Easy Digital Signatures',
  description: 'What you may not do with Easy Digital Signatures: fraud, forgery, impersonation, illegal or excluded documents, spam, malware, regulated data, and abuse of the service.',
  crumb: 'Acceptable use', h1: 'Acceptable Use Policy',
  lede: 'This policy is part of the Terms of Service of Boreal MT LLC.',
  body: wrap('2026-11-16', `<p>You may not use Easy Digital Signatures, or help anyone else use it, to:</p>
<ul><li>commit fraud, forgery, or identity theft, or sign, send, or approve a document in someone else’s name, or for an organization, without real authority;</li>
<li>trick anyone into signing, including by hiding or misdescribing what a document is or does;</li>
<li>impersonate a person, business, or government body, or fake a sender name, logo, or branding;</li>
<li>sign documents the law excludes from electronic signing, or that need notarization, witnesses, or special delivery (see Section 5 of the <a href="/terms">Terms</a>);</li>
<li>break any law, including consumer-protection, anti-discrimination, privacy, anti-spam, sanctions, and export laws, or help anyone break it;</li>
<li>upload or send illegal content, child sexual abuse material, content that exploits minors, threats, harassment, or hate;</li>
<li>send spam, phishing, malware, or documents to people who didn’t expect them, or buy or rent email lists to send to;</li>
<li>store protected health information covered by HIPAA (we don’t sign business associate agreements), payment card numbers, or passwords in documents or fields;</li>
<li>infringe copyright, trademark, privacy, or publicity rights;</li>
<li>probe, scan, or test the service’s security without written permission (except good-faith research under our <a href="/security#report">vulnerability policy</a>), or overload, scrape, reverse engineer, or interfere with it;</li>
<li>create multiple accounts, use fake details, or use other tricks to get more free documents, or abuse promo codes;</li>
<li>resell or sublicense the service without our written agreement.</li></ul>
<h2>Enforcement</h2>
<p>We may investigate suspected violations and remove content. We may void pending documents, suspend or close accounts, and forfeit credits obtained through abuse, without notice or refund. We may also preserve records and report activity to law enforcement or affected people. Suspension doesn’t delete audit records, which are kept as described in our <a href="/court-evidence#retention">retention policy</a>.</p>
<h2>Report abuse</h2>
<p>Email ${SUPPORT} or use our <a href="/contact">contact form</a>. Include the document ID or the email you received, if you have it.</p>`)
}

export const SUBPROCESSORS_PAGE = {
  ...base,
  path: '/subprocessors',
  title: 'Subprocessors | Easy Digital Signatures',
  description: 'The service providers that process data for Easy Digital Signatures, what each does, and links to their own security and compliance pages.',
  crumb: 'Subprocessors', h1: 'Subprocessors',
  lede: 'Companies that process personal data for Boreal MT LLC to run Easy Digital Signatures.',
  body: wrap('2026-11-16', `${subTable()}
<p>Data is processed in the United States. Phone verification by text message (Twilio) is built in but turned off. If we turn it on, we’ll add Twilio here first. Google Drive and Dropbox file pickers run only if you choose them, and they send us only the file you pick.</p>
<p>Summaries in the last column quote each provider’s own public page as of Nov 16, 2026. Their certifications cover their own systems. Easy Digital Signatures itself is not SOC 2 audited. We update this page before a new subprocessor starts handling personal data. Customers under the <a href="/dpa">Data Processing Addendum</a> can object as it describes.</p>`)
}

export const DPA = {
  ...base,
  path: '/dpa',
  title: 'Data Processing Addendum (DPA) | Easy Digital Signatures',
  description: 'Data Processing Addendum template for business customers of Easy Digital Signatures: roles, instructions, security, subprocessors, breach notice, deletion, retention, and CCPA service-provider terms.',
  crumb: 'DPA', h1: 'Data Processing Addendum',
  lede: 'For business customers whose documents contain personal information of others.',
  body: wrap('2026-11-16', `<p>This Data Processing Addendum (“DPA”) is between Boreal MT LLC (“Processor”) and the customer that accepts the <a href="/terms">Terms of Service</a> (“Customer”). It applies to personal information that Customer, or its signers, provides through Easy Digital Signatures (“Customer Personal Data”). It is part of the Terms, and it applies automatically to business customers. If you want a signed copy, send it to us for signature through Easy Digital Signatures at ${LEGAL}. If this DPA conflicts with the Terms on data protection, this DPA wins. Everything else in the Terms, including the limitation of liability, still applies.</p>
<h2>1. Roles and instructions</h2>
<p>Customer is the controller or “business”. Processor is the processor or “service provider” under the CCPA/CPRA and similar laws. Processor processes Customer Personal Data only to provide the service, following Customer’s instructions given through the service and the Terms, or as the law requires. If the law requires otherwise, Processor tells Customer first unless the law forbids it.</p>
<h2>2. CCPA/CPRA service-provider terms</h2>
<p>Processor won’t sell or share Customer Personal Data. It won’t keep, use, or disclose that data for any purpose other than the business purposes in the Terms, or outside the direct business relationship with Customer. It won’t combine it with personal information from other sources except as the law allows. Processor will comply with the CCPA, provide the same level of privacy protection the CCPA requires, and tell Customer if it can no longer meet these duties.</p>
<h2>3. Confidentiality and security</h2>
<p>Processor limits access to people who need it to provide the service and who must keep it confidential. It maintains the measures on our <a href="/security">security page</a>: encryption in transit and at rest, application-level encryption of sensitive fields, hash-chained append-only audit trails, access controls, and optional two-factor login. Processor is not SOC 2 audited.</p>
<h2>4. Subprocessors</h2>
<p>Customer authorizes the subprocessors on our <a href="/subprocessors">subprocessors page</a>. Processor binds each one to data-protection terms at least as protective as this DPA and remains responsible for them. Processor updates that page before a new subprocessor starts handling personal data. Customer may object on reasonable data-protection grounds within 15 days. If we can’t resolve it, Customer may stop using the service and ask for a refund of unused prepaid credits.</p>
<h2>5. Help with requests</h2>
<p>Taking into account the nature of the processing, Processor will reasonably help Customer respond to requests from individuals (access, deletion, correction) and with any required assessments. If a request comes to us directly, we’ll send it on to Customer.</p>
<h2>6. Security incidents</h2>
<p>Processor will notify Customer without undue delay after confirming a breach of security that led to unauthorized access to Customer Personal Data. The notice will include what is known about the nature of the breach, the data involved, and the steps taken. We’ll update it as we learn more.</p>
<h2>7. Deletion and retention</h2>
<p>Customer can delete document files and field values at any time, and can close its account. When the service ends, Processor deletes Customer’s documents within 30 days. Processor keeps the signing audit-trail records described in our <a href="/court-evidence#retention">retention policy</a>, for at least 7 years after completion. It keeps them so signed documents stay verifiable and so legal claims can be established or defended. It also keeps records it must keep by law. Those records stay protected by this DPA for as long as they are kept.</p>
<h2>8. Audits</h2>
<p>On written request, no more than once a year, Processor will answer reasonable written security questions and give Customer the information needed to show compliance with this DPA. Customer accepts subprocessors’ own audit reports, such as their SOC 2 reports, for their systems. There are no on-site audits unless the law requires them.</p>
<h2>9. Location</h2>
<p>Customer Personal Data is processed in the United States. If the law requires a transfer mechanism, the parties will cooperate to put one in place.</p>
<h2>10. Term</h2>
<p>This DPA lasts as long as Processor processes Customer Personal Data.</p>`)
}

export const LEGAL_INDEX = {
  ...base,
  path: '/legal',
  title: 'Legal Center | Easy Digital Signatures',
  description: 'Terms, privacy policy, acceptable use, DPA, subprocessors, security, court evidence and records retention for Easy Digital Signatures, operated by Boreal MT LLC.',
  crumb: 'Legal', h1: 'Legal center',
  lede: 'Easy Digital Signatures is operated by Boreal MT LLC.',
  body: `<article class="card"><div class="prose"><div class="tbl-wrap"><table><thead><tr><th>Policy</th><th>Current version</th></tr></thead><tbody>${POLICY_VERSIONS.map(([n, u, v]) => `<tr><td><a href="${u}">${n}</a></td><td>${v}</td></tr>`).join('')}</tbody></table></div>
<p>Dated changes are in the <a href="/legal/changelog">legal changelog</a>. Check a signed PDF at <a href="/verify">/verify</a>. Questions: ${SUPPORT}. Records requests and legal process: ${LEGAL}. Security reports: ${SECURITY}.</p>
<p>Information on this site is general and isn’t legal advice. ${OP} isn’t a law firm.</p></div></article>`
}

export const CHANGELOG = {
  ...base,
  path: '/legal/changelog',
  title: 'Legal Changelog | Easy Digital Signatures',
  description: 'Dated version history of the Easy Digital Signatures terms, privacy policy, acceptable use policy, DPA, security page, retention policy, and signer consent text.',
  crumb: 'Changelog', h1: 'Legal changelog',
  breadcrumbs: [['Home', '/'], ['Legal', '/legal'], ['Changelog', '/legal/changelog']],
  lede: 'Every version of our policies, newest first. Earlier full texts are available on request.',
  body: `<article class="card"><div class="prose">
<h2>Nov 16, 2026</h2>
<ul><li><b>Terms of Service ${TERMS_VERSION}:</b> names Boreal MT LLC as operator and the only contracting party. Adds “not a law firm”, a stronger statement that you decide whether e-signatures are valid for your document type, and a “check local law” note. Extends the disclaimers, liability cap, and indemnity to Boreal MT LLC’s members, managers, and staff, and requires claims to be brought only against the company. Adds the DMCA agent designation number, records requests and legal process, the Acceptable Use Policy and DPA by reference, versioning, and two-factor responsibility.</li>
<li><b>Privacy Policy 2026-11-16:</b> names the operator. Adds email delivery and open events, two-factor data, the detailed retention schedule (audit records for at least 7 years), the CCPA retention-by-category list, exceptions to deletion, and Global Privacy Control.</li>
<li><b>New:</b> Acceptable Use Policy, Data Processing Addendum, Subprocessors, Security, and Court evidence and records retention, all at 2026-11-16.</li>
<li id="consent"><b>Signer consent text ${CONSENT_VERSION}:</b> ${CONSENT_HISTORY[0][1]}</li></ul>
<h2>Nov 14, 2026</h2>
<ul><li><b>Terms of Service 2026-11-14.2</b> and the Privacy Policy: acceptance by use, the excluded-documents list, arbitration with a 30-day opt-out, the 6-month claims limit, and the CCPA/CPRA section.</li>
<li><b>Signer consent text 2026-11-14:</b> “${CONSENT_HISTORY[1][1]}”</li></ul>
</div></article>`
}

const VERIFY_SCRIPT = `<script>
(function(){
  var out = document.getElementById('vf-out'), inp = document.getElementById('vf-file'), hx = document.getElementById('vf-hash')
  function show(html, bad){ out.innerHTML = html; out.className = 'vf-out' + (bad ? ' bad' : ' ok') }
  async function check(hex){
    show('Checking…')
    try {
      var r = await fetch('/api/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sha256: hex }) })
      var j = await r.json()
      if (!r.ok) return show(j.message || 'Could not check right now.', true)
      if (j.match) show('<b>Match.</b> This file is identical to a document completed on ' + new Date(j.completed).toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' }) + ' UTC with ' + j.signers + ' signer' + (j.signers === 1 ? '' : 's') + '.<br><span class="mono">' + hex + '</span>')
      else show('<b>No match.</b> No completed document has this exact fingerprint. The file may have been changed (even re-saving or printing to PDF changes it), it may be the unsigned original, or it wasn’t completed on Easy Digital Signatures.<br><span class="mono">' + hex + '</span>', true)
    } catch (e) { show('Could not check right now. Try again.', true) }
  }
  inp.addEventListener('change', async function(){
    var f = inp.files && inp.files[0]; if (!f) return
    if (!(window.crypto && crypto.subtle)) return show('This browser can’t compute SHA-256. Paste the fingerprint instead.', true)
    show('Computing the SHA-256 fingerprint on this device…')
    var buf = await f.arrayBuffer()
    var d = new Uint8Array(await crypto.subtle.digest('SHA-256', buf))
    var hex = Array.prototype.map.call(d, function(b){ return b.toString(16).padStart(2, '0') }).join('')
    check(hex)
  })
  document.getElementById('vf-go').addEventListener('click', function(){
    var v = (hx.value || '').trim().toLowerCase()
    if (!/^[0-9a-f]{64}$/.test(v)) return show('Paste a 64-character SHA-256 value.', true)
    check(v)
  })
})()
</script>`

export const VERIFY_PAGE = {
  path: '/verify',
  title: 'Verify a Signed PDF | Easy Digital Signatures',
  description: 'Check whether a signed PDF matches a document completed on Easy Digital Signatures. The file is fingerprinted in your browser and never uploaded.',
  eyebrow: 'Verify', crumb: 'Verify a document', h1: 'Verify a signed PDF',
  lede: 'Drop in a PDF to check it against our records. Your file never leaves your device. Only its SHA-256 fingerprint is sent.',
  compactHero: true, noHeroCta: true,
  head: `<style>.vf{padding:clamp(18px,3vw,32px)}.vf-pick{display:block;border:2px dashed #94A3B8;border-radius:14px;background:#F8FAFC;padding:28px 18px;text-align:center;cursor:pointer}.vf-pick input{display:block;margin:12px auto 0}.vf-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.vf-row input{flex:1 1 320px;min-height:44px;border:1px solid #CBD5E1;border-radius:10px;padding:0 12px;font:14px ui-monospace,monospace}.vf-out{margin-top:16px;padding:14px;border-radius:10px;min-height:22px}.vf-out.ok{background:#F0FDFA;color:#134E4A}.vf-out.bad{background:#FEF2F2;color:#7F1D1D}.vf-out .mono{font:12px ui-monospace,monospace;word-break:break-all}</style>`,
  body: `<section class="card vf"><label class="vf-pick" for="vf-file"><b>Choose the signed PDF</b><br><span>It’s hashed in your browser. Nothing is uploaded.</span><input id="vf-file" type="file" accept="application/pdf,.pdf"></label>
<div class="vf-row"><label for="vf-hash" class="sr-only" style="position:absolute;left:-9999px">SHA-256 fingerprint</label><input id="vf-hash" placeholder="…or paste a SHA-256 fingerprint" autocomplete="off" spellcheck="false"><button class="s-btn" id="vf-go" type="button">Check</button></div>
<div id="vf-out" class="vf-out" aria-live="polite"></div></section>
<section class="card"><div class="prose"><h2>What this shows</h2><p>Only whether the file matches a completed document, when it was completed, and how many people signed. No names, emails, or contents are shown. If the file matches, it is byte-for-byte the sealed PDF we produced. That includes the certificate page with the audit trail and the hash-chain value.</p>
<p>A “no match” doesn’t prove fraud: opening and re-saving a PDF, printing it to PDF, or adding notes changes the fingerprint. Compare against the copy that was emailed when the document was completed.</p>
<p>Need a certified record for a dispute? See <a href="/court-evidence">court evidence and records requests</a>.</p></div></section>`,
  scripts: VERIFY_SCRIPT
}

export const LEGAL_PAGES = [SECURITY_PAGE, COURT_EVIDENCE, AUP, SUBPROCESSORS_PAGE, DPA, LEGAL_INDEX, CHANGELOG, VERIFY_PAGE]
