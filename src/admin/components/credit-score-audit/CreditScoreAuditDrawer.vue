<script setup>
import { AdminButton, AdminTextarea } from '../antd/controls.js'

import { ref, computed, watch } from 'vue'
import { CREDIT_SCORE_CHANGE_TYPE, CREDIT_SCORE_AUDIT_STATUS } from '../../constants/creditScore'

const props = defineProps({
  visible: { type: Boolean, default: false },
  audit: { type: Object, default: null },
  /** 是否展示「历史审核信息」区块（信用分变动日志里查看详情时为 true；待审核处理时为 false） */
  showAuditHistorySection: { type: Boolean, default: false },
  /** 仅查看：隐藏通过/拒绝操作区 */
  readOnly: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'submit'])

const auditAction = ref(null)
const auditNote = ref('')

const statusConfig = {
  [CREDIT_SCORE_AUDIT_STATUS.PENDING]: { text: '待审核', class: 'bg-amber-100 text-amber-700' },
  [CREDIT_SCORE_AUDIT_STATUS.APPROVED]: { text: '已通过', class: 'bg-emerald-100 text-emerald-700' },
  [CREDIT_SCORE_AUDIT_STATUS.REJECTED]: { text: '已拒绝', class: 'bg-rose-100 text-rose-700' },
  [CREDIT_SCORE_AUDIT_STATUS.AUTO_APPROVED]: { text: '自动通过', class: 'bg-blue-100 text-blue-700' }
}

const changeTypeConfig = {
  [CREDIT_SCORE_CHANGE_TYPE.RECHARGE]: { text: '充值', class: 'bg-blue-100 text-blue-700' },
  [CREDIT_SCORE_CHANGE_TYPE.PRIMARY_KYC]: { text: '初级认证', class: 'bg-emerald-100 text-emerald-700' },
  [CREDIT_SCORE_CHANGE_TYPE.ADVANCED_KYC]: { text: '高级认证', class: 'bg-purple-100 text-purple-700' },
  [CREDIT_SCORE_CHANGE_TYPE.MANUAL_ADJUST]: { text: '手动调整', class: 'bg-amber-100 text-amber-700' },
  [CREDIT_SCORE_CHANGE_TYPE.AUTO_UPGRADE]: { text: '自动升级', class: 'bg-indigo-100 text-indigo-700' },
  [CREDIT_SCORE_CHANGE_TYPE.PENALTY]: { text: '惩罚', class: 'bg-rose-100 text-rose-700' },
  [CREDIT_SCORE_CHANGE_TYPE.REWARD]: { text: '奖励', class: 'bg-teal-100 text-teal-700' }
}

const noteTemplates = {
  approve: [
    '理由充分，积分变动符合策略阈值，审核通过',
    '结合近30天行为记录，风险可控，予以通过',
    '申请人与原因一致，证据链完整，允许生效'
  ],
  reject: [
    '变动幅度过大且缺少补充说明，暂不通过',
    '当前风控信号偏高，不满足通过条件',
    '依据不足，建议补充业务凭证后重新申请'
  ]
}

const selectedAuditContext = computed(() => {
  if (!props.audit) return null

  const a = props.audit
  const absAmount = Math.abs(a.changeAmount || 0)
  const beforeScore = Number(a.beforeScore || 0)
  const changeRate = beforeScore > 0 ? ((absAmount / beforeScore) * 100) : 0

  return {
    absAmount,
    changeRate: changeRate.toFixed(1)
  }
})

const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function resetActionState() {
  auditAction.value = null
  auditNote.value = ''
}

watch(
  () => [props.visible, props.audit?.id],
  () => {
    if (props.visible && props.audit) {
      resetActionState()
    }
  }
)

const startAuditAction = (action) => {
  auditAction.value = action
}

const useNoteTemplate = (text) => {
  auditNote.value = text
}

const handleClose = () => {
  resetActionState()
  emit('close')
}

const submitAudit = () => {
  if (!props.audit || !auditAction.value) return
  emit('submit', { action: auditAction.value, note: auditNote.value })
}
</script>

<template>
  <Teleport to="body">
    <Transition name="audit-drawer">
      <div
        v-if="visible && audit && selectedAuditContext"
        class="fixed inset-0 z-[100] min-h-[100dvh] w-screen max-w-[100vw] bg-slate-900/35"
      >
      <section class="audit-drawer-panel flex h-[88vh] w-full flex-col overflow-hidden rounded-b-2xl border-b border-slate-200 bg-slate-50 shadow-2xl">
        <div class="border-b border-slate-200 bg-gradient-to-r from-white to-slate-100 px-5 py-4">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="text-xs font-medium tracking-wide text-slate-500">信用分审核详情抽屉</div>
              <div class="mt-1 text-xl font-semibold text-slate-900">
                {{ audit.username }}（{{ audit.userId }}）的信用分审核
              </div>
              <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span class="rounded-full bg-slate-900 px-2.5 py-1 text-white">
                  状态：{{ statusConfig[audit.auditStatus]?.text || audit.auditStatus }}
                </span>
                <span
                  v-if="changeTypeConfig[audit.changeType]"
                  :class="changeTypeConfig[audit.changeType].class"
                  class="rounded-full px-2.5 py-1 ring-1 ring-slate-200"
                >
                  类型：{{ changeTypeConfig[audit.changeType].text }}
                </span>
                <span class="rounded-full bg-white px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
                  申请时间：{{ formatDate(audit.applyTime) }}
                </span>
              </div>
            </div>
            <AdminButton type="button" class="text-slate-400 hover:text-slate-600 transition-colors" @click="handleClose">
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </AdminButton>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto p-4">
          <div class="space-y-4">
            <section class="rounded-xl border border-slate-200 bg-white p-4">
              <div class="grid grid-cols-1 gap-3 lg:grid-cols-4">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 lg:col-span-2">
                  <div class="text-xs text-slate-500">积分变动路径</div>
                  <div class="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <span>{{ audit.beforeScore }}</span>
                    <span class="text-slate-400">-></span>
                    <span>{{ audit.afterScore }}</span>
                    <span
                      :class="audit.changeAmount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                      class="ml-2 rounded-full px-2.5 py-0.5 text-sm"
                    >
                      {{ audit.changeAmount > 0 ? '+' : '' }}{{ audit.changeAmount }}
                    </span>
                  </div>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div class="text-xs text-slate-500">变动绝对值</div>
                  <div class="mt-2 text-lg font-semibold text-slate-900">{{ selectedAuditContext.absAmount }}</div>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div class="text-xs text-slate-500">相对变化</div>
                  <div class="mt-2 text-lg font-semibold text-slate-900">{{ selectedAuditContext.changeRate }}%</div>
                </div>
              </div>
            </section>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="text-xs text-slate-500">审核判断信息</div>
                <div class="mt-3 space-y-2 text-sm">
                  <div class="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span class="text-slate-500">变动类型</span>
                    <span
                      v-if="changeTypeConfig[audit.changeType]"
                      :class="changeTypeConfig[audit.changeType].class"
                      class="rounded-full px-2 py-0.5 text-xs font-medium"
                    >
                      {{ changeTypeConfig[audit.changeType].text }}
                    </span>
                  </div>
                  <div class="rounded-lg bg-slate-50 px-3 py-2">
                    <div class="text-slate-500">申请原因</div>
                    <p class="mt-1 text-slate-900 leading-6">{{ audit.reason || '-' }}</p>
                  </div>
                </div>
              </section>

              <section class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="text-xs text-slate-500">用户与申请信息</div>
                <div class="mt-3 space-y-2 text-sm">
                  <div class="flex justify-between"><span class="text-slate-500">用户名</span><span class="font-medium text-slate-900">{{ audit.username }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-500">用户ID</span><span class="font-medium text-slate-900">{{ audit.userId }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-500">邮箱</span><span class="font-medium text-slate-900">{{ audit.email }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-500">申请人</span><span class="font-medium text-slate-900">{{ audit.applyOperatorName }}</span></div>
                  <div class="flex justify-between"><span class="text-slate-500">申请时间</span><span class="font-medium text-slate-900">{{ formatDate(audit.applyTime) }}</span></div>
                </div>
              </section>
            </div>

            <section v-if="showAuditHistorySection" class="rounded-xl border border-slate-200 bg-white p-4">
              <div class="text-xs text-slate-500">历史审核信息</div>
              <div class="mt-3 grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                <div class="rounded-lg bg-slate-50 px-3 py-2">
                  <span class="text-slate-500">审核状态：</span>
                  <span class="font-medium text-slate-900">{{ statusConfig[audit.auditStatus]?.text ?? '-' }}</span>
                </div>
                <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">审核人：</span><span class="font-medium text-slate-900">{{ audit.auditorName || '-' }}</span></div>
                <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">审核时间：</span><span class="font-medium text-slate-900">{{ formatDate(audit.auditTime) }}</span></div>
                <div class="rounded-lg bg-slate-50 px-3 py-2"><span class="text-slate-500">审核备注：</span><span class="font-medium text-slate-900">{{ audit.auditNote || '-' }}</span></div>
              </div>
            </section>
          </div>
        </div>

        <section class="shrink-0 border-t border-slate-200 bg-white px-5 py-4">
          <template v-if="readOnly">
            <div class="flex justify-end">
              <AdminButton type="button" class="ant-btn" @click="handleClose">关闭</AdminButton>
            </div>
          </template>
          <template v-else>
          <div class="text-xs text-slate-500">审核操作</div>
          <div class="mt-3 flex flex-wrap justify-end gap-2">
            <AdminButton type="button" class="ant-btn" @click="handleClose">关闭</AdminButton>
            <AdminButton
              v-if="audit.auditStatus === CREDIT_SCORE_AUDIT_STATUS.PENDING"
              type="button"
              class="ant-btn ant-btn-primary"
              @click="startAuditAction('approve')"
            >通过</AdminButton>
            <AdminButton
              v-if="audit.auditStatus === CREDIT_SCORE_AUDIT_STATUS.PENDING"
              type="button"
              class="ant-btn ant-btn-danger"
              @click="startAuditAction('reject')"
            >拒绝</AdminButton>
          </div>

          <div v-if="auditAction" class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div class="text-sm font-medium text-slate-900">
              {{ auditAction === 'approve' ? '确认通过本次信用分变动' : '请填写拒绝原因' }}
            </div>

            <div class="mt-2 flex flex-wrap gap-2">
              <AdminButton
                v-for="tpl in noteTemplates[auditAction]"
                :key="tpl"
                type="button"
                class="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                @click="useNoteTemplate(tpl)"
              >
                快捷填充
              </AdminButton>
            </div>

            <AdminTextarea
              v-model="auditNote"
              rows="3"
              class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              :placeholder="auditAction === 'approve' ? '请输入通过备注（可选）...' : '请输入拒绝原因...'"
            />

            <div class="mt-3 flex justify-end gap-2">
              <AdminButton type="button" class="ant-btn ant-btn-primary" @click="submitAudit">确认提交</AdminButton>
              <AdminButton type="button" class="ant-btn" @click="auditAction = null">取消</AdminButton>
            </div>
          </div>
          </template>
        </section>
      </section>
      </div>
    </Transition>
  </Teleport>
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
