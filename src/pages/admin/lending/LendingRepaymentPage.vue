<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">还款记录</h1>
        <p class="mt-1 max-w-3xl text-sm text-slate-500">
          与前台还款字段一致；主动/自动还款只使用借出币种账户资金，不能直接扣质押币种。逾期处理请回到订单管理执行质押处理。
        </p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <div class="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <select
            v-model="filters.status"
            class="min-w-[8.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
          >
            <option value="">全部状态</option>
            <option value="pending">待还款</option>
            <option value="processing">处理中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="overdue">逾期</option>
          </select>
          <select
            v-model="filters.repaymentType"
            class="min-w-[8.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
          >
            <option value="">全部类型</option>
            <option value="partial">部分还款</option>
            <option value="full">全额还款</option>
            <option value="auto">自动还款</option>
          </select>
          <select
            v-model="filters.timeRange"
            class="min-w-[7.5rem] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
          >
            <option value="today">今天</option>
            <option value="week">本周</option>
            <option value="month">本月</option>
            <option value="all">全部时间</option>
          </select>
          <input
            v-model="filters.searchText"
            type="search"
            class="min-w-[10rem] max-w-md flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
            placeholder="还款单号、订单号、用户…"
            autocomplete="off"
          />
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            @click="resetFilters"
          >
            重置
          </button>
        </div>
        <div
          v-if="selectedRepaymentIds.length"
          class="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2 border-l border-slate-200 pl-3 text-sm"
        >
          <span class="font-medium text-slate-700">已选 {{ selectedRepaymentIds.length }} 条</span>
          <span class="text-slate-300">|</span>
          <button
            type="button"
            class="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="selectedFailedRows.length === 0"
            @click="batchRetrySelected"
          >
            批量重试
            <span v-if="selectedFailedRows.length" class="tabular-nums">（{{ selectedFailedRows.length }}）</span>
          </button>
          <button
            type="button"
            class="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-45"
            :disabled="selectedRemindRows.length === 0"
            @click="openRemindModalForBatch"
          >
            批量提醒
            <span v-if="selectedRemindRows.length" class="tabular-nums">（{{ selectedRemindRows.length }}）</span>
          </button>
          <button
            type="button"
            class="rounded border border-transparent px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            @click="clearSelection"
          >
            清除选择
          </button>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full min-w-[58rem] text-sm">
          <thead class="bg-slate-50 text-slate-500">
            <tr>
              <th class="w-10 px-3 py-3 text-left font-medium">
                <input
                  ref="headerCheckboxRef"
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-blue-600"
                  title="全选本页"
                  aria-label="全选本页"
                  :checked="allPageSelected"
                  @change="onToggleSelectAllPage"
                />
              </th>
              <th class="px-4 py-3 text-left font-medium">还款单</th>
              <th class="px-4 py-3 text-left font-medium">订单 / 用户</th>
              <th class="px-4 py-3 text-left font-medium">产品</th>
              <th class="px-4 py-3 text-left font-medium">还款明细</th>
              <th class="px-4 py-3 text-left font-medium">状态</th>
              <th class="min-w-[9rem] px-4 py-3 text-left font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!repaymentsPaged.length">
              <td colspan="7" class="px-4 py-12 text-center">
                <div class="mx-auto max-w-sm rounded-lg border border-dashed border-slate-300 px-6 py-8 text-sm text-slate-500">
                  暂无符合条件的还款记录
                </div>
              </td>
            </tr>
            <tr
              v-for="repayment in repaymentsPaged"
              :key="repayment.repaymentId"
              class="border-t border-slate-100"
            >
              <td class="px-3 py-3 align-top">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300 text-blue-600"
                  :checked="isRepaymentSelected(repayment.repaymentId)"
                  @change="toggleRepaymentSelect(repayment.repaymentId)"
                />
              </td>
              <td class="px-4 py-3 align-top">
                <div class="font-mono text-xs text-slate-600">{{ repayment.repaymentId }}</div>
                <div class="mt-0.5 text-xs text-slate-500 tabular-nums">
                  {{ repayment.repaymentTime ? formatDateTime(repayment.repaymentTime) : `创建 ${formatDateTime(repayment.createTime)}` }}
                </div>
              </td>
              <td class="px-4 py-3 align-top">
                <div class="font-mono text-xs text-slate-600">{{ repayment.orderId }}</div>
                <div class="mt-0.5 text-xs text-slate-600">
                  <span class="text-slate-500">{{ repayment.userId }}</span>
                  <span class="text-slate-300"> · </span>
                  <span class="font-medium text-slate-900">{{ repayment.userName }}</span>
                </div>
              </td>
              <td class="max-w-[11rem] px-4 py-3 align-top">
                <div class="truncate font-medium text-slate-900" :title="repayment.productName">{{ repayment.productName }}</div>
                <span
                  class="mt-1 inline-flex rounded px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 bg-slate-100"
                >
                  {{ repayment.loanCurrency || '—' }}
                </span>
              </td>
              <td class="min-w-[14rem] px-4 py-3 align-top">
                <div class="flex flex-wrap items-center gap-2">
                  <span
                    class="inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-medium"
                    :class="{
                      'bg-blue-50 text-blue-700': repayment.repaymentType === 'partial',
                      'bg-emerald-50 text-emerald-700': repayment.repaymentType === 'full',
                      'bg-violet-50 text-violet-700': repayment.repaymentType === 'auto'
                    }"
                  >
                    {{ repaymentTypeLabel(repayment.repaymentType) }}
                  </span>
                  <span class="font-medium tabular-nums text-slate-900">
                    {{ formatLedgerAmount(repayment.amount, repayment.loanCurrency) }}
                  </span>
                </div>
                <div class="mt-1 text-[11px] tabular-nums text-slate-500">
                  息 {{ formatLedgerNumber(repayment.interestPaid) }} · 本 {{ formatLedgerNumber(repayment.principalPaid) }} · 余
                  {{ formatLedgerNumber(repayment.remainingDebt) }}
                  <span class="text-slate-400">{{ repayment.loanCurrency || 'USDT' }}</span>
                </div>
                <div class="mt-1 text-[11px] text-slate-500">
                  {{ repayment.paymentMethod }}
                  <span v-if="repayment.transactionId" class="ml-1 font-mono text-slate-400" :title="repayment.transactionId">
                    {{ truncateMiddle(repayment.transactionId, 10) }}
                  </span>
                </div>
              </td>
              <td class="px-4 py-3 align-top">
                <span
                  class="inline-flex rounded-md px-2 py-0.5 text-xs font-medium"
                  :class="{
                    'bg-blue-50 text-blue-700': repayment.status === 'pending',
                    'bg-cyan-50 text-cyan-700': repayment.status === 'processing',
                    'bg-slate-100 text-slate-600': repayment.status === 'completed',
                    'bg-rose-50 text-rose-700': repayment.status === 'failed',
                    'bg-amber-50 text-amber-700': repayment.status === 'overdue'
                  }"
                >
                  {{ statusLabel(repayment.status) }}
                </span>
                <p v-if="repayment.failureReason" class="mt-1 line-clamp-2 text-[11px] text-rose-600" :title="repayment.failureReason">
                  {{ repayment.failureReason }}
                </p>
              </td>
              <td class="px-4 py-3 align-top">
                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="whitespace-nowrap rounded border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    @click="viewDetails(repayment)"
                  >
                    详情
                  </button>
                  <button
                    v-if="repayment.status === 'failed'"
                    type="button"
                    class="whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
                    @click="retryRepayment(repayment)"
                  >
                    重试
                  </button>
                  <button
                    v-if="repayment.status === 'pending' || repayment.status === 'overdue'"
                    type="button"
                    class="whitespace-nowrap rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    @click="sendReminder(repayment)"
                  >
                    提醒用户
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <AdminListPaginationBar
        :current-page="listPage"
        :total-pages="totalPages"
        :total-count="filteredRepayments.length"
        :page-size="pageSize"
        @update:current-page="listPage = $event"
        @update:page-size="onPageSizeChange"
      />
    </article>

    <!-- 还款详情 -->
    <div
      v-if="showDetailModal"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
    >
      <article
        class="relative flex max-h-[min(90vh,56rem)] w-full max-w-4xl min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
      >
        <header class="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-900">还款详情</h2>
              <p class="mt-0.5 font-mono text-sm text-slate-500">{{ currentDetailRepayment?.repaymentId }}</p>
            </div>
          </div>
          <button aria-label="关闭" type="button" class="text-slate-400 transition-colors hover:text-slate-600" @click="closeDetailModal">
            <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50 p-6">
          <div class="rounded-lg border border-slate-200 bg-white p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-sm text-slate-500">还款状态</p>
                <p class="mt-1 text-lg font-semibold text-slate-900">{{ statusLabel(currentDetailRepayment?.status) }}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-500">还款金额</p>
                <p class="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {{ formatLedgerAmount(currentDetailRepayment?.amount, currentDetailRepayment?.loanCurrency) }}
                </p>
              </div>
            </div>
            <div v-if="currentDetailRepayment?.failureReason" class="mt-4 rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
              <p class="text-xs text-rose-700">失败原因：{{ currentDetailRepayment.failureReason }}</p>
            </div>
          </div>

          <section class="rounded-lg border border-slate-200 bg-white p-4">
            <h3 class="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">还款信息</h3>
            <div class="grid gap-4 md:grid-cols-3">
              <div>
                <label class="text-xs font-medium text-slate-500">还款类型</label>
                <p class="mt-1 text-sm font-medium text-slate-900">
                  {{ repaymentTypeLabel(currentDetailRepayment?.repaymentType) }}
                </p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">支付方式</label>
                <p class="mt-1 text-sm font-medium text-slate-900">{{ currentDetailRepayment?.paymentMethod }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">交易单号</label>
                <p class="mt-1 text-sm font-mono text-slate-900">{{ currentDetailRepayment?.transactionId || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">已还利息</label>
                <p class="mt-1 text-sm font-semibold text-amber-600 tabular-nums">
                  {{ formatLedgerAmount(currentDetailRepayment?.interestPaid, currentDetailRepayment?.loanCurrency) }}
                </p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">已还本金</label>
                <p class="mt-1 text-sm font-semibold text-emerald-600 tabular-nums">
                  {{ formatLedgerAmount(currentDetailRepayment?.principalPaid, currentDetailRepayment?.loanCurrency) }}
                </p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">剩余债务</label>
                <p class="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
                  {{ formatLedgerAmount(currentDetailRepayment?.remainingDebt, currentDetailRepayment?.loanCurrency) }}
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-slate-200 bg-white p-4">
            <h3 class="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">关联订单</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="text-xs font-medium text-slate-500">订单编号</label>
                <p class="mt-1 font-mono text-sm font-medium text-slate-900">{{ currentDetailRepayment?.orderId }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">产品名称</label>
                <p class="mt-1 text-sm font-medium text-slate-900">{{ currentDetailRepayment?.productName }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">借出币种</label>
                <p class="mt-1 text-sm font-mono font-medium text-slate-900">{{ currentDetailRepayment?.loanCurrency || '—' }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">用户ID</label>
                <p class="mt-1 text-sm font-mono text-slate-900">{{ currentDetailRepayment?.userId }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">用户姓名</label>
                <p class="mt-1 text-sm font-medium text-slate-900">{{ currentDetailRepayment?.userName }}</p>
              </div>
            </div>
          </section>

          <section class="rounded-lg border border-slate-200 bg-white p-4">
            <h3 class="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900">时间记录</h3>
            <div class="grid gap-4 md:grid-cols-2">
              <div>
                <label class="text-xs font-medium text-slate-500">创建时间</label>
                <p class="mt-1 text-sm text-slate-900">{{ formatDateTime(currentDetailRepayment?.createTime) }}</p>
              </div>
              <div>
                <label class="text-xs font-medium text-slate-500">完成时间</label>
                <p class="mt-1 text-sm text-slate-900">
                  {{ currentDetailRepayment?.repaymentTime ? formatDateTime(currentDetailRepayment.repaymentTime) : '—' }}
                </p>
              </div>
            </div>
          </section>
        </div>

        <footer class="shrink-0 border-t border-slate-200 bg-white px-6 py-4">
          <div class="flex items-center justify-end">
            <button
              type="button"
              class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              @click="closeDetailModal"
            >
              关闭
            </button>
          </div>
        </footer>
      </article>
    </div>

    <!-- 提醒方式（单条 / 批量） -->
    <div
      v-if="remindModalOpen"
      class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
    >
      <article class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
        <h2 class="text-xl font-semibold text-slate-900">发送还款提醒</h2>
        <p class="mt-1 text-sm text-slate-500">
          将对 <span class="font-medium tabular-nums text-slate-800">{{ remindTargets.length }}</span> 笔还款关联用户发送提醒
        </p>
        <fieldset class="mt-5 space-y-2">
          <legend class="text-sm font-medium text-slate-600">提醒方式</legend>
          <label
            v-for="opt in remindChannelOptions"
            :key="opt.value"
            class="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50 has-[:checked]:border-blue-400 has-[:checked]:bg-blue-50/60"
          >
            <input v-model="remindChannel" type="radio" name="remindChannel" class="text-blue-600" :value="opt.value" />
            <span class="text-slate-800">{{ opt.label }}</span>
          </label>
        </fieldset>
        <footer class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="closeRemindModal"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            @click="confirmRemindSend"
          >
            发送
          </button>
        </footer>
      </article>
    </div>

    <!-- 重试还款：确认（单条 / 批量） -->
    <div
      v-if="retryConfirmOpen"
      class="fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/50 p-4"
    >
      <article class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" @click.stop>
        <h2 class="text-xl font-semibold text-slate-900">
          {{ retryConfirmScope === 'batch' ? '批量重新发起还款' : '重新发起还款' }}
        </h2>
        <p v-if="retryConfirmScope === 'batch'" class="mt-2 text-sm leading-relaxed text-slate-600">
          确定对
          <span class="font-semibold tabular-nums text-amber-900">{{ pendingBatchRetryCount }}</span>
          条<span class="text-rose-700">失败</span>记录重新发起还款？提交后状态将变为「处理中」并清空失败原因（演示环境）。
        </p>
        <p v-else class="mt-2 text-sm leading-relaxed text-slate-600">
          确定重新发起还款单
          <span class="font-mono text-sm font-semibold text-slate-900">{{ pendingSingleRetryId }}</span>
          ？提交后状态将变为「处理中」并清空失败原因（演示环境）。
        </p>
        <footer class="mt-6 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            @click="closeRetryConfirm"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
            @click="confirmRetry"
          >
            确定重新发起
          </button>
        </footer>
      </article>
    </div>

    <!-- 重试：提示 / 成功 -->
    <div
      v-if="retryFeedback.open"
      class="fixed inset-0 z-[60] flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-black/50 p-4"
    >
      <article class="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl" @click.stop>
        <h2 class="text-xl font-semibold text-slate-900">{{ retryFeedback.title }}</h2>
        <p class="mt-2 text-sm text-slate-600">{{ retryFeedback.message }}</p>
        <footer class="mt-6 flex justify-end">
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            @click="closeRetryFeedback"
          >
            知道了
          </button>
        </footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
import { mockRepayments } from '../../../admin/mock/cryptoLending'
import {
  REPAYMENT_STATUS_LABELS,
  REPAYMENT_TYPE_LABELS,
  REPAYMENT_STATUS,
  REPAYMENT_REMINDER_CHANNEL,
  REPAYMENT_REMINDER_CHANNEL_LABELS
} from '../../../admin/constants/cryptoLending'
import AdminListPaginationBar from '../../../admin/components/AdminListPaginationBar.vue'

const repayments = ref([])
const listPage = ref(1)
const pageSize = ref(10)
const showDetailModal = ref(false)
const currentDetailRepayment = ref(null)

const selectedRepaymentIds = ref([])
const headerCheckboxRef = ref(null)
const remindModalOpen = ref(false)
const remindTargets = ref([])
const remindChannel = ref(REPAYMENT_REMINDER_CHANNEL.IN_APP)

const retryConfirmOpen = ref(false)
/** 单条重试 vs 批量重试 */
const retryConfirmScope = ref('batch')
const pendingBatchRetryIds = ref([])
const pendingSingleRetryId = ref('')
const pendingBatchRetryCount = computed(() => pendingBatchRetryIds.value.length)

const retryFeedback = ref({
  open: false,
  title: '',
  message: ''
})

const remindChannelOptions = [
  { value: REPAYMENT_REMINDER_CHANNEL.IN_APP, label: REPAYMENT_REMINDER_CHANNEL_LABELS[REPAYMENT_REMINDER_CHANNEL.IN_APP] },
  { value: REPAYMENT_REMINDER_CHANNEL.SMS, label: REPAYMENT_REMINDER_CHANNEL_LABELS[REPAYMENT_REMINDER_CHANNEL.SMS] },
  { value: REPAYMENT_REMINDER_CHANNEL.EMAIL, label: REPAYMENT_REMINDER_CHANNEL_LABELS[REPAYMENT_REMINDER_CHANNEL.EMAIL] },
  { value: REPAYMENT_REMINDER_CHANNEL.ALL, label: REPAYMENT_REMINDER_CHANNEL_LABELS[REPAYMENT_REMINDER_CHANNEL.ALL] }
]

const filters = ref({
  status: '',
  repaymentType: '',
  timeRange: 'all',
  searchText: ''
})

onMounted(() => {
  repayments.value = [...mockRepayments]
})

function parseRowTimeMs(r) {
  const s = r.repaymentTime || r.createTime
  if (!s) return null
  const t = Date.parse(String(s).replace(' ', 'T'))
  return Number.isNaN(t) ? null : t
}

function startOfTodayMs() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function startOfWeekMondayMs() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const s = new Date(d)
  s.setDate(d.getDate() + diff)
  s.setHours(0, 0, 0, 0)
  return s.getTime()
}

function startOfMonthMs() {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime()
}

const filteredRepayments = computed(() => {
  let result = repayments.value

  if (filters.value.status) {
    result = result.filter((r) => r.status === filters.value.status)
  }
  if (filters.value.repaymentType) {
    result = result.filter((r) => r.repaymentType === filters.value.repaymentType)
  }
  if (filters.value.searchText) {
    const search = filters.value.searchText.toLowerCase().trim()
    result = result.filter((r) => {
      const cur = (r.loanCurrency || '').toLowerCase()
      return (
        r.repaymentId.toLowerCase().includes(search) ||
        r.orderId.toLowerCase().includes(search) ||
        r.userId.toLowerCase().includes(search) ||
        (r.userName && r.userName.toLowerCase().includes(search)) ||
        (cur && cur.includes(search))
      )
    })
  }

  const tr = filters.value.timeRange
  if (tr && tr !== 'all') {
    const now = Date.now()
    let from = 0
    if (tr === 'today') from = startOfTodayMs()
    else if (tr === 'week') from = startOfWeekMondayMs()
    else if (tr === 'month') from = startOfMonthMs()
    result = result.filter((r) => {
      const t = parseRowTimeMs(r)
      return t != null && t >= from && t <= now
    })
  }

  return result
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredRepayments.value.length / pageSize.value)))

const repaymentsPaged = computed(() => {
  const list = filteredRepayments.value
  const page = Math.min(listPage.value, totalPages.value)
  const start = (page - 1) * pageSize.value
  return list.slice(start, start + pageSize.value)
})

const selectedRepaymentRows = computed(() =>
  repayments.value.filter((r) => selectedRepaymentIds.value.includes(r.repaymentId))
)

const selectedFailedRows = computed(() =>
  selectedRepaymentRows.value.filter((r) => r.status === REPAYMENT_STATUS.FAILED)
)

const selectedRemindRows = computed(() =>
  selectedRepaymentRows.value.filter(
    (r) => r.status === REPAYMENT_STATUS.PENDING || r.status === REPAYMENT_STATUS.OVERDUE
  )
)

const pageRepaymentIds = computed(() => repaymentsPaged.value.map((r) => r.repaymentId))

const allPageSelected = computed(() => {
  const ids = pageRepaymentIds.value
  if (!ids.length) return false
  return ids.every((id) => selectedRepaymentIds.value.includes(id))
})

function isRepaymentSelected(id) {
  return selectedRepaymentIds.value.includes(id)
}

function toggleRepaymentSelect(id) {
  const cur = selectedRepaymentIds.value
  const i = cur.indexOf(id)
  if (i === -1) selectedRepaymentIds.value = [...cur, id]
  else selectedRepaymentIds.value = cur.filter((x) => x !== id)
}

function onToggleSelectAllPage(e) {
  const checked = e.target.checked
  const ids = pageRepaymentIds.value
  if (checked) {
    const set = new Set([...selectedRepaymentIds.value, ...ids])
    selectedRepaymentIds.value = [...set]
  } else {
    const idSet = new Set(ids)
    selectedRepaymentIds.value = selectedRepaymentIds.value.filter((x) => !idSet.has(x))
  }
}

function clearSelection() {
  selectedRepaymentIds.value = []
}

watchEffect(() => {
  const el = headerCheckboxRef.value
  if (!el) return
  const ids = pageRepaymentIds.value
  const sel = selectedRepaymentIds.value
  const onPage = ids.filter((id) => sel.includes(id)).length
  el.indeterminate = ids.length > 0 && onPage > 0 && onPage < ids.length
})

watch(
  () => repayments.value.map((r) => r.repaymentId).join('\0'),
  () => {
    const valid = new Set(repayments.value.map((r) => r.repaymentId))
    selectedRepaymentIds.value = selectedRepaymentIds.value.filter((id) => valid.has(id))
  }
)

watch(
  () => [filters.value.status, filters.value.repaymentType, filters.value.timeRange, filters.value.searchText],
  () => {
    listPage.value = 1
  }
)

watch([() => filteredRepayments.value.length, pageSize], () => {
  const tp = Math.max(1, Math.ceil(filteredRepayments.value.length / pageSize.value))
  if (listPage.value > tp) listPage.value = tp
})

const formatLedgerAmount = (value, loanCurrency) => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const cur = loanCurrency || 'USDT'
  return `${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 6 })} ${cur}`
}

const formatLedgerNumber = (value) => {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 6 })
}

function truncateMiddle(s, max = 14) {
  if (s == null || s === '') return ''
  if (s.length <= max) return s
  const keep = max - 1
  const head = Math.ceil(keep / 2)
  const tail = Math.floor(keep / 2)
  return `${s.slice(0, head)}…${s.slice(-tail)}`
}

const formatDateTime = (dateStr) => dateStr || '—'

const statusLabel = (status) => REPAYMENT_STATUS_LABELS[status] || status

const repaymentTypeLabel = (type) => REPAYMENT_TYPE_LABELS[type] || type

const resetFilters = () => {
  filters.value = {
    status: '',
    repaymentType: '',
    timeRange: 'all',
    searchText: ''
  }
}

const onPageSizeChange = (n) => {
  pageSize.value = n
  listPage.value = 1
}

const viewDetails = (repayment) => {
  currentDetailRepayment.value = repayment
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  currentDetailRepayment.value = null
}

const retryRepayment = (repayment) => {
  pendingSingleRetryId.value = repayment.repaymentId
  retryConfirmScope.value = 'single'
  retryConfirmOpen.value = true
}

function applyRetryToRepayments(ids) {
  const idSet = new Set(ids)
  repayments.value = repayments.value.map((r) =>
    idSet.has(r.repaymentId)
      ? { ...r, status: REPAYMENT_STATUS.PROCESSING, failureReason: null }
      : r
  )
}

function openRetryFeedback(title, message) {
  retryFeedback.value = { open: true, title, message }
}

function closeRetryFeedback() {
  retryFeedback.value = { open: false, title: '', message: '' }
}

function closeRetryConfirm() {
  retryConfirmOpen.value = false
  pendingBatchRetryIds.value = []
  pendingSingleRetryId.value = ''
}

function batchRetrySelected() {
  const rows = selectedFailedRows.value
  if (!rows.length) {
    openRetryFeedback('无法重试', '所选记录中没有可重试的失败还款')
    return
  }
  retryConfirmScope.value = 'batch'
  pendingBatchRetryIds.value = rows.map((r) => r.repaymentId)
  retryConfirmOpen.value = true
}

function confirmRetry() {
  if (retryConfirmScope.value === 'batch') {
    const ids = [...pendingBatchRetryIds.value]
    closeRetryConfirm()
    if (!ids.length) return
    applyRetryToRepayments(ids)
    openRetryFeedback('操作成功', `已重新发起 ${ids.length} 条还款`)
    return
  }
  const id = pendingSingleRetryId.value
  closeRetryConfirm()
  if (!id) return
  const index = repayments.value.findIndex((r) => r.repaymentId === id)
  if (index === -1) return
  repayments.value[index] = {
    ...repayments.value[index],
    status: REPAYMENT_STATUS.PROCESSING,
    failureReason: null
  }
  openRetryFeedback('操作成功', `已对还款单 ${id} 重新发起`)
}

function openRemindModal(rows) {
  if (!rows.length) return
  remindTargets.value = rows
  remindChannel.value = REPAYMENT_REMINDER_CHANNEL.IN_APP
  remindModalOpen.value = true
}

function closeRemindModal() {
  remindModalOpen.value = false
  remindTargets.value = []
}

function openRemindModalForBatch() {
  const rows = selectedRemindRows.value
  if (!rows.length) {
    alert('所选记录中没有待还款或逾期记录')
    return
  }
  openRemindModal(rows)
}

function confirmRemindSend() {
  const rows = remindTargets.value
  if (!rows.length) return
  const ch = remindChannel.value
  const label = REPAYMENT_REMINDER_CHANNEL_LABELS[ch] || ch
  const users = [...new Set(rows.map((r) => r.userName || r.userId))]
  const userPart =
    users.length <= 5 ? users.join('、') : `${users.slice(0, 5).join('、')} 等 ${users.length} 人`
  alert(`已通过「${label}」向 ${rows.length} 笔还款关联用户发送提醒（${userPart}）`)
  closeRemindModal()
}

const sendReminder = (repayment) => {
  openRemindModal([repayment])
}

</script>
