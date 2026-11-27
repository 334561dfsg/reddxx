// News centre for the new public site (/NewQuantCapital/news and the home insights) and its admin (/admin/news).
// Pure functions over a plain state object; the in-page service owns the instance (static mock data, user decision
// 2026-11-27). One article carries every language version, so switching language keeps the same article.

/** English first: it is the required fallback and leads every language list and tab set (user decision, 2026-11-27). */
import {htmlText, sanitizeHtml} from './html.js'

export const LOCALES = ['en-US', 'zh-TW', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR']
/** Every article must have this version; other languages fall back to it on the public site. */
export const FALLBACK_LOCALE = 'en-US'
/** The home page insights section shows at most this many featured articles. */
export const FEATURED_LIMIT = 4
export const ADMIN = '管理员（模拟）'

const fail = (ok, code) => { if (!ok) throw new Error(code) }
const text = value => typeof value === 'string' ? value.trim() : ''

export function createNewsState({articles = [], categories = []} = {}) {
  return {version: 1, categories, articles, logs: [], requests: []}
}

function log(s, entry, now) {
  s.logs.unshift({id: `NL-${now}-${s.logs.length + 1}`, createdAt: now, ...entry})
}

/** Display status: hidden articles are off; published ones with a future time are scheduled. */
export const articleState = (a, now = Date.now()) => a.status === 'hidden' ? 'hidden' : a.publishedAt > now ? 'scheduled' : 'live'
export const isLive = (a, now = Date.now()) => articleState(a, now) === 'live'

export function validateArticle(a, categories = []) {
  fail(a && typeof a.locales === 'object', 'articleLocales')
  const fallback = a.locales[FALLBACK_LOCALE]
  fail(text(fallback?.title) && text(fallback?.summary), 'articleFallback')
  for (const [locale, v] of Object.entries(a.locales)) {
    fail(LOCALES.includes(locale), 'articleLocales')
    const filled = text(v?.title) || text(v?.summary) || htmlText(v?.body)
    fail(!filled || text(v.title), 'articleTitle')
  }
  fail(a.category === null || categories.some(c => c.categoryId === a.category), 'articleCategory')
  fail(Array.isArray(a.tags) && a.tags.every(t => text(t)), 'articleTags')
  fail(!text(a.source?.url) || /^https?:\/\/\S+$/.test(a.source.url.trim()), 'articleSourceUrl')
  fail(!text(a.source?.url) || text(a.source?.name), 'articleSourceName')
  fail(Number.isFinite(a.publishedAt), 'articlePublishedAt')
  fail(typeof a.featured === 'boolean' && Number.isInteger(a.featuredOrder), 'articleFeatured')
  fail(['published', 'hidden'].includes(a.status), 'articleStatus')
}

/** Trims the draft and drops language versions left completely empty. */
/** Categories carry a name per language (the fallback language required), a sort weight and an enabled switch. */
export function validateCategory(c) {
  fail(c && typeof c.names === 'object' && text(c.names[FALLBACK_LOCALE]), 'categoryFallback')
  fail(Object.keys(c.names).every(l => LOCALES.includes(l)), 'categoryNames')
  fail(Number.isInteger(c.sortOrder), 'categorySort')
  fail(typeof c.enabled === 'boolean', 'categoryEnabled')
}

function normalize(a) {
  const locales = {}
  for (const locale of LOCALES) {
    const v = a.locales[locale]
    // The body is the editor's HTML, cleaned to the allow-list; a body with no visible text counts as empty.
    const body = htmlText(v?.body) ? sanitizeHtml(v.body).trim() : ''
    if (v && (text(v.title) || text(v.summary) || body)) locales[locale] = {title: text(v.title), summary: text(v.summary), body}
  }
  return {...a, locales, tags: a.tags.map(text), image: text(a.image), source: {name: text(a.source?.name), url: text(a.source?.url)}}
}

export function transact(source, action, args = {}, now = Date.now()) {
  const s = structuredClone(source)
  fail(args.requestId && !s.requests.includes(args.requestId), 'duplicate')
  const actor = args.actor || ADMIN
  const find = () => {
    const index = s.articles.findIndex(x => x.articleId === args.articleId)
    fail(index >= 0, 'article')
    fail(args.expectedVersion === s.articles[index].version, 'stale')
    return index
  }
  if (action === 'saveArticle') {
    const draft = normalize(structuredClone(args.article))
    draft.status ??= 'hidden'
    validateArticle(draft, s.categories)
    const index = s.articles.findIndex(x => x.articleId === draft.articleId)
    const before = index < 0 ? null : structuredClone(s.articles[index])
    if (before) fail(args.expectedVersion === before.version, 'stale')
    const saved = {...draft, articleId: before?.articleId || `NEWS-${now}-${s.articles.length + 1}`, legacyIds: before?.legacyIds || [],
      status: before?.status || draft.status, version: (before?.version || 0) + 1, updatedAt: now}
    if (before) s.articles[index] = saved; else s.articles.unshift(saved)
    log(s, {module: 'article', action, refId: saved.articleId, targetLabel: saved.locales[FALLBACK_LOCALE].title, summary: before ? '保存文章' : '新增文章', before, after: structuredClone(saved), operator: actor}, now)
  } else if (action === 'setStatus') {
    const index = find(), article = s.articles[index], before = structuredClone(article)
    fail(['published', 'hidden'].includes(args.status) && article.status !== args.status, 'status')
    Object.assign(article, {status: args.status, version: article.version + 1, updatedAt: now})
    log(s, {module: 'article', action: args.status === 'published' ? 'publish' : 'hide', refId: article.articleId, targetLabel: article.locales[FALLBACK_LOCALE].title, summary: args.status === 'published' ? '发布文章' : '隐藏文章', before, after: structuredClone(article), operator: actor}, now)
  } else if (action === 'deleteArticle') {
    const index = find(), [before] = s.articles.splice(index, 1)
    log(s, {module: 'article', action, refId: before.articleId, targetLabel: before.locales[FALLBACK_LOCALE].title, summary: '删除文章', before, after: null, operator: actor}, now)
  } else if (action === 'saveCategory') {
    const draft = structuredClone(args.category)
    draft.names = Object.fromEntries(LOCALES.filter(l => text(draft.names?.[l])).map(l => [l, text(draft.names[l])]))
    validateCategory(draft)
    const index = s.categories.findIndex(x => x.categoryId === draft.categoryId)
    const before = index < 0 ? null : structuredClone(s.categories[index])
    if (before) fail(args.expectedVersion === before.version, 'stale')
    const saved = {...draft, categoryId: before?.categoryId || `CAT-${now}-${s.categories.length + 1}`, version: (before?.version || 0) + 1, updatedAt: now}
    if (before) s.categories[index] = saved; else s.categories.push(saved)
    log(s, {module: 'category', action, refId: saved.categoryId, targetLabel: saved.names[FALLBACK_LOCALE], summary: before ? '保存分类' : '新增分类', before, after: structuredClone(saved), operator: actor}, now)
  } else if (action === 'deleteCategory') {
    const index = s.categories.findIndex(x => x.categoryId === args.categoryId)
    fail(index >= 0, 'category')
    fail(args.expectedVersion === s.categories[index].version, 'stale')
    // Articles keep their category, so a category in use can only be disabled, never deleted.
    fail(!s.articles.some(a => a.category === args.categoryId), 'categoryInUse')
    const [before] = s.categories.splice(index, 1)
    log(s, {module: 'category', action, refId: before.categoryId, targetLabel: before.names[FALLBACK_LOCALE], summary: '删除分类', before, after: null, operator: actor}, now)
  } else throw new Error('action')
  s.requests.push(args.requestId)
  return s
}

// ---------- public read model ----------

/** One language version, falling back to the fallback language field by field. */
export function localized(a, locale) {
  const v = a.locales[locale] || {}, f = a.locales[FALLBACK_LOCALE] || {}
  return {title: v.title || f.title, summary: v.summary || f.summary, body: v.body || f.body || ''}
}
export const categoryName = (c, locale) => c ? c.names[locale] || c.names[FALLBACK_LOCALE] : null
const view = (s, a, locale) => ({articleId: a.articleId, legacyIds: a.legacyIds || [], image: a.image, category: a.category,
  categoryName: categoryName(s.categories.find(c => c.categoryId === a.category), locale), tags: a.tags, source: a.source, publishedAt: a.publishedAt, ...localized(a, locale)})

/** Public category filter: enabled categories by sort weight (larger first), named in the requested language. */
export const publicCategories = (s, locale) => s.categories.filter(c => c.enabled).sort((a, b) => b.sortOrder - a.sortOrder).map(c => ({categoryId: c.categoryId, name: categoryName(c, locale)}))
/** Public list: live articles, newest first. */
export const publicList = (s, locale, now = Date.now()) => s.articles.filter(a => isLive(a, now)).sort((a, b) => b.publishedAt - a.publishedAt).map(a => view(s, a, locale))
/** Home insights: live featured articles by featured weight (larger first), then newest. */
export const featuredList = (s, locale, now = Date.now(), limit = FEATURED_LIMIT) => s.articles
  .filter(a => isLive(a, now) && a.featured).sort((a, b) => b.featuredOrder - a.featuredOrder || b.publishedAt - a.publishedAt).slice(0, limit).map(a => view(s, a, locale))
/** Detail by id; old per-language ids and the home aliases still resolve. */
export function publicArticle(s, id, locale, now = Date.now()) {
  const a = s.articles.find(x => isLive(x, now) && (x.articleId === id || (x.legacyIds || []).includes(id)))
  return a ? view(s, a, locale) : null
}
