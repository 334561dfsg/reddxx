export const DEFAULT_FRONT_NEWS = [
  {
    id: 'security-risk-upgrade',
    tag: '平台动态',
    date: '2026.08.24',
    publishedAt: '2026-08-24 10:00',
    enabled: true,
    sort: 0,
    title: '安全风控系统完成新一轮升级',
    summary: '账户登录、资金划转与合约委托链路已接入更细粒度的风险校验，帮助用户更早识别异常操作。',
    html: `
      <p>为进一步提升平台安全稳定性，CryptoX Pro 已完成新一轮风控系统升级。</p>
      <p>本次升级覆盖登录验证、资金划转、提现确认与合约委托等关键链路。系统会结合设备状态、登录环境与操作行为进行综合判断，并在必要时触发额外验证。</p>
      <p>建议用户及时检查安全中心设置，开启多因素验证，并妥善保管账户密码、资金密码与验证码。</p>
    `
  },
  {
    id: 'fee-display-update',
    tag: '产品更新',
    date: '2026.08.21',
    publishedAt: '2026-08-21 12:00',
    enabled: true,
    sort: 10,
    title: '现货与合约手续费展示优化',
    summary: '交易前可更清晰查看预计手续费、VIP 折扣与成交后费用明细。',
    html: `
      <p>平台已优化现货、永续与交割合约的手续费展示方式，帮助用户在下单前更直观地理解预计成本。</p>
      <p>更新后，交易终端会展示预计手续费、当前 VIP 费率折扣及成交后的费用明细。实际费用仍以最终成交记录为准。</p>
      <p>用户可前往费率与 VIP 页面查看当前账户等级、费率规则与升级条件。</p>
    `
  },
  {
    id: 'market-depth-iteration',
    tag: '市场服务',
    date: '2026.08.18',
    publishedAt: '2026-08-18 09:30',
    enabled: true,
    sort: 20,
    title: '多品种行情深度展示持续迭代',
    summary: '主流资产盘口、涨跌幅与成交摘要在移动端首页获得更紧凑的呈现。',
    html: `
      <p>为了提升移动端浏览效率，平台对多品种行情展示进行了视觉与信息层级优化。</p>
      <p>用户可以更快查看主流资产涨跌幅、成交摘要与盘口变化，并从行情模块进入对应交易对。</p>
      <p>后续平台将继续优化行情刷新体验和交易入口的衔接效率。</p>
    `
  },
  {
    id: 'asset-center-confirmation',
    tag: '资产安全',
    date: '2026.08.15',
    publishedAt: '2026-08-15 16:00',
    enabled: true,
    sort: 30,
    title: '资产中心新增风险提示与操作确认',
    summary: '提现、划转与安全设置变更流程增加更明确的状态提示。',
    html: `
      <p>资产中心已新增多处风险提示与操作确认信息，覆盖提现、划转与安全设置变更等流程。</p>
      <p>当系统检测到敏感操作时，会展示更明确的影响说明，并要求用户确认操作对象和资金信息。</p>
      <p>请用户在提交前仔细核对地址、网络、金额与费用，避免因误操作造成资产损失。</p>
    `
  }
]

function toDateValue(row) {
  const raw = String(row?.publishedAt || row?.date || '')
  const normalized = raw.replaceAll('.', '-')
  const value = Date.parse(normalized)
  return Number.isFinite(value) ? value : 0
}

function createFrontNewsId() {
  return `news_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeDateText(row) {
  const date = String(row?.date || '').trim()
  if (date) return date
  const publishedAt = String(row?.publishedAt || '').trim()
  return publishedAt.slice(0, 10).replaceAll('-', '.') || ''
}

export function normalizeFrontNews(raw = DEFAULT_FRONT_NEWS) {
  const source = Array.isArray(raw) ? raw : DEFAULT_FRONT_NEWS
  return source
    .map((row, index) => {
      if (!row || typeof row !== 'object') return null
      const title = String(row.title || '').trim()
      if (!title) return null
      const date = normalizeDateText(row)
      const publishedAt = String(row.publishedAt || '').trim() || date.replaceAll('.', '-') || ''
      return {
        id: String(row.id || '').trim() || createFrontNewsId(),
        tag: String(row.tag || '平台动态').trim() || '平台动态',
        date,
        publishedAt,
        enabled: row.enabled !== false,
        sort: Number.isFinite(Number(row.sort)) ? Math.round(Number(row.sort)) : index * 10,
        title,
        summary: String(row.summary || '').trim(),
        html: String(row.html || '').trim() || '<p></p>'
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const sa = Number(a.sort) || 0
      const sb = Number(b.sort) || 0
      if (sa !== sb) return sa - sb
      return toDateValue(b) - toDateValue(a)
    })
}

export function getFrontNewsList(source = DEFAULT_FRONT_NEWS) {
  return normalizeFrontNews(source).filter((row) => row.enabled)
}

export function getFrontNewsById(id, source = DEFAULT_FRONT_NEWS) {
  const newsId = String(id || '')
  return getFrontNewsList(source).find((row) => row.id === newsId) || null
}
