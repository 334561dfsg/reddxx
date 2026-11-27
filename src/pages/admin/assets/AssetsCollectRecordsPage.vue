<script setup>
import { computed, ref } from 'vue'
import { ASSET_COLLECT_MODE, ASSET_COLLECT_RECORD_STATUS, ASSET_COMMON_FILTER_ALL } from '../../../admin/constants/assets'
import { createAssetsCollectRecordsMock } from '../../../admin/mock/assets'

const statusTab = ref(ASSET_COMMON_FILTER_ALL)
const statusFilter = ref(ASSET_COMMON_FILTER_ALL)
const coinFilter = ref(ASSET_COMMON_FILTER_ALL)
const keyword = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(5)

const records = ref(createAssetsCollectRecordsMock())

const relatedPageSize = 5
const relatedState = ref({})

const ensureRelatedState = (recordId) => {
  if (!relatedState.value[recordId]) {
    relatedState.value[recordId] = { expanded: false, page: 1 }
  }
  return relatedState.value[recordId]
}

const isExpanded = (recordId) => ensureRelatedState(recordId).expanded
const toggleRelated = (recordId) => {
  const state = ensureRelatedState(recordId)
  state.expanded = !state.expanded
  if (!state.expanded) state.page = 1
}

const relatedTotalPages = (record) => Math.max(1, Math.ceil(record.related.length / relatedPageSize))
const relatedPage = (recordId) => ensureRelatedState(recordId).page
const relatedItems = (record) => {
  const state = ensureRelatedState(record.id)
  const page = state.expanded ? state.page : 1
  const size = state.expanded ? relatedPageSize : 3
  const start = (page - 1) * size
  return record.related.slice(start, start + size)
}

const nextRelatedPage = (record) => {
  const state = ensureRelatedState(record.id)
  const totalPages = relatedTotalPages(record)
  if (state.page < totalPages) state.page += 1
}

const prevRelatedPage = (record) => {
  const state = ensureRelatedState(record.id)
  if (state.page > 1) state.page -= 1
}

const stat = computed(() => ({
  pending: records.value.filter((r) => r.status === ASSET_COLLECT_RECORD_STATUS.PENDING).length,
  processing: records.value.filter((r) => r.status === ASSET_COLLECT_RECORD_STATUS.PROCESSING).length,
  done: records.value.filter((r) => r.status === ASSET_COLLECT_RECORD_STATUS.DONE).length,
  failed: records.value.filter((r) => r.status === ASSET_COLLECT_RECORD_STATUS.FAILED).length
}))

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return records.value.filter((r) => {
    const tabOk = statusTab.value === ASSET_COMMON_FILTER_ALL || r.status === statusTab.value
    const filterOk = statusFilter.value === ASSET_COMMON_FILTER_ALL || r.status === statusFilter.value
    const coinOk = coinFilter.value === ASSET_COMMON_FILTER_ALL || r.coin === coinFilter.value
    const kwOk = !kw || `${r.txHash} ${r.from} ${r.to}`.toLowerCase().includes(kw)
    return tabOk && filterOk && coinOk && kwOk
  })
})

const totalPages = computed(() => Math.ceil(filtered.value.length / pageSize.value))
const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const goPrev = () => {
  if (currentPage.value > 1) currentPage.value--
}
const goNext = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

// 当搜索或筛选状态改变时，重置页码
const handleFilterChange = () => {
  currentPage.value = 1
}

const badgeClass = (status) => ({
  [ASSET_COLLECT_RECORD_STATUS.DONE]: 'bg-emerald-100 text-emerald-700',
  [ASSET_COLLECT_RECORD_STATUS.PROCESSING]: 'bg-blue-100 text-blue-700',
  [ASSET_COLLECT_RECORD_STATUS.PENDING]: 'bg-amber-100 text-amber-700',
  [ASSET_COLLECT_RECORD_STATUS.FAILED]: 'bg-rose-100 text-rose-700'
}[status] || 'bg-slate-200 text-slate-600')

const modeClass = (mode) => (mode === ASSET_COLLECT_MODE.AUTO ? 'bg-violet-100 text-violet-700' : 'bg-orange-100 text-orange-700')
const statusText = (status) => ({
  [ASSET_COLLECT_RECORD_STATUS.DONE]: '已完成',
  [ASSET_COLLECT_RECORD_STATUS.PROCESSING]: '处理中',
  [ASSET_COLLECT_RECORD_STATUS.PENDING]: '待处理',
  [ASSET_COLLECT_RECORD_STATUS.FAILED]: '失败'
}[status] || '未知')
const modeText = (mode) => (mode === ASSET_COLLECT_MODE.AUTO ? '自动' : '手动')
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">归集记录</h1>
        <p class="mt-1 text-sm text-slate-500">查看所有资金归集的交易记录</p>
      </div>
      <p class="text-sm text-slate-500">
        待处理: <span class="text-amber-600">{{ stat.pending }}</span>
        <span class="mx-2">|</span>
        处理中: <span class="text-blue-600">{{ stat.processing }}</span>
        <span class="mx-2">|</span>
        已完成: <span class="text-emerald-600">{{ stat.done }}</span>
        <span class="mx-2">|</span>
        失败: <span class="text-rose-600">{{ stat.failed }}</span>
      </p>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div class="inline-flex items-center gap-4 text-sm">
          <button type="button" class="font-medium" :class="statusTab === ASSET_COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_COMMON_FILTER_ALL; handleFilterChange()">全部</button>
          <button type="button" class="font-medium" :class="statusTab === ASSET_COLLECT_RECORD_STATUS.PENDING ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_COLLECT_RECORD_STATUS.PENDING; handleFilterChange()">待处理</button>
          <button type="button" class="font-medium" :class="statusTab === ASSET_COLLECT_RECORD_STATUS.PROCESSING ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_COLLECT_RECORD_STATUS.PROCESSING; handleFilterChange()">处理中</button>
          <button type="button" class="font-medium" :class="statusTab === ASSET_COLLECT_RECORD_STATUS.DONE ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_COLLECT_RECORD_STATUS.DONE; handleFilterChange()">已完成</button>
          <button type="button" class="font-medium" :class="statusTab === ASSET_COLLECT_RECORD_STATUS.FAILED ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_COLLECT_RECORD_STATUS.FAILED; handleFilterChange()">失败</button>
        </div>
        <div class="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
          <select v-model="statusFilter" class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" @change="handleFilterChange">
            <option :value="ASSET_COMMON_FILTER_ALL">全部状态</option>
            <option :value="ASSET_COLLECT_RECORD_STATUS.PENDING">待处理</option>
            <option :value="ASSET_COLLECT_RECORD_STATUS.PROCESSING">处理中</option>
            <option :value="ASSET_COLLECT_RECORD_STATUS.DONE">已完成</option>
            <option :value="ASSET_COLLECT_RECORD_STATUS.FAILED">失败</option>
          </select>
          <select v-model="coinFilter" class="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm" @change="handleFilterChange">
            <option :value="ASSET_COMMON_FILTER_ALL">全部币种</option>
            <option value="USDT">USDT</option>
            <option value="BTC">BTC</option>
          </select>
          <input
            v-model="keyword"
            type="text"
            placeholder="搜索交易哈希或地址..."
            class="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm lg:w-72"
            @input="handleFilterChange"
          />
        </div>
      </div>

      <div class="space-y-3 p-4">
        <article v-for="record in pagedRecords" :key="record.id" class="rounded-xl border border-slate-200 bg-white p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-3xl font-semibold text-slate-900">{{ record.coin }}</h3>
                <span class="text-xl text-slate-500">{{ record.network }}</span>
                <span class="rounded-md px-2 py-0.5 text-xs" :class="modeClass(record.mode)">{{ modeText(record.mode) }}</span>
                <span class="rounded-md px-2 py-0.5 text-xs" :class="badgeClass(record.status)">{{ statusText(record.status) }}</span>
              </div>
              <div class="mt-3 grid gap-3 md:grid-cols-2 text-sm text-slate-600">
                <p>发起地址<br /><span class="text-base font-medium text-slate-800">{{ record.from }}</span></p>
                <p>归集地址<br /><span class="text-base font-medium text-slate-800">{{ record.to }}</span></p>
              </div>
              <p class="mt-3 text-sm text-slate-500">TxHash: {{ record.txHash }}</p>
            </div>
            <div class="text-right">
              <p class="text-3xl font-semibold text-slate-900">{{ record.amount.toLocaleString() }} {{ record.coin }}</p>
              <p class="text-sm text-slate-500">手续费: {{ record.fee }} {{ record.coin }}</p>
              <p class="mt-4 text-sm text-slate-500">{{ record.createdAt }}<br /><span class="text-emerald-600">{{ record.finishedAt === '-' ? '-' : `完成于 ${record.finishedAt}` }}</span></p>
            </div>
          </div>

          <div class="mt-4 border-t border-slate-200 pt-3">
            <div class="flex items-center justify-between gap-2">
              <p class="text-sm font-medium text-slate-700">关联地址 ({{ record.related.length }})</p>
              <button
                v-if="record.related.length > 3"
                type="button"
                class="text-xs text-blue-600"
                @click="toggleRelated(record.id)"
              >
                {{ isExpanded(record.id) ? '收起' : `查看更多 (${record.related.length - 3})` }}
              </button>
            </div>
            <div class="mt-2 space-y-1">
              <div v-for="(item, idx) in relatedItems(record)" :key="`${record.id}-${idx}`" class="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span class="text-slate-700">{{ item.address }}</span>
                <div class="flex items-center gap-3">
                  <span class="font-medium text-slate-900">{{ item.amount.toLocaleString() }} {{ record.coin }}</span>
                  <span class="rounded-md px-2 py-0.5 text-xs" :class="badgeClass(item.status)">{{ statusText(item.status) }}</span>
                </div>
              </div>
            </div>
            <div v-if="isExpanded(record.id) && relatedTotalPages(record) > 1" class="mt-2 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                class="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                :disabled="relatedPage(record.id) === 1"
                @click="prevRelatedPage(record)"
              >
                上一页
              </button>
              <span class="text-slate-500">{{ relatedPage(record.id) }} / {{ relatedTotalPages(record) }}</span>
              <button
                type="button"
                class="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
                :disabled="relatedPage(record.id) === relatedTotalPages(record)"
                @click="nextRelatedPage(record)"
              >
                下一页
              </button>
            </div>
          </div>
        </article>

        <div v-if="filtered.length === 0" class="p-8 text-center text-sm text-slate-500">
          未找到匹配的归集记录
        </div>
      </div>

      <!-- 分页栏 -->
      <footer v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
        <p class="text-slate-500">共 {{ filtered.length }} 条记录</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="currentPage === 1"
            @click="goPrev"
          >
            上一页
          </button>
          <span class="text-xs font-medium text-slate-600">{{ currentPage }} / {{ totalPages }}</span>
          <button
            type="button"
            class="rounded border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="currentPage === totalPages"
            @click="goNext"
          >
            下一页
          </button>
        </div>
      </footer>
    </article>
  </section>
</template>
