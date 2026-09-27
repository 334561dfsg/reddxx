<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { DEFAULT_I18N_BLOCK, PHONE_DIAL_PRESETS } from '../../../admin/constants/i18nCatalog'
import { DEFAULT_SITE_CONFIG, normalizeSmsChannelsList, siteConfigApi } from '../../../admin/mock/siteConfig'

const dialLabelMap = Object.fromEntries(PHONE_DIAL_PRESETS.map((p) => [p.dial, p.label]))

const config = ref({
  ...DEFAULT_SITE_CONFIG,
  i18n: { ...DEFAULT_I18N_BLOCK }
})
const loading = ref(true)
const isSaving = ref(false)

/** @type {import('vue').Ref<string>} */
const dialFilter = ref('')

const filteredRows = computed(() => {
  const list = config.value.smsChannels || []
  const d = dialFilter.value
  if (!d) return list
  return list.filter((r) => (Array.isArray(r.dials) ? r.dials : [r.dial]).includes(d))
})

const showModal = ref(false)
/** @type {import('vue').Ref<string | null>} */
const editingId = ref(null)
const formDials = ref(['+86'])
const formName = ref('')
const formProvider = ref('')
const formEnabled = ref(true)
const formConfigJson = ref('{}')
const dialSearch = ref('')
const showDialPicker = ref(false)

const filteredDialOptions = computed(() => {
  const q = dialSearch.value.trim().toLowerCase()
  const selected = new Set(formDials.value)
  const base = PHONE_DIAL_PRESETS.filter((p) => !selected.has(p.dial))
  if (!q) return base
  return base.filter((p) => {
    return p.dial.toLowerCase().includes(q) || p.label.toLowerCase().includes(q)
  })
})

const selectedDialOptions = computed(() => {
  const selected = new Set(formDials.value)
  return PHONE_DIAL_PRESETS.filter((p) => selected.has(p.dial))
})

function resetForm() {
  editingId.value = null
  formDials.value = ['+86']
  formName.value = ''
  formProvider.value = ''
  formEnabled.value = true
  formConfigJson.value = '{}'
  dialSearch.value = ''
  showDialPicker.value = false
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
  showDialPicker.value = false
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
    console.error(e)
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

function toggleFormDial(dial, checked) {
  const set = new Set(formDials.value)
  if (checked) set.add(dial)
  else set.delete(dial)
  formDials.value = Array.from(set)
}

function clearFormDials() {
  formDials.value = []
}

function removeFormDial(dial) {
  formDials.value = formDials.value.filter((d) => d !== dial)
}

function addFormDial(dial) {
  toggleFormDial(dial, true)
  dialSearch.value = ''
  showDialPicker.value = false
}

function rowDials(row) {
  return Array.isArray(row.dials) && row.dials.length ? row.dials : [row.dial].filter(Boolean)
}

function dialSummary(row) {
  const dials = rowDials(row)
  return dials.map((dial) => dialLabelMap[dial] || dial).join('、')
}

async function submitModal() {
  if (formDials.value.length === 0) {
    alert('请至少选择一个国际区号')
    return
  }
  if (formEnabled.value && !String(formProvider.value ?? '').trim()) {
    alert('已勾选启用时，请填写通道类型（如 aliyun、twilio、custom）')
    return
  }
  let parsed
  try {
    parsed = parseConfigJson()
  } catch (e) {
    alert(e?.message || 'JSON 无效')
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
  if (!confirm(`确定删除该短信通道？（${dialSummary(row)}）`)) return
  config.value.smsChannels = (config.value.smsChannels || []).filter((x) => x.id !== row.id)
  await persist()
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">短信通道</h1>
        <p class="mt-1 text-sm text-slate-500">
          按国际区号维护多条短信通道；
          <RouterLink to="/admin/system/locale-settings" class="text-indigo-600 hover:underline">
            语言与区号
          </RouterLink>
          。
        </p>
      </div>
      <a-button html-type="button" class="shrink-0" :disabled="loading" @click="openAdd" type="primary">
        添加通道
      </a-button>
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 px-4 py-3">
        <label class="text-sm font-medium text-slate-700">按区号筛选</label>
        <a-select v-model:value="dialFilter" class="max-w-xs">
          <a-select-option value="">全部区号</a-select-option>
          <a-select-option v-for="p in PHONE_DIAL_PRESETS" :key="p.dial" :value="p.dial">{{ p.label }}</a-select-option>
        </a-select>
        <span class="text-xs text-slate-500">一个通道可同时适用于多个国际区号。</span>
      </div>

      <div class="overflow-x-auto">
        <a-table  :data-source="filteredRows" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" >
<a-table-column key="column-0" ><template #title>名称</template><template #default="{ record: row, index: index }"><div class="  text-slate-900">{{ row.name || '—' }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>适用区号</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="flex max-w-xl flex-wrap gap-1.5">
                  <span
                    v-for="dial in rowDials(row)"
                    :key="row.id + '-' + dial"
                    class="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700"
                  >
                    {{ dial }}
                    <span class="ml-1 font-sans text-slate-500">{{ dialLabelMap[dial] || '' }}</span>
                  </span>
                </div>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>通道类型</template><template #default="{ record: row, index: index }"><div class="  font-mono text-xs text-slate-800">{{ row.provider || '—' }}</div></template></a-table-column>
<a-table-column key="column-3" ><template #title>状态</template><template #default="{ record: row, index: index }"><div class=" ">
                <span
                  :class="
                    row.enabled ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800' : 'text-slate-500'
                  "
                >
                  {{ row.enabled ? '启用' : '停用' }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-4" align="right"><template #title>操作</template><template #default="{ record: row, index: index }"><div class="  text-right">
                <a-button html-type="button" class="text-indigo-600 hover:underline" @click="openEdit(row)">编辑</a-button>
                <span class="mx-2 text-slate-300">|</span>
                <a-button html-type="button" class="text-red-600 hover:underline" @click="removeRow(row)" danger>删除</a-button>
              </div></template></a-table-column><template #emptyText>
                暂无通道，请点击「添加通道」。
              </template>
</a-table>
      </div>
    </div>

    <!-- 添加/编辑：Teleport 到 body，避免 main overflow 导致 fixed 遮罩只盖住内容区 -->
    <Teleport to="body">
      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showModal)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(showModal)"><div class="flex items-center justify-between gap-3"><span>{{ editingId ? '编辑通道' : '添加通道' }}</span><a-button aria-label="关闭" html-type="button"   @click="closeModal">×</a-button></div></template></template><template v-if="showModal"><div class="border-b border-slate-200 px-5 py-4">
          <h2 class="text-lg font-semibold text-slate-900">{{ editingId ? '编辑通道' : '添加通道' }}</h2>
        </div>
<div class="space-y-4 px-5 py-4">
          <div>
            <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
              <label class="block text-sm font-medium text-slate-700">国际区号</label>
              <span class="text-xs text-slate-500">已选 {{ formDials.length }} 个</span>
            </div>
            <div class="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
              <div v-if="selectedDialOptions.length" class="flex flex-wrap gap-1.5">
                <a-button v-for="p in selectedDialOptions" :key="'selected-' + p.dial" html-type="button" class="inline-flex items-center gap-1 bg-indigo-50 text-xs text-indigo-800 ring-1 ring-inset ring-indigo-100" @click="removeFormDial(p.dial)">
                  <span class="font-mono">{{ p.dial }}</span>
                  <span>{{ p.label.replace(p.dial, '').trim() }}</span>
                  <span class="text-indigo-400">×</span>
                </a-button>
              </div>
              <p v-else class="text-sm text-slate-500">未选择区号</p>

              <div class="relative mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <a-button html-type="button" class="text-sm" @click="showDialPicker = !showDialPicker">
                  添加区号
                </a-button>
                <a-button html-type="button" class="!text-xs" @click="clearFormDials">
                  清空
                </a-button>

                <div
                  v-if="showDialPicker"
                  class="absolute left-0 top-10 z-10 w-full max-w-md rounded-lg border border-slate-200 bg-white p-2 shadow-lg"
                >
                  <a-input v-model:value="dialSearch" type="search" class="mb-2 w-full" placeholder="搜索国家/地区或区号" />
                  <div class="max-h-56 overflow-y-auto">
                    <a-button v-for="p in filteredDialOptions" :key="p.dial" html-type="button" class="flex w-full items-center justify-between text-left text-sm text-slate-700 hover:bg-slate-50" @click="addFormDial(p.dial)">
                      <span>{{ p.label }}</span>
                      <span class="font-mono text-xs text-slate-400">{{ p.dial }}</span>
                    </a-button>
                    <div v-if="filteredDialOptions.length === 0" class="px-2 py-6 text-center text-sm text-slate-500">
                      无可添加区号
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p class="mt-1.5 text-xs text-slate-500">可多选；发送短信时按用户手机号区号匹配可用通道。</p>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">通道名称（可选）</label>
            <a-input v-model:value="formName" type="text" class="w-full" placeholder="列表中展示用" />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">通道类型</label>
            <a-input v-model:value="formProvider" type="text" class="w-full" placeholder="如 aliyun、twilio、custom" autocomplete="off" />
          </div>
          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <a-checkbox v-model:checked="formEnabled" class="" />
            启用
          </label>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-slate-700">接口配置（JSON 对象）</label>
            <a-textarea v-model:value="formConfigJson" rows="10" spellcheck="false" class="w-full resize-y font-mono leading-relaxed" placeholder='例如：{ "accessKeyId": "", "signName": "", "templateCode": "" }' />
          </div>
        </div></template><template #footer><template v-if="Boolean(showModal)"><div class="flex justify-end gap-2 border-t border-slate-200 px-5 py-4">
          <a-button html-type="button" class="" @click="closeModal">取消</a-button>
          <a-button html-type="button" class="" :disabled="isSaving" @click="submitModal" type="primary">
            {{ isSaving ? '保存中…' : '保存' }}
          </a-button>
        </div></template></template></a-modal>
    </Teleport>
  </div>
</template>
