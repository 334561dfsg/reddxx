<script setup>
// 平台配置 → 内容页配置: Ant Design Pro list page (2026-11-28) — query card (标题, 路径, 层级), table card with toolbar
// and pagination, link actions, status Tag, toast feedback and an Ant delete confirmation. The editor dialog is kept.
import { computed, nextTick, onMounted, ref } from 'vue'
import { Button, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {
  DEFAULT_SITE_CONFIG,
  normalizeContentPages,
  siteConfigApi
} from '../../../admin/mock/siteConfig'
import { FRONT_LOCALE_CATALOG } from '../../../admin/constants/i18nCatalog'

const config = ref({ ...DEFAULT_SITE_CONFIG })
const loading = ref(true)
const isSaving = ref(false)
const editorRef = ref(null)

const rows = computed(() => config.value.contentPages?.pages || [])
const page = ref(1)
const blank = () => ({ title: '', slug: '', parent: 'all', status: 'all' })
const filters = ref(blank())
const fields = computed(() => [
  { key: 'title', label: '页面标题' },
  { key: 'slug', label: '页面路径' },
  { key: 'parent', label: '层级', searchable: true, options: [{ value: 'all', label: '全部页面' }, { value: '__root__', label: '仅一级页面' }, ...rows.value.filter((row) => !row.parentId).map((p) => ({ value: p.id, label: `${p.title} 及其子页面` }))] },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已禁用' }] }
])
const columns = [
  { key: 'page', title: '页面', width: 300 },
  { key: 'parent', title: '父级', width: 140 },
  { key: 'path', title: '前台路径', width: 260 },
  { key: 'sort', title: '排序权重', width: 100, align: 'right' },
  { key: 'locales', title: '多语言', width: 90, align: 'right' },
  { key: 'enabled', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
const removeTarget = ref(null)
const displayRows = computed(() => {
  const byParent = new Map()
  const roots = []
  for (const row of rows.value) {
    if (row.parentId) {
      const list = byParent.get(row.parentId) || []
      list.push(row)
      byParent.set(row.parentId, list)
    } else {
      roots.push(row)
    }
  }
  const sortRows = (list) =>
    [...list].sort((a, b) => {
      const sa = Number(a.sort) || 0
      const sb = Number(b.sort) || 0
      if (sa !== sb) return sb - sa
      return a.slug.localeCompare(b.slug)
    })
  const out = []
  for (const parent of sortRows(roots)) {
    out.push(parent)
    for (const child of sortRows(byParent.get(parent.id) || [])) {
      out.push(child)
    }
  }
  const orphanChildren = rows.value.filter((row) => row.parentId && !rows.value.some((p) => p.id === row.parentId))
  out.push(...sortRows(orphanChildren))
  return out
})
const filteredRows = computed(() => {
  const f = filters.value
  const title = String(f.title || '').trim().toLowerCase()
  const slug = String(f.slug || '').trim().toLowerCase()
  return displayRows.value.filter((row) => {
    if (f.parent === '__root__' && row.parentId) return false
    if (f.parent !== 'all' && f.parent !== '__root__' && row.parentId !== f.parent && row.id !== f.parent) return false
    if (f.status !== 'all' && (f.status === 'enabled') !== Boolean(row.enabled)) return false
    if (title && ![row.title, row.navTitle].some((text) => String(text || '').toLowerCase().includes(title))) return false
    if (slug && !pagePath(row).toLowerCase().includes(slug)) return false
    return true
  })
})

const modalOpen = ref(false)
const editingId = ref(null)
const formSlug = ref('')
const formTitle = ref('')
const formNavTitle = ref('')
const formParentId = ref('')
const formSummary = ref('')
const formHtml = ref('')
const formEnabled = ref(true)
const formShowInNav = ref(true)
const formSort = ref(0)
const formLocales = ref({})
const activeLocale = ref('zh-CN')

const parentOptions = computed(() => rows.value.filter((row) => row.id !== editingId.value && !row.parentId))
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

function pageById(id) {
  return rows.value.find((row) => row.id === id)
}

function pagePath(row) {
  const parent = row.parentId ? pageById(row.parentId) : null
  return parent ? `/front/pages/${parent.slug}/${row.slug}` : `/front/pages/${row.slug}`
}

function resetForm() {
  editingId.value = null
  formSlug.value = ''
  formTitle.value = ''
  formNavTitle.value = ''
  formParentId.value = ''
  formSummary.value = ''
  formHtml.value = '<p></p>'
  formEnabled.value = true
  formShowInNav.value = true
  formSort.value = Math.max(0, ...rows.value.map((row) => Number(row.sort) || 0)) + 10
  activeLocale.value = defaultLocale.value
  formLocales.value = {
    [activeLocale.value]: emptyLocalePayload()
  }
}

async function openAdd() {
  resetForm()
  modalOpen.value = true
  await nextTick()
  syncEditor()
}

async function openEdit(row) {
  editingId.value = row.id
  formSlug.value = row.slug || ''
  formParentId.value = row.parentId || ''
  formEnabled.value = row.enabled
  formShowInNav.value = row.showInNav !== false
  formSort.value = row.sort ?? 0
  activeLocale.value = defaultLocale.value
  formLocales.value = normalizeFormLocales(row)
  loadLocaleFields(activeLocale.value)
  modalOpen.value = true
  await nextTick()
  syncEditor()
}

function closeModal() {
  modalOpen.value = false
}

function syncEditor() {
  if (editorRef.value) editorRef.value.innerHTML = formHtml.value || '<p></p>'
}

function pullEditorHtml() {
  formHtml.value = editorRef.value?.innerHTML || ''
}

function emptyLocalePayload() {
  return {
    title: '',
    navTitle: '',
    summary: '',
    html: '<p></p>'
  }
}

function hasLocalePayload(payload) {
  const text = String(payload?.html || '').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim()
  return Boolean(payload?.title?.trim() || payload?.navTitle?.trim() || payload?.summary?.trim() || text)
}

function normalizeFormLocales(row = {}) {
  const source = row.locales && typeof row.locales === 'object' ? row.locales : {}
  const out = {}
  Object.entries(source).forEach(([code, value]) => {
    if (!code) return
    out[code] = {
      ...emptyLocalePayload(),
      title: typeof value?.title === 'string' ? value.title : '',
      navTitle: typeof value?.navTitle === 'string' ? value.navTitle : '',
      summary: typeof value?.summary === 'string' ? value.summary : '',
      html: typeof value?.html === 'string' && value.html.trim() ? value.html : '<p></p>'
    }
  })
  const fallbackCode = defaultLocale.value
  if (!out[fallbackCode]) {
    out[fallbackCode] = {
      ...emptyLocalePayload(),
      title: row.title || '',
      navTitle: row.navTitle || row.title || '',
      summary: row.summary || '',
      html: row.html || '<p></p>'
    }
  }
  return out
}

function saveActiveLocaleFields() {
  pullEditorHtml()
  formLocales.value = {
    ...formLocales.value,
    [activeLocale.value]: {
      title: formTitle.value,
      navTitle: formNavTitle.value,
      summary: formSummary.value,
      html: formHtml.value || '<p></p>'
    }
  }
}

function loadLocaleFields(code) {
  const payload = formLocales.value[code] || emptyLocalePayload()
  formTitle.value = payload.title || ''
  formNavTitle.value = payload.navTitle || ''
  formSummary.value = payload.summary || ''
  formHtml.value = payload.html || '<p></p>'
}

async function switchLocale(code) {
  if (!code || code === activeLocale.value) return
  saveActiveLocaleFields()
  activeLocale.value = code
  if (!formLocales.value[code]) {
    formLocales.value = {
      ...formLocales.value,
      [code]: emptyLocalePayload()
    }
  }
  loadLocaleFields(code)
  await nextTick()
  syncEditor()
}

function localeCompletion(row) {
  const locales = row.locales || {}
  const total = localeOptions.value.length || 1
  const done = localeOptions.value.filter((item) => {
    const payload = locales[item.code]
    return hasLocalePayload(payload)
  }).length
  return `${done}/${total}`
}

function exec(command, value = null) {
  editorRef.value?.focus()
  document.execCommand(command, false, value)
  pullEditorHtml()
}

function setBlock(tag) {
  exec('formatBlock', tag)
}

function insertLink() {
  const url = window.prompt('请输入链接地址（http:// 或 https://）', '')
  if (!url) return
  if (!/^https?:\/\//i.test(url.trim())) {
    message.warning('链接必须以 http:// 或 https:// 开头')
    return
  }
  exec('createLink', url.trim())
}

function insertImage() {
  const url = window.prompt('请输入图片地址（http://、https:// 或 data URL）', '')
  if (!url) return
  const text = url.trim()
  if (!/^https?:\/\//i.test(text) && !/^data:image\//i.test(text)) {
    message.warning('图片地址必须是 http://、https:// 或 data:image/ 开头')
    return
  }
  exec('insertImage', text)
}

function slugify(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function fillSlugFromTitle() {
  if (formSlug.value.trim()) return
  formSlug.value = slugify(formTitle.value)
}

async function load() {
  loading.value = true
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = { ...DEFAULT_SITE_CONFIG, ...result.data }
      config.value.contentPages = normalizeContentPages(config.value.contentPages, config.value.i18n?.defaultLocale || 'zh-CN')
    }
  } catch (e) {
    message.error('加载失败：' + (e?.message || '未知错误'))
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
      message.success(successText || result.message || '内容页已保存')
      await load()
      return true
    }
    message.error(result.message || '保存失败')
  } catch (e) {
    message.error('保存失败：' + (e?.message || '未知错误'))
    await load()
  } finally {
    isSaving.value = false
  }
  return false
}

async function submitModal() {
  if (isSaving.value) return
  saveActiveLocaleFields()
  const slug = formSlug.value.trim().toLowerCase()
  const locales = Object.fromEntries(
    Object.entries(formLocales.value).filter(([, payload]) => hasLocalePayload(payload))
  )
  const primaryLocale = locales[defaultLocale.value] || locales[activeLocale.value] || emptyLocalePayload()
  const title = primaryLocale.title.trim()
  if (!title) {
    message.warning('请填写页面标题')
    return
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    message.warning('页面路径只支持小写字母、数字和中划线，例如 about-us')
    return
  }
  const duplicated = rows.value.some((row) => row.slug === slug && row.id !== editingId.value)
  if (duplicated) {
    message.warning('页面路径已存在')
    return
  }

  const id =
    editingId.value ||
    `page_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
  const row = {
    id,
    slug,
    title,
    navTitle: primaryLocale.navTitle.trim() || title,
    parentId: formParentId.value,
    summary: primaryLocale.summary.trim(),
    html: primaryLocale.html,
    locales,
    enabled: formEnabled.value,
    showInNav: formParentId.value ? formShowInNav.value : true,
    sort: Number(formSort.value) || 0
  }
  const list = editingId.value
    ? rows.value.map((item) => (item.id === editingId.value ? row : item))
    : [...rows.value, row]
  config.value.contentPages = normalizeContentPages({
    ...config.value.contentPages,
    pages: list
  }, defaultLocale.value)
  if (await persist(editingId.value ? '页面已更新' : '页面已添加')) closeModal()
}

async function removeRow() {
  const row = removeTarget.value
  if (!row || isSaving.value) return
  config.value.contentPages = normalizeContentPages({
    ...config.value.contentPages,
    pages: rows.value.filter((item) => item.id !== row.id)
  }, defaultLocale.value)
  if (await persist('页面已删除')) removeTarget.value = null
}

onMounted(load)
</script>

<template>
  <PageShell>
    <SearchForm name="content-page-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="内容页" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button type="primary" :disabled="loading" @click="openAdd"><template #icon><PlusOutlined /></template>添加页面</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'page'" direction="vertical" :size="0" class="content-page-cell">
          <TypographyText strong><TypographyText v-if="record.parentId" type="secondary" aria-hidden="true">└ </TypographyText>{{ record.title }}</TypographyText>
          <TypographyText type="secondary" :ellipsis="{ tooltip: record.summary }" class="content-page-summary">{{ record.summary || '—' }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'parent'">{{ pageById(record.parentId)?.title || '—' }}</template>
        <span v-else-if="column.key === 'path'" class="font-mono">{{ pagePath(record) }}</span>
        <template v-else-if="column.key === 'locales'">{{ localeCompletion(record) }}</template>
        <Tag v-else-if="column.key === 'enabled'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '已启用' : '已禁用' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8" class="content-page-row-actions">
          <Button type="link" :disabled="isSaving" @click="openEdit(record)">编辑</Button>
          <Button type="link" danger :disabled="isSaving" @click="removeTarget = record">删除</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(modalOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(modalOpen)"><div class="content-page-modal-title"><span>{{ editingId ? '编辑页面' : '添加页面' }}</span><a-button aria-label="关闭" type="text" html-type="button" :disabled="isSaving" @click="closeModal"><CloseOutlined /></a-button></div></template></template><template v-if="modalOpen"><div class="min-h-0 flex-1">
            <div class="grid min-h-full gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div class="flex min-h-0 flex-col gap-4">
              <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0">
                  <p class="text-sm font-medium text-slate-700">编辑语言</p>
                  <p class="mt-1 text-xs text-slate-500">
                    未配置字段回退默认语言；默认语言在「语言与区号」中设置。
                  </p>
                </div>
                <div class="shrink-0 sm:w-64">
                  <a-select :value="activeLocale" class="w-full" @change="switchLocale($event)">
                    <a-select-option v-for="loc in localeOptions" :key="loc.code" :value="loc.code">
                      {{ loc.label }}{{ loc.code === defaultLocale ? '（默认）' : '' }} - {{ loc.code }}
                    </a-select-option>
                  </a-select>
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">页面标题</label>
                  <a-input v-model:value="formTitle" class="w-full" placeholder="例如：关于我们" @blur="fillSlugFromTitle" />
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">页面路径 slug</label>
                  <a-input v-model:value="formSlug" class="w-full font-mono" placeholder="about-us" />
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">父级页面</label>
                  <a-select v-model:value="formParentId" class="w-full">
                    <a-select-option value="">无，作为一级页面</a-select-option>
                    <a-select-option v-for="p in parentOptions" :key="p.id" :value="p.id">{{ p.title }}</a-select-option>
                  </a-select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-slate-700">导航标题</label>
                  <a-input v-model:value="formNavTitle" class="w-full" placeholder="留空则使用页面标题" />
                </div>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">摘要</label>
                <a-textarea v-model:value="formSummary" class="w-full" placeholder="用于页面头部和列表展示" />
              </div>

              <div class="flex min-h-[22rem] flex-1 flex-col">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">富文本内容</label>
                <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div class="shrink-0 flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <a-button html-type="button" class="text-xs" @click="setBlock('h2')">H2</a-button>
                    <a-button html-type="button" class="text-xs" @click="setBlock('p')">正文</a-button>
                    <a-button html-type="button" class="text-xs font-bold" @click="exec('bold')">B</a-button>
                    <a-button html-type="button" class="text-xs italic" @click="exec('italic')">I</a-button>
                    <a-button html-type="button" class="text-xs" @click="exec('insertUnorderedList')">列表</a-button>
                    <a-button html-type="button" class="text-xs" @click="insertLink">链接</a-button>
                    <a-button html-type="button" class="text-xs" @click="insertImage">图片</a-button>
                  </div>
                  <div
                    ref="editorRef"
                    class="content-editor min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-slate-800 outline-none"
                    contenteditable="true"
                    @input="pullEditorHtml"
                    @blur="pullEditorHtml"
                  />
                </div>
              </div>
            </div>

            <aside class="h-fit space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 lg:sticky lg:top-0">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">状态</label>
                <a-select v-model:value="formEnabled" class="w-full">
                  <a-select-option :value="true">启用</a-select-option>
                  <a-select-option :value="false">禁用</a-select-option>
                </a-select>
              </div>
              <label v-if="formParentId" class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <a-checkbox v-model:checked="formShowInNav" class="" />
                在父级子导航中显示
              </label>
              <p v-else class="rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-500">
                当前为一级页面。只有子页面需要配置是否显示在父级子导航中。
              </p>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">排序权重</label>
                <a-input type="number" class="w-full" :value="formSort" @update:value="formSort = $event === '' ? '' : Number($event)" />
                <p class="mt-1 text-xs text-slate-500">数值越大越靠前，同级页面之间比较</p>
              </div>
              <div class="rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-500">
                <p class="font-medium text-slate-700">前台地址</p>
                <p class="mt-1 break-all font-mono text-indigo-700">
                  /front/pages/{{ formParentId ? `${pageById(formParentId)?.slug || 'parent'}/` : '' }}{{ formSlug || 'your-slug' }}
                </p>
                <p class="mt-3">父级页面会在前台生成横向子导航，适合公司资质下挂多份文件页面。</p>
              </div>
            </aside>
            </div>
          </div></template><template #footer><template v-if="Boolean(modalOpen)"><Space :size="8">
            <a-button html-type="button" :disabled="isSaving" @click="closeModal">取消</a-button>
            <a-button html-type="button" type="primary" :loading="isSaving" @click="submitModal">保存</a-button>
          </Space></template></template></a-modal>

    <AdminModal :open="!!removeTarget" title="删除内容页" :busy="isSaving" confirm-text="确认删除" danger @close="removeTarget = null" @confirm="removeRow">
      <div v-if="removeTarget"><TypographyText strong>{{ removeTarget.title }}</TypographyText><p>删除后前台 {{ pagePath(removeTarget) }} 将无法访问。此操作不能撤销。</p></div>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.content-page-cell{max-width:100%;min-width:0}
.content-page-summary{max-width:280px}
.content-page-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.content-page-row-actions :deep(.ant-btn-link){padding-inline:4px}

.content-editor :deep(h2) {
  margin: 1rem 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 700;
}

.content-editor :deep(p) {
  margin: 0.5rem 0;
}

.content-editor :deep(ul) {
  margin: 0.5rem 0 0.5rem 1.25rem;
  list-style: disc;
}

.content-editor :deep(a) {
  color: #4f46e5;
  text-decoration: underline;
}

.content-editor :deep(img) {
  margin: 0.75rem 0;
  max-width: 100%;
  border-radius: 0.75rem;
}
</style>
