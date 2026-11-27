<script setup>
import { ref, computed } from 'vue'
import { createRuleHitHistoryMock } from '../../../admin/mock/deliveryControl'

const hitHistory = ref(createRuleHitHistoryMock())
const keyword = ref('')
const ruleFilter = ref('all')
const resultFilter = ref('all')
const pagination = ref({ currentPage: 1, pageSize: 10 })

// 获取唯一的规则列表
const uniqueRules = [...new Set(hitHistory.value.map(h => h.ruleName))]

const filteredHistory = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return hitHistory.value.filter(h => {
    const matchKw = !kw || `${h.userName} ${h.userId}`.toLowerCase().includes(kw)
    const matchRule = ruleFilter.value === 'all' || h.ruleName === ruleFilter.value
    const matchResult = resultFilter.value === 'all' || h.result === resultFilter.value
    return matchKw && matchRule && matchResult
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredHistory.value.length / pagination.value.pageSize)))
const paginatedHistory = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredHistory.value.slice(start, end)
})

const prevPage = () => {
  if (pagination.value.currentPage > 1) pagination.value.currentPage--
}
const nextPage = () => {
  if (pagination.value.currentPage < totalPages.value) pagination.value.currentPage++
}
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">规则触发历史</h1>
      <p class="mt-1 text-sm text-slate-500">查看自动化规则的触发记录和执行结果</p>
    </header>

    <!-- 筛选栏 -->
    <div class="pro-card p-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">关键词</label>
          <input
            v-model="keyword"
            type="text"
            placeholder="用户名、用户ID"
            class="ant-input !py-1.5"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">规则</label>
          <select v-model="ruleFilter" class="ant-select !py-1.5">
            <option value="all">全部规则</option>
            <option v-for="rule in uniqueRules" :key="rule" :value="rule">{{ rule }}</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">结果</label>
          <select v-model="resultFilter" class="ant-select !py-1.5">
            <option value="all">全部结果</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 历史记录表格 -->
    <article class="pro-card">
      <div class="overflow-x-auto">
        <table class="ant-table">
          <thead class="ant-table-thead">
            <tr>
              <th>时间</th>
              <th>规则</th>
              <th>用户</th>
              <th>触发值</th>
              <th>执行动作</th>
              <th>操作人</th>
              <th class="text-center">结果</th>
              <th class="text-center">影响持仓</th>
            </tr>
          </thead>
          <tbody class="ant-table-tbody">
            <tr v-for="hit in paginatedHistory" :key="hit.id">
              <td class="whitespace-nowrap text-slate-600 text-sm">{{ hit.triggerTime }}</td>
              <td class="text-sm font-medium text-slate-900">{{ hit.ruleName }}</td>
              <td class="text-sm">
                <div class="font-medium text-slate-900">{{ hit.userName }}</div>
                <div class="text-slate-500">{{ hit.userId }}</div>
              </td>
              <td class="text-sm text-slate-600">{{ hit.triggerValue }}</td>
              <td class="text-sm text-slate-600">{{ hit.action }}</td>
              <td class="text-sm text-slate-600">{{ hit.operator }}</td>
              <td class="text-center">
                <span
                  class="rounded-md px-2 py-1 text-xs font-medium"
                  :class="hit.result === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                >
                  {{ hit.result === 'success' ? '成功' : '失败' }}
                </span>
              </td>
              <td class="text-center text-sm font-semibold text-slate-900">
                {{ hit.affectedPositions }}
              </td>
            </tr>
            <tr v-if="paginatedHistory.length === 0">
              <td colspan="8" class="text-center text-sm text-slate-500 py-10">
                暂无符合条件的数据
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <p class="text-sm text-slate-600">
          共 <span class="font-medium">{{ filteredHistory.length }}</span> 条，第
          <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页
        </p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="ant-btn !h-8 !px-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.currentPage === 1"
            @click="prevPage"
          >
            上一页
          </button>
          <div class="flex items-center gap-1">
            <button
              v-for="p in totalPages"
              :key="p"
              type="button"
              class="ant-btn !h-8 !w-8 !p-0 !text-xs"
              :class="pagination.currentPage === p ? 'ant-btn-primary' : ''"
              @click="pagination.currentPage = p"
            >
              {{ p }}
            </button>
          </div>
          <button
            type="button"
            class="ant-btn !h-8 !px-3 !text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="pagination.currentPage === totalPages"
            @click="nextPage"
          >
            下一页
          </button>
        </div>
      </div>
    </article>
  </section>
</template>
