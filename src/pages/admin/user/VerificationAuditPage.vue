<script setup>
import { ref, computed, onMounted, watch, reactive } from 'vue'
import { getVerificationAudits, verificationAuditList } from '../../../admin/mock/verification'
import AuditStatsCards from '../../../admin/components/verification-audit/AuditStatsCards.vue'
import AuditFilters from '../../../admin/components/verification-audit/AuditFilters.vue'
import AuditTable from '../../../admin/components/verification-audit/AuditTable.vue'
import {
  VERIFICATION_LEVEL,
  VERIFICATION_LEVEL_OPTIONS,
  VERIFICATION_STATUS,
  VERIFICATION_DOC_TYPE_OPTIONS
} from '../../../constants/verification'

const auditList = ref([])
const loading = ref(false)
const searchKeyword = ref('')
const filterLevel = ref('all')
const dateRange = ref({ start: '', end: '' })
const pagination = reactive({ currentPage: 1, pageSize: 10, total: 0 })
const totalPages = computed(() => Math.ceil(pagination.total / pagination.pageSize))

const showDetailModal = ref(false)
const selectedAudit = ref(null)
const auditAction = ref(null)
const auditNote = ref('')
const toast = ref({ visible: false, message: '' })

const statusConfig = {
  [VERIFICATION_STATUS.PENDING]: { text: '待审核', class: 'bg-blue-100 text-blue-700' },
  [VERIFICATION_STATUS.APPROVED]: { text: '已通过', class: 'bg-emerald-100 text-emerald-700' },
  [VERIFICATION_STATUS.REJECTED]: { text: '已拒绝', class: 'bg-rose-100 text-rose-700' },
  [VERIFICATION_STATUS.RESUBMIT]: { text: '需补件', class: 'bg-amber-100 text-amber-700' }
}

const levelConfig = {
  [VERIFICATION_LEVEL.NONE]: { text: '未认证', class: 'bg-gray-100 text-gray-700' },
  [VERIFICATION_LEVEL.BASIC]: { text: '初级认证', class: 'bg-sky-100 text-sky-700' },
  [VERIFICATION_LEVEL.ADVANCED]: { text: '高级认证', class: 'bg-violet-100 text-violet-700' }
}

const getDocTypeLabel = (docType) => VERIFICATION_DOC_TYPE_OPTIONS.find(opt => opt.value === docType)?.label || docType

const selectedSiteInfo = computed(() => {
  if (!selectedAudit.value) return null
  const audit = selectedAudit.value
  const docs = audit.documents || []
  const imageCount = docs.filter((d) => !String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const pdfCount = docs.filter((d) => String(d.url || '').toLowerCase().endsWith('.pdf')).length
  const submitAt = audit.submitTime ? new Date(audit.submitTime).getTime() : 0
  const auditAt = audit.auditTime ? new Date(audit.auditTime).getTime() : 0
  const durationHours = submitAt && auditAt ? Math.max(0, Math.round((auditAt - submitAt) / (1000 * 60 * 60))) : null
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
  loading.value = true
  try {
    const { list, total } = await getVerificationAudits({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      searchKeyword: searchKeyword.value,
      applyLevel: filterLevel.value,
      status: VERIFICATION_STATUS.PENDING,
      dateRange: dateRange.value
    })
    auditList.value = list
    pagination.total = total
  } catch (error) {
    console.error('获取认证审核列表失败:', error)
  } finally {
    loading.value = false
  }
}

watch([searchKeyword, filterLevel, dateRange, () => pagination.currentPage], (newVal, oldVal) => {
  const isPaginationChange = newVal[3] !== oldVal[3]
  if (!isPaginationChange && pagination.currentPage !== 1) {
    pagination.currentPage = 1
  } else {
    fetchAudits()
  }
}, { deep: true })

onMounted(fetchAudits)

const statistics = computed(() => {
  const total = verificationAuditList.length
  const pending = verificationAuditList.filter(a => a.status === VERIFICATION_STATUS.PENDING).length
  const approved = verificationAuditList.filter(a => a.status === VERIFICATION_STATUS.APPROVED).length
  const rejected = verificationAuditList.filter(a => a.status === VERIFICATION_STATUS.REJECTED).length
  return [
    { label: '待审核', value: pending.toLocaleString(), trend: '需处理', color: 'blue' },
    { label: '已通过', value: approved.toLocaleString(), trend: `${total > 0 ? ((approved / total) * 100).toFixed(1) : 0}% 通过率`, color: 'emerald' },
    { label: '已拒绝', value: rejected.toLocaleString(), trend: `${total > 0 ? ((rejected / total) * 100).toFixed(1) : 0}% 拒绝率`, color: 'rose' },
    { label: '总申请', value: total.toLocaleString(), trend: '本月', color: 'gray' }
  ]
})

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
}

const viewDetail = (audit) => {
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

const startAuditAction = (action) => { auditAction.value = action }

const submitAudit = () => {
  if (!selectedAudit.value || !auditAction.value) return
  const idx = verificationAuditList.findIndex(a => a.id === selectedAudit.value.id)
  if (idx === -1) return
  const now = new Date().toISOString()
  const audit = verificationAuditList[idx]
  if (auditAction.value === 'approve') {
    audit.status = VERIFICATION_STATUS.APPROVED
    audit.auditTime = now
    audit.auditor = 'admin_current'
    showToast('审核通过！')
  } else if (auditAction.value === 'reject') {
    audit.status = VERIFICATION_STATUS.REJECTED
    audit.auditTime = now
    audit.auditor = 'admin_current'
    audit.rejectReason = auditNote.value || '不符合认证要求'
    showToast('已拒绝申请！')
  } else if (auditAction.value === 'resubmit') {
    audit.status = VERIFICATION_STATUS.RESUBMIT
    audit.auditTime = now
    audit.auditor = 'admin_current'
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

const exportData = () => showToast('正在导出审核记录数据...')
const showToast = (message) => {
  toast.value.message = message
  toast.value.visible = true
  setTimeout(() => { toast.value.visible = false }, 3000)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">认证身份审核</h1>
        <p class="mt-1 text-sm text-gray-600">按初级/高级认证规则分层审核，减少误判与重复沟通</p>
      </div>
    </div>

    <AuditStatsCards :statistics="statistics" />

    <div class="relative min-h-[400px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <transition name="audit-drawer">
        <a-modal transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :wrap-props="{ 'aria-modal': true }" :open="Boolean(showDetailModal && selectedAudit && selectedSiteInfo)" :mask-closable="false" :keyboard="false" :closable="false"  width="min(960px, calc(100vw - 32px))" class="admin-ant-business-overlay admin-trading-modal" :body-style="{ maxHeight: 'calc(100dvh - 180px)', overflowY: 'auto' }" @cancel="closeDetail"><template #title><template v-if="Boolean(showDetailModal && selectedAudit && selectedSiteInfo)"><div class="flex items-center justify-between gap-3"><span>详情</span><a-button aria-label="关闭" html-type="button"   @click="closeDetail">×</a-button></div></template></template><template v-if="showDetailModal && selectedAudit && selectedSiteInfo"><div class="border-b border-slate-200 bg-gradient-to-r from-white to-slate-100 px-5 py-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-xs font-medium tracking-wide text-slate-500">认证审核详情抽屉</div>
                  <div class="mt-1 text-xl font-semibold text-slate-900">
                    {{ selectedSiteInfo.username }}（{{ selectedSiteInfo.uid }}）的审核信息
                  </div>
                  <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span class="rounded-full bg-slate-900 px-2.5 py-1 text-white">状态：{{ statusConfig[selectedAudit.status]?.text || selectedAudit.status }}</span>
                    <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">申请等级：{{ selectedSiteInfo.applyLevel }}</span>
                    <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">提交：{{ selectedSiteInfo.submitTime }}</span>
                  </div>
                </div>
              </div>
            </div>
<div class="min-h-0 flex-1 overflow-y-auto p-4">
              <div class="space-y-4">
                <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <section class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-500">用户与申请</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex justify-between"><span class="text-slate-500">用户名</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.username }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">邮箱</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.email }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">当前等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.currentLevel }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">申请等级</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.applyLevel }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">提交时间</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.submitTime }}</span></div>
                    </div>
                  </section>

                  <section class="rounded-xl border border-slate-200 bg-white p-4">
                    <div class="text-xs text-slate-500">站内进度</div>
                    <div class="mt-3 space-y-2 text-sm">
                      <div class="flex justify-between"><span class="text-slate-500">审核状态</span><span class="font-medium text-slate-900">{{ statusConfig[selectedAudit.status]?.text || selectedAudit.status }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">总材料数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.docCount }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">图片数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.imageCount }}</span></div>
                      <div class="flex justify-between"><span class="text-slate-500">PDF 数</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.pdfCount }}</span></div>
                    </div>
                  </section>

                </div>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="text-xs text-slate-500">初级认证区域</div>
                  <div class="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">国家：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.nationality || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">所在城市：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.city || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">姓名：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.realName || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">证件号码：</span><span class="font-medium text-slate-900">{{ selectedAudit.basicInfo?.idNumber || '-' }}</span></div>
                    <div class="rounded-lg bg-slate-50 px-3 py-2 md:col-span-2"><span class="text-slate-500">邮箱：</span><span class="font-medium text-slate-900">{{ selectedSiteInfo.email || '-' }}</span></div>
                  </div>
                </section>

                <section class="rounded-xl border border-slate-200 bg-white p-4">
                  <div class="mb-3 flex items-center justify-between">
                    <div class="text-xs text-slate-500">提交材料（站内）</div>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(doc, index) in selectedAudit.documents"
                      :key="`${doc.type}-${index}`"
                      class="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <div class="min-w-0">
                        <div class="font-medium text-slate-900">{{ getDocTypeLabel(doc.type) }}</div>
                        <div class="mt-0.5 truncate text-xs text-slate-500">{{ formatDate(doc.uploadTime) }} · {{ doc.url }}</div>
                      </div>
                      <a-button class="shrink-0" @click="previewDocument(doc)" html-type="button">预览</a-button>
                    </div>
                    <div v-if="!selectedAudit.documents?.length" class="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500">
                      暂无上传材料
                    </div>
                  </div>
                </section>
              </div>
            </div></template><template #footer><template v-if="Boolean(showDetailModal && selectedAudit && selectedSiteInfo)"><section class="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
              <div class="text-xs text-slate-500">审核操作</div>
              <div class="mt-3 flex flex-wrap justify-end gap-2">
                <a-button class="" @click="closeDetail" html-type="button">关闭</a-button>
                <a-button class="" @click="startAuditAction('approve')" html-type="button" type="primary">通过</a-button>
                <a-button class="" @click="startAuditAction('resubmit')" html-type="button">要求补件</a-button>
                <a-button class="" @click="startAuditAction('reject')" html-type="button">拒绝</a-button>
              </div>

              <div v-if="auditAction" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div class="text-sm font-medium text-slate-900">
                  {{
                    auditAction === 'approve'
                      ? '确认审核通过'
                      : auditAction === 'resubmit'
                        ? '填写补件说明'
                        : '填写拒绝原因'
                  }}
                </div>
                <a-textarea v-if="auditAction !== 'approve'" v-model:value="auditNote" rows="3" class="mt-2 w-full" :placeholder="auditAction === 'reject' ? '请填写拒绝原因' : '请填写补件说明'" />
                <div class="mt-3 flex justify-end gap-2">
                  <a-button class="" @click="submitAudit" html-type="button" type="primary">确认提交</a-button>
                  <a-button class="" @click="auditAction = null" html-type="button">取消</a-button>
                </div>
              </div>
            </section></template></template></a-modal>
      </transition>

      <div class="border-b border-slate-200 bg-white px-4 py-3">
        <h3 class="text-base font-semibold text-slate-900">审核申请列表</h3>
      </div>

      <AuditFilters
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

      <div v-if="loading" class="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
        <div class="flex flex-col items-center">
          <div class="h-10 w-10 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p class="mt-2 text-sm font-medium text-slate-500">加载中...</p>
        </div>
      </div>

      <AuditTable
        :loading="loading"
        :audit-list="auditList"
        :status-config="statusConfig"
        :level-config="levelConfig"
        :total-pages="totalPages"
        :pagination="pagination"
        :format-date="formatDate"
        @view-detail="viewDetail"
        @prev-page="pagination.currentPage--"
        @next-page="pagination.currentPage++"
      />
    </div>

    <div v-if="toast.visible" class="animate-slide-in fixed top-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-emerald-200 bg-white px-4 py-3 shadow-lg">
      <div class="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
        <svg class="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span class="text-sm font-medium text-slate-900">{{ toast.message }}</span>
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

.audit-drawer-enter-active > section,
.audit-drawer-leave-active > section {
  transition: transform 0.25s ease;
  transform: translateY(0);
}
</style>
