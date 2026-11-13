const page = location.pathname.replace(/\/$/, '') || '/'
const links = [
  ['/layouts/a', 'A · Corporate'],
  ['/layouts/b', 'B · Aurora'],
  ['/layouts/c', 'C · Grove'],
  ['/', 'Current homepage']
]
const bar = document.createElement('div')
bar.className = 'eds-preview'
bar.innerHTML = '<span>Layout preview — not the live homepage</span>' + links.map(([href, label]) => `<a href="${href}" class="${page === href ? 'on' : ''}">${label}</a>`).join('')
document.body.prepend(bar)
