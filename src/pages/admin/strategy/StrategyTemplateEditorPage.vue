<script setup>
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'
import {message, Button, Card, Col, Empty, Form, FormItem, Input, InputNumber, Row, Select, Space, Spin, Textarea, TypographyText} from 'ant-design-vue'
import {ArrowLeftOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {verificationOptions, vipOptions} from '../../../shared/lending/eligibility.js'
import {strategyState, strategyError, strategyBusy, refreshStrategy, strategyCommand, errorText, marketLabels, styleLabels} from '../../../shared/strategy/client.js'

const route = useRoute(), router = useRouter()
const form = ref(null), expectedVersion = ref(null), original = ref(''), loading = ref(true), found = ref(true)
const blank = () => ({
  name: '', market: 'crypto', style: 'balanced', risk: 2, sortOrder: strategyState.value.templates.length, symbols: [], description: '',
  sharpe: 1, winRate: 55, tradesPerDay: 2, minCapital: 500, maxCapital: 50000, minDays: 7, maxDays: 60,
  takeProfit: {min: 1, max: 100, default: 10}, stopLoss: {min: 1, max: 50, default: 5}, feeRate: 0.1, maxOpenTrades: 3, capacity: 0,
  dailyReturn: {min: -0.6, max: 1}, tradeDayRatio: 0.75, minVerificationLevel: 'none', minVipLevel: 0,
})
const options = labels => Object.entries(labels).map(([value, label]) => ({value, label}))
const riskOptions = [1, 2, 3, 4, 5].map(value => ({value, label: `Lv.${value}`}))
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || strategyBusy.value)
const tradeDayPercent = computed({get: () => form.value ? Math.round(form.value.tradeDayRatio * 100) : null, set: value => { form.value.tradeDayRatio = value == null ? null : value / 100 }})
const exampleReturn = computed(() => {
  const r = form.value?.dailyReturn
  return r && Number.isFinite(r.min) && Number.isFinite(r.max) ? `本金 10,000 USDT 时，交易日盈亏约 ${(100 * r.min).toFixed(2)} 至 ${(100 * r.max).toFixed(2)} USDT` : '按本金百分比计算'
})

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  form.value = null
  await refreshStrategy()
  if (version !== loadVersion) return
  loading.value = false
  if (strategyError.value) { message.error(errorText(strategyError.value)); return }
  const template = route.params.id ? strategyState.value.templates.find(t => t.templateId === route.params.id) : null
  found.value = !route.params.id || !!template
  expectedVersion.value = template?.version ?? null
  form.value = JSON.parse(JSON.stringify(template || blank()))
  original.value = JSON.stringify(form.value)
}
watch(() => route.params.id, load, {immediate: true})

const listQuery = () => Object.fromEntries(['q', 'market', 'style', 'status', 'page'].filter(k => route.query[k] != null).map(k => [k, route.query[k]]))
function back() { router.push({path: '/admin/strategy/templates', query: listQuery()}) }

const leaveOpen = ref(false)
let resolveLeave = null, allowLeave = false
function guard() { if (busy.value) return false; if (allowLeave || !dirty.value) return true; if (resolveLeave) return false; leaveOpen.value = true; return new Promise(resolve => { resolveLeave = resolve }) }
onBeforeRouteLeave(guard)
onBeforeRouteUpdate(guard)
function closeLeave(allow) { allowLeave = allow; leaveOpen.value = false }
function finishLeave() { const resolve = resolveLeave; resolveLeave = null; resolve?.(allowLeave); allowLeave = false }
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { ++loadVersion; window.removeEventListener('beforeunload', beforeUnload); resolveLeave?.(false) })

async function save() {
  if (busy.value || !form.value) return
  try {
    await strategyCommand('saveTemplate', {template: form.value, expectedVersion: expectedVersion.value})
    original.value = JSON.stringify(form.value)
    message.success(route.params.id ? '模板已保存' : '模板已创建，默认未上架')
    back()
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell class="strategy-editor" :title="route.params.id ? '编辑策略模板' : '新增策略模板'">
  <template #extra><Button :disabled="strategyBusy" aria-label="返回模板列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="route.params.id" #description><TypographyText type="secondary">{{ route.params.id }}<template v-if="expectedVersion"> · v{{ expectedVersion }}</template></TypographyText></template>
  <Spin v-if="loading" tip="加载模板…"/>
  <Card v-else-if="!found" :bordered="false"><Empty description="模板不存在或已失效"><Button @click="back">返回模板列表</Button></Empty></Card>
  <Card v-else-if="!form" :bordered="false"><Empty description="模板数据加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="strategy-template-editor" class="strategy-editor-form" layout="vertical" :model="form" :disabled="strategyBusy" @finish="save">
    <Card title="基本信息" :bordered="false"><Row :gutter="24" class="strategy-editor-fields">
     <Col :xs="24" :lg="12"><FormItem label="模板名称" required><Input v-model:value="form.name" :maxlength="80" placeholder="请输入模板名称"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="排序" help="数值越小越靠前"><InputNumber v-model:value="form.sortOrder" :min="0" :precision="0"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="风险等级" required><Select v-model:value="form.risk" :options="riskOptions"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="市场" required><Select v-model:value="form.market" :options="options(marketLabels)"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="风格" required><Select v-model:value="form.style" :options="options(styleLabels)"/></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem label="交易品种" required help="输入后回车添加，例如 BTCUSDT、SPX500"><Select v-model:value="form.symbols" mode="tags" :token-separators="[',', ' ']" placeholder="添加交易品种" :open="false"/></FormItem></Col>
     <Col :xs="24"><FormItem label="策略描述"><Textarea v-model:value="form.description" :auto-size="{minRows: 2, maxRows: 5}" :maxlength="300" show-count/></FormItem></Col>
    </Row></Card>
    <Card title="展示指标" :bordered="false"><Row :gutter="24" class="strategy-editor-fields">
     <Col :xs="24" :lg="8"><FormItem label="夏普比率" required help="前台展示值，用于排序与推荐"><InputNumber v-model:value="form.sharpe" :step="0.1" :precision="2"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem label="胜率（%）" required><InputNumber v-model:value="form.winRate" :min="0" :max="100" :precision="2"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem label="日均交易数" required><InputNumber v-model:value="form.tradesPerDay" :min="0.1" :step="1" :precision="1"/></FormItem></Col>
    </Row></Card>
    <Card title="订阅规则" :bordered="false"><Row :gutter="24" class="strategy-editor-fields">
     <Col :xs="24" :lg="6"><FormItem label="起投资金（USDT）" required><InputNumber v-model:value="form.minCapital" :min="0" :precision="2"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="单笔上限（USDT）" required><InputNumber v-model:value="form.maxCapital" :min="0" :precision="2"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="最短周期（天）" required><InputNumber v-model:value="form.minDays" :min="1" :precision="0"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="最长周期（天）" required><InputNumber v-model:value="form.maxDays" :min="1" :precision="0"/></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem label="止盈比例（%）：最小 / 默认 / 最大" required help="用户订阅时在该范围内选择，累计盈利达到所选比例自动结束"><Space :size="8"><InputNumber v-model:value="form.takeProfit.min" aria-label="止盈最小值" :min="1" :max="100"/><InputNumber v-model:value="form.takeProfit.default" aria-label="止盈默认值" :min="1" :max="100"/><InputNumber v-model:value="form.takeProfit.max" aria-label="止盈最大值" :min="1" :max="100"/></Space></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem label="止损比例（%）：最小 / 默认 / 最大" required help="累计亏损达到所选比例自动结束"><Space :size="8"><InputNumber v-model:value="form.stopLoss.min" aria-label="止损最小值" :min="1" :max="100"/><InputNumber v-model:value="form.stopLoss.default" aria-label="止损默认值" :min="1" :max="100"/><InputNumber v-model:value="form.stopLoss.max" aria-label="止损最大值" :min="1" :max="100"/></Space></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="手续费率（%）" required><InputNumber v-model:value="form.feeRate" :min="0" :max="5" :step="0.01" :precision="4"/></FormItem></Col>
     <Col :xs="24" :lg="6"><FormItem label="最大持仓数" required><InputNumber v-model:value="form.maxOpenTrades" :min="1" :precision="0"/></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem label="模板容量（USDT）" help="所有进行中订阅的资金合计上限，0 表示不限"><InputNumber v-model:value="form.capacity" :min="0" :precision="2"/></FormItem></Col>
    </Row></Card>
    <Card title="订阅条件" :bordered="false"><Row :gutter="24" class="strategy-editor-fields">
     <Col :xs="24" :lg="12"><FormItem label="最低认证等级" help="达到所选等级及以上可订阅"><Select v-model:value="form.minVerificationLevel" :options="verificationOptions"/></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem label="最低 VIP 等级" help="两项条件需同时满足"><Select v-model:value="form.minVipLevel" :options="vipOptions"/></FormItem></Col>
    </Row></Card>
    <Card title="收益模拟" :bordered="false"><Row :gutter="24" class="strategy-editor-fields">
     <Col :xs="24" :lg="12"><FormItem label="日收益率区间（%）：下限 / 上限" required :help="exampleReturn"><Space :size="8"><InputNumber v-model:value="form.dailyReturn.min" aria-label="日收益率下限" :min="-20" :max="20" :step="0.1" :precision="2"/><InputNumber v-model:value="form.dailyReturn.max" aria-label="日收益率上限" :min="-20" :max="20" :step="0.1" :precision="2"/></Space></FormItem></Col>
     <Col :xs="24" :lg="12"><FormItem label="交易日比例（%）" required help="每个周期日有成交的概率；无成交的日期不产生盈亏记录"><InputNumber v-model:value="tradeDayPercent" :min="1" :max="100" :precision="0"/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="strategy-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="strategy-editor-actions"><Space :size="8" wrap><Button :disabled="strategyBusy" @click="back">取消</Button><Button type="primary" :loading="strategyBusy" @click="save">保存模板</Button></Space></div></Card>
  </template>
  <AdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.strategy-editor{padding-bottom:0}
.strategy-editor-form{display:grid;gap:24px}
.strategy-editor-fields{max-width:1100px}
.strategy-editor :deep(.ant-input-number){width:100%}
.strategy-editor :deep(.ant-space .ant-input-number){width:120px}
.strategy-editor-footer{position:sticky;bottom:0;z-index:10}
.strategy-editor-actions{display:flex;justify-content:flex-end}
</style>
