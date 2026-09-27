<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  DEFAULT_SITE_CONFIG,
  normalizeSocialLinksList,
  siteConfigApi
} from '../../../admin/mock/siteConfig'

const config = ref({ ...DEFAULT_SITE_CONFIG })
const loading = ref(true)
const isSaving = ref(false)

const rows = computed(() => config.value.socialLinks || [])

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
  formSort.value = rows.value.length * 10
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
    console.error(e)
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
    alert('请上传图片文件')
    event.target.value = ''
    return
  }
  if (file.size > 1024 * 1024) {
    alert('图标大小不能超过 1MB')
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
  if (!name) {
    alert('请填写社媒名称')
    return
  }
  if (!validateUrl(url)) {
    alert('请填写 http:// 或 https:// 开头的社媒链接')
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

async function toggleEnabled(row) {
  config.value.socialLinks = normalizeSocialLinksList(
    rows.value.map((x) => (x.id === row.id ? { ...x, enabled: !x.enabled } : x))
  )
  await persist()
}

async function removeRow(row) {
  if (!confirm(`确定删除该社媒链接？（${row.name || row.url}）`)) return
  config.value.socialLinks = rows.value.filter((x) => x.id !== row.id)
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
        <h1 class="text-2xl font-bold text-slate-900">社媒配置</h1>
        <p class="mt-1 text-sm text-slate-500">维护前台首页页脚展示的国内外社媒链接；仅已启用的链接会在前台展示。</p>
      </div>
      <a-button html-type="button" class="shrink-0" :disabled="loading" @click="openAdd" type="primary">
        添加社媒
      </a-button>
    </div>

    <div v-if="loading" class="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
      加载中…
    </div>

    <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <a-table  :data-source="rows" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" >
<a-table-column key="column-0" ><template #title>名称</template><template #default="{ record: row, index: index }"><div class="  font-medium text-slate-900">{{ row.name || '—' }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>图标</template><template #default="{ record: row, index: index }"><div class=" ">
                <div
                  class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <img v-if="row.iconUrl" :src="row.iconUrl" alt="" class="h-full w-full object-cover" />
                  <span v-else class="text-xs font-semibold text-slate-400">{{ row.name?.slice(0, 1) || '-' }}</span>
                </div>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>链接</template><template #default="{ record: row, index: index }"><div class=" ">
                <a
                  v-if="row.url"
                  :href="row.url"
                  target="_blank"
                  rel="noreferrer"
                  class="break-all text-xs text-indigo-600 hover:underline"
                >
                  {{ row.url }}
                </a>
                <span v-else class="text-slate-400">—</span>
              </div></template></a-table-column>
<a-table-column key="column-3" ><template #title>排序</template><template #default="{ record: row, index: index }"><div class="  tabular-nums text-slate-600">{{ row.sort }}</div></template></a-table-column>
<a-table-column key="column-4" ><template #title>状态</template><template #default="{ record: row, index: index }"><div class=" ">
                <span
                  :class="
                    row.enabled ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800' : 'text-slate-500'
                  "
                >
                  {{ row.enabled ? '已启用' : '已禁用' }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-5" align="right"><template #title>操作</template><template #default="{ record: row, index: index }"><div class="whitespace-nowrap   text-right">
                <a-button html-type="button" class="text-slate-600 hover:underline" @click="toggleEnabled(row)">
                  {{ row.enabled ? '禁用' : '启用' }}
                </a-button>
                <span class="mx-2 text-slate-300">|</span>
                <a-button html-type="button" class="text-indigo-600 hover:underline" @click="openEdit(row)">编辑</a-button>
                <span class="mx-2 text-slate-300">|</span>
                <a-button html-type="button" class="text-red-600 hover:underline" @click="removeRow(row)" danger>删除</a-button>
              </div></template></a-table-column><template #emptyText>
                暂无社媒链接，请点击「添加社媒」。
              </template>
</a-table>
      </div>
    </div>

    <Teleport to="body">
      <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showModal)" :mask-closable="false" :keyboard="false" :closable="false" :footer="null" width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(showModal)"><div class="flex items-center justify-between gap-3"><span>{{ editingId ? '编辑社媒' : '添加社媒' }}</span><a-button aria-label="关闭" html-type="button"   @click="closeModal">×</a-button></div></template></template><template v-if="showModal"><div class="border-b border-slate-200 px-5 py-4">
            <h2 class="text-lg font-semibold text-slate-900">{{ editingId ? '编辑社媒' : '添加社媒' }}</h2>
          </div>
<div class="space-y-4 px-5 py-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">名称</label>
              <a-input v-model:value="formName" type="text" class="w-full" placeholder="例如：X / Twitter、Telegram、微信公众号" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">链接</label>
              <a-input v-model:value="formUrl" type="url" class="w-full" placeholder="https://example.com" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">社媒图标</label>
              <div class="flex flex-wrap items-start gap-3">
                <div
                  class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50"
                >
                  <img v-if="formIconUrl" :src="formIconUrl" alt="" class="h-full w-full object-cover" />
                  <span v-else class="text-xs text-slate-400">无图</span>
                </div>
                <div class="min-w-0 flex-1 space-y-2">
                  <input
                    ref="iconFileInput"
                    type="file"
                    accept="image/*"
                    class="hidden"
                    @change="readIconFile"
                  />
                  <div class="flex flex-wrap gap-2">
                    <a-button html-type="button" class="" @click="triggerIconUpload" type="primary">上传图标</a-button>
                    <a-button v-if="formIconUrl" html-type="button" class="" @click="clearIcon">清除</a-button>
                  </div>
                  <a-input v-model:value="formIconUrl" type="text" class="w-full" placeholder="也可以填写图片 URL 或 data URL" />
                  <p class="text-xs text-slate-500">支持 PNG / JPG / SVG / WebP，单张不超过 1MB。</p>
                </div>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">排序</label>
                <a-input type="number" class="w-full" :value="formSort" @update:value="formSort = $event === '' ? '' : Number($event)" />
              </div>
              <label class="flex cursor-pointer items-center gap-2 pt-7 text-sm text-slate-700">
                <a-checkbox v-model:checked="formEnabled" class="" />
                启用该社媒链接
              </label>
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
