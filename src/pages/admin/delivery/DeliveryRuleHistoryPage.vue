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
          <a-input
            v-model:value="keyword"
            type="text"
            placeholder="用户名、用户ID"
            class="ant-input !py-1.5"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">规则</label>
          <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="ruleFilter" class="">
            <a-select-option value="all">全部规则</a-select-option>
            <a-select-option v-for="rule in uniqueRules" :key="rule" :value="rule">{{ rule }}</a-select-option>
          </a-select>
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1.5">结果</label>
          <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="resultFilter" class="">
            <a-select-option value="all">全部结果</a-select-option>
            <a-select-option value="success">成功</a-select-option>
            <a-select-option value="failed">失败</a-select-option>
          </a-select>
        </div>
      </div>
    </div>

    <!-- 历史记录表格 -->
    <article class="pro-card">
      <div class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="paginatedHistory" :row-key="(hit) => hit.id" :scroll="{ x: 'max-content' }">
<a-table-column key="column-0" :custom-cell="(hit, rowIndex) => ({ class: [&quot;whitespace-nowrap text-slate-600 text-sm&quot;] })">
<template #title>时间</template>
<template #default="{ record: hit, index: rowIndex }">{{ hit.triggerTime }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(hit, rowIndex) => ({ class: [&quot;text-sm font-medium text-slate-900&quot;] })">
<template #title>规则</template>
<template #default="{ record: hit, index: rowIndex }">{{ hit.ruleName }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(hit, rowIndex) => ({ class: [&quot;text-sm&quot;] })">
<template #title>用户</template>
<template #default="{ record: hit, index: rowIndex }">
                <div class="font-medium text-slate-900">{{ hit.userName }}</div>
                <div class="text-slate-500">{{ hit.userId }}</div>
              </template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(hit, rowIndex) => ({ class: [&quot;text-sm text-slate-600&quot;] })">
<template #title>触发值</template>
<template #default="{ record: hit, index: rowIndex }">{{ hit.triggerValue }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(hit, rowIndex) => ({ class: [&quot;text-sm text-slate-600&quot;] })">
<template #title>执行动作</template>
<template #default="{ record: hit, index: rowIndex }">{{ hit.action }}</template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(hit, rowIndex) => ({ class: [&quot;text-sm text-slate-600&quot;] })">
<template #title>操作人</template>
<template #default="{ record: hit, index: rowIndex }">{{ hit.operator }}</template>
</a-table-column>
<a-table-column key="column-6" align="center" :custom-cell="(hit, rowIndex) => ({ class: [&quot;text-center&quot;] })">
<template #title>结果</template>
<template #default="{ record: hit, index: rowIndex }">
                <span
                  class="rounded-md px-2 py-1 text-xs font-medium"
                  :class="hit.result === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'"
                >
                  {{ hit.result === 'success' ? '成功' : '失败' }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-7" align="center" :custom-cell="(hit, rowIndex) => ({ class: [&quot;text-center text-sm font-semibold text-slate-900&quot;] })">
<template #title>影响持仓</template>
<template #default="{ record: hit, index: rowIndex }">
                {{ hit.affectedPositions }}
              </template>
</a-table-column>
<template #emptyText>
                暂无符合条件的数据
              </template>
</a-table>
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 px-6 py-4">
        <p class="text-sm text-slate-600">
          共 <span class="font-medium">{{ filteredHistory.length }}</span> 条，第
          <span class="font-medium">{{ pagination.currentPage }}</span> / <span class="font-medium">{{ totalPages }}</span> 页
        </p>
        <div class="flex items-center gap-2">
          <a-pagination size="small" :current="pagination.currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="pagination.currentPage = $event" />
        </div>
      </div>
    </article>
  </section>
</template>
