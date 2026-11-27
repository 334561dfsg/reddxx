<script setup>
// Simple rich-text editor for news bodies, after the legacy 新闻资讯 editor: a toolbar (H2, 正文, B, I, 列表)
// over a contenteditable area. Emits HTML; the news domain cleans it to an allow-list on save.
import {onMounted, ref, watch} from 'vue'
import {Button, Space, Tooltip} from 'ant-design-vue'

const props = defineProps({modelValue: {type: String, default: ''}, label: {type: String, default: '正文'}, disabled: Boolean})
const emit = defineEmits(['update:modelValue'])
const area = ref(null)
let lastEmitted = null

function pull() {
  const html = area.value?.innerHTML.trim() || ''
  lastEmitted = html === '<br>' ? '' : html
  emit('update:modelValue', lastEmitted)
}
// Only an external change (load, language switch, reset) rewrites the area, so typing never moves the caret.
function sync(value) { if (area.value && value !== lastEmitted) { area.value.innerHTML = value || ''; lastEmitted = value } }
onMounted(() => sync(props.modelValue))
watch(() => props.modelValue, sync)

function run(command, value = null) {
  if (props.disabled) return
  area.value?.focus()
  document.execCommand(command, false, value)
  pull()
}
const tools = [
  ['H2', '小标题', () => run('formatBlock', 'H2')],
  ['正文', '正文段落', () => run('formatBlock', 'P')],
  ['B', '加粗', () => run('bold')],
  ['I', '斜体', () => run('italic')],
  ['列表', '无序列表', () => run('insertUnorderedList')],
]
</script>

<template>
 <div class="news-rich-editor" :class="{disabled}">
  <Space :size="8" wrap class="news-rich-toolbar" role="toolbar" :aria-label="label + '格式'">
   <Tooltip v-for="[text, title, action] in tools" :key="text" :title="title"><Button size="small" :disabled="disabled" :aria-label="title" @mousedown.prevent @click="action">{{ text }}</Button></Tooltip>
  </Space>
  <div ref="area" class="news-rich-area" :contenteditable="!disabled" role="textbox" aria-multiline="true" :aria-label="label" @input="pull" @blur="pull"/>
 </div>
</template>

<style scoped>
.news-rich-editor{border:1px solid var(--ant-color-border,#d9d9d9);border-radius:8px;overflow:hidden;background:var(--ant-color-bg-container,#fff)}
.news-rich-toolbar{display:flex;padding:8px 12px;border-bottom:1px solid var(--ant-color-border-secondary,#f0f0f0);background:var(--ant-color-fill-quaternary,#fafafa)}
.news-rich-area{min-height:220px;max-height:520px;overflow-y:auto;padding:12px 16px;line-height:1.75;outline:none}
.news-rich-area:focus{background:var(--ant-color-fill-quaternary,#fcfcfc)}
.news-rich-area :deep(h2){font-size:18px;font-weight:600;margin:12px 0 8px}
.news-rich-area :deep(p){margin:0 0 8px}
.news-rich-area :deep(ul){padding-left:20px;margin:0 0 8px}
.news-rich-area :deep(a){color:var(--ant-color-primary,#1677ff);text-decoration:underline}
.disabled .news-rich-area{opacity:.6}
</style>
