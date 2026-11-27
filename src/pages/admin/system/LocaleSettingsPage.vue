<script setup>
// 平台配置 → 语言与区号: Ant Design Pro config page (2026-11-28) — PageShell header, one Card per list (多语言 /
// 手机区号) with Ant tables and inline weight/enable editing, sticky bottom action bar, toast feedback (Ant message).
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Alert, Button, Card, Checkbox, Col, Form, FormItem, InputNumber, Radio, Row, Space, Spin, Switch, Table, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, DownloadOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import { FRONT_LOCALE_CATALOG, PHONE_DIAL_PRESETS } from '../../../admin/constants/i18nCatalog'
import { DEFAULT_SITE_CONFIG, normalizeSiteConfig, siteConfigApi } from '../../../admin/mock/siteConfig'

const config = ref(normalizeSiteConfig({ ...DEFAULT_SITE_CONFIG }))
const loading = ref(true)
const isSaving = ref(false)
const customDialForm = ref({ dial: '', label: '', icon: '' })
const dialFormOpen = ref(false)
const editingCustomDial = ref('')
const languageFormOpen = ref(false)
const editingLocaleCode = ref('')
const languageForm = ref({ code: '', label: '', short: '', icon: '', file: null, fileName: '' })
const languageIconInput = ref(null)
const languageFileInput = ref(null)
const dialIconInput = ref(null)

const localeColumns = [
  { key: 'icon', title: '图标', width: 80 },
  { key: 'label', title: '语言名称', width: 180 },
  { key: 'code', title: '语言代码', width: 120 },
  { key: 'sort', title: '排序权重', width: 130 },
  { key: 'keyCount', title: 'Key 数', width: 90, align: 'right' },
  { key: 'enabled', title: '启用', width: 80, align: 'center' },
  { key: 'default', title: '默认', width: 80, align: 'center' },
  { key: 'actions', title: '操作', width: 180, fixed: 'right' }
]
const dialColumns = [
  { key: 'icon', title: '图标', width: 80 },
  { key: 'label', title: '地区与区号', width: 220 },
  { key: 'dial', title: '国际区号', width: 120 },
  { key: 'sort', title: '排序权重', width: 130 },
  { key: 'enabled', title: '启用', width: 80, align: 'center' },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]
const tableScroll = (columns) => ({ x: columns.reduce((total, column) => total + column.width, 0) })

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
  if (type === 'error') message.error(text)
  else message.success(text)
}

function ensureLocaleSortMap() {
  if (!config.value.i18n.localeSortOrder || typeof config.value.i18n.localeSortOrder !== 'object') {
    config.value.i18n.localeSortOrder = {}
  }
  const m = config.value.i18n.localeSortOrder
  const total = localesTableRows.value.length
  localesTableRows.value.forEach((l, i) => {
    if (!Number.isFinite(m[l.code])) m[l.code] = (total - i) * 10
  })
}

function ensureDialSortMap() {
  if (!config.value.dialSortOrder || typeof config.value.dialSortOrder !== 'object') {
    config.value.dialSortOrder = {}
  }
  const m = config.value.dialSortOrder
  const total = dialsTableRows.value.length
  dialsTableRows.value.forEach((p, i) => {
    if (!Number.isFinite(m[p.dial])) m[p.dial] = (total - i) * 10
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
    showMessage('加载失败：' + (e?.message || '未知错误'), 'error')
  } finally {
    loading.value = false
  }
}

const saveConfig = async () => {
  config.value.languageSettingsEnabled = true
  const i18n = config.value.i18n
  if (!i18n?.enabledLocales?.length) {
    showMessage('请至少在前台启用一种语言', 'error')
    return
  }
  if (!i18n.enabledLocales.includes(i18n.defaultLocale)) {
    showMessage('默认语言必须从已启用的语言中选择', 'error')
    return
  }
  if (isSaving.value) return
  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      config.value = normalizeSiteConfig(config.value)
      showMessage(result.message || '语言与区号配置已保存')
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
  <PageShell title="语言与区号">
    <template #description>
      <TypographyText type="secondary">维护前台可选语言、默认语言、语言文件与手机区号；排序权重数值越大越靠前，修改后需点击保存生效。</TypographyText>
    </template>
    <Card v-if="loading" :bordered="false"><Spin tip="加载中…" class="locale-loading" /></Card>

    <template v-else>
      <Card title="多语言" :bordered="false">
        <template #extra>
          <Space :size="8">
            <Button @click="selectAllLocales">全部启用</Button>
            <Button type="primary" @click="openAddLanguageForm"><template #icon><PlusOutlined /></template>添加语言</Button>
          </Space>
        </template>
        <Table :columns="localeColumns" :data-source="localesTableRows" :pagination="false" row-key="code" size="middle" :scroll="tableScroll(localeColumns)" :locale="{ emptyText: '暂无语言' }">
          <template #bodyCell="{ column, record: loc }">
            <span v-if="column.key === 'icon'" class="locale-icon">
              <img v-if="isImageIcon(loc.icon)" :src="loc.icon" :alt="loc.label" />
              <span v-else>{{ loc.icon || '□' }}</span>
            </span>
            <Space v-else-if="column.key === 'label'" :size="4">
              <span>{{ loc.label }}</span>
              <Tag v-if="config.i18n.defaultLocale === loc.code" color="blue">默认</Tag>
            </Space>
            <span v-else-if="column.key === 'code'" class="font-mono">{{ loc.code }}</span>
            <InputNumber v-else-if="column.key === 'sort'" :value="config.i18n.localeSortOrder?.[loc.code] ?? 0" :precision="0" :aria-label="`${loc.label} 排序权重`" class="locale-weight" @update:value="onLocaleSortInput(loc.code, $event)" />
            <Checkbox v-else-if="column.key === 'enabled'" :checked="config.i18n.enabledLocales?.includes(loc.code)" :aria-label="`前台启用 ${loc.label}`" @change="toggleLocale(loc.code, $event.target.checked)" />
            <Radio v-else-if="column.key === 'default'" name="admin-default-locale-pick" :value="loc.code" :checked="config.i18n.defaultLocale === loc.code" :disabled="!config.i18n.enabledLocales?.includes(loc.code)" :aria-label="`设为默认语言 ${loc.label}`" @change="setDefaultLocale(loc.code)" />
            <Space v-else-if="column.key === 'actions'" :size="8" class="locale-row-actions">
              <Button type="link" @click="editLanguage(loc)">编辑</Button>
              <Button type="link" @click="downloadLocalePackage(loc.code)"><template #icon><DownloadOutlined /></template>下载</Button>
              <Button v-if="loc.custom" type="link" danger @click="removeLanguage(loc)">删除</Button>
              <TypographyText v-else type="secondary">内置</TypographyText>
            </Space>
            <template v-else>{{ loc[column.key] ?? '—' }}</template>
          </template>
        </Table>
        <div class="locale-switch-row">
          <Space direction="vertical" :size="0">
            <TypographyText strong>前台显示语言切换</TypographyText>
            <TypographyText type="secondary">关闭后顶栏与移动端菜单中的语言入口将隐藏（仍使用默认语言展示页面）。</TypographyText>
          </Space>
          <Switch v-model:checked="config.i18n.languageSwitcherEnabled" aria-label="前台语言切换" checked-children="显示" un-checked-children="隐藏" />
        </div>
      </Card>

      <Card title="手机区号" :bordered="false">
        <template #extra>
          <Space :size="8">
            <Button @click="selectAllDialCodes">全部启用</Button>
            <Button type="primary" @click="openAddDialForm"><template #icon><PlusOutlined /></template>添加区号</Button>
          </Space>
        </template>
        <Alert v-if="!config.phoneLoginEnabled" type="info" show-icon class="locale-alert">
          <template #message>当前未启用「手机号码登录」，前台手机区号固定为 +86。需要按下方列表展示时，请前往 <RouterLink to="/admin/system/site-config">站点配置 → 登录方式</RouterLink> 开启。</template>
        </Alert>
        <Table :columns="dialColumns" :data-source="dialsTableRows" :pagination="false" row-key="dial" size="middle" :scroll="tableScroll(dialColumns)" :locale="{ emptyText: '暂无区号' }">
          <template #bodyCell="{ column, record: row }">
            <span v-if="column.key === 'icon'" class="locale-icon">
              <img v-if="isImageIcon(row.icon)" :src="row.icon" :alt="row.label" />
              <span v-else>{{ row.icon || '□' }}</span>
            </span>
            <span v-else-if="column.key === 'dial'" class="font-mono">{{ row.dial }}</span>
            <InputNumber v-else-if="column.key === 'sort'" :value="config.dialSortOrder?.[row.dial] ?? 0" :precision="0" :aria-label="`${row.label} 排序权重`" class="locale-weight" @update:value="onDialSortInput(row.dial, $event)" />
            <Checkbox v-else-if="column.key === 'enabled'" :checked="config.allowedDialCodes?.includes(row.dial)" :aria-label="`启用区号 ${row.label}`" @change="toggleDial(row.dial, $event.target.checked)" />
            <Space v-else-if="column.key === 'actions'" :size="8" class="locale-row-actions">
              <Button type="link" @click="editCustomDial(row)">编辑</Button>
              <Button v-if="row.custom" type="link" danger @click="removeCustomDial(row)">删除</Button>
              <TypographyText v-else type="secondary">内置</TypographyText>
            </Space>
            <template v-else>{{ row[column.key] ?? '—' }}</template>
          </template>
        </Table>
      </Card>

      <Card class="locale-footer" :bordered="false" :body-style="{ padding: '12px 24px' }">
        <div class="locale-actions">
          <Space :size="8" wrap>
            <Button :disabled="isSaving" @click="loadConfig">重置</Button>
            <Button type="primary" :loading="isSaving" @click="saveConfig">保存</Button>
          </Space>
        </div>
      </Card>
    </template>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(languageFormOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(640px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="resetLanguageForm"><template #title><template v-if="Boolean(languageFormOpen)"><div class="locale-modal-title"><span>{{ editingLocaleCode ? '编辑语言' : '添加语言' }}</span><a-button aria-label="关闭" type="text" html-type="button" @click="resetLanguageForm"><CloseOutlined /></a-button></div></template></template><template v-if="languageFormOpen">
          <Form layout="vertical" name="locale-language-editor">
            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="语言代码" required extra="例如 en、zh-CN、vi">
                  <a-input v-model:value="languageForm.code" placeholder="vi" :disabled="Boolean(editingLocaleCode)" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="语言名称" required>
                  <a-input v-model:value="languageForm.label" placeholder="Tiếng Việt" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="简称">
                  <a-input v-model:value="languageForm.short" placeholder="VI" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="图标">
                  <Space :size="8">
                    <span class="locale-icon">
                      <img v-if="isImageIcon(languageForm.icon)" :src="languageForm.icon" alt="图标预览" />
                      <span v-else>{{ languageForm.icon || '□' }}</span>
                    </span>
                    <a-button html-type="button" @click="languageIconInput?.click()"><UploadOutlined />上传图片</a-button>
                    <input ref="languageIconInput" class="locale-file" type="file" accept="image/*" @change="onLanguageIconUpload" />
                  </Space>
                </FormItem>
              </Col>
            </Row>
            <FormItem label="语言文件" :extra="languageForm.fileName || '可上传 JSON 文件；不上传则只保存语言信息。'">
              <a-button html-type="button" @click="languageFileInput?.click()"><UploadOutlined />选择文件</a-button>
              <input ref="languageFileInput" class="locale-file" type="file" accept=".json,application/json" @change="onLanguageFormFile" />
            </FormItem>
          </Form></template><template #footer><template v-if="Boolean(languageFormOpen)"><Space :size="8">
            <a-button html-type="button" @click="resetLanguageForm">取消</a-button>
            <a-button html-type="button" type="primary" @click="saveLanguage">{{ editingLocaleCode ? '确定' : '添加' }}</a-button>
          </Space></template></template></a-modal>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(dialFormOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(640px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="resetCustomDialForm"><template #title><template v-if="Boolean(dialFormOpen)"><div class="locale-modal-title"><span>{{ editingCustomDial ? '编辑区号' : '添加区号' }}</span><a-button aria-label="关闭" type="text" html-type="button" @click="resetCustomDialForm"><CloseOutlined /></a-button></div></template></template><template v-if="dialFormOpen">
          <Form layout="vertical" name="locale-dial-editor">
            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="国际区号" required extra="+ 加数字，例如 +84">
                  <a-input v-model:value="customDialForm.dial" placeholder="+84" :disabled="Boolean(editingCustomDial)" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="地区名称" required>
                  <a-input v-model:value="customDialForm.label" placeholder="越南 +84" />
                </FormItem>
              </Col>
            </Row>
            <FormItem label="图标">
              <Space :size="8">
                <span class="locale-icon">
                  <img v-if="isImageIcon(customDialForm.icon)" :src="customDialForm.icon" alt="图标预览" />
                  <span v-else>{{ customDialForm.icon || '□' }}</span>
                </span>
                <a-button html-type="button" @click="dialIconInput?.click()"><UploadOutlined />上传图片</a-button>
                <input ref="dialIconInput" class="locale-file" type="file" accept="image/*" @change="onCustomDialIconUpload" />
              </Space>
            </FormItem>
          </Form></template><template #footer><template v-if="Boolean(dialFormOpen)"><Space :size="8">
            <a-button html-type="button" @click="resetCustomDialForm">取消</a-button>
            <a-button html-type="button" type="primary" @click="saveCustomDial">{{ editingCustomDial ? '确定' : '添加' }}</a-button>
          </Space></template></template></a-modal>
  </PageShell>
</template>

<style scoped>
.locale-loading{display:block;padding:32px 0}
.locale-icon{display:inline-flex;align-items:center;justify-content:center;width:44px;height:32px;overflow:hidden;border:1px solid rgb(5 5 5 / 6%);border-radius:6px;font-size:16px}
.locale-icon img{width:100%;height:100%;object-fit:cover}
.locale-weight{width:104px}
.locale-file[type="file"]{display:none}
.locale-alert{margin-bottom:16px}
.locale-switch-row{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-top:24px}
.locale-footer{position:sticky;bottom:0;z-index:10}
.locale-actions{display:flex;justify-content:flex-end}
.locale-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.locale-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
