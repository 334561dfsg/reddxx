<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import {computed,onMounted,onBeforeUnmount,ref} from 'vue'
import {onBeforeRouteLeave} from 'vue-router'
import {message,Alert,Button,Card,Form,FormItem,InputNumber,Space,Spin,Switch} from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {lendingState,lendingError,lendingBusy,refreshLending,lendingCommand,errorLabels} from '../../../shared/lending/client.js'
const form=ref(null),original=ref(''),error=ref(''),loading=ref(false),leaveOpen=ref(false)
const dirty=computed(()=>form.value&&JSON.stringify(form.value)!==original.value)
async function load(){loading.value=true;await refreshLending();loading.value=false;if(lendingError.value){error.value=errorLabels[lendingError.value];return}form.value=JSON.parse(JSON.stringify(lendingState.value.riskPolicy));original.value=JSON.stringify(form.value)}
onMounted(load)
async function save(){if(lendingBusy.value)return;error.value='';try{await lendingCommand('saveRiskPolicy',{policy:form.value,expectedPolicy:JSON.parse(original.value)});original.value=JSON.stringify(form.value);message.success('风控设置已保存')}catch(e){error.value=errorLabels[e.message]||e.message}}
let resolveLeave=null,allowLeave=false
onBeforeRouteLeave(()=>{if(lendingBusy.value||loading.value)return false;if(!dirty.value)return true;if(resolveLeave)return false;leaveOpen.value=true;return new Promise(resolve=>resolveLeave=resolve)})
function closeLeave(allow){allowLeave=allow;leaveOpen.value=false}
function finishLeave(){const resolve=resolveLeave;resolveLeave=null;resolve?.(allowLeave)}
function beforeUnload(e){if(dirty.value){e.preventDefault();e.returnValue=''}}
window.addEventListener('beforeunload',beforeUnload)
onBeforeUnmount(()=>{window.removeEventListener('beforeunload',beforeUnload);resolveLeave?.(false)})
</script>
<template>
 <PageShell title="风控设置">
  <FeedbackToast v-if="error" type="error" :source="() => (error) ? ((error)) : ''"><Button v-if="!form" @click="load">重试</Button></FeedbackToast>
  <Spin v-if="loading"/>
  <Card v-if="form" title="质押风险规则" :bordered="false">
   <Form layout="vertical" :model="form" :disabled="lendingBusy" style="max-width:640px" @finish="save">
    <FormItem label="预警质押率（%）" required help="待还本息 ÷ 质押资产当前价值 × 100%，达到后显示风险预警。"><InputNumber v-model:value="form.collateralWarningThreshold" aria-label="预警质押率（%）" :min="0" :max="100" style="width:100%"/></FormItem>
    <FormItem label="处置质押率（%）" required help="必须高于预警质押率，达到后才允许人工处置，不自动扣除质押。"><InputNumber v-model:value="form.collateralDisposalThreshold" aria-label="处置质押率（%）" :min="0" :max="100" style="width:100%"/></FormItem>
    <FormItem label="允许人工处置质押" help="以上设置适用于所有产品的新申请，已有订单保留申请时的规则。"><Switch v-model:checked="form.overdueDeductEnabled" aria-label="允许人工处置质押"/></FormItem>
    <Space :size="8"><Button type="primary" html-type="submit" :loading="lendingBusy">保存设置</Button><Button :disabled="lendingBusy" @click="form=JSON.parse(original);error=''">重置</Button></Space>
   </Form>
  </Card>
  <AdminModal :open="leaveOpen" title="放弃未保存的修改？" confirm-text="放弃修改并离开" danger @close="closeLeave(false)" @confirm="closeLeave(true)" @closed="finishLeave">当前风控设置尚未保存，离开后将丢失修改。</AdminModal>
 </PageShell>
</template>
