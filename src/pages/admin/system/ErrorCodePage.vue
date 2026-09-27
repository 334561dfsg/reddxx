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
        <a-button html-type="button" class="!text-sm" @click="openCreate" type="primary">
          新建错误码
        </a-button>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div class="grid gap-3 md:grid-cols-4">
        <label class="block space-y-1">
          <span class="text-xs font-medium text-slate-600">错误码ID</span>
          <a-input type="number" inputmode="numeric" placeholder="例如 100001" class="w-full" :value="filters.errorCodeId" @update:value="filters.errorCodeId = $event === '' ? '' : Number($event)" />
        </label>

        <label class="block space-y-1">
          <span class="text-xs font-medium text-slate-600">语言</span>
          <a-select v-model:value="filters.language" class="w-full">
            <a-select-option value="">全部</a-select-option>
            <a-select-option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</a-select-option>
          </a-select>
        </label>

        <label class="block space-y-1 md:col-span-2">
          <span class="text-xs font-medium text-slate-600">关键词</span>
          <a-input v-model:value="filters.keyword" type="text" placeholder="搜索 error_code_name / error_code_id / language" class="w-full" />
        </label>
      </div>

      <div class="flex items-center justify-between gap-3">
        <label class="flex items-center gap-2 text-sm text-slate-600 select-none">
          <a-checkbox v-model:checked="filters.includeDeleted" class="w-4" />
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
        <a-table  :data-source="list" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" :custom-row="(row, index) => ({ class: [&quot;hover:bg-slate-50 transition-colors&quot;] })">
<a-table-column key="column-0" ><template #title>ID</template><template #default="{ record: row, index: index }"><div class="  text-xs font-mono text-slate-600">{{ formatId(row.id) }}</div></template></a-table-column>
<a-table-column key="column-1" ><template #title>错误码ID</template><template #default="{ record: row, index: index }"><div class="  text-sm text-slate-800 font-mono">{{ formatId(row.error_code_id) }}</div></template></a-table-column>
<a-table-column key="column-2" ><template #title>语言</template><template #default="{ record: row, index: index }"><div class="  text-sm text-slate-700">{{ row.language }}</div></template></a-table-column>
<a-table-column key="column-3" ><template #title>文案</template><template #default="{ record: row, index: index }"><div class="  text-sm text-slate-800">
                <div class="max-w-[520px] truncate" :title="row.error_code_name">{{ row.error_code_name }}</div>
              </div></template></a-table-column>
<a-table-column key="column-4" ><template #title>创建时间</template><template #default="{ record: row, index: index }"><div class="  text-sm text-slate-600">{{ row.created_at_text }}</div></template></a-table-column>
<a-table-column key="column-5" ><template #title>更新时间</template><template #default="{ record: row, index: index }"><div class="  text-sm text-slate-600">{{ row.updated_at_text }}</div></template></a-table-column>
<a-table-column key="column-6" ><template #title>状态</template><template #default="{ record: row, index: index }"><div class=" ">
                <span
                  class="rounded-full px-2 py-0.5 text-xs font-medium"
                  :class="row.deleted_at ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
                >
                  {{ row.deleted_at ? '已删除' : '生效中' }}
                </span>
              </div></template></a-table-column>
<a-table-column key="column-7" align="right"><template #title>操作</template><template #default="{ record: row, index: index }"><div class=" ">
                <div class="flex items-center justify-end gap-2">
                  <a-button html-type="button" class="!text-xs" :disabled="Boolean(row.deleted_at)" @click="openEdit(row)">
                    编辑
                  </a-button>
                  <a-button html-type="button" class="!text-xs" :class="row.deleted_at ? '!border-emerald-200 !text-emerald-700 hover:!border-emerald-300' : '!border-rose-200 !text-rose-700 hover:!border-rose-300'" @click="toggleDelete(row)">
                    {{ row.deleted_at ? '恢复' : '删除' }}
                  </a-button>
                </div>
              </div></template></a-table-column><template #emptyText>暂无数据</template>
</a-table>
      </div>

      <div v-if="pagination.total > 0" class="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
        <div class="text-sm text-slate-700">
          第 <span class="font-medium">{{ pagination.currentPage }}</span> / {{ totalPages }} 页
          <span class="text-slate-400 mx-2">·</span>
          每页
          <a-select v-model:value="pagination.pageSize" class="!w-20">
            <a-select-option :value="10">10</a-select-option>
            <a-select-option :value="20">20</a-select-option>
            <a-select-option :value="50">50</a-select-option>
            <a-select-option :value="100">100</a-select-option>
          </a-select>
          条
        </div>
        <a-pagination  size="small" :current="pagination.currentPage" :page-size="pagination.pageSize" :total="pagination.total" :show-size-changer="false"  :disabled="loading" @change="pagination.currentPage = $event" />
      </div>
    </article>

    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(modalOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(modalOpen)"><div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 class="text-base font-semibold text-slate-900">{{ modalMode === 'create' ? '新建错误码' : '编辑错误码' }}</h3>
          <a-button aria-label="关闭" html-type="button" class="text-slate-500 hover:bg-slate-100" @click="closeModal">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </a-button>
        </div></template></template><template v-if="modalOpen"><div class="p-5 space-y-4">
          <label class="block space-y-1">
            <span class="text-xs font-medium text-slate-600">错误码ID</span>
            <a-input type="number" inputmode="numeric" class="w-full" :value="form.error_code_id" @update:value="form.error_code_id = $event === '' ? '' : Number($event)" />
          </label>

          <label class="block space-y-1">
            <span class="text-xs font-medium text-slate-600">语言</span>
            <div class="flex items-center gap-2">
              <a-select v-model:value="form.language" class="min-w-0 flex-1">
                <a-select-option v-for="lang in languages" :key="lang" :value="lang">{{ lang }}</a-select-option>
              </a-select>
              <a-input v-model:value="form.language" type="text" placeholder="或手动输入" class="w-40" />
            </div>
          </label>

          <label class="block space-y-1">
            <span class="text-xs font-medium text-slate-600">文案</span>
            <a-textarea v-model:value="form.error_code_name" rows="3" class="w-full"></a-textarea>
          </label>
        </div></template><template #footer><template v-if="Boolean(modalOpen)"><div class="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
          <a-button html-type="button" class="!text-sm" :disabled="submitting" @click="closeModal">取消</a-button>
          <a-button html-type="button" class="!text-sm disabled:opacity-50 disabled:cursor-not-allowed" :disabled="submitting || !isFormValid" @click="submit" type="primary">
            {{ submitting ? '提交中...' : '保存' }}
          </a-button>
        </div></template></template></a-modal>
  </section>
</template>
