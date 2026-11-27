<script setup>
// Shared modal Dialog frame for the admin (dialog migration, 2026-11-27); the Drawer counterpart is AdminDrawer.vue.
// Ant Design Vue's Modal draws the mask, centring and motion (the console's admin-trading-dialog fade + 0.96 scale,
// 200ms in / 150ms out, ≤50ms with reduced motion); useDialogLifecycle keeps the project rules Ant does not cover: one
// shared layer stack (lower layers inert, Escape and Tab only in the top layer), initial focus, focus return after the
// close animation, close paths blocked while busy. Mask clicks and Ant's own Escape never close it.
// Ant puts role="dialog" on its full-screen wrap without aria-modal and labels it with the whole title area (close
// button included), so the wrap gets aria-modal, the heading as its label, busy state and the test id here.
// afterClose is a function prop on Ant's Modal, not an event (an @after-close listener is never called).
// Ant has no "opened" event: an appear transition inside modalRender reports when the panel content is in place.
// Ant is driven by the lifecycle's `rendered` flag, not by `open` directly: a reopen during the close animation
// lets the close finish first and then opens again with the new content (queued reopen), as the hand-built frames did.
import { computed, nextTick, ref, useId, watchEffect } from 'vue'
import { Button, Modal } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: [Number, String], default: 512 },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null },
  testid: { type: String, default: undefined },
  // Keeps an existing heading id that other markup or tests refer to.
  titleId: { type: String, default: undefined },
  // Element to focus on open instead of the title (e.g. the first field or the least destructive action).
  initialFocus: { type: Object, default: null },
  // plain: the slot brings its own body and footer layout; otherwise the frame pads and scrolls it.
  plain: { type: Boolean, default: false },
  // Optional close request handler (e.g. confirm before discarding edits); returning false keeps the dialog open.
  // Without it the frame emits `close`.
  requestClose: { type: Function, default: null },
  // An existing useDialogLifecycle() result owned by the caller (e.g. useMfaVerification); the frame then drives that
  // lifecycle and hands it the dialog element instead of creating its own.
  lifecycle: { type: Object, default: null },
  // Tooltip on the disabled close button while busy (e.g. 验证进行中，暂时无法关闭).
  busyCloseHint: { type: String, default: '' }
})
const emit = defineEmits(['close', 'closed'])
const generatedId = useId()
const titleId = computed(() => props.titleId || generatedId)
const titleRef = ref(null)
const panelRef = ref(null)
const dialogRef = computed(() => panelRef.value?.closest?.('.ant-modal-wrap') || null)
const lifecycle = props.lifecycle || useDialogLifecycle({
  open: computed(() => props.open),
  dialogRef,
  initialFocusRef: computed(() => props.initialFocus || titleRef.value),
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => (props.requestClose ? props.requestClose() : emit('close')),
  closeDisabled: computed(() => props.busy)
})
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = lifecycle
// A caller-owned lifecycle learns its dialog element from the frame.
watchEffect(() => { if (props.lifecycle?.dialogRef) props.lifecycle.dialogRef.value = dialogRef.value })
const close = createDialogCloseAction(requestDialogClose)
async function afterEnter() {
  await onAfterEnter()
  if (!dialogRef.value?.contains?.(document.activeElement)) (props.initialFocus || titleRef.value)?.focus?.()
}
async function afterClose() {
  // Ant calls afterClose while it is still tearing the panel down; let that finish before the caller clears its data,
  // or components inside (tables, pagination) re-render against removed DOM.
  await nextTick()
  if (await onAfterLeave()) emit('closed')
}
watchEffect(() => {
  const el = dialogRef.value
  if (!el?.setAttribute) return
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-labelledby', titleId.value)
  if (props.busy) el.setAttribute('aria-busy', 'true')
  else el.removeAttribute('aria-busy')
  if (props.testid) el.setAttribute('data-testid', props.testid)
})
defineExpose({ phase, close, dialogEl: dialogRef, titleEl: titleRef })
</script>

<template>
  <Modal
    :open="rendered"
    centered
    :width="width"
    :closable="false"
    :mask-closable="false"
    :keyboard="false"
    :focus-trigger-after-close="false"
    :z-index="layerStyle.zIndex"
    destroy-on-close
    :footer="null"
    transition-name="admin-trading-dialog"
    mask-transition-name="admin-trading-mask"
    :wrap-class-name="`admin-dialog admin-dialog-${phase}${plain ? ' admin-dialog-plain-frame' : ''}`"
    :after-close="afterClose"
  >
    <template #modalRender="{ originVNode }">
      <Transition appear @after-enter="afterEnter"><div ref="panelRef" class="admin-dialog-panel"><component :is="originVNode" /></div></Transition>
    </template>
    <template #title>
      <div class="admin-dialog-header">
        <div class="admin-dialog-heading">
          <p v-if="$slots.eyebrow" class="admin-dialog-eyebrow"><slot name="eyebrow" /></p>
          <h2 :id="titleId" ref="titleRef" tabindex="-1" class="admin-dialog-title">{{ title }}</h2>
          <div v-if="$slots.subtitle" class="admin-dialog-subtitle"><slot name="subtitle" /></div>
        </div>
        <Button type="text" class="admin-dialog-close" aria-label="关闭" :disabled="busy" :aria-disabled="busy || undefined" :title="busy && busyCloseHint ? busyCloseHint : undefined" @click="close"><CloseOutlined /></Button>
      </div>
    </template>
    <div :class="plain ? 'admin-dialog-plain' : 'admin-dialog-body'"><slot /></div>
  </Modal>
</template>

<style>
.admin-dialog { overflow: hidden; }
.admin-dialog .ant-modal { top: 0; padding-bottom: 0; max-width: calc(100vw - 24px); margin-block: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-bottom)); }
/* Fixed frame: header and the slot's footer stay put, only the slot's body scrolls. */
.admin-dialog .ant-modal-content { display: flex; flex-direction: column; max-height: calc(100vh - 24px); max-height: calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); overflow: hidden; padding: 0; }
.admin-dialog .ant-modal-header { flex: none; margin: 0; padding: 12px 12px 12px 20px; border-bottom: 1px solid rgb(5 5 5 / 6%); }
.admin-dialog .ant-modal-body { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.admin-dialog-panel { display: contents; }
.admin-dialog-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.admin-dialog-heading { min-width: 0; flex: 1; }
.admin-dialog-eyebrow { margin: 0 0 2px; font-size: 12px; line-height: 18px; font-weight: 600; color: #1677ff; }
.admin-dialog-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.admin-dialog-title:focus { outline: none; }
.admin-dialog-subtitle { margin-top: 2px; font-size: 14px; font-weight: 400; color: rgb(0 0 0 / 45%); overflow-wrap: anywhere; }
.admin-dialog-close.ant-btn { flex: none; min-width: 44px; min-height: 44px; }
.admin-dialog-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 20px; }
.admin-dialog-plain { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
</style>
