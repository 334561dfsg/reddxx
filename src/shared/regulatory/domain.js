// 监管资讯 (regulatory information) for the new public site's /NewQuantCapital/regulatory-information and its admin
// (/admin/regulatory, user decision 2026-11-28). One entry per licence / regulatory registration: the regulator link
// on the public index (SEC, SFC, GFSOB, FSRA, FMSB) and its disclosure page. Pure functions over a plain state object;
// the in-page service owns the instance (static mock data, no persistence, no live sync with the public site).
//
// - An entry is just a title and one rich-text body per language (one big online editor, user decision 2026-11-28),
//   plus attachments and a sort weight. English is required and is the fallback.
// - Attachments (licence scans, filings) are file records; in the mock the file itself is an in-memory object URL.
// - New entries start unpublished; saves never publish or unpublish; publish/unpublish is a separate, logged command.
import {htmlText, sanitizeHtml} from '../news/html.js'

/** English first: it is the required fallback and leads every language list and tab set. */
export const LOCALES = ['en-US', 'zh-TW', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR']
export const FALLBACK_LOCALE = 'en-US'
/** Prototype reviewer identity, explicitly simulated until real authentication exists. */
export const ADMIN = '管理员（模拟）'
export const ATTACHMENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024
export const ATTACHMENT_LIMIT = 10

const fail = (ok, code) => { if (!ok) throw new Error(code) }
const text = value => typeof value === 'string' ? value.trim() : ''

export function createRegulatoryState({entries = []} = {}) {
  return {version: 1, entries, logs: [], requests: []}
}

function log(s, entry, now) {
  s.logs.unshift({id: `RL-${now}-${s.logs.length + 1}`, createdAt: now, ...entry})
}

export const entryTitle = e => e.locales[FALLBACK_LOCALE]?.title || e.entryId

/** An attachment as stored: file name, MIME type, byte size, address (object URL in the mock) and upload time. */
export function validateAttachment(a) {
  fail(a && text(a.attachmentId) && text(a.name), 'attachmentName')
  fail(ATTACHMENT_TYPES.includes(a.type), 'attachmentType')
  fail(Number.isInteger(a.size) && a.size > 0 && a.size <= ATTACHMENT_MAX_BYTES, 'attachmentSize')
  fail(text(a.url) && /^(https?:|blob:|\/)/.test(a.url.trim()), 'attachmentUrl')
  fail(Number.isFinite(a.uploadedAt), 'attachmentTime')
}

export function validateEntry(e) {
  fail(e && typeof e.locales === 'object', 'entryLocales')
  const fallback = e.locales[FALLBACK_LOCALE]
  fail(text(fallback?.title) && htmlText(fallback?.body), 'entryFallback')
  for (const [locale, v] of Object.entries(e.locales)) {
    fail(LOCALES.includes(locale), 'entryLocales')
    // A language version is either filled completely (title and body) or left empty and falls back to English.
    fail(text(v?.title) && htmlText(v?.body), 'entryTitle')
  }
  fail(Number.isInteger(e.sortWeight), 'entrySort')
  fail(Array.isArray(e.attachments) && e.attachments.length <= ATTACHMENT_LIMIT, 'attachmentLimit')
  e.attachments.forEach(validateAttachment)
  fail(new Set(e.attachments.map(a => a.attachmentId)).size === e.attachments.length, 'attachmentName')
  fail(['published', 'unpublished'].includes(e.status), 'entryStatus')
}

/** Trims the draft, cleans bodies to the news allow-list and drops language versions left completely empty. */
function normalize(e) {
  const locales = {}
  for (const locale of LOCALES) {
    const v = e.locales?.[locale]
    const body = htmlText(v?.body) ? sanitizeHtml(v.body).trim() : ''
    if (v && (text(v.title) || body)) locales[locale] = {title: text(v.title), body}
  }
  return {...e, locales,
    attachments: (e.attachments || []).map(a => ({attachmentId: text(a.attachmentId), name: text(a.name), type: a.type, size: a.size, url: text(a.url), uploadedAt: a.uploadedAt}))}
}

/** Generated operation description (no operator-supplied reason): which languages, fields and attachments changed. */
function describeSave(before, after) {
  if (!before) return `新增监管资讯（${Object.keys(after.locales).length} 个语言版本，${after.attachments.length} 个附件）`
  const parts = []
  const langs = LOCALES.filter(l => JSON.stringify(before.locales[l] || null) !== JSON.stringify(after.locales[l] || null))
  if (langs.length) parts.push(`语言版本：${langs.join('、')}`)
  if (before.sortWeight !== after.sortWeight) parts.push(`排序权重：${before.sortWeight} → ${after.sortWeight}`)
  const ids = list => new Set(list.map(a => a.attachmentId))
  const was = ids(before.attachments), now = ids(after.attachments)
  const added = after.attachments.filter(a => !was.has(a.attachmentId)).length, removed = before.attachments.filter(a => !now.has(a.attachmentId)).length
  if (added || removed) parts.push(`附件：新增 ${added}，移除 ${removed}`)
  return parts.length ? `保存监管资讯（${parts.join('；')}）` : '保存监管资讯（无变更）'
}

export function transact(source, action, args = {}, now = Date.now()) {
  const s = structuredClone(source)
  fail(args.requestId && !s.requests.includes(args.requestId), 'duplicate')
  const actor = args.actor || ADMIN
  if (action === 'saveEntry') {
    const draft = normalize(structuredClone(args.entry))
    const index = draft.entryId ? s.entries.findIndex(x => x.entryId === draft.entryId) : -1
    fail(!draft.entryId || index >= 0, 'entry')
    const before = index < 0 ? null : structuredClone(s.entries[index])
    if (before) fail(args.expectedVersion === before.version, 'stale')
    // Saving never changes the publication status: new entries start unpublished, existing ones keep theirs.
    draft.status = before?.status || 'unpublished'
    validateEntry(draft)
    const saved = {...draft, entryId: before?.entryId || `REG-${now}-${s.entries.length + 1}`, status: draft.status,
      publishedAt: before?.publishedAt ?? null, version: (before?.version || 0) + 1, createdAt: before?.createdAt ?? now, updatedAt: now}
    if (before) s.entries[index] = saved; else s.entries.unshift(saved)
    log(s, {module: 'entry', action, refId: saved.entryId, targetLabel: entryTitle(saved), summary: describeSave(before, saved),
      before, after: structuredClone(saved), operator: actor}, now)
  } else if (action === 'setStatus') {
    const index = s.entries.findIndex(x => x.entryId === args.entryId)
    fail(index >= 0, 'entry')
    const entry = s.entries[index]
    fail(args.expectedVersion === entry.version, 'stale')
    fail(['published', 'unpublished'].includes(args.status) && entry.status !== args.status, 'status')
    const before = structuredClone(entry), publish = args.status === 'published'
    Object.assign(entry, {status: args.status, publishedAt: publish ? now : entry.publishedAt, version: entry.version + 1, updatedAt: now})
    log(s, {module: 'entry', action: publish ? 'publish' : 'unpublish', refId: entry.entryId, targetLabel: entryTitle(entry),
      summary: publish ? '发布监管资讯：未发布 → 已发布，前台展示' : '下线监管资讯：已发布 → 未发布，前台不再展示', before, after: structuredClone(entry), operator: actor}, now)
  } else throw new Error('action')
  s.requests.push(args.requestId)
  return s
}

// ---------- public read model (not wired to the public site until explicitly requested) ----------

/** One language version, falling back to English field by field. */
export function localized(e, locale) {
  const v = e.locales[locale] || {}, f = e.locales[FALLBACK_LOCALE] || {}
  return {title: v.title || f.title, body: v.body || f.body || ''}
}
const view = (e, locale) => ({entryId: e.entryId, attachments: e.attachments.map(a => ({...a})), ...localized(e, locale)})
/** Public index: published entries by sort weight (larger first), id as a stable tie-breaker. */
export const publicList = (s, locale) => s.entries.filter(e => e.status === 'published')
  .sort((a, b) => b.sortWeight - a.sortWeight || a.entryId.localeCompare(b.entryId)).map(e => view(e, locale))
export function publicEntry(s, entryId, locale) {
  const e = s.entries.find(x => x.status === 'published' && x.entryId === entryId)
  return e ? view(e, locale) : null
}
/** Public URL slug: REG-SEC ↔ regulation-sec, so the old /content/regulation-<code> links keep working. */
export const slugOf = entryId => `regulation-${String(entryId).replace(/^REG-/, '').toLowerCase()}`
export const entryIdOf = slug => /^regulation-[a-z0-9-]+$/i.test(String(slug)) ? `REG-${String(slug).slice('regulation-'.length).toUpperCase()}` : null
