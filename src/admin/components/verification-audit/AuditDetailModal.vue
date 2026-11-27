<script setup>
import { VERIFICATION_LEVEL, VERIFICATION_STATUS } from '../../../constants/verification'

defineProps({
  visible: { type: Boolean, default: false },
  selectedAudit: { type: Object, default: null },
  statusConfig: { type: Object, default: () => ({}) },
  levelConfig: { type: Object, default: () => ({}) },
  auditAction: { type: String, default: null },
  auditNote: { type: String, default: '' },
  selectedProgress: { type: Object, default: () => ({ done: 0, total: 0, percent: 0 }) },
  selectedMissingDocs: { type: Array, default: () => [] },
  selectedRiskHints: { type: Array, default: () => [] },
  groupedDocuments: { type: Object, default: () => ({ idDocs: [], proofs: [] }) },
  getRequiredDocs: { type: Function, required: true },
  getDocTypeLabel: { type: Function, required: true },
  formatDate: { type: Function, required: true }
})

const emit = defineEmits(['close', 'start-action', 'submit', 'cancel-action', 'update:note', 'preview'])
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
    <div class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
      <div class="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <h3 class="text-lg font-semibold text-gray-900">认证申请详情</h3>
        <button class="text-gray-400 hover:text-gray-600" @click="emit('close')">
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <div v-if="selectedAudit" class="audit-detail-modal-scroll min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-y-contain px-6 py-6 pr-4">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm text-slate-600">审核流：</span>
            <span :class="levelConfig[selectedAudit.currentLevel].class" class="rounded-full px-2 py-1 text-xs font-semibold">{{ levelConfig[selectedAudit.currentLevel].text }}</span>
            <span class="text-slate-400">→</span>
            <span :class="levelConfig[selectedAudit.applyLevel].class" class="rounded-full px-2 py-1 text-xs font-semibold">{{ levelConfig[selectedAudit.applyLevel].text }}</span>
            <span :class="statusConfig[selectedAudit.status].class" class="ml-2 rounded-full px-2 py-1 text-xs font-semibold">{{ statusConfig[selectedAudit.status].text }}</span>
          </div>
          <div class="mt-3">
            <div class="flex items-center justify-between text-xs text-slate-600">
              <span>必审材料完成度</span>
              <span>{{ selectedProgress.done }}/{{ selectedProgress.total }}（{{ selectedProgress.percent }}%）</span>
            </div>
            <div class="mt-1 h-2 rounded-full bg-slate-200">
              <div class="h-2 rounded-full bg-blue-500" :style="{ width: `${selectedProgress.percent}%` }"></div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
          <div><span class="text-sm text-gray-600">用户名：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.username }}</span></div>
          <div><span class="text-sm text-gray-600">邮箱：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.email }}</span></div>
          <div><span class="text-sm text-gray-600">提交时间：</span><span class="text-sm font-medium text-gray-900">{{ formatDate(selectedAudit.submitTime) }}</span></div>
          <div><span class="text-sm text-gray-600">申请等级：</span><span class="text-sm font-medium text-gray-900">{{ levelConfig[selectedAudit.applyLevel].text }}</span></div>
        </div>

        <div class="grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4">
          <div><span class="text-sm text-gray-600">真实姓名：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.basicInfo.realName }}</span></div>
          <div><span class="text-sm text-gray-600">身份证号：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.basicInfo.idNumber }}</span></div>
          <div><span class="text-sm text-gray-600">国籍：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.basicInfo.nationality }}</span></div>
          <div><span class="text-sm text-gray-600">职业：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.basicInfo.occupation }}</span></div>
          <div class="col-span-2"><span class="text-sm text-gray-600">地址：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.basicInfo.address }}</span></div>
        </div>

        <div v-if="selectedRiskHints.length" class="rounded-lg border border-amber-300 bg-amber-50 p-4">
          <h4 class="mb-2 text-sm font-semibold text-amber-900">审核提醒</h4>
          <ul class="space-y-1 text-sm text-amber-800">
            <li v-for="hint in selectedRiskHints" :key="hint">- {{ hint }}</li>
          </ul>
        </div>

        <div class="rounded-lg border border-slate-200 p-4">
          <p class="text-sm font-semibold text-slate-900">
            {{ selectedAudit.applyLevel === VERIFICATION_LEVEL.ADVANCED ? '高级认证必审清单' : '初级认证必审清单' }}
          </p>
          <div class="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <div
              v-for="docType in getRequiredDocs(selectedAudit.applyLevel)"
              :key="docType"
              class="rounded-lg border px-3 py-2 text-sm"
              :class="selectedMissingDocs.includes(docType) ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'"
            >
              {{ selectedMissingDocs.includes(docType) ? '未提交' : '已提交' }} · {{ getDocTypeLabel(docType) }}
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <h5 class="mb-2 text-sm font-medium text-slate-700">身份证件组</h5>
            <div class="space-y-2">
              <div v-for="doc in groupedDocuments.idDocs" :key="doc.type" class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ getDocTypeLabel(doc.type) }}</div>
                  <div class="text-xs text-gray-500">上传时间：{{ formatDate(doc.uploadTime) }}</div>
                </div>
                <button class="rounded-lg border border-blue-600 px-3 py-1 text-sm text-blue-600 hover:bg-blue-50" @click="emit('preview', doc)">预览</button>
              </div>
              <p v-if="!groupedDocuments.idDocs.length" class="text-xs text-slate-500">暂无身份证件材料</p>
            </div>
          </div>
          <div v-if="selectedAudit.applyLevel === VERIFICATION_LEVEL.ADVANCED">
            <h5 class="mb-2 text-sm font-medium text-slate-700">证明材料组</h5>
            <div class="space-y-2">
              <div v-for="doc in groupedDocuments.proofs" :key="doc.type" class="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <div>
                  <div class="text-sm font-medium text-gray-900">{{ getDocTypeLabel(doc.type) }}</div>
                  <div class="text-xs text-gray-500">上传时间：{{ formatDate(doc.uploadTime) }}</div>
                </div>
                <button class="rounded-lg border border-violet-600 px-3 py-1 text-sm text-violet-600 hover:bg-violet-50" @click="emit('preview', doc)">预览</button>
              </div>
              <p v-if="!groupedDocuments.proofs.length" class="text-xs text-slate-500">暂无证明材料</p>
            </div>
          </div>
        </div>

        <div v-if="selectedAudit.auditTime" class="rounded-lg bg-gray-50 p-4">
          <div><span class="text-sm text-gray-600">审核人：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.auditor }}</span></div>
          <div><span class="text-sm text-gray-600">审核时间：</span><span class="text-sm font-medium text-gray-900">{{ formatDate(selectedAudit.auditTime) }}</span></div>
          <div v-if="selectedAudit.rejectReason"><span class="text-sm text-gray-600">原因：</span><span class="text-sm font-medium text-gray-900">{{ selectedAudit.rejectReason }}</span></div>
        </div>
      </div>

      <div
        v-if="selectedAudit && selectedAudit.status === VERIFICATION_STATUS.PENDING"
        class="shrink-0 border-t border-gray-200 bg-white px-6 py-4 shadow-[0_-6px_20px_rgba(15,23,42,0.06)]"
      >
        <h4 class="mb-3 text-sm font-semibold text-gray-900">审核决策</h4>
        <div v-if="!auditAction" class="flex space-x-3">
          <button :disabled="selectedMissingDocs.length > 0" class="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300" @click="emit('start-action', 'approve')">通过</button>
          <button class="flex-1 rounded-lg bg-amber-600 px-4 py-2 text-white transition-colors hover:bg-amber-700" @click="emit('start-action', 'resubmit')">要求补件</button>
          <button class="flex-1 rounded-lg bg-rose-600 px-4 py-2 text-white transition-colors hover:bg-rose-700" @click="emit('start-action', 'reject')">拒绝</button>
        </div>
        <div v-else class="space-y-3">
          <div v-if="auditAction === 'approve'" class="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p class="mb-2 text-sm font-medium text-emerald-900">确认通过该认证申请？</p>
            <p class="text-xs text-emerald-700">用户的认证等级将升级为 {{ levelConfig[selectedAudit.applyLevel].text }}。</p>
          </div>
          <div v-else-if="auditAction === 'resubmit'" class="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p class="mb-2 text-sm font-medium text-amber-900">要求用户补充材料</p>
            <textarea :value="auditNote" placeholder="请说明需要补充的材料..." rows="3" class="ant-input mt-2" @input="emit('update:note', $event.target.value)"></textarea>
          </div>
          <div v-else-if="auditAction === 'reject'" class="rounded-lg border border-rose-200 bg-rose-50 p-4">
            <p class="mb-2 text-sm font-medium text-rose-900">确认拒绝该认证申请？</p>
            <textarea :value="auditNote" placeholder="请说明拒绝原因..." rows="3" class="ant-input mt-2" @input="emit('update:note', $event.target.value)"></textarea>
          </div>
          <div class="flex space-x-2">
            <button class="ant-btn ant-btn-primary flex-1" @click="emit('submit')">确认提交</button>
            <button class="ant-btn flex-1" @click="emit('cancel-action')">取消</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.audit-detail-modal-scroll {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.55) rgba(241, 245, 249, 0.6);
}

.audit-detail-modal-scroll::-webkit-scrollbar {
  width: 6px;
}

.audit-detail-modal-scroll::-webkit-scrollbar-track {
  background: rgba(241, 245, 249, 0.5);
  border-radius: 9999px;
}

.audit-detail-modal-scroll::-webkit-scrollbar-thumb {
  border-radius: 9999px;
  background-color: rgba(148, 163, 184, 0.55);
}

.audit-detail-modal-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(100, 116, 139, 0.65);
}
</style>
