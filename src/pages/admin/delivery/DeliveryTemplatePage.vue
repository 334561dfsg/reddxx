<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { COMMON_FILTER_ALL, DELIVERY_STATUS } from '../../../admin/constants/delivery'
import { createDeliveryTemplatesMock, saveDeliveryTemplatesMock } from '../../../admin/mock/delivery'

const statusTab = ref(COMMON_FILTER_ALL)
const search = ref('')
const expandedTemplateIds = ref(new Set())

const toggleExpand = (id) => {
  if (expandedTemplateIds.value.has(id)) {
    expandedTemplateIds.value.delete(id)
  } else {
    expandedTemplateIds.value.add(id)
  }
}

const isExpanded = (id) => expandedTemplateIds.value.has(id)

const templates = ref(createDeliveryTemplatesMock())

// 分页状态
const pagination = reactive({
  currentPage: 1,
  pageSize: 5,
  total: 0
})

const allFilteredTemplates = computed(() => {
  const kw = search.value.trim().toLowerCase()
  return templates.value.filter((t) => {
    const hitStatus = statusTab.value === COMMON_FILTER_ALL || t.status === statusTab.value
    const hitKw = !kw || t.name.toLowerCase().includes(kw)
    return hitStatus && hitKw
  })
})

const filteredTemplates = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return allFilteredTemplates.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(allFilteredTemplates.value.length / pagination.pageSize))

// 监听筛选变化，重置页码
watch([statusTab, search], () => {
  pagination.currentPage = 1
})

const durationLabel = (sec) => {
  if (sec < 60) return `${sec}秒`
  if (sec % 60 === 0) return `${sec / 60}分钟`
  return `${sec}s`
}

const showTemplateModal = ref(false)
const editingTemplateId = ref('')
const templateDialogTitleRef = ref(null)
const templateDialogPanelRef = ref(null)
const templateUnsavedDialogTitleRef = ref(null)
const templateUnsavedDialogPanelRef = ref(null)
const templateTriggerRef = ref(null)
const templateInitialSnapshot = ref('')
const templateHasSubmitted = ref(false)
const showTemplateUnsavedConfirm = ref(false)
const isTemplateClosing = ref(false)
const previousBodyOverflow = ref('')
const previousAppAriaHidden = ref(null)
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

const lockPageScroll = () => {
  if (typeof document === 'undefined') return
  previousBodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

const unlockPageScroll = () => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = previousBodyOverflow.value
}

const isolateTemplateDialogBackground = () => {
  if (typeof document === 'undefined') return
  const appRoot = document.getElementById('app')
  if (!appRoot) return
  previousAppAriaHidden.value = appRoot.getAttribute('aria-hidden')
  appRoot.setAttribute('aria-hidden', 'true')
  appRoot.inert = true
}

const releaseTemplateDialogBackground = () => {
  if (typeof document === 'undefined') return
  const appRoot = document.getElementById('app')
  if (!appRoot) return
  if (previousAppAriaHidden.value === null) {
    appRoot.removeAttribute('aria-hidden')
  } else {
    appRoot.setAttribute('aria-hidden', previousAppAriaHidden.value)
  }
  appRoot.inert = false
  previousAppAriaHidden.value = null
}

const rememberTemplateTrigger = () => {
  if (typeof document === 'undefined') return
  const activeElement = document.activeElement
  templateTriggerRef.value = activeElement instanceof HTMLElement ? activeElement : null
}

const focusTemplateDialogTitle = () => {
  nextTick(() => {
    templateDialogTitleRef.value?.focus()
  })
}

const focusTemplateUnsavedDialogTitle = () => {
  nextTick(() => {
    templateUnsavedDialogTitleRef.value?.focus()
  })
}

const performTemplateClose = () => {
  if (isTemplateClosing.value) return
  isTemplateClosing.value = true
  showTemplateModal.value = false
}

const requestTemplateClose = ({ force = false } = {}) => {
  if (isTemplateClosing.value) return
  if (!force && isTemplateDirty.value) {
    showTemplateUnsavedConfirm.value = true
    focusTemplateUnsavedDialogTitle()
    return
  }
  performTemplateClose()
}

const cancelTemplateUnsavedClose = () => {
  showTemplateUnsavedConfirm.value = false
  nextTick(() => {
    templateDialogTitleRef.value?.focus()
  })
}

const confirmTemplateUnsavedClose = () => {
  showTemplateUnsavedConfirm.value = false
  performTemplateClose()
}

const handleTemplateAfterLeave = () => {
  unlockPageScroll()
  releaseTemplateDialogBackground()
  isTemplateClosing.value = false
  showTemplateUnsavedConfirm.value = false
  templateTriggerRef.value?.focus?.()
  templateTriggerRef.value = null
}

const getFocusableElements = (panel) => {
  if (!panel) return []
  return Array.from(
    panel.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true')
}

const getTemplateFocusableElements = () => getFocusableElements(templateDialogPanelRef.value)

const getTemplateUnsavedFocusableElements = () => getFocusableElements(templateUnsavedDialogPanelRef.value)

const trapFocus = (event, focusableElements, fallback) => {
  if (focusableElements.length === 0) {
    event.preventDefault()
    fallback?.focus()
    return
  }

  const first = focusableElements[0]
  const last = focusableElements[focusableElements.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const handleTemplateDialogKeydown = (event) => {
  if (showTemplateUnsavedConfirm.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      cancelTemplateUnsavedClose()
      return
    }
    if (event.key === 'Tab') {
      trapFocus(event, getTemplateUnsavedFocusableElements(), templateUnsavedDialogTitleRef.value)
    }
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    requestTemplateClose()
    return
  }
  if (event.key !== 'Tab') return

  trapFocus(event, getTemplateFocusableElements(), templateDialogTitleRef.value)
}

watch(showTemplateModal, (visible) => {
  if (visible) {
    lockPageScroll()
    isolateTemplateDialogBackground()
    isTemplateClosing.value = false
    showTemplateUnsavedConfirm.value = false
    focusTemplateDialogTitle()
  }
})

onBeforeUnmount(() => {
  unlockPageScroll()
  releaseTemplateDialogBackground()
})

const openCreateTemplate = () => {
  rememberTemplateTrigger()
  editingTemplateId.value = ''
  templateHasSubmitted.value = false
  templateForm.name = ''
  templateForm.status = DELIVERY_STATUS.ENABLED
  templateForm.cycles = [{ id: `cy-${Date.now()}`, durationSec: 30, payoutPct: 7, actualPayoutPct: 0.49119369 }]
  templateInitialSnapshot.value = normalizeTemplateSnapshot()
  showTemplateModal.value = true
}

const openEditTemplate = (tpl) => {
  rememberTemplateTrigger()
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

const statusClass = (status) =>
  status === DELIVERY_STATUS.ENABLED
    ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
    : 'bg-rose-50 text-rose-600 border-rose-100'
</script>

<template>
  <section class="space-y-4">
    <!-- Page Header -->
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">周期模板管理</h1>
        <p class="mt-1 text-sm text-slate-500">统一管理交割合约产品的结算周期与对应的收益率预设模板</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <!-- 筛选栏 -->
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
        <div class="flex flex-wrap items-center gap-6">
          <div class="inline-flex items-center gap-6 text-sm">
            <button
              type="button"
              class="relative py-2 font-medium transition-colors"
              :class="statusTab === COMMON_FILTER_ALL ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
              @click="statusTab = COMMON_FILTER_ALL"
            >
              全部
            </button>
            <button
              type="button"
              class="relative py-2 font-medium transition-colors"
              :class="statusTab === DELIVERY_STATUS.ENABLED ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
              @click="statusTab = DELIVERY_STATUS.ENABLED"
            >
              已启用
            </button>
            <button
              type="button"
              class="relative py-2 font-medium transition-colors"
              :class="statusTab === DELIVERY_STATUS.DISABLED ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
              @click="statusTab = DELIVERY_STATUS.DISABLED"
            >
              已禁用
            </button>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3">
          <div class="relative w-64">
            <input
              v-model="search"
              type="text"
              class="ant-input w-full pl-9"
              placeholder="搜索模板名称..."
            />
            <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" fill="none">
              <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
              <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
            </svg>
          </div>
          <button
            type="button"
            class="ant-btn ant-btn-primary inline-flex items-center gap-1.5"
            @click="openCreateTemplate"
          >
            <span class="text-lg leading-none">+</span>
            <span>新增模板</span>
          </button>
        </div>
      </div>

      <!-- 列表内容 -->
      <div class="p-4 space-y-4">
        <article
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="rounded-lg border border-slate-200 bg-white transition-all hover:border-blue-500/30 hover:shadow-md"
        >
          <div class="flex items-center justify-between border-b border-slate-100 p-4">
            <div class="flex items-center gap-3">
              <h3 class="text-base font-semibold text-slate-900">{{ tpl.name }}</h3>
              <span
                class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border"
                :class="statusClass(tpl.status)"
              >
                {{ tpl.status === DELIVERY_STATUS.ENABLED ? '已启用' : '已禁用' }}
              </span>
              <span class="text-xs text-slate-500">{{ tpl.cycles.length }} 个预设周期</span>
            </div>
            <div class="flex items-center gap-2">
              <button
                v-if="tpl.cycles.length > 8"
                type="button"
                class="ant-btn ant-btn-link text-xs flex items-center gap-1"
                @click="toggleExpand(tpl.id)"
              >
                <span>{{ isExpanded(tpl.id) ? '收起' : '展开全部' }}</span>
                <svg
                  class="w-3 h-3 transition-transform duration-200"
                  :class="{ 'rotate-180': isExpanded(tpl.id) }"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <div class="w-px h-3 bg-slate-200 mx-1"></div>
              <button
                type="button"
                class="ant-btn"
                @click="openEditTemplate(tpl)"
              >
                编辑
              </button>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 p-4 bg-slate-50/30">
            <div
              v-for="cycle in isExpanded(tpl.id) ? tpl.cycles : tpl.cycles.slice(0, 8)"
              :key="cycle.id"
              class="inline-flex items-center gap-2 rounded border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <span class="text-slate-500">时长:</span>
              <span class="font-medium text-slate-900">{{ durationLabel(cycle.durationSec) }}</span>
              <span class="text-slate-200">|</span>
              <span class="text-slate-500">收益:</span>
              <span class="font-bold text-emerald-600">{{ cycle.payoutPct.toFixed(1) }}%</span>
            </div>
            <div
              v-if="!isExpanded(tpl.id) && tpl.cycles.length > 8"
              class="inline-flex items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 px-3 py-2 cursor-pointer hover:bg-slate-100 transition-all text-xs text-slate-500"
              @click="toggleExpand(tpl.id)"
            >
              还有 {{ tpl.cycles.length - 8 }} 个周期...
            </div>
          </div>
        </article>
      </div>

      <!-- 分页组件 -->
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-100 p-4">
        <div class="text-sm text-slate-500">
          共 <span class="font-medium text-slate-900">{{ allFilteredTemplates.length }}</span> 个模板
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ant-btn ant-btn-sm"
            :disabled="pagination.currentPage === 1"
            @click="pagination.currentPage--"
          >
            上一页
          </button>
          <div class="flex items-center gap-1">
            <button
              v-for="p in totalPages"
              :key="p"
              type="button"
              class="ant-btn ant-btn-sm w-8 p-0"
              :class="pagination.currentPage === p ? 'ant-btn-primary' : ''"
              @click="pagination.currentPage = p"
            >
              {{ p }}
            </button>
          </div>
          <button
            type="button"
            class="ant-btn ant-btn-sm"
            :disabled="pagination.currentPage === totalPages"
            @click="pagination.currentPage++"
          >
            下一页
          </button>
        </div>
      </div>
    </article>

    <Teleport to="body">
      <!-- 编辑模态框 -->
      <Transition name="modal" @after-leave="handleTemplateAfterLeave">
        <div
          v-if="showTemplateModal"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
          @keydown="handleTemplateDialogKeydown"
        >
          <section
            ref="templateDialogPanelRef"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delivery-template-dialog-title"
            :aria-hidden="showTemplateUnsavedConfirm ? 'true' : undefined"
            :inert="showTemplateUnsavedConfirm ? true : undefined"
            class="modal-panel flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl"
          >
          <header class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2
                id="delivery-template-dialog-title"
                ref="templateDialogTitleRef"
                tabindex="-1"
                class="text-lg font-semibold text-slate-900 outline-none"
              >
                {{ editingTemplateId ? '编辑周期模板' : '新增周期模板' }}
              </h2>
            </div>
            <button
              type="button"
              class="inline-flex h-9 w-9 items-center justify-center rounded text-2xl leading-none text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="关闭"
              @click="requestTemplateClose"
            >
              ×
            </button>
          </header>

          <div class="flex-1 overflow-y-auto bg-white p-6 space-y-6">
            <div class="space-y-6">
              <div
                v-if="visibleTemplateErrors.length > 0"
                class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
                tabindex="-1"
              >
                <p class="font-medium">请修正以下内容后再保存模板</p>
                <ul class="mt-2 list-disc space-y-1 pl-5">
                  <li v-for="error in visibleTemplateErrors" :key="error.id">
                    <button
                      type="button"
                      class="text-left underline underline-offset-2"
                      @click="focusTemplateErrorTarget(error)"
                    >
                      {{ error.message }}
                    </button>
                  </li>
                </ul>
              </div>

              <div class="grid gap-6 md:grid-cols-2">
                <div class="space-y-1.5">
                  <label for="template-name" class="text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 模板名称</label>
                  <input
                    id="template-name"
                    v-model="templateForm.name"
                    type="text"
                    class="ant-input"
                    :class="getTemplateFieldError('template-name') ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''"
                    placeholder="如：标准收益模板"
                    :aria-invalid="!!getTemplateFieldError('template-name')"
                    :aria-describedby="getTemplateFieldDescribedBy('template-name-help', getTemplateFieldError('template-name') ? 'template-name-error' : '')"
                  />
                  <p id="template-name-help" class="text-xs text-slate-400">用于后台识别该交割周期模板，保存后会显示在模板列表和产品配置中。</p>
                  <p v-if="getTemplateFieldError('template-name')" id="template-name-error" class="text-xs text-rose-600">
                    {{ getTemplateFieldError('template-name') }}
                  </p>
                </div>
                <div class="space-y-1.5">
                  <label for="template-status" class="block text-sm font-medium text-slate-900">状态</label>
                  <select id="template-status" v-model="templateForm.status" class="ant-select w-full">
                    <option :value="DELIVERY_STATUS.ENABLED">已启用</option>
                    <option :value="DELIVERY_STATUS.DISABLED">已禁用</option>
                  </select>
                  <p class="text-xs text-slate-400">禁用后不会影响已保存的产品展示，但不建议用于新产品选择。</p>
                </div>
              </div>

              <div
                id="delivery-template-cycle-section"
                tabindex="0"
                class="space-y-3 outline-none"
              >
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-slate-900">周期配置 <span class="text-rose-500">*</span></h3>
                  <button
                    id="delivery-template-add-cycle"
                    type="button"
                    class="ant-btn ant-btn-sm ant-btn-primary inline-flex items-center gap-1"
                    @click="addCycle"
                    aria-label="添加周期配置"
                  >
                    <span>+</span>
                    <span>添加周期</span>
                  </button>
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
                      <button
                        type="button"
                        class="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-300 text-xs leading-none text-slate-400 transition-colors hover:border-rose-300 hover:text-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                        :aria-label="`删除周期${index + 1}`"
                        @click="removeCycle(cycle.id)"
                      >
                        −
                      </button>
                    </header>

                    <div class="grid gap-4 md:grid-cols-3">
                      <label class="space-y-1.5">
                        <span class="block text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 周期时长（秒）</span>
                          <input
                            :id="`cycle-${cycle.id}-durationSec`"
                            v-model.number="cycle.durationSec"
                            type="number"
                            inputmode="numeric"
                            min="1"
                            step="1"
                            class="ant-input w-full"
                            :class="getTemplateFieldError(`cycle-${cycle.id}-durationSec`) ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''"
                            :aria-invalid="!!getTemplateFieldError(`cycle-${cycle.id}-durationSec`)"
                            :aria-describedby="getTemplateFieldDescribedBy(`cycle-${cycle.id}-durationSec-help`, getTemplateFieldError(`cycle-${cycle.id}-durationSec`) ? `cycle-${cycle.id}-durationSec-error` : '')"
                            @wheel.prevent
                          />
                        <span :id="`cycle-${cycle.id}-durationSec-help`" class="block text-xs text-slate-400">单位为秒，必须大于 0。</span>
                        <span v-if="getTemplateFieldError(`cycle-${cycle.id}-durationSec`)" :id="`cycle-${cycle.id}-durationSec-error`" class="block text-xs text-rose-600">
                          {{ getTemplateFieldError(`cycle-${cycle.id}-durationSec`) }}
                        </span>
                      </label>
                      <label class="space-y-1.5">
                        <span class="block text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 收益率</span>
                        <input
                          :id="`cycle-${cycle.id}-payoutPct`"
                          v-model.number="cycle.payoutPct"
                          type="number"
                          inputmode="decimal"
                          min="0"
                          step="0.01"
                          class="ant-input w-full"
                          :class="getTemplateFieldError(`cycle-${cycle.id}-payoutPct`) ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''"
                          :aria-invalid="!!getTemplateFieldError(`cycle-${cycle.id}-payoutPct`)"
                          :aria-describedby="getTemplateFieldDescribedBy(`cycle-${cycle.id}-payoutPct-help`, getTemplateFieldError(`cycle-${cycle.id}-payoutPct`) ? `cycle-${cycle.id}-payoutPct-error` : '')"
                          @wheel.prevent
                        />
                        <span :id="`cycle-${cycle.id}-payoutPct-help`" class="block text-xs text-slate-400">展示给用户的收益率，单位为 %。</span>
                        <span v-if="getTemplateFieldError(`cycle-${cycle.id}-payoutPct`)" :id="`cycle-${cycle.id}-payoutPct-error`" class="block text-xs text-rose-600">
                          {{ getTemplateFieldError(`cycle-${cycle.id}-payoutPct`) }}
                        </span>
                      </label>
                      <label class="space-y-1.5">
                        <span class="block text-sm font-medium text-slate-900"><span class="text-rose-500">*</span> 实际收益率</span>
                        <input
                          :id="`cycle-${cycle.id}-actualPayoutPct`"
                          v-model.number="cycle.actualPayoutPct"
                          type="number"
                          inputmode="decimal"
                          min="0"
                          step="0.00000001"
                          class="ant-input w-full"
                          :class="getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`) ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500' : ''"
                          :aria-invalid="!!getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`)"
                          :aria-describedby="getTemplateFieldDescribedBy(`cycle-${cycle.id}-actualPayoutPct-help`, getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`) ? `cycle-${cycle.id}-actualPayoutPct-error` : '')"
                          @wheel.prevent
                        />
                        <span :id="`cycle-${cycle.id}-actualPayoutPct-help`" class="block text-xs text-slate-400">实际结算使用的收益率，支持 8 位小数。</span>
                        <span v-if="getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`)" :id="`cycle-${cycle.id}-actualPayoutPct-error`" class="block text-xs text-rose-600">
                          {{ getTemplateFieldError(`cycle-${cycle.id}-actualPayoutPct`) }}
                        </span>
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
            <button
              type="button"
              class="ant-btn"
              @click="requestTemplateClose"
            >
              取消
            </button>
            <button
              type="button"
              class="ant-btn ant-btn-primary"
              aria-label="保存周期模板"
              @click="saveTemplate"
            >
              保存模板
            </button>
          </footer>
          </section>

          <Transition name="modal">
            <div
              v-if="showTemplateUnsavedConfirm"
              class="fixed inset-0 z-[110] flex items-center justify-center bg-black/35 p-4"
            >
              <section
                ref="templateUnsavedDialogPanelRef"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delivery-template-unsaved-title"
                class="modal-panel flex w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-xl"
              >
                <header class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <h3
                    id="delivery-template-unsaved-title"
                    ref="templateUnsavedDialogTitleRef"
                    tabindex="-1"
                    class="text-base font-semibold text-slate-900 outline-none"
                  >
                    关闭周期模板编辑？
                  </h3>
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded text-2xl leading-none text-slate-400 transition-colors hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    aria-label="关闭未保存确认"
                    @click="cancelTemplateUnsavedClose"
                  >
                    ×
                  </button>
                </header>
                <div class="px-5 py-4 text-sm leading-6 text-slate-600">
                  当前周期模板有未保存的修改，关闭后这些修改不会保存。
                </div>
                <footer class="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
                  <button type="button" class="ant-btn" @click="cancelTemplateUnsavedClose">
                    继续编辑
                  </button>
                  <button type="button" class="ant-btn ant-btn-primary" @click="confirmTemplateUnsavedClose">
                    确认关闭
                  </button>
                </footer>
              </section>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease-out;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-active .modal-panel {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}
.modal-leave-active .modal-panel {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}
.modal-enter-from .modal-panel,
.modal-leave-to .modal-panel {
  opacity: 0;
  transform: scale(0.96);
}

@media (prefers-reduced-motion: reduce) {
  .modal-enter-active,
  .modal-leave-active,
  .modal-enter-active .modal-panel,
  .modal-leave-active .modal-panel {
    transition-duration: 0.05s;
  }

  .modal-enter-from .modal-panel,
  .modal-leave-to .modal-panel {
    transform: none;
  }
}
</style>
