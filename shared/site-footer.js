import { logoMarkSvg, WORDMARK, BRAND_NAME } from './logo.js'
// Site-wide footer with internal links. Used by the homepage (marketing.js, in the browser
// and when the server prerenders it) and by every SEO page (seo/layout.js).
export const FOOTER_GROUPS = [
  ['Product', [
    ['/', 'Home'],
    ['/pricing', 'Pricing'],
    ['/e-signature-pricing', 'E-signature pricing'],
    ['/free-electronic-signature', 'Free electronic signature'],
    ['/sign-pdf-online', 'Sign PDF free (no sign-up)'],
    ['/sign-document-online-free', 'Sign documents online free'],
    ['/send-document-for-signature', 'Send for signature'],
    ['/fill-and-sign-pdf', 'Fill and sign PDF'],
    ['/sign-word-document-online', 'Sign Word files online'],
    ['/pay-per-document-e-signature', 'Pay per document'],
    ['/bulk-send-documents-for-signature', 'Bulk send'],
    ['/e-signature-templates', 'Templates and signing links'],
    ['/signature-generator', 'Free signature generator'],
    ['/contact', 'Contact']
  ]],
  ['Compare', [
    ['/best-free-e-signature-software', 'Best free e-signature software'],
    ['/free-docusign-alternative', 'Free DocuSign alternatives'],
    ['/signnow-alternative', 'SignNow alternative'],
    ['/smallpdf-sign-alternative', 'Smallpdf / iLovePDF Sign alternative'],
    ['/formswift-alternative', 'FormSwift alternative'],
    ['/docusign-alternative', 'DocuSign alternative'],
    ['/dropbox-sign-alternative', 'Dropbox Sign alternative'],
    ['/adobe-sign-alternative', 'Adobe Sign alternative'],
    ['/pandadoc-alternative', 'PandaDoc alternative']
  ]],
  ['Use cases', [
    ['/real-estate', 'Real estate'],
    ['/leases', 'Leases and rentals'],
    ['/contractors', 'Contractors'],
    ['/hr-onboarding', 'HR onboarding'],
    ['/nda', 'NDAs']
  ]],
  ['Guides', [
    ['/blog', 'Blog'],
    ['/blog/are-electronic-signatures-legal', 'Are e-signatures legal?'],
    ['/blog/how-to-sign-a-pdf', 'How to sign a PDF'],
    ['/blog/how-to-electronically-sign-a-document', 'How to e-sign a document'],
    ['/blog/how-to-sign-a-pdf-on-iphone-or-android', 'Sign a PDF on your phone'],
    ['/blog/how-to-sign-a-word-document', 'Sign a Word document'],
    ['/blog/how-to-sign-a-google-doc', 'Sign a Google Doc'],
    ['/blog/how-to-sign-a-lease-online', 'How to sign a lease online'],
    ['/blog/electronic-signature-vs-digital-signature', 'E-signature vs digital signature'],
    ['/blog/e-signature-cost-comparison', 'E-signature cost comparison']
  ]]
]

export const FOOTER_CSS = `footer.site-foot{background:#06141E;color:rgba(226,232,240,.78);font:14px/1.5 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;padding:56px 0 28px;margin-top:0}
.site-foot .sf-wrap{width:min(1120px,calc(100% - 32px));margin:0 auto}
.site-foot .sf-grid{display:grid;grid-template-columns:1.3fr repeat(4,1fr);gap:28px}
.site-foot .sf-brand{display:flex;align-items:center;gap:10px;color:#F8FAFC;font-weight:600;font-size:15px;text-decoration:none}
.site-foot .sf-tag{margin:12px 0 0;max-width:260px;font-size:13.5px;color:rgba(226,232,240,.65)}
.site-foot .sf-grid h2{font-size:11.5px;letter-spacing:.12em;text-transform:uppercase;color:#5EEAD4;margin:0 0 12px;font-weight:650;font-family:inherit}
.site-foot ul{list-style:none;margin:0;padding:0}
.site-foot li{margin:0 0 8px}
.site-foot a{color:rgba(226,232,240,.82);text-decoration:none}
.site-foot a:hover{color:#fff;text-decoration:underline}
.site-foot .sf-base{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.1);margin-top:36px;padding-top:20px;font-size:12.5px;color:rgba(226,232,240,.55)}
@media (max-width:860px){.site-foot .sf-grid{grid-template-columns:1fr 1fr}.site-foot .sf-about{grid-column:1/-1}}`

export function siteFooterHtml() {
  const cols = FOOTER_GROUPS.map(([title, links]) => `<nav aria-label="${title}"><h2>${title}</h2><ul>${links.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></nav>`).join('')
  return `<style>${FOOTER_CSS}</style><footer class="site-foot"><div class="sf-wrap"><div class="sf-grid"><div class="sf-about"><a class="sf-brand" href="/" aria-label="${BRAND_NAME}">${logoMarkSvg({ size: 26 })} ${WORDMARK}</a><p class="sf-tag">Send PDFs for e-signature. First document free, then $1 each, 10 for $5, or 50 for $10. No subscription.</p></div>${cols}</div><div class="sf-base"><span>© ${new Date().getFullYear()} Easy Digital Signatures</span><span><a href="/privacy">Privacy</a> · <a href="/terms">Terms</a> · <a href="/contact">Contact</a></span><span>Use of this site constitutes acceptance of our <a href="/terms" style="text-decoration:underline">Terms</a>. Information on this site is general and is not legal advice.</span></div></div></footer>`
}
