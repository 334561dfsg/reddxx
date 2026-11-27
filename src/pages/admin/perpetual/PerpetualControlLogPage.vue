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
        <select v-model="contractFilter" class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
          <option value="all">全部合约</option>
          <option value="BTCUSDT">BTCUSDT</option>
          <option value="ETHUSDT">ETHUSDT</option>
          <option value="SOLUSDT">SOLUSDT</option>
        </select>

        <select v-model="actionFilter" class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
          <option value="all">全部动作</option>
          <option value="触发规则">触发规则</option>
          <option value="编辑参数">编辑参数</option>
          <option value="暂停线控">暂停线控</option>
          <option value="新增规则">新增规则</option>
        </select>

        <select v-model="resultFilter" class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none">
          <option value="all">全部结果</option>
          <option value="success">成功</option>
          <option value="failed">失败</option>
        </select>

        <input
          v-model="keyword"
          type="text"
          placeholder="搜索日志ID/规则/操作人..."
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
        />
      </div>
    </article>

    <article class="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[980px] text-left text-sm">
          <thead class="bg-slate-50 text-slate-500">
            <tr>
              <th class="px-4 py-3 font-medium">时间</th>
              <th class="px-4 py-3 font-medium">日志ID</th>
              <th class="px-4 py-3 font-medium">合约</th>
              <th class="px-4 py-3 font-medium">动作</th>
              <th class="px-4 py-3 font-medium">规则/对象</th>
              <th class="px-4 py-3 font-medium">操作人</th>
              <th class="px-4 py-3 font-medium">结果</th>
              <th class="px-4 py-3 font-medium">详情</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in paginatedLogs" :key="log.id" class="border-t border-slate-100 align-top">
              <td class="px-4 py-3 text-slate-600">{{ log.time }}</td>
              <td class="px-4 py-3 font-medium text-slate-900">{{ log.id }}</td>
              <td class="px-4 py-3 text-slate-700">{{ log.contract }}</td>
              <td class="px-4 py-3 text-slate-700">{{ log.action }}</td>
              <td class="px-4 py-3 text-slate-700">{{ log.rule }}</td>
              <td class="px-4 py-3 text-slate-700">{{ log.operator }}</td>
              <td class="px-4 py-3">
                <span class="rounded-full px-2 py-0.5 text-xs font-medium" :class="log.result === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'">
                  {{ log.result === 'success' ? '成功' : '失败' }}
                </span>
              </td>
              <td class="px-4 py-3 text-slate-600">{{ log.detail }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="filteredLogs.length > 0" class="flex items-center justify-between border-t border-slate-200 px-4 py-3">
        <div class="text-sm text-slate-600">
          共 {{ filteredLogs.length }} 条日志 · 第 {{ currentPage }} / {{ totalPages }} 页
        </div>
        <div class="flex items-center gap-3">
          <button 
            type="button" 
            :disabled="currentPage === 1" 
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" 
            @click="prevPage"
          >
            上一页
          </button>
          <button 
            type="button" 
            :disabled="currentPage === totalPages" 
            class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" 
            @click="nextPage"
          >
            下一页
          </button>
        </div>
      </div>

      <p v-if="filteredLogs.length === 0" class="p-8 text-center text-sm text-slate-500">没有符合条件的日志记录</p>
    </article>
  </section>
</template>
