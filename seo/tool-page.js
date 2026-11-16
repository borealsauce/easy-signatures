import { APP_LD, SITE, checklist } from './layout.js'

const GEN_CSS = `<style>
.sg{display:grid;gap:14px}
.sg-tabs{justify-self:start;display:inline-flex;background:#F1F5F9;border-radius:999px;padding:4px;gap:4px}
.sg-tabs button{border:0;background:transparent;padding:8px 18px;border-radius:999px;font:600 14px Inter,system-ui,sans-serif;cursor:pointer;color:#334155}
.sg-tabs button[aria-selected="true"]{background:#fff;color:#0F172A;box-shadow:0 1px 3px rgba(15,23,42,.12)}
.sg label{font-weight:600;font-size:14px;display:block;margin-bottom:6px}
.sg input[type=text]{width:100%;font:16px Inter,system-ui,sans-serif;padding:12px 14px;border:1px solid #CBD5E1;border-radius:10px}
.sg-fonts{display:flex;flex-wrap:wrap;gap:8px}
.sg-font{border:1px solid #CBD5E1;background:#fff;border-radius:10px;padding:6px 14px;font-size:22px;cursor:pointer;color:#0F172A}
.sg-font[aria-pressed="true"],.sg-color[aria-pressed="true"]{border-color:#14B8A6;box-shadow:0 0 0 3px rgba(20,184,166,.18)}
.sg-colors{display:flex;gap:8px;align-items:center}
.sg-color{width:32px;height:32px;border-radius:50%;border:2px solid #fff;outline:1px solid #CBD5E1;cursor:pointer}
.sg canvas{width:100%;height:220px;display:block;border:1.5px dashed #94A3B8;border-radius:12px;background:#fff linear-gradient(transparent calc(70% - 1px),#E2E8F0 calc(70% - 1px),#E2E8F0 70%,transparent 70%)}
#sg-draw-canvas{touch-action:none;cursor:crosshair}
.sg-draw-wrap{position:relative}
#sg-draw-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94A3B8;pointer-events:none;font-size:15px}
.sg-row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.sg-row button.mini{border:1px solid #CBD5E1;background:#fff;border-radius:8px;padding:7px 12px;cursor:pointer;font:500 14px Inter,system-ui,sans-serif}
#sg-msg{font-size:14px;color:#0F766E;min-height:20px;margin:0}
.sg-next{background:#F0FDFA;border:1px solid #99F6E4;border-radius:12px;padding:16px}
</style>`

export const TOOL_PAGE = {
  path: '/signature-generator',
  title: 'Free Signature Generator: Make a Handwritten Signature Online',
  description: 'Free online signature maker: type your name in a handwriting font or draw it with your mouse or finger, then download a transparent PNG. Nothing is uploaded.',
  eyebrow: 'Free tool', crumb: 'Signature generator',
  h1: 'Free signature generator',
  lede: 'Type your name or draw your signature, then download a transparent PNG. It’s made in your browser, and nothing is uploaded.',
  noHeroCta: true,
  head: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@600&family=Caveat:wght@600&family=Allura&family=Sacramento&display=swap">${GEN_CSS}`,
  scripts: '<script src="/signature-generator.js" defer></script>',
  jsonld: [{
    '@context': 'https://schema.org', '@type': 'WebApplication', name: 'Free Signature Generator', url: SITE + '/signature-generator',
    applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web browser', isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': SITE + '/#organization' }
  }, APP_LD],
  body: `<section class="card"><div class="sg">
<div class="sg-tabs" role="tablist"><button type="button" role="tab" data-mode="type" aria-selected="true">Type</button><button type="button" role="tab" data-mode="draw" aria-selected="false">Draw</button></div>
<div id="sg-type"><label for="sg-name">Your name</label><input id="sg-name" type="text" autocomplete="name" placeholder="Jordan Hale" maxlength="60">
<div style="height:12px"></div><label>Style</label><div class="sg-fonts" id="sg-fonts"></div>
<div style="height:12px"></div><canvas id="sg-type-canvas" aria-label="Signature preview"></canvas></div>
<div id="sg-draw" hidden><div class="sg-draw-wrap"><canvas id="sg-draw-canvas" aria-label="Draw your signature here"></canvas><div id="sg-draw-hint">Sign here with your mouse, trackpad, or finger</div></div>
<div class="sg-row" style="margin-top:10px"><button type="button" class="mini" id="sg-undo">Undo</button><button type="button" class="mini" id="sg-clear">Clear</button><label for="sg-width" style="margin:0 0 0 8px">Pen</label><input id="sg-width" type="range" min="1.5" max="6" step="0.5" value="3"></div></div>
<div class="sg-row"><span style="font-weight:600;font-size:14px">Ink</span><div class="sg-colors"><button type="button" class="sg-color" data-color="#0F172A" aria-pressed="true" aria-label="Black" style="background:#0F172A"></button><button type="button" class="sg-color" data-color="#1E3A8A" aria-pressed="false" aria-label="Blue" style="background:#1E3A8A"></button><button type="button" class="sg-color" data-color="#115E59" aria-pressed="false" aria-label="Teal" style="background:#115E59"></button></div></div>
<div class="sg-row"><button type="button" class="s-btn big" id="sg-download">Download PNG</button></div>
<p class="src" style="margin:0">By using this tool you agree to our <a href="/terms">Terms</a>.</p>
<p id="sg-msg" role="status"></p>
<div class="sg-next" id="sg-next" hidden><b>Need someone else to sign?</b> Upload a PDF, place the fields, and send a signing link. Your first document is free. <a href="/#/signup" data-cta="generator">Create a free account</a></div>
</div></section>
<section class="card"><div class="prose"><h2>How to use your signature image</h2>
<ol class="steps"><li>Type your name and pick a style, or switch to <b>Draw</b> and sign with your mouse or finger.</li><li>Choose black, blue, or teal ink.</li><li>Click <b>Download PNG</b>. The image has a transparent background, so it sits cleanly on any document.</li><li>Insert it into a Word document, Google Doc, PDF editor, or email signature.</li></ol>
<h2>Private by design</h2><p>Your signature is created on your device with the browser’s canvas. We don’t upload, store, or see it.</p>
<h2>When a signature image isn’t enough</h2><p>Pasting an image works for your own paperwork. When you need someone else to sign, or you want proof of who signed and when, use an e-signature service. Easy Digital Signatures emails each signer a secure link and gives everyone a flattened PDF with an audit certificate.</p>
${checklist(['First document free, then $1 each, 10 for $5, or 50 for $10', 'Signers don’t need an account', 'Audit certificate with timestamps, IP addresses, and SHA-256 fingerprints'])}
<p><a class="s-btn" href="/#/signup" data-cta="generator-body">Send a document for signature</a></p></div></section>`,
  faqs: [
    ['Is this signature generator free?', 'Yes. It’s free with no sign-up, and you can download as many images as you like.'],
    ['Is a signature image legally binding?', 'Under US law, an electronic signature is any electronic symbol or process adopted with intent to sign, so an image can count. But a pasted image alone gives little proof of who added it. For agreements with other people, an e-signature service with an audit trail is stronger evidence. This isn’t legal advice.'],
    ['Do you keep a copy of my signature?', 'No. The image is generated in your browser and never sent to our servers.'],
    ['What format is the download?', 'A PNG with a transparent background, cropped to your signature.']
  ]
}
