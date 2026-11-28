// Charity channel admin (/admin/charity/*) for the new public site's 公益 page (/NewQuantCapital/charity).
// Pure functions over a plain state object; the in-page service owns the single in-memory instance (static mock
// data, user decision 2026-11-28). Every command works on a private copy and is committed only after all checks pass.
//
// Scope (user decision, 2026-11-28): campaigns (projects), a read-only donation ledger and the channel totals.
// - A project carries all six language versions (English required as the fallback), a cover image, a funding goal,
//   an initial raised amount (mock configuration), people helped, the donation limits, a sort weight (larger first)
//   and a listed/unlisted status changed only from the list's operation column.
// - Raised = initial raised + completed donations to that project; progress = raised / goal (shown capped at 100%).
// - Donations complete immediately on the public site (no review), so the admin ledger is read-only.
// - Channel totals = configurable base values + the sums over every project (listed or not).

export const LOCALES = ['en-US', 'zh-TW', 'fr-FR', 'de-DE', 'ja-JP', 'ko-KR']
/** Every project must have this version; other languages fall back to it on the public site. */
export const FALLBACK_LOCALE = 'en-US'
export const ASSET = 'USDT'
export const ADMIN = '管理员（模拟）'
export const SYSTEM = '系统'

export const money = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100
const fail = (ok, code) => { if (!ok) throw new Error(code) }
const finite = value => typeof value === 'number' && Number.isFinite(value)
const text = value => typeof value === 'string' ? value.trim() : ''

export function createCharityState({projects = [], donations = [], stats = {baseRaised: 0, basePeopleHelped: 0, version: 1, updatedAt: 0}} = {}) {
  return {version: 1, projects, donations, stats, logs: [], requests: []}
}

function log(s, entry, now) {
  s.logs.unshift({id: `CL-${now}-${s.logs.length + 1}`, createdAt: now, ...entry})
}

// ---------- read model ----------

/** Completed donations to one project. */
export const donatedAmount = (s, projectId) => money(s.donations.filter(d => d.projectId === projectId && d.status === 'completed').reduce((t, d) => t + d.amount, 0))
export const donationCount = (s, projectId) => s.donations.filter(d => d.projectId === projectId && d.status === 'completed').length
export const raisedAmount = (s, p) => money(p.initialRaised + donatedAmount(s, p.projectId))
/** Display progress (0–100, one decimal); a project may raise beyond its goal, the bar stops at 100. */
export const progressOf = (s, p) => Math.min(100, Math.round(raisedAmount(s, p) / p.targetAmount * 1000) / 10)
export const projectsBySort = projects => [...projects].sort((a, b) => b.sortOrder - a.sortOrder || a.createdAt - b.createdAt || String(a.projectId).localeCompare(b.projectId))
/** Channel totals: base values plus the sums over every project. */
export function channelTotals(s) {
  const raised = money(s.projects.reduce((t, p) => t + raisedAmount(s, p), 0))
  const people = s.projects.reduce((t, p) => t + p.peopleHelped, 0)
  return {projectRaised: raised, projectPeopleHelped: people, totalRaised: money(s.stats.baseRaised + raised), peopleHelped: s.stats.basePeopleHelped + people}
}
/** One language version, falling back to English field by field. */
export function localized(p, locale) {
  const v = p.locales[locale] || {}, f = p.locales[FALLBACK_LOCALE] || {}
  return {title: v.title || f.title, summary: v.summary || f.summary || ''}
}
export const projectTitle = p => p?.locales?.[FALLBACK_LOCALE]?.title || p?.projectId || ''

// ---------- validation ----------

export function validateProject(p) {
  fail(p && typeof p.locales === 'object', 'projectLocales')
  fail(text(p.locales[FALLBACK_LOCALE]?.title), 'projectFallback')
  for (const [locale, v] of Object.entries(p.locales)) {
    fail(LOCALES.includes(locale), 'projectLocales')
    fail(!(text(v?.title) || text(v?.summary)) || text(v.title), 'projectTitle')
  }
  fail(text(p.image), 'projectImage')
  fail(finite(p.targetAmount) && p.targetAmount > 0, 'projectTarget')
  fail(finite(p.initialRaised) && p.initialRaised >= 0, 'projectInitial')
  fail(Number.isInteger(p.peopleHelped) && p.peopleHelped >= 0, 'projectPeople')
  fail(finite(p.minDonation) && p.minDonation > 0 && finite(p.maxDonation) && p.maxDonation >= p.minDonation, 'projectLimits')
  fail(Number.isInteger(p.sortOrder), 'projectSort')
}

function normalize(p) {
  const locales = {}
  for (const locale of LOCALES) {
    const v = p.locales?.[locale]
    if (v && (text(v.title) || text(v.summary))) locales[locale] = {title: text(v.title), summary: text(v.summary)}
  }
  return {...p, locales, image: text(p.image), initialRaised: money(p.initialRaised), targetAmount: money(p.targetAmount),
    minDonation: money(p.minDonation), maxDonation: money(p.maxDonation)}
}

/** Project fields compared for the log's change list. */
const FIELD_LABELS = {locales: '多语言内容', image: '封面图片', targetAmount: '目标金额', initialRaised: '初始已募金额', peopleHelped: '受助人数',
  minDonation: '单笔最低捐赠', maxDonation: '单笔最高捐赠', sortOrder: '排序权重'}
const changedFields = (before, after) => Object.keys(FIELD_LABELS).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k])).map(k => FIELD_LABELS[k])

// ---------- commands ----------

export function transact(source, action, args = {}, now = Date.now()) {
  const s = structuredClone(source)
  fail(args.requestId && !s.requests.includes(args.requestId), 'duplicate')
  const actor = args.actor || ADMIN
  if (action === 'saveProject') {
    const draft = normalize(structuredClone(args.project))
    validateProject(draft)
    const index = s.projects.findIndex(x => x.projectId === draft.projectId)
    const before = index < 0 ? null : structuredClone(s.projects[index])
    if (draft.projectId) fail(before, 'project')
    if (before) fail(args.expectedVersion === before.version, 'stale')
    // Saving never changes the listing status: new projects start unlisted, existing ones keep theirs.
    const saved = {...draft, projectId: before?.projectId || `CP-${now}-${s.projects.length + 1}`, status: before?.status || 'unlisted',
      createdAt: before?.createdAt ?? now, version: (before?.version || 0) + 1, updatedAt: now}
    if (before) s.projects[index] = saved; else s.projects.push(saved)
    const changes = before ? changedFields(before, saved) : []
    log(s, {module: 'project', action: before ? 'saveProject' : 'createProject', refId: saved.projectId, targetLabel: projectTitle(saved),
      summary: before ? (changes.length ? `保存项目：${changes.join('、')}` : '保存项目（无字段变化）') : '新增项目，默认未上架', before, after: structuredClone(saved), operator: actor}, now)
  } else if (action === 'setProjectStatus') {
    const project = s.projects.find(x => x.projectId === args.projectId)
    fail(project, 'project')
    fail(project.status === args.expectedStatus, 'status')
    const before = structuredClone(project)
    project.status = project.status === 'listed' ? 'unlisted' : 'listed'
    Object.assign(project, {version: project.version + 1, updatedAt: now})
    const listed = project.status === 'listed'
    log(s, {module: 'project', action: listed ? 'listProject' : 'unlistProject', refId: project.projectId, targetLabel: projectTitle(project),
      summary: listed ? '上架项目，前台展示并接受捐赠' : '下架项目，前台不再展示', before, after: structuredClone(project), operator: actor}, now)
  } else if (action === 'saveStats') {
    const before = structuredClone(s.stats)
    fail(args.expectedVersion === before.version, 'stale')
    const baseRaised = Number(args.stats?.baseRaised), basePeopleHelped = Number(args.stats?.basePeopleHelped)
    fail(finite(baseRaised) && baseRaised >= 0, 'statsRaised')
    fail(Number.isInteger(basePeopleHelped) && basePeopleHelped >= 0, 'statsPeople')
    s.stats = {baseRaised: money(baseRaised), basePeopleHelped, version: before.version + 1, updatedAt: now}
    log(s, {module: 'stats', action, refId: 'channel-stats', targetLabel: '频道统计',
      summary: `历史募集基数 ${before.baseRaised} → ${s.stats.baseRaised} USDT；历史受助人数基数 ${before.basePeopleHelped} → ${s.stats.basePeopleHelped}`,
      before, after: structuredClone(s.stats), operator: actor}, now)
  } else throw new Error('action')
  s.requests.push(args.requestId)
  return s
}
