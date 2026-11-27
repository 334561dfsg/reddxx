<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { Button, Descriptions, DescriptionsItem, Drawer, List, ListItem, Table, Tag } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'
import { earnAdmin } from '../../../admin/state/earn.js'
import { dateText, getEarnHoldingRewards, money, statusMeta } from '../../../admin/domain/earn.js'

const props=defineProps({open:Boolean,holding:Object,returnFocus:Object})
const emit=defineEmits(['close','closed'])
const titleRef=ref(null)
const dialogRef=computed(()=>titleRef.value?.closest('.ant-drawer-content'))
const {phase,layerStyle,requestDialogClose,onAfterEnter,onAfterLeave}=useDialogLifecycle({
 open:computed(()=>props.open),dialogRef,initialFocusRef:titleRef,
 returnFocusRef:computed(()=>props.returnFocus),requestClose:()=>emit('close'),
})
async function afterOpenChange(open){if(open)await onAfterEnter();else if(await onAfterLeave())emit('closed')}
const rows=computed(()=>getEarnHoldingRewards(earnAdmin,props.holding?.id))
const media=window.matchMedia('(min-width:600px)'),wide=ref(media.matches)
const sync=e=>{wide.value=e.matches};media.addEventListener('change',sync)
onBeforeUnmount(()=>media.removeEventListener('change',sync))
const columns=[{title:'收益流水号',key:'id',dataIndex:'id'},{title:'收益金额',key:'amount',align:'right'},{title:'状态',key:'status'},{title:'计息时间',key:'rewardAt'},{title:'发放时间',key:'paidAt'}]
</script>
<template>
 <Drawer :open="open" placement="right" width="760" :root-class-name="'earn-holding-rewards earn-rewards-'+phase" :closable="false" :mask-closable="false" :keyboard="false" :autofocus="false" :z-index="layerStyle.zIndex" :body-style="{overflowY:'auto',minHeight:0}" @after-open-change="afterOpenChange" @close="requestDialogClose">
  <template #title><div class="earn-rewards-title"><span ref="titleRef" tabindex="-1">持仓收益</span><Button type="text" aria-label="关闭" @click="requestDialogClose"><CloseOutlined/></Button></div></template>
  <Descriptions v-if="holding" size="small" :column="1">
   <DescriptionsItem label="持仓编号">{{ holding.id }}</DescriptionsItem>
   <DescriptionsItem label="产品名称">{{ holding.productName }}</DescriptionsItem>
   <DescriptionsItem label="用户 UID">{{ holding.userId }}</DescriptionsItem>
  </Descriptions>
  <Table v-if="wide" :columns="columns" :data-source="rows" row-key="id" size="middle" :pagination="false" :locale="{emptyText:'该持仓暂无收益记录'}">
   <template #bodyCell="{column,record}">
    <template v-if="column.key==='amount'">{{ money(record.amount) }} {{ record.symbol }}</template>
    <Tag v-else-if="column.key==='status'" :color="statusMeta[record.status]?.[1]">{{ statusMeta[record.status]?.[0] }}</Tag>
    <template v-else-if="column.key==='rewardAt'||column.key==='paidAt'">{{ dateText(record[column.key]) }}</template>
   </template>
  </Table>
  <List v-else :data-source="rows" :locale="{emptyText:'该持仓暂无收益记录'}">
   <template #renderItem="{item}"><ListItem><Descriptions :column="1" size="small"><DescriptionsItem label="收益流水号">{{ item.id }}</DescriptionsItem><DescriptionsItem label="收益金额">{{ money(item.amount) }} {{ item.symbol }}</DescriptionsItem><DescriptionsItem label="状态"><Tag :color="statusMeta[item.status]?.[1]">{{ statusMeta[item.status]?.[0] }}</Tag></DescriptionsItem><DescriptionsItem label="计息时间">{{ dateText(item.rewardAt) }}</DescriptionsItem><DescriptionsItem label="发放时间">{{ dateText(item.paidAt) }}</DescriptionsItem></Descriptions></ListItem></template>
  </List>
  <template #footer><div class="earn-rewards-footer"><Button @click="requestDialogClose">关闭</Button></div></template>
 </Drawer>
</template>
<style>
.earn-holding-rewards .ant-drawer-content-wrapper{max-width:100vw}
.earn-holding-rewards .ant-drawer-content{overflow:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left);padding-right:env(safe-area-inset-right)}
.earn-rewards-title{display:flex;align-items:center;justify-content:space-between;gap:16px}
.earn-rewards-footer{display:flex;justify-content:flex-end}
.earn-holding-rewards .ant-table-cell,.earn-holding-rewards .ant-descriptions-item-content{overflow-wrap:anywhere}
.earn-holding-rewards .ant-drawer-content-wrapper,.earn-holding-rewards .ant-drawer-mask{transition-duration:200ms!important;transition-timing-function:ease-out!important}
.earn-rewards-closing .ant-drawer-content-wrapper,.earn-rewards-closing .ant-drawer-mask{transition-duration:150ms!important;transition-timing-function:ease-in!important}
@media(prefers-reduced-motion:reduce){.earn-holding-rewards .ant-drawer-content-wrapper,.earn-holding-rewards .ant-drawer-mask{transition-duration:50ms!important}}
</style>
