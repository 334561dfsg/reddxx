<script setup>
// 公益 → 频道统计: the public page's 总募集 / 受助人数 = configurable base values + the sums over every project.
// Versioned save with an unsaved-change guard; the save is logged with before/after.
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {message, Button, Card, Col, Empty, Form, FormItem, InputNumber, Row, Space, Spin, Statistic, TypographyText} from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {charityState, charityError, charityBusy, refreshCharity, charityCommand, errorText} from '../../../shared/charity/client.js'
import {channelTotals} from '../../../shared/charity/domain.js'
import {amount, dateTime} from '../strategy/strategyFormat.js'

const form = ref(null), original = ref(''), loading = ref(false), leaveOpen = ref(false)
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
const totals = computed(() => channelTotals(charityState.value))
const whole = value => Number(value || 0).toLocaleString('zh-CN')
// Preview of what the public page will show once the draft is saved.
const preview = computed(() => ({raised: totals.value.projectRaised + (Number(form.value?.baseRaised) || 0), people: totals.value.projectPeopleHelped + (Number(form.value?.basePeopleHelped) || 0)}))
const toForm = stats => ({baseRaised: stats.baseRaised, basePeopleHelped: stats.basePeopleHelped})
async function load() {
  loading.value = true
  await refreshCharity()
  loading.value = false
  if (charityError.value) { message.error(errorText(charityError.value)); return }
  form.value = toForm(charityState.value.stats)
  original.value = JSON.stringify(form.value)
}
onMounted(load)
async function save() {
  if (charityBusy.value || !form.value) return
  try {
    await charityCommand('saveStats', {stats: {...form.value}, expectedVersion: charityState.value.stats.version})
    form.value = toForm(charityState.value.stats)
    original.value = JSON.stringify(form.value)
    message.success('频道统计已保存')
  } catch (e) { message.error(errorText(e)) }
}
let resolveLeave = null, allowLeave = false
onBeforeRouteLeave(() => { if (charityBusy.value || loading.value) return false; if (!dirty.value) return true; if (resolveLeave) return false; leaveOpen.value = true; return new Promise(resolve => { resolveLeave = resolve }) })
function closeLeave(allow) { allowLeave = allow; leaveOpen.value = false }
function finishLeave() { const resolve = resolveLeave; resolveLeave = null; resolve?.(allowLeave) }
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); resolveLeave?.(false) })
</script>

<template>
 <PageShell title="频道统计">
  <Spin v-if="loading"/>
  <Card v-else-if="!form" :bordered="false"><Empty description="频道统计加载失败"><Button @click="load">重试</Button></Empty></Card>
  <Form v-else name="charity-stats" layout="vertical" :model="form" :disabled="charityBusy" class="charity-stats" @finish="save">
   <Card title="前台展示" :bordered="false"><Row :gutter="24">
    <Col :xs="24" :lg="12"><Statistic title="总募集（USDT）" :value="amount(preview.raised)"/><TypographyText type="secondary">项目已募合计 {{ amount(totals.projectRaised) }} + 历史募集基数</TypographyText></Col>
    <Col :xs="24" :lg="12"><Statistic title="受助人数" :value="whole(preview.people)"/><TypographyText type="secondary">项目受助人数合计 {{ whole(totals.projectPeopleHelped) }} + 历史受助人数基数</TypographyText></Col>
   </Row></Card>
   <Card title="历史基数" :bordered="false"><Row :gutter="24" class="charity-stats-fields">
    <Col :xs="24" :lg="12"><FormItem name="baseRaised" label="历史募集基数" required help="未在项目列表中维护的往期募集金额；项目合计包含已下架项目"><InputNumber v-model:value="form.baseRaised" :min="0" :precision="2" addon-after="USDT"/></FormItem></Col>
    <Col :xs="24" :lg="12"><FormItem name="basePeopleHelped" label="历史受助人数基数" required><InputNumber v-model:value="form.basePeopleHelped" :min="0" :precision="0" addon-after="人"/></FormItem></Col>
   </Row></Card>
   <Card class="charity-stats-actions" :bordered="false" :body-style="{padding: '12px 24px'}"><div class="charity-stats-row"><TypographyText type="secondary">v{{ charityState.stats.version }} · 最近更新 {{ dateTime(charityState.stats.updatedAt) }}</TypographyText><Space :size="8"><Button :disabled="charityBusy || !dirty" @click="form = JSON.parse(original)">重置</Button><Button type="primary" html-type="submit" :loading="charityBusy">保存设置</Button></Space></div></Card>
  </Form>
  <AdminModal :width="520" :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave">当前频道统计尚未保存，离开后将丢失修改。</AdminModal>
 </PageShell>
</template>

<style scoped>
.charity-stats{display:grid;gap:24px}
.charity-stats-fields{max-width:1100px}
.charity-stats :deep(.ant-input-number-group-wrapper){width:100%}
.charity-stats-actions{position:sticky;bottom:0;z-index:10}
.charity-stats-row{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
</style>
