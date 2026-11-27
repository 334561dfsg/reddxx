import {ref, onMounted, onUnmounted} from 'vue'
import {createQuantFundState} from './domain.js'
import {createQuantFundService} from './service.js'

// Client for the Quant Fund mock used by the admin (/admin/quant-fund/*). Static data (user decision, 2026-11-27):
// the mock runs in this page's memory, so a static deploy needs no server; each page load starts from the seed and
// nothing is persisted. The public site keeps its own local Quant Fund ledger (no live sync).
export const quantFundState = ref(createQuantFundState())
export const quantFundError = ref(''), quantFundBusy = ref(false), quantFundLoaded = ref(false)
let revision = 0, service = null

async function request(options) {
  service ||= createQuantFundService()
  if (!options) return service.read()
  const {action, args} = JSON.parse(options.body)
  return service.command(action, args)
}
export async function refreshQuantFund() {
  const version = ++revision
  try {
    const data = await request()
    if (version === revision) { quantFundState.value = data; quantFundError.value = ''; quantFundLoaded.value = true }
  } catch (error) { quantFundError.value = error.message }
}
/** Runs one command; rejects with the domain error code. A fresh requestId per call guards against double submission. */
export async function quantFundCommand(action, args = {}) {
  if (quantFundBusy.value) throw new Error('busy')
  quantFundBusy.value = true
  ++revision
  try {
    quantFundState.value = await request({method: 'POST', body: JSON.stringify({action, args: {...args, requestId: args.requestId || crypto.randomUUID()}})})
    quantFundError.value = ''
    quantFundLoaded.value = true
  } finally { quantFundBusy.value = false }
}
/** Loads on mount and refreshes every 3 s (skipped while a command runs) so daily payouts and maturity appear. */
export function useQuantFundFeed() {
  let timer
  onMounted(() => { refreshQuantFund(); timer = setInterval(() => { if (!quantFundBusy.value) refreshQuantFund() }, 3000) })
  onUnmounted(() => clearInterval(timer))
  return {state: quantFundState, error: quantFundError, busy: quantFundBusy, loaded: quantFundLoaded, refresh: refreshQuantFund}
}

export const orderStatusLabels = {pending_review: '待审核', active: '持有中', redeem_pending_review: '赎回审核中', redeemed: '已赎回', settled: '已到期', rejected: '已拒绝'}
export const orderStatusColors = {pending_review: 'blue', active: 'green', redeem_pending_review: 'orange', redeemed: 'default', settled: 'default', rejected: 'red'}
export const redemptionStatusLabels = {pending_review: '待审核', approved: '已通过', rejected: '已拒绝', cancelled: '已取消'}
export const redemptionStatusColors = {pending_review: 'blue', approved: 'green', rejected: 'red', cancelled: 'default'}
export const productStatusLabels = {listed: '已上架', unlisted: '未上架'}
export const riskLabels = {LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险'}
export const riskColors = {LOW: 'blue', MEDIUM: 'orange', HIGH: 'red'}
export const termLabel = termDays => (termDays == null ? '活期' : `${termDays} 天`)
export const actionLabels = {
  seed: '载入模拟数据', subscribe: '申购', approve: '审核通过', reject: '审核拒绝', mature: '到期结算',
  requestRedeem: '申请赎回', approveRedeem: '赎回通过', rejectRedeem: '赎回拒绝',
  saveProduct: '保存产品', listProduct: '上架产品', unlistProduct: '下架产品',
}
export const errorLabels = {
  unavailable: '数据暂不可用，请刷新后重试', busy: '操作处理中', duplicate: '请勿重复提交', stale: '数据已被修改，请刷新后再试',
  status: '订单状态已改变，请刷新后再试', order: '订单不存在', redemption: '赎回申请不存在', product: '产品不存在或未上架',
  productChanged: '产品条款已调整，请重新确认', quota: '超出产品剩余额度', amount: '申购金额不在产品允许范围内', balance: '可用余额不足',
  owner: '不能操作其他用户的订单', fixedTerm: '定期产品不能提前赎回', minHold: '未达到最短持有天数',
  verificationRequired: '认证等级未达到申购要求', vipRequired: 'VIP 等级未达到申购要求', eligibilityConfig: '请选择有效的认证等级和 VIP 等级',
  productName: '请输入产品名称', productCode: '产品代码须为 2–32 位大写字母、数字或短横线', productCodeTaken: '产品代码已被使用',
  productRisk: '请选择风险等级', productTags: '策略标签不能为空白', productTerm: '定期产品的期限须为正整数天数',
  productMinHold: '活期产品的最短持有天数须为非负整数', productAmount: '起投金额须大于 0，单笔上限不小于起投金额',
  productQuota: '产品总额度不能小于单笔上限', productInitial: '初始募集比例须在 0–100% 之间',
  productRate: '日收益率须满足 0 ≤ 下限 ≤ 上限 ≤ 100%', productSort: '排序权重须为整数', action: '不支持的操作',
}
export const errorText = error => errorLabels[error?.message || error] || String(error?.message || error || '操作失败')
