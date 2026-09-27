<script setup>
import { computed, ref, watch } from 'vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import { ASSET_WALLET_STATUS } from '../../../admin/constants/assets'
import { createManualCollectConfigMock } from '../../../admin/mock/assets'

const selectedCoin = ref('USDT')
const selectedNetwork = ref('Ethereum (ERC20)')
const confirmCollect = ref(false)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingCollectData = ref(null)
const mfaLoading = ref(false)

const pageSize = ref(10)
const currentPage = ref(1)
const loading = ref(false)
const loadError = ref('')
const lastLoadedAt = ref('')
const loadRequestId = ref(0)

const { coinOptions, networkOptionsMap, networkMap, walletSource } = createManualCollectConfigMock()

const wallets = ref([])

const currentNetworkOptions = computed(() => networkOptionsMap[selectedCoin.value] || [])
const detail = computed(() => {
  const item = networkMap[`${selectedCoin.value}|${selectedNetwork.value}`]
  if (!item) return { collectAddress: '-', threshold: '-', gasLimit: '-' }
  return {
    collectAddress: item.collectAddress,
    threshold: `${item.threshold} ${selectedCoin.value}`,
    gasLimit: item.gasLimit
  }
})

const total = computed(() => wallets.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const pageStart = computed(() => (currentPage.value - 1) * pageSize.value)
const pagedWallets = computed(() => wallets.value.slice(pageStart.value, pageStart.value + pageSize.value))
const collectableWallets = computed(() => wallets.value.filter((w) => w.status === ASSET_WALLET_STATUS.COLLECTABLE))
const collectablePagedWallets = computed(() => pagedWallets.value.filter((w) => w.status === ASSET_WALLET_STATUS.COLLECTABLE))

const getCollectAmount = (wallet) => {
  if (!wallet || wallet.status !== ASSET_WALLET_STATUS.COLLECTABLE) return 0
  return Number(wallet.balance)
}

const selectedWallets = computed(() => wallets.value.filter((w) => w.checked && w.status === ASSET_WALLET_STATUS.COLLECTABLE))
const selectedCount = computed(() => selectedWallets.value.length)
const selectedTotal = computed(() => selectedWallets.value.reduce((sum, w) => sum + getCollectAmount(w), 0))

const pageAllChecked = computed({
  get: () => collectablePagedWallets.value.length > 0 && collectablePagedWallets.value.every((w) => w.checked),
  set: (val) => {
    collectablePagedWallets.value.forEach((w) => {
      w.checked = Boolean(val)
    })
  }
})

const pageIndeterminate = computed(() => {
  const checkedCount = collectablePagedWallets.value.filter((w) => w.checked).length
  return checkedCount > 0 && checkedCount < collectablePagedWallets.value.length
})

const globalAllChecked = computed({
  get: () => collectableWallets.value.length > 0 && collectableWallets.value.every((w) => w.checked),
  set: (val) => {
    collectableWallets.value.forEach((w) => {
      w.checked = Boolean(val)
    })
  }
})

const goPrev = () => {
  if (currentPage.value > 1) currentPage.value -= 1
}

const goNext = () => {
  if (currentPage.value < totalPages.value) currentPage.value += 1
}

const fmtTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
}

const loadWallets = async () => {
  const key = `${selectedCoin.value}|${selectedNetwork.value}`
  const reqId = ++loadRequestId.value
  loading.value = true
  loadError.value = ''

  try {
    const delay = 800 + Math.floor(Math.random() * 1200)
    await new Promise((resolve) => setTimeout(resolve, delay))

    if (Math.random() < 0.12) throw new Error('网络响应较慢，请重试')
    if (reqId !== loadRequestId.value) return

    const previousChecked = new Map(wallets.value.map((w) => [w.id, w.checked]))
    const source = walletSource[key] || []
    wallets.value = source.map((item) => {
      const prev = previousChecked.has(item.id) ? previousChecked.get(item.id) : item.checked
      const checked = item.status === ASSET_WALLET_STATUS.COLLECTABLE ? Boolean(prev) : false
      return { ...item, checked }
    })
    currentPage.value = 1
    lastLoadedAt.value = fmtTime()
  } catch (err) {
    if (reqId !== loadRequestId.value) return
    loadError.value = err instanceof Error ? err.message : '加载失败'
    wallets.value = []
  } finally {
    if (reqId === loadRequestId.value) loading.value = false
  }
}

watch(
  selectedCoin,
  (coin) => {
    selectedNetwork.value = networkOptionsMap[coin]?.[0] || ''
  },
  { immediate: true }
)

watch(
  [selectedCoin, selectedNetwork],
  () => {
    if (!selectedNetwork.value) return
    loadWallets()
  },
  { immediate: true }
)

watch(pageSize, () => {
  currentPage.value = 1
})

const statusClass = (status) => (status === ASSET_WALLET_STATUS.COLLECTABLE ? 'text-emerald-600' : 'text-amber-500')
const statusText = (status) => (status === ASSET_WALLET_STATUS.COLLECTABLE ? '可归集' : '低于阈值')

// 处理归集操作
const handleCollectClick = () => {
  // 准备归集数据
  const collectData = {
    coin: selectedCoin.value,
    network: selectedNetwork.value,
    wallets: selectedWallets.value.map(w => ({
      id: w.id,
      address: w.address,
      balance: getCollectAmount(w)
    })),
    totalAmount: selectedTotal.value,
    count: selectedCount.value
  }
  
  // 保存待提交的数据，显示 MFA 验证弹窗
  pendingCollectData.value = collectData
  showMfaModal.value = true
}

// 处理 MFA 验证
const handleMfaVerify = async (code) => {
  mfaLoading.value = true
  
  try {
    // TODO: 这里调用后端 API 验证 MFA 验证码
    // const response = await api.verifyMFA(code)
    
    // 模拟 API 调用延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 验证成功后执行实际的归集操作
    if (pendingCollectData.value) {
      console.log('执行归集操作:', pendingCollectData.value)
      
      // TODO: 调用后端 API 执行归集
      // await api.executeCollect(pendingCollectData.value)
      
      alert(`成功归集 ${pendingCollectData.value.totalAmount.toFixed(4)} ${pendingCollectData.value.coin}，共 ${pendingCollectData.value.count} 个地址`)
      
      // 重置选中状态
      wallets.value.forEach(w => {
        if (w.checked) w.checked = false
      })
      
      pendingCollectData.value = null
      showMfaModal.value = false
      confirmCollect.value = false
      
      // 重新加载钱包列表
      loadWallets()
    }
  } catch (error) {
    alert('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="text-2xl font-semibold text-slate-900">手动归集</h1>
      <p class="mt-1 text-sm text-slate-500">选择币种和网络，手动执行资金归集操作</p>
    </header>

    <div class="grid gap-4 xl:grid-cols-[1fr,2fr]">
      <div class="space-y-4">
        <article class="rounded-xl border border-slate-200 bg-white">
          <div class="border-b border-slate-200 px-4 py-3">
            <h3 class="text-lg font-semibold text-slate-900">归集配置</h3>
          </div>
          <div class="space-y-4 p-4">
            <label class="block space-y-1">
              <span class="text-sm text-slate-600">选择币种</span>
              <a-select v-model:value="selectedCoin" class="w-full">
                <a-select-option v-for="coin in coinOptions" :key="coin">{{ coin }}</a-select-option>
              </a-select>
            </label>
            <label class="block space-y-1">
              <span class="text-sm text-slate-600">选择网络</span>
              <a-select v-model:value="selectedNetwork" class="w-full">
                <a-select-option v-for="network in currentNetworkOptions" :key="network">{{ network }}</a-select-option>
              </a-select>
            </label>

            <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <p class="flex justify-between gap-4"><span>归集地址</span><span class="font-medium">{{ detail.collectAddress }}</span></p>
              <p class="mt-2 flex justify-between gap-4"><span>最小归集数量</span><span class="font-medium">{{ detail.threshold }}</span></p>
              <p class="mt-2 flex justify-between gap-4"><span>Gas 限制</span><span class="font-medium">{{ detail.gasLimit }}</span></p>
            </div>

            <div class="space-y-2">
              <a-button html-type="button" class="w-full border border-slate-200 text-sm" :class="loading ? 'bg-slate-100 text-slate-500' : 'bg-white text-slate-700 hover:bg-slate-50'" :disabled="loading" @click="loadWallets">
                {{ loading ? '加载中...' : '加载钱包余额' }}
              </a-button>
              <p v-if="lastLoadedAt" class="text-xs text-slate-500">最近加载时间：{{ lastLoadedAt }}</p>
              <p v-if="loadError" class="text-xs text-rose-600">{{ loadError }}，请重试。</p>
            </div>
          </div>
        </article>

        <article class="rounded-xl border border-slate-200 bg-white">
          <div class="border-b border-slate-200 px-4 py-3">
            <h3 class="text-lg font-semibold text-slate-900">归集金额</h3>
          </div>
          <div class="space-y-3 p-4">
            <label class="inline-flex items-center gap-2 text-sm">
              <a-checkbox v-model:checked="confirmCollect" class="w-4" />
              我已确认归集操作
            </label>
            <p class="text-xs text-slate-500">请确认地址与金额无误后再执行归集。低于阈值地址不可归集。</p>
            <div class="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
              <p class="flex items-center justify-between"><span class="text-slate-600">已选地址</span><span>{{ selectedCount }} 个</span></p>
              <p class="mt-2 flex items-center justify-between"><span class="text-slate-600">归集总额</span><span class="font-semibold text-blue-700">{{ selectedTotal.toFixed(4) }} {{ selectedCoin }}</span></p>
            </div>
            <a-button html-type="button" class="w-full bg-blue-600 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300" :disabled="selectedCount === 0 || selectedTotal <= 0 || loading || !confirmCollect" @click="handleCollectClick" type="primary">
              开始归集
            </a-button>
          </div>
        </article>
      </div>

      <article class="rounded-xl border border-slate-200 bg-white">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <h3 class="text-lg font-semibold text-slate-900">钱包列表 ({{ total }})</h3>
          <div class="flex items-center gap-3 text-sm">
            <label class="inline-flex items-center gap-1.5">
              <a-checkbox v-model:checked="globalAllChecked" class="w-4" /> 全选
            </label>
            <label class="inline-flex items-center gap-1.5">
              每页
              <a-select v-model:value="pageSize" class="">
                <a-select-option :value="10">10</a-select-option>
                <a-select-option :value="20">20</a-select-option>
                <a-select-option :value="50">50</a-select-option>
              </a-select>
            </label>
          </div>
        </div>

        <div v-if="loading" class="space-y-2 p-4">
          <div v-for="i in 6" :key="i" class="h-14 animate-pulse rounded-lg bg-slate-100"></div>
        </div>

        <div v-else-if="loadError" class="p-8 text-center text-sm text-slate-500">
          <p>钱包数据加载失败</p>
          <a-button html-type="button" class="mt-3 border border-slate-300 text-xs" @click="loadWallets">重试加载</a-button>
        </div>

        <template v-else>
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
            <label class="inline-flex items-center gap-1.5">
              <a-checkbox :checked="pageAllChecked" :indeterminate="pageIndeterminate" class="w-4" :disabled="collectablePagedWallets.length === 0" @change="pageAllChecked = !pageAllChecked" />
              仅当前页全选
            </label>
            <p>第 {{ currentPage }} / {{ totalPages }} 页</p>
          </div>

          <div class="divide-y divide-slate-200">
            <article v-for="wallet in pagedWallets" :key="wallet.id" class="flex items-center justify-between gap-3 px-4 py-3">
              <div class="flex items-center gap-3">
                <a-checkbox v-model:checked="wallet.checked" :disabled="wallet.status !== ASSET_WALLET_STATUS.COLLECTABLE" class="w-4 disabled:cursor-not-allowed disabled:opacity-50" />
                <div>
                  <p class="font-medium text-slate-800">{{ wallet.name }}</p>
                  <p class="text-sm text-slate-600">{{ wallet.address }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-lg font-semibold text-slate-900">{{ wallet.balance.toLocaleString() }} {{ selectedCoin }}</p>
                <p v-if="wallet.status === ASSET_WALLET_STATUS.COLLECTABLE" class="text-xs text-blue-600">预计归集: {{ getCollectAmount(wallet).toFixed(4) }} {{ selectedCoin }}</p>
                <p class="text-xs" :class="statusClass(wallet.status)">{{ statusText(wallet.status) }}</p>
              </div>
            </article>
          </div>

          <div class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <p class="text-slate-500">共 {{ total }} 条地址</p>
            <a-pagination  size="small" :current="currentPage" :page-size="pageSize" :total="total" :show-size-changer="false"  @change="currentPage = $event" />
          </div>
        </template>
      </article>
    </div>
  </section>

  <!-- MFA 验证弹窗 -->
  <MfaVerificationModal
    v-model:open="showMfaModal"
    :loading="mfaLoading"
    title="资金归集验证"
    description="执行资金归集属于敏感操作，请输入 MFA 验证码"
    @verify="handleMfaVerify"
    @cancel="pendingCollectData = null"
  />
</template>
