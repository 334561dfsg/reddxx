<script setup>
// 平台配置 → 短信通道: Ant Design Pro list page (2026-11-28) — query card (区号 is a searchable select), table card
// with toolbar and pagination, link actions, status Tag, toast feedback and an Ant delete confirmation.
// The hand-built dial-code picker in the editor is an Ant multiple Select with typed search.
import { computed, onMounted, ref } from 'vue'
import { Button, Col, Form, FormItem, Row, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { DEFAULT_I18N_BLOCK, PHONE_DIAL_PRESETS } from '../../../admin/constants/i18nCatalog'
import { DEFAULT_SITE_CONFIG, normalizeSmsChannelsList, siteConfigApi } from '../../../admin/mock/siteConfig'

const dialLabelMap = Object.fromEntries(PHONE_DIAL_PRESETS.map((p) => [p.dial, p.label]))

const config = ref({
  ...DEFAULT_SITE_CONFIG,
  i18n: { ...DEFAULT_I18N_BLOCK }
})
const loading = ref(true)
const isSaving = ref(false)

const page = ref(1)
const blank = () => ({ dial: 'all', name: '', provider: '', status: 'all' })
const filters = ref(blank())
const fields = [
  { key: 'dial', label: '适用区号', searchable: true, options: [{ value: 'all', label: '全部区号' }, ...PHONE_DIAL_PRESETS.map((p) => ({ value: p.dial, label: p.label }))] },
  { key: 'name', label: '通道名称' },
  { key: 'provider', label: '通道类型' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }] }
]
const has = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const filteredRows = computed(() => (config.value.smsChannels || []).filter((row) => {
  const f = filters.value
  return (f.dial === 'all' || rowDials(row).includes(f.dial)) && has(row.name, f.name) && has(row.provider, f.provider) &&
    (f.status === 'all' || (f.status === 'enabled') === Boolean(row.enabled))
}))
const columns = [
  { key: 'name', title: '名称', width: 180 },
  { key: 'dials', title: '适用区号', width: 360 },
  { key: 'provider', title: '通道类型', width: 140 },
  { key: 'enabled', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]
const dialOptions = PHONE_DIAL_PRESETS.map((p) => ({ value: p.dial, label: p.label }))
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
const removeTarget = ref(null)

const showModal = ref(false)
/** @type {import('vue').Ref<string | null>} */
const editingId = ref(null)
const formDials = ref(['+86'])
const formName = ref('')
const formProvider = ref('')
const formEnabled = ref(true)
const formConfigJson = ref('{}')

function resetForm() {
  editingId.value = null
  formDials.value = ['+86']
  formName.value = ''
  formProvider.value = ''
  formEnabled.value = true
  formConfigJson.value = '{}'
}

function openAdd() {
  resetForm()
  showModal.value = true
}

function openEdit(row) {
  editingId.value = row.id
  formDials.value = Array.isArray(row.dials) && row.dials.length ? [...row.dials] : [row.dial || '+86']
  formName.value = row.name || ''
  formProvider.value = row.provider || ''
  formEnabled.value = row.enabled
  formConfigJson.value = JSON.stringify(row.config || {}, null, 2)
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
      config.value.i18n = { ...DEFAULT_I18N_BLOCK, ...(config.value.i18n || {}) }
      config.value.smsChannels = normalizeSmsChannelsList(
        config.value.smsChannels,
        true,
        config.value.smsChannelsByDial
      )
    }
  } catch (e) {
    message.error('加载失败：' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

function parseConfigJson() {
  const text = String(formConfigJson.value ?? '').trim()
  if (!text) return {}
  const v = JSON.parse(text)
  if (v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error('接口配置须为 JSON 对象（不可为数组或原始值）')
  }
  return v
}

function rowDials(row) {
  return Array.isArray(row.dials) && row.dials.length ? row.dials : [row.dial].filter(Boolean)
}

function dialSummary(row) {
  const dials = rowDials(row)
  return dials.map((dial) => dialLabelMap[dial] || dial).join('、')
}

async function submitModal() {
  if (isSaving.value) return
  if (formDials.value.length === 0) {
    message.warning('请至少选择一个国际区号')
    return
  }
  if (formEnabled.value && !String(formProvider.value ?? '').trim()) {
    message.warning('已勾选启用时，请填写通道类型（如 aliyun、twilio、custom）')
    return
  }
  let parsed
  try {
    parsed = parseConfigJson()
  } catch (e) {
    message.warning(e?.message || 'JSON 无效')
    return
  }

  const list = [...(config.value.smsChannels || [])]
  const base = {
    dial: formDials.value[0],
    dials: [...formDials.value],
    name: String(formName.value ?? '').trim(),
    enabled: formEnabled.value,
    provider: String(formProvider.value ?? '').trim(),
    config: parsed
  }
  if (editingId.value) {
    const i = list.findIndex((x) => x.id === editingId.value)
    if (i >= 0) {
      list[i] = { ...list[i], ...base }
    }
  } else {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `sms_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
    list.push({ id, ...base })
  }
  config.value.smsChannels = normalizeSmsChannelsList(list, true, undefined)
  if (await persist(editingId.value ? '短信通道已更新' : '短信通道已添加')) closeModal()
}

async function persist(successText) {
  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      message.success(successText || result.message || '短信通道已保存')
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

async function removeRow() {
  const row = removeTarget.value
  if (!row || isSaving.value) return
  config.value.smsChannels = (config.value.smsChannels || []).filter((x) => x.id !== row.id)
  if (await persist('短信通道已删除')) removeTarget.value = null
}

onMounted(() => {
  load()
})
</script>

<template>
  <PageShell>
    <SearchForm name="sms-channel-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="短信通道" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <TypographyText type="secondary">一个通道可同时适用于多个国际区号</TypographyText>
          <Button type="primary" :disabled="loading" @click="openAdd"><template #icon><PlusOutlined /></template>添加通道</Button>
        </Space>
      </template>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'name'" strong>{{ record.name || '—' }}</TypographyText>
        <Space v-else-if="column.key === 'dials'" :size="[0, 4]" wrap>
          <Tag v-for="dial in rowDials(record)" :key="record.id + '-' + dial"><span class="font-mono">{{ dial }}</span> {{ (dialLabelMap[dial] || '').replace(dial, '').trim() }}</Tag>
        </Space>
        <span v-else-if="column.key === 'provider'" class="font-mono">{{ record.provider || '—' }}</span>
        <Tag v-else-if="column.key === 'enabled'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '启用' : '停用' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8" class="sms-row-actions">
          <Button type="link" :disabled="isSaving" @click="openEdit(record)">编辑</Button>
          <Button type="link" danger :disabled="isSaving" @click="removeTarget = record">删除</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showModal)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(760px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(showModal)"><div class="sms-modal-title"><span>{{ editingId ? '编辑通道' : '添加通道' }}</span><a-button aria-label="关闭" type="text" html-type="button" :disabled="isSaving" @click="closeModal"><CloseOutlined /></a-button></div></template></template><template v-if="showModal">
          <Form layout="vertical" name="sms-channel-editor">
            <FormItem label="国际区号" required :extra="`已选 ${formDials.length} 个；可多选，发送短信时按用户手机号区号匹配可用通道。`">
              <a-select v-model:value="formDials" mode="multiple" :options="dialOptions" show-search option-filter-prop="label" placeholder="搜索国家/地区或区号" not-found-content="无可添加区号" allow-clear aria-label="国际区号" />
            </FormItem>
            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="通道名称（可选）">
                  <a-input v-model:value="formName" placeholder="列表中展示用" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="通道类型" :required="formEnabled">
                  <a-input v-model:value="formProvider" placeholder="如 aliyun、twilio、custom" autocomplete="off" />
                </FormItem>
              </Col>
            </Row>
            <FormItem label="状态">
              <a-switch v-model:checked="formEnabled" checked-children="启用" un-checked-children="停用" aria-label="启用该通道" />
            </FormItem>
            <FormItem label="接口配置（JSON 对象）">
              <a-textarea v-model:value="formConfigJson" :rows="10" spellcheck="false" class="font-mono" placeholder='例如：{ "accessKeyId": "", "signName": "", "templateCode": "" }' />
            </FormItem>
          </Form></template><template #footer><template v-if="Boolean(showModal)"><Space :size="8">
          <a-button html-type="button" :disabled="isSaving" @click="closeModal">取消</a-button>
          <a-button html-type="button" type="primary" :loading="isSaving" @click="submitModal">保存</a-button>
        </Space></template></template></a-modal>

    <AdminModal :open="!!removeTarget" title="删除短信通道" :busy="isSaving" confirm-text="确认删除" danger @close="removeTarget = null" @confirm="removeRow">
      <div v-if="removeTarget"><TypographyText strong>{{ removeTarget.name || dialSummary(removeTarget) }}</TypographyText><p>删除后这些区号将不再使用该通道发送短信。此操作不能撤销。</p></div>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.sms-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.sms-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
