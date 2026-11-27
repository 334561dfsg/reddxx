<script setup>
// 周期模板 — Ant Design Pro list (2026-11-28): query card + table card; the editor and unsaved-change AdminDialogs are unchanged.
import AdminDialog from '../../../admin/components/antd/AdminDialog.vue'
import FeedbackToast from '../../../shared/feedback/FeedbackToast.vue'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { Button, Space, Tag, TypographyText } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { COMMON_FILTER_ALL, DELIVERY_STATUS } from '../../../admin/constants/delivery'
import { createDeliveryTemplatesMock, saveDeliveryTemplatesMock } from '../../../admin/mock/delivery'

const CYCLE_PREVIEW_LIMIT = 8
const expandedTemplateIds = ref(new Set())

const toggleExpand = (id) => {
  if (expandedTemplateIds.value.has(id)) {
    expandedTemplateIds.value.delete(id)
  } else {
    expandedTemplateIds.value.add(id)
  }
}

const isExpanded = (id) => expandedTemplateIds.value.has(id)
const visibleCycles = (tpl) => (isExpanded(tpl.id) ? tpl.cycles : tpl.cycles.slice(0, CYCLE_PREVIEW_LIMIT))

const templates = ref(createDeliveryTemplatesMock())

const blankFilters = () => ({ name: '', status: COMMON_FILTER_ALL })
const filters = ref(blankFilters())
const page = ref(1)
const queryFields = [
  { key: 'name', label: '模板名称' },
  { key: 'status', label: '状态', options: [{ value: COMMON_FILTER_ALL, label: '全部状态' }, { value: DELIVERY_STATUS.ENABLED, label: '已启用' }, { value: DELIVERY_STATUS.DISABLED, label: '已禁用' }] }
]

const allFilteredTemplates = computed(() => {
  const kw = filters.value.name.trim().toLowerCase()
  return templates.value.filter((t) => {
    const hitStatus = filters.value.status === COMMON_FILTER_ALL || t.status === filters.value.status
    const hitKw = !kw || t.name.toLowerCase().includes(kw)
    return hitStatus && hitKw
  })
})

const applySearch = (values) => { filters.value = { ...blankFilters(), ...values }; page.value = 1 }
const resetSearch = () => { filters.value = blankFilters(); page.value = 1 }

const templateColumns = [
  { key: 'name', title: '模板名称', width: 200, fixed: 'left' },
  { key: 'cycles', title: '预设周期（时长 · 收益率）', width: 520 },
  { key: 'cycleCount', title: '周期数', width: 90, align: 'right' },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 90, fixed: 'right' }
]

const durationLabel = (sec) => {
  if (sec < 60) return `${sec}秒`
  if (sec % 60 === 0) return `${sec / 60}分钟`
  return `${sec}s`
}

const showTemplateModal = ref(false)
const editingTemplateId = ref('')
const templateInitialSnapshot = ref('')
const templateHasSubmitted = ref(false)
const showTemplateUnsavedConfirm = ref(false)
const isTemplateClosing = ref(false)
const templateForm = reactive({
  name: '',
  status: DELIVERY_STATUS.ENABLED,
  cycles: []
})

const normalizeTemplateSnapshot = () =>
  JSON.stringify({
    name: templateForm.name.trim(),
    status: templateForm.status,
    cycles: templateForm.cycles.map((cycle) => ({
      id: cycle.id,
      durationSec: String(cycle.durationSec ?? ''),
      payoutPct: String(cycle.payoutPct ?? ''),
      actualPayoutPct: String(cycle.actualPayoutPct ?? '')
    }))
  })

const isTemplateDirty = computed(() => templateInitialSnapshot.value !== normalizeTemplateSnapshot())

const isValidNumber = (value) => value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value))

const templateErrors = computed(() => {
  const errors = []
  if (!templateForm.name.trim()) {
    errors.push({ id: 'template-name', message: '请输入模板名称。' })
  }
  if (templateForm.cycles.length === 0) {
    errors.push({ id: 'template-cycles-empty', message: '请至少添加一个周期。', tab: 'cycle' })
  }

  templateForm.cycles.forEach((cycle, index) => {
    const prefix = `周期${index + 1}`
    if (!isValidNumber(cycle.durationSec) || Number(cycle.durationSec) <= 0) {
      errors.push({ id: `cycle-${cycle.id}-durationSec`, message: `${prefix}的周期时长必须大于 0 秒。`, tab: 'cycle' })
    }
    if (!isValidNumber(cycle.payoutPct) || Number(cycle.payoutPct) < 0) {
      errors.push({ id: `cycle-${cycle.id}-payoutPct`, message: `${prefix}的收益率不能小于 0。`, tab: 'cycle' })
    }
    if (!isValidNumber(cycle.actualPayoutPct) || Number(cycle.actualPayoutPct) < 0) {
      errors.push({ id: `cycle-${cycle.id}-actualPayoutPct`, message: `${prefix}的实际收益率不能小于 0。`, tab: 'cycle' })
    }
  })

  return errors
})

const templateErrorMap = computed(() =>
  Object.fromEntries(templateErrors.value.map((error) => [error.id, error.message]))
)

const visibleTemplateErrors = computed(() => (templateHasSubmitted.value ? templateErrors.value : []))

const getTemplateFieldError = (fieldId) => (templateHasSubmitted.value ? templateErrorMap.value[fieldId] : '')

const getTemplateFieldDescribedBy = (...ids) => ids.filter(Boolean).join(' ') || undefined

const focusTemplateErrorTarget = (error) => {
  if (!error) return
  nextTick(() => {
    document.getElementById(error.id)?.focus()
  })
}

const performTemplateClose = () => {
  if (isTemplateClosing.value) return
  isTemplateClosing.value = true
  showTemplateModal.value = false
}

// Close requests go through the shared Ant frame (AdminDialog), which owns focus, Escape, background isolation and
// scroll lock (dialog migration 2026-11-27). Unsaved edits open the confirmation instead of closing.
const templateFrame = ref(null)
let forceTemplateClose = false
const templateRequestClose = () => {
  if (isTemplateClosing.value) return false
  if (!forceTemplateClose && isTemplateDirty.value) {
    showTemplateUnsavedConfirm.value = true
    return false
  }
  forceTemplateClose = false
  performTemplateClose()
}
const requestTemplateClose = ({ force = false } = {}) => {
  if (isTemplateClosing.value) return
  forceTemplateClose = force
  if (force) performTemplateClose()
  else templateFrame.value?.close()
}

const cancelTemplateUnsavedClose = () => {
  // Focus returns to the control that asked to close (the confirmation frame restores it).
  showTemplateUnsavedConfirm.value = false
}

// Close the confirmation first and the editor after it, so focus returns through each layer to the page trigger.
let closeTemplateAfterConfirm = false
const confirmTemplateUnsavedClose = () => {
  closeTemplateAfterConfirm = true
  showTemplateUnsavedConfirm.value = false
}
const handleTemplateUnsavedClosed = () => {
  if (!closeTemplateAfterConfirm) return
  closeTemplateAfterConfirm = false
  performTemplateClose()
}

const handleTemplateAfterLeave = () => {
  isTemplateClosing.value = false
  showTemplateUnsavedConfirm.value = false
}

watch(showTemplateModal, (visible) => {
  if (visible) {
    isTemplateClosing.value = false
    showTemplateUnsavedConfirm.value = false
  }
})

const openCreateTemplate = () => {
  editingTemplateId.value = ''
  templateHasSubmitted.value = false
  templateForm.name = ''
  templateForm.status = DELIVERY_STATUS.ENABLED
  templateForm.cycles = [{ id: `cy-${Date.now()}`, durationSec: 30, payoutPct: 7, actualPayoutPct: 0.49119369 }]
  templateInitialSnapshot.value = normalizeTemplateSnapshot()
  showTemplateModal.value = true
}

const openEditTemplate = (tpl) => {
  editingTemplateId.value = tpl.id
  templateHasSubmitted.value = false
  templateForm.name = tpl.name
  templateForm.status = tpl.status
  templateForm.cycles = tpl.cycles.map((item) => ({ ...item }))
  templateInitialSnapshot.value = normalizeTemplateSnapshot()
  showTemplateModal.value = true
}

const addCycle = () => {
  const id = `cy-${Date.now()}`
  templateForm.cycles.push({ id, durationSec: 60, payoutPct: 10, actualPayoutPct: 0.70170527 })
  nextTick(() => {
    document.getElementById(`cycle-${id}-durationSec`)?.focus()
  })
}

const removeCycle = (id) => {
  templateForm.cycles = templateForm.cycles.filter((c) => c.id !== id)
  nextTick(() => {
    document.getElementById('delivery-template-add-cycle')?.focus()
  })
}

const saveTemplate = () => {
  templateHasSubmitted.value = true
  if (templateErrors.value.length > 0) {
    focusTemplateErrorTarget(templateErrors.value[0])
    return
  }

  const payload = {
    name: templateForm.name.trim(),
    status: templateForm.status,
    cycles: templateForm.cycles.map((c) => ({
      ...c,
      durationSec: Number(c.durationSec),
      payoutPct: Number(c.payoutPct),
      actualPayoutPct: Number(c.actualPayoutPct)
    }))
  }

  if (editingTemplateId.value) {
    templates.value = templates.value.map((tpl) => (tpl.id === editingTemplateId.value ? { ...tpl, ...payload } : tpl))
  } else {
    templates.value.unshift({ id: `tpl-${Date.now()}`, ...payload })
  }

  templates.value = saveDeliveryTemplatesMock(templates.value)
  templateInitialSnapshot.value = normalizeTemplateSnapshot()
  requestTemplateClose({ force: true })
}

</script>

<template>
  <PageShell>
    <SearchForm name="delivery-template-filters" :model="filters" :fields="queryFields" @search="applySearch" @reset="resetSearch" />
    <AdminTable title="周期模板" v-model:page="page" :rows="allFilteredTemplates" :columns="templateColumns" row-key="id" desktop-only>
      <template #toolbar>
        <Button type="primary" @click="openCreateTemplate"><template #icon><PlusOutlined /></template>新增模板</Button>
      </template>
      <template #cell="{ column, record }">
        <Space v-if="column.key === 'name'" direction="vertical" :size="0">
          <TypographyText strong>{{ record.name }}</TypographyText>
          <TypographyText type="secondary" class="font-mono">{{ record.id }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'cycles'" :size="[8, 8]" wrap>
          <Tag v-for="cycle in visibleCycles(record)" :key="cycle.id">{{ durationLabel(cycle.durationSec) }} · 收益 {{ Number(cycle.payoutPct).toFixed(1) }}%</Tag>
          <Button v-if="record.cycles.length > CYCLE_PREVIEW_LIMIT" type="link" size="small" class="px-0" :aria-expanded="isExpanded(record.id)" @click="toggleExpand(record.id)">{{ isExpanded(record.id) ? '收起' : `展开全部（还有 ${record.cycles.length - CYCLE_PREVIEW_LIMIT} 个）` }}</Button>
          <TypographyText v-if="!record.cycles.length" type="secondary">无预设周期</TypographyText>
        </Space>
        <template v-else-if="column.key === 'cycleCount'">{{ record.cycles.length }}</template>
        <Tag v-else-if="column.key === 'status'" :color="record.status === DELIVERY_STATUS.ENABLED ? 'green' : 'default'">{{ record.status === DELIVERY_STATUS.ENABLED ? '已启用' : '已禁用' }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" :aria-label="`编辑周期模板 ${record.name}`" @click="openEditTemplate(record)">编辑</Button>
        <template v-else>{{ record[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <AdminDialog ref="templateFrame" :open="showTemplateModal" :title="editingTemplateId ? '编辑周期模板' : '新增周期模板'" title-id="delivery-template-dialog-title" :width="768" plain :request-close="templateRequestClose" @closed="handleTemplateAfterLeave">

          <div class="flex-1 overflow-y-auto bg-white p-6 space-y-6">
            <div class="space-y-6">
              <FeedbackToast v-if="visibleTemplateErrors.length > 0" type="error" :source="() => (visibleTemplateErrors.length > 0) ? (visibleTemplateErrors.map(item => item.message).join('；')) : ''"><a-button type="link" @click="focusTemplateErrorTarget(visibleTemplateErrors[0])">定位首个错误</a-button></FeedbackToast>

              <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-1.5">
                  <label for="template-name" class="text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 模板名称</label>
                  <a-input
                    id="template-name"
                    v-model:value="templateForm.name"
                    type="text"
                   
                    :class="getTemplateFieldError('template-name') ? 'border-rose-300' : ''"
                    placeholder="如：标准收益模板"
                    :aria-invalid="!!getTemplateFieldError('template-name')"
                    :aria-describedby="getTemplateFieldDescribedBy('template-name-help', getTemplateFieldError('template-name') ? 'template-name-error' : '')"
                  />
                  <p id="template-name-help" class="text-xs text-slate-400">用于后台识别该交割周期模板，保存后会显示在模板列表和产品配置中。</p>
                  <FeedbackToast v-if="getTemplateFieldError('template-name')" id="template-name-error" type="error" :source="() => (getTemplateFieldError('template-name')) ? (getTemplateFieldError('template-name')) : ''"></FeedbackToast>
                </div>
                <div class="space-y-1.5">
                  <label for="template-status" class="block text-sm font-medium text-slate-900">状态</label>
                  <a-select :get-popup-container="(trigger) => trigger.parentElement" id="template-status" v-model:value="templateForm.status" class="w-full">
                    <a-select-option :value="DELIVERY_STATUS.ENABLED">已启用</a-select-option>
                    <a-select-option :value="DELIVERY_STATUS.DISABLED">已禁用</a-select-option>
                  </a-select>
                  <p class="text-xs text-slate-400">禁用后不会影响已保存的产品展示，但不建议用于新产品选择。</p>
                </div>
              </div>

              <div
                id="delivery-template-cycle-section"
                tabindex="0"
                class="space-y-3 outline-none"
              >
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-slate-900"><span aria-hidden="true" class="text-rose-500 mr-1">*</span>周期配置</h3>
                  <a-button type="primary"
                    id="delivery-template-add-cycle"
                    html-type="button"
                    class="ant-btn ant-btn-sm ant-btn-primary inline-flex items-center gap-1"
                    @click="addCycle"
                    aria-label="添加周期配置"
                  >
                    <span>+</span>
                    <span>添加周期</span>
                  </a-button>
                </div>

                <div class="space-y-3">
                  <article
                    v-for="(cycle, index) in templateForm.cycles"
                    :key="cycle.id"
                    class="rounded-xl bg-slate-50 p-3"
                  >
                    <header class="mb-3 flex items-center justify-between">
                      <div class="flex items-center gap-2 text-sm font-medium text-slate-800">
                        <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">{{ index + 1 }}</span>
                        <span>周期{{ index + 1 }}</span>
                      </div>
                      <a-button type="text"
                        html-type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-xs leading-none text-slate-400 transition-colors hover:border-rose-300 hover:text-rose-500 focus:outline-none"
                        :aria-label="`删除周期${index + 1}`"
                        @click="removeCycle(cycle.id)"
                      >
                        −
                      </a-button>
                    </header>

                    <div class="grid gap-4 md:grid-cols-3">
                      <label class="space-y-1.5">
                        <span class="block text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 周期时长（秒）</span>
                          <a-input
                            :id="`cycle-${cycle.id}-durationSec`"
                            v-model:value.number="cycle.durationSec"
                            type="number"
                            inputmode="numeric"
                            :min="1"
                            :step="1"
                            class="w-full"
                            :class="getTemplateFieldError(`cycle-${cycle.id}-durationSec`) ? 'border-rose-300' : ''"
                            :aria-invalid="!!getTemplateFieldError(`cycle-${cycle.id}-durationSec`)"
                            :aria-describedby="getTemplateFieldDescribedBy(`cycle-${cycle.id}-durationSec-help`, getTemplateFieldError(`cycle-${cycle.id}-durationSec`) ? `cycle-${cycle.id}-durationSec-error` : '')"
                            @wheel.prevent
                          />
                        <span :id="`cycle-${cycle.id}-durationSec-help`" class="block text-xs text-slate-400">单位为秒，必须大于 0。</span>
                        <FeedbackToast v-if="getTemplateFieldError(`cycle-${cycle.id}-durationSec`)" :id="`cycle-${cycle.id}-durationSec-error`" type="error" :source="() => (getTemplateFieldError(`cycle-${cycle.id}-durationSec`)) ? (getTemplateFieldError(`cycle-${cycle.id}-durationSec`)) : ''"></FeedbackToast>
                      </label>
                      <label class="space-y-1.5">
                        <span class="block text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 收益率</span>
                        <a-input
                          :id="`cycle-${cycle.id}-payoutPct`"
                          v-model:value.number="cycle.payoutPct"
                          type="number"
                          inputmode="decimal"
                          :min="0"
                          :step="0.01"
                          class="w-full"
                          :class="getTemplateFieldError(`cycle-${cycle.id}-payoutPct`) ? 'border-rose-300' : ''"
                          :aria-invalid="!!getTemplateFieldError(`cycle-${cycle.id}-payoutPct`)"
                          :aria-describedby="getTemplateFieldDescribedBy(`cycle-${cycle.id}-payoutPct-help`, getTemplateFieldError(`cycle-${cycle.id}-payoutPct`) ? `cycle-${cycle.id}-payoutPct-error` : '')"
                          @wheel.prevent
                        />
                        <span :id="`cycle-${cycle.id}-payoutPct-help`" class="block text-xs text-slate-400">展示给用户的收益率，单位为 %。</span>
                        <FeedbackToast v-if="getTemplateFieldError(`cycle-${cycle.id}-payoutPct`)" :id="`cycle-${cycle.id}-payoutPct-error`" type="error" :source="() => (getTemplateFieldError(`cycle-${cycle.id}-payoutPct`)) ? (getTemplateFieldError(`cycle-${cycle.id}-payoutPct`)) : ''"></FeedbackToast>
                      </label>
                      <label class="space-y-1.5">
                        <span class="block text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 实际收益率</span>
                        <a-input
                          :id="`cycle-${cycle.id}-actualPayoutPct`"
                          v-model:value.number="cycle.actualPayoutPct"
                          type="number"
                          inputmode="decimal"
                          :min="0"
                          :step="0.00000001"
                          class="w-full"
                          :class="getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`) ? 'border-rose-300' : ''"
                          :aria-invalid="!!getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`)"
                          :aria-describedby="getTemplateFieldDescribedBy(`cycle-${cycle.id}-actualPayoutPct-help`, getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`) ? `cycle-${cycle.id}-actualPayoutPct-error` : '')"
                          @wheel.prevent
                        />
                        <span :id="`cycle-${cycle.id}-actualPayoutPct-help`" class="block text-xs text-slate-400">实际结算使用的收益率，支持 8 位小数。</span>
                        <FeedbackToast v-if="getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`)" :id="`cycle-${cycle.id}-actualPayoutPct-error`" type="error" :source="() => (getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`)) ? (getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`)) : ''"></FeedbackToast>
                      </label>
                    </div>

                    <div class="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>{{ durationLabel(cycle.durationSec) }}</span>
                      <span>实际：{{ Number(cycle.actualPayoutPct || 0).toFixed(4) }}%</span>
                    </div>
                  </article>
                  <div
                    v-if="templateForm.cycles.length === 0"
                    id="template-cycles-empty"
                    tabindex="-1"
                    class="rounded-xl bg-slate-50 p-8 text-center text-xs italic text-slate-400 outline-none"
                  >
                    暂无配置，请点击上方按钮添加周期
                  </div>
                </div>
              </div>

            </div>
          </div>

          <footer class="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <a-button
              html-type="button"
             
              @click="requestTemplateClose"
            >
              取消
            </a-button>
            <a-button type="primary"
              html-type="button"
              class="ant-btn ant-btn-primary"
              aria-label="保存周期模板"
              @click="saveTemplate"
            >
              保存模板
            </a-button>
          </footer>
    </AdminDialog>

    <AdminDialog :open="showTemplateUnsavedConfirm" title="关闭周期模板编辑？" title-id="delivery-template-unsaved-title" :width="448" plain :request-close="cancelTemplateUnsavedClose" @closed="handleTemplateUnsavedClosed">
                <div class="px-5 py-4 text-sm leading-6 text-slate-600">
                  当前周期模板有未保存的修改，关闭后这些修改不会保存。
                </div>
                <footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                  <a-button html-type="button" @click="cancelTemplateUnsavedClose">
                    继续编辑
                  </a-button>
                  <a-button type="primary" html-type="button" @click="confirmTemplateUnsavedClose">
                    确认关闭
                  </a-button>
                </footer>
    </AdminDialog>
  </PageShell>
</template>

