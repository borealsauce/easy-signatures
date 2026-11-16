import { siteFooterHtml } from './shared/site-footer.js'
import { homeFaqHtml } from './shared/home-faq.js'
import { logoMarkSvg, WORDMARK, BRAND_NAME } from './shared/logo.js'

const sig = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 11.5c2-1 3.4 1.1 5-.2 1.8-1.4 2.7-3.5 6-2.5"/><path d="M3 13.5h6.5"/></svg>`
const initials = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="2.5" y="3.5" width="11" height="9" rx="1.5"/><path d="M5.5 9.2c.7-.4 1.3.2 2-.2.8-.5 1.2-1.3 2.6-.9"/></svg>`
const dateIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="3.5" width="11" height="10" rx="1.5"/><path d="M2.5 6.5h11M6 2.5v2M10 2.5v2"/></svg>`
const nameIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="8" cy="6" r="2.2"/><path d="M3.5 13c.6-2.3 2.2-3.4 4.5-3.4S11.9 10.7 12.5 13"/></svg>`
const textIcon = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M3 4.5h10M3 8h7M3 11.5h8.5"/></svg>`
const cursor = `<svg class="cursor" viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" stroke="#0F172A" stroke-width="1.3" stroke-linejoin="round" d="M5 2.8v17.2l4.4-4.2 3 6.6 2.5-1.1-3-6.5 5.8-.1z"/></svg>`

const tick = `<svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 10.5l3.2 3L15 6.5" fill="none" stroke="#5EEAD4" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
// Only facts about the product itself. No reviews, user counts, or customer logos until they're real.
const TRUST = ['Signers sign on any phone or computer, no account', 'Audit certificate with timestamps and SHA-256 fingerprints', 'ESIGN / UETA consent captured from every signer', 'Secure checkout by Stripe · card, Apple Pay, Google Pay']

export function marketingHtml({ loggedIn, smsEnabled = true }) {
  const start = loggedIn ? '#/new' : '#/signup'
  const verifyLine = smsEnabled ? 'Verify your email and phone' : 'Verify your email'
  const freeLine = smsEnabled
    ? 'Verify email and a mobile number. After that, $1 each, 10 for $5, or 50 for $10.'
    : 'Verify your email. After that, $1 each, 10 for $5, or 50 for $10.'
  const account = loggedIn ? '<a href="#/app">Dashboard</a>' : '<a href="#/login">Log in</a>'
  return `<div class="mkt">
  <header class="hero">
    <div class="hero-bg"></div>
    <nav>
      <a class="logo" href="#/" aria-label="${BRAND_NAME}">${logo()} ${WORDMARK}</a>
      <div class="nav-links">
        <a class="btn btn-teal" href="${start}" data-cta="home-nav">Start free</a>
        <a class="nav-free" href="/sign-pdf-online">Sign PDF free</a>
        <a href="#pricing">Pricing</a>
        ${account}
        <a href="#/contact">Need help?</a>
      </div>
    </nav>
    <div class="hero-copy">
      <div class="eyebrow">Electronic signatures</div>
      <h1>Send it. Get it signed.<br>Too Easy.</h1>
      <p class="sub">Upload a PDF, drag on signature fields, and email a secure signing link. Signers don’t need an account, and you get a flattened PDF with an audit certificate. <b>First document free, then $1 or less. No subscription.</b></p>
      <div class="cta-row">
        <a class="btn-hero" href="${start}" data-cta="home-hero"><strong>${loggedIn ? 'Send a document' : 'Send your first document free'}</strong><em>No credit card · no subscription</em></a>
        <a class="btn btn-outline" href="#pricing" data-cta="home-pricing">See pricing</a>
      </div>
      <a class="free-tool" href="/sign-pdf-online" data-cta="home-free-tool"><span class="free-tool-tag">Free tool</span> <span>Just need to sign a PDF yourself? <b>Sign PDF online free&nbsp;→</b></span> <span class="free-tool-note">No account. Your file never leaves your browser.</span></a>
      <ul class="trust" aria-label="Why Easy Digital Signatures">${TRUST.map(t => `<li>${tick}${t}</li>`).join('')}</ul>
    </div>
    <div class="demo" aria-label="Signing editor preview">
      <div class="fields">
        <div class="fields-label">Fields</div>
        <div class="chip ghost">${sig}Signature</div>
        <div class="chip">${initials}Initials</div>
        <div class="chip">${dateIcon}Date</div>
        <div class="chip">${nameIcon}Name</div>
        <div class="chip">${textIcon}Text</div>
      </div>
      <div class="paper">
        <div class="paper-meta">Vendor MSA.pdf · Sample</div>
        <div class="paper-kicker">Vendor agreement</div>
        <div class="paper-title">Master Services Agreement</div>
        <p>This agreement is entered into by Acme Corp (“Client”) and Helio Labs (“Vendor”) as of the date of last signature below.</p>
        <p>Vendor will provide the services described in Exhibit A. This agreement begins on the date it is fully signed and continues until completed or terminated in writing.</p>
        <div class="sig-row">
          <div><div class="party">Client — Acme Corp</div><div class="drop-zone">Drop Signature</div></div>
          <div><div class="party">Vendor — Helio Labs</div><div class="placed"><span class="lbl">Signature</span><span class="sig-value">Jordan Hale</span></div><div class="placed date-box"><span class="lbl">Date</span><span class="date-value">Nov 14, 2026</span></div></div>
        </div>
      </div>
      <div class="drag-float"><div class="drag-chip">${sig}Signature</div>${cursor}</div>
    </div>
  </header>
  <section class="pricing" id="pricing">
    <div class="wrap">
      <h2>Pricing</h2>
      <p class="lede">Your first document is free. After that, buy a pack and use it whenever you send.</p>
      <div class="price-grid">
        <article class="plan"><h3>First document</h3><div class="amt">Free</div><p class="desc">Your first document is on the house</p><ul><li>${verifyLine}</li><li>Sealed PDF and audit certificate</li></ul><a class="btn btn-teal" href="${start}" data-cta="home-plan-free">Start free</a></article>
        <article class="plan"><h3>1 document</h3><div class="amt">$1</div><p class="desc">Pay as you go</p><ul><li>Use it whenever you send</li><li>Apple Pay and Google Pay at checkout</li></ul><button class="btn btn-ghost" onclick="buy('doc1')">Buy 1</button></article>
        <article class="plan"><h3>10 documents</h3><div class="amt">$5</div><p class="desc">50¢ per document</p><ul><li>Use them whenever you send</li><li>Apple Pay and Google Pay at checkout</li></ul><button class="btn btn-ghost" onclick="buy('doc10')">Buy 10</button></article>
        <article class="plan featured"><h3>50 documents · Best value</h3><div class="amt">$10</div><p class="desc">20¢ per document</p><ul><li>Use them whenever you send</li><li>Apple Pay and Google Pay at checkout</li></ul><button class="btn" onclick="buy('doc50')">Buy 50</button></article>
      </div>
      <p style="margin:14px 0 0;font-size:13px;color:#64748B;text-align:center">By purchasing, you agree to our <a href="/terms" style="color:#0F766E;text-decoration:underline">Terms</a>. Credits are non-refundable once used.</p>
    </div>
  </section>
  <section class="workspace">
    <div class="wrap">
      <h2>What you actually use</h2>
      <p class="lede">The parts teams ask for on day one — plus a live view of every document in motion.</p>
      <div class="work-grid">
        <aside class="tracker">
          <div class="tracker-head"><h3>Document status</h3><span class="badge">Sample</span></div>
          <div class="track-top"><div class="donut"><div class="donut-label"><b>174</b><span>documents</span></div></div>
            <div><div class="tstat signed"><b>128</b><span>Signed</span></div><div class="tstat await" style="margin-top:10px"><b>46</b><span>Out for signature</span></div></div>
          </div>
          <div class="activity"><h4>Recent activity</h4>
            <div class="act"><div><span class="name">Vendor MSA</span> <span class="meta">Helio Labs</span></div><span class="pill pill-ok">Signed</span><span class="when">2 min ago</span></div>
            <div class="act"><div><span class="name">Offer letter</span> <span class="meta">J. Patel</span></div><span class="pill pill-wait">Out for signature</span><span class="when">1 hr ago</span></div>
            <div class="act"><div><span class="name">Master NDA</span> <span class="meta">Acme Corp</span></div><span class="pill pill-ok">Signed</span><span class="when">Yesterday</span></div>
            <div class="act"><div><span class="name">Statement of work</span> <span class="meta">Northside</span></div><span class="pill pill-ok">Signed</span><span class="when">Nov 12</span></div>
          </div>
        </aside>
        <div class="feat-grid">
          <article class="feat"><div class="icon">${sig}</div><h3>Drag-and-drop fields</h3><p>Signature, initials, date, and text. Click to place, Shift-click to repeat, Esc to cancel.</p></article>
          <article class="feat"><div class="icon">${sig}</div><h3>Guided signing on any device</h3><p>Signers move field to field in the browser. No account, no app to install.</p></article>
          <article class="feat"><div class="icon">${sig}</div><h3>Audit certificate</h3><p>A flattened PDF plus a certificate page with timestamps, IP, and SHA-256 fingerprints.</p></article>
          <article class="feat"><div class="icon">${sig}</div><h3>Reminders that keep it moving</h3><p>Set a nudge and an expiration. Pending signers get a real email, not a log line.</p></article>
          <article class="feat"><div class="icon">${sig}</div><h3>Reusable templates</h3><p>Build from a blank page or your own file. Roles, not prewritten legal forms.</p></article>
          <article class="feat"><div class="icon">${sig}</div><h3>One free document</h3><p>${freeLine}</p></article>
        </div>
      </div>
    </div>
  </section>
  ${homeFaqHtml()}
  ${siteFooterHtml()}
  </div>`
}

function logo() {
  return logoMarkSvg({ size: 32, className: 'logo-mark' })
}
