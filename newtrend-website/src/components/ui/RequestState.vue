<script setup>
import FeedbackToast from '../../platform/FeedbackToast.js'
import LineIcon from './LineIcon.vue'
import {t} from '../../i18n.js'
// Frames one useRequest() result:
//   loading → #loading slot (skeletons) inside a status region with a screen-reader label;
//   error   → toast (re-sent for every failed attempt) plus a neutral retry action; no inline error text;
//   ready   → default slot.
// Attributes (e.g. a panel class) style the error frame only; skeletons bring their own panels and the
// ready slot renders unwrapped.
defineOptions({inheritAttrs: false})
const props = defineProps({status: {type: String, required: true}, error: Object})
const emit = defineEmits(['retry'])
// Each failed attempt is a new error object; a primitive key remounts the toast so a repeat failure re-notifies.
const ids = new WeakMap()
let next = 0
const attemptKey = error => error ? (ids.get(error) ?? (ids.set(error, ++next), next)) : 0
const failureText = () => t(props.error?.code === 'network' ? 'common.loadFailed' : 'common.requestFailed')
</script>
<template>
<slot v-if="status==='ready'"/>
<div v-else-if="status==='loading'" class="nt-request-loading" role="status" aria-busy="true"><span class="sr-only">{{ $t('common.loading') }}</span><slot name="loading"/></div>
<div v-else v-bind="$attrs" class="nt-request-error">
 <FeedbackToast :key="attemptKey(error)" type="error" :source="failureText"/>
 <span class="nt-request-error-icon" aria-hidden="true"><LineIcon name="inbox"/></span>
 <button type="button" class="nt-request-retry" @click="emit('retry')">{{ $t('common.retry') }}</button>
</div>
</template>
<style>
.nt-request-error{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:40px 24px;text-align:center}
.nt-request-error-icon{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;background:var(--nt-border);color:var(--nt-text-dim)}
.nt-request-error-icon svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.nt-request-retry{min-height:36px;padding:7px 20px;border-radius:var(--nt-radius-pill);background:#202326;color:#fff;font-size:14px}
.nt-request-retry:hover{background:#2a2e32}
.nt-request-retry:focus-visible{outline:none;text-decoration:underline}
@media(pointer:coarse){.nt-request-retry{min-height:44px}}
</style>
