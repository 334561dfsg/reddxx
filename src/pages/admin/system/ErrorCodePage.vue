<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { createErrorCode, deleteErrorCode, getErrorCodeLanguages, getErrorCodes, restoreErrorCode, updateErrorCode } from '../../../admin/mock/errorCode'

const loading = ref(false)
const list = ref([])
const languages = ref(['zh-CN', 'en-US'])

const filters = reactive({
  errorCodeId: '',
  language: '',
  keyword: '',
  includeDeleted: false
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)))

const loadLanguages = async () => {
  try {
    const langs = await getErrorCodeLanguages()
    if (Array.isArray(langs) && langs.length > 0) languages.value = langs
  } catch (_) {
  }
}

const loadList = async () => {
  loading.value = true
  try {
    const { list: rows, total } = await getErrorCodes({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      keyword: filters.keyword,
      errorCodeId: filters.errorCodeId,
      language: filters.language,
      includeDeleted: filters.includeDeleted
    })
    list.value = rows
    pagination.total = total
    if (pagination.currentPage > totalPages.value) {
      pagination.currentPage = totalPages.value
      return
    }
  } catch (e) {
    alert(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

watch(
  () => [filters.errorCodeId, filters.language, filters.keyword, filters.includeDeleted, pagination.pageSize],
  () => {
    if (pagination.currentPage !== 1) {
      pagination.currentPage = 1
      return
    }
    loadList()
  }
)

watch(
  () => pagination.currentPage,
  () => {
    loadList()
  }
)

onMounted(async () => {
  await loadLanguages()
  await loadList()
})

const formatId = (n) => (n === null || n === undefined ? '-' : String(n))

const modalOpen = ref(false)
const modalMode = ref('create')
const submitting = ref(false)

const form = reactive({
  id: null,
  error_code_id: '',
  language: 'zh-CN',
  error_code_name: ''
})

const resetForm = () => {
  form.id = null
  form.error_code_id = ''
  form.language = languages.value[0] || 'zh-CN'
  form.error_code_name = ''
}

const openCreate = () => {
  modalMode.value = 'create'
  resetForm()
  modalOpen.value = true
}

const openEdit = (row) => {
  modalMode.value = 'edit'
  form.id = row.id
  form.error_code_id = row.error_code_id
  form.language = row.language
  form.error_code_name = row.error_code_name
  modalOpen.value = true
}

const closeModal = () => {
  if (submitting.value) return
  modalOpen.value = false
}

const isFormValid = computed(() => {
  const id = Number(form.error_code_id)
  return Boolean(
    Number.isFinite(id) &&
      id > 0 &&
      String(form.language || '').trim() &&
      String(form.error_code_name || '').trim()
  )
})

const submit = async () => {
  if (!isFormValid.value) return
  submitting.value = true
  try {
    const payload = {
      error_code_id: Number(form.error_code_id),
      language: String(form.language).trim(),
      error_code_name: String(form.error_code_name).trim()
    }

    if (modalMode.value === 'create') {
      await createErrorCode(payload)
    } else {
      await updateErrorCode(form.id, payload)
    }

    modalOpen.value = false
    await loadLanguages()
    await loadList()
  } catch (e) {
    alert(e?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const toggleDelete = async (row) => {
  const confirmText = row.deleted_at ? '确认恢复该错误码？' : '确认删除该错误码？'
  if (!window.confirm(confirmText)) return

  try {
    if (row.deleted_at) {
      await restoreErrorCode(row.id)
    } else {
      await deleteErrorCode(row.id)
    }
    await loadList()
  } catch (e) {
    alert(e?.message || '操作失败')
  }
}

const prevPage = () => {
  if (pagination.currentPage > 1) pagination.currentPage--
}

const nextPage = () => {
  if (pagination.currentPage < totalPages.value) pagination.currentPage++
}
</script>

<template>
  <section class="space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">错误码管理</h1>
        <p class="mt-1 text-sm text-slate-500">维护 error_code_id + language 唯一的错误文案</p>
      </div>

      <div class="flex items-center gap-2">
        <button type="button" class="ant-btn ant-btn-primary !h-9 !px-4 !text-sm" @click="openCreate">
          新建错误码
        </button>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div class="grid gap-3 md:grid-cols-4">
        <label class="block space-y-1">
          <span class="text-xs font-medium text-slate-600">错误码ID</span>
          <input
            v-model="filters.errorCodeId"
            type="number"
            inputmode="numeric"
            placeholder="例如 100001"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </label>

        <label class="block space-y-1">
          <span class="text-xs font-medium text-slate-600">语言</span>
          <select
            v-model="filters.language"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          >
            <option value="">全部</option>
            <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
          </select>
        </label>

        <label class="block space-y-1 md:col-span-2">
          <span class="text-xs font-medium text-slate-600">关键词</span>
          <input
            v-model="filters.keyword"
            type="text"
            placeholder="搜索 error_code_name / error_code_id / language"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
          />
        </label>
      </div>

      <div class="flex items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-sm text-slate-600 select-none">
          <input v-model="filters.includeDeleted" type="checkbox" class="h-4 w-4" />
          显示已删除
        </label>

        <div class="text-sm text-slate-600">
          共 <span class="font-medium">{{ pagination.total }}</span> 条
        </div>
      </div>
    </article>

    <article class="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div v-if="loading" class="p-12 text-center">
        <div class="mx-auto h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <p class="mt-4 text-sm text-slate-500">正在加载...</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">错误码ID</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">语言</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">文案</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">创建时间</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">更新时间</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-slate-200">
            <tr v-for="row in list" :key="row.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3 text-xs font-mono text-slate-600">{{ formatId(row.id) }}</td>
              <td class="px-4 py-3 text-sm text-slate-800 font-mono">{{ formatId(row.error_code_id) }}</td>
              <td class="px-4 py-3 text-sm text-slate-700">{{ row.language }}</td>
              <td class="px-4 py-3 text-sm text-slate-800">
                <div class="max-w-[520px] truncate" :title="row.error_code_name">{{ row.error_code_name }}</div>
              </td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ row.created_at_text }}</td>
              <td class="px-4 py-3 text-sm text-slate-600">{{ row.updated_at_text }}</td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="row.deleted_at ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
                >
                  {{ row.deleted_at ? '已删除' : '生效中' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    class="ant-btn !h-8 !px-3 !text-xs"
                    :disabled="Boolean(row.deleted_at)"
                    @click="openEdit(row)"
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    class="ant-btn !h-8 !px-3 !text-xs"
                    :class="row.deleted_at ? '!border-emerald-200 !text-emerald-700 hover:!border-emerald-300' : '!border-rose-200 !text-rose-700 hover:!border-rose-300'"
                    @click="toggleDelete(row)"
                  >
                    {{ row.deleted_at ? '恢复' : '删除' }}
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="list.length === 0">
              <td colspan="8" class="px-6 py-10 text-center text-sm text-slate-500">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination.total > 0" class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div class="text-sm text-slate-700">
          第 <span class="font-medium">{{ pagination.currentPage }}</span> / {{ totalPages }} 页
          <span class="text-slate-400 mx-2">·</span>
          每页
          <select v-model="pagination.pageSize" class="ant-select !w-20 !h-7 !py-0 !px-1 text-xs">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
          条
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ant-btn !h-8 !px-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.currentPage === 1 || loading"
            @click="prevPage"
          >
            上一页
          </button>
          <button
            type="button"
            class="ant-btn !h-8 !px-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.currentPage === totalPages || loading"
            @click="nextPage"
          >
            下一页
          </button>
        </div>
      </div>
    </article>

    <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="error-code-modal-title">
      <div class="w-full max-w-lg rounded-xl bg-white shadow-xl overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 id="error-code-modal-title" class="text-base font-semibold text-slate-900">{{ modalMode === 'create' ? '新建错误码' : '编辑错误码' }}</h3>
          <button type="button" class="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="关闭" @click="closeModal">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-5 space-y-4">
          <label class="block space-y-1">
            <span class="text-xs font-medium text-slate-600">错误码ID</span>
            <input
              v-model="form.error_code_id"
              type="number"
              inputmode="numeric"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
            />
          </label>

          <label class="block space-y-1">
            <span class="text-xs font-medium text-slate-600">语言</span>
            <div class="flex items-center gap-2">
              <select
                v-model="form.language"
                class="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              >
                <option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</option>
              </select>
              <input
                v-model="form.language"
                type="text"
                placeholder="或手动输入"
                class="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
              />
            </div>
          </label>

          <label class="block space-y-1">
            <span class="text-xs font-medium text-slate-600">文案</span>
            <textarea
              v-model="form.error_code_name"
              rows="3"
              class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
            ></textarea>
          </label>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <button type="button" class="ant-btn !h-9 !px-4 !text-sm" :disabled="submitting" @click="closeModal">取消</button>
          <button
            type="button"
            class="ant-btn ant-btn-primary !h-9 !px-4 !text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="submitting || !isFormValid"
            @click="submit"
          >
            {{ submitting ? '提交中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
