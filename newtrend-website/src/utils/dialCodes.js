// Country dial codes for phone fields (login/register). Names come from Intl.DisplayNames in the page language
// (falls back to the ISO code), flags from regional-indicator emoji; options are sorted by the localized name.
const RAW = 'AF93 AL355 DZ213 AS1684 AD376 AO244 AI1264 AG1268 AR54 AM374 AW297 AU61 AT43 AZ994 BS1242 BH973 BD880 BB1246 BY375 BE32 BZ501 BJ229 BM1441 BT975 BO591 BA387 BW267 BR55 BN673 BG359 BF226 BI257 KH855 CM237 CA1 CV238 KY1345 CF236 TD235 CL56 CN86 CO57 KM269 CG242 CD243 CK682 CR506 CI225 HR385 CU53 CW599 CY357 CZ420 DK45 DJ253 DM1767 DO1809 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 FO298 FJ679 FI358 FR33 GF594 PF689 GA241 GM220 GE995 DE49 GH233 GI350 GR30 GL299 GD1473 GP590 GU1671 GT502 GN224 GW245 GY592 HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 IQ964 IE353 IL972 IT39 JM1876 JP81 JO962 KZ7 KE254 KI686 KR82 XK383 KW965 KG996 LA856 LV371 LB961 LS266 LR231 LY218 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 ML223 MT356 MH692 MQ596 MR222 MU230 YT262 MX52 FM691 MD373 MC377 MN976 ME382 MS1664 MA212 MZ258 MM95 NA264 NR674 NP977 NL31 NC687 NZ64 NI505 NE227 NG234 MK389 NO47 OM968 PK92 PW680 PS970 PA507 PG675 PY595 PE51 PH63 PL48 PT351 PR1787 QA974 RE262 RO40 RU7 RW250 KN1869 LC1758 VC1784 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SX1721 SK421 SI386 SB677 SO252 ZA27 SS211 ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TO676 TT1868 TN216 TR90 TM993 TC1649 TV688 UG256 UA380 AE971 GB44 US1 UY598 UZ998 VU678 VA39 VE58 VN84 VG1284 VI1340 YE967 ZM260 ZW263'

export const DIAL_CODES = RAW.split(' ').map(entry => ({iso: entry.slice(0, 2), dial: '+' + entry.slice(2)}))
export const DEFAULT_DIAL_ISO = 'US'

export function flagOf(iso) {
  return String.fromCodePoint(...[...iso].map(letter => 0x1f1a5 + letter.charCodeAt(0)))
}

const namers = new Map()
export function countryName(iso, locale) {
  if (!namers.has(locale)) {
    try { namers.set(locale, new Intl.DisplayNames([locale], {type: 'region'})) } catch { namers.set(locale, null) }
  }
  return namers.get(locale)?.of(iso) || iso
}

/** Options in the page language, sorted by name; `search` matches the name, ISO code or dial code (with or without +). */
export function dialOptions(locale) {
  const collator = new Intl.Collator(locale)
  return DIAL_CODES.map(({iso, dial}) => ({iso, dial, flag: flagOf(iso), name: countryName(iso, locale)}))
    .sort((a, b) => collator.compare(a.name, b.name))
}

export function filterDialOptions(options, query) {
  const q = query.trim().toLowerCase()
  if (!q) return options
  const digits = q.replace(/^\+/, '')
  return options.filter(option => option.name.toLowerCase().includes(q) || option.iso.toLowerCase() === q || (/^\d+$/.test(digits) && option.dial.slice(1).startsWith(digits)))
}
