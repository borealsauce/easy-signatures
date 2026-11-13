const sig = `<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 11.5c2-1 3.4 1.1 5-.2 1.8-1.4 2.7-3.5 6-2.5"/><path d="M3 13.5h6.5"/></svg>`

export function marketingHtml({ loggedIn }) {
  const start = loggedIn ? '#/new' : '#/signup'
  const account = loggedIn ? '<a href="#/app">Dashboard</a>' : '<a href="#/login">Log in</a>'
  return `<div class="mkt">
  <header class="hero">
    <div class="hero-bg"></div>
    <nav>
      <a class="logo" href="#/">${logo()} Easy Digital Signatures</a>
      <div class="nav-links">
        <a class="btn btn-teal" href="${start}">Start free</a>
        <a href="#pricing">Pricing</a>
        ${account}
        <a href="#/contact">Need help?</a>
      </div>
    </nav>
    <div class="hero-copy">
      <div class="eyebrow">Electronic signatures</div>
      <h1>Send it. Get it signed.<br>Too Easy.</h1>
      <p class="sub">Place fields on any PDF, email a secure link, and finish with a flattened file plus an audit certificate. Signers never need an account.</p>
      <div class="cta-row">
        <a class="btn-hero" href="${start}"><strong>Actually start free</strong><em>First document’s on the house</em></a>
        <a class="btn btn-outline" href="#pricing">See pricing</a>
      </div>
    </div>
  </header>
  <div class="shot-wrap">
    <aside class="editor" aria-label="Signing editor preview">
      <div class="ed-bar"><div class="dots"><span></span><span></span><span></span></div><div class="ed-title">Vendor MSA.pdf</div><span class="badge">Sample</span><a class="btn-send" href="${start}">Send for signature</a></div>
      <div class="ed-body">
        <div class="fields"><div class="fields-label">Fields</div>
          <div class="chip ghost">${sig}Signature</div>
          <div class="chip">${sig}Initials</div>
          <div class="chip">${sig}Date</div>
          <div class="chip">${sig}Name</div>
          <div class="chip">${sig}Text</div>
        </div>
        <div class="page-wrap"><div class="paper">
          <div class="paper-kicker">Vendor agreement</div>
          <h3>Master Services Agreement</h3>
          <p>This agreement is entered into by Acme Corp (“Client”) and Helio Labs (“Vendor”) as of the date of last signature below.</p>
          <p>Vendor will provide the services described in Exhibit A. This agreement begins on the date it is fully signed and continues until completed or terminated in writing.</p>
          <div class="sig-row">
            <div><div class="party">Client — Acme Corp</div><div class="drop-zone">Drop Signature</div></div>
            <div><div class="party">Vendor — Helio Labs</div><div class="placed"><span class="lbl">Signature</span><span class="sig-value">Jordan Hale</span></div><div class="placed date-box"><span class="lbl">Date</span><span class="date-value">Nov 13, 2026</span></div></div>
          </div>
          <div class="drag-float"><div class="drag-chip">${sig}Signature</div></div>
        </div></div>
      </div>
    </aside>
  </div>
  <section class="pricing" id="pricing">
    <div class="wrap">
      <h2>Pricing</h2>
      <p class="lede">Your first document is free. After that, buy a pack and use it whenever you send.</p>
      <div class="price-grid">
        <article class="plan"><h3>First document</h3><div class="amt">Free</div><p class="desc">Your first document is on the house</p><ul><li>Verify your email and phone</li><li>Sealed PDF and audit certificate</li></ul><a class="btn btn-teal" href="${start}">Actually start free</a></article>
        <article class="plan"><h3>1 document</h3><div class="amt">$1</div><p class="desc">Pay as you go</p><ul><li>Use it whenever you send</li><li>Apple Pay and Google Pay at checkout</li></ul><button class="btn btn-ghost" onclick="buy('doc1')">Buy 1</button></article>
        <article class="plan"><h3>10 documents</h3><div class="amt">$5</div><p class="desc">50¢ per document</p><ul><li>Use them whenever you send</li><li>Apple Pay and Google Pay at checkout</li></ul><button class="btn btn-ghost" onclick="buy('doc10')">Buy 10</button></article>
        <article class="plan featured"><h3>50 documents · Best value</h3><div class="amt">$10</div><p class="desc">20¢ per document</p><ul><li>Use them whenever you send</li><li>Apple Pay and Google Pay at checkout</li></ul><button class="btn" onclick="buy('doc50')">Buy 50</button></article>
      </div>
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
          <article class="feat"><div class="icon">${sig}</div><h3>One free document</h3><p>Verify email and a mobile number. After that, $1 each, 10 for $5, or 50 for $10.</p></article>
        </div>
      </div>
    </div>
  </section>
  <footer><div class="foot"><div>Easy Digital Signatures</div><nav><a href="#/contact">Privacy</a><a href="#/contact">Terms</a><a href="#/contact">Contact</a></nav><div>© 2026</div></div></footer>
  </div>`
}

function logo() {
  return `<svg width="26" height="26" viewBox="0 0 28 28" fill="none" aria-hidden="true"><rect width="28" height="28" rx="7" fill="#14C4B0"/><path d="M6.5 16.2c2.6-1.1 4.4 1.4 6.5-.2 2.3-1.7 3.5-4.4 7.8-3.2" stroke="#042F2E" stroke-width="1.8" stroke-linecap="round"/><path d="M7.2 19.4h8.4" stroke="#042F2E" stroke-width="1.5" stroke-linecap="round" opacity="0.65"/></svg>`
}
