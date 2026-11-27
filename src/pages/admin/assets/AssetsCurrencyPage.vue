<script setup>
import { computed, reactive, ref, watch } from 'vue'
import CurrencyTypeSelect from '../../../admin/components/CurrencyTypeSelect.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import { ASSET_COMMON_FILTER_ALL, ASSET_CURRENCY_TYPE, ASSET_MODAL_TAB, ASSET_STATUS } from '../../../admin/constants/assets'
import { createAssetsCoinsMock } from '../../../admin/mock/assets'

const statusTab = ref(ASSET_COMMON_FILTER_ALL)
const searchDraft = ref('')
const currencyTypeDraft = ref('all')
const depositSupportDraft = ref('all')
const withdrawSupportDraft = ref('all')
const searchApplied = ref('')
const currencyTypeApplied = ref('all')
const depositSupportApplied = ref('all')
const withdrawSupportApplied = ref('all')
const showEditModal = ref(false)
const editingCoinId = ref('')
const modalTab = ref(ASSET_MODAL_TAB.BASIC)
const activeNetworkId = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(5)

// MFA 验证相关
const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)

const coins = ref(createAssetsCoinsMock())

const normalizeCurrencyType = (value) => {
  if (value === ASSET_CURRENCY_TYPE.VIRTUAL || value === ASSET_CURRENCY_TYPE.METAL || value === ASSET_CURRENCY_TYPE.FIAT) return value
  if (value === 'onchain') return ASSET_CURRENCY_TYPE.VIRTUAL
  if (value === 'offchain') return ASSET_CURRENCY_TYPE.FIAT
  return ASSET_CURRENCY_TYPE.VIRTUAL
}

const isNonVirtualType = (value) => normalizeCurrencyType(value) !== ASSET_CURRENCY_TYPE.VIRTUAL

const currencyTypeLabel = (value) => {
  const type = normalizeCurrencyType(value)
  if (type === ASSET_CURRENCY_TYPE.VIRTUAL) return '虚拟币'
  if (type === ASSET_CURRENCY_TYPE.METAL) return '贵金属'
  if (type === ASSET_CURRENCY_TYPE.FIAT) return '法币'
  return String(type || '')
}

const coinIconFallback = (symbol) => String(symbol || '?').slice(0, 1).toUpperCase()

const applySearch = () => {
  searchApplied.value = searchDraft.value
  currencyTypeApplied.value = currencyTypeDraft.value
  depositSupportApplied.value = depositSupportDraft.value
  withdrawSupportApplied.value = withdrawSupportDraft.value
  currentPage.value = 1
}

const resetSearch = () => {
  currencyTypeDraft.value = 'all'
  depositSupportDraft.value = 'all'
  withdrawSupportDraft.value = 'all'
  searchDraft.value = ''
  applySearch()
}

const form = reactive({
  type: ASSET_CURRENCY_TYPE.VIRTUAL,
  name: '',
  symbol: '',
  isQuoteCurrency: false,
  canDeposit: true,
  canWithdraw: true,
  precision: 6,
  status: ASSET_STATUS.ENABLED,
  autoCollect: true,
  networks: []
})

const isOffchain = computed(() => isNonVirtualType(form.type))

const typeCardClass = (type) =>
  form.type === type
    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20'
    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'

watch(
  () => form.type,
  (nextType) => {
    if (isNonVirtualType(nextType)) {
      form.autoCollect = false
      form.networks = []
      activeNetworkId.value = ''
      if (modalTab.value !== ASSET_MODAL_TAB.BASIC) modalTab.value = ASSET_MODAL_TAB.BASIC
      return
    }

    if (!form.networks.length) {
      const id = `nw-${Date.now()}`
      form.networks = [{ id, name: '', contract: '', collectAddress: '', threshold: 100, intervalMin: 60, gasLimit: 60000, status: ASSET_STATUS.ENABLED }]
      activeNetworkId.value = id
    }
  }
)

const filteredCoins = computed(() => {
  const kw = searchApplied.value.trim().toLowerCase()
  return coins.value.filter((coin) => {
    const hitStatus = statusTab.value === ASSET_COMMON_FILTER_ALL || coin.status === statusTab.value
    const hitKeyword = !kw || `${coin.name} ${coin.symbol}`.toLowerCase().includes(kw)
    const hitType = currencyTypeApplied.value === 'all' || normalizeCurrencyType(coin.type) === currencyTypeApplied.value
    const hitDeposit =
      depositSupportApplied.value === 'all' || Boolean(coin.canDeposit) === (depositSupportApplied.value === 'enabled')
    const hitWithdraw =
      withdrawSupportApplied.value === 'all' || Boolean(coin.canWithdraw) === (withdrawSupportApplied.value === 'enabled')
    return hitStatus && hitKeyword && hitType && hitDeposit && hitWithdraw
  })
})

const totalPages = computed(() => Math.ceil(filteredCoins.value.length / pageSize.value))
const pagedCoins = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredCoins.value.slice(start, start + pageSize.value)
})

const goPrev = () => {
  if (currentPage.value > 1) currentPage.value--
}
const goNext = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

watch([statusTab, searchApplied, currencyTypeApplied, depositSupportApplied, withdrawSupportApplied], () => {
  currentPage.value = 1
})

const enabledCount = computed(() => coins.value.filter((c) => c.status === ASSET_STATUS.ENABLED).length)

const cloneCoinToForm = (coin) => {
  form.type = normalizeCurrencyType(coin.type)
  form.name = coin.name
  form.symbol = coin.symbol
  form.isQuoteCurrency = Boolean(coin.isQuoteCurrency)
  form.canDeposit = coin.canDeposit ?? true
  form.canWithdraw = coin.canWithdraw ?? true
  form.precision = coin.precision
  form.status = coin.status
  form.autoCollect = coin.autoCollect
  form.networks = Array.isArray(coin.networks)
    ? coin.networks.map((n) => ({
        ...n,
        threshold: Number(n.threshold),
        gasLimit: Number(n.gasLimit),
        intervalMin: Number(n.intervalMin ?? coin.intervalMin ?? 60)
      }))
    : []
}

const openEdit = (coin) => {
  editingCoinId.value = coin.id
  cloneCoinToForm(coin)
  modalTab.value = ASSET_MODAL_TAB.BASIC
  activeNetworkId.value = form.networks[0]?.id || ''
  showEditModal.value = true
}

const openCreate = () => {
  editingCoinId.value = ''
  form.type = ASSET_CURRENCY_TYPE.VIRTUAL
  form.name = ''
  form.symbol = ''
  form.isQuoteCurrency = false
  form.canDeposit = true
  form.canWithdraw = true
  form.precision = 6
  form.status = ASSET_STATUS.ENABLED
  form.autoCollect = true
  form.networks = [
    { id: `nw-${Date.now()}`, name: '', contract: '', collectAddress: '', threshold: 100, intervalMin: 60, gasLimit: 60000, status: ASSET_STATUS.ENABLED }
  ]
  modalTab.value = ASSET_MODAL_TAB.BASIC
  activeNetworkId.value = form.networks[0]?.id || ''
  showEditModal.value = true
}

const addNetwork = () => {
  const id = `nw-${Date.now()}`
  form.networks.push({ id, name: '', contract: '', collectAddress: '', threshold: 100, intervalMin: 60, gasLimit: 60000, status: ASSET_STATUS.ENABLED })
  modalTab.value = ASSET_MODAL_TAB.NETWORK
  activeNetworkId.value = id
}

const removeNetwork = (id) => {
  form.networks = form.networks.filter((n) => n.id !== id)
  if (activeNetworkId.value === id) activeNetworkId.value = form.networks[0]?.id || ''
}

const toggleNetworkPanel = (id) => {
  activeNetworkId.value = activeNetworkId.value === id ? '' : id
}

const saveCoin = () => {
  const type = normalizeCurrencyType(form.type)
  const offchain = isNonVirtualType(type)
  if (![ASSET_CURRENCY_TYPE.VIRTUAL, ASSET_CURRENCY_TYPE.METAL, ASSET_CURRENCY_TYPE.FIAT].includes(type)) return alert('请选择有效的币种类型')
  const payload = {
    type,
    name: form.name.trim(),
    symbol: form.symbol.trim().toUpperCase(),
    isQuoteCurrency: Boolean(form.isQuoteCurrency),
    canDeposit: Boolean(form.canDeposit),
    canWithdraw: Boolean(form.canWithdraw),
    precision: Number(form.precision),
    status: form.status,
    autoCollect: offchain ? false : Boolean(form.autoCollect),
    networks: offchain
      ? []
      : form.networks.map((n) => ({
          ...n,
          threshold: Number(n.threshold),
          intervalMin: Number.isFinite(Number(n.intervalMin)) ? Number(n.intervalMin) : 60,
          gasLimit: Number(n.gasLimit)
        }))
  }

  // 保存待提交的数据，先显示 MFA 验证弹窗
  pendingSaveData.value = payload
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
    
    // 验证成功后执行实际的保存操作
    if (pendingSaveData.value) {
      if (editingCoinId.value) {
        coins.value = coins.value.map((coin) => (coin.id === editingCoinId.value ? { ...coin, ...pendingSaveData.value } : coin))
      } else {
        coins.value.unshift({ id: `coin-${Date.now()}`, ...pendingSaveData.value })
      }

      showEditModal.value = false
      pendingSaveData.value = null
      showMfaModal.value = false
      alert('币种配置保存成功！')
    }
  } catch (error) {
    alert('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}

const badgeClass = (status) => (status === ASSET_STATUS.ENABLED ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')
</script>

<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">币种管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理币种配置和网络设置</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600 whitespace-nowrap">币种类型</span>
            <CurrencyTypeSelect v-model="currencyTypeDraft" class="shrink-0" />
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600 whitespace-nowrap">入金</span>
            <select v-model="depositSupportDraft" class="w-28 rounded-lg border border-slate-300 px-2 !h-8 text-sm">
              <option value="all">全部</option>
              <option value="enabled">开启</option>
              <option value="disabled">关闭</option>
            </select>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm text-slate-600 whitespace-nowrap">出金</span>
            <select v-model="withdrawSupportDraft" class="w-28 rounded-lg border border-slate-300 px-2 !h-8 text-sm">
              <option value="all">全部</option>
              <option value="enabled">开启</option>
              <option value="disabled">关闭</option>
            </select>
          </div>

          <div class="flex items-center gap-2 w-full sm:w-auto">
            <span class="text-sm text-slate-600 whitespace-nowrap">币种名称</span>
            <div class="relative w-full sm:w-80">
              <input
                v-model="searchDraft"
                type="text"
                class="ant-input w-full pl-9 !h-8"
                placeholder="搜索币种名称或符号..."
                @keyup.enter="applySearch"
              />
              <svg viewBox="0 0 20 20" class="pointer-events-none absolute left-3 top-2 h-4 w-4 text-slate-400" fill="none">
                <circle cx="9" cy="9" r="5.8" stroke="currentColor" stroke-width="1.6" />
                <path d="M13.6 13.6L16.4 16.4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <button type="button" class="ant-btn !h-8" @click="resetSearch">
            <span>重置</span>
          </button>
          <button type="button" class="ant-btn ant-btn-primary !h-8" @click="applySearch">
            <span>搜索</span>
          </button>
        </div>
      </div>
    </article>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div class="inline-flex items-center gap-4 text-sm">
          <button type="button" class="font-medium" :class="statusTab === ASSET_COMMON_FILTER_ALL ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_COMMON_FILTER_ALL">全部</button>
          <button type="button" class="font-medium" :class="statusTab === ASSET_STATUS.ENABLED ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_STATUS.ENABLED">已启用</button>
          <button type="button" class="font-medium" :class="statusTab === ASSET_STATUS.DISABLED ? 'text-blue-600' : 'text-slate-500'" @click="statusTab = ASSET_STATUS.DISABLED">已禁用</button>
          <span class="text-slate-400">|</span>
          <span class="text-slate-500">启用币种: <span class="font-medium text-slate-700">{{ enabledCount }}</span> / {{ coins.length }}</span>
        </div>

        <button type="button" class="ant-btn ant-btn-primary !h-8 shrink-0" @click="openCreate">
          <span>+ 新增币种</span>
        </button>
      </div>

      <div class="space-y-3 p-3">
        <article
          v-for="coin in pagedCoins"
          :key="coin.id"
          class="rounded-xl border border-slate-200 bg-white p-3 transition-colors"
          :class="coin.status === ASSET_STATUS.ENABLED ? 'hover:border-emerald-200 hover:bg-emerald-50/30' : 'hover:border-slate-300 hover:bg-slate-50'"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="flex min-w-0 items-start gap-3">
              <div class="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-900 text-base font-semibold text-white shadow-sm">
                {{ coinIconFallback(coin.symbol) }}
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="text-2xl font-semibold leading-none text-slate-900">{{ coin.symbol }}</h3>
                  <span class="text-base text-slate-500">{{ coin.name }}</span>
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="badgeClass(coin.status)">{{ coin.status === ASSET_STATUS.ENABLED ? '已启用' : '已禁用' }}</span>
                  <span class="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{{ currencyTypeLabel(coin.type) }}</span>
                  <span v-if="coin.isQuoteCurrency" class="rounded-md bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">计价</span>
                </div>
                <p class="mt-1.5 text-xs text-slate-600">
                  精度: {{ coin.precision }} 位
                  <span class="mx-2 text-slate-300">|</span>
                  入金: <span class="font-medium" :class="coin.canDeposit ? 'text-emerald-600' : 'text-slate-500'">{{ coin.canDeposit ? '开启' : '关闭' }}</span>
                  <span class="mx-2 text-slate-300">|</span>
                  出金: <span class="font-medium" :class="coin.canWithdraw ? 'text-emerald-600' : 'text-slate-500'">{{ coin.canWithdraw ? '开启' : '关闭' }}</span>
                </p>
                <p class="mt-1 text-xs text-slate-500">
                  支持网络 ({{ isNonVirtualType(coin.type) ? '-' : coin.networks.length }})
                  <template v-if="!isNonVirtualType(coin.type)">
                    <span class="mx-2 text-slate-300">|</span>
                    归集设置:
                    <span class="font-medium" :class="coin.autoCollect ? 'text-blue-600' : 'text-slate-500'">
                      {{ coin.autoCollect ? '开启（按网络）' : '关闭' }}
                    </span>
                  </template>
                </p>
              </div>
            </div>
            <button type="button" class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50" @click="openEdit(coin)">编辑</button>
          </div>

          <div v-if="!isNonVirtualType(coin.type) && coin.networks.length" class="mt-2.5 grid gap-2 xl:grid-cols-3">
            <article v-for="network in coin.networks" :key="network.id" class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div class="flex items-center justify-between">
                <p class="text-xl font-semibold text-slate-900">{{ network.name }}</p>
                <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="badgeClass(network.status)">{{ network.status === ASSET_STATUS.ENABLED ? '启用' : '禁用' }}</span>
              </div>
              <ul class="mt-2 space-y-0.5 text-xs text-slate-600">
                <li>合约: {{ network.contract }}</li>
                <li>归集: {{ network.collectAddress }}</li>
                <li>归集间隔: {{ network.intervalMin }} 分钟</li>
                <li>阈值: {{ network.threshold }} {{ coin.symbol }}</li>
              </ul>
            </article>
          </div>
        </article>

        <div v-if="filteredCoins.length === 0" class="p-8 text-center text-sm text-slate-500">
          未找到匹配的币种
        </div>
      </div>

      <!-- 分页栏 -->
      <footer v-if="totalPages > 1" class="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
        <p class="text-slate-500">共 {{ filteredCoins.length }} 个币种</p>
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

  <div v-if="showEditModal" class="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
    <section class="w-full max-w-3xl rounded-xl bg-white">
      <header class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 class="text-xl font-semibold text-slate-900">{{ editingCoinId ? '编辑币种配置' : '新增币种配置' }}</h2>
        <button type="button" class="text-2xl text-slate-400" @click="showEditModal = false">×</button>
      </header>

      <div class="max-h-[74vh] space-y-5 overflow-y-auto px-5 py-4">
        <nav class="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-sm"
            :class="modalTab === ASSET_MODAL_TAB.BASIC ? 'bg-white font-medium text-blue-600 shadow-sm' : 'text-slate-600'"
            @click="modalTab = ASSET_MODAL_TAB.BASIC"
          >
            基本信息
          </button>
          <button
            v-if="!isOffchain"
            type="button"
            class="rounded-md px-3 py-1.5 text-sm"
            :class="modalTab === ASSET_MODAL_TAB.NETWORK ? 'bg-white font-medium text-blue-600 shadow-sm' : 'text-slate-600'"
            @click="modalTab = ASSET_MODAL_TAB.NETWORK"
          >
            设置网络
          </button>
        </nav>

        <section v-if="modalTab === ASSET_MODAL_TAB.BASIC" class="rounded-lg border border-slate-200 p-4">
          <h3 class="text-sm font-medium text-slate-900">基本信息</h3>
          <div class="mt-3 grid gap-3 md:grid-cols-2">
            <div class="space-y-1 md:col-span-2">
              <span class="text-sm">币种类型</span>
              <div class="mt-1 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  class="rounded-lg border p-3 text-left transition-colors"
                  :class="typeCardClass(ASSET_CURRENCY_TYPE.VIRTUAL)"
                  :aria-pressed="form.type === ASSET_CURRENCY_TYPE.VIRTUAL"
                  @click="form.type = ASSET_CURRENCY_TYPE.VIRTUAL"
                >
                  <div class="flex items-start gap-3">
                    <span class="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white">
                      <span v-if="form.type === ASSET_CURRENCY_TYPE.VIRTUAL" class="h-2 w-2 rounded-full bg-blue-600"></span>
                    </span>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-slate-900">虚拟币</p>
                      <p class="mt-0.5 text-xs text-slate-500">可配置网络，支持充值/提现/归集</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  class="rounded-lg border p-3 text-left transition-colors"
                  :class="typeCardClass(ASSET_CURRENCY_TYPE.METAL)"
                  :aria-pressed="form.type === ASSET_CURRENCY_TYPE.METAL"
                  @click="form.type = ASSET_CURRENCY_TYPE.METAL"
                >
                  <div class="flex items-start gap-3">
                    <span class="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white">
                      <span v-if="form.type === ASSET_CURRENCY_TYPE.METAL" class="h-2 w-2 rounded-full bg-blue-600"></span>
                    </span>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-slate-900">贵金属</p>
                      <p class="mt-0.5 text-xs text-slate-500">无区块链网络，仅用于报价/资产记账（如 XAU）</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  class="rounded-lg border p-3 text-left transition-colors"
                  :class="typeCardClass(ASSET_CURRENCY_TYPE.FIAT)"
                  :aria-pressed="form.type === ASSET_CURRENCY_TYPE.FIAT"
                  @click="form.type = ASSET_CURRENCY_TYPE.FIAT"
                >
                  <div class="flex items-start gap-3">
                    <span class="mt-1 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white">
                      <span v-if="form.type === ASSET_CURRENCY_TYPE.FIAT" class="h-2 w-2 rounded-full bg-blue-600"></span>
                    </span>
                    <div class="min-w-0">
                      <p class="text-sm font-medium text-slate-900">法币</p>
                      <p class="mt-0.5 text-xs text-slate-500">无区块链网络，常用于汇率报价与法币记账</p>
                    </div>
                  </div>
                </button>
              </div>
              <p v-if="isOffchain" class="mt-2 text-xs text-amber-600">已选择非虚拟币：将不显示归集设置与网络设置，保存时自动清空网络。</p>
            </div>
            <label class="space-y-1">
              <span class="text-sm">币种名称</span>
              <input v-model="form.name" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label class="space-y-1">
              <span class="text-sm">币种符号</span>
              <input v-model="form.symbol" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <div class="space-y-2 md:col-span-2">
              <span class="text-sm">币种 Icon</span>
              <div class="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div class="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-900 text-lg font-semibold text-white shadow-sm">
                  {{ coinIconFallback(form.symbol) }}
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-medium text-slate-800">上传 Icon</p>
                  <p class="mt-1 text-xs text-slate-500">支持 PNG/JPG/SVG，建议 120x120；当前仅展示界面，后续接入上传接口。</p>
                </div>
                <button type="button" class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
                  选择图片
                </button>
              </div>
            </div>
            <label class="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input v-model="form.isQuoteCurrency" type="checkbox" class="h-4 w-4" />
              是否计价货币
            </label>
            <label class="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input v-model="form.canDeposit" type="checkbox" class="h-4 w-4" />
              允许入金
            </label>
            <label class="inline-flex items-center gap-2 text-sm md:col-span-2">
              <input v-model="form.canWithdraw" type="checkbox" class="h-4 w-4" />
              允许出金
            </label>
            <label class="space-y-1">
              <span class="text-sm">精度位数</span>
              <input v-model.number="form.precision" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
            </label>
            <label class="space-y-1">
              <span class="text-sm">状态</span>
              <select v-model="form.status" class="w-full rounded-lg border border-slate-300 px-3 py-2">
                <option :value="ASSET_STATUS.ENABLED">启用</option>
                <option :value="ASSET_STATUS.DISABLED">禁用</option>
              </select>
            </label>
          </div>
        </section>

        <section v-if="modalTab === ASSET_MODAL_TAB.NETWORK" class="rounded-lg border border-slate-200 p-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-slate-900">设置网络</h3>
            <button type="button" class="rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white" @click="addNetwork">+ 添加网络</button>
          </div>
          <div class="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <h4 class="text-sm font-medium text-slate-900">归集设置</h4>
            <div class="mt-3">
              <label class="inline-flex items-center gap-2 text-sm">
                <input v-model="form.autoCollect" type="checkbox" class="h-4 w-4" />
                启用自动归集
              </label>
            </div>
          </div>
          <p class="mt-2 text-xs text-slate-500">仅展开当前编辑网络，减少干扰；可切换网络逐个配置。</p>

          <div class="mt-3 space-y-3">
            <article v-for="(network, index) in form.networks" :key="network.id" class="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div class="mb-2 flex items-center gap-2">
                <div class="flex flex-1 items-center justify-between rounded-md px-2 py-1.5 text-left">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-slate-800">网络 {{ index + 1 }}</span>
                    <span class="text-xs text-slate-500">{{ network.name || '未命名网络' }}</span>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 px-1 py-0.5 text-xs text-slate-500 hover:text-slate-700"
                      @click="toggleNetworkPanel(network.id)"
                    >
                      {{ activeNetworkId === network.id ? '收起' : '展开' }}
                      <span class="text-slate-400 transition-transform" :class="activeNetworkId === network.id ? 'rotate-180' : ''">⌄</span>
                    </button>
                  </div>
                  <span class="rounded-md px-2 py-0.5 text-xs" :class="badgeClass(network.status)">{{ network.status === ASSET_STATUS.ENABLED ? '启用' : '禁用' }}</span>
                </div>
                <button type="button" class="rounded-md px-2 py-1 text-sm text-rose-500 hover:bg-rose-50" @click.stop="removeNetwork(network.id)">删除</button>
              </div>

              <div v-if="activeNetworkId === network.id" class="grid gap-3 md:grid-cols-2">
                <label class="space-y-1">
                  <span class="text-sm">网络名称</span>
                  <input v-model="network.name" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label class="space-y-1">
                  <span class="text-sm">最小归集数量</span>
                  <input v-model.number="network.threshold" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label class="space-y-1">
                  <span class="text-sm">归集间隔 (分钟)</span>
                  <input v-model.number="network.intervalMin" :disabled="!form.autoCollect" type="number" min="0" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label class="space-y-1">
                  <span class="text-sm">合约地址</span>
                  <input v-model="network.contract" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label class="space-y-1">
                  <span class="text-sm">Gas 限制</span>
                  <input v-model.number="network.gasLimit" type="number" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label class="space-y-1 md:col-span-2">
                  <span class="text-sm">归集地址</span>
                  <input v-model="network.collectAddress" type="text" class="w-full rounded-lg border border-slate-300 px-3 py-2" />
                </label>
                <label class="inline-flex items-center gap-2 text-sm md:col-span-2">
                  <input v-model="network.status" :true-value="ASSET_STATUS.ENABLED" :false-value="ASSET_STATUS.DISABLED" type="checkbox" class="h-4 w-4" />
                  启用该网络
                </label>
              </div>
            </article>
          </div>
        </section>
      </div>

      <footer class="flex justify-end gap-3 border-t border-slate-200 px-5 py-4">
        <button type="button" class="rounded-lg border border-slate-300 px-4 py-2" @click="showEditModal = false">取消</button>
        <button type="button" class="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white" @click="saveCoin">保存</button>
      </footer>
    </section>
  </div>

  <!-- MFA 验证弹窗 -->
  <MfaVerificationModal
    v-model:open="showMfaModal"
    :loading="mfaLoading"
    title="安全验证"
    description="编辑币种配置属于敏感操作，请输入 MFA 验证码"
    @verify="handleMfaVerify"
    @cancel="pendingSaveData = null"
  />
</template>
