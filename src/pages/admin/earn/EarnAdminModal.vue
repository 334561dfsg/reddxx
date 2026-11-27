<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Alert, Button, Modal, Space } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { useDialogLifecycle } from '../../../admin/composables/useDialogLifecycle.js'
const props = defineProps({ open: Boolean, title: String, width: {type:Number,default:760}, dirty: Boolean, busy: Boolean, confirmText: String, danger: Boolean })
const emit = defineEmits(['close','confirm','closed'])
const dialogRef = ref(null), cancelRef = ref(null), discard = ref(false)
let allowDiscard = false, timer
const { phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.open), dialogRef, initialFocusRef: cancelRef,
  closeDisabled: computed(() => props.busy), requestClose: () => {
    if (props.dirty && !allowDiscard) { discard.value = true; return false }
    emit('close'); return true
  },
})
watch(() => props.open, open => { if (open) { discard.value = false; allowDiscard = false } })
watch(dialogRef, element => { clearTimeout(timer); if (element && props.open) timer = setTimeout(onAfterEnter, 200) })
onBeforeUnmount(() => clearTimeout(timer))
function close() { requestDialogClose() }
function discardAndClose() { allowDiscard = true; close() }
async function afterClose() { if (await onAfterLeave()) emit('closed') }
</script>
<template>
 <Modal :open="open" centered :width="width" :closable="false" :mask-closable="false" :keyboard="false" :focus-trigger-after-close="false" :z-index="layerStyle.zIndex" :destroy-on-close="true" :wrap-props="{'aria-modal':true}" wrap-class-name="earn-admin-modal" transition-name="earn-admin-motion" mask-transition-name="earn-admin-mask" :after-close="afterClose" @cancel="close">
  <template #modalRender="{originVNode}"><div ref="dialogRef" :aria-busy="busy"><component :is="originVNode"/></div></template>
  <template #title><div class="earn-modal-title"><span>{{ title }}</span><Button type="text" aria-label="关闭" :disabled="busy" @click="close"><CloseOutlined/></Button></div></template>
  <div class="earn-modal-body"><Alert v-if="discard" type="warning" show-icon message="有未保存的内容，确定放弃吗？"/><slot/></div>
  <template #footer><div class="earn-modal-footer"><Space :size="8"><template v-if="discard"><Button @click="discard=false">继续编辑</Button><Button danger @click="discardAndClose">放弃修改并关闭</Button></template><template v-else><slot name="actions"/><Button ref="cancelRef" :disabled="busy" @click="close">{{ confirmText?'取消':'关闭' }}</Button><Button v-if="confirmText" type="primary" :danger="danger" :loading="busy" :disabled="phase!=='open'" @click="emit('confirm')">{{ confirmText }}</Button></template></Space></div></template>
 </Modal>
</template>
<style>
.earn-admin-modal{overflow:hidden}.earn-admin-modal .ant-modal{top:0;padding-bottom:0;margin-block:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-bottom));max-width:calc(100% - 24px - env(safe-area-inset-left) - env(safe-area-inset-right))}.earn-admin-modal .ant-modal-content{display:flex;flex-direction:column;overflow:hidden;max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom))}.earn-admin-modal .ant-modal-body{min-height:0;overflow-y:auto}.earn-admin-modal .ant-modal-header,.earn-admin-modal .ant-modal-footer{flex-shrink:0}.earn-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}.earn-modal-body{display:grid;gap:16px}.earn-modal-footer{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.earn-admin-motion-enter-active{animation:earn-admin-in 200ms ease-out both}.earn-admin-motion-leave-active{animation:earn-admin-in 150ms ease-in reverse both}.earn-admin-mask-enter-active{animation:earn-admin-fade 200ms ease-out both}.earn-admin-mask-leave-active{animation:earn-admin-fade 150ms ease-in reverse both}@keyframes earn-admin-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}@keyframes earn-admin-fade{from{opacity:0}to{opacity:1}}@media(prefers-reduced-motion:reduce){.earn-admin-motion-enter-active,.earn-admin-motion-leave-active{animation-name:earn-admin-fade;animation-duration:50ms}.earn-admin-mask-enter-active,.earn-admin-mask-leave-active{animation-duration:50ms}}
@media(pointer:coarse){.earn-admin-modal .ant-btn{min-height:44px;min-width:44px}}
/* Ant Design Pro metrics: 16px/24px title row with a hairline divider, 24px body, a divided 10px/24px footer bar. */
.earn-admin-modal .ant-modal-content{padding:0}
.earn-admin-modal .ant-modal-header{margin:0;padding:12px 16px 12px 24px;border-bottom:1px solid rgb(5 5 5 / 6%)}
.earn-admin-modal .ant-modal-body{padding:24px}
.earn-admin-modal .ant-modal-footer{margin:0;padding:10px 24px;border-top:1px solid rgb(5 5 5 / 6%)}
.earn-modal-title{font-size:16px;line-height:24px;font-weight:600}
.earn-modal-footer{align-items:center}
/* Bordered detail tables in one dialog share the same grid: fixed layout and one label width, so sections line up. */
.earn-admin-modal .ant-descriptions-bordered .ant-descriptions-view > table{table-layout:fixed}
.earn-admin-modal .ant-descriptions-bordered .ant-descriptions-item-label{width:20%}
.earn-admin-modal .ant-descriptions-bordered .ant-descriptions-item-content{overflow-wrap:anywhere}
</style>
