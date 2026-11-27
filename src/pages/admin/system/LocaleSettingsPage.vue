<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { FRONT_LOCALE_CATALOG, PHONE_DIAL_PRESETS } from '../../../admin/constants/i18nCatalog'
import { DEFAULT_SITE_CONFIG, normalizeSiteConfig, siteConfigApi } from '../../../admin/mock/siteConfig'

const config = ref(normalizeSiteConfig({ ...DEFAULT_SITE_CONFIG }))
const loading = ref(true)
const isSaving = ref(false)
const message = ref('')
const messageType = ref('success')
const customDialForm = ref({ dial: '', label: '', icon: '' })
const dialFormOpen = ref(false)
const editingCustomDial = ref('')
const languageFormOpen = ref(false)
const editingLocaleCode = ref('')
const languageForm = ref({ code: '', label: '', short: '', icon: '', file: null, fileName: '' })

/** 多语言 | 手机区号 */
const activeTab = ref('language')
const localeTabs = [
  { key: 'language', label: '多语言' },
  { key: 'dial', label: '手机区号' }
]

function isImageIcon(icon) {
  const s = String(icon || '').trim()
  return /^(https?:\/\/|data:image\/|\/)/i.test(s) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(s)
}

const localesTableRows = computed(() => {
  const order = config.value.i18n?.localeSortOrder || {}
  const overrides = config.value.i18n?.localeMetaOverrides || {}
  const custom = Array.isArray(config.value.customLocales) ? config.value.customLocales : []
  const catalog = [...FRONT_LOCALE_CATALOG, ...custom.map((row) => ({ ...row, custom: true }))]
  return catalog.map((loc) => ({
    ...loc,
    ...(overrides[loc.code] || {}),
    code: loc.code,
    label: overrides[loc.code]?.label || loc.label,
    short: overrides[loc.code]?.short || loc.short,
    icon: overrides[loc.code]?.icon || loc.icon || '',
    custom: Boolean(loc.custom),
    keyCount: countTranslationKeys(config.value.i18n?.translationFiles?.[loc.code])
  })).sort((a, b) => {
    const da = Number.isFinite(order[a.code]) ? order[a.code] : -Infinity
    const db = Number.isFinite(order[b.code]) ? order[b.code] : -Infinity
    if (da !== db) return db - da
    return catalog.findIndex((x) => x.code === a.code) - catalog.findIndex((x) => x.code === b.code)
  })
})

const dialsTableRows = computed(() => {
  const order = config.value.dialSortOrder || {}
  const overrides = config.value.dialMetaOverrides || {}
  const custom = Array.isArray(config.value.customDialCodes) ? config.value.customDialCodes : []
  const catalog = [...PHONE_DIAL_PRESETS, ...custom.map((row) => ({ ...row, custom: true }))]
  return catalog.map((row) => ({
    ...row,
    ...(overrides[row.dial] || {}),
    dial: row.dial,
    label: overrides[row.dial]?.label || row.label,
    icon: overrides[row.dial]?.icon || row.icon || '',
    custom: Boolean(row.custom)
  })).sort((a, b) => {
    const da = Number.isFinite(order[a.dial]) ? order[a.dial] : -Infinity
    const db = Number.isFinite(order[b.dial]) ? order[b.dial] : -Infinity
    if (da !== db) return db - da
    return catalog.findIndex((x) => x.dial === a.dial) - catalog.findIndex((x) => x.dial === b.dial)
  })
})

function showMessage(text, type = 'success') {
  message.value = text
  messageType.value = type
  window.setTimeout(() => {
    if (message.value === text) message.value = ''
  }, 2600)
}

function ensureLocaleSortMap() {
  if (!config.value.i18n.localeSortOrder || typeof config.value.i18n.localeSortOrder !== 'object') {
    config.value.i18n.localeSortOrder = {}
  }
  const m = config.value.i18n.localeSortOrder
  localesTableRows.value.forEach((l, i) => {
    if (!Number.isFinite(m[l.code])) m[l.code] = i * 10
  })
}

function ensureDialSortMap() {
  if (!config.value.dialSortOrder || typeof config.value.dialSortOrder !== 'object') {
    config.value.dialSortOrder = {}
  }
  const m = config.value.dialSortOrder
  dialsTableRows.value.forEach((p, i) => {
    if (!Number.isFinite(m[p.dial])) m[p.dial] = i * 10
  })
}

function ensureLocaleMetaOverrides() {
  if (!config.value.i18n.localeMetaOverrides || typeof config.value.i18n.localeMetaOverrides !== 'object') {
    config.value.i18n.localeMetaOverrides = {}
  }
}

function ensureDialMetaOverrides() {
  if (!config.value.dialMetaOverrides || typeof config.value.dialMetaOverrides !== 'object') {
    config.value.dialMetaOverrides = {}
  }
}

function ensureTranslationFiles() {
  if (!config.value.i18n.translationFiles || typeof config.value.i18n.translationFiles !== 'object') {
    config.value.i18n.translationFiles = {}
  }
}

function onLocaleSortInput(code, raw) {
  ensureLocaleSortMap()
  const n = parseInt(String(raw ?? '').trim(), 10)
  config.value.i18n.localeSortOrder[code] = Number.isFinite(n) ? n : 0
}

function onDialSortInput(dial, raw) {
  ensureDialSortMap()
  const n = parseInt(String(raw ?? '').trim(), 10)
  config.value.dialSortOrder[dial] = Number.isFinite(n) ? n : 0
}

const loadConfig = async () => {
  loading.value = true
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = normalizeSiteConfig({ ...DEFAULT_SITE_CONFIG, ...result.data })
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  config.value.languageSettingsEnabled = true
  const i18n = config.value.i18n
  if (!i18n?.enabledLocales?.length) {
    showMessage('请至少在前台启用一种语言', 'error')
    activeTab.value = 'language'
    return
  }
  if (!i18n.enabledLocales.includes(i18n.defaultLocale)) {
    showMessage('默认语言必须从已启用的语言中选择', 'error')
    activeTab.value = 'language'
    return
  }
  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      config.value = normalizeSiteConfig(config.value)
      showMessage(result.message)
    }
  } catch (e) {
    showMessage('保存失败：' + (e?.message || '未知错误'), 'error')
  } finally {
    isSaving.value = false
  }
}

function toggleLocale(code, checked) {
  const cur = new Set(config.value.i18n.enabledLocales || [])
  if (checked) {
    cur.add(code)
    ensureLocaleSortMap()
    if (!Number.isFinite(config.value.i18n.localeSortOrder[code])) {
      const vals = Object.values(config.value.i18n.localeSortOrder).filter((n) => Number.isFinite(n))
      // Newly enabled languages go last: below the smallest existing weight.
      config.value.i18n.localeSortOrder[code] = vals.length ? Math.max(0, Math.min(...vals) - 10) : 0
    }
  } else {
    cur.delete(code)
  }
  let next = [...cur]
  if (next.length === 0) next = ['zh-CN']
  config.value.i18n.enabledLocales = next
  if (!next.includes(config.value.i18n.defaultLocale)) {
    config.value.i18n.defaultLocale = next[0]
  }
}

function toggleDial(dial, checked) {
  const cur = new Set(config.value.allowedDialCodes || [])
  if (checked) {
    cur.add(dial)
    ensureDialSortMap()
    if (!Number.isFinite(config.value.dialSortOrder[dial])) {
      const vals = Object.values(config.value.dialSortOrder).filter((n) => Number.isFinite(n))
      // Newly enabled dial codes go last: below the smallest existing weight.
      config.value.dialSortOrder[dial] = vals.length ? Math.max(0, Math.min(...vals) - 10) : 0
    }
  } else {
    cur.delete(dial)
  }
  config.value.allowedDialCodes = [...cur]
}

function setDefaultLocale(code) {
  if (!config.value.i18n.enabledLocales?.includes(code)) return
  config.value.i18n.defaultLocale = code
}

function selectAllLocales() {
  config.value.i18n.enabledLocales = localesTableRows.value.map((l) => l.code)
  ensureLocaleSortMap()
  localesTableRows.value.forEach((l, i) => {
    if (!Number.isFinite(config.value.i18n.localeSortOrder[l.code])) {
      config.value.i18n.localeSortOrder[l.code] = (localesTableRows.value.length - i) * 10
    }
  })
  if (!config.value.i18n.enabledLocales.includes(config.value.i18n.defaultLocale)) {
    config.value.i18n.defaultLocale = config.value.i18n.enabledLocales[0]
  }
}

function selectAllDialCodes() {
  config.value.allowedDialCodes = dialsTableRows.value.map((p) => p.dial)
  ensureDialSortMap()
  dialsTableRows.value.forEach((p, i) => {
    if (!Number.isFinite(config.value.dialSortOrder[p.dial])) {
      config.value.dialSortOrder[p.dial] = (dialsTableRows.value.length - i) * 10
    }
  })
}

function setLocaleIcon(code, icon) {
  ensureLocaleMetaOverrides()
  const next = { ...(config.value.i18n.localeMetaOverrides[code] || {}) }
  next.icon = String(icon || '').trim()
  config.value.i18n.localeMetaOverrides[code] = next
}

function setLocaleLabel(code, label) {
  ensureLocaleMetaOverrides()
  const next = { ...(config.value.i18n.localeMetaOverrides[code] || {}) }
  next.label = String(label || '').trim()
  config.value.i18n.localeMetaOverrides[code] = next
}

function resetLanguageForm() {
  languageFormOpen.value = false
  editingLocaleCode.value = ''
  languageForm.value = { code: '', label: '', short: '', icon: '', file: null, fileName: '' }
}

function openAddLanguageForm() {
  editingLocaleCode.value = ''
  languageForm.value = { code: '', label: '', short: '', icon: '', file: null, fileName: '' }
  languageFormOpen.value = true
}

function editLanguage(row) {
  editingLocaleCode.value = row.code
  languageForm.value = {
    code: row.code,
    label: row.label,
    short: row.short || row.code,
    icon: row.icon || '',
    file: null,
    fileName: ''
  }
  languageFormOpen.value = true
}

async function onLanguageFormFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    languageForm.value.file = await readJsonFile(file)
    languageForm.value.fileName = file.name
  } catch (e) {
    showMessage('上传失败：' + (e?.message || '未知错误'), 'error')
  }
}

function saveLanguage() {
  const code = String(languageForm.value.code || '').trim()
  const label = String(languageForm.value.label || '').trim()
  const short = String(languageForm.value.short || code).trim() || code
  const icon = String(languageForm.value.icon || '').trim()
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(code)) {
    showMessage('语言代码格式不正确，例如 en、zh-CN、vi', 'error')
    return
  }
  if (!label) {
    showMessage('请填写语言名称', 'error')
    return
  }
  const duplicate = localesTableRows.value.some((x) => x.code === code && x.code !== editingLocaleCode.value)
  if (duplicate) {
    showMessage('该语言代码已存在', 'error')
    return
  }
  const custom = Array.isArray(config.value.customLocales) ? [...config.value.customLocales] : []
  const existingIndex = custom.findIndex((x) => x.code === editingLocaleCode.value)
  const isBuiltin = FRONT_LOCALE_CATALOG.some((x) => x.code === code)
  if (existingIndex >= 0) {
    custom[existingIndex] = { code, label, short, icon }
    if (editingLocaleCode.value !== code) {
      config.value.i18n.enabledLocales = (config.value.i18n.enabledLocales || []).map((x) => (x === editingLocaleCode.value ? code : x))
      config.value.i18n.localeSortOrder[code] = config.value.i18n.localeSortOrder[editingLocaleCode.value]
      delete config.value.i18n.localeSortOrder[editingLocaleCode.value]
      if (config.value.i18n.translationFiles?.[editingLocaleCode.value]) {
        config.value.i18n.translationFiles[code] = config.value.i18n.translationFiles[editingLocaleCode.value]
        delete config.value.i18n.translationFiles[editingLocaleCode.value]
      }
      if (config.value.i18n.defaultLocale === editingLocaleCode.value) {
        config.value.i18n.defaultLocale = code
      }
    }
  } else if (!isBuiltin) {
    custom.push({ code, label, short, icon })
    toggleLocale(code, true)
  }
  config.value.customLocales = custom
  ensureLocaleMetaOverrides()
  config.value.i18n.localeMetaOverrides[code] = { label, short, icon }
  if (languageForm.value.file) {
    ensureTranslationFiles()
    config.value.i18n.translationFiles[code] = cloneJson(languageForm.value.file)
  }
  ensureLocaleSortMap()
  resetLanguageForm()
  showMessage('语言已更新')
}

function removeLanguage(row) {
  if (!row.custom) return
  config.value.customLocales = (config.value.customLocales || []).filter((x) => x.code !== row.code)
  config.value.i18n.enabledLocales = (config.value.i18n.enabledLocales || []).filter((x) => x !== row.code)
  if (config.value.i18n.defaultLocale === row.code) {
    config.value.i18n.defaultLocale = config.value.i18n.enabledLocales[0] || 'zh-CN'
  }
  if (config.value.i18n.localeSortOrder) delete config.value.i18n.localeSortOrder[row.code]
  if (config.value.i18n.localeMetaOverrides) delete config.value.i18n.localeMetaOverrides[row.code]
  if (config.value.i18n.translationFiles) delete config.value.i18n.translationFiles[row.code]
  if (editingLocaleCode.value === row.code) resetLanguageForm()
}

function setDialIcon(dial, icon) {
  ensureDialMetaOverrides()
  const next = { ...(config.value.dialMetaOverrides[dial] || {}) }
  next.icon = String(icon || '').trim()
  config.value.dialMetaOverrides[dial] = next
}

function setDialLabel(dial, label) {
  ensureDialMetaOverrides()
  const next = { ...(config.value.dialMetaOverrides[dial] || {}) }
  next.label = String(label || '').trim()
  config.value.dialMetaOverrides[dial] = next
}

function resetCustomDialForm() {
  dialFormOpen.value = false
  editingCustomDial.value = ''
  customDialForm.value = { dial: '', label: '', icon: '' }
}

function openAddDialForm() {
  editingCustomDial.value = ''
  customDialForm.value = { dial: '', label: '', icon: '' }
  dialFormOpen.value = true
}

function editCustomDial(row) {
  editingCustomDial.value = row.dial
  customDialForm.value = {
    dial: row.dial,
    label: row.label,
    icon: row.icon || ''
  }
  dialFormOpen.value = true
}

function saveCustomDial() {
  const dial = String(customDialForm.value.dial || '').trim()
  const label = String(customDialForm.value.label || '').trim()
  const icon = String(customDialForm.value.icon || '').trim()
  if (!/^\+\d{1,6}$/.test(dial)) {
    showMessage('区号格式需为 + 加数字，例如 +84', 'error')
    return
  }
  if (!label) {
    showMessage('请填写地区名称', 'error')
    return
  }
  const presetExists = PHONE_DIAL_PRESETS.some((x) => x.dial === dial)
  const custom = Array.isArray(config.value.customDialCodes) ? [...config.value.customDialCodes] : []
  const existingIndex = custom.findIndex((x) => x.dial === editingCustomDial.value)
  const duplicate = dialsTableRows.value.some((x) => x.dial === dial && x.dial !== editingCustomDial.value)
  if (presetExists && !editingCustomDial.value) {
    showMessage('内置区号已存在，可直接维护图标或名称', 'error')
    return
  }
  if (duplicate) {
    showMessage('该区号已存在', 'error')
    return
  }
  const nextRow = { dial, label, icon }
  if (existingIndex >= 0) {
    custom[existingIndex] = nextRow
    if (editingCustomDial.value !== dial) {
      config.value.allowedDialCodes = (config.value.allowedDialCodes || []).map((x) => (x === editingCustomDial.value ? dial : x))
      config.value.dialSortOrder[dial] = config.value.dialSortOrder[editingCustomDial.value]
      delete config.value.dialSortOrder[editingCustomDial.value]
    }
  } else {
    if (!presetExists) {
      custom.push(nextRow)
      toggleDial(dial, true)
    }
  }
  config.value.customDialCodes = custom
  ensureDialMetaOverrides()
  config.value.dialMetaOverrides[dial] = { label, icon }
  ensureDialSortMap()
  resetCustomDialForm()
  showMessage('区号已更新')
}

function removeCustomDial(row) {
  config.value.customDialCodes = (config.value.customDialCodes || []).filter((x) => x.dial !== row.dial)
  config.value.allowedDialCodes = (config.value.allowedDialCodes || []).filter((x) => x !== row.dial)
  if (config.value.dialSortOrder) delete config.value.dialSortOrder[row.dial]
  if (config.value.dialMetaOverrides) delete config.value.dialMetaOverrides[row.dial]
  if (editingCustomDial.value === row.dial) resetCustomDialForm()
}

function countTranslationKeys(value) {
  if (!value || typeof value !== 'object') return 0
  if (Array.isArray(value)) return value.length
  return Object.values(value).reduce((sum, item) => {
    if (item && typeof item === 'object') return sum + countTranslationKeys(item)
    return sum + 1
  }, 0)
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value))
}

function blankTranslationShape(value) {
  if (Array.isArray(value)) return value.map((item) => blankTranslationShape(item))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, blankTranslationShape(item)]))
  }
  return ''
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '{}'))
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          reject(new Error('文件内容必须是 JSON 对象'))
          return
        }
        resolve(parsed)
      } catch (e) {
        reject(new Error(e?.message || 'JSON 解析失败'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsText(file)
  })
}

function readImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file.type?.startsWith('image/')) {
      reject(new Error('请选择图片文件'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })
}

async function onLanguageIconUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    languageForm.value.icon = await readImageFile(file)
  } catch (e) {
    showMessage('图标上传失败：' + (e?.message || '未知错误'), 'error')
  }
}

async function onDialIconUpload(dial, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    setDialIcon(dial, await readImageFile(file))
  } catch (e) {
    showMessage('图标上传失败：' + (e?.message || '未知错误'), 'error')
  }
}

async function onCustomDialIconUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    customDialForm.value.icon = await readImageFile(file)
  } catch (e) {
    showMessage('图标上传失败：' + (e?.message || '未知错误'), 'error')
  }
}

async function onBaseTranslationUpload(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    config.value.i18n.translationBase = await readJsonFile(file)
    showMessage('基础语言文件已读取，可生成语言配置')
  } catch (e) {
    showMessage('上传失败：' + (e?.message || '未知错误'), 'error')
  }
}

function generateLocaleFilesFromBase() {
  const base = config.value.i18n.translationBase
  if (!base || typeof base !== 'object') {
    showMessage('请先上传全量基础语言文件', 'error')
    return
  }
  ensureTranslationFiles()
  const enabled = config.value.i18n.enabledLocales || []
  const defaultLocale = config.value.i18n.defaultLocale || enabled[0]
  const baseHasLocaleBuckets = FRONT_LOCALE_CATALOG.some((loc) => base[loc.code] && typeof base[loc.code] === 'object')
  for (const code of enabled) {
    if (baseHasLocaleBuckets) {
      config.value.i18n.translationFiles[code] = cloneJson(base[code] || {})
    } else {
      config.value.i18n.translationFiles[code] = code === defaultLocale ? cloneJson(base) : blankTranslationShape(base)
    }
  }
  showMessage('已按启用语言生成配置')
}

async function onLocaleTranslationUpload(code, event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  try {
    ensureTranslationFiles()
    config.value.i18n.translationFiles[code] = await readJsonFile(file)
    showMessage(`${code} 语言文件已更新`)
  } catch (e) {
    showMessage('上传失败：' + (e?.message || '未知错误'), 'error')
  }
}

function downloadLocalePackage(code) {
  const payload = config.value.i18n?.translationFiles?.[code] || {}
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${code || 'locale'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-900">语言与区号</h1>
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div
        class="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div
          class="flex flex-wrap gap-1 rounded-lg bg-slate-100/90 p-1"
          role="tablist"
          aria-label="语言与区号配置分区"
        >
          <button
            v-for="t in localeTabs"
            :key="t.key"
            type="button"
            role="tab"
            :aria-selected="activeTab === t.key"
            class="rounded-md px-3 py-1.5 text-sm font-medium transition"
            :class="
              activeTab === t.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            "
            @click="activeTab = t.key"
          >
            {{ t.label }}
          </button>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <button
            v-if="activeTab === 'language'"
            type="button"
            class="ant-btn"
            @click="openAddLanguageForm"
          >
            添加语言
          </button>
          <button
            v-if="activeTab === 'dial'"
            type="button"
            class="ant-btn"
            @click="openAddDialForm"
          >
            添加区号
          </button>
          <button
            type="button"
            class="ant-btn ant-btn-primary"
            :disabled="isSaving"
            @click="saveConfig"
          >
            {{ isSaving ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>

      <div class="space-y-6 p-6">
        <div
          v-if="message"
          class="rounded-lg px-4 py-3 text-sm"
          :class="messageType === 'error' ? 'border border-red-200 bg-red-50 text-red-700' : 'border border-emerald-200 bg-emerald-50 text-emerald-700'"
        >
          {{ message }}
        </div>

        <!-- 多语言 -->
        <section v-show="activeTab === 'language'" class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label class="text-sm font-medium text-slate-700">语言列表</label>
              <div class="flex flex-wrap gap-2 text-xs">
	                <button type="button" class="text-blue-600 hover:underline" @click="selectAllLocales">
	                  全选
	                </button>
	              </div>
            </div>

            <div class="overflow-x-auto overflow-hidden rounded-lg border border-slate-200">
              <table class="w-full min-w-[58rem] border-collapse text-left text-sm">
                <thead class="bg-slate-50 text-slate-600">
                  <tr>
                    <th class="w-28 px-4 py-2.5 font-medium">图标</th>
                    <th class="px-4 py-2.5 font-medium">语言名称</th>
                    <th class="w-32 px-4 py-2.5 font-medium">语言代码</th>
                    <th class="w-28 px-4 py-2.5 font-medium">排序权重</th>
                    <th class="w-24 px-4 py-2.5 text-right font-medium">Key 数</th>
                    <th class="w-24 px-4 py-2.5 text-center font-medium">启用</th>
                    <th class="w-28 px-4 py-2.5 text-center font-medium">默认</th>
		                    <th class="w-44 px-4 py-2.5 text-right font-medium">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 bg-white">
                  <tr v-for="loc in localesTableRows" :key="loc.code" class="hover:bg-slate-50/80">
                    <td class="px-4 py-2.5">
                      <span class="inline-flex h-8 w-12 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-base">
                        <img
                          v-if="isImageIcon(loc.icon)"
                          :src="loc.icon"
                          :alt="loc.label"
                          class="h-full w-full object-cover"
                        />
                        <span v-else>{{ loc.icon || '□' }}</span>
                      </span>
                    </td>
                    <td class="px-4 py-2.5 text-slate-800">{{ loc.label }}</td>
                    <td class="px-4 py-2.5 font-mono text-xs text-slate-500">{{ loc.code }}</td>
                    <td class="px-4 py-2.5">
                      <input
                        type="number"
                        step="1"
                        class="ant-input w-full max-w-[6.5rem] text-right text-sm tabular-nums"
                        :value="config.i18n.localeSortOrder?.[loc.code] ?? 0"
                        @input="onLocaleSortInput(loc.code, $event.target.value)"
                      />
                    </td>
                    <td class="px-4 py-2.5 text-right tabular-nums text-slate-700">{{ loc.keyCount }}</td>
                    <td class="px-4 py-2.5 text-center">
                      <input
                        type="checkbox"
                        class="rounded border-slate-300"
                        :checked="config.i18n.enabledLocales?.includes(loc.code)"
                        @change="toggleLocale(loc.code, $event.target.checked)"
                      />
                    </td>
                    <td class="px-4 py-2.5 text-center">
                      <input
                        type="radio"
                        class="border-slate-300"
                        name="admin-default-locale-pick"
                        :value="loc.code"
                        :checked="config.i18n.defaultLocale === loc.code"
                        :disabled="!config.i18n.enabledLocales?.includes(loc.code)"
                        @change="setDefaultLocale(loc.code)"
                      />
	                    </td>
	                    <td class="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        class="mr-3 text-xs font-medium text-blue-600 hover:underline"
                        @click="downloadLocalePackage(loc.code)"
                      >
                        下载
                      </button>
		                      <button
		                        type="button"
		                        class="mr-3 text-xs font-medium text-blue-600 hover:underline"
                        @click="editLanguage(loc)"
                      >
                        编辑
                      </button>
                      <button
                        v-if="loc.custom"
                        type="button"
                        class="text-xs font-medium text-red-600 hover:underline"
                        @click="removeLanguage(loc)"
                      >
                        删除
                      </button>
                      <span v-else class="text-xs text-slate-400">内置</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p class="text-xs text-slate-500">语言文件在添加/编辑弹窗中上传；「排序权重」填整数，数值越大在前台语言列表中越靠前。</p>

            <div class="flex items-start justify-between gap-4 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-slate-900">前台显示语言切换</p>
                <p class="mt-1 text-xs text-slate-500">
                  关闭后顶栏与移动端菜单中的语言入口将隐藏（仍使用默认语言展示页面）。
                </p>
              </div>
              <button
                type="button"
                :class="config.i18n.languageSwitcherEnabled ? 'bg-blue-600' : 'bg-slate-200'"
                class="relative mt-0.5 inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
                :aria-pressed="config.i18n.languageSwitcherEnabled"
                @click="config.i18n.languageSwitcherEnabled = !config.i18n.languageSwitcherEnabled"
              >
                <span
                  :class="config.i18n.languageSwitcherEnabled ? 'translate-x-5' : 'translate-x-0'"
                  class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
                />
              </button>
            </div>
        </section>

        <!-- 手机区号 -->
        <section v-show="activeTab === 'dial'" class="space-y-4">
          <div
            v-if="!config.phoneLoginEnabled"
            class="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            当前未启用「手机号码登录」，前台手机区号固定为 +86。需要按下方列表展示时，请前往
            <RouterLink class="font-medium text-blue-800 underline-offset-2 hover:underline" to="/admin/system/site-config">
              登录设置
            </RouterLink>
            开启。
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-sm font-medium text-slate-700">可选区号列表</span>
            <div class="flex flex-wrap gap-2 text-xs">
              <button type="button" class="text-blue-600 hover:underline" @click="selectAllDialCodes">全选</button>
            </div>
          </div>
          <div class="overflow-x-auto overflow-hidden rounded-lg border border-slate-200">
            <table class="w-full min-w-[48rem] border-collapse text-left text-sm">
                <thead class="bg-slate-50 text-slate-600">
                <tr>
                  <th class="w-24 px-4 py-2.5 font-medium">图标</th>
                  <th class="px-4 py-2.5 font-medium">地区与区号</th>
                  <th class="w-28 px-4 py-2.5 font-medium">国际区号</th>
                  <th class="w-28 px-4 py-2.5 font-medium">排序权重</th>
                  <th class="w-24 px-4 py-2.5 text-center font-medium">启用</th>
                  <th class="w-32 px-4 py-2.5 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 bg-white">
                <tr v-for="row in dialsTableRows" :key="row.dial" class="hover:bg-slate-50/80">
                  <td class="px-4 py-2.5">
                    <div class="flex items-center gap-2">
                      <span class="inline-flex h-8 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-base">
                        <img
                          v-if="isImageIcon(row.icon)"
                          :src="row.icon"
                          :alt="row.label"
                          class="h-full w-full object-cover"
                        />
                        <span v-else>{{ row.icon || '□' }}</span>
                      </span>
                    </div>
                  </td>
                  <td class="px-4 py-2.5 text-slate-800">{{ row.label }}</td>
                  <td class="px-4 py-2.5 font-mono text-sm text-slate-600">{{ row.dial }}</td>
                  <td class="px-4 py-2.5">
                    <input
                      type="number"
                      step="1"
                      class="ant-input w-full max-w-[6.5rem] text-right text-sm tabular-nums"
                      :value="config.dialSortOrder?.[row.dial] ?? 0"
                      @input="onDialSortInput(row.dial, $event.target.value)"
                    />
                  </td>
                  <td class="px-4 py-2.5 text-center">
                    <input
                      type="checkbox"
                      class="rounded border-slate-300"
                      :checked="config.allowedDialCodes?.includes(row.dial)"
                      @change="toggleDial(row.dial, $event.target.checked)"
                    />
                  </td>
                  <td class="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      class="mr-3 text-xs font-medium text-blue-600 hover:underline"
                      @click="editCustomDial(row)"
                    >
                      编辑
                    </button>
                    <button
                      v-if="row.custom"
                      type="button"
                      class="text-xs font-medium text-red-600 hover:underline"
                      @click="removeCustomDial(row)"
                    >
                      删除
                    </button>
                    <span v-else class="text-xs text-slate-400">内置</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-xs text-slate-500">「排序权重」填整数，数值越大在区号下拉中越靠前；保存后前台登录与绑定手机等处的区号顺序与此一致。</p>
        </section>
      </div>

      <div class="flex justify-end border-t border-slate-200 bg-slate-50/50 px-4 py-4">
        <button type="button" class="ant-btn ant-btn-primary" :disabled="isSaving" @click="saveConfig">
          {{ isSaving ? '保存中…' : '保存' }}
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="languageFormOpen"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 px-4 py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="locale-language-modal-title"
      >
        <div class="w-full max-w-xl overflow-hidden rounded-xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 id="locale-language-modal-title" class="text-base font-semibold text-slate-900">
                {{ editingLocaleCode ? '编辑语言' : '添加语言' }}
              </h2>
              <p class="mt-1 text-xs text-slate-500">维护语言名称、代码、图标和对应 JSON 文件。</p>
            </div>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="关闭"
              @click="resetLanguageForm"
            >
              ×
            </button>
          </div>

          <div class="space-y-4 px-5 py-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">语言代码</span>
                <input
                  v-model="languageForm.code"
                  class="ant-input w-full"
                  placeholder="vi"
                  :disabled="Boolean(editingLocaleCode)"
                />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">语言名称</span>
                <input v-model="languageForm.label" class="ant-input w-full" placeholder="Tiếng Việt" />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">简称</span>
                <input v-model="languageForm.short" class="ant-input w-full" placeholder="VI" />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">图标</span>
                <div class="flex items-center gap-2">
                  <span class="inline-flex h-9 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-base">
                    <img
                      v-if="isImageIcon(languageForm.icon)"
                      :src="languageForm.icon"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                    <span v-else>{{ languageForm.icon || '□' }}</span>
                  </span>
                  <label class="ant-btn cursor-pointer whitespace-nowrap">
                    上传图片
                    <input class="hidden" type="file" accept="image/*" @change="onLanguageIconUpload" />
                  </label>
                </div>
              </label>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p class="text-sm font-medium text-slate-800">语言文件</p>
                  <p class="mt-1 text-xs text-slate-500">
                    {{ languageForm.fileName || '可上传 JSON 文件；不上传则只保存语言信息。' }}
                  </p>
                </div>
                <label class="ant-btn cursor-pointer text-center">
                  选择文件
                  <input class="hidden" type="file" accept=".json,application/json" @change="onLanguageFormFile" />
                </label>
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button type="button" class="ant-btn" @click="resetLanguageForm">取消</button>
            <button type="button" class="ant-btn ant-btn-primary" @click="saveLanguage">
              {{ editingLocaleCode ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div
        v-if="dialFormOpen"
        class="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/45 px-4 py-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="locale-dial-modal-title"
      >
        <div class="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
          <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 id="locale-dial-modal-title" class="text-base font-semibold text-slate-900">
                {{ editingCustomDial ? '编辑区号' : '添加区号' }}
              </h2>
              <p class="mt-1 text-xs text-slate-500">维护国际区号、地区名称和显示图标。</p>
            </div>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="关闭"
              @click="resetCustomDialForm"
            >
              ×
            </button>
          </div>

          <div class="space-y-4 px-5 py-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">国际区号</span>
                <input
                  v-model="customDialForm.dial"
                  class="ant-input w-full"
                  placeholder="+84"
                  :disabled="Boolean(editingCustomDial)"
                />
              </label>
              <label class="block">
                <span class="mb-1 block text-xs font-medium text-slate-600">地区名称</span>
                <input v-model="customDialForm.label" class="ant-input w-full" placeholder="越南 +84" />
              </label>
              <label class="block sm:col-span-2">
                <span class="mb-1 block text-xs font-medium text-slate-600">图标</span>
                <div class="flex items-center gap-2">
                  <span class="inline-flex h-9 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-base">
                    <img
                      v-if="isImageIcon(customDialForm.icon)"
                      :src="customDialForm.icon"
                      alt=""
                      class="h-full w-full object-cover"
                    />
                    <span v-else>{{ customDialForm.icon || '□' }}</span>
                  </span>
                  <label class="ant-btn cursor-pointer whitespace-nowrap">
                    上传图片
                    <input class="hidden" type="file" accept="image/*" @change="onCustomDialIconUpload" />
                  </label>
                </div>
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
            <button type="button" class="ant-btn" @click="resetCustomDialForm">取消</button>
            <button type="button" class="ant-btn ant-btn-primary" @click="saveCustomDial">
              {{ editingCustomDial ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
