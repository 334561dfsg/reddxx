<script setup>
// 平台配置 → 邮件服务 (SMTP): Ant Design Pro list page (2026-11-28) — query card, table card with toolbar and
// pagination, link actions, status Tag, toast feedback; native confirm/prompt replaced with Ant dialogs.
import { computed, onMounted, ref } from 'vue'
import { Button, Col, Form, FormItem, Input, InputNumber, InputPassword, Row, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { DEFAULT_I18N_BLOCK } from '../../../admin/constants/i18nCatalog'
import {
  DEFAULT_SITE_CONFIG,
  DEFAULT_SMTP_CONFIG,
  normalizeSmtpAccountsList,
  siteConfigApi
} from '../../../admin/mock/siteConfig'

const config = ref({
  ...DEFAULT_SITE_CONFIG,
  i18n: { ...DEFAULT_I18N_BLOCK }
})
const loading = ref(true)
const isSaving = ref(false)
const testingId = ref('')

const rows = computed(() => config.value.smtpAccounts || [])
const page = ref(1)
const blank = () => ({ name: '', host: '', fromEmail: '', status: 'all' })
const filters = ref(blank())
const fields = [
  { key: 'name', label: '名称' },
  { key: 'host', label: '服务器' },
  { key: 'fromEmail', label: '发件人邮箱' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'enabled', label: '启用' }, { value: 'disabled', label: '停用' }] }
]
const has = (value, query) => !query || String(value || '').toLowerCase().includes(String(query).trim().toLowerCase())
const filteredRows = computed(() => rows.value.filter((row) => {
  const f = filters.value
  return has(row.name, f.name) && has(row.host, f.host) && has(row.fromEmail, f.fromEmail) &&
    (f.status === 'all' || (f.status === 'enabled') === Boolean(row.enabled))
}))
const columns = [
  { key: 'name', title: '名称', width: 180 },
  { key: 'server', title: '服务器', width: 260 },
  { key: 'fromEmail', title: '发件人', width: 240 },
  { key: 'enabled', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 180, fixed: 'right' }
]
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }
const removeTarget = ref(null)
const testTarget = ref(null)
const testTo = ref('')

const showModal = ref(false)
/** @type {import('vue').Ref<string | null>} */
const editingId = ref(null)
const formName = ref('')
const formEnabled = ref(false)
const formHost = ref('')
const formPort = ref(587)
const formEncryption = ref('tls')
const formUsername = ref('')
const formPassword = ref('')
const formFromName = ref('')
const formFromEmail = ref('')
const formReplyTo = ref('')

function resetForm() {
  editingId.value = null
  formName.value = ''
  formEnabled.value = false
  formHost.value = ''
  formPort.value = DEFAULT_SMTP_CONFIG.port
  formEncryption.value = DEFAULT_SMTP_CONFIG.encryption
  formUsername.value = ''
  formPassword.value = ''
  formFromName.value = ''
  formFromEmail.value = ''
  formReplyTo.value = ''
}

function openAdd() {
  resetForm()
  showModal.value = true
}

function openEdit(row) {
  editingId.value = row.id
  formName.value = row.name || ''
  formEnabled.value = row.enabled
  formHost.value = row.host || ''
  formPort.value = row.port ?? DEFAULT_SMTP_CONFIG.port
  formEncryption.value = row.encryption || 'tls'
  formUsername.value = row.username || ''
  formPassword.value = row.password || ''
  formFromName.value = row.fromName || ''
  formFromEmail.value = row.fromEmail || ''
  formReplyTo.value = row.replyTo || ''
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
      config.value.smtpAccounts = normalizeSmtpAccountsList(
        config.value.smtpAccounts,
        true,
        config.value.smtp
      )
    }
  } catch (e) {
    message.error('加载失败：' + (e?.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

async function submitModal() {
  if (isSaving.value) return
  if (formEnabled.value) {
    if (!String(formHost.value ?? '').trim()) {
      message.warning('已启用时请填写 SMTP 服务器地址')
      return
    }
    if (!String(formFromEmail.value ?? '').trim()) {
      message.warning('已启用时请填写发件人邮箱')
      return
    }
  }

  const base = {
    name: String(formName.value ?? '').trim(),
    enabled: formEnabled.value,
    host: String(formHost.value ?? '').trim(),
    port: Number(formPort.value) || DEFAULT_SMTP_CONFIG.port,
    encryption: formEncryption.value,
    username: String(formUsername.value ?? ''),
    password: String(formPassword.value ?? ''),
    fromName: String(formFromName.value ?? '').trim(),
    fromEmail: String(formFromEmail.value ?? '').trim(),
    replyTo: String(formReplyTo.value ?? '').trim()
  }

  const newId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `smtp_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

  let list = [...(config.value.smtpAccounts || [])]
  if (editingId.value) {
    const i = list.findIndex((x) => x.id === editingId.value)
    if (i >= 0) {
      list[i] = { ...list[i], ...base }
    }
  } else {
    list.push({ id: newId, ...base })
  }

  const targetId = editingId.value || newId
  if (base.enabled) {
    list = list.map((row) => (row.id === targetId ? row : { ...row, enabled: false }))
  }

  config.value.smtpAccounts = normalizeSmtpAccountsList(list, true, undefined)
  if (await persist(editingId.value ? 'SMTP 账户已更新' : 'SMTP 账户已添加')) closeModal()
}

async function persist(successText) {
  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      message.success(successText || result.message || 'SMTP 配置已保存')
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
  config.value.smtpAccounts = (config.value.smtpAccounts || []).filter((x) => x.id !== row.id)
  if (await persist('SMTP 账户已删除')) removeTarget.value = null
}

function openTest(row) {
  testTo.value = ''
  testTarget.value = row
}

async function testRow() {
  const row = testTarget.value
  if (!row || testingId.value) return
  const trimmed = String(testTo.value || '').trim()
  if (!trimmed) {
    message.warning('请填写收件人邮箱')
    return
  }
  testingId.value = row.id
  try {
    const result = await siteConfigApi.testSmtp({ to: trimmed, smtpAccountId: row.id })
    if (result.success) {
      message.success(result.message || '测试邮件已发送')
      testTarget.value = null
    } else {
      message.error(result.message || '发送失败')
    }
  } catch (e) {
    message.error(e?.message || '发送失败')
  } finally {
    testingId.value = ''
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <PageShell>
    <SearchForm name="smtp-account-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="SMTP 账户" v-model:page="page" :rows="filteredRows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <TypographyText type="secondary">同一时刻仅允许启用一条，启用某条时会自动关闭其余账户</TypographyText>
          <Button type="primary" :disabled="loading" @click="openAdd"><template #icon><PlusOutlined /></template>添加 SMTP</Button>
        </Space>
      </template>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'name'" strong>{{ record.name || '—' }}</TypographyText>
        <span v-else-if="column.key === 'server'">
          <span class="font-mono">{{ record.host || '—' }}</span><TypographyText v-if="record.port" type="secondary">:{{ record.port }}</TypographyText>
        </span>
        <template v-else-if="column.key === 'fromEmail'">{{ record.fromEmail || '—' }}</template>
        <Tag v-else-if="column.key === 'enabled'" :color="record.enabled ? 'green' : 'default'">{{ record.enabled ? '启用' : '停用' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8" class="smtp-row-actions">
          <Button type="link" :disabled="isSaving" @click="openEdit(record)">编辑</Button>
          <Button type="link" :loading="testingId === record.id" :disabled="isSaving" @click="openTest(record)">测试</Button>
          <Button type="link" danger :disabled="isSaving" @click="removeTarget = record">删除</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showModal)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(760px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(showModal)"><div class="smtp-modal-title"><span>{{ editingId ? '编辑 SMTP' : '添加 SMTP' }}</span><a-button aria-label="关闭" type="text" html-type="button" :disabled="isSaving" @click="closeModal"><CloseOutlined /></a-button></div></template></template><template v-if="showModal">
          <Form layout="vertical" name="smtp-account-editor">
            <Row :gutter="16">
              <Col :span="12">
                <FormItem label="显示名称（可选）">
                  <a-input v-model:value="formName" placeholder="列表中区分多条账户" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="启用该账户" extra="启用后其他 SMTP 将自动关闭">
                  <a-switch v-model:checked="formEnabled" checked-children="启用" un-checked-children="停用" aria-label="启用该账户" />
                </FormItem>
              </Col>
              <Col :span="24">
                <FormItem label="SMTP 服务器" :required="formEnabled">
                  <a-input v-model:value="formHost" placeholder="例如：smtp.example.com" autocomplete="off" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="端口">
                  <InputNumber v-model:value="formPort" :min="1" :max="65535" :precision="0" class="smtp-number" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="加密方式">
                  <a-select v-model:value="formEncryption" :options="[{ value: 'none', label: '无' }, { value: 'tls', label: 'TLS（常用 587）' }, { value: 'ssl', label: 'SSL（常用 465）' }]" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="用户名">
                  <a-input v-model:value="formUsername" autocomplete="off" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="密码" extra="演示存于浏览器本地；上线后请由后端加密保管。">
                  <InputPassword v-model:value="formPassword" autocomplete="new-password" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="发件人名称">
                  <a-input v-model:value="formFromName" />
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem label="发件人邮箱" :required="formEnabled">
                  <a-input v-model:value="formFromEmail" type="email" />
                </FormItem>
              </Col>
              <Col :span="24">
                <FormItem label="回复地址（可选）">
                  <a-input v-model:value="formReplyTo" type="email" />
                </FormItem>
              </Col>
            </Row>
          </Form></template><template #footer><template v-if="Boolean(showModal)"><Space :size="8">
            <a-button html-type="button" :disabled="isSaving" @click="closeModal">取消</a-button>
            <a-button html-type="button" type="primary" :loading="isSaving" @click="submitModal">保存</a-button>
          </Space></template></template></a-modal>

    <AdminModal :open="!!testTarget" title="发送测试邮件" :width="520" :busy="Boolean(testingId)" confirm-text="发送" @close="testTarget = null" @confirm="testRow">
      <div v-if="testTarget">
        <TypographyText type="secondary">使用「{{ testTarget.name || testTarget.host || 'SMTP 账户' }}」发送测试邮件（演示为模拟成功）。</TypographyText>
        <Form layout="vertical" class="smtp-test-form">
          <FormItem label="收件人邮箱" required>
            <Input v-model:value="testTo" type="email" placeholder="name@example.com" aria-label="收件人邮箱" @press-enter="testRow" />
          </FormItem>
        </Form>
      </div>
    </AdminModal>

    <AdminModal :open="!!removeTarget" title="删除 SMTP 账户" :busy="isSaving" confirm-text="确认删除" danger @close="removeTarget = null" @confirm="removeRow">
      <div v-if="removeTarget"><TypographyText strong>{{ removeTarget.name || removeTarget.host || 'SMTP 账户' }}</TypographyText><p>删除后该账户的服务器与凭据配置将被移除。此操作不能撤销。</p></div>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.smtp-number{width:100%}
.smtp-test-form{margin-top:16px}
.smtp-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.smtp-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
