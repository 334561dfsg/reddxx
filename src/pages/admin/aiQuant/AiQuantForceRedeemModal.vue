<script setup>
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { Alert, Button, Descriptions, DescriptionsItem, Modal } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'
import { redeemAiQuantAdminOrder } from '../../../admin/state/aiQuantOrders'

const props = defineProps({ open: Boolean, order: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved', 'closed'])
const dialogRef = ref(null)
const cancelRef = ref(null)
const error = ref('')
const submitting = ref(false)
const snapshot = ref(null)
const { phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.open), dialogRef, initialFocusRef: cancelRef,
  requestClose: () => emit('close'), closeDisabled: submitting
})
// Ant Modal owns the portal and animation. The shared lifecycle owns isolation,
// Escape and focus return; the mount guard prevents actions during its entrance.
let enterTimer
watch(dialogRef, (element) => {
  clearTimeout(enterTimer)
  if (element && props.open) enterTimer = setTimeout(onAfterEnter, 200)
})
onBeforeUnmount(() => clearTimeout(enterTimer))
watch(() => props.open, (open) => {
  if (!open) return
  snapshot.value = { ...props.order }
  error.value = ''
  submitting.value = false
}, { immediate: true })
const close = () => requestDialogClose()
async function afterClose() {
  if (await onAfterLeave()) emit('closed')
}
async function submit() {
  if (submitting.value || phase.value !== 'open') return
  submitting.value = true
  error.value = ''
  try {
    await nextTick()
    const updated = redeemAiQuantAdminOrder(snapshot.value.id)
    emit('saved', updated)
    submitting.value = false
    close()
  } catch (cause) {
    error.value = cause.message || '赎回失败，请重试。'
    submitting.value = false
  }
}
</script>

<template>
  <Modal centered :wrap-props="{ 'aria-modal': true }" :open="open" :width="560" :mask-closable="false" :closable="false"
    :keyboard="false" :focus-trigger-after-close="false" :z-index="layerStyle.zIndex"
    :destroy-on-close="true" wrap-class-name="ai-quant-redeem-modal" transition-name="ai-quant-redeem" mask-transition-name="ai-quant-redeem-mask"
    :after-close="afterClose" @cancel="close">
    <template #modalRender="{ originVNode }">
      <div ref="dialogRef" :aria-busy="submitting"><component :is="originVNode" /></div>
    </template>
    <template #title>
      <div class="redeem-title"><span>强制赎回订单</span><Button aria-label="关闭" type="text" :disabled="submitting" @click="close"><CloseOutlined /></Button></div>
    </template>
    <div class="redeem-content">
      <Alert type="warning" show-icon message="确认终止当前订单" description="此操作仅作用于所选订单，完成后不可重复赎回。当前为演示数据，不执行真实资金划转；本金、收益及手续费结算以后端接入规则为准。" />
      <Descriptions v-if="snapshot" bordered size="small" :column="1">
        <DescriptionsItem label="订单号">{{ snapshot.id }}</DescriptionsItem>
        <DescriptionsItem label="用户">{{ snapshot.userName }}（{{ snapshot.userId }}）</DescriptionsItem>
        <DescriptionsItem label="产品">{{ snapshot.productName }}</DescriptionsItem>
        <DescriptionsItem label="订单本金">{{ snapshot.principal }} {{ snapshot.currency }}</DescriptionsItem>
        <DescriptionsItem label="累计收益">{{ snapshot.accumulatedYield }} {{ snapshot.currency }}</DescriptionsItem>
      </Descriptions>
      <FeedbackToast v-if="error" type="error" :source="() => (error) ? ((error)) : ''"></FeedbackToast>

    </div>
    <template #footer>
      <div class="redeem-footer">
        <Button ref="cancelRef" :disabled="submitting" @click="close">取消</Button>
        <Button type="primary" danger :loading="submitting" :disabled="phase !== 'open'" @click="submit">确认强制赎回</Button>
      </div>
    </template>
  </Modal>
</template>

<style>
.ai-quant-redeem-modal { overflow: hidden; }
.ai-quant-redeem-modal .ant-modal { top: 0; padding-bottom: 0; margin-block: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-bottom)); max-width: calc(100% - 24px - env(safe-area-inset-left) - env(safe-area-inset-right)); }
.ai-quant-redeem-modal .ant-modal-content { display: flex; flex-direction: column; overflow: hidden; max-height: calc(100vh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); }
.ai-quant-redeem-modal .ant-modal-body { min-height: 0; overflow-y: auto; }
.ai-quant-redeem-modal .ant-modal-header, .ai-quant-redeem-modal .ant-modal-footer { flex-shrink: 0; }
.ai-quant-redeem-modal .ant-descriptions-item-content { overflow-wrap: anywhere; }
.redeem-title { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.redeem-title .ant-btn { min-width: 44px; min-height: 44px; }
.redeem-content { display: grid; gap: 16px; }
.redeem-footer { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.ai-quant-redeem-enter-active { animation: ai-quant-redeem-in 200ms ease-out both; }
.ai-quant-redeem-leave-active { animation: ai-quant-redeem-in 150ms ease-in reverse both; }
.ai-quant-redeem-mask-enter-active { animation: ai-quant-redeem-fade 200ms ease-out both; }
.ai-quant-redeem-mask-leave-active { animation: ai-quant-redeem-fade 150ms ease-in reverse both; }
@keyframes ai-quant-redeem-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
@keyframes ai-quant-redeem-fade { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .ai-quant-redeem-enter-active, .ai-quant-redeem-leave-active { animation-name: ai-quant-redeem-fade; animation-duration: 50ms; }
  .ai-quant-redeem-mask-enter-active, .ai-quant-redeem-mask-leave-active { animation-duration: 50ms; }
}
</style>
