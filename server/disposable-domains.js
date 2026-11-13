// Common disposable and throwaway inbox domains. Signup is rejected when the
// domain matches. This is a blocklist, not a guarantee; pair it with phone,
// device, and IP checks.
export const DISPOSABLE_DOMAINS = new Set(`
0-mail.com 10minutemail.com 10minutemail.net 20minutemail.com 33mail.com
anonbox.net anonymbox.com antispam.de binkmail.com bobmail.info burnmail.com
byom.de cheatmail.de cock.li cool.fr.nf courriel.fr.nf cust.in
dacoolest.com deadaddress.com despam.it discardmail.com
dispostable.com dodgeit.com dodgit.com e4ward.com emailondeck.com
emailtemporario.com.br emailtogo.com fakeinbox.com fastacura.com
filzmail.com fizmail.com getairmail.com getnada.com guerillamail.biz
guerrillamail.biz guerrillamail.com guerrillamail.de guerrillamail.info
guerrillamail.net guerrillamail.org guerrillamailblock.com harakirimail.com
hushmail.me imgof.com inboxbear.com incognitomail.org jetable.org
kasmail.com koszmail.pl loketa.com lol.ovpn.to lookugly.com lortemail.dk
mailcatch.com maildrop.cc mailexpire.com mailforspam.com mailfreeonline.com
mailin8r.com mailinator.com mailinator.net mailinator.org mailnesia.com
mailnull.com mailscrap.com mailzilla.com mintemail.com mjukglass.nu
moakt.com mohmal.com mt2015.com mytemp.email mytrashmail.com nepwk.com
no-spam.ws nobulk.com noclickemail.com nogmailspam.info nomail.xl.cx
nomail2me.com nospam.ze.tc nospamfor.us nowmymail.com objectmail.com
obobbo.com oneoffemail.com onewaymail.com otherinbox.com owlymail.com
pjjkp.com politikerclub.de pookmail.com proxymail.eu punkass.com
putthisinyourspamdatabase.com quickinbox.com rcpt.at reallymymail.com
recode.me recursor.net regbypass.com rppkn.com safersignup.de safetymail.info
sandelf.de saynotospams.com selfdestructingmail.com sendspamhere.com
sharklasers.com shieldemail.com shitmail.me skeefmail.com slopsbox.com
smashmail.de soodonims.com spamavert.com spambob.net spambog.com
spambog.de spambox.us spamcero.com spamcorptastic.com spamday.com
spamex.com spamfree24.com spamfree24.de spamfree24.eu spamgourmet.com
spamhole.com spamify.com spaml.de spammotel.com spamobox.com spamspot.com
spamthis.co.uk speed.1s.fr suremail.info temp-mail.org tempail.com
tempalias.com tempe-mail.com tempemail.com tempemail.net tempinbox.com
tempmail.com tempmail.de tempmail.eu tempmail.it tempmail.us tempomail.fr
temporaryemail.net temporaryinbox.com thanksnospam.info thisisnotmyrealemail.com
throwawayemailaddress.com tilien.com tmail.ws tmailinator.com trash-mail.at
trash-mail.com trash-mail.de trash2009.com trashdevil.com trashemail.de
trashmail.at trashmail.com trashmail.de trashmail.me trashmail.net
trashmail.org trashymail.com trialmail.de tyrannosaurus.com uggsrock.com
veryrealemail.com viditag.com viewcastmedia.com vomoto.com vpn.st
vsimcard.com vubby.com wuzup.net wuzupmail.net xagloo.com xemaps.com
xents.com xmaily.com xoxy.net yep.it yogamaven.com yopmail.com yopmail.fr
yopmail.net youmailr.com ypmail.webarnak.fr.nf yuurok.com z1p.biz
ze.tc zen0mail.com zomg.info
mailsac.com tempmailo.com tempr.email inboxkitten.com emailfake.com
fakermail.com throwawaymail.com tmpmail.org tmpmail.net moakt.cc
minuteinbox.com mytempemail.com burnermail.io
`.split(/\s+/).map(s => s.trim().toLowerCase()).filter(Boolean))

export function isDisposableEmail(email) {
  const domain = String(email || '').toLowerCase().split('@')[1] || ''
  if (!domain) return false
  if (DISPOSABLE_DOMAINS.has(domain)) return true
  const parts = domain.split('.')
  for (let i = 1; i < parts.length - 1; i++) {
    if (DISPOSABLE_DOMAINS.has(parts.slice(i).join('.'))) return true
  }
  return false
}
