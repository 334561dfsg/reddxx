<script setup>
// 平台配置 → 站内公告: Ant Design Pro list page (2026-11-28) — query card (标题, 摘要, 状态, 公告语言, 发布日期),
// table card with toolbar and pagination, link actions, status Tag, toast feedback (Ant message) and an Ant delete
// confirmation. The hand-built combobox keyboard handling is gone: every select is an Ant Select.
import { computed, nextTick, onMounted, ref } from 'vue'
import { Button, InputNumber, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {
  DEFAULT_SITE_CONFIG,
  normalizeSiteAnnouncements,
  siteConfigApi
} from '../../../admin/mock/siteConfig'
import { FRONT_LOCALE_CATALOG } from '../../../admin/constants/i18nCatalog'

const config = ref({ ...DEFAULT_SITE_CONFIG })
const loading = ref(true)
const isSaving = ref(false)
const page = ref(1)
const editorRef = ref(null)
const blank = () => ({ title: '', summary: '', status: 'all', language: 'all', publishedAt: null })
const filters = ref(blank())
const statusFilter = computed(() => filters.value.status)
const languageFilter = computed(() => (filters.value.language === 'all' ? '' : filters.value.language))
const has = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())

const rows = computed(() => config.value.announcements || [])
const filteredRows = computed(() => {
  const f = filters.value
  return rows.value.filter((row) => {
    if (statusFilter.value === 'enabled' && !row.enabled) return false
    if (statusFilter.value === 'disabled' && row.enabled) return false
    if (languageFilter.value && row.locale !== languageFilter.value) return false
    const day = String(row.publishedAt || '').slice(0, 10)
    if (f.publishedAt && (day < f.publishedAt[0] || day > f.publishedAt[1])) return false
    return has(row.title, f.title) && has(row.summary, f.summary)
  })
})
const columns = [
  { key: 'announcement', title: '公告', width: 340 },
  { key: 'locale', title: '语言', width: 150 },
  { key: 'publishedAt', title: '发布时间', width: 160 },
  { key: 'sort', title: '排序权重', width: 100, align: 'right' },
  { key: 'enabled', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]
const removeTarget = ref(null)

const modalOpen = ref(false)
const editingId = ref(null)
const formTitle = ref('')
const formSummary = ref('')
const formHtml = ref('<p></p>')
const formEnabled = ref(true)
const formPublishedAt = ref('')
const formSort = ref(0)
const formLocale = ref('zh-CN')

const statusFilterOptions = [
  { value: 'all', label: '全部公告' },
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
  { key: 'title', label: '公告标题' },
  { key: 'summary', label: '摘要' },
  { key: 'status', label: '状态', options: statusFilterOptions },
  { key: 'language', label: '公告语言', searchable: true, options: languageFilterOptions.value },
  { key: 'publishedAt', label: '发布日期', range: true }
])
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

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
  formSort.value = Math.max(0, ...rows.value.map((row) => Number(row.sort) || 0)) + 10
  formLocale.value = defaultLocale.value
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
  modalOpen.value = true
  await nextTick()
  syncEditor()
}

function closeModal() {
  if (isSaving.value) return
  modalOpen.value = false
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

function commitLocale(code) {
  if (!code || !localeOptions.value.some((item) => item.code === code)) return
  formLocale.value = code
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
      message.success(successText || result.message || '公告配置已保存')
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
    message.warning('请填写公告标题')
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
  if (await persist(editingId.value ? '公告已更新' : '公告已发布')) closeModal()
}

async function removeRow() {
  const row = removeTarget.value
  if (!row || isSaving.value) return
  config.value.announcements = normalizeSiteAnnouncements(
    rows.value.filter((item) => item.id !== row.id),
    defaultLocale.value
  )
  if (await persist('公告已删除')) removeTarget.value = null
}

onMounted(load)
</script>

<template>
  <PageShell>
    <SearchForm name="announcement-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="站内公告列表" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button type="primary" :disabled="loading" @click="openAdd"><template #icon><PlusOutlined /></template>发布公告</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'announcement'" direction="vertical" :size="0" class="announcement-cell">
          <TypographyText strong>{{ record.title }}</TypographyText>
          <TypographyText type="secondary" :ellipsis="{ tooltip: record.summary }" class="announcement-summary">{{ record.summary || '—' }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'locale'">{{ localeLabel(record.locale) }}</template>
        <span v-else-if="column.key === 'publishedAt'" class="font-mono">{{ record.publishedAt }}</span>
        <Tag v-else-if="column.key === 'enabled'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '展示中' : '已停用' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8" class="announcement-row-actions">
          <Button type="link" :disabled="isSaving" @click="openEdit(record)">编辑</Button>
          <Button type="link" danger :disabled="isSaving" @click="removeTarget = record">删除</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(modalOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(modalOpen)"><div class="announcement-modal-title">
            <span id="announcement-editor-title">{{ editingId ? '编辑公告' : '发布公告' }}</span>
            <a-button aria-label="关闭" type="text" html-type="button" :disabled="isSaving" @click="closeModal"><CloseOutlined /></a-button>
          </div></template></template><template v-if="modalOpen"><div class="min-h-0 flex-1">
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
                <!-- Ant Select values cannot be booleans: show the status as 'true'/'false' strings and commit the boolean. -->
                <a-select class="w-full" id="announcement-status-combobox" aria-labelledby="announcement-status-label" :value="String(formEnabled)" :options="enabledOptions.map((option) => ({ ...option, value: String(option.value) }))" @change="formEnabled = $event === 'true'" />
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700" for="announcement-published-at">发布时间</label>
                  <a-input id="announcement-published-at" v-model:value="formPublishedAt" class="w-full font-mono" placeholder="2026-08-24 10:00" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700" for="announcement-sort">排序权重</label>
                  <InputNumber id="announcement-sort" v-model:value="formSort" :precision="0" class="w-full" />
                  <p class="mt-1.5 text-xs text-slate-500">数值越大越靠前</p>
                </div>
                <div class="rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-500">
                  前台公告按排序权重从大到小展示；权重相同时，发布时间越新的越靠前。停用公告保留在后台，但不会出现在前台公告中心。
                </div>
              </aside>
            </div>
          </div></template><template #footer><template v-if="Boolean(modalOpen)"><Space :size="8">
            <a-button html-type="button" :disabled="isSaving" @click="closeModal">取消</a-button>
            <a-button html-type="button" type="primary" :loading="isSaving" @click="submitModal">保存公告</a-button>
          </Space></template></template></a-modal>

    <AdminModal :open="!!removeTarget" title="删除公告" :busy="isSaving" confirm-text="确认删除" danger @close="removeTarget = null" @confirm="removeRow">
      <div v-if="removeTarget"><TypographyText strong>{{ removeTarget.title }}</TypographyText><p>删除后前台公告中心不再展示该公告。此操作不能撤销。</p></div>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.announcement-cell{max-width:100%;min-width:0}
.announcement-summary{max-width:320px}
.announcement-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.announcement-row-actions :deep(.ant-btn-link){padding-inline:4px}

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
