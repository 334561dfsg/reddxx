<template>
  <section class="space-y-4">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-3xl font-semibold text-slate-900">现货产品管理</h1>
        <p class="mt-1 text-sm text-slate-500">管理现货交易产品、交易对及费率配置，支持产品的上下架和费率调整。</p>
      </div>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex w-full flex-wrap items-center gap-2 md:w-auto">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <span class="text-sm text-slate-600 whitespace-nowrap">产品名称</span>
            <div class="relative w-full sm:w-80">
              <a-input
                v-model:value="searchKeywordDraft"
                type="text"
                class="ant-input w-full pl-9 !h-8"
                placeholder="搜索产品名称 / 产品ID / 币种..."
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
          <a-button html-type="button" class="ant-btn !h-8" @click="resetSearch">
            <span>重置</span>
          </a-button>
          <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary !h-8" @click="applySearch">
            <span>搜索</span>
          </a-button>
        </div>
      </div>
    </article>

    <article class="rounded-xl border border-slate-200 bg-white">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-4">
        <div class="inline-flex items-center gap-6 text-sm">
          <a-button type="text"
            html-type="button"
            class="relative py-2 font-medium transition-colors"
            :class="filters.status === '' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
            @click="filters.status = ''"
          >
            全部
          </a-button>
          <a-button type="text"
            html-type="button"
            class="relative py-2 font-medium transition-colors"
            :class="filters.status === 'trading' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
            @click="filters.status = 'trading'"
          >
            交易中
          </a-button>
          <a-button type="text"
            html-type="button"
            class="relative py-2 font-medium transition-colors"
            :class="filters.status === 'suspended' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
            @click="filters.status = 'suspended'"
          >
            已暂停
          </a-button>
          <a-button type="text"
            html-type="button"
            class="relative py-2 font-medium transition-colors"
            :class="filters.status === 'delisted' ? 'text-blue-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-600' : 'text-slate-500 hover:text-slate-700'"
            @click="filters.status = 'delisted'"
          >
            已下架
          </a-button>
          <span class="text-slate-400">|</span>
          <span class="text-slate-500">共 <span class="font-medium text-slate-700">{{ totalItems }}</span> 条</span>
        </div>

        <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary !h-8 shrink-0" @click="showAddProduct">
          <span>+ 新增产品</span>
        </a-button>
      </div>

      <div class="p-4 space-y-4">
        <article
          v-for="product in paginatedProducts"
          :key="product.productId"
          class="rounded-lg border border-slate-200 bg-white transition-all hover:border-blue-500/30 hover:shadow-md"
        >
          <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-4">
            <div class="flex-1">
              <div class="flex items-center gap-3 flex-wrap">
                <h3 class="text-base font-semibold text-slate-900">{{ product.productName }}</h3>
                <span class="text-sm font-mono text-slate-500">{{ product.productId }}</span>
                <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border" :class="statusTagClass(product.status)">
                  {{ statusLabel(product.status) }}
                </span>
                <span class="px-2 py-0.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded">
                  {{ product.baseCurrency }}/{{ product.quoteCurrency }}
                </span>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <a-button html-type="button" class="ant-btn text-xs" @click="editProduct(product)">编辑</a-button>
              <a-button
                html-type="button"
                class="ant-btn text-xs"
                :disabled="product.status === 'delisted'"
                :class="product.status === 'trading' ? '!text-orange-500 hover:!text-orange-600 disabled:!text-slate-300' : '!text-emerald-600 hover:!text-emerald-700 disabled:!text-slate-300'"
                @click="togglePause(product)"
              >
                {{ product.status === 'trading' ? '暂停' : '恢复' }}
              </a-button>

            </div>
          </div>

          <div class="grid gap-0 md:grid-cols-2 bg-slate-50/30">
            <div class="border-b border-slate-100 p-4 md:border-b-0 md:border-r">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">交易限制</p>
              <ul class="mt-3 grid grid-cols-4 gap-4 text-sm">
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">精度</span>
                  <span class="text-slate-900 font-semibold font-mono">{{ product.pricePrecision }} / {{ product.quantityPrecision }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最小下单量</span>
                  <span class="text-slate-900 font-semibold font-mono">{{ formatAmount(product.minOrderQuantity) }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最小下单额</span>
                  <span class="text-slate-900 font-semibold font-mono">{{ formatAmount(product.minOrderValue) }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">最大下单额</span>
                  <span class="text-slate-900 font-semibold font-mono">{{ formatAmount(product.maxOrderValue) }}</span>
                </li>
              </ul>
            </div>

            <div class="p-4">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">费率</p>
              <ul class="mt-3 grid grid-cols-2 gap-4 text-sm">
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">买入费率</span>
                  <span class="text-emerald-600 font-bold font-mono">{{ formatRate(product.buyFee) }}</span>
                </li>
                <li class="flex flex-col gap-1">
                  <span class="text-slate-500 text-xs">卖出费率</span>
                  <span class="text-rose-600 font-bold font-mono">{{ formatRate(product.sellFee) }}</span>
                </li>
              </ul>
            </div>
          </div>
        </article>

        <p v-if="paginatedProducts.length === 0" class="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">暂无数据</p>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
        <div class="flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <div>
            共 <span class="font-medium text-slate-900">{{ totalItems }}</span> 条记录
          </div>
          <div class="flex items-center gap-2">
            <span>每页</span>
            <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value.number="pagination.pageSize" class="!w-20" @change="handlePageSizeChange">
              <a-select-option :value="5">5</a-select-option>
              <a-select-option :value="10">10</a-select-option>
              <a-select-option :value="20">20</a-select-option>
              <a-select-option :value="50">50</a-select-option>
            </a-select>
            <span>条</span>
          </div>
        </div>

        <div v-if="totalPages > 1" class="flex items-center gap-2">
          <a-pagination size="small" :current="pagination.currentPage" :total="totalPages" :page-size="1" :show-size-changer="false" @change="goToPage($event)" />
        </div>
      </div>
    </article>

    <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="showModal" :mask-closable="false" :closable="false" :keyboard="false" :width="1152" :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeModal"><template #title><header class="flex items-center justify-between border-b border-black/[0.06] bg-white px-6 py-4">
            <div>
              <h2 class="text-lg font-semibold text-black/85">{{ isEditing ? '编辑现货产品' : '新增现货产品' }}</h2>
              <p class="mt-1 text-sm text-black/65">配置现货交易产品的基础信息、精度限制与费率</p>
              <p v-if="isEditing" class="mt-1 text-xs text-black/45 font-mono">{{ editingProductId }}</p>
            </div>
            <a-button aria-label="关闭" type="text" html-type="button" class="text-black/45 hover:text-black/85 transition-colors text-2xl leading-none" @click="closeModal">×</a-button>
          </header></template><section class="flex flex-col md:flex-row  w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-2xl border border-black/[0.06]">
        <div class="flex w-full md:w-3/5 flex-col border-r border-black/[0.06]">


          <div class="flex-1 space-y-6 overflow-y-auto px-6 py-6 bg-[#f0f2f5]">
            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-black/5">
                  <svg class="h-4 w-4 text-black/45" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">基本信息</h3>
              </div>

              <div class="space-y-4">
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">产品名称 <span class="text-rose-500">*</span></label>
                  <p class="text-sm text-black/45">用于列表展示与搜索，建议使用交易对命名（如 BTC/USDT）。</p>
                  <a-input v-model:value="formData.productName" type="text" placeholder="如：BTC/USDT" class="ant-input" />
                </div>

                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">状态</label>
                    <p class="text-sm text-black/45">交易中会开放交易；暂停会限制交易行为。</p>
                    <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="formData.status" class="">
                      <a-select-option value="trading">交易中</a-select-option>
                      <a-select-option value="suspended">暂停交易</a-select-option>
                    </a-select>
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">产品排序</label>
                    <p class="text-sm text-black/45">数字越大越靠前。</p>
                    <a-input v-model:value.number="formData.sortOrder" type="number" placeholder="数字越大越靠前" class="ant-input font-mono" />
                  </div>
                </div>

                <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">交易对 <span class="text-rose-500">*</span></label>
                    <p class="text-sm text-black/45">选择交易对</p>
                    <a-select :get-popup-container="(trigger) => trigger.parentElement" v-model:value="formData.spotSymbol" class="" :disabled="spotSymbolLoading">
                      <a-select-option value="" disabled>{{ spotSymbolLoading ? '加载中...' : '请选择交易对' }}</a-select-option>
                      <a-select-option v-for="opt in spotSymbolOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
                    </a-select>
                </div>
              </div>
            </section>

            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-antd-primary/10">
                  <svg class="h-4 w-4 text-antd-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">精度与限制</h3>
              </div>

              <div class="space-y-4">
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">价格精度</label>
                    <p class="text-sm text-black/45">价格允许的小数位数。</p>
                    <a-input v-model:value.number="formData.pricePrecision" type="number" min="0" step="1" class="ant-input font-mono" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">数量精度</label>
                    <p class="text-sm text-black/45">数量允许的小数位数。</p>
                    <a-input v-model:value.number="formData.quantityPrecision" type="number" min="0" step="1" class="ant-input font-mono" />
                  </div>
                </div>

                <div class="grid gap-4 sm:grid-cols-3">
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">最小下单量</label>
                    <p class="text-sm text-black/45">单笔最小基础币数量。</p>
                    <a-input v-model:value.number="formData.minOrderQuantity" type="number" min="0" step="0.00000001" class="ant-input font-mono" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">最小下单额</label>
                    <p class="text-sm text-black/45">单笔最小计价币金额。</p>
                    <a-input v-model:value.number="formData.minOrderValue" type="number" min="0" step="0.01" class="ant-input font-mono" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm text-black/85 font-medium">最大下单额</label>
                    <p class="text-sm text-black/45">单笔最大计价币金额。</p>
                    <a-input v-model:value.number="formData.maxOrderValue" type="number" min="0" step="0.01" class="ant-input font-mono" />
                  </div>
                </div>
              </div>
            </section>

            <section class="space-y-4 rounded-lg border border-black/[0.06] bg-white p-6 shadow-sm">
              <div class="flex items-center gap-3 mb-2">
                <div class="flex h-8 w-8 items-center justify-center rounded bg-violet-100">
                  <svg class="h-4 w-4 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
                <h3 class="text-sm font-semibold text-black/85">费率设置</h3>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">买入费率 (%)</label>
                  <p class="text-sm text-black/45">对买入成交额收取的费率。</p>
                  <a-input v-model:value.number="formData.buyFee" type="number" min="0" step="0.001" class="ant-input font-mono" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm text-black/85 font-medium">卖出费率 (%)</label>
                  <p class="text-sm text-black/45">对卖出成交额收取的费率。</p>
                  <a-input v-model:value.number="formData.sellFee" type="number" min="0" step="0.001" class="ant-input font-mono" />
                </div>
              </div>
            </section>
          </div>


        </div>

        <div class="flex w-full md:w-2/5 flex-col bg-black/[0.01]">
          <header class="border-b border-black/[0.06] px-6 py-4">
            <h3 class="text-base font-semibold text-black/85">预览</h3>
            <p class="mt-1 text-sm text-black/65">实时预览产品在列表中的展示效果</p>
          </header>

          <div class="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <article class="rounded-lg border border-black/[0.06] bg-white overflow-hidden shadow-sm">
              <div class="border-b border-black/[0.06] p-4">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="truncate text-sm font-semibold text-black/85">{{ formData.productName || '未命名产品' }}</h4>
                    <p class="mt-1 text-xs font-mono text-black/45">
                      {{ String(formData.baseCurrency || '-').toUpperCase() }}/{{ String(formData.quoteCurrency || '-').toUpperCase() }}
                    </p>
                  </div>
                  <span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border" :class="statusTagClass(formData.status)">
                    {{ statusLabel(formData.status) }}
                  </span>
                </div>

                <div class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-black/65">
                  <span class="px-2 py-0.5 rounded border border-black/[0.06] bg-black/[0.02] font-mono">
                    精度 {{ Number(formData.pricePrecision || 0) }} / {{ Number(formData.quantityPrecision || 0) }}
                  </span>
                  <span class="px-2 py-0.5 rounded border border-black/[0.06] bg-black/[0.02] font-mono">
                    费率 {{ formatRate(formData.buyFee) }} / {{ formatRate(formData.sellFee) }}
                  </span>
                </div>
              </div>

              <div class="grid gap-0 bg-black/[0.01]">
                <div class="border-b border-black/[0.06] p-4">
                  <p class="text-[10px] font-bold text-black/35 uppercase tracking-wider">交易限制</p>
                  <ul class="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">最小下单量</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatAmount(formData.minOrderQuantity) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">最小下单额</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatAmount(formData.minOrderValue) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">最大下单额</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatAmount(formData.maxOrderValue) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">深度(买/卖)</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatVolume(Number(formData.bidDepth || 0)) }} / {{ formatVolume(Number(formData.askDepth || 0)) }}</span>
                    </li>
                  </ul>
                </div>

                <div class="p-4">
                  <p class="text-[10px] font-bold text-black/35 uppercase tracking-wider">市场数据</p>
                  <ul class="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">24h 成交量</span>
                      <span class="text-black/85 font-semibold font-mono">{{ formatVolume(Number(formData.volume24h || 0)) }}</span>
                    </li>
                    <li class="flex flex-col gap-0.5">
                      <span class="text-black/45 text-xs">24h 涨跌</span>
                      <span class="font-semibold font-mono" :class="Number(formData.priceChange24h || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                        {{ formatSignedPercent(Number(formData.priceChange24h || 0)) }}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section><template #footer><footer class="flex justify-end gap-3 border-t border-black/[0.06] bg-white px-6 py-4">
            <a-button html-type="button" class="ant-btn" @click="closeModal">取消</a-button>
            <a-button type="primary" html-type="button" class="ant-btn ant-btn-primary" @click="saveProduct">保存</a-button>
          </footer></template></a-modal>
  </section>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { mockSpotProducts, symbolApi } from '../../../admin/mock/spot'
import { sortSpotProducts } from '../../../admin/constants/spotProduct'

const products = ref([])
const showModal = ref(false)
const isEditing = ref(false)
const editingProductId = ref(null)
const searchKeywordDraft = ref('')
const searchKeywordApplied = ref('')
const spotSymbolLoading = ref(false)
const spotSymbols = ref([])
const lastSyncedSpotSymbol = ref('')

const filters = ref({
  status: ''
})

// 分页
const pagination = ref({
  currentPage: 1,
  pageSize: 10
})

const formData = ref({
  productName: '',
  spotSymbol: '',
  baseCurrency: '',
  quoteCurrency: '',
  pricePrecision: 2,
  quantityPrecision: 6,
  minOrderQuantity: 0.00001,
  minOrderValue: 10,
  maxOrderValue: 1000000,
  buyFee: 0.1,
  sellFee: 0.1,
  status: 'trading',
  sortOrder: 0,
  volume24h: 0,
  priceChange24h: 0,
  bidDepth: 0,
  askDepth: 0
})

onMounted(() => {
  products.value = mockSpotProducts
  loadSpotSymbols()
})

watch(
  () => filters.value.status,
  () => {
    pagination.value.currentPage = 1
  }
)

watch(searchKeywordApplied, () => {
  pagination.value.currentPage = 1
})

const applySearch = () => {
  searchKeywordApplied.value = searchKeywordDraft.value
  pagination.value.currentPage = 1
}

const resetSearch = () => {
  searchKeywordDraft.value = ''
  applySearch()
}

const spotSymbolOptions = computed(() => {
  const baseOptions = spotSymbols.value
    .map((row) => {
      const symbolName = String(row.symbol_name || '').trim()
      if (!symbolName) return null
      const id = row.symbol_id !== undefined && row.symbol_id !== null ? String(row.symbol_id) : ''
      const label = id ? `${symbolName} (${id})` : symbolName
      return { value: symbolName, label }
    })
    .filter(Boolean)

  const current = String(formData.value.spotSymbol || '').trim()
  if (current && !baseOptions.some((it) => it.value === current)) {
    baseOptions.unshift({ value: current, label: `${current} (未匹配)` })
  }

  return baseOptions
})

const syncSpotSymbolToForm = (val) => {
  const symbolName = String(val || '').trim()
  if (!symbolName) return

  const prev = lastSyncedSpotSymbol.value
  const row = spotSymbols.value.find((it) => String(it.symbol_name || '').trim() === symbolName)
  if (row) {
    formData.value.baseCurrency = String(row.base_coin_name || '').trim().toUpperCase()
    formData.value.quoteCurrency = String(row.quote_coin_name || '').trim().toUpperCase()
    formData.value.quantityPrecision = Number(row.base_coin_prec) || 0
    formData.value.pricePrecision = Number(row.quote_coin_prec) || 0

    const currentName = String(formData.value.productName || '').trim()
    if (!currentName || currentName === prev) {
      formData.value.productName = symbolName
    }
    lastSyncedSpotSymbol.value = symbolName
    return
  }

  const parts = symbolName.split('/')
  const base = String(parts[0] || '').trim()
  const quote = String(parts[1] || '').trim()
  if (base) formData.value.baseCurrency = base.toUpperCase()
  if (quote) formData.value.quoteCurrency = quote.toUpperCase()
  const currentName = String(formData.value.productName || '').trim()
  if (!currentName || currentName === prev) formData.value.productName = symbolName
  lastSyncedSpotSymbol.value = symbolName
}

const ensureDefaultSpotSymbol = () => {
  if (formData.value.spotSymbol) return
  const first = spotSymbolOptions.value[0]?.value || ''
  if (first) formData.value.spotSymbol = first
}

const loadSpotSymbols = async () => {
  spotSymbolLoading.value = true
  try {
    const result = await symbolApi.getSymbolList({
      page: 1,
      pageSize: 1000,
      includeDeleted: false
    })
    if (result?.success) {
      spotSymbols.value = Array.isArray(result.data?.list) ? result.data.list : []
      ensureDefaultSpotSymbol()
      syncSpotSymbolToForm(formData.value.spotSymbol)
    } else {
      spotSymbols.value = []
    }
  } catch {
    spotSymbols.value = []
  } finally {
    spotSymbolLoading.value = false
  }
}

watch(
  () => formData.value.spotSymbol,
  (val) => {
    syncSpotSymbolToForm(val)
  }
)

const pageButtons = computed(() => {
  const total = totalPages.value
  const current = pagination.value.currentPage
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, current - 1, current, current + 1])
  const normalized = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b)

  const result = []
  for (let i = 0; i < normalized.length; i++) {
    const p = normalized[i]
    const prev = normalized[i - 1]
    if (prev !== undefined && p - prev > 1) result.push('...')
    result.push(p)
  }
  return sortSpotProducts(result)
})

const filteredProducts = computed(() => {
  let result = products.value

  if (filters.value.status) {
    result = result.filter(p => p.status === filters.value.status)
  }

  // 搜索关键词过滤
  const keyword = searchKeywordApplied.value.trim().toLowerCase()
  if (keyword) {
    result = result.filter(p =>
      p.productName.toLowerCase().includes(keyword) ||
      p.productId.toLowerCase().includes(keyword) ||
      p.baseCurrency.toLowerCase().includes(keyword) ||
      p.quoteCurrency.toLowerCase().includes(keyword)
    )
  }

  return result
})

const totalItems = computed(() => filteredProducts.value.length)
const totalPages = computed(() => Math.ceil(totalItems.value / pagination.value.pageSize))

const paginatedProducts = computed(() => {
  const start = (pagination.value.currentPage - 1) * pagination.value.pageSize
  const end = start + pagination.value.pageSize
  return filteredProducts.value.slice(start, end)
})

const resetAll = () => {
  filters.value = { status: '' }
  searchKeywordDraft.value = ''
  searchKeywordApplied.value = ''
  pagination.value.currentPage = 1
}

const handlePageSizeChange = () => {
  pagination.value.currentPage = 1
}

const goToPage = (page) => {
  const next = Math.min(Math.max(1, page), totalPages.value || 1)
  pagination.value.currentPage = next
}

const formatAmount = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 8 })
}

const formatRate = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  return `${Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 6 })}%`
}

const formatSignedPercent = (value) => {
  if (value === null || value === undefined || isNaN(value)) return '-'
  const n = Number(value)
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

const statusTagClass = (status) => {
  if (status === 'trading') return 'bg-emerald-50 text-emerald-600 border-emerald-100'
  if (status === 'suspended') return 'bg-orange-50 text-orange-600 border-orange-100'
  if (status === 'delisted') return 'bg-slate-50 text-slate-500 border-slate-200'
  return 'bg-slate-50 text-slate-500 border-slate-200'
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value)
}

const formatVolume = (value) => {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(2) + 'B'
  }
  if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M'
  }
  if (value >= 1000) {
    return (value / 1000).toFixed(2) + 'K'
  }
  return value.toFixed(2)
}

const statusLabel = (status) => {
  const labels = {
    trading: '交易中',
    suspended: '暂停交易',
    delisted: '已下架'
  }
  return labels[status] || status
}

const resetFilters = () => {
  filters.value = {
    status: ''
  }
}

const resetFormData = () => {
  formData.value = {
    productName: '',
    spotSymbol: '',
    baseCurrency: '',
    quoteCurrency: '',
    pricePrecision: 2,
    quantityPrecision: 6,
    minOrderQuantity: 0.00001,
    minOrderValue: 10,
    maxOrderValue: 1000000,
    buyFee: 0.1,
    sellFee: 0.1,
    status: 'trading',
    sortOrder: 0,
    volume24h: 0,
    priceChange24h: 0,
    bidDepth: 0,
    askDepth: 0
  }
}

const showAddProduct = () => {
  isEditing.value = false
  editingProductId.value = null
  resetFormData()
  formData.value.sortOrder = Math.max(0, ...products.value.map((product) => Number(product.sortOrder) || 0)) + 10
  ensureDefaultSpotSymbol()
  showModal.value = true
}

const editProduct = (product) => {
  isEditing.value = true
  editingProductId.value = product.productId
  const spotSymbol = `${String(product.baseCurrency || '').toUpperCase()}/${String(product.quoteCurrency || '').toUpperCase()}`
  formData.value = {
    productName: product.productName,
    spotSymbol,
    baseCurrency: product.baseCurrency,
    quoteCurrency: product.quoteCurrency,
    pricePrecision: product.pricePrecision,
    quantityPrecision: product.quantityPrecision,
    minOrderQuantity: product.minOrderQuantity,
    minOrderValue: product.minOrderValue,
    maxOrderValue: product.maxOrderValue,
    buyFee: product.buyFee,
    sellFee: product.sellFee,
    status: product.status,
    sortOrder: Number(product.sortOrder ?? 0),
    volume24h: product.volume24h,
    priceChange24h: product.priceChange24h,
    bidDepth: product.bidDepth,
    askDepth: product.askDepth
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  resetFormData()
}

const saveProduct = () => {
  if (!formData.value.productName) {
    alert('请输入产品名称')
    return
  }
  if (!formData.value.spotSymbol) {
    alert('请选择交易对')
    return
  }
  if (!formData.value.baseCurrency || !formData.value.quoteCurrency) {
    alert('交易对信息不完整，请重新选择')
    return
  }
  const pricePrecision = Number(formData.value.pricePrecision)
  const quantityPrecision = Number(formData.value.quantityPrecision)
  const minOrderQuantity = Number(formData.value.minOrderQuantity)
  const minOrderValue = Number(formData.value.minOrderValue)
  const maxOrderValue = Number(formData.value.maxOrderValue)
  const buyFee = Number(formData.value.buyFee)
  const sellFee = Number(formData.value.sellFee)

  const isNonNegativeInt = (n) => Number.isFinite(n) && n >= 0 && Math.floor(n) === n

  if (!isNonNegativeInt(pricePrecision) || !isNonNegativeInt(quantityPrecision)) {
    alert('精度必须为非负整数')
    return
  }
  if (!Number.isFinite(minOrderQuantity) || minOrderQuantity <= 0) {
    alert('最小下单量必须大于 0')
    return
  }
  if (!Number.isFinite(minOrderValue) || minOrderValue < 0 || !Number.isFinite(maxOrderValue) || maxOrderValue <= 0) {
    alert('请输入有效的下单额限制')
    return
  }
  if (minOrderValue >= maxOrderValue) {
    alert('最大下单额必须大于最小下单额')
    return
  }
  if (!Number.isFinite(buyFee) || !Number.isFinite(sellFee) || buyFee < 0 || sellFee < 0) {
    alert('费率不能为负数')
    return
  }
  if (buyFee > 100 || sellFee > 100) {
    alert('费率不能超过 100%')
    return
  }

  const { spotSymbol: _spotSymbol, ...formPayload } = formData.value
  const payload = {
    ...formPayload,
    sortOrder: Number(formData.value.sortOrder)
  }

  if (isEditing.value) {
    // 编辑产品
    const index = products.value.findIndex(p => p.productId === editingProductId.value)
    if (index !== -1) {
      products.value[index] = {
        ...products.value[index],
        ...payload
      }
      alert('产品修改成功')
    }
  } else {
    // 新增产品
    const newProduct = {
      productId: `SPOT${String(products.value.length + 1).padStart(3, '0')}`,
      ...payload,
      volume24h: Math.random() * 10000000,
      priceChange24h: (Math.random() - 0.5) * 20,
      bidDepth: Math.random() * 1000000,
      askDepth: Math.random() * 1000000
    }
    products.value.unshift(newProduct)
    alert('产品创建成功')
  }

  closeModal()
}

const toggleProductStatus = (product) => {
  const index = products.value.findIndex(p => p.productId === product.productId)
  if (index !== -1) {
    const newStatus = products.value[index].status === 'trading' ? 'suspended' : 'trading'
    products.value[index].status = newStatus
  }
}

const togglePause = (product) => {
  const index = products.value.findIndex(p => p.productId === product.productId)
  if (index === -1) return
  if (products.value[index].status === 'delisted') return
  products.value[index].status = products.value[index].status === 'trading' ? 'suspended' : 'trading'
}

const toggleListing = (product) => {
  const index = products.value.findIndex(p => p.productId === product.productId)
  if (index === -1) return
  const next = products.value[index].status === 'delisted' ? 'trading' : 'delisted'
  const ok = window.confirm(next === 'delisted' ? '确认下架该产品？' : '确认上架该产品？')
  if (!ok) return
  products.value[index].status = next
}
</script>
