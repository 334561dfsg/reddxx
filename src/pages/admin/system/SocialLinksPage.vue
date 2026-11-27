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
      <button type="button" class="ant-btn ant-btn-primary shrink-0" :disabled="loading" @click="openAdd">
        添加社媒
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
              <th class="px-4 py-3 text-left font-medium text-slate-700">图标</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">链接</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">排序权重</th>
              <th class="px-4 py-3 text-left font-medium text-slate-700">状态</th>
              <th class="px-4 py-3 text-right font-medium text-slate-700">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 bg-white">
            <tr v-for="row in rows" :key="row.id">
              <td class="px-4 py-3 font-medium text-slate-900">{{ row.name || '—' }}</td>
              <td class="px-4 py-3">
                <div
                  class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                >
                  <img v-if="row.iconUrl" :src="row.iconUrl" alt="" class="h-full w-full object-cover" />
                  <span v-else class="text-xs font-semibold text-slate-400">{{ row.name?.slice(0, 1) || '-' }}</span>
                </div>
              </td>
              <td class="px-4 py-3">
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
              </td>
              <td class="px-4 py-3 tabular-nums text-slate-600">{{ row.sort }}</td>
              <td class="px-4 py-3">
                <span
                  :class="
                    row.enabled ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800' : 'text-slate-500'
                  "
                >
                  {{ row.enabled ? '已启用' : '已禁用' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-right">
                <button type="button" class="text-slate-600 hover:underline" @click="toggleEnabled(row)">
                  {{ row.enabled ? '禁用' : '启用' }}
                </button>
                <span class="mx-2 text-slate-300">|</span>
                <button type="button" class="text-indigo-600 hover:underline" @click="openEdit(row)">编辑</button>
                <span class="mx-2 text-slate-300">|</span>
                <button type="button" class="text-red-600 hover:underline" @click="removeRow(row)">删除</button>
              </td>
            </tr>
            <tr v-if="rows.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-sm text-slate-500">
                暂无社媒链接，请点击「添加社媒」。
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
        aria-labelledby="social-link-modal-title"
      >
        <div class="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
          <div class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <h2 id="social-link-modal-title" class="text-lg font-semibold text-slate-900">{{ editingId ? '编辑社媒' : '添加社媒' }}</h2>
            <button type="button" class="flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-lg text-2xl text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="关闭" @click="closeModal">×</button>
          </div>
          <div class="space-y-4 px-5 py-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">名称</label>
              <input v-model="formName" type="text" class="ant-input w-full" placeholder="例如：X / Twitter、Telegram、微信公众号" />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-slate-700">链接</label>
              <input v-model="formUrl" type="url" class="ant-input w-full" placeholder="https://example.com" />
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
                    <button type="button" class="ant-btn ant-btn-primary" @click="triggerIconUpload">上传图标</button>
                    <button v-if="formIconUrl" type="button" class="ant-btn" @click="clearIcon">清除</button>
                  </div>
                  <input
                    v-model="formIconUrl"
                    type="text"
                    class="ant-input w-full"
                    placeholder="也可以填写图片 URL 或 data URL"
                  />
                  <p class="text-xs text-slate-500">支持 PNG / JPG / SVG / WebP，单张不超过 1MB。</p>
                </div>
              </div>
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-slate-700">排序权重</label>
                <input v-model.number="formSort" type="number" class="ant-input w-full" />
                <p class="mt-1 text-xs text-slate-500">数值越大越靠前</p>
              </div>
              <label class="flex cursor-pointer items-center gap-2 pt-7 text-sm text-slate-700">
                <input v-model="formEnabled" type="checkbox" class="rounded border-slate-300" />
                启用该社媒链接
              </label>
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
