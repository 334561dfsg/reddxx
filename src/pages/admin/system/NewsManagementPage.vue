<script setup>
// 内容管理 → 新闻资讯（旧前台）: Ant Design Pro list page (2026-11-28) — query card (标题, 摘要, 状态, 新闻语言,
// 发布日期), table card with toolbar and pagination, link actions, status Tag, toast feedback (Ant message) and an Ant
// delete confirmation. The hand-built combobox keyboard handling is gone: every select is an Ant Select.
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { Button, InputNumber, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {
  DEFAULT_SITE_CONFIG,
  siteConfigApi
} from '../../../admin/mock/siteConfig'
import { normalizeFrontNews } from '../../../admin/mock/frontNews'
import { FRONT_LOCALE_CATALOG } from '../../../admin/constants/i18nCatalog'

const config = ref({ ...DEFAULT_SITE_CONFIG })
const loading = ref(false)
const isSaving = ref(false)
const page = ref(1)
const blank = () => ({ title: '', summary: '', status: 'all', language: 'all', publishedAt: null })
const filters = ref(blank())
const statusFilter = computed(() => filters.value.status)
const languageFilter = computed(() => (filters.value.language === 'all' ? '' : filters.value.language))
const has = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const removeTarget = ref(null)
const modalOpen = ref(false)
const editingId = ref('')
const editorRef = ref(null)
const imageInputRef = ref(null)

const formTitle = ref('')
const formSummary = ref('')
const formImageUrl = ref('')
const formImageFileName = ref('')
const formImageError = ref('')
const imageUploadSession = ref(0)
const formLocale = ref('zh-CN')
const formHtml = ref('<p></p>')
const formEnabled = ref(true)
const formPublishedAt = ref('')
const formSort = ref(0)

const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
const IMAGE_MAX_SIZE = 2 * 1024 * 1024

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
const localeOptions = computed(() => {
  const custom = Array.isArray(config.value.customLocales) ? config.value.customLocales : []
  const catalog = [...FRONT_LOCALE_CATALOG, ...custom]
  const enabled = config.value.i18n?.enabledLocales?.length ? config.value.i18n.enabledLocales : ['zh-CN']
  const order = config.value.i18n?.localeSortOrder || {}
  return [...enabled]
    .sort((a, b) => {
      const da = Number.isFinite(order[a]) ? order[a] : -Infinity
      const db = Number.isFinite(order[b]) ? order[b] : -Infinity
      if (da !== db) return db - da
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
  { value: 'all', label: '全部语言' },
  ...localeOptions.value.map((loc) => ({
    value: loc.code,
    label: `${loc.label}（${loc.short || loc.code}）`
  }))
])

const fields = computed(() => [
  { key: 'title', label: '新闻标题' },
  { key: 'summary', label: '摘要' },
  { key: 'status', label: '状态', options: statusFilterOptions },
  { key: 'language', label: '新闻语言', searchable: true, options: languageFilterOptions.value },
  { key: 'publishedAt', label: '发布日期', range: true }
])
const columns = [
  { key: 'news', title: '新闻', width: 340 },
  { key: 'locale', title: '语言', width: 150 },
  { key: 'publishedAt', title: '发布时间', width: 160 },
  { key: 'sort', title: '排序权重', width: 100, align: 'right' },
  { key: 'enabled', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

const selectOptionMap = computed(() => ({
  formLocale: localeOptions.value.map((loc) => ({
    value: loc.code,
    label: `${loc.label}（${loc.short || loc.code}）`
  })),
  enabled: enabledOptions
}))

const selectValueMap = computed(() => ({
  formLocale: formLocale.value,
  enabled: formEnabled.value
}))

const filteredRows = computed(() => {
  const f = filters.value
  return rows.value.filter((row) => {
    const statusOk =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'enabled' && row.enabled) ||
      (statusFilter.value === 'disabled' && !row.enabled)
    const localeOk = !languageFilter.value || row.locale === languageFilter.value
    const day = String(row.publishedAt || '').slice(0, 10)
    const dateOk = !f.publishedAt || (day >= f.publishedAt[0] && day <= f.publishedAt[1])
    return statusOk && localeOk && dateOk && has(row.title, f.title) && has(row.summary, f.summary)
  })
})

function nowText() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatFileSize(size) {
  if (!Number.isFinite(size)) return ''
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))}KB`
  return `${(size / 1024 / 1024).toFixed(1)}MB`
}

function clearImageInputValue() {
  if (imageInputRef.value) imageInputRef.value.value = ''
}

function openImagePicker() {
  formImageError.value = ''
  imageInputRef.value?.click()
}

function onImageUrlInput() {
  formImageError.value = ''
  formImageFileName.value = ''
}

function onImageSelected(event) {
  const file = event.target.files?.[0]
  if (!file) return
  const sessionId = imageUploadSession.value + 1
  imageUploadSession.value = sessionId
  formImageError.value = ''
  const lowerName = file.name.toLowerCase()
  const extensionOk = /\.(jpe?g|png|webp)$/.test(lowerName)
  const mimeOk = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
  if (!extensionOk || !mimeOk) {
    formImageError.value = '请上传 JPG、PNG 或 WebP 格式的图片'
    clearImageInputValue()
    return
  }
  if (!file.size) {
    formImageError.value = '图片文件为空，请重新选择'
    clearImageInputValue()
    return
  }
  if (file.size > IMAGE_MAX_SIZE) {
    formImageError.value = `图片不能超过 2MB，当前文件约 ${formatFileSize(file.size)}`
    clearImageInputValue()
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    if (imageUploadSession.value !== sessionId) return
    const result = typeof reader.result === 'string' ? reader.result : ''
    if (!result) {
      formImageError.value = '图片读取失败，请重新选择'
      return
    }
    formImageUrl.value = result
    formImageFileName.value = file.name
    clearImageInputValue()
  }
  reader.onerror = () => {
    if (imageUploadSession.value !== sessionId) return
    formImageError.value = '图片读取失败，请重新选择'
    clearImageInputValue()
  }
  reader.readAsDataURL(file)
}

function removeImage() {
  imageUploadSession.value += 1
  formImageUrl.value = ''
  formImageFileName.value = ''
  formImageError.value = ''
  clearImageInputValue()
}

function getCustomOptions(key) {
  return selectOptionMap.value[key] || []
}

function getCustomSelectedOption(key) {
  const current = selectValueMap.value[key]
  return getCustomOptions(key).find((option) => option.value === current) || getCustomOptions(key)[0]
}

function commitCustomSelect(key, value) {
  if (!getCustomOptions(key).some((option) => option.value === value)) return
  if (key === 'formLocale') formLocale.value = value || defaultLocale.value
  if (key === 'enabled') formEnabled.value = value
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
  formImageUrl.value = ''
  formImageFileName.value = ''
  formImageError.value = ''
  imageUploadSession.value += 1
  clearImageInputValue()
  formLocale.value = defaultLocale.value
  formHtml.value = '<p></p>'
  formEnabled.value = true
  formPublishedAt.value = nowText()
  formSort.value = Math.max(0, ...rows.value.map((row) => Number(row.sort) || 0)) + 10
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
  formImageUrl.value = row.imageUrl || ''
  formImageFileName.value = ''
  formImageError.value = ''
  imageUploadSession.value += 1
  clearImageInputValue()
  formLocale.value = row.locale || defaultLocale.value
  formHtml.value = row.html || '<p></p>'
  formEnabled.value = row.enabled !== false
  formPublishedAt.value = row.publishedAt || nowText()
  formSort.value = Number(row.sort) || 0
  modalOpen.value = true
  await syncEditor()
}

function closeModal() {
  if (isSaving.value) return
  modalOpen.value = false
}

async function load() {
  loading.value = true
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = { ...DEFAULT_SITE_CONFIG, ...result.data }
      config.value.frontNews = normalizeFrontNews(config.value.frontNews, config.value.i18n?.defaultLocale || 'zh-CN')
    }
  } catch (error) {
    message.error(`加载失败：${error?.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

async function persist(successText) {
  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      message.success(successText || result.message || '新闻配置已保存')
      await load()
      return true
    }
    message.error(result.message || '保存失败')
  } catch (error) {
    message.error(`保存失败：${error?.message || '未知错误'}`)
    await load()
  } finally {
    isSaving.value = false
  }
  return false
}

async function submitModal() {
  if (isSaving.value) return
  pullEditorHtml()
  const title = formTitle.value.trim()
  if (!title) {
    message.warning('请填写新闻标题')
    return
  }
  const id = editingId.value || `news_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
  const locale = formLocale.value || defaultLocale.value
  const summary = formSummary.value.trim()
  const imageUrl = formImageUrl.value.trim()
  const html = formHtml.value || '<p></p>'
  const row = {
    id,
    locale,
    title,
    summary,
    imageUrl,
    html,
    locales: {
      [locale]: {
        title,
        summary,
        imageUrl,
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
  if (await persist(editingId.value ? '新闻已更新' : '新闻已发布')) closeModal()
}

async function removeRow() {
  const row = removeTarget.value
  if (!row || isSaving.value) return
  config.value.frontNews = normalizeFrontNews(rows.value.filter((item) => item.id !== row.id), defaultLocale.value)
  if (await persist('新闻已删除')) removeTarget.value = null
}

function localeLabel(code) {
  const option = localeOptions.value.find((item) => item.code === code)
  return option ? `${option.label} (${option.short || option.code})` : code || '未设置'
}

onMounted(load)
</script>

<template>
  <PageShell>
    <SearchForm name="front-news-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="新闻资讯列表" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button type="primary" :disabled="loading" @click="openAdd"><template #icon><PlusOutlined /></template>发布新闻</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'news'" direction="vertical" :size="0" class="news-cell">
          <TypographyText strong>{{ record.title }}</TypographyText>
          <TypographyText type="secondary" :ellipsis="{ tooltip: record.summary }" class="news-summary">{{ record.summary || '—' }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'locale'">{{ localeLabel(record.locale) }}</template>
        <span v-else-if="column.key === 'publishedAt'" class="font-mono">{{ record.publishedAt }}</span>
        <Tag v-else-if="column.key === 'enabled'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '展示中' : '已停用' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8" class="news-row-actions">
          <Button type="link" :disabled="isSaving" @click="openEdit(record)">编辑</Button>
          <Button type="link" danger :disabled="isSaving" @click="removeTarget = record">删除</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(modalOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(modalOpen)"><div class="news-modal-title">
            <span id="front-news-editor-title">{{ editingId ? '编辑新闻' : '发布新闻' }}</span>
            <a-button aria-label="关闭" type="text" html-type="button" :disabled="isSaving" @click="closeModal"><CloseOutlined /></a-button>
          </div></template></template><template v-if="modalOpen"><div class="min-h-0 flex-1">
            <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div class="space-y-4">
                <div>
                  <label for="front-news-title-input" class="mb-1.5 block text-sm font-medium text-slate-700">新闻标题</label>
                  <a-input id="front-news-title-input" v-model:value="formTitle" class="w-full" type="text" placeholder="请输入新闻标题" required />
                </div>
                <div>
                  <label for="front-news-summary-input" class="mb-1.5 block text-sm font-medium text-slate-700">摘要</label>
                  <a-textarea id="front-news-summary-input" v-model:value="formSummary" class="w-full resize-y" placeholder="用于首页和列表展示的一句话摘要" />
                </div>
                <div>
                  <label for="front-news-content-editor" class="mb-1.5 block text-sm font-medium text-slate-700">新闻内容</label>
                  <div class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div class="flex flex-wrap gap-2 border-b border-slate-200 p-3">
                      <a-button html-type="button" class="" @click="setBlock('H2')">H2</a-button>
                      <a-button html-type="button" class="" @click="setBlock('P')">正文</a-button>
                      <a-button html-type="button" class="" @click="exec('bold')">B</a-button>
                      <a-button html-type="button" class="italic" @click="exec('italic')">I</a-button>
                      <a-button html-type="button" class="" @click="exec('insertUnorderedList')">列表</a-button>
                    </div>
                    <div
                      id="front-news-content-editor"
                      ref="editorRef"
                      class="news-editor min-h-56 bg-white p-4 text-sm leading-7 text-slate-800 focus:outline-none"
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
                  <a-select class="w-full" id="front-news-locale-combobox" aria-labelledby="front-news-locale-label" :value="getCustomSelectedOption('formLocale')?.value" :options="selectOptionMap.formLocale" @change="commitCustomSelect('formLocale', $event)" />
                  <p class="mt-2 text-xs leading-5 text-slate-500">
                    每次发布只保存当前选择语言的一条新闻。
                  </p>
                </div>
                <div>
                  <label for="front-news-image-url-input" class="mb-1.5 block text-sm font-medium text-slate-700">新闻图片</label>
                  <div class="mb-2 flex flex-wrap items-center gap-2">
                    <a-button html-type="button" class="" @click="openImagePicker">上传图片</a-button>
                    <a-button v-if="formImageUrl" html-type="button" class="" @click="removeImage">
                      移除图片
                    </a-button>
                    <span v-if="formImageFileName" class="max-w-full truncate text-xs text-slate-500">
                      {{ formImageFileName }}
                    </span>
                  </div>
                  <input
                    ref="imageInputRef"
                    class="sr-only"
                    type="file"
                    :accept="IMAGE_ACCEPT"
                    :aria-describedby="formImageError ? 'front-news-image-help front-news-image-error' : 'front-news-image-help'"
                    @change="onImageSelected"
                  />
                  <a-input id="front-news-image-url-input" v-model:value="formImageUrl" class="w-full" type="text" placeholder="上传图片后自动填入，也可粘贴 https:// 或 data:image 地址" :aria-describedby="formImageError ? 'front-news-image-help front-news-image-error' : 'front-news-image-help'" :aria-invalid="formImageError ? 'true' : 'false'" @input="onImageUrlInput" />
                  <div
                    v-if="formImageUrl"
                    class="mt-2 aspect-[16/9] overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                  >
                    <img
                      :src="formImageUrl"
                      alt=""
                      class="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <p id="front-news-image-help" class="mt-2 text-xs leading-5 text-slate-500">
                    用于首页首条新闻卡片展示，支持 JPG、PNG、WebP，建议 16:9 横图，单张不超过 2MB。
                  </p>
                  <FeedbackToast v-if="formImageError" id="front-news-image-error" type="error" :source="() => (formImageError) ? (formImageError) : ''"></FeedbackToast>
                </div>
                <div>
                  <label id="front-news-enabled-label" class="mb-1.5 block text-sm font-medium text-slate-700">状态</label>
                  <a-select class="w-full" id="front-news-enabled-combobox" aria-labelledby="front-news-enabled-label" :value="String(getCustomSelectedOption('enabled')?.value)" :options="enabledOptions.map((option) => ({ ...option, value: String(option.value) }))" @change="commitCustomSelect('enabled', $event === 'true')" />
                </div>
                <div>
                  <label for="front-news-published-at-input" class="mb-1.5 block text-sm font-medium text-slate-700">发布时间</label>
                  <a-input id="front-news-published-at-input" v-model:value="formPublishedAt" class="w-full" type="text" placeholder="2026-08-24 10:00" />
                </div>
                <div>
                  <label for="front-news-sort-input" class="mb-1.5 block text-sm font-medium text-slate-700">排序权重</label>
                  <InputNumber id="front-news-sort-input" v-model:value="formSort" class="w-full" :min="0" :precision="0" />
                  <p class="mt-2 text-xs leading-5 text-slate-500">
                    数值越大越靠前；权重相同则按发布时间倒序展示。
                  </p>
                </div>
              </aside>
            </div>
          </div></template><template #footer><template v-if="Boolean(modalOpen)"><Space :size="8">
            <a-button html-type="button" :disabled="isSaving" @click="closeModal">取消</a-button>
            <a-button html-type="button" type="primary" :loading="isSaving" @click="submitModal">保存新闻</a-button>
          </Space></template></template></a-modal>

    <AdminModal :open="!!removeTarget" title="删除新闻" :busy="isSaving" confirm-text="确认删除" danger @close="removeTarget = null" @confirm="removeRow">
      <div v-if="removeTarget"><TypographyText strong>{{ removeTarget.title }}</TypographyText><p>删除后前台首页与新闻资讯页不再展示该新闻。此操作不能撤销。</p></div>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.news-cell{max-width:100%;min-width:0}
.news-summary{max-width:320px}
.news-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.news-row-actions :deep(.ant-btn-link){padding-inline:4px}

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
