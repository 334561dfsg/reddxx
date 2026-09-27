<script setup>
import { computed, ref } from 'vue'
import { ASSET_ADDRESS_LOG_STATUS, ASSET_ADDRESS_LOG_TYPE, ASSET_COMMON_FILTER_ALL } from '../../../admin/constants/assets'
import { createAssetsAddressLogsMock } from '../../../admin/mock/assets'

const typeTab = ref(ASSET_COMMON_FILTER_ALL)
const coinFilter = ref(ASSET_COMMON_FILTER_ALL)
const statusFilter = ref(ASSET_COMMON_FILTER_ALL)
const keyword = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(5)

const logs = ref(createAssetsAddressLogsMock())

const countByType = computed(() => ({
  deposit: logs.value.filter((i) => i.type === ASSET_ADDRESS_LOG_TYPE.DEPOSIT).length,
  withdraw: logs.value.filter((i) => i.type === ASSET_ADDRESS_LOG_TYPE.WITHDRAW).length,
  collect: logs.value.filter((i) => i.type === ASSET_ADDRESS_LOG_TYPE.COLLECT).length,
  transfer: logs.value.filter((i) => i.type === ASSET_ADDRESS_LOG_TYPE.TRANSFER).length
}))

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return logs.value.filter((item) => {
    const tabOk = typeTab.value === ASSET_COMMON_FILTER_ALL || item.type === typeTab.value
    const coinOk = coinFilter.value === ASSET_COMMON_FILTER_ALL || item.coin === coinFilter.value
    const statusOk = statusFilter.value === ASSET_COMMON_FILTER_ALL || item.status === statusFilter.value
    const kwOk = !kw || `${item.txHash} ${item.address}`.toLowerCase().includes(kw)
    return tabOk && coinOk && statusOk && kwOk
  })
})

const totalPages = computed(() => Math.ceil(filtered.value.length / pageSize.value))
const pagedLogs = computed(() => {
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

const typeText = (type) => ({
  [ASSET_ADDRESS_LOG_TYPE.DEPOSIT]: '充值',
  [ASSET_ADDRESS_LOG_TYPE.WITHDRAW]: '提现',
  [ASSET_ADDRESS_LOG_TYPE.COLLECT]: '归集',
  [ASSET_ADDRESS_LOG_TYPE.TRANSFER]: '转账'
}[type] || '-')
const typeIcon = (type) => ({
  [ASSET_ADDRESS_LOG_TYPE.DEPOSIT]: '↙',
  [ASSET_ADDRESS_LOG_TYPE.WITHDRAW]: '↗',
  [ASSET_ADDRESS_LOG_TYPE.COLLECT]: '⟳',
  [ASSET_ADDRESS_LOG_TYPE.TRANSFER]: '⇄'
}[type] || '·')
const typeColor = (type) => ({
  [ASSET_ADDRESS_LOG_TYPE.DEPOSIT]: 'text-emerald-600',
  [ASSET_ADDRESS_LOG_TYPE.WITHDRAW]: 'text-rose-600',
  [ASSET_ADDRESS_LOG_TYPE.COLLECT]: 'text-blue-600',
  [ASSET_ADDRESS_LOG_TYPE.TRANSFER]: 'text-violet-600'
}[type] || 'text-slate-500')
const amountColor = (amount) => (String(amount).startsWith('+') ? 'text-emerald-600' : 'text-rose-600')
const statusClass = (status) => ({
  [ASSET_ADDRESS_LOG_STATUS.CONFIRMED]: 'bg-emerald-100 text-emerald-700',
  [ASSET_ADDRESS_LOG_STATUS.PENDING]: 'bg-amber-100 text-amber-700',
  [ASSET_ADDRESS_LOG_STATUS.FAILED]: 'bg-rose-100 text-rose-700'
}[status] || 'bg-slate-200 text-slate-600')
const statusText = (status) => ({
  [ASSET_ADDRESS_LOG_STATUS.CONFIRMED]: '已确认',
  [ASSET_ADDRESS_LOG_STATUS.PENDING]: '待确认',
  [ASSET_ADDRESS_LOG_STATUS.FAILED]: '失败'
}[status] || '-')
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">地址日志</h1>
        <p class="mt-1 text-sm text-slate-500">查看所有地址的交易操作日志</p>
      </div>
      <p class="text-sm text-slate-500">
        充值: <span class="text-emerald-600">{{ countByType.deposit }}</span>
        <span class="mx-2">|</span>
        提现: <span class="text-rose-600">{{ countByType.withdraw }}</span>
        <span class="mx-2">|</span>
        归集: <span class="text-blue-600">{{ countByType.collect }}</span>
        <span class="mx-2">|</span>
        转账: <span class="text-violet-600">{{ countByType.transfer }}</span>
      </p>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div class="inline-flex items-center gap-4 text-sm">
          <a-button html-type="button" class="font-medium" :class="typeTab === ASSET_COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="typeTab = ASSET_COMMON_FILTER_ALL; handleFilterChange()">全部</a-button>
          <a-button html-type="button" class="font-medium" :class="typeTab === ASSET_ADDRESS_LOG_TYPE.DEPOSIT ? 'text-blue-600' : 'text-slate-500'" @click="typeTab = ASSET_ADDRESS_LOG_TYPE.DEPOSIT; handleFilterChange()">充值</a-button>
          <a-button html-type="button" class="font-medium" :class="typeTab === ASSET_ADDRESS_LOG_TYPE.WITHDRAW ? 'text-blue-600' : 'text-slate-500'" @click="typeTab = ASSET_ADDRESS_LOG_TYPE.WITHDRAW; handleFilterChange()">提现</a-button>
          <a-button html-type="button" class="font-medium" :class="typeTab === ASSET_ADDRESS_LOG_TYPE.COLLECT ? 'text-blue-600' : 'text-slate-500'" @click="typeTab = ASSET_ADDRESS_LOG_TYPE.COLLECT; handleFilterChange()">归集</a-button>
          <a-button html-type="button" class="font-medium" :class="typeTab === ASSET_ADDRESS_LOG_TYPE.TRANSFER ? 'text-blue-600' : 'text-slate-500'" @click="typeTab = ASSET_ADDRESS_LOG_TYPE.TRANSFER; handleFilterChange()">转账</a-button>
        </div>
        <div class="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:flex-nowrap">
          <a-select v-model:value="coinFilter" class="" @change="handleFilterChange">
            <a-select-option :value="ASSET_COMMON_FILTER_ALL">全部币种</a-select-option>
            <a-select-option value="USDT">USDT</a-select-option>
            <a-select-option value="BTC">BTC</a-select-option>
            <a-select-option value="ETH">ETH</a-select-option>
          </a-select>
          <a-select v-model:value="statusFilter" class="" @change="handleFilterChange">
            <a-select-option :value="ASSET_COMMON_FILTER_ALL">全部状态</a-select-option>
            <a-select-option :value="ASSET_ADDRESS_LOG_STATUS.CONFIRMED">已确认</a-select-option>
            <a-select-option :value="ASSET_ADDRESS_LOG_STATUS.PENDING">待确认</a-select-option>
            <a-select-option :value="ASSET_ADDRESS_LOG_STATUS.FAILED">失败</a-select-option>
          </a-select>
          <a-input v-model:value="keyword" type="text" placeholder="搜索交易哈希或地址..." class="w-full lg:w-72" @input="handleFilterChange" />
        </div>
      </div>

      <div class="overflow-x-auto p-4">
        <a-table  :data-source="pagedLogs" :pagination="false" size="small" :scroll="{ x: 'max-content' }" :row-key="(row) => row.id" :custom-row="(row, index) => ({ class: [&quot;border-b border-slate-100&quot;] })">
<a-table-column key="column-0" ><template #title>类型</template><template #default="{ record: row, index: index }"><div class=" ">
                <span class="font-medium" :class="typeColor(row.type)">{{ typeIcon(row.type) }} {{ typeText(row.type) }}</span>
              </div></template></a-table-column>
<a-table-column key="column-1" ><template #title>币种/网络</template><template #default="{ record: row, index: index }"><div class=" ">
                <p class="font-medium text-slate-800">{{ row.coin }}</p>
                <p class="text-slate-500">{{ row.network }}</p>
              </div></template></a-table-column>
<a-table-column key="column-2" ><template #title>地址</template><template #default="{ record: row, index: index }"><div class="  text-slate-700">{{ row.address }}</div></template></a-table-column>
<a-table-column key="column-3" ><template #title>金额</template><template #default="{ record: row, index: index }"><div class="  font-semibold" :class="amountColor(row.amount)">{{ row.amount }}</div></template></a-table-column>
<a-table-column key="column-4" ><template #title>TxHash</template><template #default="{ record: row, index: index }"><div class="  text-slate-700">{{ row.txHash }}</div></template></a-table-column>
<a-table-column key="column-5" ><template #title>区块/确认数</template><template #default="{ record: row, index: index }"><div class="  text-slate-700">{{ row.block }}</div></template></a-table-column>
<a-table-column key="column-6" ><template #title>状态</template><template #default="{ record: row, index: index }"><div class=" "><span class="rounded-md px-2 py-0.5 text-xs" :class="statusClass(row.status)">{{ statusText(row.status) }}</span></div></template></a-table-column>
<a-table-column key="column-7" ><template #title>时间</template><template #default="{ record: row, index: index }"><div class="  text-slate-700">{{ row.time }}</div></template></a-table-column>
</a-table>
      </div>

      <!-- 分页栏 -->
      <footer v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
        <p class="text-slate-500">共 {{ filtered.length }} 条日志</p>
        <a-pagination  size="small" :current="currentPage" :page-size="pageSize" :total="filtered.length" :show-size-changer="false"  @change="currentPage = $event" />
      </footer>
    </article>
  </section>
</template>
