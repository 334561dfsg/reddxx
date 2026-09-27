<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { createPerpetualControlLogsMock } from '../../../admin/mock/perpetualControl'

const contractFilter = ref('all')
const actionFilter = ref('all')
const resultFilter = ref('all')
const keyword = ref('')

const logs = ref([])
const currentPage = ref(1)
const pageSize = ref(10)

onMounted(() => {
  logs.value = createPerpetualControlLogsMock()
})

// 监听筛选条件变化，重置页码
watch([contractFilter, actionFilter, resultFilter, keyword], () => {
  currentPage.value = 1
})

const filteredLogs = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return logs.value.filter((log) => {
    const matchContract = contractFilter.value === 'all' || log.contract === contractFilter.value
    const matchAction = actionFilter.value === 'all' || log.action === actionFilter.value
    const matchResult = resultFilter.value === 'all' || log.result === resultFilter.value
    const matchKeyword = !kw || [log.id, log.rule, log.operator, log.detail].join(' ').toLowerCase().includes(kw)
    return matchContract && matchAction && matchResult && matchKeyword
  })
})

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredLogs.value.slice(start, end)
})

const totalPages = computed(() => Math.ceil(filteredLogs.value.length / pageSize.value))

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">合约线控日志</h1>
      <p class="mt-1 text-sm text-slate-500">审计线控策略的新增、编辑、触发、暂停等关键操作</p>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="contractFilter" class="">
          <a-select-option value="all">全部合约</a-select-option>
          <a-select-option value="BTCUSDT">BTCUSDT</a-select-option>
          <a-select-option value="ETHUSDT">ETHUSDT</a-select-option>
          <a-select-option value="SOLUSDT">SOLUSDT</a-select-option>
        </a-select>

        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="actionFilter" class="">
          <a-select-option value="all">全部动作</a-select-option>
          <a-select-option value="触发规则">触发规则</a-select-option>
          <a-select-option value="编辑参数">编辑参数</a-select-option>
          <a-select-option value="暂停线控">暂停线控</a-select-option>
          <a-select-option value="新增规则">新增规则</a-select-option>
        </a-select>

        <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="resultFilter" class="">
          <a-select-option value="all">全部结果</a-select-option>
          <a-select-option value="success">成功</a-select-option>
          <a-select-option value="failed">失败</a-select-option>
        </a-select>

        <a-input
          v-model:value="keyword"
          type="text"
          placeholder="搜索日志ID/规则/操作人..."
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
      </div>
    </article>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <a-table  size="small" :pagination="false" :data-source="paginatedLogs" :row-key="(log) => log.id" :scroll="{ x: 'max-content' }" :custom-row="(log, rowIndex) => ({ class: [&quot;border-t border-slate-100 align-top&quot;] })">
<a-table-column key="column-0" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-600&quot;] })">
<template #title>时间</template>
<template #default="{ record: log, index: rowIndex }">{{ log.time }}</template>
</a-table-column>
<a-table-column key="column-1" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3 font-medium text-slate-900&quot;] })">
<template #title>日志ID</template>
<template #default="{ record: log, index: rowIndex }">{{ log.id }}</template>
</a-table-column>
<a-table-column key="column-2" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>合约</template>
<template #default="{ record: log, index: rowIndex }">{{ log.contract }}</template>
</a-table-column>
<a-table-column key="column-3" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>动作</template>
<template #default="{ record: log, index: rowIndex }">{{ log.action }}</template>
</a-table-column>
<a-table-column key="column-4" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>规则/对象</template>
<template #default="{ record: log, index: rowIndex }">{{ log.rule }}</template>
</a-table-column>
<a-table-column key="column-5" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-700&quot;] })">
<template #title>操作人</template>
<template #default="{ record: log, index: rowIndex }">{{ log.operator }}</template>
</a-table-column>
<a-table-column key="column-6" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3&quot;] })">
<template #title>结果</template>
<template #default="{ record: log, index: rowIndex }">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="log.result === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
                  {{ log.result === 'success' ? '成功' : '失败' }}
                </span>
              </template>
</a-table-column>
<a-table-column key="column-7" :custom-cell="(log, rowIndex) => ({ class: [&quot;px-4 py-3 text-slate-600&quot;] })">
<template #title>详情</template>
<template #default="{ record: log, index: rowIndex }">{{ log.detail }}</template>
</a-table-column>
</a-table>
      </div>

      <!-- 分页 -->
      <div v-if="filteredLogs.length > 0" class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div class="text-sm text-slate-600">
          共 {{ filteredLogs.length }} 条日志 · 第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="flex items-center gap-3">
          <a-pagination size="small" :current="currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="currentPage = $event" />
        </div>
      </div>

      <p v-if="filteredLogs.length === 0" class="p-8 text-center text-sm text-slate-500">没有符合条件的日志记录</p>
    </article>
  </section>
</template>
