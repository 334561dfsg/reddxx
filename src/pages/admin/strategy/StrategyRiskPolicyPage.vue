<script setup>
import {computed, onBeforeUnmount, onMounted, ref} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {message, Button, Card, Empty, Form, FormItem, InputNumber, Space, Spin, Switch, TypographyText} from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {strategyState, strategyError, strategyBusy, refreshStrategy, strategyCommand, errorText} from '../../../shared/strategy/client.js'

const form = ref(null), original = ref(''), loading = ref(false), leaveOpen = ref(false)
const dirty = computed(() => !!form.value && JSON.stringify(form.value) !== original.value)
async function load() {
  loading.value = true
  await refreshStrategy()
  loading.value = false
  if (strategyError.value) { message.error(errorText(strategyError.value)); return }
  form.value = JSON.parse(JSON.stringify(strategyState.value.policy))
  original.value = JSON.stringify(form.value)
}
onMounted(load)
async function save() {
  if (strategyBusy.value || !form.value) return
  try {
    await strategyCommand('savePolicy', {policy: form.value, expectedPolicy: JSON.parse(original.value)})
    original.value = JSON.stringify(form.value)
    message.success('风控设置已保存，适用于之后的新订阅')
  } catch (e) { message.error(errorText(e)) }
}
let resolveLeave = null, allowLeave = false
onBeforeRouteLeave(() => { if (strategyBusy.value || loading.value) return false; if (!dirty.value) return true; if (resolveLeave) return false; leaveOpen.value = true; return new Promise(resolve => { resolveLeave = resolve }) })
function closeLeave(allow) { allowLeave = allow; leaveOpen.value = false }
function finishLeave() { const resolve = resolveLeave; resolveLeave = null; resolve?.(allowLeave) }
function beforeUnload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
window.addEventListener('beforeunload', beforeUnload)
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); resolveLeave?.(false) })
</script>

<template>
 <PageShell title="风控设置">
  <Spin v-if="loading"/>
  <Card v-else-if="!form" :bordered="false"><Empty description="风控设置加载失败"><Button @click="load">重试</Button></Empty></Card>
  <Form v-else layout="vertical" :model="form" :disabled="strategyBusy" class="strategy-policy" @finish="save">
   <Card title="订阅审核" :bordered="false">
    <FormItem label="新订阅需要后台审核" help="开启后新订阅进入「待审核」，通过后初始化并开始运行，拒绝退回本金；关闭后新订阅直接初始化。已提交的订阅不受影响。"><Switch v-model:checked="form.reviewRequired" aria-label="新订阅需要后台审核" checked-children="开启" un-checked-children="关闭"/></FormItem>
   </Card>
   <Card title="用户限额" :bordered="false">
    <FormItem label="单用户进行中策略上限（个）" required help="待审核、初始化中、运行中和已暂停的策略都计入"><InputNumber v-model:value="form.maxRunningPerUser" :min="1" :precision="0" style="width:240px"/></FormItem>
    <FormItem label="单用户在管资金上限（USDT）" required><InputNumber v-model:value="form.maxCapitalPerUser" :min="1" :precision="2" style="width:240px"/></FormItem>
   </Card>
   <Card :bordered="false" :body-style="{padding: '12px 24px'}"><Space :size="8"><Button type="primary" html-type="submit" :loading="strategyBusy">保存设置</Button><Button :disabled="strategyBusy || !dirty" @click="form = JSON.parse(original)">重置</Button><TypographyText type="secondary">设置只对之后提交的订阅生效，已有订阅保留提交时的规则。</TypographyText></Space></Card>
  </Form>
  <AdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave">当前风控设置尚未保存，离开后将丢失修改。</AdminModal>
 </PageShell>
</template>

<style scoped>.strategy-policy{display:grid;gap:24px}</style>
