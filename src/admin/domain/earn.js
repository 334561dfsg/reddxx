import { earnTerms } from '../../../newtrend-website/src/utils/earnProducts.js'
import { createEarnPortfolio, earnPrices } from '../../../newtrend-website/src/utils/mockEarnPortfolio.js'

const DAY = 86400000
export const currencies = ['USDT', 'USDC', 'BTC', 'ETH']
export const statusMeta = {
  draft: ['草稿', 'default'], enabled: ['上架中', 'success'], disabled: ['已下架', 'default'],
  pending_review: ['待审核', 'warning'], completed: ['已完成', 'success'], rejected: ['已拒绝', 'error'],
  active: ['计息中', 'processing'], matured: ['已到期', 'warning'], redeeming: ['赎回中', 'processing'], redeemed: ['已赎回', 'default'],
  pending: ['待结算', 'warning'], paid: ['已发放', 'success'], accrued: ['待发放', 'processing'],
}
export const redemptionTypes = { flexibleFull: '活期全额', flexiblePartial: '活期部分', fixedEarly: '定期提前', fixedMatured: '定期到期' }
export const money = value => Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 8 })
export const dateText = value => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Manila', hour12: false }) : '—'
export const clone = value => JSON.parse(JSON.stringify(value))
const round = value => Math.round((value + Number.EPSILON) * 1e8) / 1e8

export function earnFundingProgress(product) {
  const initial = Number(product.initialSubscribed ?? 0)
  const actual = Number(product.subscribed ?? 0)
  const total = round(initial + actual)
  return {initial,actual,total,remaining:round(Number(product.quota)-total),percent:product.quota>0?total/Number(product.quota)*100:0}
}

export function createEarnAdminState(now = Date.now()) {
  const products = [
    ['usdt180','USDT',180,.0273,1000,4000000], ['usdt90','USDT',90,.0232,500,8000000],
    ['usdt30','USDT',30,.0164,100,5000000], ['btc60','BTC',60,.0136,.01,1000],
    ['usdt','USDT',0,.0123,10,20000000], ['usdc','USDC',0,.0115,10,10000000],
    ['eth','ETH',0,.006,.01,5000], ['btc','BTC',0,.0049,.001,500],
  ].map(([id,symbol,days,rate,min,quota],index) => ({
    id, name: `${symbol} ${days ? days + '天定期理财' : '活期理财'}`, symbol, days, rate, dailyRateMin: rate, dailyRateMax: rate, min, quota,
    apy: earnTerms[id].apy, max: earnTerms[id].max, perUser: earnTerms[id].perUser,
    initialSubscribed: 0, subscribed: earnTerms[id].subscribed, hot: Boolean(earnTerms[id].hot),
    earlyRule: !days ? 'flexible' : id === 'usdt180' ? 'fee' : 'disabled',
    redemptionReviewRequired: true, settlement: days ? 'maturity' : 'daily', earlyFeeBase: 'principal', earlyFeeRate: 0,
    risk: id === 'usdt180' ? '定期理财存在本金及收益风险。提前赎回按申购时约定的计费基数和费率收取手续费，已发放收益不重复计入。' : earnTerms[id].risk, status: 'enabled', sort: 80-index*10, version: 1, updatedAt: now,
  }))
  const portfolio = createEarnPortfolio(now)
  const userFor = productId => 'user_' + (1001 + Math.max(0, products.findIndex(row => row.id === productId)))
  for (const key of ['orders','holdings','redemptions','rewards']) {
    portfolio[key] = portfolio[key].map(row => ({ ...row, userId: userFor(row.productId), productName: products.find(p => p.id === row.productId)?.name, rate: products.find(p => p.id === row.productId)?.rate }))
  }
  for (const product of products) {
    const actual = round(portfolio.orders.filter(order=>order.productId===product.id&&order.status==='completed').reduce((sum,order)=>sum+order.amount,0))
    product.initialSubscribed = round(Math.max(0,product.subscribed-actual))
    product.subscribed = actual
  }
  // Seed fixtures have one holding per product; materialize an explicit relation once.
  for (const reward of portfolio.rewards) reward.holdingId = portfolio.holdings.find(holding=>holding.productId===reward.productId)?.id ?? null
  for (const holding of portfolio.holdings) {
    portfolio.rewards = portfolio.rewards.filter(reward=>!(reward.holdingId===holding.id&&reward.status==='accrued'))
    if (holding.accrued>0) portfolio.rewards.unshift({id:holding.id+'-accrued',holdingId:holding.id,productId:holding.productId,productName:holding.productName,userId:holding.userId,symbol:holding.symbol,amount:holding.accrued,status:'accrued',rewardAt:holding.lastAccruedAt,paidAt:null})
  }
  // These historical records are fixtures, not real administrator audit identities.
  for (const order of portfolio.orders) order.reviewer = ['completed','rejected'].includes(order.status) ? '模拟审核员' : null
  for (const record of portfolio.redemptions) record.reviewer = record.status === 'completed' ? '模拟审核员' : null
  for (const holding of portfolio.holdings) holding.terms = clone(products.find(product=>product.id===holding.productId))
  // Associate fixtures so an operator can trace subscription → holding → redemption.
  for (const holding of portfolio.holdings) holding.orderId = portfolio.orders.find(row => row.productId === holding.productId && row.status === 'completed')?.id
  return { products, ...portfolio, logs: [{ id: 'earn-log-initial', at: now-DAY, operator: '运营管理员', action: '初始化产品', target: '理财产品目录', reason: '创建活期和定期产品配置', before: '—', after: '8 个产品' }] }
}
export function validateProduct(product) {
  if (typeof product.redemptionReviewRequired !== 'boolean') throw new Error('请设置赎回是否需要人工审核。')
  if (!product.name?.trim()) throw new Error('请填写产品名称。')
  if (!currencies.includes(product.symbol)) throw new Error('请选择支持的申购币种。')
  for (const key of ['days','apy','min','max','quota','sort']) if (!Number.isFinite(Number(product[key])) || product[key] === null || product[key] === '') throw new Error('请完整填写数值字段。')
  if (!Number.isInteger(Number(product.days)) || product.days < 0 || product.days > 3650) throw new Error('期限必须为 0–3650 的整数，0 表示活期。')
  if ([product.dailyRateMin, product.dailyRateMax].some(value => value == null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 100) || Number(product.dailyRateMin) > Number(product.dailyRateMax)) throw new Error('日利率区间须满足：0 ≤ 下限 ≤ 上限 ≤ 100%。')
  if (product.apy < 0 || product.apy > 1000) throw new Error('请检查预计年化收益率范围。')
  if (typeof product.initialSubscribed !== 'number' || !Number.isFinite(product.initialSubscribed) || product.initialSubscribed<0) throw new Error('初始已募集金额须为大于或等于 0 的数字。')
  if (earnFundingProgress(product).total > product.quota) throw new Error('初始已募集金额与已审核申购金额合计不能超过总额度。')
  if (product.min <= 0 || product.max < product.min || product.quota < product.max || product.quota < product.subscribed) throw new Error('额度须满足：总额度 ≥ 单笔上限 ≥ 起购金额，且总额度不得低于已售额度。')
  if (product.perUser != null && (!Number.isFinite(Number(product.perUser)) || product.perUser < product.min)) throw new Error('个人限额不得低于起购金额；留空表示不限。')
  if (!['disabled','fee','flexible'].includes(product.earlyRule)) throw new Error('请选择有效的提前赎回规则。')
  if (product.days > 0 && product.earlyRule === 'flexible') throw new Error('定期产品需要配置提前赎回规则。')
  if (product.earlyRule === 'fee' && (!['principal','principal_and_yield'].includes(product.earlyFeeBase) || typeof product.earlyFeeRate !== 'number' || !Number.isFinite(product.earlyFeeRate) || product.earlyFeeRate < 0 || product.earlyFeeRate > 100)) throw new Error('请选择手续费基数，并填写 0–100% 的手续费率。')
  if (!product.risk?.trim()) throw new Error('请填写风险说明。')
}
function log(state, action, target, reason, before, after, now, operator = '运营管理员') {
  state.logs.unshift({ id: crypto.randomUUID(), at: now, operator, action, target, reason, before, after })
}
export function saveEarnProduct(state, input, now = Date.now()) {
  const previous = state.products.find(row => row.id === input.id)
  input = {...input, subscribed:previous?.subscribed??0}
  validateProduct(input)
  if (previous && previous.version !== input.version) throw new Error('产品已更新，请关闭后重新打开。')
  if (previous && (previous.symbol !== input.symbol || previous.days !== Number(input.days))) throw new Error('已有产品的币种和期限不可变更，请新建产品。')
  const next = { ...clone(input), name: input.name.trim(), days: Number(input.days), status: previous?.status || 'draft', id: previous?.id || `earn-${crypto.randomUUID()}`, version: (previous?.version || 0)+1, updatedAt: now }
  if (!next.days) { next.earlyRule = 'flexible'; next.settlement = 'daily' } else next.settlement = 'maturity'
  if (previous) state.products.splice(state.products.indexOf(previous), 1, next)
  else state.products.unshift(next)
  log(state, previous ? '编辑产品' : '创建产品', next.id, '保存产品配置', previous ? JSON.stringify(previous) : '—', JSON.stringify(next), now)
  return next
}
export function setEarnProductStatus(state, id, expectedVersion, now = Date.now()) {
  const product = state.products.find(row => row.id === id)
  if (!product || product.version !== expectedVersion) throw new Error('产品状态已变化，请重新打开后操作。')
  validateProduct(product)
  const before = product.status
  product.status = before === 'enabled' ? 'disabled' : 'enabled'
  product.version++; product.updatedAt = now
  log(state, product.status === 'enabled' ? '上架产品' : '下架产品', id, product.status === 'enabled' ? '产品上架' : '产品下架', before, product.status, now)
}
export function reviewEarnOrder(state, id, decision, now = Date.now(), reviewer = 'Admin（模拟）') {
  const order = state.orders.find(row => row.id === id)
  if (!order || order.status !== 'pending_review') throw new Error('订单已处理，请刷新列表。')
  if (!['approve','reject'].includes(decision)) throw new Error('请选择审核结果。')
  const product = state.products.find(row => row.id === order.productId)
  if (decision === 'approve') {
    if (!product || product.status !== 'enabled') throw new Error('产品当前不可申购。')
    const owned = state.holdings.filter(h => h.productId === product.id && h.userId === order.userId && h.status !== 'redeemed').reduce((sum,h) => sum+h.principal,0)
    if (order.amount < product.min || order.amount > product.max || round(order.amount+earnFundingProgress(product).total) > product.quota || (product.perUser != null && owned+order.amount > product.perUser)) throw new Error('订单超过产品或用户额度，不能审核通过。')
    state.holdings.unshift({ id: `holding-${order.id}`, orderId: order.id, productId: product.id, productName: product.name, symbol: product.symbol, userId: order.userId, principal: order.amount, accrued: 0, rate: null, dailyRateMin: product.dailyRateMin, dailyRateMax: product.dailyRateMax, status: 'active', subscribedAt: order.createdAt, startedAt: now, maturityAt: product.days ? now+product.days*DAY : null, lastAccruedAt: null, nextAccrualAt: now+DAY, terms: clone(product) })
    product.subscribed = round(product.subscribed+order.amount)
    product.version++
  }
  order.reviewer = reviewer
  order.status = decision === 'approve' ? 'completed' : 'rejected'; order.completedAt = now
  log(state, decision === 'approve' ? '通过申购' : '拒绝申购', id, decision === 'approve' ? '审核通过' : '审核拒绝', 'pending_review', order.status, now, reviewer)
}
export function quoteEarnRedemption(record, holding) {
  const principal = record.amount, reward = record.reward
  if (![principal,reward].every(value=>typeof value==='number'&&Number.isFinite(value)&&value>=0) || principal===0) throw new Error('赎回本金或收益无效。')
  let feeBase = null, feeRate = 0
  if (record.type === 'fixedEarly') {
    const terms = holding?.terms
    if (!terms || terms.earlyRule !== 'fee' || !['principal','principal_and_yield'].includes(terms.earlyFeeBase) || typeof terms.earlyFeeRate!=='number' || !Number.isFinite(terms.earlyFeeRate) || terms.earlyFeeRate<0 || terms.earlyFeeRate>100) throw new Error('持仓未配置有效的提前赎回手续费规则。')
    feeBase = terms.earlyFeeBase; feeRate = terms.earlyFeeRate
  }
  const fee = round((feeBase==='principal_and_yield'?principal+reward:principal)*feeRate/100)
  return {feeBase,feeRate,fee,receive:round(principal+reward-fee)}
}
export function submitEarnRedemption(state, holdingId, amount, requestId, now = Date.now()) {
  if (!requestId?.trim()) throw new Error('缺少赎回申请编号。')
  const existing = state.redemptions.find(row=>row.id===requestId)
  if (existing) {
    if (existing.holdingId!==holdingId || existing.amount!==amount) throw new Error('申请编号已被使用。')
    return existing
  }
  const holding = state.holdings.find(row=>row.id===holdingId)
  if (!holding || !['active','matured'].includes(holding.status)) throw new Error('持仓当前不可提交赎回。')
  const product = state.products.find(row=>row.id===holding.productId)
  if (!product) throw new Error('产品不存在。')
  if (!Number.isFinite(amount) || amount<=0 || amount>holding.principal) throw new Error('赎回金额无效。')
  const fixed = holding.terms?.days>0
  if (fixed && amount!==holding.principal) throw new Error('定期持仓须全额赎回。')
  const early = fixed && holding.maturityAt>now
  const record = {id:requestId,holdingId,productId:holding.productId,productName:holding.productName,symbol:holding.symbol,userId:holding.userId,amount,reward:round(holding.accrued*amount/holding.principal),type:fixed?(early?'fixedEarly':'fixedMatured'):(amount===holding.principal?'flexibleFull':'flexiblePartial'),status:'pending',createdAt:now,completedAt:null,reviewer:null,reviewRequired:product.redemptionReviewRequired!==false,previousHoldingStatus:holding.status}
  Object.assign(record,quoteEarnRedemption(record,holding))
  state.redemptions.unshift(record)
  holding.status='redeeming'
  if (!record.reviewRequired) settleEarnRedemption(state,record.id,now,'系统自动处理')
  return record
}
export function reviewEarnRedemption(state, id, decision, now = Date.now(), reviewer = 'Admin（模拟）') {
  if (!['approve','reject'].includes(decision)) throw new Error('请选择审核结果。')
  const record = state.redemptions.find(row=>row.id===id)
  if (!record || record.status!=='pending') throw new Error('该赎回记录已处理。')
  if (decision==='approve') return settleEarnRedemption(state,id,now,reviewer)
  const holding=state.holdings.find(row=>row.id===record.holdingId)
  if (!holding || holding.status!=='redeeming') throw new Error('持仓状态已变化。')
  holding.status=holding.maturityAt&&holding.maturityAt<=now?'matured':record.previousHoldingStatus||'active'
  record.status='rejected';record.completedAt=now;record.reviewer=reviewer
  log(state,'拒绝赎回',id,'赎回审核拒绝','pending','rejected',now,reviewer)
}
export function settleEarnRedemption(state, id, now = Date.now(), reviewer = 'Admin（模拟）') {
  const record = state.redemptions.find(row => row.id === id)
  if (!record || record.status !== 'pending') throw new Error('该赎回记录已处理。')
  const holding = state.holdings.find(row => row.id === record.holdingId)
  if (!holding || holding.status !== 'redeeming' || holding.principal < record.amount || holding.accrued < record.reward) throw new Error('持仓与赎回金额不一致，请先核对。')
  const quote = quoteEarnRedemption(record, holding)
  Object.assign(record, quote)
  let settledReward=record.reward
  for (const reward of state.rewards.filter(row=>row.holdingId===holding.id&&row.status==='accrued')) {
    const used=Math.min(reward.amount,settledReward)
    reward.amount=round(reward.amount-used);settledReward=round(settledReward-used)
  }
  state.rewards=state.rewards.filter(row=>!(row.holdingId===holding.id&&row.status==='accrued'&&row.amount===0))
  holding.principal = round(holding.principal-record.amount); holding.accrued = round(holding.accrued-record.reward)
  holding.status = holding.principal ? 'active' : 'redeemed'
  record.reviewer = reviewer
  record.status = 'completed'; record.completedAt = now
  if (record.reward > 0) state.rewards.unshift({ id: `${id}-settlement`, holdingId:holding.id, productId: record.productId, productName: record.productName, symbol: record.symbol, userId: record.userId, amount: record.reward, status: 'paid', rewardAt: now, paidAt: now })
  log(state, '确认赎回结算', id, '赎回结算完成', 'pending', 'completed', now, reviewer)
}
export function getEarnHoldingRewards(state, holdingId) {
  if (!holdingId) return []
  return state.rewards.filter(row=>row.holdingId===holdingId).slice().sort((a,b)=>b.rewardAt-a.rewardAt)
}
export function earnAdminStats(state) {
  const live = state.holdings.filter(row => row.status !== 'redeemed')
  return { principal: live.reduce((sum,row) => sum + row.principal*earnPrices[row.symbol],0), pending: state.orders.filter(row => row.status === 'pending_review').length, redemptions: state.redemptions.filter(row => row.status === 'pending').length, enabled: state.products.filter(row => row.status === 'enabled').length }
}
