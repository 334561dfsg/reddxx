<script setup>
// 量化基金 → 新增/编辑产品: dedicated single-page grouped form (Earn/strategy editor conventions), sticky actions,
// right-side return, unsaved-change guard. Turning the lock period off keeps its days and fee as a draft.
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'
import {message, Button, Card, Col, Empty, Form, FormItem, Input, InputNumber, RadioButton, RadioGroup, Row, Select, Space, Spin, Textarea, TypographyText} from 'ant-design-vue'
import {ArrowLeftOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {verificationOptions, vipOptions} from '../../../shared/lending/eligibility.js'
import {ASSETS} from '../../../shared/quantFund/domain.js'
import {quantFundState, quantFundError, quantFundBusy, refreshQuantFund, quantFundCommand, errorText, riskLabels} from '../../../shared/quantFund/client.js'

const route = useRoute(), router = useRouter()
const form = ref(null), expectedVersion = ref(null), original = ref(''), loading = ref(true), found = ref(true)
// The form keeps the lock days and fee while the lock is off; only an active lock is saved.
const blank = () => ({
  name: '', code: '', asset: 'USDT', riskLevel: 'LOW', tags: ['AI Strategy'], description: '', sortOrder: 0,
  locked: true, lockDays: 30, earlyRedeemFeeRate: 0.73, minAmount: 5000, maxAmount: 100000, totalQuota: 2000000, initialPercent: 0,
  dailyRate: {min: 1, max: 1}, restrictedUserIds: [], minVerificationLevel: 'none', minVipLevel: 0,
})
// JSON copies: reactive Proxies cannot go through structuredClone.
const plain = value => JSON.parse(JSON.stringify(value))
const toForm = p => ({...plain(p), restrictedUserIds: p.restrictedUserIds || [], locked: p.lockDays !== null, lockDays: p.lockDays ?? 30, earlyRedeemFeeRate: p.lockDays === null ? 0.73 : p.earlyRedeemFeeRate})
const toProduct = f => {
  const {locked, ...product} = plain(f)
  return {...product, code: product.code.trim().toUpperCase(), lockDays: locked ? product.lockDays : null, earlyRedeemFeeRate: locked ? product.earlyRedeemFeeRate : 0}
}
const riskOptions = Object.entries(riskLabels).map(([value, label]) => ({value, label}))
const assetOptions = ASSETS.map(value => ({value, label: value}))
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || quantFundBusy.value)
const whole = value => Number(value || 0).toLocaleString('zh-CN', {maximumFractionDigits: 2})
// Equal bounds = a fixed daily rate; different bounds = a rate drawn inside the range each day.
const rateValid = computed(() => { const r = form.value?.dailyRate; return !!r && Number.isFinite(r.min) && Number.isFinite(r.max) })
const rateExample = computed(() => {
  if (!rateValid.value) return '按本金计算，不复利'
  const {min, max} = form.value.dailyRate
  return min === max ? `本金 1 万 USDT：每天计息 ${(100 * min).toFixed(2)} USDT` : `本金 1 万 USDT：每天计息 ${(100 * min).toFixed(2)} ~ ${(100 * max).toFixed(2)} USDT`
})
const rateMode = computed(() => {
  if (!rateValid.value) return '上下限相同即为固定收益'
  const {min, max} = form.value.dailyRate
  return min === max ? '上下限相同：固定收益' : `每天在区间内随机，前台展示平均值 ${Number(((min + max) / 2).toFixed(4))}%`
})
const feeExample = computed(() => {
  const f = form.value?.earlyRedeemFeeRate
  return Number.isFinite(f) ? `本金 10 万 USDT 提前赎回扣 ${whole(1000 * f)} USDT，与剩余天数无关` : '按本金计算'
})

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  form.value = null
  await refreshQuantFund()
  if (version !== loadVersion) return
  loading.value = false
  if (quantFundError.value) { message.error(errorText(quantFundError.value)); return }
  const product = route.params.id ? quantFundState.value.products.find(p => p.productId === route.params.id) : null
  found.value = !route.params.id || !!product
  expectedVersion.value = product?.version ?? null
  form.value = product ? toForm(product) : blank()
  original.value = JSON.stringify(form.value)
}
watch(() => route.params.id, load, {immediate: true})

const listQuery = () => Object.fromEntries(['name', 'code', 'asset', 'term', 'status', 'page'].filter(k => route.query[k] != null).map(k => [k, route.query[k]]))
function back() { router.push({path: '/admin/quant-fund/products', query: listQuery()}) }

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
    await quantFundCommand('saveProduct', {product: toProduct(form.value), expectedVersion: expectedVersion.value})
    original.value = JSON.stringify(form.value)
    message.success(route.params.id ? '产品已保存' : '产品已创建，默认未上架')
    back()
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell :title="route.params.id ? '编辑量化基金产品' : '新增量化基金产品'">
  <template #extra><Button :disabled="quantFundBusy" aria-label="返回产品列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="route.params.id" #description><TypographyText type="secondary">{{ route.params.id }}<template v-if="expectedVersion"> · v{{ expectedVersion }}</template></TypographyText></template>
  <Spin v-if="loading" tip="加载产品…"/>
  <Card v-else-if="!found" :bordered="false"><Empty description="产品不存在或已失效"><Button @click="back">返回产品列表</Button></Empty></Card>
  <Card v-else-if="!form" :bordered="false"><Empty description="产品数据加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="quant-fund-product-editor" class="qf-editor-form" layout="vertical" :model="form" :disabled="quantFundBusy" :validate-trigger="[]" @finish="save">
    <Card title="基本信息" :bordered="false"><Row :gutter="24" class="qf-editor-fields">
     <Col :xs="24" :lg="16"><FormItem name="name" label="产品名称" required><Input v-model:value="form.name" :maxlength="80" placeholder="请输入产品名称"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="code" label="产品代码" required help="大写字母、数字或短横线，如 QF-VIP0"><Input v-model:value="form.code" :maxlength="32" placeholder="QF-VIP0"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="asset" label="标识币种" required help="前台卡片图标与资产筛选使用；申购、计息和赎回均为 USDT"><Select v-model:value="form.asset" :options="assetOptions" show-search option-filter-prop="label" placeholder="输入币种搜索" not-found-content="无匹配币种"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="riskLevel" label="风险等级" required><Select v-model:value="form.riskLevel" :options="riskOptions"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="sortOrder" label="排序权重" help="数值越大越靠前"><InputNumber v-model:value="form.sortOrder" :min="0" :precision="0"/></FormItem></Col>
     <Col :xs="24"><FormItem name="tags" label="策略标签" help="输入后回车添加，例如 AI Strategy、US Equity"><Select v-model:value="form.tags" mode="tags" :token-separators="[',']" placeholder="添加策略标签" :open="false"/></FormItem></Col>
     <Col :xs="24"><FormItem name="description" label="产品描述"><Textarea v-model:value="form.description" :auto-size="{minRows: 2, maxRows: 5}" :maxlength="300" show-count/></FormItem></Col>
    </Row></Card>
    <Card title="申购条件" :bordered="false"><Row :gutter="24" class="qf-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="minVerificationLevel" label="最低认证等级" help="达到所选等级及以上可申购"><Select v-model:value="form.minVerificationLevel" :options="verificationOptions"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="minVipLevel" label="最低 VIP 等级" help="两项条件需同时满足"><Select v-model:value="form.minVipLevel" :options="vipOptions"/></FormItem></Col>
     <Col :xs="24"><FormItem name="restrictedUserIds" label="限购名单（UID）" help="名单内用户看到该产品进度已满（100%），不能申购"><Select v-model:value="form.restrictedUserIds" mode="tags" :token-separators="[',', ' ']" placeholder="输入 UID 后回车添加" :open="false"/></FormItem></Col>
    </Row></Card>
    <Card title="期限与额度" :bordered="false"><Row :gutter="24" class="qf-editor-fields">
     <Col :xs="24"><FormItem name="locked" label="锁定期" required><RadioGroup v-model:value="form.locked" button-style="solid"><RadioButton :value="false">无锁定期</RadioButton><RadioButton :value="true">有锁定期</RadioButton></RadioGroup></FormItem></Col>
     <template v-if="form.locked">
      <Col :xs="24" :lg="8"><FormItem name="lockDays" label="锁定天数" required help="审核通过后开始计算；结束后继续计息，直到赎回"><InputNumber v-model:value="form.lockDays" :min="1" :precision="0" addon-after="天"/></FormItem></Col>
      <Col :xs="24" :lg="8"><FormItem name="earlyRedeemFeeRate" label="提前赎回手续费率" required :help="feeExample"><InputNumber v-model:value="form.earlyRedeemFeeRate" :min="0" :max="100" :step="0.01" :precision="4" addon-after="%"/></FormItem></Col>
      <Col :xs="0" :lg="8"/>
     </template>
     <Col :xs="24" :lg="8"><FormItem name="minAmount" label="起投金额" required><InputNumber v-model:value="form.minAmount" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="maxAmount" label="单笔上限" required><InputNumber v-model:value="form.maxAmount" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="totalQuota" label="产品总额度" required><InputNumber v-model:value="form.totalQuota" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="initialPercent" label="初始募集比例" required><InputNumber v-model:value="form.initialPercent" :min="0" :max="100" :precision="2" addon-after="%"/></FormItem></Col>
    </Row></Card>
    <Card title="每日收益规则" :bordered="false"><Row :gutter="24" class="qf-editor-fields">
     <Col :xs="24" :lg="8"><FormItem :name="['dailyRate', 'min']" label="日收益率下限" required :help="rateExample"><InputNumber v-model:value="form.dailyRate.min" :min="0" :max="100" :step="0.01" :precision="4" addon-after="%"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem :name="['dailyRate', 'max']" label="日收益率上限" required :help="rateMode"><InputNumber v-model:value="form.dailyRate.max" :min="0" :max="100" :step="0.01" :precision="4" addon-after="%"/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="qf-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="qf-editor-actions"><Space :size="8" wrap><Button :disabled="quantFundBusy" @click="back">取消</Button><Button type="primary" :loading="quantFundBusy" @click="save">保存产品</Button></Space></div></Card>
  </template>
  <AdminModal :width="520" :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.qf-editor-form{display:grid;gap:24px}
.qf-editor-fields{max-width:1100px}
.qf-editor-form :deep(:is(.ant-input-number,.ant-input-number-group-wrapper)){width:100%}
.qf-editor-footer{position:sticky;bottom:0;z-index:10}
.qf-editor-actions{display:flex;justify-content:flex-end}
</style>
