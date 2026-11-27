<script setup>
// C2C 交易 → 新增/编辑报价: dedicated single-page grouped form (Earn/Quant Fund editor conventions), sticky actions,
// right-side return, unsaved-change guard. Coin, fiat and side identify the quote and are fixed once it exists.
import {computed, onBeforeUnmount, ref, watch} from 'vue'
import {onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter} from 'vue-router'
import {message, Button, Card, Col, Empty, Form, FormItem, InputNumber, RadioButton, RadioGroup, Row, Select, Space, Spin, Textarea, TypographyText} from 'ant-design-vue'
import {ArrowLeftOutlined} from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {ASSETS, FIATS} from '../../../shared/c2c/domain.js'
import {c2cState, c2cError, c2cBusy, refreshC2C, c2cCommand, errorText, sideLabels} from '../../../shared/c2c/client.js'

const route = useRoute(), router = useRouter()
const form = ref(null), expectedVersion = ref(null), original = ref(''), loading = ref(true), found = ref(true)
const blank = () => ({symbol: 'USDT', fiat: 'USD', side: 'buy', price: 1, min: 100, max: 100000, ttlSeconds: 60, note: '', sortWeight: 0})
const plain = value => JSON.parse(JSON.stringify(value))
const assetOptions = ASSETS.map(value => ({value, label: value}))
const fiatOptions = FIATS.map(value => ({value, label: value}))
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const busy = computed(() => loading.value || c2cBusy.value)
const number = value => Number(value || 0).toLocaleString('en-US', {maximumFractionDigits: 8})
const example = computed(() => {
  const f = form.value
  if (!f || !Number.isFinite(f.price) || !Number.isFinite(f.min)) return '按数量 × 价格计算法币金额'
  return `下单 ${number(f.min)} ${f.symbol} = ${number(f.min * f.price)} ${f.fiat}`
})

let loadVersion = 0
async function load() {
  const version = ++loadVersion
  loading.value = true
  form.value = null
  await refreshC2C()
  if (version !== loadVersion) return
  loading.value = false
  if (c2cError.value) { message.error(errorText(c2cError.value)); return }
  const quote = route.params.id ? c2cState.value.quotes.find(q => q.quoteId === route.params.id) : null
  found.value = !route.params.id || !!quote
  expectedVersion.value = quote?.version ?? null
  form.value = quote ? plain({symbol: quote.symbol, fiat: quote.fiat, side: quote.side, price: quote.price, min: quote.min, max: quote.max, ttlSeconds: quote.ttlSeconds, note: quote.note, sortWeight: quote.sortWeight}) : blank()
  original.value = JSON.stringify(form.value)
}
watch(() => route.params.id, load, {immediate: true})

const listQuery = () => Object.fromEntries(['symbol', 'side', 'status', 'page'].filter(k => route.query[k] != null).map(k => [k, route.query[k]]))
function back() { router.push({path: '/admin/c2c/quotes', query: listQuery()}) }

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
    await c2cCommand('saveQuote', {quote: {...plain(form.value), quoteId: route.params.id || undefined}, expectedVersion: expectedVersion.value})
    original.value = JSON.stringify(form.value)
    message.success(route.params.id ? '报价已保存' : '报价已创建，默认未启用')
    back()
  } catch (e) { message.error(errorText(e)) }
}
</script>

<template>
 <PageShell :title="route.params.id ? '编辑 C2C 报价' : '新增 C2C 报价'">
  <template #extra><Button :disabled="c2cBusy" aria-label="返回报价列表" @click="back"><template #icon><ArrowLeftOutlined/></template>返回</Button></template>
  <template v-if="route.params.id" #description><TypographyText type="secondary">{{ route.params.id }}<template v-if="expectedVersion"> · v{{ expectedVersion }}</template></TypographyText></template>
  <Spin v-if="loading" tip="加载报价…"/>
  <Card v-else-if="!found" :bordered="false"><Empty description="报价不存在或已失效"><Button @click="back">返回报价列表</Button></Empty></Card>
  <Card v-else-if="!form" :bordered="false"><Empty description="报价数据加载失败"><Button @click="load">重试</Button></Empty></Card>
  <template v-else>
   <Form name="c2c-quote-editor" class="c2c-editor-form" layout="vertical" :model="form" :disabled="c2cBusy" :validate-trigger="[]" @finish="save">
    <Card title="基本信息" :bordered="false"><Row :gutter="24" class="c2c-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="symbol" label="币种" required help="可输入币种搜索"><Select v-model:value="form.symbol" :options="assetOptions" show-search option-filter-prop="label" placeholder="输入币种搜索" not-found-content="无匹配币种" :disabled="!!route.params.id"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="fiat" label="法币" required help="用户线下付款 / 收款的币种，价格和订单金额以此计价"><Select v-model:value="form.fiat" :options="fiatOptions" show-search option-filter-prop="label" placeholder="输入法币搜索" not-found-content="无匹配法币" :disabled="!!route.params.id"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="side" label="方向" required help="用户买入：平台卖币；用户卖出：平台收币"><RadioGroup v-model:value="form.side" button-style="solid" :disabled="!!route.params.id"><RadioButton v-for="(label, value) in sideLabels" :key="value" :value="value">{{ label }}</RadioButton></RadioGroup></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="sortWeight" label="排序权重" help="数值越大越靠前"><InputNumber v-model:value="form.sortWeight" :precision="0"/></FormItem></Col>
    </Row></Card>
    <Card title="价格与限额" :bordered="false"><Row :gutter="24" class="c2c-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="price" label="价格" required :help="example"><InputNumber v-model:value="form.price" :min="0" :step="0.01" :addon-after="form.fiat"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="min" label="单笔最小数量" required><InputNumber v-model:value="form.min" :min="0" :step="1" :addon-after="form.symbol"/></FormItem></Col>
     <Col :xs="24" :lg="8"><FormItem name="max" label="单笔最大数量" required><InputNumber v-model:value="form.max" :min="0" :step="1" :addon-after="form.symbol"/></FormItem></Col>
    </Row></Card>
    <Card title="有效期与说明" :bordered="false"><Row :gutter="24" class="c2c-editor-fields">
     <Col :xs="24" :lg="8"><FormItem name="ttlSeconds" label="报价有效期" required help="前台倒计时结束后刷新报价；10–86400 秒"><InputNumber v-model:value="form.ttlSeconds" :min="10" :max="86400" :precision="0" addon-after="秒"/></FormItem></Col>
     <Col :xs="24"><FormItem name="note" label="备注" help="显示在前台报价卡片下方，例如付款或打款说明"><Textarea v-model:value="form.note" :auto-size="{minRows: 2, maxRows: 4}" :maxlength="255" show-count/></FormItem></Col>
    </Row></Card>
   </Form>
   <Card class="c2c-editor-footer" :body-style="{padding: '12px 24px'}" :bordered="false"><div class="c2c-editor-actions"><Space :size="8" wrap><Button :disabled="c2cBusy" @click="back">取消</Button><Button type="primary" :loading="c2cBusy" @click="save">保存报价</Button></Space></div></Card>
  </template>
  <AdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave"><TypographyText>当前修改尚未保存，离开后将丢失这些修改。</TypographyText></AdminModal>
 </PageShell>
</template>

<style scoped>
.c2c-editor-form{display:grid;gap:24px}
.c2c-editor-fields{max-width:1100px}
.c2c-editor-form :deep(:is(.ant-input-number,.ant-input-number-group-wrapper)){width:100%}
.c2c-editor-footer{position:sticky;bottom:0;z-index:10}
.c2c-editor-actions{display:flex;justify-content:flex-end}
</style>
