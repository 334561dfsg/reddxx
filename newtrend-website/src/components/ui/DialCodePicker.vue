<script setup>
import {computed, nextTick, onBeforeUnmount, ref, watch} from 'vue'
import {locale, t} from '../../i18n'
import LineIcon from './LineIcon.vue'
import {dialOptions, filterDialOptions} from '../../utils/dialCodes.js'
// Country dial-code picker for phone fields, "panel" mode of the searchable single-select standard: a disclosure
// button (field label + committed value) opens a panel whose search box is the Combobox over the country Listbox.
// Arrow keys move the active option, Enter or a click commits; Escape, Tab out or an outside click close without
// changing the value and return focus to the button. Only the active option is aria-selected; the committed one
// carries a check mark.
const props = defineProps({modelValue: {type: String, required: true}, label: {type: String, required: true}, disabled: Boolean})
const emit = defineEmits(['update:modelValue'])
const uid = `dial-${Math.random().toString(36).slice(2, 8)}`
const panelId = `${uid}-panel`, listId = `${uid}-list`, optionId = iso => `${uid}-opt-${iso}`
const open = ref(false), query = ref(''), active = ref(null)
const root = ref(null), trigger = ref(null), search = ref(null), list = ref(null)
const options = computed(() => dialOptions(locale.value))
const results = computed(() => filterDialOptions(options.value, query.value))
const selected = computed(() => options.value.find(option => option.iso === props.modelValue))

function reconcile() {
  const isos = results.value.map(option => option.iso)
  active.value = isos.includes(active.value) ? active.value : isos.includes(props.modelValue) ? props.modelValue : isos[0] ?? null
}
watch(results, () => { if (open.value) { reconcile(); reveal() } })

function reveal() {
  nextTick(() => list.value?.querySelector(`#${CSS.escape(optionId(active.value))}`)?.scrollIntoView({block: 'nearest'}))
}
function show() {
  if (props.disabled || open.value) return
  query.value = ''
  active.value = null
  open.value = true
  reconcile()
  document.addEventListener('pointerdown', outside, true)
  nextTick(() => { search.value?.focus(); reveal() })
}
function close({restoreFocus = true} = {}) {
  if (!open.value) return
  open.value = false
  query.value = ''
  active.value = null
  document.removeEventListener('pointerdown', outside, true)
  if (restoreFocus) trigger.value?.focus()
}
function commit(iso) {
  if (iso && iso !== props.modelValue) emit('update:modelValue', iso)
  close()
}
function outside(event) { if (!root.value?.contains(event.target)) close({restoreFocus: false}) }
function move(step) {
  const isos = results.value.map(option => option.iso)
  if (!isos.length) return
  const index = isos.indexOf(active.value)
  active.value = isos[index < 0 ? 0 : Math.min(isos.length - 1, Math.max(0, index + step))]
  reveal()
}
function onKey(event) {
  if (event.key === 'ArrowDown') { event.preventDefault(); move(1) }
  else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1) }
  else if (event.key === 'PageDown') { event.preventDefault(); move(8) }
  else if (event.key === 'PageUp') { event.preventDefault(); move(-8) }
  else if (event.key === 'Enter') { event.preventDefault(); if (active.value) commit(active.value) }
  else if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close() }
}
function onFocusOut(event) { if (open.value && !root.value?.contains(event.relatedTarget)) close({restoreFocus: false}) }
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside, true))
</script>
<template><div ref="root" class="dial-picker" @focusout="onFocusOut">
 <button ref="trigger" type="button" class="dial-trigger" :disabled="disabled" :aria-label="`${label}: ${selected ? `${selected.name} ${selected.dial}` : modelValue}`" :aria-expanded="open" :aria-controls="panelId" @click="open ? close() : show()" @keydown.down.prevent="show"><span class="dial-flag" aria-hidden="true">{{ selected?.flag }}</span><span>{{ selected?.dial }}</span><LineIcon name="chevron-down" class="dial-chevron" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></button>
 <Transition name="dial-panel"><div v-if="open" :id="panelId" class="dial-panel">
  <div class="dial-search"><LineIcon name="search" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><input ref="search" v-model="query" type="text" role="combobox" autocomplete="off" spellcheck="false" :aria-label="t('auth.searchCountry')" aria-autocomplete="list" aria-expanded="true" :aria-controls="listId" :aria-activedescendant="active ? optionId(active) : undefined" :placeholder="t('common.search')" @keydown="onKey"/></div>
  <p class="dial-status" role="status">{{ results.length ? t('auth.countryResults', {count: results.length}) : '' }}</p>
  <ul :id="listId" ref="list" role="listbox" class="dial-list" :aria-label="label">
   <li v-for="option in results" :id="optionId(option.iso)" :key="option.iso" role="option" :aria-selected="option.iso === active" :class="{active: option.iso === active, committed: option.iso === modelValue}" @pointerdown.prevent @pointermove="active = option.iso" @click="commit(option.iso)"><span class="dial-flag" aria-hidden="true">{{ option.flag }}</span><span class="dial-name">{{ option.name }}</span><span class="dial-code">{{ option.dial }}</span></li>
  </ul>
  <p v-if="!results.length" class="dial-empty">{{ t('auth.noMatchingCountry') }}</p>
 </div></Transition>
</div></template>
<style>
.dial-picker{position:relative;flex-shrink:0}
.dial-trigger{display:flex;align-items:center;gap:8px;height:100%;min-height:var(--nt-control-height,40px);padding:0 12px;border-radius:var(--nt-radius-control);background:#202226;color:#fff;white-space:nowrap}
.dial-trigger:disabled{opacity:.5;cursor:not-allowed}
.dial-trigger .dial-chevron{color:var(--nt-muted);transition:transform 150ms ease-out}
.dial-trigger[aria-expanded="true"] .dial-chevron{transform:rotate(180deg)}
.dial-flag{font-size:16px;line-height:1}
.dial-panel{position:absolute;top:calc(100% + 8px);left:0;z-index:40;width:min(340px,calc(100vw - 32px));display:flex;flex-direction:column;max-height:min(360px,60vh);border:1px solid #ffffff14;border-radius:var(--nt-radius-panel);background:#131516;box-shadow:0 20px 40px #0008;overflow:hidden}
.dial-search{display:flex;align-items:center;gap:8px;padding:0 14px;border-bottom:1px solid #ffffff10;color:var(--nt-muted);flex-shrink:0}
#main-content .dial-search input,.dial-search input{flex:1;min-width:0;background:none;border:0;padding:12px 0;min-height:44px}
.dial-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.dial-list{list-style:none;margin:0;padding:4px 0;overflow-y:auto;overscroll-behavior:contain}
.dial-list li{display:flex;align-items:center;gap:12px;padding:10px 14px;min-height:40px;cursor:pointer}
.dial-list li.active{background:#ffffff0d}
.dial-list li.committed .dial-name{color:var(--nt-accent);font-weight:600}
.dial-name{flex:1;min-width:0;overflow-wrap:anywhere}
.dial-code{color:var(--nt-muted);font-variant-numeric:tabular-nums}
.dial-empty{padding:20px 14px;text-align:center;color:var(--nt-muted)}
.dial-panel-enter-active{transition:opacity 150ms ease-out,transform 150ms ease-out}
.dial-panel-leave-active{transition:opacity 100ms ease-in,transform 100ms ease-in}
.dial-panel-enter-from,.dial-panel-leave-to{opacity:0;transform:translateY(-4px)}
@media(prefers-reduced-motion:reduce){.dial-panel-enter-active,.dial-panel-leave-active{transition:opacity 50ms linear}.dial-panel-enter-from,.dial-panel-leave-to{transform:none}}
</style>
