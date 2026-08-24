<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  DEFAULT_SITE_CONFIG,
  siteConfigApi
} from '../../../admin/mock/siteConfig'
import { normalizeFrontNews } from '../../../admin/mock/frontNews'
import { FRONT_LOCALE_CATALOG } from '../../../admin/constants/i18nCatalog'

const config = ref({ ...DEFAULT_SITE_CONFIG })
const loading = ref(false)
const isSaving = ref(false)
const resultMessage = ref('')
const keyword = ref('')
const statusFilter = ref('all')
const languageFilter = ref('')
const currentPage = ref(1)
const pageSize = 10
const modalOpen = ref(false)
const editingId = ref('')
const customSelectOpen = ref('')
const customActiveIndex = ref({})
const editorRef = ref(null)

const formTitle = ref('')
const formSummary = ref('')
const formLocale = ref('zh-CN')
const formHtml = ref('<p></p>')
const formEnabled = ref(true)
const formPublishedAt = ref('')
const formSort = ref(0)

const statusFilterOptions = [
  { value: 'all', label: '全部状态' },
  { value: 'enabled', label: '展示中' },
  { value: 'disabled', label: '已停用' }
]

const enabledOptions = [
  { value: true, label: '展示中' },
  { value: false, label: '已停用' }
]

const rows = computed(() => config.value.frontNews || [])
const enabledCount = computed(() => rows.value.filter((row) => row.enabled).length)
const localeOptions = computed(() => {
  const custom = Array.isArray(config.value.customLocales) ? config.value.customLocales : []
  const catalog = [...FRONT_LOCALE_CATALOG, ...custom]
  const enabled = config.value.i18n?.enabledLocales?.length ? config.value.i18n.enabledLocales : ['zh-CN']
  const order = config.value.i18n?.localeSortOrder || {}
  return [...enabled]
    .sort((a, b) => {
      const da = Number.isFinite(order[a]) ? order[a] : 999999
      const db = Number.isFinite(order[b]) ? order[b] : 999999
      if (da !== db) return da - db
      return catalog.findIndex((x) => x.code === a) - catalog.findIndex((x) => x.code === b)
    })
    .map((code) => {
      const base = catalog.find((x) => x.code === code) || { code, label: code, short: code }
      const override = config.value.i18n?.localeMetaOverrides?.[code] || {}
      return {
        code,
        label: override.label || base.label || code,
        short: override.short || base.short || code
      }
    })
})
const defaultLocale = computed(() => {
  const code = config.value.i18n?.defaultLocale
  return localeOptions.value.some((item) => item.code === code) ? code : localeOptions.value[0]?.code || 'zh-CN'
})
const languageFilterOptions = computed(() => [
  { value: '', label: '全部语言' },
  ...localeOptions.value.map((loc) => ({
    value: loc.code,
    label: `${loc.label}（${loc.short || loc.code}）`
  }))
])

const selectOptionMap = computed(() => ({
  statusFilter: statusFilterOptions,
  languageFilter: languageFilterOptions.value,
  formLocale: localeOptions.value.map((loc) => ({
    value: loc.code,
    label: `${loc.label}（${loc.short || loc.code}）`
  })),
  enabled: enabledOptions
}))

const selectValueMap = computed(() => ({
  statusFilter: statusFilter.value,
  languageFilter: languageFilter.value,
  formLocale: formLocale.value,
  enabled: formEnabled.value
}))

const filteredRows = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    const statusOk =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'enabled' && row.enabled) ||
      (statusFilter.value === 'disabled' && !row.enabled)
    const localeOk = !languageFilter.value || row.locale === languageFilter.value
    const content = [row.title, row.summary, row.locale, localeLabel(row.locale), row.publishedAt].join(' ').toLowerCase()
    return statusOk && localeOk && (!text || content.includes(text))
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
const pagedRows = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})

function nowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function resetListPage() {
  currentPage.value = 1
}

function clampPage() {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  if (currentPage.value < 1) currentPage.value = 1
}

function goPrev() {
  currentPage.value = Math.max(1, currentPage.value - 1)
}

function goNext() {
  currentPage.value = Math.min(totalPages.value, currentPage.value + 1)
}

function getCustomOptions(key) {
  return selectOptionMap.value[key] || []
}

function getCustomSelectedOption(key) {
  const current = selectValueMap.value[key]
  return getCustomOptions(key).find((option) => option.value === current) || getCustomOptions(key)[0]
}

function getCustomActiveIndex(key) {
  const options = getCustomOptions(key)
  const saved = customActiveIndex.value[key]
  if (Number.isInteger(saved) && saved >= 0 && saved < options.length) return saved
  const selected = getCustomSelectedOption(key)
  const index = options.findIndex((option) => option.value === selected?.value)
  return Math.max(0, index)
}

function setCustomActiveIndex(key, index) {
  customActiveIndex.value = { ...customActiveIndex.value, [key]: index }
}

function openCustomSelect(key) {
  setCustomActiveIndex(key, getCustomActiveIndex(key))
  customSelectOpen.value = key
}

function closeCustomSelect(key) {
  if (customSelectOpen.value === key) customSelectOpen.value = ''
}

function toggleCustomSelect(key) {
  if (customSelectOpen.value === key) {
    closeCustomSelect(key)
  } else {
    openCustomSelect(key)
  }
}

function commitCustomSelect(key, value) {
  if (key === 'statusFilter') statusFilter.value = value
  if (key === 'languageFilter') languageFilter.value = value
  if (key === 'formLocale') formLocale.value = value || defaultLocale.value
  if (key === 'enabled') formEnabled.value = value
  resetListPage()
  closeCustomSelect(key)
}

function onCustomSelectKeydown(key, event) {
  const options = getCustomOptions(key)
  if (!options.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (customSelectOpen.value !== key) openCustomSelect(key)
    setCustomActiveIndex(key, Math.min(options.length - 1, getCustomActiveIndex(key) + 1))
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (customSelectOpen.value !== key) openCustomSelect(key)
    setCustomActiveIndex(key, Math.max(0, getCustomActiveIndex(key) - 1))
    return
  }
  if (event.key === 'Home') {
    event.preventDefault()
    setCustomActiveIndex(key, 0)
    openCustomSelect(key)
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    setCustomActiveIndex(key, options.length - 1)
    openCustomSelect(key)
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (customSelectOpen.value !== key) {
      openCustomSelect(key)
    } else {
      commitCustomSelect(key, options[getCustomActiveIndex(key)]?.value)
    }
    return
  }
  if (event.key === 'Escape' && customSelectOpen.value === key) {
    event.preventDefault()
    closeCustomSelect(key)
  }
}

function pullEditorHtml() {
  formHtml.value = editorRef.value?.innerHTML?.trim() || '<p></p>'
}

function exec(command, value = null) {
  editorRef.value?.focus()
  document.execCommand(command, false, value)
  pullEditorHtml()
}

function setBlock(tag) {
  exec('formatBlock', tag)
}

async function syncEditor() {
  await nextTick()
  if (editorRef.value) editorRef.value.innerHTML = formHtml.value || '<p></p>'
}

function resetForm() {
  editingId.value = ''
  formTitle.value = ''
  formSummary.value = ''
  formLocale.value = defaultLocale.value
  formHtml.value = '<p></p>'
  formEnabled.value = true
  formPublishedAt.value = nowText()
  formSort.value = rows.value.length * 10
  customSelectOpen.value = ''
}

async function openAdd() {
  resetForm()
  modalOpen.value = true
  await syncEditor()
}

async function openEdit(row) {
  editingId.value = row.id
  formTitle.value = row.title || ''
  formSummary.value = row.summary || ''
  formLocale.value = row.locale || defaultLocale.value
  formHtml.value = row.html || '<p></p>'
  formEnabled.value = row.enabled !== false
  formPublishedAt.value = row.publishedAt || nowText()
  formSort.value = Number(row.sort) || 0
  customSelectOpen.value = ''
  modalOpen.value = true
  await syncEditor()
}

function closeModal() {
  if (isSaving.value) return
  modalOpen.value = false
  customSelectOpen.value = ''
}

async function load() {
  loading.value = true
  resultMessage.value = ''
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = { ...DEFAULT_SITE_CONFIG, ...result.data }
      config.value.frontNews = normalizeFrontNews(config.value.frontNews, config.value.i18n?.defaultLocale || 'zh-CN')
      clampPage()
    }
  } catch (error) {
    resultMessage.value = `加载失败：${error?.message || '未知错误'}`
  } finally {
    loading.value = false
  }
}

async function persist(message) {
  isSaving.value = true
  resultMessage.value = ''
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      resultMessage.value = message || result.message || '新闻配置已保存'
      await load()
    }
  } catch (error) {
    resultMessage.value = `保存失败：${error?.message || '未知错误'}`
  } finally {
    isSaving.value = false
  }
}

async function submitModal() {
  pullEditorHtml()
  const title = formTitle.value.trim()
  if (!title) {
    resultMessage.value = '请填写新闻标题'
    return
  }
  const id = editingId.value || `news_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const locale = formLocale.value || defaultLocale.value
  const summary = formSummary.value.trim()
  const html = formHtml.value || '<p></p>'
  const row = {
    id,
    locale,
    title,
    summary,
    html,
    locales: {
      [locale]: {
        title,
        summary,
        html
      }
    },
    enabled: formEnabled.value,
    publishedAt: formPublishedAt.value.trim() || nowText(),
    sort: Number(formSort.value) || 0
  }
  const list = editingId.value
    ? rows.value.map((item) => (item.id === editingId.value ? row : item))
    : [...rows.value, row]
  config.value.frontNews = normalizeFrontNews(list, defaultLocale.value)
  await persist(editingId.value ? '新闻已更新' : '新闻已发布')
  closeModal()
}

async function removeRow(row) {
  if (!confirm(`确定删除该新闻？（${row.title}）`)) return
  config.value.frontNews = normalizeFrontNews(rows.value.filter((item) => item.id !== row.id), defaultLocale.value)
  await persist('新闻已删除')
}

function localeLabel(code) {
  const option = localeOptions.value.find((item) => item.code === code)
  return option ? `${option.label} (${option.short || option.code})` : code || '未设置'
}

onMounted(load)
</script>

<template>
  <main class="space-y-6" aria-labelledby="front-news-admin-title">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 id="front-news-admin-title" class="text-2xl font-bold text-slate-900">新闻资讯</h1>
        <p class="mt-1 text-sm text-slate-500">
          管理前台首页底部新闻模块与新闻资讯独立路由展示内容。
        </p>
      </div>
      <button type="button" class="ant-btn ant-btn-primary shrink-0" :disabled="loading" @click="openAdd">
        发布新闻
      </button>
    </header>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs text-slate-500">全部新闻</p>
        <p class="mt-2 text-2xl font-bold text-slate-900">{{ rows.length }}</p>
      </div>
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs text-slate-500">前台展示中</p>
        <p class="mt-2 text-2xl font-bold text-emerald-700">{{ enabledCount }}</p>
      </div>
    </div>

    <p
      v-if="resultMessage"
      class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
      role="status"
    >
      {{ resultMessage }}
    </p>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <section v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="新闻资讯列表">
      <div class="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row">
          <input
            v-model="keyword"
            type="search"
            class="ant-input w-full sm:max-w-xs"
            placeholder="搜索标题、摘要、语言、发布时间"
            aria-label="搜索新闻"
            @input="resetListPage"
          />
          <div class="relative w-full sm:max-w-xs">
            <div
              id="front-news-status-filter-combobox"
              role="combobox"
              tabindex="0"
              aria-haspopup="listbox"
              aria-controls="front-news-status-filter-listbox"
              aria-label="筛选新闻状态"
              :aria-expanded="customSelectOpen === 'statusFilter' ? 'true' : 'false'"
              :aria-activedescendant="
                customSelectOpen === 'statusFilter'
                  ? `front-news-status-filter-option-${getCustomActiveIndex('statusFilter')}`
                  : undefined
              "
              class="ant-input admin-select-trigger w-full cursor-pointer gap-3"
              @click="toggleCustomSelect('statusFilter')"
              @keydown="onCustomSelectKeydown('statusFilter', $event)"
              @blur="closeCustomSelect('statusFilter')"
            >
              <span class="min-w-0 truncate">{{ getCustomSelectedOption('statusFilter')?.label }}</span>
              <span aria-hidden="true" class="admin-select-chevron" :class="customSelectOpen === 'statusFilter' ? 'rotate-180' : ''">
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </div>
            <ul
              v-if="customSelectOpen === 'statusFilter'"
              id="front-news-status-filter-listbox"
              role="listbox"
              aria-label="筛选新闻状态"
              class="news-select-popup"
            >
              <li
                v-for="(option, index) in statusFilterOptions"
                :id="`front-news-status-filter-option-${index}`"
                :key="String(option.value)"
                role="option"
                :aria-selected="index === getCustomActiveIndex('statusFilter') ? 'true' : 'false'"
                class="news-select-option"
                :class="index === getCustomActiveIndex('statusFilter') ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'"
                @mousedown.prevent
                @mouseenter="setCustomActiveIndex('statusFilter', index)"
                @click="commitCustomSelect('statusFilter', option.value)"
              >
                {{ option.label }}
              </li>
            </ul>
          </div>
          <div class="relative w-full sm:max-w-xs">
            <div
              id="front-news-language-filter-combobox"
              role="combobox"
              tabindex="0"
              aria-haspopup="listbox"
              aria-controls="front-news-language-filter-listbox"
              aria-label="按新闻语言筛选"
              :aria-expanded="customSelectOpen === 'languageFilter' ? 'true' : 'false'"
              :aria-activedescendant="
                customSelectOpen === 'languageFilter'
                  ? `front-news-language-filter-option-${getCustomActiveIndex('languageFilter')}`
                  : undefined
              "
              class="ant-input admin-select-trigger w-full cursor-pointer gap-3"
              @click="toggleCustomSelect('languageFilter')"
              @keydown="onCustomSelectKeydown('languageFilter', $event)"
              @blur="closeCustomSelect('languageFilter')"
            >
              <span class="min-w-0 truncate">{{ getCustomSelectedOption('languageFilter')?.label }}</span>
              <span aria-hidden="true" class="admin-select-chevron" :class="customSelectOpen === 'languageFilter' ? 'rotate-180' : ''">
                <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                  <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
            </div>
            <ul
              v-if="customSelectOpen === 'languageFilter'"
              id="front-news-language-filter-listbox"
              role="listbox"
              aria-label="按新闻语言筛选"
              class="news-select-popup max-h-64 overflow-y-auto"
            >
              <li
                v-for="(option, index) in languageFilterOptions"
                :id="`front-news-language-filter-option-${index}`"
                :key="String(option.value)"
                role="option"
                :aria-selected="index === getCustomActiveIndex('languageFilter') ? 'true' : 'false'"
                class="news-select-option"
                :class="index === getCustomActiveIndex('languageFilter') ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'"
                @mousedown.prevent
                @mouseenter="setCustomActiveIndex('languageFilter', index)"
                @click="commitCustomSelect('languageFilter', option.value)"
              >
                {{ option.label }}
              </li>
            </ul>
          </div>
        </div>
        <p class="text-xs text-slate-500">
          共 {{ filteredRows.length }} 条，当前第 {{ currentPage }} / {{ totalPages }} 页
        </p>
      </div>

      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50/80">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-slate-700">新闻</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">语言</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">发布时间</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">状态</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">排序</th>
              <th class="px-4 py-3 text-right font-medium text-slate-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="row in pagedRows" :key="row.id">
              <td class="px-4 py-3">
                <div class="font-medium text-slate-900">{{ row.title }}</div>
                <div class="mt-1 max-w-xl truncate text-xs text-slate-500">{{ row.summary || '-' }}</div>
              </td>
              <td class="px-4 py-3 text-xs text-slate-600">{{ localeLabel(row.locale) }}</td>
              <td class="px-4 py-3 font-mono text-xs text-slate-600">{{ row.publishedAt }}</td>
              <td class="px-4 py-3">
                <span :class="row.enabled ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800' : 'text-slate-500'">
                  {{ row.enabled ? '展示中' : '已停用' }}
                </span>
              </td>
              <td class="px-4 py-3 tabular-nums text-slate-600">{{ row.sort }}</td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <button type="button" class="text-indigo-600 hover:underline" @click="openEdit(row)">编辑</button>
                <span class="mx-2 text-slate-300">|</span>
                <button type="button" class="text-red-600 hover:underline" @click="removeRow(row)">删除</button>
              </td>
            </tr>
            <tr v-if="pagedRows.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-sm text-slate-500">
                暂无匹配新闻。
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
        <span class="text-xs text-slate-500">每页 {{ pageSize }} 条</span>
        <div class="flex items-center gap-2">
          <button type="button" class="ant-btn ant-btn-sm" :disabled="currentPage <= 1" @click="goPrev">上一页</button>
          <span class="text-xs font-medium text-slate-600">{{ currentPage }} / {{ totalPages }}</span>
          <button type="button" class="ant-btn ant-btn-sm" :disabled="currentPage >= totalPages" @click="goNext">下一页</button>
        </div>
      </footer>
    </section>

    <Teleport to="body">
      <div v-if="modalOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4">
        <section
          class="flex max-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl supports-[height:100dvh]:max-h-[calc(100dvh-2rem)]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="front-news-editor-title"
        >
          <div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="front-news-editor-title" class="text-lg font-semibold text-slate-900">
              {{ editingId ? '编辑新闻' : '发布新闻' }}
            </h2>
            <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="关闭" @click="closeModal">
              <span aria-hidden="true">×</span>
            </button>
          </div>
          <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div class="space-y-4">
                <div>
                  <label for="front-news-title-input" class="mb-1.5 block text-sm font-medium text-slate-700">新闻标题</label>
                  <input
                    id="front-news-title-input"
                    v-model="formTitle"
                    class="ant-input w-full"
                    type="text"
                    placeholder="请输入新闻标题"
                    required
                  />
                </div>
                <div>
                  <label for="front-news-summary-input" class="mb-1.5 block text-sm font-medium text-slate-700">摘要</label>
                  <textarea
                    id="front-news-summary-input"
                    v-model="formSummary"
                    class="ant-input min-h-20 w-full resize-y"
                    placeholder="用于首页和列表展示的一句话摘要"
                  />
                </div>
                <div>
                  <label for="front-news-content-editor" class="mb-1.5 block text-sm font-medium text-slate-700">新闻内容</label>
                  <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div class="flex flex-wrap gap-2 border-b border-slate-200 p-3">
                      <button type="button" class="ant-btn ant-btn-sm" @click="setBlock('H2')">H2</button>
                      <button type="button" class="ant-btn ant-btn-sm" @click="setBlock('P')">正文</button>
                      <button type="button" class="ant-btn ant-btn-sm" @click="exec('bold')">B</button>
                      <button type="button" class="ant-btn ant-btn-sm italic" @click="exec('italic')">I</button>
                      <button type="button" class="ant-btn ant-btn-sm" @click="exec('insertUnorderedList')">列表</button>
                    </div>
                    <div
                      id="front-news-content-editor"
                      ref="editorRef"
                      class="news-editor min-h-56 bg-white p-4 text-sm leading-7 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                      contenteditable="true"
                      role="textbox"
                      aria-multiline="true"
                      aria-label="新闻内容"
                      @input="pullEditorHtml"
                      @blur="pullEditorHtml"
                    />
                  </div>
                </div>
              </div>

              <aside class="space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div>
                  <label id="front-news-locale-label" class="mb-1.5 block text-sm font-medium text-slate-700">新闻语言</label>
                  <div class="relative">
                    <div
                      id="front-news-locale-combobox"
                      role="combobox"
                      tabindex="0"
                      aria-haspopup="listbox"
                      aria-controls="front-news-locale-listbox"
                      aria-labelledby="front-news-locale-label"
                      :aria-expanded="customSelectOpen === 'formLocale' ? 'true' : 'false'"
                      :aria-activedescendant="
                        customSelectOpen === 'formLocale'
                          ? `front-news-locale-option-${getCustomActiveIndex('formLocale')}`
                          : undefined
                      "
                      class="ant-input admin-select-trigger w-full cursor-pointer gap-3"
                      @click="toggleCustomSelect('formLocale')"
                      @keydown="onCustomSelectKeydown('formLocale', $event)"
                      @blur="closeCustomSelect('formLocale')"
                    >
                      <span class="min-w-0 truncate">{{ getCustomSelectedOption('formLocale')?.label }}</span>
                      <span aria-hidden="true" class="admin-select-chevron" :class="customSelectOpen === 'formLocale' ? 'rotate-180' : ''">
                        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </span>
                    </div>
                    <ul
                      v-if="customSelectOpen === 'formLocale'"
                      id="front-news-locale-listbox"
                      role="listbox"
                      aria-labelledby="front-news-locale-label"
                      class="news-select-popup max-h-64 overflow-y-auto"
                    >
                      <li
                        v-for="(option, index) in selectOptionMap.formLocale"
                        :id="`front-news-locale-option-${index}`"
                        :key="String(option.value)"
                        role="option"
                        :aria-selected="index === getCustomActiveIndex('formLocale') ? 'true' : 'false'"
                        class="news-select-option"
                        :class="index === getCustomActiveIndex('formLocale') ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'"
                        @mousedown.prevent
                        @mouseenter="setCustomActiveIndex('formLocale', index)"
                        @click="commitCustomSelect('formLocale', option.value)"
                      >
                        {{ option.label }}
                      </li>
                    </ul>
                  </div>
                  <p class="mt-2 text-xs leading-5 text-slate-500">
                    每次发布只保存当前选择语言的一条新闻。
                  </p>
                </div>
                <div>
                  <label id="front-news-enabled-label" class="mb-1.5 block text-sm font-medium text-slate-700">状态</label>
                  <div class="relative">
                    <div
                      id="front-news-enabled-combobox"
                      role="combobox"
                      tabindex="0"
                      aria-haspopup="listbox"
                      aria-controls="front-news-enabled-listbox"
                      aria-labelledby="front-news-enabled-label"
                      :aria-expanded="customSelectOpen === 'enabled' ? 'true' : 'false'"
                      :aria-activedescendant="
                        customSelectOpen === 'enabled'
                          ? `front-news-enabled-option-${getCustomActiveIndex('enabled')}`
                          : undefined
                      "
                      class="ant-input admin-select-trigger w-full cursor-pointer gap-3"
                      @click="toggleCustomSelect('enabled')"
                      @keydown="onCustomSelectKeydown('enabled', $event)"
                      @blur="closeCustomSelect('enabled')"
                    >
                      <span class="min-w-0 truncate">{{ getCustomSelectedOption('enabled')?.label }}</span>
                      <span aria-hidden="true" class="admin-select-chevron" :class="customSelectOpen === 'enabled' ? 'rotate-180' : ''">
                        <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                          <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                      </span>
                    </div>
                    <ul
                      v-if="customSelectOpen === 'enabled'"
                      id="front-news-enabled-listbox"
                      role="listbox"
                      aria-labelledby="front-news-enabled-label"
                      class="news-select-popup"
                    >
                      <li
                        v-for="(option, index) in enabledOptions"
                        :id="`front-news-enabled-option-${index}`"
                        :key="String(option.value)"
                        role="option"
                        :aria-selected="index === getCustomActiveIndex('enabled') ? 'true' : 'false'"
                        class="news-select-option"
                        :class="index === getCustomActiveIndex('enabled') ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'"
                        @mousedown.prevent
                        @mouseenter="setCustomActiveIndex('enabled', index)"
                        @click="commitCustomSelect('enabled', option.value)"
                      >
                        {{ option.label }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div>
                  <label for="front-news-published-at-input" class="mb-1.5 block text-sm font-medium text-slate-700">发布时间</label>
                  <input
                    id="front-news-published-at-input"
                    v-model="formPublishedAt"
                    class="ant-input w-full"
                    type="text"
                    placeholder="2026-08-24 10:00"
                  />
                </div>
                <div>
                  <label for="front-news-sort-input" class="mb-1.5 block text-sm font-medium text-slate-700">排序</label>
                  <input
                    id="front-news-sort-input"
                    v-model.number="formSort"
                    class="ant-input w-full"
                    type="number"
                    min="0"
                    step="1"
                  />
                  <p class="mt-2 text-xs leading-5 text-slate-500">
                    数字越小越靠前；排序相同则按发布时间倒序展示。
                  </p>
                </div>
              </aside>
            </div>
          </div>
          <footer class="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end">
            <button type="button" class="ant-btn" :disabled="isSaving" @click="closeModal">取消</button>
            <button type="button" class="ant-btn ant-btn-primary" :disabled="isSaving" @click="submitModal">
              {{ isSaving ? '保存中…' : '保存新闻' }}
            </button>
          </footer>
        </section>
      </div>
    </Teleport>
  </main>
</template>

<style scoped>
.admin-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 2.5rem;
  padding-right: 0.75rem;
  appearance: none;
}

.admin-select-chevron {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  color: rgb(100 116 139);
  transition: transform 150ms ease;
}

.news-select-popup {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 0.375rem);
  z-index: 30;
  border-radius: 0.5rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.25rem;
  font-size: 0.875rem;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
}

.news-select-option {
  cursor: pointer;
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  color: rgb(51 65 85);
}

.news-editor :deep(h2) {
  margin: 0.65rem 0;
  color: rgb(15 23 42);
  font-size: 1.125rem;
  font-weight: 700;
}

.news-editor :deep(p) {
  margin: 0.65rem 0;
}

.news-editor :deep(ul) {
  margin: 0.65rem 0 0.65rem 1.25rem;
  list-style: disc;
}
</style>
