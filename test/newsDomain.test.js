import test from 'node:test'
import assert from 'node:assert/strict'
import {transact, publicList, publicCategories, featuredList, publicArticle, articleState, localized, LOCALES} from '../src/shared/news/domain.js'
import {seedNews} from '../src/shared/news/seed.js'
import {sanitizeHtml} from '../src/shared/news/html.js'

const T0 = Date.UTC(2026, 10, 27, 0, 0, 0)
let n = 0
const run = (s, action, args, at = T0) => transact(s, action, {...args, requestId: `t-${++n}`}, at)

test('seed joins the six languages per article and keeps home insights and old links', () => {
  const s = seedNews(T0)
  assert.equal(s.articles.length, 20)
  assert.ok(s.articles.every(a => LOCALES.every(l => a.locales[l]?.title)), 'every article has all six versions')
  assert.ok(s.articles.every(a => a.image.startsWith('/NewQuantCapital/assets/')))
  assert.deepEqual(featuredList(s, 'en-US', T0).map(a => a.legacyIds.at(-1)), ['google', 'ethereum', 'cftc', 'binance'])
  assert.equal(publicArticle(s, 'ethereum', 'zh-TW', T0).articleId, s.articles[2].articleId)
  const zhId = s.articles[0].legacyIds[0]
  assert.equal(publicArticle(s, zhId, 'en-US', T0).articleId, s.articles[0].articleId, 'old per-language id resolves')
  const list = publicList(s, 'en-US', T0)
  assert.ok(list.every((a, i) => i === 0 || list[i - 1].publishedAt >= a.publishedAt), 'newest first')
})

test('hidden and scheduled articles stay off the public site', () => {
  let s = seedNews(T0)
  const a = s.articles[0]
  s = run(s, 'setStatus', {articleId: a.articleId, status: 'hidden', expectedVersion: a.version})
  assert.equal(articleState(s.articles[0], T0), 'hidden')
  assert.equal(publicArticle(s, a.articleId, 'en-US', T0), null)
  const b = s.articles[1]
  s = run(s, 'saveArticle', {article: {...b, publishedAt: T0 + 3600000}, expectedVersion: b.version})
  assert.equal(articleState(s.articles[1], T0), 'scheduled')
  assert.equal(publicList(s, 'en-US', T0).length, 18)
  assert.equal(publicList(s, 'en-US', T0 + 3600000).length, 19, 'shows once the time arrives')
})

test('saves validate, version-check and fall back to English per field', () => {
  let s = seedNews(T0)
  const draft = {category: 'platform', tags: ['BTCUSDT'], image: '', source: {name: '', url: ''}, publishedAt: T0, featured: false, featuredOrder: 0,
    locales: {'en-US': {title: 'Maintenance', summary: 'Short window', body: 'Details'}, 'zh-TW': {title: '維護公告', summary: '', body: ''}, 'ja-JP': {title: '', summary: '', body: ''}}}
  s = run(s, 'saveArticle', {article: draft})
  const created = s.articles[0]
  assert.equal(created.status, 'hidden', 'new articles start hidden')
  assert.deepEqual(Object.keys(created.locales).sort(), ['en-US', 'zh-TW'], 'empty versions are dropped')
  assert.equal(localized(created, 'zh-TW').summary, 'Short window')
  assert.equal(localized(created, 'ko-KR').title, 'Maintenance')
  assert.throws(() => run(s, 'saveArticle', {article: {...draft, locales: {'zh-TW': {title: 'x', summary: 'y'}}}}), /articleFallback/)
  assert.throws(() => run(s, 'saveArticle', {article: {...draft, source: {name: '', url: 'https://a.b/c'}}}), /articleSourceName/)
  assert.throws(() => run(s, 'saveArticle', {article: {...draft, category: 'Sports'}}), /articleCategory/)
  assert.throws(() => run(s, 'saveArticle', {article: created, expectedVersion: created.version - 1}), /stale/)
  s = run(s, 'deleteArticle', {articleId: created.articleId, expectedVersion: created.version})
  assert.equal(s.articles.length, 20)
  assert.equal(s.logs[0].action, 'deleteArticle')
})

test('categories are named per language, sorted by weight, and cannot be deleted while in use', () => {
  let s = seedNews(T0)
  assert.deepEqual(publicCategories(s, 'zh-TW').map(c => c.name), ['市場動態', '加密貨幣', '宏觀', '平台公告'])
  const crypto = s.categories.find(c => c.categoryId === 'crypto')
  assert.throws(() => run(s, 'deleteCategory', {categoryId: 'crypto', expectedVersion: crypto.version}), /categoryInUse/)
  s = run(s, 'saveCategory', {category: {...crypto, enabled: false}, expectedVersion: crypto.version})
  assert.ok(!publicCategories(s, 'en-US').some(c => c.categoryId === 'crypto'), 'disabled categories leave the filter')
  assert.equal(publicArticle(s, 'ethereum', 'ja-JP', T0).categoryName, '暗号資産', 'articles keep showing their category')
  s = run(s, 'saveCategory', {category: {names: {'en-US': 'Research', 'zh-TW': '研究'}, sortOrder: 50, enabled: true}})
  assert.equal(publicCategories(s, 'ko-KR')[0].name, 'Research', 'missing language falls back to English')
  const research = s.categories.at(-1)
  assert.throws(() => run(s, 'saveCategory', {category: {...research, names: {'zh-TW': '只有中文'}}, expectedVersion: research.version}), /categoryFallback/)
  s = run(s, 'deleteCategory', {categoryId: research.categoryId, expectedVersion: research.version})
  assert.equal(s.categories.length, 4)
})

test('article bodies keep only the simple editor markup', () => {
  assert.equal(sanitizeHtml('<h2 class="x">Title</h2><p onclick="steal()">Hi <b>there</b><script>alert(1)</script></p>'), '<h2>Title</h2><p>Hi <b>there</b></p>')
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">x</a><a href="https://ok.example/a">y</a>'), '<a>x</a><a href="https://ok.example/a" target="_blank" rel="noopener noreferrer">y</a>')
  assert.equal(sanitizeHtml('<img src=x onerror=alert(1)><div>kept</div><iframe src="//x"></iframe>'), 'kept')
  assert.equal(sanitizeHtml('<scr<script>ipt>alert(1)</script>'), '&lt;scr')
  let s = seedNews(T0)
  assert.ok(s.articles[0].locales['en-US'].body.startsWith('<p>'), 'seed digests become paragraphs')
  const a = s.articles[0]
  s = run(s, 'saveArticle', {article: {...a, locales: {...a.locales, 'en-US': {...a.locales['en-US'], body: '<p>ok</p><style>p{}</style><img src=x>'}}}, expectedVersion: a.version})
  assert.equal(s.articles[0].locales['en-US'].body, '<p>ok</p>')
})
