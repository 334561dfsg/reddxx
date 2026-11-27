<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
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
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function submitModal() {
  if (formEnabled.value) {
    if (!String(formHost.value ?? '').trim()) {
      alert('已启用时请填写 SMTP 服务器地址')
      return
    }
    if (!String(formFromEmail.value ?? '').trim()) {
      alert('已启用时请填写发件人邮箱')
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
  await persist()
  closeModal()
}

async function persist() {
  isSaving.value = true
  try {
    const result = await siteConfigApi.updateSiteConfig(config.value)
    if (result.success) {
      window.dispatchEvent(new CustomEvent('admin-site-config-updated'))
      await load()
    }
  } catch (e) {
    alert('保存失败：' + (e?.message || '未知错误'))
  } finally {
    isSaving.value = false
  }
}

async function removeRow(row) {
  if (!confirm(`确定删除该 SMTP 账户？${row.name ? `（${row.name}）` : ''}`)) return
  config.value.smtpAccounts = (config.value.smtpAccounts || []).filter((x) => x.id !== row.id)
  await persist()
}

async function testRow(row) {
  const to = window.prompt('填写收件人邮箱以发送测试邮件（演示为模拟成功）', '')
  if (to == null) return
  const trimmed = String(to).trim()
  if (!trimmed) {
    alert('请填写收件人邮箱')
    return
  }
  testingId.value = row.id
  try {
    const result = await siteConfigApi.testSmtp({ to: trimmed, smtpAccountId: row.id })
    if (result.success) alert(result.message)
  } catch (e) {
    alert(e?.message || '发送失败')
  } finally {
    testingId.value = ''
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">邮件服务 (SMTP)</h1>
        <p class="mt-1 text-sm text-slate-500">
          可配置多条 SMTP 备用；同一时刻仅允许启用一条，保存启用某条时会自动关闭其余账户。演示数据存于本地，生产环境应由服务端保管密码。品牌与站点信息仍在
          <RouterLink to="/admin/system/site-config" class="text-indigo-600 hover:underline">站点配置</RouterLink>
          。
        </p>
      </div>
      <button type="button" class="ant-btn ant-btn-primary shrink-0" :disabled="loading" @click="openAdd">
        添加 SMTP
      </button>
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-200 text-sm">
          <thead class="bg-slate-50/80">
            <tr>
              <th class="px-4 py-3 text-left font-medium text-slate-700">名称</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">服务器</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">发件人</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">状态</th>
              <th class="px-4 py-3 text-right font-medium text-slate-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="row in rows" :key="row.id">
              <td class="px-4 py-3 text-slate-900">{{ row.name || '—' }}</td>
              <td class="px-4 py-3">
                <span class="font-mono text-xs text-slate-800">{{ row.host || '—' }}</span>
                <span v-if="row.port" class="ml-1 text-xs text-slate-500">:{{ row.port }}</span>
              </td>
              <td class="px-4 py-3 text-xs text-slate-700">{{ row.fromEmail || '—' }}</td>
              <td class="px-4 py-3">
                <span
                  :class="
                    row.enabled ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800' : 'text-slate-500'
                  "
                >
                  {{ row.enabled ? '启用' : '停用' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right whitespace-nowrap">
                <button
                  type="button"
                  class="text-slate-600 hover:underline"
                  :disabled="testingId === row.id"
                  @click="testRow(row)"
                >
                  {{ testingId === row.id ? '发送中…' : '测试' }}
                </button>
                <span class="mx-2 text-slate-300">|</span>
                <button type="button" class="text-indigo-600 hover:underline" @click="openEdit(row)">编辑</button>
                <span class="mx-2 text-slate-300">|</span>
                <button type="button" class="text-red-600 hover:underline" @click="removeRow(row)">删除</button>
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="5" class="px-4 py-10 text-center text-sm text-slate-500">
                暂无 SMTP 账户，请点击「添加 SMTP」。
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[100] grid place-items-center bg-black/45 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="system-modal-title"
      >
        <div
          class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          <div class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 id="system-modal-title" class="text-lg font-semibold text-slate-900">{{ editingId ? '编辑 SMTP' : '添加 SMTP' }}</h2>
            <button type="button" class="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeModal">×</button>
          </div>
          <div class="space-y-4 px-5 py-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">显示名称（可选）</label>
              <input v-model="formName" type="text" class="ant-input w-full" placeholder="列表中区分多条账户" />
            </div>
            <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input v-model="formEnabled" type="checkbox" class="rounded border-slate-300" />
              启用该账户（启用后其他 SMTP 将自动关闭）
            </label>
            <div class="grid gap-4 md:grid-cols-2">
              <div class="md:col-span-2">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">SMTP 服务器</label>
                <input
                  v-model="formHost"
                  type="text"
                  class="ant-input w-full"
                  placeholder="例如：smtp.example.com"
                  autocomplete="off"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">端口</label>
                <input
                  v-model.number="formPort"
                  type="number"
                  min="1"
                  max="65535"
                  class="ant-input w-full max-w-[10rem]"
                />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">加密方式</label>
                <select v-model="formEncryption" class="ant-select w-full max-w-[10rem]">
                  <option value="none">无</option>
                  <option value="tls">TLS（常用 587）</option>
                  <option value="ssl">SSL（常用 465）</option>
                </select>
              </div>
              <div class="md:col-span-2">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">用户名</label>
                <input v-model="formUsername" type="text" class="ant-input w-full" autocomplete="off" />
              </div>
              <div class="md:col-span-2">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">密码</label>
                <input
                  v-model="formPassword"
                  type="password"
                  class="ant-input w-full"
                  autocomplete="new-password"
                />
                <p class="mt-1 text-xs text-amber-800/90">演示存于浏览器本地；上线后请由后端加密保管。</p>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">发件人名称</label>
                <input v-model="formFromName" type="text" class="ant-input w-full" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">发件人邮箱</label>
                <input v-model="formFromEmail" type="email" class="ant-input w-full" />
              </div>
              <div class="md:col-span-2">
                <label class="mb-1.5 block text-sm font-medium text-slate-700">回复地址（可选）</label>
                <input v-model="formReplyTo" type="email" class="ant-input w-full" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
            <button type="button" class="ant-btn" @click="closeModal">取消</button>
            <button type="button" class="ant-btn ant-btn-primary" :disabled="isSaving" @click="submitModal">
              {{ isSaving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
