import {ref, onMounted} from 'vue'
import {createC2CState} from './domain.js'
import {createC2CService} from './service.js'

// Client for the C2C mock used by the admin (/admin/c2c/*). Static data (like lending and Quant Fund): the mock runs
// in this page's memory, so a static deploy needs no server; each page load starts from the seed and nothing is
// persisted. The public site keeps its own local C2C orders and quote snapshot (no live sync).
export const c2cState = ref(createC2CState())
export const c2cError = ref(''), c2cBusy = ref(false), c2cLoaded = ref(false)
let revision = 0, service = null

async function request(options) {
  service ||= createC2CService()
  if (!options) return service.read()
  return service.command(options.action, options.args)
}
export async function refreshC2C() {
  const version = ++revision
  try {
    const data = await request()
    if (version === revision) { c2cState.value = data; c2cError.value = ''; c2cLoaded.value = true }
  } catch (error) { c2cError.value = error.message }
}
/** Runs one command; rejects with the domain error code. A fresh requestId per call guards against double submission. */
export async function c2cCommand(action, args = {}) {
  if (c2cBusy.value) throw new Error('busy')
  c2cBusy.value = true
  ++revision
  try {
    c2cState.value = await request({action, args: {...args, requestId: args.requestId || crypto.randomUUID()}})
    c2cError.value = ''
    c2cLoaded.value = true
  } finally { c2cBusy.value = false }
}
export function useC2CFeed() {
  onMounted(refreshC2C)
  return {state: c2cState, error: c2cError, busy: c2cBusy, loaded: c2cLoaded, refresh: refreshC2C}
}

export const sideLabels = {buy: '用户买入', sell: '用户卖出'}
export const sideColors = {buy: 'green', sell: 'red'}
export const orderStatusLabels = {pending_review: '待审核', completed: '已完成', rejected: '已拒绝', cancelled: '已取消'}
export const orderStatusColors = {pending_review: 'blue', completed: 'green', rejected: 'red', cancelled: 'default'}
export const actionLabels = {
  submit: '提交订单', approve: '审核通过', reject: '审核拒绝', cancel: '用户取消',
  saveQuote: '保存报价', enableQuote: '启用报价', disableQuote: '停用报价', saveAgreement: '保存协议',
}
export const moduleLabels = {order: '订单', quote: '报价', agreement: '协议'}
export const localeLabels = {'en-US': 'English', 'zh-TW': '繁體中文', 'fr-FR': 'Français', 'de-DE': 'Deutsch', 'ja-JP': '日本語', 'ko-KR': '한국어'}
export const errorLabels = {
  busy: '操作处理中', duplicate: '请勿重复提交', stale: '数据已被修改，请刷新后再试', status: '订单状态已改变，请刷新后再试',
  order: '订单不存在', owner: '不能操作其他用户的订单', quote: '报价不存在', quoteOff: '该报价未启用', amount: '数量不在报价限额内',
  balance: '可用余额不足', quoteSide: '请选择方向', quoteSymbol: '请选择币种', quotePrice: '价格须大于 0',
  quoteLimits: '单笔最小须大于 0，单笔最大不小于单笔最小', quoteTtl: '报价有效期须为 10–86400 秒的整数', quoteNote: '备注不超过 255 字',
  quoteSort: '排序权重须为整数', quoteTaken: '该币种和方向的报价已存在', action: '不支持的操作',
  agreement: '协议不存在', agreementDefault: '英文版本的标题和正文为必填', agreementPartial: '每种语言须同时填写标题和正文，或全部留空', agreementLength: '标题不超过 120 字，正文不超过 20000 字',
}
export const errorText = error => errorLabels[error?.message || error] || String(error?.message || error || '操作失败')
