import {ref, onMounted, onUnmounted} from 'vue'
import {createStrategyState} from './domain.js'
import {createStrategyService} from './service.js'

// Client for the strategy Mock, used by the admin and the public 真實 mode. Static data (user decision, 2026-11-27):
// the Mock runs in this page's memory, so a static deploy needs no server. Each page load starts from the seed;
// nothing is persisted and the admin and public site no longer share live state.
export const strategyState = ref(createStrategyState())
export const strategyError = ref(''), strategyBusy = ref(false), strategyLoaded = ref(false)
let revision = 0

let service = null
/** Same contract as the old HTTP endpoint: no body reads the state, {action, args} runs one command. */
async function request(options) {
  service ||= createStrategyService()
  if (!options) return service.read()
  const {action, args} = JSON.parse(options.body)
  return service.command(action, args)
}
export async function refreshStrategy() {
  const version = ++revision
  try {
    const data = await request()
    if (version === revision) { strategyState.value = data; strategyError.value = ''; strategyLoaded.value = true }
  } catch (error) { strategyError.value = error.message }
}
/** Runs one command; rejects with the server error code. A fresh requestId per call guards against double submission. */
export async function strategyCommand(action, args = {}) {
  if (strategyBusy.value) throw new Error('busy')
  strategyBusy.value = true
  ++revision
  try {
    strategyState.value = await request({method: 'POST', body: JSON.stringify({action, args: {...args, requestId: args.requestId || crypto.randomUUID()}})})
    strategyError.value = ''
    strategyLoaded.value = true
  } finally { strategyBusy.value = false }
}
/** Loads on mount and polls every 3 s (skipped while a command runs). */
export function useStrategyFeed() {
  let timer
  onMounted(() => { refreshStrategy(); timer = setInterval(() => { if (!strategyBusy.value) refreshStrategy() }, 3000) })
  onUnmounted(() => clearInterval(timer))
  return {state: strategyState, error: strategyError, busy: strategyBusy, loaded: strategyLoaded, refresh: refreshStrategy}
}

export const statusLabels = {pending_review: '待审核', initializing: '初始化中', running: '运行中', paused: '已暂停', completed: '已结束', rejected: '已拒绝'}
export const statusColors = {pending_review: 'blue', initializing: 'cyan', running: 'green', paused: 'orange', completed: 'default', rejected: 'red'}
export const endReasonLabels = {user_stop: '用户停止', expired: '到期结束', take_profit: '止盈结束', stop_loss: '止损结束', admin_stop: '后台强制停止'}
export const marketLabels = {stock: '股票', crypto: '加密货币', forex: '外汇'}
export const styleLabels = {conservative: '保守', balanced: '平衡', aggressive: '激进'}
export const templateStatusLabels = {listed: '已上架', unlisted: '未上架'}
export const actionLabels = {
  seed: '载入模拟数据', subscribe: '订阅策略', approve: '审核通过', reject: '审核拒绝', pause: '暂停策略', resume: '恢复策略', settle: '结算',
  forceStop: '强制停止', saveTemplate: '保存模板', listTemplate: '上架模板', unlistTemplate: '下架模板', savePolicy: '保存风控设置',
}
export const errorLabels = {
  unavailable: 'Mock 服务不可用，请通过根开发或预览服务打开页面', busy: '操作处理中', duplicate: '请勿重复提交', stale: '数据已被修改，请刷新后再试',
  status: '记录状态已改变，请刷新后重试', subscription: '策略订单不存在', template: '策略模板不存在或未上架', templateChanged: '策略条款已更新，请重新确认后提交',
  owner: '不能操作其他用户的策略', balance: '可用余额不足', capital: '资金不在模板允许范围内', days: '运行周期不在模板允许范围内',
  takeProfit: '止盈比例不在允许范围内', stopLoss: '止损比例不在允许范围内', userLimit: '已达到单用户运行中策略数量上限', userCapital: '已达到单用户在管资金上限',
  capacity: '该策略总额度已满', verificationRequired: '认证等级未达到订阅要求', vipRequired: 'VIP 等级未达到订阅要求', eligibilityConfig: '请选择有效的认证等级和 VIP 等级',
  policy: '请检查风控设置：数量与资金上限须为正数',
  templateName: '请填写模板名称', templateCategory: '请选择市场与风格', templateRisk: '风险等级须为 1–5 的整数', templateMetrics: '请填写有效的夏普比率、胜率（0–100）与日均交易数',
  templateSymbols: '请至少填写一个交易品种', templateCapital: '起投资金须大于 0，且不高于单笔上限', templateDays: '运行周期须为正整数天，且最短不超过最长',
  templateTakeProfit: '止盈范围须满足 1 ≤ 最小 ≤ 默认 ≤ 最大 ≤ 100', templateStopLoss: '止损范围须满足 1 ≤ 最小 ≤ 默认 ≤ 最大 ≤ 100', templateFee: '手续费率须为 0–5%',
  templateOpenTrades: '最大持仓数须为正整数', templateCapacity: '策略总额度不能为负数（0 表示不限）', templateReturn: '日收益率下限须小于上限，且在 -20% 至 20% 之间',
  templateTradeDays: '交易日比例须在 0–1 之间', templateSort: '排序须为整数', action: '不支持的操作',
}
export const errorText = error => errorLabels[error?.message ?? error] || error?.message || String(error)
