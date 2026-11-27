<script setup>
// 平台配置 → 社媒配置: Ant Design Pro list page (2026-11-28) — query card, table card with toolbar and pagination,
// link actions, status as a text Tag, toast feedback and an Ant delete confirmation.
import { computed, onMounted, ref } from 'vue'
import { Button, Col, Form, FormItem, InputNumber, Row, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined, UploadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import {
  DEFAULT_SITE_CONFIG,
  normalizeSocialLinksList,
  siteConfigApi
} from '../../../admin/mock/siteConfig'

const config = ref({ ...DEFAULT_SITE_CONFIG })
const loading = ref(true)
const isSaving = ref(false)

const rows = computed(() => config.value.socialLinks || [])
const page = ref(1)
const blank = () => ({ name: '', url: '', status: 'all' })
const filters = ref(blank())
const fields = [
  { key: 'name', label: '名称' },
  { key: 'url', label: '链接' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已禁用' }] }
]
const has = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const filteredRows = computed(() => rows.value.filter((row) => {
  const f = filters.value
  return has(row.name, f.name) && has(row.url, f.url) &&
    (f.status === 'all' || (f.status === 'enabled') === Boolean(row.enabled))
}))
const columns = [
  { key: 'name', title: '名称', width: 200 },
  { key: 'icon', title: '图标', width: 80 },
  { key: 'url', title: '链接', width: 320 },
  { key: 'sort', title: '排序权重', width: 100, align: 'right' },
  { key: 'enabled', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 180, fixed: 'right' }
]
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
const removeTarget = ref(null)

const showModal = ref(false)
const editingId = ref(null)
const formName = ref('')
const formUrl = ref('')
const formIconUrl = ref('')
const formEnabled = ref(true)
const formSort = ref(0)
const iconFileInput = ref(null)

function resetForm() {
  editingId.value = null
  formName.value = ''
  formUrl.value = ''
  formIconUrl.value = ''
  formEnabled.value = true
  formSort.value = Math.max(0, ...rows.value.map((row) => Number(row.sort) || 0)) + 10
  if (iconFileInput.value) iconFileInput.value.value = ''
}

function openAdd() {
  resetForm()
  showModal.value = true
}

function openEdit(row) {
  editingId.value = row.id
  formName.value = row.name || ''
  formUrl.value = row.url || ''
  formIconUrl.value = row.iconUrl || ''
  formEnabled.value = row.enabled
  formSort.value = row.sort ?? 0
  if (iconFileInput.value) iconFileInput.value.value = ''
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function load() {
  loading.value = true
  try {
    const result = await siteConfigApi.getSiteConfig()
    if (result.success) {
      config.value = { ...DEFAULT_SITE_CONFIG, ...result.data }
      config.value.socialLinks = normalizeSocialLinksList(config.value.socialLinks)
    }
  } catch (e) {
    message.error('加载失败：' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function validateUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim())
}

function triggerIconUpload() {
  iconFileInput.value?.click()
}

function readIconFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!file.type.startsWith('image/')) {
    message.warning('请上传图片文件')
    event.target.value = ''
    return
  }
  if (file.size > 1024 * 1024) {
    message.warning('图标大小不能超过 1MB')
    event.target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    formIconUrl.value = e.target?.result || ''
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function clearIcon() {
  formIconUrl.value = ''
  if (iconFileInput.value) iconFileInput.value.value = ''
}

async function submitModal() {
  const name = String(formName.value ?? '').trim()
  const url = String(formUrl.value ?? '').trim()
  if (isSaving.value) return
  if (!name) {
    message.warning('请填写社媒名称')
    return
  }
  if (!validateUrl(url)) {
    message.warning('请填写 http:// 或 https:// 开头的社媒链接')
    return
  }

  const list = [...(config.value.socialLinks || [])]
  const base = {
    name,
    url,
    iconUrl: String(formIconUrl.value ?? '').trim(),
    enabled: formEnabled.value,
    sort: Number(formSort.value) || 0
  }
  if (editingId.value) {
    const i = list.findIndex((x) => x.id === editingId.value)
    if (i >= 0) list[i] = { ...list[i], ...base }
  } else {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `social_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    list.push({ id, ...base })
  }

  config.value.socialLinks = normalizeSocialLinksList(list)
  if (await persist(editingId.value ? '社媒链接已更新' : '社媒链接已添加')) closeModal()
}

async function persist(successText) {
  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      message.success(successText || result.message || '社媒配置已保存')
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

async function toggleEnabled(row) {
  if (isSaving.value) return
  config.value.socialLinks = normalizeSocialLinksList(
    rows.value.map((x) => (x.id === row.id ? { ...x, enabled: !x.enabled } : x))
  )
  await persist(row.enabled ? '社媒链接已禁用' : '社媒链接已启用')
}

async function removeRow() {
  const row = removeTarget.value
  if (!row || isSaving.value) return
  config.value.socialLinks = rows.value.filter((x) => x.id !== row.id)
  if (await persist('社媒链接已删除')) removeTarget.value = null
}

onMounted(() => {
  load()
})
</script>

<template>
  <PageShell>
    <SearchForm name="social-link-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="社媒链接" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Button type="primary" :disabled="loading" @click="openAdd"><template #icon><PlusOutlined /></template>添加社媒</Button>
      </template>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'name'" strong>{{ record.name || '—' }}</TypographyText>
        <span v-else-if="column.key === 'icon'" class="social-icon">
          <img v-if="record.iconUrl" :src="record.iconUrl" :alt="`${record.name} 图标`" />
          <TypographyText v-else type="secondary">{{ record.name?.slice(0, 1) || '-' }}</TypographyText>
        </span>
        <template v-else-if="column.key === 'url'">
          <TypographyText v-if="record.url" class="social-url"><a :href="record.url" target="_blank" rel="noreferrer">{{ record.url }}</a></TypographyText>
          <TypographyText v-else type="secondary">—</TypographyText>
        </template>
        <Tag v-else-if="column.key === 'enabled'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '已启用' : '已禁用' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8" class="social-row-actions">
          <Button type="link" :disabled="isSaving" @click="openEdit(record)">编辑</Button>
          <Button type="link" :disabled="isSaving" @click="toggleEnabled(record)">{{ record.enabled ? '禁用' : '启用' }}</Button>
          <Button type="link" danger :disabled="isSaving" @click="removeTarget = record">删除</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showModal)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(640px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(showModal)"><div class="social-modal-title"><span>{{ editingId ? '编辑社媒' : '添加社媒' }}</span><a-button aria-label="关闭" type="text" html-type="button" :disabled="isSaving" @click="closeModal"><CloseOutlined /></a-button></div></template></template><template v-if="showModal">
          <Form layout="vertical" name="social-link-editor">
            <FormItem label="名称" required>
              <a-input v-model:value="formName" placeholder="例如：X / Twitter、Telegram、微信公众号" />
            </FormItem>
            <FormItem label="链接" required extra="需以 http:// 或 https:// 开头。">
              <a-input v-model:value="formUrl" type="url" placeholder="https://example.com" />
            </FormItem>
            <FormItem label="社媒图标" extra="支持 PNG / JPG / SVG / WebP，单张不超过 1MB。">
              <div class="social-icon-field">
                <span class="social-icon social-icon-large">
                  <img v-if="formIconUrl" :src="formIconUrl" alt="图标预览" />
                  <TypographyText v-else type="secondary">无图</TypographyText>
                </span>
                <Space direction="vertical" :size="8" class="social-icon-input">
                  <input ref="iconFileInput" type="file" accept="image/*" class="social-file" @change="readIconFile" />
                  <Space :size="8" wrap>
                    <a-button html-type="button" @click="triggerIconUpload"><UploadOutlined />上传图标</a-button>
                    <a-button v-if="formIconUrl" html-type="button" @click="clearIcon">清除</a-button>
                  </Space>
                  <a-input v-model:value="formIconUrl" placeholder="也可以填写图片 URL 或 data URL" aria-label="社媒图标地址" />
                </Space>
              </div>
            </FormItem>
            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="排序权重" extra="数值越大越靠前">
                  <InputNumber v-model:value="formSort" :precision="0" class="social-number" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="状态">
                  <a-switch v-model:checked="formEnabled" checked-children="启用" un-checked-children="禁用" aria-label="启用该社媒链接" />
                </FormItem>
              </Col>
            </Row>
          </Form></template><template #footer><template v-if="Boolean(showModal)"><Space :size="8">
            <a-button html-type="button" :disabled="isSaving" @click="closeModal">取消</a-button>
            <a-button html-type="button" type="primary" :loading="isSaving" @click="submitModal">保存</a-button>
          </Space></template></template></a-modal>

    <AdminModal :open="!!removeTarget" title="删除社媒链接" :busy="isSaving" confirm-text="确认删除" danger @close="removeTarget = null" @confirm="removeRow">
      <div v-if="removeTarget"><TypographyText strong>{{ removeTarget.name || removeTarget.url }}</TypographyText><p>删除后前台页脚不再展示该链接。此操作不能撤销。</p></div>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.social-icon{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;overflow:hidden;border:1px solid rgb(5 5 5 / 6%);border-radius:8px}
.social-icon img{width:100%;height:100%;object-fit:cover}
.social-icon-large{width:56px;height:56px;flex-shrink:0;border-style:dashed}
.social-icon-field{display:flex;align-items:flex-start;gap:12px;min-width:0}
.social-icon-input{flex:1;min-width:0}
.social-file[type="file"]{display:none}
.social-url{overflow-wrap:anywhere}
.social-number{width:100%}
.social-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.social-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
