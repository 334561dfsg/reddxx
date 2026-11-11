<script setup>
import { computed, h, nextTick, ref, watch } from 'vue'
import { Button, Empty, Modal, Space, Statistic, Table, Typography } from 'ant-design-vue'
import { createDialogCloseAction, useDialogLifecycle } from '../../composables/useDialogLifecycle.js'

const props = defineProps({
  visible: Boolean,
  wallet: { type: Object, default: null },
  returnFocus: { type: Object, default: null }
})
const emit = defineEmits(['close', 'closed'])
const dialogRef = ref(null)
const titleRef = ref(null)
const tableViewportRef = ref(null)
const tableScrollHeight = ref(1)
// Measure the available table region, not the viewport: the summary and modal
// chrome can wrap at zoom or narrow widths. Ant owns the sole scrolling body.
watch(tableViewportRef, async (element, previous, onCleanup) => {
  if (!element) return
  let active = true
  let observer
  onCleanup(() => { active = false; observer?.disconnect() })
  await nextTick()
  if (!active) return
  const header = element.querySelector('.ant-table-header')
  const body = element.querySelector('.ant-table-body')
  const updateHeight = () => {
    tableScrollHeight.value = Math.max(1, element.clientHeight - (header?.offsetHeight ?? 0))
  }
  body?.setAttribute('tabindex', '0')
  body?.setAttribute('role', 'region')
  body?.setAttribute('aria-label', '持有币种明细，可滚动')
  updateHeight()
  observer = new ResizeObserver(updateHeight)
  observer.observe(element)
  if (header) observer.observe(header)
}, { flush: 'post' })

const { rendered, phase, layerStyle, requestDialogClose, onAfterEnter, onAfterLeave } = useDialogLifecycle({
  open: computed(() => props.visible && Boolean(props.wallet)),
  dialogRef, initialFocusRef: titleRef,
  returnFocusRef: computed(() => props.returnFocus), requestClose: () => emit('close')
})
const close = createDialogCloseAction(requestDialogClose)
const afterLeave = async () => { if (await onAfterLeave()) emit('closed') }
const amount = (value, precision) => new Intl.NumberFormat('en-US', { maximumFractionDigits: precision }).format(value)
const columns = [
  { title: '币种', dataIndex: 'coin', key: 'coin' },
  { title: '数量', dataIndex: 'quantity', key: 'quantity', align: 'right', customRender: ({ text, record }) => amount(text, record.precision) },
  { title: '冻结', dataIndex: 'frozen', key: 'frozen', align: 'right', customRender: ({ text, record }) => amount(text, record.precision) },
  { title: '最新价（USD）', dataIndex: 'latestPrice', key: 'latestPrice', align: 'right', customRender: ({ text }) => amount(text, 8) }
]
// Keep Ant's complete modal content; the shared lifecycle owns layered focus/isolation.
const setModalElement = element => {
  dialogRef.value = element
  element?.querySelector('.ant-modal-close')?.setAttribute('aria-label', '关闭')
}
const renderModal = ({ originVNode }) => h('div', {
  ref: setModalElement,
  'data-testid': 'wallet-holdings-dialog'
}, [originVNode])
// Ant Modal exposes afterClose but no afterOpen in the installed version.
// Observe its actual entrance animation, including reduced/no-motion cases.
watch(dialogRef, async (element, previous, onCleanup) => {
  if (!element) return
  let active = true
  onCleanup(() => { active = false })
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  if (!active) return
  const modal = element.closest('.ant-modal')
  await Promise.allSettled((modal?.getAnimations() ?? []).map(animation => animation.finished))
  if (active && phase.value === 'opening') onAfterEnter()
}, { flush: 'post' })
</script>

<template>
  <Modal
    :open="rendered" :width="880" centered destroy-on-close
    :mask-closable="false" :keyboard="false" :focus-trigger-after-close="false"
    :z-index="layerStyle.zIndex" :modal-render="renderModal"
    wrap-class-name="wallet-holdings-modal"
    :wrap-props="{ 'aria-modal': 'true' }"
    transition-name="wallet-ant-dialog" mask-transition-name="wallet-ant-mask"
    :after-close="afterLeave" @cancel="close"
  >
    <template #title>
      <span ref="titleRef" tabindex="-1">{{ wallet?.label }} · 持有币种明细</span>
    </template>
    <div class="wallet-holdings-content">
      <Space direction="vertical" :size="4" class="wallet-holdings-summary">
        <Typography.Text type="secondary">{{ wallet?.username }} · UID {{ wallet?.userId }}</Typography.Text>
        <Statistic title="钱包总额（USD 估值）" :value="wallet?.total ?? 0" :precision="2" />
      </Space>
      <div ref="tableViewportRef" class="wallet-holdings-table-viewport">
      <Table :columns="columns" :data-source="wallet?.holdings ?? []" row-key="coin" :pagination="false" :scroll="{ y: tableScrollHeight }" size="small" :table-layout="'fixed'">
        <template #emptyText><Empty :image="Empty.PRESENTED_IMAGE_SIMPLE" description="该钱包暂无持有币种" /></template>
      </Table>
      </div>
    </div>
    <template #footer><Button @click="close">关闭</Button></template>
  </Modal>
</template>

<style>
/* Geometry and lifecycle safeguards only; visual tokens come from Ant Design. */
.wallet-holdings-modal { overflow: hidden; padding: max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left)); }
.wallet-holdings-modal .ant-modal { max-width: 100%; padding-bottom: 0; }
.wallet-holdings-modal .ant-modal-content {
  display: flex; flex-direction: column; overflow: hidden;
  height: 82vh;
  height: 82dvh;
  max-height: calc(100vh - max(12px, env(safe-area-inset-top)) - max(12px, env(safe-area-inset-bottom)));
  max-height: calc(100dvh - max(12px, env(safe-area-inset-top)) - max(12px, env(safe-area-inset-bottom)));
}
.wallet-holdings-modal .ant-modal-header, .wallet-holdings-modal .ant-modal-footer { flex-shrink: 0; }
.wallet-holdings-modal .ant-modal-title { padding-right: 44px; overflow-wrap: anywhere; }
.wallet-holdings-modal .ant-modal-close { min-width: 44px; min-height: 44px; }
.wallet-holdings-modal .ant-modal-body { display: flex; min-height: 0; flex: 1; overflow: hidden; }
.wallet-holdings-content { display: flex; flex-direction: column; gap: 16px; min-height: 0; width: 100%; }
.wallet-holdings-summary { flex-shrink: 0; }
.wallet-holdings-table-viewport { flex: 1; min-height: 0; min-width: 0; overflow: hidden; }
.wallet-holdings-table-viewport .ant-table-body { overscroll-behavior: contain; }
.wallet-holdings-table-viewport .ant-table-body:focus-visible { outline: 2px solid currentColor; outline-offset: -2px; }
.wallet-holdings-summary .ant-statistic-title { margin-bottom: 0; }
.wallet-holdings-content .ant-table-cell, .wallet-holdings-content .ant-typography, .wallet-holdings-content .ant-statistic-content { overflow-wrap: anywhere; }
/* Ant renders enter-prepare before attaching the running animation class. */
.wallet-ant-dialog-enter-prepare, .wallet-ant-dialog-appear-from { opacity: 0; transform: scale(.96); }
.wallet-ant-mask-enter-prepare, .wallet-ant-mask-appear-from { opacity: 0; }
.wallet-ant-dialog-enter-active, .wallet-ant-dialog-appear-active { animation: wallet-dialog-in 200ms ease-out both; }
.wallet-ant-dialog-leave-active { animation: wallet-dialog-out 150ms ease-in both; }
.wallet-ant-mask-enter-active, .wallet-ant-mask-appear-active { animation: wallet-mask-in 200ms ease-out both; }
.wallet-ant-mask-leave-active { animation: wallet-mask-out 150ms ease-in both; }
@keyframes wallet-dialog-in { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
@keyframes wallet-dialog-out { from { opacity: 1; transform: scale(1); } to { opacity: 0; transform: scale(.96); } }
@keyframes wallet-mask-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes wallet-mask-out { from { opacity: 1; } to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .wallet-ant-dialog-enter-prepare, .wallet-ant-dialog-appear-from { transform: none; }
  .wallet-ant-dialog-enter-active, .wallet-ant-dialog-appear-active, .wallet-ant-mask-enter-active, .wallet-ant-mask-appear-active { animation: wallet-mask-in 50ms ease-out both; }
  .wallet-ant-dialog-leave-active, .wallet-ant-mask-leave-active { animation: wallet-mask-out 50ms ease-in both; }
}
</style>
