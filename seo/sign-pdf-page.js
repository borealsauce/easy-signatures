import { APP_LD, SITE, checklist } from './layout.js'
import { PRICING_BLOCK } from './shared-blocks.js'

// Free in-browser "Sign PDF / Fill & Sign" tool (client code: seo/sign-pdf.js).
// Lives on /sign-pdf-online, the page that already targeted "sign pdf online free".

const CSS = `<style>
.sp-tool{padding:clamp(16px,3vw,32px)}
.sp-drop{border:2px dashed #94A3B8;border-radius:14px;background:#F8FAFC;padding:clamp(28px,6vw,56px) 18px;text-align:center;transition:background .15s,border-color .15s}
.sp-drop.over{background:#F0FDFA;border-color:#14B8A6}
.sp-drop h2{margin:0 0 6px}
.sp-drop p{margin:6px 0;color:#475569}
.sp-pick{position:relative;display:inline-flex;margin:14px 0 6px}
.sp-pick input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%}
.sp-pick:focus-within .s-btn{outline:3px solid #99F6E4;outline-offset:2px}
.sp-linkbtn{background:none;border:0;color:#0F766E;text-decoration:underline;cursor:pointer;font:inherit;padding:0}
.sp-priv{display:flex;gap:10px;align-items:flex-start;justify-content:center;margin:16px auto 0;max-width:620px;font-size:14px;color:#0F766E;text-align:left}
.sp-priv svg{flex:none;margin-top:2px}
#sp-msg{min-height:22px;margin:10px 0 0;font-size:14.5px;color:#0F766E;text-align:center}
#sp-msg.bad{color:#B91C1C}
.sp-bar{position:sticky;top:0;z-index:20;background:#fff;border-bottom:1px solid #E2E8F0;margin:0 calc(-1*clamp(16px,3vw,32px)) 12px;padding:10px clamp(16px,3vw,32px);display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sp-tools{display:flex;gap:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;flex:1 1 auto;min-width:0;padding-bottom:2px}
.sp-tb{flex:none;display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 14px;border:1px solid #CBD5E1;border-radius:10px;background:#fff;font:600 14px Inter,system-ui,sans-serif;color:#0F172A;cursor:pointer;white-space:nowrap}
.sp-tb:hover{border-color:#14B8A6;background:#F0FDFA}
.sp-tb.primary{background:#14C4B0;border-color:#14C4B0;color:#042F2E}
.sp-tb.primary:hover{background:#2DD4BF}
.sp-tb:disabled{opacity:.5;cursor:not-allowed}
.sp-meta{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;font-size:13.5px;color:#475569;margin:0 0 10px}
#sp-file-name{font-weight:600;color:#0F172A;overflow-wrap:anywhere}
#sp-pages{display:grid;gap:16px;justify-items:center;background:#E2E8F0;border-radius:12px;padding:clamp(8px,2vw,20px)}
.sp-page{position:relative;width:100%;max-width:880px;background:#fff;box-shadow:0 2px 10px rgba(15,23,42,.15);user-select:none;-webkit-user-select:none}
.sp-page canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.sp-pn{position:absolute;right:6px;bottom:6px;font-size:11px;color:#64748B;background:rgba(255,255,255,.85);padding:1px 6px;border-radius:6px;pointer-events:none}
.sp-item{position:absolute;touch-action:none;cursor:move;outline:1px dashed transparent;border-radius:3px;z-index:2}
.sp-item.sel,.sp-item:hover{outline-color:#14B8A6;background:rgba(20,184,166,.06)}
.sp-item.drag{opacity:.85}
.sp-item img{width:100%;height:100%;display:block;pointer-events:none}
.sp-item input{width:100%;height:100%;border:0;background:transparent;padding:0 0 0 .3em;margin:0;font-family:Helvetica,Arial,sans-serif;color:#0F172A;line-height:1;outline:0;cursor:move}
.sp-item input:focus{cursor:text}
.sp-del,.sp-rs{position:absolute;display:none;z-index:3}
.sp-item.sel .sp-del,.sp-item.sel .sp-rs{display:block}
.sp-del{top:-13px;right:-13px;width:26px;height:26px;border-radius:50%;border:0;background:#0F172A;color:#fff;font:700 16px/26px system-ui;cursor:pointer;padding:0}
.sp-rs{right:-11px;bottom:-11px;width:22px;height:22px;border-radius:50%;background:#14B8A6;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:nwse-resize}
@media (pointer:coarse){.sp-rs{width:30px;height:30px;right:-15px;bottom:-15px}.sp-del{width:30px;height:30px;line-height:30px;top:-15px;right:-15px}}
.sp-done{margin-top:16px;background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:18px}
.sp-done h3{margin:0 0 6px;font-size:18px}
.sp-done p{margin:0 0 12px;color:#334155}
.sp-dlg{position:fixed;inset:0;z-index:100;background:rgba(6,20,30,.55);display:flex;align-items:center;justify-content:center;padding:12px}
.sp-dlg[hidden]{display:none}
.sp-dlg-box{background:#fff;border-radius:16px;width:min(560px,100%);max-height:calc(100vh - 24px);overflow:auto;padding:20px;display:grid;gap:12px}
.sp-dlg-box h2{margin:0;font-size:20px}
.sp-tabs{justify-self:start;display:inline-flex;background:#F1F5F9;border-radius:999px;padding:4px;gap:4px}
.sp-tabs button{border:0;background:transparent;padding:8px 16px;border-radius:999px;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;color:#334155}
.sp-tabs button[aria-selected="true"]{background:#fff;color:#0F172A;box-shadow:0 1px 3px rgba(15,23,42,.12)}
.sp-pad{position:relative}
.sp-dlg canvas{width:100%;height:200px;display:block;border:1.5px dashed #94A3B8;border-radius:12px;background:#fff}
#sp-draw{touch-action:none;cursor:crosshair}
#sp-draw-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94A3B8;pointer-events:none;font-size:15px;text-align:center;padding:10px}
.sp-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.sp-mini{border:1px solid #CBD5E1;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;font:500 14px Inter,system-ui,sans-serif}
.sp-dlg input[type=text]{width:100%;font:16px Inter,system-ui,sans-serif;padding:11px 13px;border:1px solid #CBD5E1;border-radius:10px}
.sp-fonts{display:flex;flex-wrap:wrap;gap:6px}
.sp-font{border:1px solid #CBD5E1;background:#fff;border-radius:10px;padding:4px 12px;font-size:22px;cursor:pointer;color:#0F172A}
.sp-font[aria-pressed="true"],.sp-ink[aria-pressed="true"]{border-color:#14B8A6;box-shadow:0 0 0 3px rgba(20,184,166,.2)}
.sp-ink{width:30px;height:30px;border-radius:50%;border:2px solid #fff;outline:1px solid #CBD5E1;cursor:pointer}
#sp-up-prev{max-width:100%;max-height:160px;display:block;margin:8px auto 0;background:repeating-conic-gradient(#F1F5F9 0 25%,#fff 0 50%) 0 0/16px 16px;border-radius:8px}
#sp-dlg-msg{color:#B91C1C;font-size:14px;margin:0;min-height:18px}
.sp-dlg-foot{display:flex;justify-content:flex-end;gap:8px}
body.sp-noscroll{overflow:hidden}
@media (max-width:600px){.sp-tb{height:36px;padding:0 11px;font-size:13px}.sp-bar{gap:6px;padding-top:8px;padding-bottom:8px}#sp-download{width:100%}.sp-meta{font-size:12.5px}}
</style>`

const LOCK = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2.5" fill="#CCFBF1" stroke="#0F766E" stroke-width="1.8"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#0F766E" stroke-width="1.8" stroke-linecap="round"/></svg>`

const TOOL = `<section class="card sp-tool" id="tool" aria-label="Free PDF signing tool">
<div id="sp-start">
  <div class="sp-drop" id="sp-drop">
    <h2>Sign a PDF free, right here</h2>
    <p>Drop a PDF here, or choose one from your device.</p>
    <label class="sp-pick"><span class="s-btn big">Choose a PDF to sign</span><input id="sp-file" type="file" accept="application/pdf,.pdf" aria-label="Choose a PDF to sign"></label>
    <p style="font-size:14px">No account. No watermark. No email required. <button type="button" class="sp-linkbtn" id="sp-sample">Try a sample PDF</button></p>
    <div class="sp-priv">${LOCK}<span><b>Your file never leaves your browser.</b> The PDF is opened, signed, and saved on your own device. It isn’t uploaded to our servers, and we never see it.</span></div>
  </div>
</div>
<div id="sp-editor" hidden>
  <div class="sp-bar" role="toolbar" aria-label="Add to the PDF">
    <div class="sp-tools">
      <button type="button" class="sp-tb" id="sp-add-sig">✍️ Signature</button>
      <button type="button" class="sp-tb" id="sp-add-init">Initials</button>
      <button type="button" class="sp-tb" id="sp-add-text">T&nbsp;Text</button>
      <button type="button" class="sp-tb" id="sp-add-date">📅 Date</button>
      <button type="button" class="sp-tb" id="sp-add-check">✓ Check</button>
      <button type="button" class="sp-tb" id="sp-new-sig">New signature</button>
    </div>
    <button type="button" class="sp-tb primary" id="sp-download" disabled>⬇ Download signed PDF</button>
  </div>
  <div class="sp-meta"><span id="sp-file-name"></span><span>Tap a button to add it, then drag it into place. Drag the green dot to resize. <button type="button" class="sp-linkbtn" id="sp-reset">Use a different PDF</button></span></div>
  <div id="sp-pages"></div>
</div>
<p id="sp-msg" role="status" aria-live="polite"></p>
<div class="sp-done" id="sp-done" hidden>
  <h3>Done! Your signed PDF is downloaded.</h3>
  <p><b>Need someone else to sign it too?</b> Send it with Easy Digital Signatures: each signer gets a secure link, signs on any device, and everyone gets the finished PDF with an audit certificate. Your first document is free, then $1 or less.</p>
  <a class="s-btn" href="/#/signup" data-cta="pdf-tool-done">Send a document for signature, free</a>
</div>
</section>
<div class="sp-dlg" id="sp-dlg" hidden role="dialog" aria-modal="true" aria-labelledby="sp-dlg-title">
  <div class="sp-dlg-box">
    <h2 id="sp-dlg-title">Add your signature</h2>
    <div class="sp-tabs" role="tablist"><button type="button" role="tab" data-sigmode="draw" aria-selected="true">Draw</button><button type="button" role="tab" data-sigmode="type" aria-selected="false">Type</button><button type="button" role="tab" data-sigmode="upload" aria-selected="false">Upload</button></div>
    <div id="sp-m-draw"><div class="sp-pad"><canvas id="sp-draw" aria-label="Draw your signature here"></canvas><div id="sp-draw-hint">Sign here with your finger, mouse, or trackpad</div></div>
      <div class="sp-row" style="margin-top:8px"><button type="button" class="sp-mini" id="sp-undo">Undo</button><button type="button" class="sp-mini" id="sp-clear">Clear</button></div></div>
    <div id="sp-m-type" hidden><label for="sp-name" style="font-weight:600;font-size:14px">Your name</label><input id="sp-name" type="text" autocomplete="name" maxlength="60" placeholder="Jordan Hale">
      <div class="sp-fonts" id="sp-fonts" style="margin:10px 0"></div><canvas id="sp-typec" aria-label="Signature preview"></canvas></div>
    <div id="sp-m-up" hidden><p style="margin:0 0 8px;font-size:14px;color:#475569">Upload a photo or scan of your signature on white paper. We’ll remove the background on your device.</p><input id="sp-up-file" type="file" accept="image/*" aria-label="Signature image"><img id="sp-up-prev" alt="Your uploaded signature" hidden></div>
    <div class="sp-row"><span style="font-weight:600;font-size:14px">Ink</span><button type="button" class="sp-ink" data-ink="#0F172A" aria-pressed="true" aria-label="Black" style="background:#0F172A"></button><button type="button" class="sp-ink" data-ink="#1E3A8A" aria-pressed="false" aria-label="Blue" style="background:#1E3A8A"></button></div>
    <p id="sp-dlg-msg" role="alert"></p>
    <div class="sp-dlg-foot"><button type="button" class="sp-mini" id="sp-sig-cancel">Cancel</button><button type="button" class="s-btn" id="sp-sig-use">Add to PDF</button></div>
  </div>
</div>`

const card = inner => `<section class="card"><div class="prose">${inner}</div></section>`

export const SIGN_PDF_FAQS = [
  ['Is this PDF signer really free?', 'Yes. Signing and filling your own PDFs with this tool is free, with no account, no watermark, and no limit on how many files you sign.'],
  ['Is my PDF uploaded to your servers?', 'No. The tool runs entirely in your web browser. Your PDF is opened, signed, and saved on your device, and it is never sent to Easy Digital Signatures.'],
  ['Can I fill and sign a PDF form on my phone?', 'Yes. It works in Safari and Chrome on iPhone and Android: draw your signature with your finger, tap to add text and dates, and download the signed PDF.'],
  ['How do I add a signature to a PDF?', 'Choose your PDF, tap Signature, then draw, type, or upload your signature. Drag it into place on any page, resize it with the corner handle, and tap Download signed PDF.'],
  ['Is a PDF signed this way legally binding?', 'In the US, the ESIGN Act and state UETA laws generally treat electronic signatures like handwritten ones for most documents, with listed exceptions. When another person signs, an e-signature service with an audit trail gives stronger proof of who signed and when. This isn’t legal advice.'],
  ['How do I get someone else to sign my PDF?', 'Use <a href="/#/signup">Easy Digital Signatures</a>: upload the PDF, place fields for each signer, and email a secure signing link. Signers don’t need an account, and you get a signed PDF with an audit certificate. Your first document is free.'],
  ['What file size can I sign?', 'PDFs up to 50 MB. Very large scans may take a few seconds to open on older phones.']
]

export const SIGN_PDF_PAGE = {
  path: '/sign-pdf-online',
  title: 'Sign PDF Online Free: Fill & Sign PDFs, No Sign-Up',
  description: 'Sign a PDF online free. Draw, type, or upload your signature, fill in text and dates, and download the signed PDF. No account, and your file never leaves your browser.',
  eyebrow: 'Free PDF signer', crumb: 'Sign PDF online free',
  h1: 'Sign PDF online free',
  lede: 'Fill and sign any PDF in your browser. Add your signature, initials, text, and dates, then download. No sign-up, and your file is never uploaded.',
  noHeroCta: true,
  head: CSS,
  scripts: '<script src="/sign-pdf.js" defer></script>',
  jsonld: [{
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', '@id': SITE + '/sign-pdf-online#app',
    name: 'Free PDF Signer (Fill & Sign PDF)', url: SITE + '/sign-pdf-online',
    applicationCategory: 'BusinessApplication', applicationSubCategory: 'PDF signing', operatingSystem: 'Web browser (Windows, macOS, iOS, Android)',
    isAccessibleForFree: true, browserRequirements: 'Requires JavaScript and a modern web browser.',
    description: 'Sign and fill PDF files in your browser for free: draw, type, or upload a signature, add text and dates, and download. Files are processed on your device and never uploaded.',
    featureList: ['Draw, type, or upload a signature', 'Initials, text, dates, and check marks', 'Place and resize on any page', 'Works on phones and tablets', 'Files never leave the browser', 'No account or watermark'],
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': SITE + '/#organization' }
  }, APP_LD],
  body: [
    TOOL,
    card(`<h2>How to sign a PDF online for free</h2><ol class="steps">
<li><b>Choose your PDF.</b> Drop it on the box above or tap <b>Choose a PDF to sign</b>. It opens on your device; nothing is uploaded.</li>
<li><b>Add your signature.</b> Tap <b>Signature</b>, then draw it with your finger or mouse, type your name in a handwriting style, or upload a photo of your signature.</li>
<li><b>Fill in the rest.</b> Add <b>Text</b> for names, addresses, or amounts, a <b>Date</b>, your <b>Initials</b>, or a <b>Check</b> mark.</li>
<li><b>Place and resize.</b> Drag each item where it belongs on any page, and drag the green corner dot to make it bigger or smaller.</li>
<li><b>Download the signed PDF.</b> Tap <b>Download signed PDF</b>. The signature and text are saved into the PDF itself.</li>
</ol>`),
    card(`<h2>Private by design: your PDF stays on your device</h2><p>Most “free” PDF signers upload your file to their servers first. This one doesn’t. It uses your browser to open the PDF, place your signature, and write the new file, so contracts, tax forms, leases, and medical paperwork never leave your computer or phone.</p>${checklist(['No upload and no copy kept on our servers', 'No account, email, or credit card', 'No watermark on the signed PDF'])}`),
    card(`<h2>Fill and sign PDF forms</h2><p>Use it as a quick PDF form filler: tap <b>Text</b> to type into blanks on applications, permission slips, W-9s, or lease forms, add today’s date with one tap, check boxes with <b>✓ Check</b>, then sign. Prefer a typed signature? The <a href="/signature-generator">free signature generator</a> also makes a transparent PNG you can reuse anywhere. More tips in <a href="/blog/how-to-sign-a-pdf">how to sign a PDF</a> and <a href="/blog/how-to-sign-a-pdf-on-iphone-or-android">how to sign a PDF on your phone</a>.</p>`),
    card(`<h2>Need someone else to sign?</h2><p>This free tool is for signing your own copy. When a client, tenant, or coworker needs to sign, <b>Easy Digital Signatures</b> does the rest:</p>${checklist(['Email each signer a secure link; they sign on any device without an account', 'Signing order, reminders, and initials, date, and text fields for every signer', 'A flattened signed PDF plus an audit certificate with timestamps and SHA-256 fingerprints', 'First document free, then $1 each, 10 for $5, or 50 for $10'])}<p><a class="s-btn" href="/#/signup" data-cta="pdf-tool-body">Send a PDF for signature, free</a> &nbsp; <a href="/send-document-for-signature">How sending for signature works</a> · <a href="/fill-and-sign-pdf">Fill and sign with other people</a> · <a href="/bulk-send-documents-for-signature">Bulk send</a> · <a href="/best-free-e-signature-software">Best free e-signature software</a></p>`),
    card(`<h2>Pricing for sending to others</h2>${PRICING_BLOCK}`)
  ].join('\n'),
  faqs: SIGN_PDF_FAQS
}
