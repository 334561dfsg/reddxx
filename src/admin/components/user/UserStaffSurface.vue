<script setup>
// Shared surface of the staff editor (dialog) and staff report (drawer). Since the dialog migration (2026-11-27) it
// keeps its own API (props, default/footer slots, exposed close) and renders on the shared Ant frames: AdminDialog,
// or AdminDrawer when `drawer` is set. The frames own the layer stack, focus, Escape, busy blocking and motion.
import { AdminButton } from '../antd/controls.js'
import AdminDialog from '../antd/AdminDialog.vue'
import AdminDrawer from '../antd/AdminDrawer.vue'
import { ref } from 'vue'

const props = defineProps({ visible: Boolean, title: String, subtitle: String, drawer: Boolean, busy: Boolean, returnFocus: { default: null }, initialFocus: { default: null }, beforeClose: { type: Function, default: null } })
const emit = defineEmits(['close', 'closed'])
const frame = ref(null)
const requestClose = () => (props.beforeClose?.() === false ? false : emit('close'))
const close = () => frame.value?.close()
defineExpose({ close })
</script>

<template>
  <component
    :is="drawer ? AdminDrawer : AdminDialog"
    ref="frame"
    :open="visible"
    :title="title"
    :title-id="drawer ? 'staff-report-title' : 'staff-editor-title'"
    :busy="busy"
    :return-focus="returnFocus"
    :initial-focus="initialFocus"
    :width="drawer ? 1152 : 672"
    :request-close="requestClose"
    plain
    @closed="emit('closed')"
  >
    <template v-if="subtitle" #subtitle>{{ subtitle }}</template>
    <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"><slot /></div>
    <footer class="shrink-0 border-t border-slate-200 bg-slate-50 px-5 py-3"><slot name="footer" :close="close"><AdminButton class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm" type="button" @click="close">关闭</AdminButton></slot></footer>
  </component>
</template>
