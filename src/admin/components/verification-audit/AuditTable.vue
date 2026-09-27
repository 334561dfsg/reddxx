<script setup>
import { Table, Tag } from 'ant-design-vue'
import { AdminButton } from '../antd/controls.js'
defineProps({
  loading: { type: Boolean, default: false },
  auditList: { type: Array, default: () => [] },
  statusConfig: { type: Object, default: () => ({}) },
  levelConfig: { type: Object, default: () => ({}) },
  totalPages: { type: Number, default: 0 },
  pagination: { type: Object, default: () => ({ currentPage: 1, total: 0 }) },
  formatDate: { type: Function, required: true },
  variant: { type: String, default: 'admin' }
})

const columns = [
  { title: '用户信息', key: 'user' },
  { title: '认证等级', key: 'level' },
  { title: '认证资料', key: 'documents' },
  { title: '状态', key: 'status' },
  { title: '申请时间', key: 'time' },
  { title: '操作', key: 'actions' }
]
const emit = defineEmits(['view-detail', 'prev-page', 'next-page'])
</script>

<template>
  <Table v-if="variant !== 'agent'" :data-source="auditList" :columns="columns" row-key="id" size="small" :loading="loading" :pagination="false" :scroll="{ x: 'max-content' }" :locale="{ emptyText: '暂无审核记录' }">
    <template #bodyCell="{ column, record: audit }">
      <div v-if="column.key === 'user'">
        <p class="font-medium">{{ audit.username }}</p>
        <p>{{ audit.basicInfo?.realName ?? '—' }}</p>
        <p class="text-xs text-slate-500">{{ audit.email }}</p>
      </div>
      <div v-else-if="column.key === 'level'" class="space-y-1">
        <Tag :class="levelConfig[audit.currentLevel]?.class">{{ levelConfig[audit.currentLevel]?.text }}</Tag>
        <p class="text-xs text-slate-500">↓ 申请</p>
        <Tag :class="levelConfig[audit.applyLevel]?.class">{{ levelConfig[audit.applyLevel]?.text }}</Tag>
      </div>
      <span v-else-if="column.key === 'documents'">{{ audit.documents?.length || 0 }} 份</span>
      <Tag v-else-if="column.key === 'status'" :class="statusConfig[audit.status]?.class">{{ statusConfig[audit.status]?.text }}</Tag>
      <span v-else-if="column.key === 'time'">{{ formatDate(audit.submitTime) }}</span>
      <AdminButton v-else-if="column.key === 'actions'" class="bg-blue-600 text-white" @click="emit('view-detail', audit)">查看详情</AdminButton>
    </template>
  </Table>
  <div v-else class="overflow-x-auto">
    <table class="w-full min-w-[52rem] border-collapse text-left text-sm">
      <thead :class="variant === 'agent' ? 'bg-white/[0.04] text-xs text-white/50' : 'bg-slate-50'">
        <tr>
          <th
            :class="
              variant === 'agent'
                ? 'px-4 py-3 font-medium'
                : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'
            "
          >
            用户信息
          </th>
          <th
            :class="
              variant === 'agent'
                ? 'px-4 py-3 font-medium'
                : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'
            "
          >
            认证等级
          </th>
          <th
            :class="
              variant === 'agent'
                ? 'px-4 py-3 font-medium'
                : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'
            "
          >
            提交材料
          </th>
          <th
            :class="
              variant === 'agent'
                ? 'px-4 py-3 font-medium'
                : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'
            "
          >
            状态
          </th>
          <th
            :class="
              variant === 'agent'
                ? 'px-4 py-3 font-medium'
                : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'
            "
          >
            提交时间
          </th>
          <th
            :class="
              variant === 'agent'
                ? 'px-4 py-3 text-right font-medium'
                : 'px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600'
            "
          >
            操作
          </th>
        </tr>
      </thead>
      <tbody :class="variant === 'agent' ? 'divide-y divide-white/[0.05]' : 'divide-y divide-slate-200 bg-white'">
        <tr
          v-for="audit in auditList"
          :key="audit.id"
          :class="variant === 'agent' ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'"
        >
          <td :class="variant === 'agent' ? 'whitespace-nowrap px-4 py-3' : 'whitespace-nowrap px-6 py-4'">
            <div class="flex flex-col">
              <div :class="variant === 'agent' ? 'text-sm font-medium text-white/90' : 'text-sm font-medium text-gray-900'">
                {{ audit.username }}
              </div>
              <div :class="variant === 'agent' ? 'text-sm text-white/50' : 'text-sm text-gray-500'">
                {{ audit.basicInfo?.realName ?? '—' }}
              </div>
              <div :class="variant === 'agent' ? 'text-xs text-white/35' : 'text-xs text-gray-400'">{{ audit.email }}</div>
            </div>
          </td>
          <td :class="variant === 'agent' ? 'whitespace-nowrap px-4 py-3' : 'whitespace-nowrap px-6 py-4'">
            <div class="flex flex-col space-y-1">
              <span
                :class="[
                  levelConfig[audit.currentLevel]?.class,
                  variant === 'agent' ? 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium' : 'inline-flex rounded-full px-2 py-1 text-xs font-semibold'
                ]"
              >
                {{ levelConfig[audit.currentLevel]?.text }}
              </span>
              <div :class="variant === 'agent' ? 'flex items-center text-[11px] text-white/35' : 'flex items-center text-xs text-gray-400'">
                <span>↓ 申请</span>
              </div>
              <span
                :class="[
                  levelConfig[audit.applyLevel]?.class,
                  variant === 'agent' ? 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium' : 'inline-flex rounded-full px-2 py-1 text-xs font-semibold'
                ]"
              >
                {{ levelConfig[audit.applyLevel]?.text }}
              </span>
            </div>
          </td>
          <td :class="variant === 'agent' ? 'whitespace-nowrap px-4 py-3 text-white/70' : 'whitespace-nowrap px-6 py-4'">
            <div :class="variant === 'agent' ? 'text-sm' : 'text-sm text-slate-700'">{{ audit.documents?.length || 0 }} 份</div>
          </td>
          <td :class="variant === 'agent' ? 'whitespace-nowrap px-4 py-3' : 'whitespace-nowrap px-6 py-4'">
            <span
              :class="[
                statusConfig[audit.status]?.class,
                variant === 'agent' ? 'rounded-full px-2 py-0.5 text-xs font-medium' : 'rounded-full px-2 py-1 text-xs font-semibold'
              ]"
              >{{ statusConfig[audit.status]?.text }}</span>
          </td>
          <td
            :class="
              variant === 'agent'
                ? 'whitespace-nowrap px-4 py-3 text-xs text-white/50'
                : 'whitespace-nowrap px-6 py-4 text-sm text-gray-500'
            "
          >
            {{ formatDate(audit.submitTime) }}
          </td>
          <td
            :class="
              variant === 'agent'
                ? 'whitespace-nowrap px-4 py-3 text-right text-sm font-medium'
                : 'whitespace-nowrap px-6 py-4 text-sm font-medium'
            "
          >
            <button
              type="button"
              :class="
                variant === 'agent'
                  ? 'text-emerald-300/95 hover:text-emerald-200 hover:underline'
                  : 'text-blue-600 hover:text-blue-900'
              "
              @click="emit('view-detail', audit)"
            >
              查看详情
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div v-if="variant === 'agent' && !loading && auditList.length === 0" :class="variant === 'agent' ? 'py-12 text-center text-sm text-white/45' : 'py-12 text-center'">
    <p :class="variant === 'agent' ? '' : 'text-gray-500'">暂无审核记录</p>
  </div>

  <div
    v-if="variant !== 'agent' && totalPages > 1"
    :class="
      variant === 'agent'
        ? 'flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3'
        : 'flex items-center justify-between border-t border-gray-200 px-6 py-3'
    "
  >
    <div :class="variant === 'agent' ? 'text-xs text-white/45' : 'text-sm text-gray-600'">
      共
      <span :class="variant === 'agent' ? 'font-medium text-white/70' : 'font-medium text-gray-900'">{{
        pagination.total
      }}</span>
      条记录，第
      <span :class="variant === 'agent' ? 'font-medium text-white/70' : 'font-medium text-gray-900'">{{
        pagination.currentPage
      }}</span>
      /
      <span :class="variant === 'agent' ? 'font-medium text-white/70' : 'font-medium text-gray-900'">{{
        totalPages
      }}</span>
      页
    </div>
    <div class="flex items-center gap-2">
      <AdminButton
        type="button"
        :disabled="pagination.currentPage === 1 || loading"
        :class="
          variant === 'agent'
            ? 'rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40'
            : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
        "
        @click="emit('prev-page')"
      >
        上一页
      </AdminButton>
      <AdminButton
        type="button"
        :disabled="pagination.currentPage === totalPages || loading"
        :class="
          variant === 'agent'
            ? 'rounded-lg border border-white/12 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40'
            : 'rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50'
        "
        @click="emit('next-page')"
      >
        下一页
      </AdminButton>
    </div>
  </div>
</template>
