<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  USER_STATUS_OPTIONS,
  USER_ROLE_OPTIONS,
  USER_KYC_STATUS_OPTIONS,
  USER_TAG_RULE_STATUS,
  USER_TAG_RULE_STATUS_OPTIONS,
  USER_TAG_RULE_MATCH_MODE
} from '../../../admin/constants/user'
import {
  createUserTagRuleItem,
  deleteUserTagRuleItem,
  getUserTagRules,
  previewUserTagRule,
  updateUserTagRuleItem
} from '../../../admin/mock/user'

const keyword = ref('')
const statusFilter = ref('all')

const loading = ref(false)
const rules = ref([])

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const pageSizeOptions = [10, 20, 50]

const totalPages = computed(() => Math.max(1, Math.ceil(pagination.total / pagination.pageSize)))
const rangeStart = computed(() => {
  if (pagination.total === 0) return 0
  return (pagination.currentPage - 1) * pagination.pageSize + 1
})
const rangeEnd = computed(() => Math.min(pagination.currentPage * pagination.pageSize, pagination.total))

const pageItems = computed(() => {
  const total = totalPages.value
  const current = pagination.currentPage
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const items = [1]
  let start = Math.max(2, current - 1)
  let end = Math.min(total - 1, current + 1)

  if (current <= 3) {
    start = 2
    end = 4
  }
  if (current >= total - 2) {
    start = total - 3
    end = total - 1
  }

  if (start > 2) items.push('...')
  for (let i = start; i <= end; i++) items.push(i)
  if (end < total - 1) items.push('...')
  items.push(total)
  return items
})

const jumpTo = ref('')

const goToPage = (page) => {
  const p = Number(page)
  if (!Number.isFinite(p)) return
  const next = Math.min(Math.max(1, Math.floor(p)), totalPages.value)
  if (next === pagination.currentPage) return
  pagination.currentPage = next
}

const applyJump = () => {
  if (!jumpTo.value) return
  goToPage(jumpTo.value)
  jumpTo.value = ''
}

const fetchRules = async () => {
  loading.value = true
  try {
    const { list, total } = await getUserTagRules({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      keyword: keyword.value,
      status: statusFilter.value
    })
    rules.value = list
    pagination.total = total

    const pageCount = Math.max(1, Math.ceil(total / pagination.pageSize))
    if (pagination.currentPage > pageCount) {
      pagination.currentPage = pageCount
      return
    }
  } finally {
    loading.value = false
  }
}

watch([keyword, statusFilter], () => {
  if (pagination.currentPage !== 1) {
    pagination.currentPage = 1
    return
  }
  fetchRules()
})

watch(
  () => pagination.pageSize,
  () => {
    if (pagination.currentPage !== 1) {
      pagination.currentPage = 1
      return
    }
    fetchRules()
  }
)

watch(
  () => pagination.currentPage,
  () => {
    fetchRules()
  }
)

onMounted(fetchRules)

const summary = computed(() => {
  const total = pagination.total
  const enabled = rules.value.filter((r) => r.status === USER_TAG_RULE_STATUS.ENABLED).length
  const disabled = rules.value.filter((r) => r.status === USER_TAG_RULE_STATUS.DISABLED).length
  return [
    { label: '规则总数', value: total.toLocaleString() },
    { label: '已启用', value: enabled.toLocaleString() },
    { label: '已禁用', value: disabled.toLocaleString() }
  ]
})

const modalOpen = ref(false)
const modalMode = ref('create')
const editingRuleId = ref(null)

const previewLoading = ref(false)
const previewResult = ref(null)

const form = reactive({
  name: '',
  tag: '',
  status: USER_TAG_RULE_STATUS.ENABLED,
  priority: 100,
  matchMode: USER_TAG_RULE_MATCH_MODE.ALL,
  conditions: []
})

const resetPreview = () => {
  previewLoading.value = false
  previewResult.value = null
}

const resetForm = () => {
  form.name = ''
  form.tag = ''
  form.status = USER_TAG_RULE_STATUS.ENABLED
  form.priority = 100
  form.matchMode = USER_TAG_RULE_MATCH_MODE.ALL
  form.conditions = []
  resetPreview()
}

const conditionFields = [
  { value: 'status', label: '用户状态', type: 'enum', options: USER_STATUS_OPTIONS },
  { value: 'role', label: '用户角色', type: 'enum', options: USER_ROLE_OPTIONS },
  { value: 'kycStatus', label: '认证状态', type: 'enum', options: USER_KYC_STATUS_OPTIONS },
  { value: 'isVip', label: '是否VIP', type: 'boolean' },
  { value: 'creditScore', label: '信用分', type: 'number' },
  { value: 'balance', label: '账户余额', type: 'number' },
  { value: 'tradingVolume', label: '交易量', type: 'number' },
  { value: 'registerDays', label: '注册天数', type: 'number' }
]

const getFieldMeta = (field) => conditionFields.find((f) => f.value === field)

const operatorOptionsForField = (field) => {
  const meta = getFieldMeta(field)
  if (!meta) return []
  if (meta.type === 'number') {
    return [
      { value: 'gte', label: '≥' },
      { value: 'gt', label: '>' },
      { value: 'lte', label: '≤' },
      { value: 'lt', label: '<' },
      { value: 'eq', label: '=' },
      { value: 'neq', label: '≠' }
    ]
  }
  return [
    { value: 'eq', label: '等于' },
    { value: 'neq', label: '不等于' }
  ]
}

const addCondition = () => {
  form.conditions.push({ field: 'status', operator: 'eq', value: USER_STATUS_OPTIONS[0]?.value })
  resetPreview()
}

const removeCondition = (index) => {
  form.conditions.splice(index, 1)
  resetPreview()
}

const handleFieldChange = (index) => {
  const field = form.conditions[index]?.field
  const meta = getFieldMeta(field)
  const ops = operatorOptionsForField(field)
  form.conditions[index].operator = ops[0]?.value || 'eq'
  if (meta?.type === 'enum') form.conditions[index].value = meta.options[0]?.value
  else if (meta?.type === 'boolean') form.conditions[index].value = true
  else form.conditions[index].value = 0
  resetPreview()
}

const openCreate = () => {
  modalMode.value = 'create'
  editingRuleId.value = null
  resetForm()
  addCondition()
  modalOpen.value = true
}

const openEdit = (rule) => {
  modalMode.value = 'edit'
  editingRuleId.value = rule.id
  form.name = rule.name
  form.tag = rule.tag
  form.status = rule.status
  form.priority = rule.priority
  form.matchMode = rule.matchMode
  form.conditions = rule.conditions?.map((c) => ({ ...c })) || []
  resetPreview()
  modalOpen.value = true
}

const openDuplicate = (rule) => {
  modalMode.value = 'duplicate'
  editingRuleId.value = null
  form.name = `${rule.name} - 副本`
  form.tag = rule.tag
  form.status = rule.status
  form.priority = rule.priority
  form.matchMode = rule.matchMode
  form.conditions = rule.conditions?.map((c) => ({ ...c })) || []
  resetPreview()
  modalOpen.value = true
}

const closeModal = () => {
  modalOpen.value = false
}

const validateForm = () => {
  if (!form.name.trim()) return '请输入规则名称'
  if (!form.tag.trim()) return '请输入标签标识'
  if (!Array.isArray(form.conditions) || form.conditions.length === 0) return '请至少添加一个条件'
  return null
}

const submit = async () => {
  const error = validateForm()
  if (error) {
    alert(error)
    return
  }

  const payload = {
    name: form.name.trim(),
    tag: form.tag.trim(),
    status: form.status,
    priority: Number(form.priority),
    matchMode: form.matchMode,
    conditions: form.conditions.map((c) => ({ ...c }))
  }

  if (modalMode.value === 'edit' && editingRuleId.value) {
    await updateUserTagRuleItem(editingRuleId.value, payload)
  } else {
    await createUserTagRuleItem(payload)
  }

  closeModal()
  fetchRules()
}

const toggleStatus = async (rule) => {
  await updateUserTagRuleItem(rule.id, {
    status: rule.status === USER_TAG_RULE_STATUS.ENABLED ? USER_TAG_RULE_STATUS.DISABLED : USER_TAG_RULE_STATUS.ENABLED
  })
  fetchRules()
}

const deleteRule = async (rule) => {
  if (!confirm(`确定要删除规则「${rule.name}」吗？`)) return
  await deleteUserTagRuleItem(rule.id)
  fetchRules()
}

const preview = async () => {
  const error = validateForm()
  if (error) {
    alert(error)
    return
  }
  previewLoading.value = true
  try {
    previewResult.value = await previewUserTagRule({
      matchMode: form.matchMode,
      conditions: form.conditions.map((c) => ({ ...c }))
    })
  } finally {
    previewLoading.value = false
  }
}

const matchModeLabel = (mode) => {
  if (mode === USER_TAG_RULE_MATCH_MODE.ANY) return '任一满足'
  return '全部满足'
}

const statusLabel = (status) => {
  const item = USER_TAG_RULE_STATUS_OPTIONS.find((o) => o.value === status)
  return item?.label || '-'
}

const conditionSummary = (conditions = []) => {
  return conditions
    .map((c) => {
      const meta = getFieldMeta(c.field)
      const fieldLabel = meta?.label || c.field
      const opLabel = operatorOptionsForField(c.field).find((o) => o.value === c.operator)?.label || c.operator
      let valLabel = c.value
      if (meta?.type === 'enum') {
        valLabel = meta.options.find((o) => o.value === c.value)?.label || c.value
      }
      if (meta?.type === 'boolean') {
        valLabel = c.value ? '是' : '否'
      }
      return `${fieldLabel} ${opLabel} ${valLabel}`
    })
    .join('；')
}
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">用户标签规则</h1>
        <p class="text-sm text-slate-500 mt-1">配置用户打标签的规则，支持条件组合与优先级</p>
      </div>
      <button @click="openCreate" class="ant-btn ant-btn-primary">+ 新建规则</button>
    </div>

    <div class="grid gap-4 sm:grid-cols-3">
      <article
        v-for="card in summary"
        :key="card.label"
        class="rounded-xl border border-slate-200 bg-white p-4"
      >
        <p class="text-sm text-slate-500">{{ card.label }}</p>
        <p class="mt-2 text-2xl font-bold text-slate-900 font-mono">{{ card.value }}</p>
      </article>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <input
            v-model="keyword"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none"
            placeholder="搜索规则名称 / 标签"
          />
        </div>
        <div>
          <select
            v-model="statusFilter"
            class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none"
          >
            <option value="all">全部状态</option>
            <option v-for="opt in USER_TAG_RULE_STATUS_OPTIONS" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="py-10 text-center text-sm text-slate-500">加载中...</div>
      <div v-else class="overflow-x-auto rounded-lg border border-slate-200">
        <table class="w-full">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">优先级</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">规则名称</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">标签</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">匹配逻辑</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">条件概览</th>
              <th class="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">状态</th>
              <th class="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200">
            <tr v-for="rule in rules" :key="rule.id" class="hover:bg-slate-50 transition-colors">
              <td class="px-4 py-3">
                <span class="text-sm font-mono text-slate-700">{{ rule.priority }}</span>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm font-medium text-slate-900">{{ rule.name }}</p>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700">
                  {{ rule.tag }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="text-sm text-slate-700">{{ matchModeLabel(rule.matchMode) }}</span>
              </td>
              <td class="px-4 py-3">
                <p class="text-sm text-slate-600 line-clamp-2 max-w-[520px]">{{ conditionSummary(rule.conditions) }}</p>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex px-2 py-1 text-xs font-medium rounded-full"
                  :class="rule.status === USER_TAG_RULE_STATUS.ENABLED ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'"
                >
                  {{ statusLabel(rule.status) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <div class="inline-flex items-center gap-3">
                  <button class="text-sm text-slate-600 hover:text-slate-800" @click="toggleStatus(rule)">
                    {{ rule.status === USER_TAG_RULE_STATUS.ENABLED ? '禁用' : '启用' }}
                  </button>
                  <button class="text-sm text-blue-600 hover:text-blue-700 font-medium" @click="openEdit(rule)">编辑</button>
                  <button class="text-sm text-slate-600 hover:text-slate-800" @click="openDuplicate(rule)">复制</button>
                  <button class="text-sm text-rose-600 hover:text-rose-700 font-medium" @click="deleteRule(rule)">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && rules.length === 0">
              <td class="px-4 py-10 text-center text-sm text-slate-500" colspan="7">暂无规则</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="pagination.total > 0" class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <p class="text-sm text-slate-600">
            显示 <span class="font-medium">{{ rangeStart }}</span>-<span class="font-medium">{{ rangeEnd }}</span> /
            <span class="font-medium">{{ pagination.total }}</span> 条
          </p>
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600">每页</span>
            <select
              v-model.number="pagination.pageSize"
              class="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm focus:outline-none"
            >
              <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }}</option>
            </select>
            <span class="text-sm text-slate-600">条</span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 justify-end">
          <button
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            :disabled="pagination.currentPage <= 1"
            @click="goToPage(1)"
          >
            首页
          </button>
          <button
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            :disabled="pagination.currentPage <= 1"
            @click="goToPage(pagination.currentPage - 1)"
          >
            上一页
          </button>

          <button
            v-for="item in pageItems"
            :key="String(item)"
            class="min-w-9 px-3 py-1.5 rounded-lg border text-sm"
            :class="
              item === '...'
                ? 'border-transparent text-slate-400 cursor-default'
                : item === pagination.currentPage
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            "
            :disabled="item === '...'"
            @click="item === '...' ? null : goToPage(item)"
          >
            {{ item }}
          </button>

          <button
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            :disabled="pagination.currentPage >= totalPages"
            @click="goToPage(pagination.currentPage + 1)"
          >
            下一页
          </button>
          <button
            class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            :disabled="pagination.currentPage >= totalPages"
            @click="goToPage(totalPages)"
          >
            末页
          </button>

          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600">跳转</span>
            <input
              v-model="jumpTo"
              inputmode="numeric"
              class="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:outline-none"
              placeholder="页码"
              @keydown.enter="applyJump"
            />
            <button
              class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50"
              @click="applyJump"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="modalOpen" class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
      <section role="dialog" aria-modal="true" aria-labelledby="user-tag-rule-dialog-title" class="flex h-[88vh] w-full max-w-6xl overflow-hidden rounded-xl bg-white shadow-2xl">
        <div class="flex w-3/5 flex-col border-r border-slate-200">
          <header class="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-violet-50 to-blue-50 px-6 py-4">
            <div>
              <h2 id="user-tag-rule-dialog-title" class="text-xl font-semibold text-slate-900">
                {{ modalMode === 'edit' ? '编辑标签规则' : modalMode === 'duplicate' ? '复制标签规则' : '新建标签规则' }}
              </h2>
              <p class="mt-0.5 text-xs text-slate-500">配置规则的基础信息与条件组合</p>
            </div>
            <button type="button" aria-label="关闭" class="text-2xl text-slate-400 hover:text-slate-600 transition-colors" @click="closeModal">×</button>
          </header>

          <div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            <section class="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div class="flex items-center gap-2">
                <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <svg class="h-4 w-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 class="text-base font-semibold text-slate-900">基础信息</h3>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">规则名称 <span class="text-rose-500">*</span></span>
                  <input v-model="form.name" type="text" class="ant-input" placeholder="例如：高净值用户" @input="resetPreview" />
                </label>
                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">标签标识 <span class="text-rose-500">*</span></span>
                  <input v-model="form.tag" type="text" class="ant-input" placeholder="例如：HIGH_VALUE" @input="resetPreview" />
                </label>
                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">状态</span>
                  <select v-model="form.status" class="ant-select" @change="resetPreview">
                    <option v-for="opt in USER_TAG_RULE_STATUS_OPTIONS" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </label>
                <label class="block space-y-2">
                  <span class="text-sm font-medium text-slate-700">优先级（越小越先执行）</span>
                  <input v-model.number="form.priority" type="number" min="1" class="ant-input" @input="resetPreview" />
                </label>
                <div class="sm:col-span-2">
                  <p class="text-sm font-medium text-slate-700 mb-2">匹配逻辑</p>
                  <div class="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input v-model="form.matchMode" type="radio" :value="USER_TAG_RULE_MATCH_MODE.ALL" @change="resetPreview" />
                      满足全部条件
                    </label>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input v-model="form.matchMode" type="radio" :value="USER_TAG_RULE_MATCH_MODE.ANY" @change="resetPreview" />
                      满足任一条件
                    </label>
                  </div>
                </div>
              </div>
            </section>

            <section class="space-y-4 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                    <svg class="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 class="text-base font-semibold text-slate-900">条件</h3>
                </div>
                <button type="button" class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1" @click="addCondition">
                  <span class="text-base">+</span> 添加条件
                </button>
              </div>

              <div class="space-y-3">
                <div v-for="(cond, idx) in form.conditions" :key="idx" class="rounded-lg border border-blue-200 bg-white p-4 shadow-sm">
                  <div class="grid gap-3 sm:grid-cols-12 items-center">
                    <div class="sm:col-span-4">
                      <select v-model="cond.field" class="ant-select" @change="handleFieldChange(idx)">
                        <option v-for="f in conditionFields" :key="f.value" :value="f.value">{{ f.label }}</option>
                      </select>
                    </div>
                    <div class="sm:col-span-3">
                      <select v-model="cond.operator" class="ant-select" @change="resetPreview">
                        <option v-for="op in operatorOptionsForField(cond.field)" :key="op.value" :value="op.value">{{ op.label }}</option>
                      </select>
                    </div>
                    <div class="sm:col-span-4">
                      <template v-if="getFieldMeta(cond.field)?.type === 'enum'">
                        <select v-model="cond.value" class="ant-select" @change="resetPreview">
                          <option v-for="opt in getFieldMeta(cond.field)?.options || []" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                        </select>
                      </template>
                      <template v-else-if="getFieldMeta(cond.field)?.type === 'boolean'">
                        <select v-model="cond.value" class="ant-select" @change="resetPreview">
                          <option :value="true">是</option>
                          <option :value="false">否</option>
                        </select>
                      </template>
                      <template v-else>
                        <input v-model.number="cond.value" type="number" class="ant-input" @input="resetPreview" />
                      </template>
                    </div>
                    <div class="sm:col-span-1 text-right">
                      <button type="button" class="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors" @click="removeCondition(idx)">
                        删除
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="form.conditions.length === 0" class="rounded-lg border border-dashed border-blue-200 bg-white/60 p-6 text-center text-sm text-slate-500">
                  暂无条件，点击“添加条件”开始配置
                </div>
              </div>
            </section>
          </div>

          <footer class="border-t border-slate-200 bg-white px-6 py-4">
            <div class="flex items-center justify-end gap-3">
              <button type="button" class="ant-btn !h-10 !px-5" @click="closeModal">取消</button>
              <button type="button" class="ant-btn ant-btn-primary !h-10 !px-5" @click="submit">
                {{ modalMode === 'edit' ? '保存规则' : '创建规则' }}
              </button>
            </div>
          </footer>
        </div>

        <div class="flex w-2/5 flex-col bg-gradient-to-br from-slate-50 to-slate-100">
          <header class="border-b border-slate-200 px-5 py-4">
            <h3 class="text-lg font-semibold text-slate-900">规则预览</h3>
            <p class="mt-0.5 text-xs text-slate-500">查看规则表达式、命中样例和配置说明</p>
          </header>

          <div class="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-slate-900">规则概览</h4>
                <span
                  class="rounded-md px-2 py-1 text-xs font-medium"
                  :class="form.status === USER_TAG_RULE_STATUS.ENABLED ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'"
                >
                  {{ statusLabel(form.status) }}
                </span>
              </div>
              <div class="mt-3 space-y-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-500">规则名称</span>
                  <span class="font-medium text-slate-900">{{ form.name || '未命名规则' }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-500">标签</span>
                  <span class="font-mono font-semibold text-slate-900">{{ form.tag || '-' }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-500">匹配逻辑</span>
                  <span class="font-medium text-slate-900">{{ matchModeLabel(form.matchMode) }}</span>
                </div>
                <div class="flex items-center justify-between text-sm">
                  <span class="text-slate-500">优先级</span>
                  <span class="font-mono font-semibold text-slate-900">{{ Number(form.priority || 0) }}</span>
                </div>
                <div class="pt-2 border-t border-slate-100">
                  <p class="text-xs text-slate-500 font-medium">表达式</p>
                  <p class="mt-1 text-xs text-slate-700 leading-5">
                    {{ form.conditions.length ? conditionSummary(form.conditions) : '未配置条件' }}
                  </p>
                </div>
              </div>
            </div>

            <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-semibold text-emerald-900">命中预览</h4>
                <button
                  class="px-3 py-1.5 rounded-lg border border-emerald-200 text-sm bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="previewLoading"
                  @click="preview"
                >
                  {{ previewLoading ? '计算中...' : '预览命中用户' }}
                </button>
              </div>
              <div v-if="previewResult" class="mt-3 space-y-3">
                <p class="text-sm text-slate-700">
                  预计命中 <span class="font-mono font-semibold">{{ previewResult.count }}</span> 位用户（展示前 10 条）
                </p>
                <div class="overflow-x-auto rounded-lg border border-emerald-200 bg-white">
                  <table class="w-full">
                    <thead class="bg-emerald-50 border-b border-emerald-200">
                      <tr>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">用户ID</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">用户名</th>
                        <th class="px-4 py-2 text-left text-xs font-semibold text-emerald-800 uppercase tracking-wider">邮箱</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-emerald-100">
                      <tr v-for="u in previewResult.sample" :key="u.id">
                        <td class="px-4 py-2 text-xs font-mono text-slate-700">{{ u.id }}</td>
                        <td class="px-4 py-2 text-sm text-slate-700">{{ u.username }}</td>
                        <td class="px-4 py-2 text-sm text-slate-700">{{ u.email }}</td>
                      </tr>
                      <tr v-if="previewResult.sample.length === 0">
                        <td class="px-4 py-6 text-center text-sm text-slate-500" colspan="3">暂无命中</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <p v-else class="mt-3 text-sm text-slate-600">点击“预览命中用户”计算规则影响范围</p>
            </div>

            <div class="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div class="flex items-start gap-2">
                <svg class="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                </svg>
                <div class="text-xs text-amber-900 space-y-2">
                  <p class="font-medium">说明</p>
                  <div class="space-y-1">
                    <p>匹配逻辑：全部满足/任一满足，用于控制条件组合方式。</p>
                    <p>优先级：数值越小越先执行（用于将来按优先级打标/冲突处理）。</p>
                    <p>注册天数：由用户注册时间计算得出（今天 - 注册日）。</p>
                    <p>命中预览：当前基于模拟用户数据计算，用于快速评估规则范围。</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
