<script setup>
// Daily P&L or operation log of one strategy subscription, each opened by its own button in the 用户策略 list
// (2026-11-27): the review and detail dialog keeps only the order and its frozen terms. Follows EarnHoldingRewardsDrawer: shared layer lifecycle, no
// backdrop/Escape close, fixed header close button, body-only scrolling.
import {computed, ref, watch} from 'vue'
import {Button, Descriptions, DescriptionsItem, Drawer, Table, TypographyText} from 'ant-design-vue'
import {CloseOutlined} from '@ant-design/icons-vue'
import {useDialogLifecycle} from '../../../admin/composables/useDialogLifecycle.js'
import {actionLabels} from '../../../shared/strategy/client.js'
import {amount, signed, dateTime, percent} from './strategyFormat.js'

const props = defineProps({open: Boolean, kind: {type: String, default: 'daily'}, sub: Object, daily: {type: Array, default: () => []}, logs: {type: Array, default: () => []}, returnFocus: Object})
const emit = defineEmits(['close', 'closed'])
const titleRef = ref(null)
const dialogRef = computed(() => titleRef.value?.closest('.ant-drawer-content'))
const {phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave} = useDialogLifecycle({
  open: computed(() => props.open), dialogRef, initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus), requestClose: () => emit('close'),
})
// Ant Drawer renders no dialog role on its panel; expose modal semantics named by the visible title.
function markDialog() { const el = dialogRef.value; if (!el) return; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'strategy-records-title') }
async function afterOpenChange(open) { if (open) { markDialog(); await onAfterEnter() } else if (await onAfterLeave()) emit('closed') }
const page = ref(1)
watch(() => [props.sub?.subscriptionId, props.kind], () => { page.value = 1 })
const title = computed(() => (props.kind === 'logs' ? '操作记录' : '收益记录'))
const dailyColumns = [{key: 'date', title: '日期', width: 140}, {key: 'tradeCount', title: '成交笔数', width: 120, align: 'right'}, {key: 'pnl', title: '盈亏（USDT）', align: 'right'}]
const logColumns = [{key: 'createdAt', title: '时间', width: 180}, {key: 'action', title: '操作', width: 120}, {key: 'summary', title: '说明'}, {key: 'operator', title: '操作人', width: 140}]
const tone = value => (value > 0 ? 'success' : value < 0 ? 'danger' : undefined)
</script>

<template>
 <Drawer :open="open" placement="right" width="720" :root-class-name="'strategy-records-drawer strategy-records-' + phase" :closable="false" :mask-closable="false" :keyboard="false" :autofocus="false" :z-index="layerStyle.zIndex" :body-style="{overflowY: 'auto', minHeight: 0}" @after-open-change="afterOpenChange" @close="requestDialogClose">
  <template #title><div class="strategy-records-title"><span id="strategy-records-title" ref="titleRef" tabindex="-1">{{ title }}</span><Button type="text" aria-label="关闭" @click="requestDialogClose"><CloseOutlined/></Button></div></template>
  <template v-if="sub">
   <Descriptions size="small" :column="2">
    <DescriptionsItem label="订单号">{{ sub.subscriptionId }}</DescriptionsItem>
    <DescriptionsItem label="模板">{{ sub.templateSnapshot.name }}</DescriptionsItem>
    <DescriptionsItem label="用户">{{ sub.userName }}（{{ sub.userId }}）</DescriptionsItem>
    <DescriptionsItem label="本金">{{ amount(sub.capital) }} USDT</DescriptionsItem>
    <DescriptionsItem label="累计盈亏"><TypographyText :type="tone(sub.pnl)">{{ signed(sub.pnl) }} USDT（{{ percent(sub.pnl, sub.capital) }}）</TypographyText></DescriptionsItem>
    <DescriptionsItem label="累计成交">{{ sub.tradeCount }} 笔</DescriptionsItem>
   </Descriptions>
   <TypographyText type="secondary" class="strategy-records-count">共 {{ kind === 'logs' ? logs.length : daily.length }} 条</TypographyText>
     <Table v-if="kind !== 'logs'" size="middle" :columns="dailyColumns" :data-source="daily" row-key="id" :pagination="{current: page, pageSize: 10, total: daily.length, showSizeChanger: false, onChange: v => page = v, hideOnSinglePage: true}" :locale="{emptyText: '暂无收益记录'}">
      <template #bodyCell="{column, record}">
       <TypographyText v-if="column.key === 'pnl'" :type="tone(record.pnl)">{{ signed(record.pnl) }}</TypographyText>
       <template v-else>{{ record[column.key] }}</template>
      </template>
     </Table>
     <Table v-else size="middle" :columns="logColumns" :data-source="logs" row-key="id" :pagination="false" :locale="{emptyText: '暂无记录'}">
      <template #bodyCell="{column, record}">
       <template v-if="column.key === 'createdAt'">{{ dateTime(record.createdAt) }}</template>
       <template v-else-if="column.key === 'action'">{{ actionLabels[record.action] || record.action }}</template>
       <template v-else>{{ record[column.key] }}</template>
      </template>
     </Table>
  </template>
  <template #footer><div class="strategy-records-footer"><Button @click="requestDialogClose">关闭</Button></div></template>
 </Drawer>
</template>

<style>
.strategy-records-drawer .ant-drawer-content-wrapper{max-width:100vw}
.strategy-records-drawer .ant-drawer-content{overflow:hidden}
.strategy-records-title{display:flex;align-items:center;justify-content:space-between;gap:16px}
.strategy-records-title .ant-btn{min-width:44px;min-height:44px}
.strategy-records-footer{display:flex;justify-content:flex-end}
.strategy-records-count{display:block;margin:16px 0 8px}
.strategy-records-drawer .ant-table-cell,.strategy-records-drawer .ant-descriptions-item-content{overflow-wrap:anywhere}
.strategy-records-drawer .ant-drawer-content-wrapper,.strategy-records-drawer .ant-drawer-mask{transition-duration:200ms!important;transition-timing-function:ease-out!important}
.strategy-records-closing .ant-drawer-content-wrapper,.strategy-records-closing .ant-drawer-mask{transition-duration:150ms!important;transition-timing-function:ease-in!important}
@media(prefers-reduced-motion:reduce){.strategy-records-drawer .ant-drawer-content-wrapper,.strategy-records-drawer .ant-drawer-mask{transition-duration:50ms!important}}
</style>
