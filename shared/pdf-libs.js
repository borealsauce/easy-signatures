// Load pdf.js and pdf-lib only when a page actually needs them (they're ~280 KB and not needed for the
// homepage, signup, or login). Same pinned CDN versions as before.
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
const PDFLIB = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js'
const cache = {}
function loadScript(src) {
  return cache[src] || (cache[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script'); s.src = src; s.async = true
    s.onload = resolve
    s.onerror = () => { delete cache[src]; reject(new Error('Could not load the PDF tools. Check your connection and try again.')) }
    document.head.appendChild(s)
  }))
}
export async function pdfjs() {
  if (!window.pdfjsLib) await loadScript(PDFJS)
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER
  return window.pdfjsLib
}
export async function pdfLib() {
  if (!window.PDFLib) await loadScript(PDFLIB)
  return window.PDFLib
}
// Start downloading both in the background (e.g. once the user is in the app).
export function warmPdfLibs() { pdfjs().catch(() => {}); pdfLib().catch(() => {}) }
