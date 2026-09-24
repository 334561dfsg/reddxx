<script setup>
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import { getVerificationAudits, verificationAuditList } from '../../admin/mock/verification'
import { useAgentAuthStore } from '../../stores/agentAuth.js'
import { usersList } from '../../admin/mock/user.js'
import { portalClientIds } from '../../features/user-staff/portalScope.js'
import AgentListPaginationBar from '../../components/agent-system/AgentListPaginationBar.vue'
import AuditStatsCards from '../../admin/components/verification-audit/AuditStatsCards.vue'
import AuditFilters from '../../admin/components/verification-audit/AuditFilters.vue'
import AuditTable from '../../admin/components/verification-audit/AuditTable.vue'
import {
  VERIFICATION_LEVEL,
  VERIFICATION_LEVEL_OPTIONS,
  VERIFICATION_STATUS,
  VERIFICATION_DOC_TYPE_OPTIONS
} from '../../constants/verification'

const auth = useAgentAuthStore()
const allowedUserIds = computed(() => portalClientIds(auth, usersList))
const auditRevision = ref(0)
const scopedAudits = computed(() => { auditRevision.value; return verificationAuditList.filter(audit => allowedUserIds.value.includes(audit.userId)) })
const canAccessAudit = audit => audit && allowedUserIds.value.includes(audit.userId)
let requestGeneration = 0
const auditList = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const filterLevel = ref('all')
const dateRange = ref({ start: '', end: '' })
const pagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })
const totalPages = computed(() =>
  Math.max(1, Math.ceil(pagination.total / Math.max(1, pagination.pageSize)))
)

const showDetailModal = ref(false)
const selectedAudit = ref(null)
const auditAction = ref(null)
const auditNote = ref('')
const toast = ref({ visible: false, message: '' })

/** 代理系统深色界面用标签色（与管理端语义一致） */
const statusConfig = {
  [VERIFICATION_STATUS.PENDING]: { text: '待审核', class: 'bg-sky-500/20 text-sky-200' },
  [VERIFICATION_STATUS.APPROVED]: { text: '已通过', class: 'bg-emerald-500/20 text-emerald-200' },
  [VERIFICATION_STATUS.REJECTED]: { text: '已拒绝', class: 'bg-rose-500/20 text-rose-200' },
  [VERIFICATION_STATUS.RESUBMIT]: { text: '需补件', class: 'bg-amber-500/20 text-amber-100' }
}

const levelConfig = {
  [VERIFICATION_LEVEL.NONE]: { text: '未认证', class: 'bg-white/10 text-white/65' },
  [VERIFICATION_LEVEL.BASIC]: { text: '初级认证', class: 'bg-emerald-500/15 text-emerald-200' },
  [VERIFICATION_LEVEL.ADVANCED]: { text: '高级认证', class: 'bg-violet-500/20 text-violet-200' }
}

const getDocTypeLabel = (docType) =>
  VERIFICATION_DOC_TYPE_OPTIONS.find((opt) => opt.value === docType)?.label || docType

const selectedSiteInfo = computed(() => {
  if (!selectedAudit.value) return null
  const audit = selectedAudit.value
  const docs = audit.documents || []
  const imageCount = docs.filter((d) => !String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const pdfCount = docs.filter((d) => String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const submitAt = audit.submitTime ? new Date(audit.submitTime).getTime() : 0
  const auditAt = audit.auditTime ? new Date(audit.auditTime).getTime() : 0
  const durationHours =
    submitAt && auditAt ? Math.max(0, Math.round((auditAt - submitAt) / (1000 * 60 * 60))) : null
  return {
    uid: audit.userId || '-',
    username: audit.username || '-',
    email: audit.email || '-',
    applyLevel: levelConfig[audit.applyLevel]?.text || audit.applyLevel,
    currentLevel: levelConfig[audit.currentLevel]?.text || audit.currentLevel,
    submitTime: formatDate(audit.submitTime),
    auditTime: formatDate(audit.auditTime),
    auditor: audit.auditor || '-',
    rejectReason: audit.rejectReason || '-',
    docCount: docs.length,
    imageCount,
    pdfCount,
    processHours: durationHours == null ? '-' : `${durationHours} 小时`
  }
})

const fetchAudits = async () => {
  const generation = ++requestGeneration
  loading.value = true
  try {
    const { list, total } = await getVerificationAudits({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value,
      applyLevel: filterLevel.value,
      status: VERIFICATION_STATUS.PENDING,
      dateRange: dateRange.value,
      allowedUserIds: allowedUserIds.value
    })
    if (generation !== requestGeneration) return
    auditRevision.value++
    auditList.value = list
    pagination.total = total
  } catch (error) {
    console.error('获取认证审核列表失败:', error)
  } finally {
    if (generation === requestGeneration) loading.value = false
  }
}

watch([searchKeyword, filterLevel, dateRange, () => auth.userId, () => auth.agentId, () => auth.role], () => {
  if (pagination.currentPage !== 1) {
    pagination.currentPage = 1
  } else {
    fetchAudits()
  }
}, { deep: true })

watch(() => pagination.currentPage, () => {
  fetchAudits()
})

watch(() => pagination.pageSize, () => {
  if (pagination.currentPage !== 1) {
    pagination.currentPage = 1
  } else {
    fetchAudits()
  }
})

const AGENT_SCROLL_ROOT_ID = 'agent-system-scroll-root'

/** 打开抽屉前主区滚动位置；null 表示未处于锁定态，解锁时不改 scrollTop */
let savedMainScrollTop = null

function setAgentShellScrollLocked(locked) {
  if (typeof document === 'undefined') return
  const main = document.getElementById(AGENT_SCROLL_ROOT_ID)
  if (locked) {
    if (main) {
      savedMainScrollTop = main.scrollTop
      main.style.overflow = 'hidden'
    }
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  } else {
    if (main) {
      main.style.overflow = ''
      if (savedMainScrollTop !== null) {
        main.scrollTop = savedMainScrollTop
        savedMainScrollTop = null
      }
    } else {
      savedMainScrollTop = null
    }
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  }
}

watch(showDetailModal, (open) => {
  setAgentShellScrollLocked(open)
})

onMounted(fetchAudits)

onUnmounted(() => {
  requestGeneration++
  setAgentShellScrollLocked(false)
})

const statistics = computed(() => {
  const total = scopedAudits.value.length
  const pending = scopedAudits.value.filter((a) => a.status === VERIFICATION_STATUS.PENDING).length
  const approved = scopedAudits.value.filter((a) => a.status === VERIFICATION_STATUS.APPROVED).length
  const rejected = scopedAudits.value.filter((a) => a.status === VERIFICATION_STATUS.REJECTED).length
  return [
    { label: '待审核', value: pending.toLocaleString(), trend: '需处理', color: 'blue' },
    {
      label: '已通过',
      value: approved.toLocaleString(),
      trend: `${total > 0 ? ((approved / total) * 100).toFixed(1) : 0}% 通过率`,
      color: 'emerald'
    },
    {
      label: '已拒绝',
      value: rejected.toLocaleString(),
      trend: `${total > 0 ? ((rejected / total) * 100).toFixed(1) : 0}% 拒绝率`,
      color: 'rose'
    },
    { label: '总申请', value: total.toLocaleString(), trend: '本月', color: 'gray' }
  ]
})

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

const viewDetail = (audit) => {
  if (!canAccessAudit(audit)) return
  selectedAudit.value = audit
  showDetailModal.value = true
  auditAction.value = null
  auditNote.value = ''
}

const closeDetail = () => {
  showDetailModal.value = false
  selectedAudit.value = null
  auditAction.value = null
  auditNote.value = ''
}

watch(() => [auth.role, auth.userId, auth.agentId], () => {
  requestGeneration++
  auditList.value = []
  pagination.total = 0
  closeDetail()
}, { flush:'sync' })

const startAuditAction = (action) => {
  auditAction.value = action
}

const submitAudit = () => {
  if (!canAccessAudit(selectedAudit.value) || !auditAction.value) return
  const idx = verificationAuditList.findIndex((a) => a.id === selectedAudit.value.id)
  if (idx === -1) return
  const now = new Date().toISOString()
  const audit = verificationAuditList[idx]
  if (!canAccessAudit(audit)) return
  if (auditAction.value === 'approve') {
    audit.status = VERIFICATION_STATUS.APPROVED
    audit.auditTime = now
    audit.auditor = auth.userId
    showToast('审核通过！')
  } else if (auditAction.value === 'reject') {
    audit.status = VERIFICATION_STATUS.REJECTED
    audit.auditTime = now
    audit.auditor = auth.userId
    audit.rejectReason = auditNote.value || '不符合认证要求'
    showToast('已拒绝申请！')
  } else if (auditAction.value === 'resubmit') {
    audit.status = VERIFICATION_STATUS.RESUBMIT
    audit.auditTime = now
    audit.auditor = auth.userId
    audit.rejectReason = auditNote.value || '需要补充材料'
    showToast('已要求用户补件！')
  }
  closeDetail()
  fetchAudits()
}

const previewDocument = (doc) => {
  alert(`预览文档: ${getDocTypeLabel(doc.type)}\n\n实际系统中会在这里显示图片/PDF预览`)
}

const resetFilters = () => {
  searchKeyword.value = ''
  filterLevel.value = 'all'
  dateRange.value = { start: '', end: '' }
  pagination.currentPage = 1
}

const exportData = () => showToast('正在导出审核记录数据…')

const showToast = (message) => {
  toast.value.message = message
  toast.value.visible = true
  setTimeout(() => {
    toast.value.visible = false
  }, 3000)
}
</script>

<template>
  <div class="space-y-4">
    <AuditStatsCards variant="agent" :statistics="statistics" />

    <div class="relative min-h-[400px] overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <transition name="audit-drawer">
        <div
          v-if="showDetailModal && selectedAudit && selectedSiteInfo"
          class="fixed inset-0 z-[60] overflow-hidden bg-black/55 pt-[env(safe-area-inset-top)] backdrop-blur-[2px]"
        >
          <section
            class="audit-drawer-panel flex h-[88vh] max-h-[100dvh] w-full flex-col overflow-hidden rounded-b-2xl border border-emerald-950/40 border-t-0 bg-[#0c1219] shadow-2xl shadow-black/40"
          >
            <div class="shrink-0 border-b border-white/[0.08] bg-gradient-to-r from-[#0c1219] to-[#0a141c] px-5 py-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/75">
                    认证审核详情
                  </div>
                  <div class="mt-1 text-xl font-semibold text-white">
                    {{ selectedSiteInfo.username }}（{{ selectedSiteInfo.uid }}）
                  </div>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      :class="[
                        'rounded-full px-2.5 py-1 font-medium',
                        statusConfig[selectedAudit.status]?.class || 'bg-white/10 text-white/70'
                      ]"
                    >{{ statusConfig[selectedAudit.status]?.text || selectedAudit.status }}</span>
                    <span
                      class="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-white/70"
                    >申请等级：{{ selectedSiteInfo.applyLevel }}</span>
                    <span
                      class="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-white/55"
                    >提交：{{ selectedSiteInfo.submitTime }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="agent-audit-drawer-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 pr-3 sm:pr-4">
              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section class="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div class="text-xs text-white/45">用户与申请</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">用户名</span><span class="font-medium text-white/90">{{ selectedSiteInfo.username }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">邮箱</span><span class="font-medium text-white/90">{{ selectedSiteInfo.email }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">当前等级</span><span class="font-medium text-white/90">{{ selectedSiteInfo.currentLevel }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">申请等级</span><span class="font-medium text-white/90">{{ selectedSiteInfo.applyLevel }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">提交时间</span><span class="font-medium text-white/90">{{ selectedSiteInfo.submitTime }}</span>
                      </div>
                    </div>
                  </section>

                  <section class="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                    <div class="text-xs text-white/45">站内进度</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">审核状态</span><span class="font-medium text-emerald-200/95">{{
                          statusConfig[selectedAudit.status]?.text || selectedAudit.status
                        }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">总材料数</span><span class="font-medium text-white/90">{{ selectedSiteInfo.docCount }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">图片数</span><span class="font-medium text-white/90">{{ selectedSiteInfo.imageCount }}</span>
                      </div>
                      <div class="flex justify-between gap-3">
                        <span class="text-white/45">PDF 数</span><span class="font-medium text-white/90">{{ selectedSiteInfo.pdfCount }}</span>
                      </div>
                    </div>
                  </section>
                </div>

                <section class="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div class="text-xs text-white/45">初级认证区域</div>
                  <div class="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div class="rounded-lg border border-white/[0.06] bg-[#0a0f14] px-3 py-2">
                      <span class="text-white/45">国家：</span><span class="font-medium text-white/90">{{ selectedAudit.basicInfo?.nationality || '-' }}</span>
                    </div>
                    <div class="rounded-lg border border-white/[0.06] bg-[#0a0f14] px-3 py-2">
                      <span class="text-white/45">所在城市：</span><span class="font-medium text-white/90">{{ selectedAudit.basicInfo?.city || '-' }}</span>
                    </div>
                    <div class="rounded-lg border border-white/[0.06] bg-[#0a0f14] px-3 py-2">
                      <span class="text-white/45">姓名：</span><span class="font-medium text-white/90">{{ selectedAudit.basicInfo?.realName || '-' }}</span>
                    </div>
                    <div class="rounded-lg border border-white/[0.06] bg-[#0a0f14] px-3 py-2">
                      <span class="text-white/45">证件号码：</span><span class="font-medium text-white/90">{{ selectedAudit.basicInfo?.idNumber || '-' }}</span>
                    </div>
                    <div class="rounded-lg border border-white/[0.06] bg-[#0a0f14] px-3 py-2 md:col-span-2">
                      <span class="text-white/45">邮箱：</span><span class="font-medium text-white/90">{{ selectedSiteInfo.email || '-' }}</span>
                    </div>
                  </div>
                </section>

                <section class="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
                  <div class="mb-3 text-xs text-white/45">提交材料（站内）</div>
                  <div class="space-y-2">
                    <div
                      v-for="(doc, index) in selectedAudit.documents"
                      :key="`${doc.type}-${index}`"
                      class="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-[#0a0f14] px-3 py-2 text-sm"
                    >
                      <div class="min-w-0">
                        <div class="font-medium text-white/90">{{ getDocTypeLabel(doc.type) }}</div>
                        <div class="mt-0.5 truncate text-xs text-white/40">
                          {{ formatDate(doc.uploadTime) }} · {{ doc.url }}
                        </div>
                      </div>
                      <button
                        type="button"
                        class="shrink-0 rounded-lg border border-white/12 px-2.5 py-1 text-xs text-emerald-200/95 hover:bg-white/[0.06]"
                        @click="previewDocument(doc)"
                      >
                        预览
                      </button>
                    </div>
                    <div
                      v-if="!selectedAudit.documents?.length"
                      class="rounded-lg border border-dashed border-white/15 px-3 py-4 text-sm text-white/45"
                    >
                      暂无上传材料
                    </div>
                  </div>
                </section>
              </div>
            </div>

            <section class="shrink-0 border-t border-white/[0.08] bg-[#0a0f14] px-5 py-4 shadow-[0_-8px_24px_rgba(0,0,0,0.25)]">
              <div class="text-xs text-white/45">审核操作</div>
              <div class="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-white/12 px-3 py-2 text-sm text-white/80 hover:bg-white/[0.06]"
                  @click="closeDetail"
                >
                  关闭
                </button>
                <button
                  type="button"
                  class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  @click="startAuditAction('approve')"
                >
                  通过
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85 hover:bg-white/[0.06]"
                  @click="startAuditAction('resubmit')"
                >
                  要求补件
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-rose-500/40 bg-rose-950/20 px-3 py-2 text-sm text-rose-200 hover:bg-rose-950/35"
                  @click="startAuditAction('reject')"
                >
                  拒绝
                </button>
              </div>

              <div v-if="auditAction" class="mt-3 rounded-lg border border-white/[0.08] bg-white/[0.04] p-3">
                <div class="text-sm font-medium text-white/90">
                  {{
                    auditAction === 'approve'
                      ? '确认审核通过'
                      : auditAction === 'resubmit'
                        ? '填写补件说明'
                        : '填写拒绝原因'
                  }}
                </div>
                <textarea
                  v-if="auditAction !== 'approve'"
                  v-model="auditNote"
                  rows="3"
                  class="mt-2 w-full rounded-lg border border-white/10 bg-[#0c1219] px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-emerald-500/50"
                  :placeholder="auditAction === 'reject' ? '请填写拒绝原因' : '请填写补件说明'"
                />
                <div class="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    class="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                    @click="submitAudit"
                  >
                    确认提交
                  </button>
                  <button
                    type="button"
                    class="rounded-lg border border-white/12 px-3 py-2 text-sm text-white/75 hover:bg-white/[0.06]"
                    @click="auditAction = null"
                  >
                    取消
                  </button>
                </div>
              </div>
            </section>
          </section>
        </div>
      </transition>

      <AuditFilters
        variant="agent"
        show-export-button
        :search-keyword="searchKeyword"
        :filter-level="filterLevel"
        :date-range="dateRange"
        :level-options="VERIFICATION_LEVEL_OPTIONS"
        @update:search-keyword="searchKeyword = $event"
        @update:filter-level="filterLevel = $event"
        @update:date-range="dateRange = $event"
        @reset="resetFilters"
        @export-request="exportData"
      />

      <div class="flex items-center gap-2 border-b border-white/[0.05] bg-white/[0.015] px-4 py-2">
        <span
          class="h-1 w-1 shrink-0 rounded-full bg-emerald-400/70 shadow-[0_0_6px_rgba(52,211,153,0.35)]"
          aria-hidden="true"
        />
        <h3 class="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/38">审核申请列表</h3>
      </div>

      <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0f14]/75">
        <div class="flex flex-col items-center">
          <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-400"></div>
          <p class="mt-2 text-sm font-medium text-white/55">加载中…</p>
        </div>
      </div>

      <AuditTable
        variant="agent"
        :loading="loading"
        :audit-list="auditList"
        :status-config="statusConfig"
        :level-config="levelConfig"
        :total-pages="totalPages"
        :pagination="pagination"
        :format-date="formatDate"
        @view-detail="viewDetail"
      />

      <AgentListPaginationBar
        :current-page="pagination.currentPage"
        :total-pages="totalPages"
        :total-count="pagination.total"
        :page-size="pagination.pageSize"
        @update:current-page="pagination.currentPage = $event"
        @update:page-size="pagination.pageSize = $event"
      />
    </div>

    <div
      v-if="toast.visible"
      class="animate-slide-in fixed top-4 right-4 z-[70] flex items-center gap-3 rounded-lg border border-emerald-500/25 bg-[#0c1219] px-4 py-3 shadow-lg shadow-black/30"
    >
      <div class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
        <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="text-sm font-medium text-white/90">{{ toast.message }}</span>
    </div>
  </div>
</template>

<style scoped>
.audit-drawer-enter-active,
.audit-drawer-leave-active {
  transition: opacity 0.25s ease;
}

.audit-drawer-enter-from,
.audit-drawer-leave-to {
  opacity: 0;
}

.audit-drawer-enter-to,
.audit-drawer-leave-from {
  opacity: 1;
}

.audit-drawer-enter-from > section,
.audit-drawer-leave-to > section {
  transform: translateY(-100%);
}

/* 仅内容区滚动：细滚动条 + 暗色轨道，避免系统默认粗条顶满边 */
.agent-audit-drawer-scroll {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
}

.agent-audit-drawer-scroll::-webkit-scrollbar {
  width: 6px;
}

.agent-audit-drawer-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.agent-audit-drawer-scroll::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: rgba(148, 163, 184, 0.35);
}

.agent-audit-drawer-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(148, 163, 184, 0.55);
}

.audit-drawer-enter-active > section,
.audit-drawer-leave-active > section {
  transition: transform 0.25s ease;
  transform: translateY(0);
}
</style>
