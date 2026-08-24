const NEWS_MOCK_LOCALES = {
  'zh-CN': [
    {
      id: 'security-risk-upgrade',
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
      title: '资产中心新增风险提示与操作确认',
      summary: '提现、划转与安全设置变更流程增加更明确的状态提示。',
      html: `
        <p>资产中心已新增多处风险提示与操作确认信息，覆盖提现、划转与安全设置变更等流程。</p>
        <p>当系统检测到敏感操作时，会展示更明确的影响说明，并要求用户确认操作对象和资金信息。</p>
        <p>请用户在提交前仔细核对地址、网络、金额与费用，避免因误操作造成资产损失。</p>
      `
    }
  ],
  en: [
    {
      id: 'security-risk-upgrade-en',
      title: 'Security Risk Control System Upgrade Completed',
      summary: 'Login, transfer, and contract order flows now use more granular risk checks to identify abnormal activity earlier.',
      html: '<p>CryptoX Pro has completed a new risk-control upgrade across login verification, fund transfers, withdrawals, and contract order flows.</p><p>Users are encouraged to review security settings and enable multi-factor authentication.</p>'
    },
    {
      id: 'fee-display-update-en',
      title: 'Spot and Contract Fee Display Improved',
      summary: 'Estimated fees, VIP discounts, and post-trade fee details are now easier to review before placing orders.',
      html: '<p>The fee display for spot, perpetual, and delivery contracts has been optimized to make trading costs easier to understand before order submission.</p>'
    }
  ],
  vi: [
    {
      id: 'security-risk-upgrade-vi',
      title: 'Hoàn tất nâng cấp hệ thống kiểm soát rủi ro',
      summary: 'Đăng nhập, chuyển tiền và lệnh hợp đồng đã được bổ sung kiểm tra rủi ro chi tiết hơn.',
      html: '<p>CryptoX Pro đã hoàn tất nâng cấp hệ thống kiểm soát rủi ro cho các quy trình đăng nhập, chuyển tiền, rút tiền và đặt lệnh hợp đồng.</p>'
    },
    {
      id: 'fee-display-update-vi',
      title: 'Tối ưu hiển thị phí giao dịch giao ngay và hợp đồng',
      summary: 'Người dùng có thể xem rõ hơn phí dự kiến, ưu đãi VIP và chi tiết phí sau giao dịch.',
      html: '<p>Nền tảng đã tối ưu cách hiển thị phí cho giao dịch giao ngay, hợp đồng vĩnh viễn và hợp đồng kỳ hạn.</p>'
    }
  ]
}

export const DEFAULT_FRONT_NEWS = Object.entries(NEWS_MOCK_LOCALES).flatMap(([locale, items]) =>
  items.map((item, index) => ({
    ...item,
    locale,
    date: index === 0 ? '2026.08.24' : '2026.08.21',
    publishedAt: index === 0 ? '2026-08-24 10:00' : '2026-08-21 12:00',
    enabled: true,
    sort: index * 10
  }))
)

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

function normalizeNewsPayload(raw) {
  const source = raw && typeof raw === 'object' ? raw : {}
  return {
    title: String(source.title || '').trim(),
    summary: String(source.summary || '').trim(),
    html: String(source.html || '').trim()
  }
}

function hasNewsPayload(payload) {
  const text = String(payload?.html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
  return Boolean(payload?.title || payload?.summary || text)
}

function normalizeNewsLocales(row, defaultLocale) {
  const locales = {}
  if (row?.locales && typeof row.locales === 'object' && !Array.isArray(row.locales)) {
    Object.entries(row.locales).forEach(([code, value]) => {
      const localeCode = String(code || '').trim()
      if (!localeCode) return
      const payload = normalizeNewsPayload(value)
      if (hasNewsPayload(payload)) {
        locales[localeCode] = {
          ...payload,
          html: payload.html || '<p></p>'
        }
      }
    })
  }
  const legacyPayload = normalizeNewsPayload(row)
  if (hasNewsPayload(legacyPayload)) {
    const locale = String(row?.locale || defaultLocale || 'zh-CN').trim() || 'zh-CN'
    locales[locale] = {
      ...legacyPayload,
      html: legacyPayload.html || '<p></p>',
      ...(locales[locale] || {})
    }
  }
  return locales
}

function normalizeNewsRow(row, index, defaultLocale, forcedLocale, forcedPayload) {
  const locale = String(forcedLocale || row.locale || defaultLocale || 'zh-CN').trim() || 'zh-CN'
  const payload = forcedPayload || normalizeNewsPayload(row)
  if (!payload.title) return null
  const rawId = String(row.id || '').trim() || createFrontNewsId()
  const id =
    !row.locale && forcedLocale && forcedLocale !== defaultLocale && !rawId.endsWith(`-${forcedLocale}`)
      ? `${rawId}-${forcedLocale}`
      : rawId
  const date = normalizeDateText(row)
  const publishedAt = String(row.publishedAt || '').trim() || date.replaceAll('.', '-') || ''
  return {
    id,
    locale,
    date,
    publishedAt,
    enabled: row.enabled !== false,
    sort: Number.isFinite(Number(row.sort)) ? Math.round(Number(row.sort)) : index * 10,
    title: payload.title,
    summary: payload.summary,
    html: payload.html || '<p></p>',
    locales: {
      [locale]: {
        title: payload.title,
        summary: payload.summary,
        html: payload.html || '<p></p>'
      }
    }
  }
}

export function normalizeFrontNews(raw = DEFAULT_FRONT_NEWS, defaultLocale = 'zh-CN') {
  const source = Array.isArray(raw) ? raw : DEFAULT_FRONT_NEWS
  const seen = new Set()
  const rows = []
  source.forEach((row, index) => {
    if (!row || typeof row !== 'object') return
    if (typeof row.locale === 'string' && row.locale.trim()) {
      const locale = row.locale.trim()
      const locales = normalizeNewsLocales(row, locale)
      const payload = locales[locale] || normalizeNewsPayload(row)
      const normalized = normalizeNewsRow(row, index, defaultLocale, locale, payload)
      if (normalized && !seen.has(normalized.id)) {
        seen.add(normalized.id)
        rows.push(normalized)
      }
      return
    }
    const locales = normalizeNewsLocales(row, defaultLocale)
    Object.entries(locales).forEach(([locale, payload], localeIndex) => {
      const normalized = normalizeNewsRow(row, index + localeIndex, defaultLocale, locale, payload)
      if (normalized && !seen.has(normalized.id)) {
        seen.add(normalized.id)
        rows.push(normalized)
      }
    })
  })
  return rows.sort((a, b) => {
    const sa = Number(a.sort) || 0
    const sb = Number(b.sort) || 0
    if (sa !== sb) return sa - sb
    return toDateValue(b) - toDateValue(a)
  })
}

export function getFrontNewsList(source = DEFAULT_FRONT_NEWS) {
  return normalizeFrontNews(source).filter((row) => row.enabled)
}

export function getLocalizedFrontNewsList(source = DEFAULT_FRONT_NEWS, locale = 'zh-CN', defaultLocale = 'zh-CN') {
  const rows = getFrontNewsList(source)
  const currentRows = rows.filter((row) => row.locale === locale)
  if (currentRows.length) return currentRows
  const defaultRows = rows.filter((row) => row.locale === defaultLocale)
  if (defaultRows.length) return defaultRows
  const zhRows = rows.filter((row) => row.locale === 'zh-CN')
  return zhRows.length ? zhRows : rows
}

export function getFrontNewsById(id, source = DEFAULT_FRONT_NEWS, locale = '', defaultLocale = 'zh-CN') {
  const newsId = String(id || '')
  const scopedRows = locale ? getLocalizedFrontNewsList(source, locale, defaultLocale) : getFrontNewsList(source)
  return scopedRows.find((row) => row.id === newsId) || getFrontNewsList(source).find((row) => row.id === newsId) || null
}
