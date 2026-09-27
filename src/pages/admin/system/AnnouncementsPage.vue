<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import {
  DEFAULT_SITE_CONFIG,
  normalizeSiteAnnouncements,
  siteConfigApi
} from '../../../admin/mock/siteConfig'
import { FRONT_LOCALE_CATALOG } from '../../../admin/constants/i18nCatalog'

const config = ref({ ...DEFAULT_SITE_CONFIG })
const loading = ref(true)
const isSaving = ref(false)
const keyword = ref('')
const statusFilter = ref('')
const languageFilter = ref('')
const currentPage = ref(1)
const pageSize = 10
const resultMessage = ref('')
const editorRef = ref(null)

const rows = computed(() => config.value.announcements || [])
const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return rows.value.filter((row) => {
    if (statusFilter.value === 'enabled' && !row.enabled) return false
    if (statusFilter.value === 'disabled' && row.enabled) return false
    if (languageFilter.value && row.locale !== languageFilter.value) return false
    if (!q) return true
    return [row.title, row.summary, row.publishedAt, row.locale]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(q))
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))
const pagedRows = computed(() => {
  const page = Math.min(currentPage.value, totalPages.value)
  const start = (page - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})
const enabledCount = computed(() => rows.value.filter((row) => row.enabled).length)

const modalOpen = ref(false)
const editingId = ref(null)
const formTitle = ref('')
const formSummary = ref('')
const formHtml = ref('<p></p>')
const formEnabled = ref(true)
const formPublishedAt = ref('')
const formSort = ref(0)
const formLocale = ref('zh-CN')
const localeSelectOpen = ref(false)
const localeActiveIndex = ref(0)
const customSelectOpen = ref('')
const customSelectActiveIndexes = ref({})

const statusFilterOptions = [
  { value: '', label: '全部公告' },
  { value: 'enabled', label: '仅展示中' },
  { value: 'disabled', label: '仅停用' }
]

const enabledOptions = [
  { value: true, label: '展示中' },
  { value: false, label: '停用' }
]

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
const selectedLocaleOption = computed(
  () => localeOptions.value.find((item) => item.code === formLocale.value) || localeOptions.value[0] || {
    code: formLocale.value,
    label: formLocale.value,
    short: formLocale.value
  }
)
const activeLocaleOption = computed(() => localeOptions.value[localeActiveIndex.value] || selectedLocaleOption.value)
const languageFilterOptions = computed(() => [
  { value: '', label: '全部语言' },
  ...localeOptions.value.map((loc) => ({
    value: loc.code,
    label: `${loc.label}（${loc.short || loc.code}）`
  }))
])

function getCustomSelectOptions(name) {
  if (name === 'statusFilter') return statusFilterOptions
  if (name === 'languageFilter') return languageFilterOptions.value
  if (name === 'formEnabled') return enabledOptions
  return []
}

function getCustomSelectValue(name) {
  if (name === 'statusFilter') return statusFilter.value
  if (name === 'languageFilter') return languageFilter.value
  if (name === 'formEnabled') return formEnabled.value
  return ''
}

function setCustomSelectValue(name, value) {
  if (name === 'statusFilter') {
    statusFilter.value = value
    resetListPage()
  } else if (name === 'languageFilter') {
    languageFilter.value = value
    resetListPage()
  } else if (name === 'formEnabled') {
    formEnabled.value = value
  }
}

function getCustomSelectedOption(name) {
  const value = getCustomSelectValue(name)
  return getCustomSelectOptions(name).find((option) => option.value === value) || getCustomSelectOptions(name)[0]
}

function getCustomActiveIndex(name) {
  const options = getCustomSelectOptions(name)
  const saved = customSelectActiveIndexes.value[name]
  if (Number.isInteger(saved) && saved >= 0 && saved < options.length) return saved
  return Math.max(0, options.findIndex((option) => option.value === getCustomSelectValue(name)))
}

function setCustomActiveIndex(name, index) {
  customSelectActiveIndexes.value = {
    ...customSelectActiveIndexes.value,
    [name]: index
  }
}

function syncCustomActiveIndex(name) {
  const index = getCustomSelectOptions(name).findIndex((option) => option.value === getCustomSelectValue(name))
  setCustomActiveIndex(name, Math.max(0, index))
}

function openCustomSelect(name) {
  syncCustomActiveIndex(name)
  customSelectOpen.value = name
}

function closeCustomSelect(name) {
  if (!name || customSelectOpen.value === name) customSelectOpen.value = ''
}

function toggleCustomSelect(name) {
  if (customSelectOpen.value === name) {
    closeCustomSelect(name)
  } else {
    openCustomSelect(name)
  }
}

function commitCustomSelect(name, value) {
  const options = getCustomSelectOptions(name)
  if (!options.some((option) => option.value === value)) return
  setCustomSelectValue(name, value)
  syncCustomActiveIndex(name)
  closeCustomSelect(name)
}

function moveCustomActive(name, delta) {
  const options = getCustomSelectOptions(name)
  if (!options.length) return
  const nextIndex = (getCustomActiveIndex(name) + delta + options.length) % options.length
  setCustomActiveIndex(name, nextIndex)
}

function onCustomSelectKeydown(name, event) {
  const options = getCustomSelectOptions(name)
  if (!options.length) return
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (customSelectOpen.value !== name) openCustomSelect(name)
    else moveCustomActive(name, 1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (customSelectOpen.value !== name) openCustomSelect(name)
    else moveCustomActive(name, -1)
    return
  }
  if (event.key === 'Home') {
    event.preventDefault()
    setCustomActiveIndex(name, 0)
    openCustomSelect(name)
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    setCustomActiveIndex(name, options.length - 1)
    openCustomSelect(name)
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (customSelectOpen.value !== name) {
      openCustomSelect(name)
    } else {
      commitCustomSelect(name, options[getCustomActiveIndex(name)]?.value)
    }
    return
  }
  if (event.key === 'Escape' && customSelectOpen.value === name) {
    event.preventDefault()
    closeCustomSelect(name)
  }
}

function resetListPage() {
  currentPage.value = 1
}

function goPrev() {
  currentPage.value = Math.max(1, currentPage.value - 1)
}

function goNext() {
  currentPage.value = Math.min(totalPages.value, currentPage.value + 1)
}

function nowText() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function resetForm() {
  editingId.value = null
  formTitle.value = ''
  formSummary.value = ''
  formHtml.value = '<p></p>'
  formEnabled.value = true
  formPublishedAt.value = nowText()
  formSort.value = rows.value.length * 10
  formLocale.value = defaultLocale.value
  localeSelectOpen.value = false
  syncLocaleActiveIndex()
}

async function openAdd() {
  resetForm()
  modalOpen.value = true
  await nextTick()
  syncEditor()
}

async function openEdit(row) {
  editingId.value = row.id
  formLocale.value = row.locale || defaultLocale.value
  formTitle.value = row.title || ''
  formSummary.value = row.summary || ''
  formHtml.value = row.html || '<p></p>'
  formEnabled.value = row.enabled !== false
  formPublishedAt.value = row.publishedAt || nowText()
  formSort.value = Number(row.sort) || 0
  localeSelectOpen.value = false
  syncLocaleActiveIndex()
  modalOpen.value = true
  await nextTick()
  syncEditor()
}

function closeModal() {
  modalOpen.value = false
  localeSelectOpen.value = false
}

function syncEditor() {
  if (editorRef.value) editorRef.value.innerHTML = formHtml.value || '<p></p>'
}

function pullEditorHtml() {
  formHtml.value = editorRef.value?.innerHTML || ''
}

function localeLabel(code) {
  const option = localeOptions.value.find((item) => item.code === code)
  return option ? `${option.label} (${option.short || option.code})` : code || '未设置'
}

function syncLocaleActiveIndex(code = formLocale.value) {
  const index = localeOptions.value.findIndex((item) => item.code === code)
  localeActiveIndex.value = Math.max(0, index)
}

function openLocaleSelect() {
  syncLocaleActiveIndex()
  localeSelectOpen.value = true
}

function closeLocaleSelect() {
  localeSelectOpen.value = false
}

function toggleLocaleSelect() {
  if (localeSelectOpen.value) {
    closeLocaleSelect()
  } else {
    openLocaleSelect()
  }
}

function commitLocale(code) {
  if (!code) return
  formLocale.value = code
  syncLocaleActiveIndex(code)
  closeLocaleSelect()
}

function moveLocaleActive(delta) {
  const total = localeOptions.value.length
  if (!total) return
  localeActiveIndex.value = (localeActiveIndex.value + delta + total) % total
}

function onLocaleSelectKeydown(event) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!localeSelectOpen.value) openLocaleSelect()
    else moveLocaleActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!localeSelectOpen.value) openLocaleSelect()
    else moveLocaleActive(-1)
    return
  }
  if (event.key === 'Home') {
    event.preventDefault()
    localeActiveIndex.value = 0
    openLocaleSelect()
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    localeActiveIndex.value = Math.max(0, localeOptions.value.length - 1)
    openLocaleSelect()
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    if (!localeSelectOpen.value) {
      openLocaleSelect()
    } else {
      commitLocale(activeLocaleOption.value?.code)
    }
    return
  }
  if (event.key === 'Escape' && localeSelectOpen.value) {
    event.preventDefault()
    closeLocaleSelect()
  }
}

function exec(command, value = null) {
  editorRef.value?.focus()
  document.execCommand(command, false, value)
  pullEditorHtml()
}

function setBlock(tag) {
  exec('formatBlock', tag)
}

async function load() {
  loading.value = true
  resultMessage.value = ''
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = { ...DEFAULT_SITE_CONFIG, ...result.data }
      config.value.announcements = normalizeSiteAnnouncements(
        config.value.announcements,
        config.value.i18n?.defaultLocale || 'zh-CN'
      )
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
      resultMessage.value = message || result.message || '公告配置已保存'
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
    resultMessage.value = '请填写公告标题'
    return
  }
  const locale = formLocale.value || defaultLocale.value
  const summary = formSummary.value.trim()
  const html = formHtml.value || '<p></p>'
  const id =
    editingId.value ||
    `ann_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
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
  config.value.announcements = normalizeSiteAnnouncements(list, defaultLocale.value)
  await persist(editingId.value ? '公告已更新' : '公告已发布')
  closeModal()
}

async function removeRow(row) {
  if (!confirm(`确定删除该公告？（${row.title}）`)) return
  config.value.announcements = normalizeSiteAnnouncements(
    rows.value.filter((item) => item.id !== row.id),
    defaultLocale.value
  )
  await persist('公告已删除')
}

onMounted(load)
</script>

<template>
  <main class="space-y-6" aria-labelledby="announcements-title">
    <header class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <h1 id="announcements-title" class="text-2xl font-bold text-slate-900">站内公告</h1>
        <p class="mt-1 text-sm text-slate-500">
          发布后将在前台右上角公告中心展示，适合维护通知、费率说明和运营公告。
        </p>
      </div>
      <a-button html-type="button" class="shrink-0" :disabled="loading" @click="openAdd" type="primary">
        发布公告
      </a-button>
    </header>

    <div class="grid gap-3 sm:grid-cols-2">
      <div class="rounded-xl border border-slate-200 bg-white p-4">
        <p class="text-xs text-slate-500">全部公告</p>
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

    <section v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm" aria-label="站内公告列表">
      <div class="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-1 flex-col gap-3 sm:flex-row">
          <a-input v-model:value="keyword" type="search" class="w-full sm:max-w-xs" placeholder="搜索标题、摘要、发布时间" aria-label="搜索公告" @input="resetListPage" />
          <a-select class="w-full" id="announcement-status-filter-combobox" aria-label="筛选公告状态" :value="getCustomSelectedOption('statusFilter')?.value" :options="statusFilterOptions" @change="commitCustomSelect('statusFilter', $event)" />
          <a-select class="w-full" id="announcement-language-filter-combobox" aria-label="按公告语言筛选" :value="getCustomSelectedOption('languageFilter')?.value" :options="languageFilterOptions" @change="commitCustomSelect('languageFilter', $event)" />
        </div>
        <p class="text-xs text-slate-500">
          共 {{ filteredRows.length }} 条，当前第 {{ currentPage }} / {{ totalPages }} 页
        </p>
      </div>

      <div class="overflow-x-auto">
        <a-table  :data-source="pagedRows" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" >
<a-table-column key="column-0" ><template #title>公告</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="font-medium text-slate-900">{{ row.title }}</div>
                <div class="mt-1 max-w-xl truncate text-xs text-slate-500">{{ row.summary || '—' }}</div>
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>语言</template><template #default="{ record: row, index: index }"><div class="  text-xs text-slate-600">{{ localeLabel(row.locale) }}</div></template></a-table-column>
<a-table-column key="column-2" ><template #title>发布时间</template><template #default="{ record: row, index: index }"><div class="  font-mono text-xs text-slate-600">{{ row.publishedAt }}</div></template></a-table-column>
<a-table-column key="column-3" ><template #title>状态</template><template #default="{ record: row, index: index }"><div class=" ">
                <span :class="row.enabled ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800' : 'text-slate-500'">
                  {{ row.enabled ? '展示中' : '已停用' }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>排序</template><template #default="{ record: row, index: index }"><div class="  tabular-nums text-slate-600">{{ row.sort }}</div></template></a-table-column>
<a-table-column key="column-5" align="right"><template #title>操作</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap   text-right">
                <a-button html-type="button" class="text-indigo-600 hover:underline" @click="openEdit(row)">编辑</a-button>
                <span class="mx-2 text-slate-300">|</span>
                <a-button html-type="button" class="text-red-600 hover:underline" @click="removeRow(row)" danger>删除</a-button>
              </div></template></a-table-column><template #emptyText>
                暂无匹配公告。
              </template>
</a-table>
      </div>

      <footer class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
        <span class="text-xs text-slate-500">每页 {{ pageSize }} 条</span>
        <a-pagination  size="small" :current="currentPage" :page-size="pageSize" :total="filteredRows.length" :show-size-changer="false"  @change="currentPage = $event" />
      </footer>
    </section>

    <Teleport to="body">
      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(modalOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(modalOpen)"><div class="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="announcement-editor-title" class="text-lg font-semibold text-slate-900">
              {{ editingId ? '编辑公告' : '发布公告' }}
            </h2>
            <a-button aria-label="关闭" html-type="button" class="text-slate-500 hover:bg-slate-100 hover:text-slate-800"  @click="closeModal">
              <span aria-hidden="true">×</span>
            </a-button>
          </div></template></template><template v-if="modalOpen"><div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div class="space-y-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700" for="announcement-title">公告标题</label>
                  <a-input id="announcement-title" v-model:value="formTitle" class="w-full" placeholder="例如：系统维护公告" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700" for="announcement-summary">摘要</label>
                  <a-textarea id="announcement-summary" v-model:value="formSummary" class="w-full" placeholder="用于前台公告列表展示" />
                </div>
                <div class="flex min-h-[20rem] flex-col">
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">公告内容</label>
                  <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <div class="shrink-0 flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
                      <a-button html-type="button" class="text-xs" @click="setBlock('h2')">H2</a-button>
                      <a-button html-type="button" class="text-xs" @click="setBlock('p')">正文</a-button>
                      <a-button html-type="button" class="text-xs font-bold" @click="exec('bold')">B</a-button>
                      <a-button html-type="button" class="text-xs italic" @click="exec('italic')">I</a-button>
                      <a-button html-type="button" class="text-xs" @click="exec('insertUnorderedList')">列表</a-button>
                    </div>
                    <div
                      ref="editorRef"
                      class="announcement-editor min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none"
                      contenteditable="true"
                      role="textbox"
                      aria-label="公告内容"
                      @input="pullEditorHtml"
                      @blur="pullEditorHtml"
                    />
                  </div>
                </div>
              </div>

              <aside class="h-fit space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:sticky lg:top-0">
                <div>
                  <label id="announcement-locale-label" class="mb-1.5 block text-sm font-medium text-slate-700">
                    公告语言
                  </label>
                  <a-select class="w-full" id="announcement-locale-combobox" aria-labelledby="announcement-locale-label" :value="formLocale" :options="localeOptions.map(loc => ({ label: `${loc.label} ${loc.code}`, value: loc.code }))" @change="commitLocale" />
                  <p class="mt-1.5 text-xs text-slate-500">选择公告语言后，本次只发布该语言的一条公告。</p>
                </div>
                <label id="announcement-status-label" class="block text-sm font-medium text-slate-700">状态</label>
                <a-select class="w-full" id="announcement-status-combobox" aria-labelledby="announcement-status-label" :value="getCustomSelectedOption('formEnabled')?.value" :options="enabledOptions" @change="commitCustomSelect('formEnabled', $event)" />
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700" for="announcement-published-at">发布时间</label>
                  <a-input id="announcement-published-at" v-model:value="formPublishedAt" class="w-full font-mono" placeholder="2026-08-24 10:00" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700" for="announcement-sort">排序</label>
                  <a-input id="announcement-sort" type="number" class="w-full" :value="formSort" @update:value="formSort = $event === '' ? '' : Number($event)" />
                </div>
                <div class="rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-500">
                  前台公告按排序值从小到大展示；排序相同时，发布时间越新的越靠前。停用公告保留在后台，但不会出现在前台公告中心。
                </div>
              </aside>
            </div>
          </div></template><template #footer><template v-if="Boolean(modalOpen)"><footer class="shrink-0 flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <a-button html-type="button" class="" :disabled="isSaving" @click="closeModal">取消</a-button>
            <a-button html-type="button" class="" :disabled="isSaving" @click="submitModal" type="primary">
              {{ isSaving ? '保存中…' : '保存公告' }}
            </a-button>
          </footer></template></template></a-modal>
    </Teleport>
  </main>
</template>

<style scoped>
.admin-select-trigger {
  display: flex;
  min-height: 2rem;
  align-items: center;
  justify-content: space-between;
}

.announcement-editor :deep(h2) {
  margin: 1rem 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.announcement-editor :deep(p) {
  margin: 0.5rem 0;
}

.announcement-editor :deep(ul) {
  margin: 0.5rem 0 0.5rem 1.25rem;
  list-style: disc;
}
</style>
