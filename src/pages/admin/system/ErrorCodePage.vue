<script setup>
// 平台配置 → 错误码管理: Ant Design Pro list page (2026-11-28) — query card with one field per filter (错误码 ID, 语言,
// 文案, 状态), table card with toolbar and pagination, link actions, status Tag, toast feedback and Ant confirmations.
// The mock is read in full and filtered/paginated in the page; like before the migration, 状态 defaults to 生效中
// (deleted codes are hidden until 全部状态 or 已删除 is chosen).
import { computed, onMounted, reactive, ref } from 'vue'
import { AutoComplete, Button, Form, FormItem, InputNumber, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { CloseOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import AdminModal from '../earn/EarnAdminModal.vue'
import { createErrorCode, deleteErrorCode, getErrorCodeLanguages, getErrorCodes, restoreErrorCode, updateErrorCode } from '../../../admin/mock/errorCode'

const loading = ref(false)
const list = ref([])
const languages = ref(['zh-CN', 'en-US'])
const page = ref(1)

const blank = () => ({ errorCodeId: '', language: 'all', name: '', status: 'active' })
const filters = ref(blank())
const fields = computed(() => [
  { key: 'errorCodeId', label: '错误码 ID' },
  { key: 'language', label: '语言', searchable: true, options: [{ value: 'all', label: '全部语言' }, ...languages.value.map((lang) => ({ value: lang, label: lang }))] },
  { key: 'name', label: '文案' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, { value: 'active', label: '生效中' }, { value: 'deleted', label: '已删除' }], default: 'active' }
])
const rows = computed(() => list.value.filter((row) => {
  const f = filters.value
  const id = String(f.errorCodeId || '').trim()
  const name = String(f.name || '').trim().toLowerCase()
  return (!id || String(row.error_code_id) === id) &&
    (f.language === 'all' || row.language === f.language) &&
    (!name || String(row.error_code_name || '').toLowerCase().includes(name)) &&
    (f.status === 'all' || (f.status === 'deleted') === Boolean(row.deleted_at))
}))
const columns = [
  { key: 'id', title: 'ID', width: 80 },
  { key: 'error_code_id', title: '错误码 ID', width: 120 },
  { key: 'language', title: '语言', width: 100 },
  { key: 'error_code_name', title: '文案', width: 320 },
  { key: 'created_at_text', title: '创建时间', width: 170 },
  { key: 'updated_at_text', title: '更新时间', width: 170 },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]
function search(values) { filters.value = { ...blank(), ...values }; page.value = 1 }
function reset() { filters.value = blank(); page.value = 1 }

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
    const { list: all } = await getErrorCodes({ page: 1, pageSize: Number.MAX_SAFE_INTEGER, includeDeleted: true })
    list.value = all
  } catch (e) {
    message.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

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
  error_code_id: null,
  language: 'zh-CN',
  error_code_name: ''
})

const resetForm = () => {
  form.id = null
  form.error_code_id = null
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
  if (!isFormValid.value || submitting.value) return
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

    message.success(modalMode.value === 'create' ? '错误码已创建' : '错误码已更新')
    modalOpen.value = false
    await loadLanguages()
    await loadList()
  } catch (e) {
    message.error(e?.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

const toggleTarget = ref(null)
const toggling = ref(false)

const toggleDelete = async () => {
  const row = toggleTarget.value
  if (!row || toggling.value) return
  toggling.value = true
  try {
    if (row.deleted_at) {
      await restoreErrorCode(row.id)
      message.success('错误码已恢复')
    } else {
      await deleteErrorCode(row.id)
      message.success('错误码已删除')
    }
    toggleTarget.value = null
    await loadList()
  } catch (e) {
    message.error(e?.message || '操作失败')
  } finally {
    toggling.value = false
  }
}
</script>

<template>
  <PageShell>
    <SearchForm name="error-code-filters" :model="filters" :fields="fields" @search="search" @reset="reset" />
    <AdminTable title="错误码" v-model:page="page" :rows="rows" :columns="columns" row-key="id" :loading="loading" desktop-only>
      <template #toolbar>
        <Space :size="8">
          <Button :disabled="loading" @click="loadList"><template #icon><ReloadOutlined /></template>刷新</Button>
          <Button type="primary" @click="openCreate"><template #icon><PlusOutlined /></template>新建错误码</Button>
        </Space>
      </template>
      <template #cell="{ column, record }">
        <TypographyText v-if="column.key === 'id'" type="secondary" class="font-mono">{{ formatId(record.id) }}</TypographyText>
        <span v-else-if="column.key === 'error_code_id'" class="font-mono">{{ formatId(record.error_code_id) }}</span>
        <TypographyText v-else-if="column.key === 'error_code_name'" :ellipsis="{ tooltip: record.error_code_name }" class="error-code-text">{{ record.error_code_name }}</TypographyText>
        <Tag v-else-if="column.key === 'status'" :color="record.deleted_at ? 'red' : 'green'">{{ record.deleted_at ? '已删除' : '生效中' }}</Tag>
        <Space v-else-if="column.key === 'actions'" :size="8" class="error-code-row-actions">
          <Button type="link" :disabled="Boolean(record.deleted_at)" @click="openEdit(record)">编辑</Button>
          <Button type="link" :danger="!record.deleted_at" @click="toggleTarget = record">{{ record.deleted_at ? '恢复' : '删除' }}</Button>
        </Space>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(modalOpen)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(560px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeModal"><template #title><template v-if="Boolean(modalOpen)"><div class="error-code-modal-title"><span>{{ modalMode === 'create' ? '新建错误码' : '编辑错误码' }}</span><a-button aria-label="关闭" type="text" html-type="button" :disabled="submitting" @click="closeModal"><CloseOutlined /></a-button></div></template></template><template v-if="modalOpen">
          <Form layout="vertical" name="error-code-editor">
            <FormItem label="错误码 ID" required extra="正整数；error_code_id + language 唯一。">
              <InputNumber v-model:value="form.error_code_id" :min="1" :precision="0" placeholder="例如 100001" class="error-code-number" />
            </FormItem>
            <FormItem label="语言" required extra="可从已有语言中选择，或直接输入新的语言代码。">
              <AutoComplete v-model:value="form.language" :options="languages.map((lang) => ({ value: lang }))" placeholder="例如 zh-CN" :filter-option="(input, option) => option.value.toLowerCase().includes(input.toLowerCase())" />
            </FormItem>
            <FormItem label="文案" required>
              <a-textarea v-model:value="form.error_code_name" :rows="3" />
            </FormItem>
          </Form></template><template #footer><template v-if="Boolean(modalOpen)"><Space :size="8">
          <a-button html-type="button" :disabled="submitting" @click="closeModal">取消</a-button>
          <a-button html-type="button" type="primary" :loading="submitting" :disabled="!isFormValid" @click="submit">保存</a-button>
        </Space></template></template></a-modal>

    <AdminModal :open="!!toggleTarget" :title="toggleTarget?.deleted_at ? '恢复错误码' : '删除错误码'" :width="520" :busy="toggling" :confirm-text="toggleTarget?.deleted_at ? '确认恢复' : '确认删除'" :danger="!toggleTarget?.deleted_at" @close="toggleTarget = null" @confirm="toggleDelete">
      <div v-if="toggleTarget">
        <TypographyText strong class="font-mono">{{ toggleTarget.error_code_id }} · {{ toggleTarget.language }}</TypographyText>
        <p>{{ toggleTarget.deleted_at ? '恢复后该文案重新生效。' : '删除后该文案不再生效，可在状态筛选「已删除」中恢复。' }}</p>
      </div>
    </AdminModal>
  </PageShell>
</template>

<style scoped>
.error-code-text{max-width:300px}
.error-code-number{width:100%}
.error-code-modal-title{display:flex;align-items:center;justify-content:space-between;gap:12px}
.error-code-row-actions :deep(.ant-btn-link){padding-inline:4px}
</style>
