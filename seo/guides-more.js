import { APP_LD, howToLd, checklist } from './layout.js'
import { PRICING_BLOCK, HOW_IT_WORKS, FEATURES, LEGAL_NOTE } from './shared-blocks.js'

// Third batch of search pages (2026-11-16): device how-tos, document-type pages, and legal explainers.
// Gaps found by checking which high-intent searches competitors (Adobe, Smallpdf, DocuSign, Dropbox Sign,
// signpdf-style tools) have dedicated pages for and we didn't. Platform steps come from each vendor's own
// help page, read on GUIDES_CHECKED; legal facts cite the statute or the body that publishes it.
export const GUIDES_CHECKED = 'November 16, 2026'
const card = inner => `<section class="card"><div class="prose">${inner}</div></section>`
const ext = (href, text) => `<a href="${href}" rel="noopener" target="_blank">${text}</a>`
const steps = items => `<ol class="steps">${items.map(i => `<li>${i}</li>`).join('')}</ol>`
const src = (items) => `<p class="src">Steps checked against ${items} on ${GUIDES_CHECKED}. Apps move buttons between versions; if yours looks different, the vendor’s help page has the current steps.</p>`

const FREE_TOOL = `<h2>Faster: sign it in your browser, free</h2><p>Our <a href="/sign-pdf-online">free PDF signer</a> works in Safari, Chrome, Edge, and Firefox on phones and computers. Draw, type, or upload your signature, add initials, text, dates, and checkmarks, drag them anywhere on any page, and download the signed PDF. There’s no sign-up, and your file never leaves your device: it’s opened and saved by your browser, not uploaded.</p><p><a class="s-btn" href="/sign-pdf-online" data-cta="guide-tool">Open the free PDF signer</a></p>`
const OTHERS_SIGN = `<h2>When someone else needs to sign</h2><p>Signing a PDF yourself is one thing; getting a client, tenant, or contractor to sign is another. You want everyone to end up with the same final copy and a record of who signed and when. That’s what <a href="/#/signup" data-cta="guide-signup">Easy Digital Signatures</a> does:</p>${HOW_IT_WORKS}`
const FREE_FAQ = ['How much does it cost to send a document for signature?', 'Your first document is free after you verify your email, with no credit card. After that you pay only when you send: $1 for one document, $5 for 10, or $10 for 50. There’s no subscription, and one credit covers one document however many people sign it.']
const SIGNER_FAQ = ['Does the other person need an account or an app?', 'No. Each signer gets a secure link by email and signs in their phone or computer browser. Only the sender has an account.']
const LEGAL_FAQ = ['Is a signature added this way legally binding?', 'In the US, the federal ESIGN Act and state UETA laws generally give electronic signatures the same effect as handwritten ones, with listed exceptions such as wills and certain court and family-law documents. This is general information, not legal advice.']

// ---------- device guides ----------
function deviceGuide({ path, title, description, crumb, h1, lede, howName, tools, builtIn, builtInTitle, builtInSteps, afterSteps, source, more, faqs, toolCard = true }) {
  return {
    path, title, description, crumb, h1, lede, eyebrow: 'How-to guide',
    cta: 'Sign a PDF free, no sign-up', ctaHref: '/sign-pdf-online', ctaNote: 'Free in your browser · your file isn’t uploaded',
    jsonld: [howToLd({ name: howName, path, steps: builtInSteps, tools }), APP_LD],
    body: [
      card(`<h2>${builtInTitle}</h2>${builtIn ? `<p>${builtIn}</p>` : ''}${steps(builtInSteps)}${afterSteps || ''}${source}`),
      toolCard ? card(FREE_TOOL) : '',
      more ? card(more) : '',
      card(OTHERS_SIGN),
      card(`<h2>Pricing for sending</h2>${PRICING_BLOCK}<p>Related guides: <a href="/sign-pdf-on-iphone">iPhone</a> · <a href="/sign-pdf-on-android">Android</a> · <a href="/sign-pdf-on-mac">Mac</a> · <a href="/sign-pdf-on-windows">Windows</a> · <a href="/sign-pdf-without-adobe">without Adobe</a> · <a href="/sign-word-document-online">Word documents</a> · <a href="/get-document-signed-by-email">get a document signed by email</a>.</p>`)
    ].filter(Boolean).join('\n'),
    faqs: [...faqs, LEGAL_FAQ, FREE_FAQ]
  }
}

const IPHONE = deviceGuide({
  path: '/sign-pdf-on-iphone',
  title: 'How to Sign a PDF on iPhone (Free, Built-In or in Safari)',
  description: 'Sign a PDF on your iPhone for free with Markup, or in Safari with our no-sign-up PDF signer. Plus how to get a PDF signed by someone else from your phone.',
  crumb: 'Sign a PDF on iPhone', h1: 'How to sign a PDF on iPhone',
  lede: 'Two free ways: Apple’s built-in Markup tool, or our PDF signer in Safari with typed signatures, dates, and text boxes. No printing or scanning.',
  howName: 'How to sign a PDF on iPhone with Markup', tools: ['iPhone', 'Files, Mail, or Notes app'],
  builtInTitle: 'Option 1: Markup, built into iPhone',
  builtIn: 'Markup works in Files, Mail, Notes, and other Apple apps that open PDFs.',
  builtInSteps: ['Open the PDF, for example from the <b>Files</b> app or a <b>Mail</b> attachment.', 'Tap the <b>Markup</b> button (a pen tip).', 'Tap <b>+</b>, then <b>Add Signature</b>, and sign with your finger. Tap <b>Done</b>.', 'Drag the signature onto the signature line and resize it with the blue handles.', 'Tap <b>Done</b> to save, then share the signed PDF back by Mail or Messages.'],
  afterSteps: '<p>Your iPhone saves the signature so you can reuse it next time. You can also save initials as a separate signature.</p>',
  source: src(ext('https://support.apple.com/guide/iphone/fill-forms-sign-documents-create-signatures-iph1d3607e5c/ios', 'Apple’s iPhone User Guide')),
  more: `<h2>Tips for a clean signature on a phone</h2>${checklist(['Turn the phone sideways before you sign: you get a wider pad and a smoother line.', 'Pinch to zoom on the signature line before placing it so it sits on the line, not over the text.', 'Check every page. Leases and contracts often want initials on each page and a date next to the signature.', 'Send back the PDF, not a screenshot, so the other side gets the full document.'])}`,
  faqs: [
    ['Can I sign a PDF on iPhone without an app?', 'Yes. Markup is built into iOS, and our <a href="/sign-pdf-online">free PDF signer</a> runs in Safari with nothing to install.'],
    ['How do I sign a PDF from an email on iPhone?', 'In Mail, open the PDF attachment, tap Markup, add your signature, and tap Done. Mail can then start a reply with the signed copy attached.'],
    ['Can I type my signature instead of drawing it?', 'Markup only draws. Our free PDF signer lets you draw, type your name in a handwriting-style font, or upload a photo of your signature.']
  ]
})

const ANDROID = deviceGuide({
  path: '/sign-pdf-on-android',
  title: 'How to Sign a PDF on Android (Free, No App Needed)',
  description: 'Sign a PDF on Android for free: draw on it in Google Drive, or use our in-browser PDF signer in Chrome for typed signatures, dates, and text. No sign-up.',
  crumb: 'Sign a PDF on Android', h1: 'How to sign a PDF on Android',
  lede: 'Android doesn’t have a dedicated signature button, but the Google Drive app can draw on a PDF, and our free signer works in Chrome with a proper movable signature.',
  howName: 'How to sign a PDF on Android with Google Drive', tools: ['Android phone (Android 6.0 or later)', 'Google Drive app'],
  builtInTitle: 'Option 1: draw it in the Google Drive app',
  builtIn: 'Google’s Drive app can annotate PDFs with your finger or a stylus. Google lists Android 6.0 or later as the requirement.',
  builtInSteps: ['Open the <b>Google Drive</b> app and tap the PDF to preview it. (Save an email attachment to Drive first.)', 'Tap the <b>annotate</b> button (a pen) at the bottom right.', 'Choose the pen, pick a dark color and a thin size, and write your signature on the line.', 'Save the PDF, or save a copy with a new name to keep the original unmarked.', 'Share or download the signed copy and send it back.'],
  afterSteps: '<p>This draws ink on the page. There’s no saved signature to reuse, no typed signature, and you can’t move the ink once it’s drawn, so pinch to zoom before you sign. Phone makers such as Samsung also include their own PDF and note apps with drawing tools.</p>',
  source: src(ext('https://support.google.com/drive/answer/13207179', 'Google Drive Help')),
  faqs: [
    ['Does Android have a built-in PDF signature tool?', 'Not a dedicated one. The Google Drive app can draw on PDFs, and some phone makers add markup tools. For a typed or movable signature, use our <a href="/sign-pdf-online">free PDF signer</a> in Chrome.'],
    ['Can I fill in form fields on Android?', 'Google Drive can fill PDFs that have real form fields. Our free signer adds text boxes, dates, and checkmarks anywhere, including on scanned forms without fields.'],
    ['Will my PDF be uploaded?', 'Not with our free signer: the PDF is opened and saved by your browser on your phone. When you send a document for others to sign, it’s stored securely on our servers so signers can open it.']
  ]
})

const MAC = deviceGuide({
  path: '/sign-pdf-on-mac',
  title: 'How to Sign a PDF on a Mac (Preview or Free Online)',
  description: 'Sign a PDF on a Mac with Preview using your trackpad, camera, or iPhone, or in any browser with our free no-sign-up PDF signer. Step by step.',
  crumb: 'Sign a PDF on a Mac', h1: 'How to sign a PDF on a Mac',
  lede: 'Every Mac can sign PDFs with Preview. You can capture your signature with the trackpad, the camera, or your iPhone or iPad.',
  howName: 'How to sign a PDF on a Mac with Preview', tools: ['Mac', 'Preview app'],
  builtInTitle: 'Option 1: Preview, built into macOS',
  builtInSteps: ['Open the PDF in <b>Preview</b> (double-click it, or right-click and choose Open With → Preview).', 'Click the <b>Markup</b> button (a pen tip) if the Markup toolbar isn’t showing, then click the <b>Sign</b> button.', 'Choose <b>Create Signature</b>, then pick <b>Trackpad</b>, <b>Camera</b>, or <b>iPhone or iPad</b> and sign. Click <b>Done</b>.', 'Click your signature to add it, drag it onto the line, and resize it with the handles.', 'Choose <b>File → Save</b>, or File → Export as PDF to keep the original.'],
  afterSteps: `<h3>The three ways to capture a signature</h3>${checklist(['<b>Trackpad</b>: sign with your finger, then press any key. Force Touch trackpads give a darker line if you press harder.', '<b>Camera</b>: sign white paper and hold it up to the camera, level with the blue line.', '<b>iPhone or iPad</b>: sign on the device’s screen (Apple Pencil works on iPad). Both need to meet Apple’s Continuity requirements.'])}<p>Preview saves your signatures, and with iCloud Drive they show up on your other Macs.</p>`,
  source: src(ext('https://support.apple.com/guide/preview/fill-out-and-sign-pdf-forms-prvw35725/mac', 'Apple’s Preview User Guide')),
  faqs: [
    ['Can I sign a PDF on a Mac without Adobe?', 'Yes. Preview comes with every Mac and can sign PDFs. Our <a href="/sign-pdf-online">free PDF signer</a> also works in Safari or Chrome with no download.'],
    ['Why doesn’t the iPhone option appear in Preview?', 'Apple requires Continuity: both devices signed in to the same Apple Account, with Wi-Fi and Bluetooth on. Otherwise use the trackpad or camera.'],
    ['How do I add the date next to my signature?', 'In Preview, use the Text tool in the Markup toolbar. In our free signer, tap Date and it fills in today’s date, which you can edit.']
  ]
})

const WINDOWS = deviceGuide({
  path: '/sign-pdf-on-windows',
  title: 'How to Sign a PDF on Windows 10 or 11 (Free)',
  description: 'Sign a PDF on Windows for free with Microsoft Edge’s Draw tool, or with our in-browser PDF signer for typed, reusable signatures. No sign-up or install.',
  crumb: 'Sign a PDF on Windows', h1: 'How to sign a PDF on Windows',
  lede: 'Windows doesn’t have a signature tool like the Mac’s, but Microsoft Edge, the PDF viewer on most Windows PCs, can draw on PDFs.',
  howName: 'How to sign a PDF on Windows with Microsoft Edge', tools: ['Windows PC', 'Microsoft Edge'],
  builtInTitle: 'Option 1: Microsoft Edge’s Draw tool',
  builtInSteps: ['Right-click the PDF and choose <b>Open with → Microsoft Edge</b>.', 'Click <b>Draw</b> in the PDF toolbar and pick an ink color and thickness.', 'Sign on the line with your mouse, touchpad, touchscreen, or pen. Use <b>Erase</b> to redo a stroke.', 'Use <b>Add text</b> to type the date or your printed name if you need to.', 'Click <b>Save</b> (or Save as, to keep the original) and reopen the file to check.'],
  afterSteps: '<p>Edge draws ink on the page. It doesn’t keep a saved signature, so you draw it each time, and signing with a mouse is hard to make neat. Adobe Acrobat Reader is a free download with a reusable “Fill &amp; Sign” signature if you sign often.</p>',
  source: src(ext('https://learn.microsoft.com/en-us/deployedge/microsoft-edge-pdf', 'Microsoft’s Edge PDF reader documentation')),
  faqs: [
    ['Can I sign a PDF on Windows without Adobe?', 'Yes. Microsoft Edge can draw a signature on a PDF and save it. Our <a href="/sign-pdf-online">free PDF signer</a> runs in Edge or Chrome and lets you type or upload a signature instead of drawing with a mouse.'],
    ['Is a signature drawn in Edge a “digital signature”?', 'No. It’s ink added to the page, a simple electronic signature. Certificate-based digital signatures need a digital ID; Edge can display and check them but doesn’t create them.'],
    ['How do I make my signature look good with a mouse?', 'Type your name in a handwriting-style font, or sign white paper, photograph it, and upload the image. Our <a href="/signature-generator">signature generator</a> makes a transparent PNG.']
  ]
})

// ---------- document-type pages ----------

const CONTRACTOR = {
  path: '/contractor-agreement-e-signature',
  title: 'E-Sign an Independent Contractor Agreement Online',
  description: 'Send an independent contractor or freelance agreement for e-signature. Contractors sign on any phone, no account. First document free, then $1 or less.',
  eyebrow: 'Contractor agreements', crumb: 'Contractor agreement e-signature',
  h1: 'E-sign independent contractor agreements',
  lede: 'Hiring a freelancer or subcontractor? Send the agreement by email and get it signed from their phone, with a record of when they signed.',
  jsonld: [APP_LD],
  body: [
    card(`<h2>Send a contractor agreement for signature</h2>${HOW_IT_WORKS}<p>Use your own agreement or one your lawyer drafted. A statement of work, rate sheet, or NDA can go in the same PDF so it’s signed together.</p>`),
    card(`<h2>Built for one-person and small businesses</h2>${checklist(['<b>Pay per document</b>, not per seat per month: your first is free, then $1, or as little as 20¢ each in a 50-pack.', '<b>Contractors don’t need an account</b> and can sign on a phone.', '<b>Reminders and expiration dates</b> so unsigned agreements don’t stall.', '<b>Templates</b> for the agreement you send every time, and <a href="/bulk-send-documents-for-signature">bulk send</a> for a crew. Construction estimates and change orders? See <a href="/contractors">e-signatures for contractors</a>.', '<b>In-person signing</b> on your tablet or phone when they’re on site.'])}`),
    card(`<h2>Signing one yourself?</h2><p>If a client sent <i>you</i> a contractor agreement as a PDF, sign it in seconds with the <a href="/sign-pdf-online">free PDF signer</a> and send it back. No account, and your file isn’t uploaded.</p>`),
    card(`<h2>Pricing</h2>${PRICING_BLOCK}${LEGAL_NOTE}`)
  ].join('\n'),
  faqs: [
    ['Can a contractor agreement be signed electronically?', 'Generally yes. In the US, the ESIGN Act and state UETA laws give electronic signatures on ordinary business contracts the same legal effect as ink. Whether someone is a contractor or an employee depends on the actual working relationship, not the agreement alone. This isn’t legal advice.'],
    ['Can I attach a W-9 or other forms?', 'You can put any PDF pages in the document you send, and add text and signature fields to them. Follow the IRS’s own instructions for tax forms.'],
    SIGNER_FAQ, FREE_FAQ,
    ['Can I send the same agreement to many contractors?', 'Yes. Save it as a template, or use bulk send to email each person their own copy to sign.']
  ]
}


const BY_EMAIL_STEPS = ['Upload the document (PDF, Word, or a photo of a paper page).', 'Add each signer’s name and email address.', 'Drag signature, initials, date, and text fields onto the pages for each signer.', 'Click send: each signer gets an email with a secure signing link.', 'Signers open the link, review, and sign in their browser.', 'Everyone gets the signed PDF by email, with an audit certificate.']
const BY_EMAIL = {
  path: '/get-document-signed-by-email',
  title: 'How to Get a Document Signed by Email (Without Printing)',
  description: 'Get a document signed by email: upload it, add the signer’s email, place fields, and send a secure link. No printing or scanning. First document free.',
  eyebrow: 'How-to guide', crumb: 'Get a document signed by email',
  h1: 'How to get a document signed by email',
  lede: 'Stop asking people to print, sign, scan, and email it back. Send a signing link instead, and they sign on whatever device they read your email on.',
  jsonld: [howToLd({ name: 'How to get a document signed by email', path: '/get-document-signed-by-email', steps: BY_EMAIL_STEPS, tools: ['Easy Digital Signatures', 'Web browser'] }), APP_LD],
  body: [
    card(`<h2>Step by step</h2>${steps(BY_EMAIL_STEPS)}`),
    card(`<h2>Why not just email the PDF?</h2><p>You can email a PDF and ask for it back signed, but then the signer needs a way to sign it, you collect copies one by one, and there’s no record of when or how it was signed. A signing link fixes all three:</p>${checklist(['The signer only has to tap the link, and it works on a phone.', 'With several signers, everyone signs the same copy, in order if you want.', 'Automatic reminders go out until it’s signed, and you can see who has opened it.', 'The finished PDF includes a certificate with timestamps, IP addresses, and SHA-256 fingerprints.'])}`),
    card(`<h2>Signing something you were emailed?</h2><p>If you’re the one who has to sign, you don’t need an account: open the PDF in our <a href="/sign-pdf-online">free PDF signer</a>, sign, download, and reply with the signed copy.</p>`),
    card(`<h2>Pricing</h2>${PRICING_BLOCK}<p>Related: <a href="/send-document-for-signature">send a document for signature</a> · <a href="/sign-word-document-online">sign a Word document</a> · <a href="/nda">NDAs</a> · <a href="/leases">leases</a> · <a href="/waiver-e-signature">waivers</a> · <a href="/contractor-agreement-e-signature">contractor agreements</a>.</p>`)
  ].join('\n'),
  faqs: [
    ['What email does the signer get?', 'An email from Easy Digital Signatures with your name, the document name, any message you add, and a button to review and sign. The link is unique to that signer.'],
    ['What if the email goes to spam?', 'Ask the signer to check spam or promotions, or resend it from your dashboard. You can also copy the signing link and send it yourself by text or chat.'],
    SIGNER_FAQ, FREE_FAQ, LEGAL_FAQ
  ]
}

// ---------- legal explainers ----------
const NOTARY = {
  path: '/notarization-vs-e-signature',
  title: 'Notarization vs E-Signature: Which Does Your Document Need?',
  description: 'The difference between an e-signature and notarization, which documents usually need a notary, and how remote online notarization works. Plain-English guide.',
  eyebrow: 'Legal basics', crumb: 'Notarization vs e-signature',
  h1: 'Notarization vs e-signature: what’s the difference?',
  lede: 'An e-signature shows that someone agreed to a document. Notarization adds a licensed notary who checks the signer’s identity. Most everyday agreements don’t need a notary; some documents do.',
  jsonld: [],
  compactHero: false,
  body: [
    card(`<h2>The short version</h2><div class="tbl-wrap"><table><thead><tr><th></th><th>E-signature</th><th>Notarization</th></tr></thead><tbody>
<tr><td>What it proves</td><td>The person agreed to the document, with a record of how and when</td><td>A commissioned notary verified the signer’s identity and witnessed the signing</td></tr>
<tr><td>Who’s involved</td><td>Just the signers</td><td>The signer and a notary public (in person, or by live video where state law allows)</td></tr>
<tr><td>Main US law</td><td>Federal ESIGN Act and state UETA laws</td><td>Each state’s notary laws</td></tr>
<tr><td>Typical uses</td><td>Contracts, NDAs, leases, offer letters, invoices, consent forms</td><td>Deeds, many affidavits, powers of attorney, some loan and court documents</td></tr>
<tr><td>Cost</td><td>Often free or about $1 per document here</td><td>A notary fee set or capped by state law, plus any platform fee for online notarization</td></tr>
</tbody></table></div>`),
    card(`<h2>When an e-signature is enough</h2><p>The ESIGN Act says a signature or contract can’t be denied legal effect just because it’s electronic, and UETA, adopted in 49 states, says the same at state level. For ordinary business and personal agreements, there’s usually no notary requirement at all; a signature, electronic or ink, is what the law asks for. Read <a href="/blog/are-electronic-signatures-legal">are electronic signatures legal?</a> for the details and the listed exceptions.</p>`),
    card(`<h2>When you usually need a notary</h2><p>A notary is needed when a law, a county recorder, a court, or the person receiving the document requires one. Common examples:</p>${checklist(['Real estate deeds and other documents that will be recorded', 'Many affidavits and sworn statements', 'Powers of attorney (depending on the state and type)', 'Some vehicle title, loan, and financial documents', 'Documents going to a foreign government, which may also need an apostille'])}<p>The rules vary by state and by the receiving office, so ask whoever will receive the document.</p>`),
    card(`<h2>Remote online notarization (RON)</h2><p>With remote online notarization, you meet a commissioned notary on a live video call, prove your identity online, and sign electronically. The ${ext('https://www.nationalnotary.org/notary-bulletin/blog/2026/08/how-notary-laws-have-changed-and-grown-in-the-past-25-years', 'National Notary Association')} counts 48 states with remote notarization laws by 2025, up from 22 at the start of the COVID-19 pandemic. Requirements differ by state, so use a provider and a notary authorized where you need it.</p>`),
    card(`<h2>Where Easy Digital Signatures fits</h2><p>We handle e-signatures, not notarization: we don’t provide notaries or notarial certificates. Use us for documents that need signatures, such as contracts, NDAs, leases, and forms. Each finished PDF includes a certificate page with each signer’s email, timestamps, IP address, and SHA-256 fingerprints. For a document that must be notarized, use a notary or a RON provider.</p><p>Need to sign a PDF yourself right now? Try the <a href="/sign-pdf-online">free PDF signer</a>. Sending one to others? <a href="/#/signup" data-cta="guide-signup">Your first document is free</a>.</p>${LEGAL_NOTE}`)
  ].join('\n'),
  faqs: [
    ['Is an e-signature the same as a notarized signature?', 'No. An e-signature shows agreement. Notarization adds a commissioned notary who verifies identity and witnesses the signing. A notarized document can be signed electronically, but only through a notary.'],
    ['Does a contract need to be notarized to be valid?', 'Most contracts don’t. Notarization is required only where a specific law, recorder, court, or recipient asks for it. This isn’t legal advice.'],
    ['Can I notarize a document online?', 'In most states, yes, through remote online notarization with a commissioned notary on live video. Check that the notary is authorized under the law that applies to your document.'],
    ['Does Easy Digital Signatures offer notarization?', 'No. We provide e-signatures with an audit certificate, not notarization.']
  ]
}

const STATE_ROWS = [
  ['New York', 'Not UETA. New York’s Electronic Signatures and Records Act (State Technology Law §§ 301–309) gives e-signatures the same validity as handwritten ones; ESIGN also applies to interstate transactions.', ['https://www.nycbar.org/issues-policy/advocacy-campaigns/ueta-esra-new-york-electronic-transactions-law/', 'New York City Bar']],
  ['Illinois', 'Adopted UETA in 2021 (815 ILCS 333), the 49th state to do so, replacing its older Electronic Commerce Security Act.', ['https://ilga.gov/legislation/ilcs/ilcs3.asp?ActID=4165&ChapterID=67', 'Illinois General Assembly']],
  ['Washington', 'Adopted UETA in 2020 (RCW chapter 1.80), for records on or after June 11, 2020.', ['https://app.leg.wa.gov/rcw/default.aspx?cite=1.80', 'Washington State Legislature']],
  ['California', 'UETA in Civil Code § 1633.1 and following.', ['https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1633.1', 'California Legislative Information']],
  ['Texas', 'UETA in Business & Commerce Code chapter 322.', ['https://statutes.capitol.texas.gov/Docs/BC/htm/BC.322.htm', 'Texas Statutes']],
  ['Florida', 'UETA in Florida Statutes § 668.50.', ['https://www.flsenate.gov/Laws/Statutes/2024/668.50', 'Florida Senate']],
  ['Every other state', 'UETA, adopted by all states except New York, plus the District of Columbia, Puerto Rico, and the U.S. Virgin Islands.', ['https://www.uniformlaws.org/committees/community-home?CommunityKey=2c04b76c-2b7d-4399-977e-d5876ba7e034', 'Uniform Law Commission']]
]
const STATES = {
  path: '/electronic-signature-laws-by-state',
  title: 'Are Electronic Signatures Legal in My State? E-Sign Laws by State',
  description: 'Electronic signatures are legal in all 50 states. How UETA, New York’s ESRA, and the federal ESIGN Act apply, the state citations, and which documents are excluded.',
  eyebrow: 'Legal basics', crumb: 'E-signature laws by state',
  h1: 'Are electronic signatures legal in my state?',
  lede: 'Yes, in every US state. Forty-nine states, plus DC, Puerto Rico, and the U.S. Virgin Islands, have adopted the Uniform Electronic Transactions Act (UETA). New York has its own law, and the federal ESIGN Act applies nationwide.',
  jsonld: [],
  body: [
    card(`<h2>The two layers of law</h2>${checklist(['<b>Federal: the ESIGN Act (2000)</b>, 15 U.S.C. § 7001 and following. For transactions affecting interstate or foreign commerce, a signature or contract can’t be denied legal effect solely because it’s electronic.', '<b>State: UETA (1999)</b>. A record or signature can’t be denied legal effect solely because it’s electronic, and an electronic signature satisfies a law that requires a signature, when the parties have agreed to do business electronically.'])}<p>Because of ESIGN, an e-signature on an interstate deal is valid even where state law differs, and UETA states’ rules line up with it.</p>`),
    card(`<h2>State by state</h2><div class="tbl-wrap"><table><thead><tr><th>State</th><th>Law</th><th>Source</th></tr></thead><tbody>${STATE_ROWS.map(([s, l, [h, t]]) => `<tr><td><b>${s}</b></td><td>${l}</td><td>${ext(h, t)}</td></tr>`).join('')}</tbody></table></div><p class="src">Checked on ${GUIDES_CHECKED}. States sometimes amend their versions of UETA; check the current statute for anything that matters.</p>`),
    card(`<h2>Documents that are usually excluded</h2><p>ESIGN and most state UETA versions exclude some records, including wills and testamentary trusts, adoption, divorce, and other family-law matters, court orders and official court documents, and certain notices: utility shutoffs, default, foreclosure, or eviction on a primary residence, and cancellation of health or life insurance. UETA also leaves most of the Uniform Commercial Code to its own rules. Documents that must be notarized or recorded have their own requirements; see <a href="/notarization-vs-e-signature">notarization vs e-signature</a>.</p>`),
    card(`<h2>By use case</h2><div class="tbl-wrap"><table><thead><tr><th>Document</th><th>Can it usually be e-signed?</th></tr></thead><tbody>
<tr><td>Business contracts, <a href="/nda">NDAs</a>, <a href="/contractor-agreement-e-signature">contractor agreements</a></td><td>Yes</td></tr>
<tr><td><a href="/leases">Leases and rental agreements</a></td><td>Yes; some landlord notices have extra rules</td></tr>
<tr><td>Offer letters and HR forms</td><td>Generally yes; some forms have agency-specific rules</td></tr>
<tr><td>Real estate purchase agreements</td><td>Generally yes; deeds that are recorded usually need notarization</td></tr>
<tr><td>Wills</td><td>Excluded from ESIGN and UETA; a few states have separate electronic-will laws</td></tr>
<tr><td>Divorce, adoption, court filings</td><td>Excluded; follow the court’s own e-filing rules</td></tr>
</tbody></table></div>`),
    card(`<h2>What makes an e-signature hold up</h2><p>The laws don’t require any particular software. What helps if a signature is ever questioned is evidence of intent to sign, consent to sign electronically, who signed, and that the document hasn’t changed. Easy Digital Signatures captures each signer’s ESIGN/UETA consent and adds a certificate page with their email, timestamps, IP address, and SHA-256 fingerprints of the file.</p><p>Sign a PDF yourself with the <a href="/sign-pdf-online">free PDF signer</a>, or <a href="/#/signup" data-cta="guide-signup">send your first document free</a>.</p>${LEGAL_NOTE}`)
  ].join('\n'),
  faqs: [
    ['Are electronic signatures legal in all 50 states?', 'Yes. Every state except New York has adopted UETA, New York’s Electronic Signatures and Records Act gives e-signatures the same validity as handwritten ones, and the federal ESIGN Act applies to interstate commerce everywhere.'],
    ['Which state hasn’t adopted UETA?', 'New York. It uses its own Electronic Signatures and Records Act instead. Illinois was the most recent to adopt UETA, in 2021.'],
    ['Can I e-sign a will?', 'Wills are excluded from ESIGN and UETA. A few states have separate electronic-will laws with their own requirements. Ask a lawyer in your state.'],
    ['Is a typed name a valid electronic signature?', 'It can be. ESIGN defines an electronic signature as a sound, symbol, or process attached to a record and adopted with intent to sign, so a typed name, a drawn signature, or a click can qualify. This isn’t legal advice.']
  ]
}

const WAIVER = {
  path: '/waiver-e-signature',
  title: 'Online Waiver and Consent Form Signing (Pay Per Signature)',
  description: 'Collect signed liability waivers, release, and consent forms online with a reusable signing link or in person on a tablet. No subscription; from 20¢ each.',
  eyebrow: 'Waivers and consent forms', crumb: 'Waiver e-signature',
  h1: 'Get waivers and consent forms signed online',
  lede: 'Turn your waiver or consent form into a signing link you can share, or hand people a tablet at the door. Each person signs their own copy, and you keep every signed PDF.',
  jsonld: [APP_LD],
  body: [
    card(`<h2>Three ways to collect signatures</h2>
<h3>1. A reusable signing link</h3><p>Upload your waiver, place the fields (name, date, signature, emergency contact, checkboxes), and save it as a one-signer <a href="/e-signature-templates">template</a>. Create a public signing link and put it in your booking confirmation, website, or a text message. Each person enters their name and email and signs their own copy. You can see how many have signed and turn the link off any time.</p>
<h3>2. In person on your device</h3><p>At check-in, use in-person signing and hand the participant your phone or tablet.</p>
<h3>3. Email it to a list</h3><p>For a group booking, a team, or a class roster, <a href="/bulk-send-documents-for-signature">bulk send</a> emails each person their own copy, with automatic reminders.</p>`),
    card(`<h2>Who uses it</h2>${checklist(['Gyms, studios, and personal trainers', 'Tour, rental, and outdoor activity operators', 'Event organizers and race directors', 'Camps, clubs, and youth sports (with a parent or guardian signing)', 'Salons, tattoo studios, and wellness practices collecting consent forms', 'Photographers and venues collecting releases'])}`),
    card(`<h2>Why pay per signature?</h2><p>Waiver apps usually charge a monthly fee. Here each signed waiver uses one document credit: your first is free, then $1, 50¢ each in a 10-pack, or 20¢ each in a 50-pack. No subscription, so a slow month costs nothing.</p>${PRICING_BLOCK}`),
    card(`<h2>Know the rules</h2><p>E-signatures on waivers and releases are generally valid in the US under the ESIGN Act and state UETA laws. Whether a waiver actually protects you depends on its wording and your state’s law, and some states limit waivers for negligence or for minors. Have a lawyer write or review your waiver; we don’t provide legal forms.</p>${LEGAL_NOTE}<p>Signing a waiver someone sent you as a PDF? Use the <a href="/sign-pdf-online">free PDF signer</a>.</p>`)
  ].join('\n'),
  faqs: [
    ['Can people sign a waiver on their phone?', 'Yes. The signing link opens in any mobile browser, with no app or account.'],
    ['How much does each signed waiver cost?', 'One document credit: $1, or 50¢ each in a 10-pack, or 20¢ each in a 50-pack. Your first is free after you verify your email. Saving the template and the link is free.'],
    ['Do I get a copy of every signed waiver?', 'Yes. Each response is its own signed PDF with a certificate page showing the signer’s email, when they signed, their IP address, and SHA-256 fingerprints.'],
    ['Can I turn the signing link off?', 'Yes. Deactivate it any time from your account, and it stops accepting new signatures.'],
    ['Do you provide a waiver template?', 'No. Upload your own waiver, ideally one a lawyer wrote for your state and activity.']
  ]
}

const NO_ADOBE = deviceGuide({
  path: '/sign-pdf-without-adobe',
  title: 'How to Sign a PDF Without Adobe (Free, Any Device)',
  description: 'Five free ways to sign a PDF without Adobe Acrobat: Mac Preview, iPhone Markup, Microsoft Edge, Google Drive, or our no-sign-up signer in any browser.',
  crumb: 'Sign a PDF without Adobe', h1: 'How to sign a PDF without Adobe',
  lede: 'You don’t need Acrobat or a subscription to sign a PDF. Your computer or phone already has a free way, and our browser signer works everywhere.',
  howName: 'How to sign a PDF without Adobe in a web browser', tools: ['Any web browser'],
  builtInTitle: 'The quickest way: sign it in your browser',
  builtIn: 'Works the same on Windows, Mac, iPhone, Android, and Chromebook, with no download or account.',
  builtInSteps: ['Open the <a href="/sign-pdf-online">free PDF signer</a> and choose your PDF. It opens in your browser and isn’t uploaded.', 'Tap <b>Signature</b> and draw, type, or upload your signature.', 'Drag it onto the line and resize it with the corner handle. Add <b>Initials</b>, <b>Text</b>, <b>Date</b>, or a <b>Check</b> where needed.', 'Tap <b>Download signed PDF</b> and send it back.'],
  source: '<p class="src">Your file is read and saved by your own browser. Nothing is sent to our servers.</p>', toolCard: false,
  more: `<h2>Built-in options on each device</h2><div class="tbl-wrap"><table><thead><tr><th>Device</th><th>Free built-in tool</th><th>Limits</th></tr></thead><tbody>
<tr><td><a href="/sign-pdf-on-mac">Mac</a></td><td>Preview: Markup → Sign</td><td>Saves your signature; the best built-in option</td></tr>
<tr><td><a href="/sign-pdf-on-iphone">iPhone and iPad</a></td><td>Markup in Files, Mail, or Notes</td><td>Saves your signature; draw only</td></tr>
<tr><td><a href="/sign-pdf-on-windows">Windows</a></td><td>Microsoft Edge: Draw</td><td>Freehand ink, no saved signature</td></tr>
<tr><td><a href="/sign-pdf-on-android">Android</a></td><td>Google Drive app: annotate pen</td><td>Freehand ink, no saved signature</td></tr>
</tbody></table></div><p>If you want a typed signature, or you sign with a mouse, the browser signer above is easier. Adobe Acrobat Reader is also free to download if you prefer an app, but you don’t need it.</p>`,
  faqs: [
    ['Can I sign a PDF for free without Adobe Acrobat?', 'Yes. Mac Preview, iPhone Markup, Microsoft Edge, and Google Drive can all add a signature for free, and our <a href="/sign-pdf-online">free PDF signer</a> works in any browser.'],
    ['Is my PDF safe in an online signer?', 'With our free signer, the file never leaves your device: your browser opens it and saves the signed copy. Other online tools may upload your file to their servers, so check before you use them for private documents.'],
    ['Can I sign a scanned PDF?', 'Yes. Signatures, text, and dates can be placed anywhere on the page, including scans with no form fields.']
  ]
})

export const GUIDE_PAGES = [IPHONE, ANDROID, MAC, WINDOWS, NO_ADOBE, CONTRACTOR, BY_EMAIL, NOTARY, STATES, WAIVER]
