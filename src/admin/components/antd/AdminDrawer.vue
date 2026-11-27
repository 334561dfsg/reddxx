<script setup>
// Shared modal Drawer frame for the admin (dialog migration pilot, 2026-11-27). Ant Design Vue's Drawer draws the
// frame, mask, placement and motion; useDialogLifecycle keeps the project rules Ant does not cover: one shared layer
// stack (lower layers inert, Escape and Tab only in the top layer), initial focus on the title, focus return after
// the close animation, close paths blocked while busy. Backdrop, Escape-by-Ant and drag never close it. Content is
// destroyed after the close animation, as the hand-built frames did, so callers may clear their data on `closed`.
// Ant's Drawer renders no dialog role and passes only class/style to its content element, so the dialog semantics
// (role, aria-modal, title label, busy state, test id) are set on that element once it exists.
// Ant is driven by the lifecycle's `rendered` flag, not by `open` directly: a reopen during the close animation
// lets the close finish first and then opens again with the new content (queued reopen), as the hand-built frames did.
import { computed, nextTick, ref, useId, watchEffect } from 'vue'
import { Button, Drawer } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' },
  width: { type: [Number, String], default: 576 },
  // right (default) or top; a top drawer uses height instead of width.
  placement: { type: String, default: 'right' },
  height: { type: [Number, String], default: '92vh' },
  busy: { type: Boolean, default: false },
  returnFocus: { type: [Object, Function], default: null },
  testid: { type: String, default: undefined },
  bodyTestid: { type: String, default: undefined },
  // Keeps an existing heading id that other markup or tests refer to (aria-labelledby on inner regions).
  titleId: { type: String, default: undefined },
  // plain: the slot brings its own body layout (padding, scroll regions, fixed footers); the frame only provides a
  // full-height flex column. Otherwise the frame pads the slot and scrolls it.
  plain: { type: Boolean, default: false },
  // Element to focus on open instead of the title (e.g. an error summary).
  initialFocus: { type: Object, default: null },
  // Optional close request handler; returning false keeps the drawer open. Without it the frame emits `close`.
  requestClose: { type: Function, default: null }
})
const emit = defineEmits(['close', 'closed'])
const generatedId = useId()
const titleId = computed(() => props.titleId || generatedId)
const titleRef = ref(null)
const dialogRef = computed(() => titleRef.value?.closest?.('.ant-drawer-content') || null)
const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.open),
  dialogRef,
  initialFocusRef: computed(() => props.initialFocus || titleRef.value),
  returnFocusRef: computed(() => props.returnFocus),
  requestClose: () => (props.requestClose ? props.requestClose() : emit('close')),
  closeDisabled: computed(() => props.busy)
})
const close = createDialogCloseAction(requestDialogClose)
async function afterOpenChange(open) {
  if (open) {
    await onAfterEnter()
    // Ant renders the content only once it opens, after the lifecycle's first focus attempt: focus the title now
    // unless focus already moved inside (e.g. the user started typing).
    if (!dialogRef.value?.contains?.(document.activeElement)) (props.initialFocus || titleRef.value)?.focus?.()
  } else {
    // Let Ant finish removing the panel before the caller clears its data (see AdminDialog).
    await nextTick()
    if (await onAfterLeave()) emit('closed')
  }
}
watchEffect(() => {
  const el = dialogRef.value
  if (!el?.setAttribute) return
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'true')
  el.setAttribute('aria-labelledby', titleId.value)
  if (props.busy) el.setAttribute('aria-busy', 'true')
  else el.removeAttribute('aria-busy')
  if (props.testid) el.setAttribute('data-testid', props.testid)
})
defineExpose({ phase, close, dialogEl: dialogRef })
</script>

<template>
  <Drawer
    :open="rendered"
    :placement="placement"
    :width="placement === 'top' ? undefined : width"
    :height="placement === 'top' ? height : undefined"
    :closable="false"
    :mask-closable="false"
    :keyboard="false"
    :autofocus="false"
    destroy-on-close
    :z-index="layerStyle.zIndex"
    :root-class-name="`admin-drawer admin-drawer-${phase}`"
    :body-style="{ padding: 0, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }"
    @after-open-change="afterOpenChange"
    @close="close"
  >
    <template #title>
      <p v-if="$slots.eyebrow" class="admin-drawer-eyebrow"><slot name="eyebrow" /></p>
      <div class="admin-drawer-header">
        <div class="admin-drawer-heading">
          <h2 :id="titleId" ref="titleRef" tabindex="-1" class="admin-drawer-title">{{ title }}</h2>
          <div v-if="$slots.subtitle" class="admin-drawer-subtitle"><slot name="subtitle" /></div>
        </div>
        <slot name="actions" />
        <Button type="text" class="admin-drawer-close" aria-label="关闭" :disabled="busy" @click="close"><CloseOutlined /></Button>
      </div>
      <div v-if="$slots.toolbar" class="admin-drawer-toolbar"><slot name="toolbar" /></div>
    </template>
    <div :data-testid="bodyTestid" :class="plain ? 'admin-drawer-plain' : 'admin-drawer-body'"><slot /></div>
    <template v-if="$slots.footer" #footer><div class="admin-drawer-footer"><slot name="footer" /></div></template>
  </Drawer>
</template>

<style>
.admin-drawer .ant-drawer-content-wrapper { max-width: 100vw; }
.admin-drawer .ant-drawer-content { overflow: hidden; padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
.admin-drawer .ant-drawer-header { padding: 12px 16px 12px 20px; }
.admin-drawer .ant-drawer-title { min-width: 0; }
.admin-drawer-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.admin-drawer-eyebrow { margin: 0 0 2px; font-size: 12px; line-height: 18px; font-weight: 600; color: #1677ff; }
.admin-drawer .ant-drawer-content-wrapper { max-height: 100vh; }
.admin-drawer-heading { min-width: 0; flex: 1; }
.admin-drawer-title { margin: 0; font-size: 16px; line-height: 24px; font-weight: 600; overflow-wrap: anywhere; }
.admin-drawer-title:focus { outline: none; }
.admin-drawer-subtitle { margin-top: 2px; font-size: 14px; font-weight: 400; color: rgb(0 0 0 / 45%); overflow-wrap: anywhere; }
.admin-drawer-close.ant-btn { flex: none; min-width: 44px; min-height: 44px; }
.admin-drawer-toolbar { margin: 12px -16px -12px -20px; padding: 8px 20px; border-top: 1px solid rgb(5 5 5 / 6%); background: #fafafa; font-weight: 400; }
.admin-drawer-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 20px; }
.admin-drawer-plain { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
.admin-drawer-footer { display: flex; justify-content: flex-end; gap: 8px; }
/* Motion: 200ms ease-out in, 150ms ease-in out, ≤50ms with reduced motion (AGENTS.md Drawer rules). */
.admin-drawer .ant-drawer-content-wrapper, .admin-drawer .ant-drawer-mask { transition-duration: 200ms !important; transition-timing-function: ease-out !important; }
.admin-drawer-closing .ant-drawer-content-wrapper, .admin-drawer-closing .ant-drawer-mask { transition-duration: 150ms !important; transition-timing-function: ease-in !important; }
@media (prefers-reduced-motion: reduce) {
  .admin-drawer .ant-drawer-content-wrapper, .admin-drawer .ant-drawer-mask { transition-duration: 50ms !important; }
}
</style>
