<script setup>
import { computed } from 'vue'
import { USER_STATUS, USER_ROLE, USER_KYC_STATUS } from '../constants/user'

const props = defineProps({
  user: {
    type: Object,
    required: true
  }
})

const statusConfig = {
  [USER_STATUS.ACTIVE]: { text: '活跃', class: 'bg-emerald-100 text-emerald-700' },
  [USER_STATUS.INACTIVE]: { text: '不活跃', class: 'bg-gray-100 text-gray-700' },
  [USER_STATUS.SUSPENDED]: { text: '暂停', class: 'bg-amber-100 text-amber-700' },
  [USER_STATUS.BANNED]: { text: '禁用', class: 'bg-rose-100 text-rose-700' }
}

const roleConfig = {
  [USER_ROLE.USER]: { text: '普通用户', class: 'bg-blue-100 text-blue-700' },
  [USER_ROLE.AGENT]: { text: '代理', class: 'bg-purple-100 text-purple-700' }
}

const kycConfig = {
  [USER_KYC_STATUS.NOT_VERIFIED]: { text: '未认证', class: 'bg-gray-100 text-gray-700' },
  [USER_KYC_STATUS.PENDING]: { text: '审核中', class: 'bg-blue-100 text-blue-700' },
  [USER_KYC_STATUS.VERIFIED]: { text: '已认证', class: 'bg-emerald-100 text-emerald-700' },
  [USER_KYC_STATUS.REJECTED]: { text: '已拒绝', class: 'bg-rose-100 text-rose-700' }
}

const creditScoreClass = computed(() => {
  const score = props.user.creditScore
  if (score >= 700) return 'bg-emerald-100 text-emerald-700'
  if (score >= 600) return 'bg-blue-100 text-blue-700'
  if (score >= 500) return 'bg-amber-100 text-amber-700'
  return 'bg-rose-100 text-rose-700'
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value)
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const profitClass = computed(() => {
  return props.user.totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'
})
</script>

<template>
  <article class="rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
    <!-- 用户基本信息 -->
    <div class="flex items-start justify-between mb-4">
      <div>
        <div class="flex items-center gap-3">
          <h3 class="text-xl font-bold text-slate-900">{{ user.username }}</h3>
          <span v-if="user.isVip" class="inline-flex items-center">
            <svg class="h-6 w-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
            </svg>
          </span>
        </div>
        <p class="text-sm text-slate-500 mt-1">{{ user.email }}</p>
        <p class="text-xs font-mono text-slate-400 mt-1">ID: {{ user.id }}</p>
      </div>
      
      <!-- 状态和角色标签 -->
      <div class="flex flex-col gap-2 items-end">
        <span 
          :class="statusConfig[user.status].class"
          class="px-3 py-1 text-xs font-medium rounded-full"
        >
          {{ statusConfig[user.status].text }}
        </span>
        <span 
          :class="roleConfig[user.role].class"
          class="px-3 py-1 text-xs font-medium rounded-full"
        >
          {{ roleConfig[user.role].text }}
        </span>
      </div>
    </div>

    <!-- 信用分 -->
    <div class="mb-4 p-3 bg-slate-50 rounded-lg">
      <p class="text-xs text-slate-500 mb-1">信用分</p>
      <div class="flex items-center gap-2">
        <span 
          :class="creditScoreClass"
          class="inline-flex px-3 py-1 text-lg font-bold rounded-md"
        >
          {{ user.creditScore }}
        </span>
        <span class="text-xs text-slate-500">/ 800</span>
      </div>
    </div>

    <!-- 分隔线 -->
    <div class="my-4 border-t border-slate-100"></div>

    <!-- 财务信息 -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <div>
        <p class="text-xs text-slate-500">账户余额</p>
        <p class="text-base font-semibold text-slate-900 mt-1">
          {{ formatCurrency(user.balance) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-slate-500">冻结金额</p>
        <p class="text-base font-semibold text-slate-900 mt-1">
          {{ formatCurrency(user.frozenBalance) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-slate-500">累计盈亏</p>
        <p :class="profitClass" class="text-base font-semibold mt-1">
          {{ formatCurrency(user.totalProfit) }}
        </p>
      </div>
      <div>
        <p class="text-xs text-slate-500">交易量</p>
        <p class="text-base font-semibold text-slate-900 mt-1">
          {{ formatCurrency(user.tradingVolume) }}
        </p>
      </div>
    </div>

    <!-- 其他信息 -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">裂变上级</span>
        <span v-if="user.parentUsername" class="text-sm font-medium text-slate-700">
          {{ user.parentUsername }}
        </span>
        <span v-else class="text-xs text-slate-400">无裂变上级</span>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">KYC状态</span>
        <span 
          :class="kycConfig[user.kycStatus].class"
          class="px-2 py-1 text-xs font-medium rounded-full"
        >
          {{ kycConfig[user.kycStatus].text }}
        </span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">手机号</span>
        <span class="text-xs text-slate-700">{{ user.phone }}</span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">注册时间</span>
        <span class="text-xs text-slate-700">{{ formatDate(user.registerTime) }}</span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">最后登录</span>
        <span class="text-xs text-slate-700">{{ formatDate(user.lastLoginTime) }}</span>
      </div>
      
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-500">登录IP</span>
        <span class="text-xs font-mono text-slate-700">{{ user.lastLoginIp }}</span>
      </div>

      <div v-if="user.remark" class="pt-2 border-t border-slate-100">
        <p class="text-xs text-slate-500">备注</p>
        <p class="text-xs text-slate-700 mt-1">{{ user.remark }}</p>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="mt-4 pt-4 border-t border-slate-100 flex gap-2">
      <button class="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
        编辑用户
      </button>
      <button class="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
        管理权限
      </button>
      <button class="px-4 py-2 text-sm font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
        禁用
      </button>
    </div>
  </article>
</template>
