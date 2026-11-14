// Homepage FAQ. Rendered by marketing.js and mirrored into FAQPage JSON-LD by the server.
export const HOME_FAQ = [
  ['How much does Easy Digital Signatures cost?', 'Your first document is free after you verify your email. After that it’s $1 per document, 10 documents for $5, or 50 for $10. There’s no subscription.'],
  ['Do signers need an account?', 'No. Each signer gets a secure link by email and signs in the browser on a phone or computer.'],
  ['Are electronic signatures legally binding?', 'In the US, the federal ESIGN Act and state laws based on the Uniform Electronic Transactions Act generally give e-signatures the same effect as handwritten ones, with exceptions such as wills and certain court and family-law documents. This is general information, not legal advice.'],
  ['What do I get when everyone has signed?', 'A flattened PDF with the signatures on the page, plus a certificate page listing each signer, timestamps, IP addresses, and SHA-256 fingerprints you can check on our verify page.'],
  ['Can several people sign one document?', 'Yes. Add as many signers as you need, and choose whether they sign in order or all at once. One document uses one credit however many people sign it.']
]

const e = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

export function homeFaqHtml() {
  return `<style>.home-faq{padding:56px 0 64px}.home-faq h2{margin:0 0 18px}.home-faq details{background:#fff;border:1px solid #E2E8F0;border-radius:12px;padding:14px 18px;margin:0 0 10px}.home-faq summary{cursor:pointer;font-weight:600;font-size:15.5px;color:#0F172A}.home-faq details p{margin:8px 0 0;color:#475569;font-size:14.5px;line-height:1.6}.home-faq .more{font-size:14px;color:#475569;margin-top:14px}.home-faq .more a{color:#0F766E;text-decoration:underline}</style>
  <section class="home-faq" aria-labelledby="home-faq-h"><div class="wrap" style="max-width:820px">
    <h2 id="home-faq-h">Questions</h2>
    ${HOME_FAQ.map(([q, a]) => `<details><summary>${e(q)}</summary><p>${e(a)}</p></details>`).join('')}
    <p class="more">More: <a href="/e-signature-pricing">pricing compared</a> · <a href="/blog/are-electronic-signatures-legal">e-signature law</a> · <a href="/signature-generator">free signature generator</a></p>
  </div></section>`
}
