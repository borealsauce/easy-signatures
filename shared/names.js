// Name parsing shared by the editor preview and the tests.
// A middle name produces a third initial: "Mary Anne Jones" → "MAJ".
const SUFFIX = /^(jr|sr|ii|iii|iv|v|esq|md|phd|dds|cpa)$/i

export function nameParts(n) {
  return String(n || '')
    .trim()
    .split(/\s+/)
    .map(w => w.replace(/[^\p{L}'-]/gu, ''))
    .filter(w => w && !SUFFIX.test(w.replace(/\./g, '')))
}

export function initialsOf(n) {
  return nameParts(n)
    .map(w => w.replace(/^[^\p{L}]+/u, '')[0] || '')
    .join('')
    .toUpperCase()
}
