<template>
  <PageShell>
    <SearchForm name="perpetual-order-filters" :model="filters" :fields="fields" @search="search" @reset="resetFilters" />
    <AdminTable title="永续合约订单" v-model:page="currentPage" :rows="filteredOrders" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <Button @click="exportOrders"><template #icon><DownloadOutlined /></template>导出</Button>
      </template>
      <template #cell="{ column, record: order }">
        <Space v-if="column.key === 'order'" direction="vertical" :size="0">
          <span class="font-mono">{{ order.orderId }}</span>
          <TypographyText type="secondary">{{ order.openTime }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'user'" direction="vertical" :size="0">
          <span>{{ order.userName }} <Tag v-if="order.vipLevel">{{ order.vipLevel }}</Tag></span>
          <TypographyText type="secondary" class="font-mono">{{ order.userId }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'product'" direction="vertical" :size="0">
          <TypographyText strong>{{ order.productName }}</TypographyText>
          <span><Tag :color="order.side === PERPETUAL_ORDER_SIDE.LONG ? 'green' : 'red'">{{ perpetualOrderSideMeta[order.side]?.text }}</Tag><TypographyText type="secondary">{{ order.leverage }}x</TypographyText></span>
        </Space>
        <Space v-else-if="column.key === 'position'" direction="vertical" :size="0" align="end">
          <span>{{ money(order.positionValue) }}</span>
          <TypographyText type="secondary">保证金 {{ money(order.margin) }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'price'" direction="vertical" :size="0" align="end">
          <span>入场 {{ money(order.entryPrice) }}</span>
          <TypographyText type="secondary">当前 {{ money(order.currentPrice) }}</TypographyText>
          <TypographyText type="secondary">强平 {{ money(order.liquidationPrice) }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'pnl'" direction="vertical" :size="0" align="end">
          <TypographyText :type="order.unrealizedPnl > 0 ? 'success' : order.unrealizedPnl < 0 ? 'danger' : undefined">{{ order.unrealizedPnl > 0 ? '+' : '' }}{{ money(order.unrealizedPnl) }}</TypographyText>
          <TypographyText type="secondary">{{ order.unrealizedPnlRate?.toFixed(2) }}%</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'marginRatio'" direction="vertical" :size="0" align="end">
          <span>{{ order.marginRatio?.toFixed(2) }}%</span>
          <TypographyText :type="marginRisk(order).type">{{ marginRisk(order).text }}</TypographyText>
        </Space>
        <Tag v-else-if="column.key === 'status'" :color="statusColor[order.status]">{{ perpetualOrderStatusMeta[order.status]?.text }}</Tag>
        <Button v-else-if="column.key === 'actions'" type="link" class="px-0" @click="viewOrder(order)">详情</Button>
        <template v-else>{{ order[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>

    <!-- 详情弹窗 -->
    <a-modal :wrap-props="{ 'aria-modal': true }" transition-name="admin-trading-dialog" mask-transition-name="admin-trading-mask" :open="Boolean(showDetailModal)" :mask-closable="false" :closable="false" :keyboard="true" :width="1152"  :destroy-on-close="true" wrap-class-name="admin-trading-modal" :body-style="{ padding: 0, overflowY: 'auto', maxHeight: 'calc(100dvh - 180px)' }" @cancel="closeDetailModal">
<template #title><template v-if="showDetailModal"><header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div class="flex items-center gap-4">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
              </svg>
            </div>
            <div>
              <h2 class="text-xl font-semibold text-slate-900">永续合约订单详情</h2>
              <p class="mt-0.5 text-sm text-slate-500">订单编号：{{ currentOrder?.orderId }}</p>
            </div>
          </div>
          <a-button aria-label="关闭" type="text" html-type="button" class="text-slate-400 hover:text-slate-600 transition-colors" @click="closeDetailModal">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </a-button>
        </header></template></template>
<template v-if="showDetailModal">

        <!-- Tab 导航 -->
        <div class="border-b border-slate-200 bg-slate-50 px-6">
          <div class="flex gap-1">
            <a-button type="text"
              v-for="tab in detailTabs"
              :key="tab.id"
              html-type="button"
              @click="currentTab = tab.id"
              class="px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2"
              :class="currentTab === tab.id
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path :d="tab.icon" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span>{{ tab.label }}</span>
            </a-button>
          </div>
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-y-auto bg-slate-50 p-6">
          <!-- Tab 1: 概览 -->
          <div v-if="currentTab === 'overview'" class="space-y-5">
            <!-- 关键指标卡片 -->
            <div class="grid gap-4 md:grid-cols-4">
              <div class="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-blue-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  <span>仓位价值</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-blue-900">${{ currentOrder?.positionValue?.toLocaleString() }}</p>
                <p class="mt-1 text-xs text-blue-600">{{ currentOrder?.productName }}</p>
              </div>

              <div class="rounded-xl border" :class="currentOrder?.unrealizedPnl >= 0
                ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50'
                : 'border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50'">
                <div class="flex items-center gap-2 text-sm" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'text-emerald-700'
                  : 'text-rose-700'">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                  <span>未实现盈亏</span>
                </div>
                <p class="mt-2 text-2xl font-bold" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'text-emerald-900'
                  : 'text-rose-900'">
                  {{ currentOrder?.unrealizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.unrealizedPnl?.toFixed(2) }}
                </p>
                <p class="mt-1 text-xs" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'text-emerald-600'
                  : 'text-rose-600'">
                  {{ currentOrder?.unrealizedPnlRate?.toFixed(2) }}%
                </p>
              </div>

              <div class="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50 p-4">
                <div class="flex items-center gap-2 text-sm text-purple-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                  <span>保证金</span>
                </div>
                <p class="mt-2 text-2xl font-bold text-purple-900">${{ currentOrder?.margin?.toFixed(2) }}</p>
                <p class="mt-1 text-xs text-purple-600">{{ currentOrder?.leverage }}x 杠杆</p>
              </div>

              <div class="rounded-xl border" :class="{
                'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50': currentOrder?.marginRatio <= 20,
                'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                'border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/50': currentOrder?.marginRatio > 50
              }">
                <div class="flex items-center gap-2 text-sm" :class="{
                  'text-emerald-700': currentOrder?.marginRatio <= 20,
                  'text-amber-700': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                  'text-rose-700': currentOrder?.marginRatio > 50
                }">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  <span>保证金率</span>
                </div>
                <p class="mt-2 text-2xl font-bold" :class="{
                  'text-emerald-900': currentOrder?.marginRatio <= 20,
                  'text-amber-900': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                  'text-rose-900': currentOrder?.marginRatio > 50
                }">{{ currentOrder?.marginRatio?.toFixed(2) }}%</p>
                <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                  <div class="h-full transition-all" :class="{
                    'bg-emerald-500': currentOrder?.marginRatio <= 20,
                    'bg-amber-500': currentOrder?.marginRatio > 20 && currentOrder?.marginRatio <= 50,
                    'bg-rose-500': currentOrder?.marginRatio > 50
                  }" :style="{width: `${Math.min(currentOrder?.marginRatio, 100)}%`}"></div>
                </div>
              </div>
            </div>

            <!-- 基本信息 -->
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                  <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>订单基本信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">订单 ID</label>
                  <p class="font-mono text-sm font-medium text-slate-900">{{ currentOrder?.orderId }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">交易对</label>
                  <p class="text-sm font-medium text-slate-900">{{ currentOrder?.symbol }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">方向</label>
                  <span :class="['text-xs px-2 py-0.5 rounded-md font-medium', perpetualOrderSideMeta[currentOrder?.side]?.badgeClass]">
                    {{ perpetualOrderSideMeta[currentOrder?.side]?.text }}
                  </span>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">状态</label>
                  <span class="rounded-md px-2 py-0.5 text-xs font-medium" :class="perpetualOrderStatusMeta[currentOrder?.status]?.badgeClass">
                    {{ perpetualOrderStatusMeta[currentOrder?.status]?.text }}
                  </span>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">开仓时间</label>
                  <p class="text-sm text-slate-700">{{ currentOrder?.openTime }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">平仓时间</label>
                  <p class="text-sm text-slate-700">{{ currentOrder?.closeTime || '-' }}</p>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 2: 仓位详情 -->
          <div v-if="currentTab === 'position'" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                  <svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                </span>
                <span>仓位参数</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">仓位大小</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">{{ currentOrder?.positionSize }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">入场价格</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">${{ currentOrder?.entryPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">当前价格</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">${{ currentOrder?.currentPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">标记价格</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">${{ currentOrder?.markPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p class="text-xs text-rose-600">强平价格</p>
                  <p class="mt-1 text-xl font-bold text-rose-700">${{ currentOrder?.liquidationPrice?.toLocaleString() }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">杠杆倍数</p>
                  <p class="mt-1 text-xl font-bold text-slate-900">{{ currentOrder?.leverage }}x</p>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100">
                  <svg class="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>费用信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">资金费率</p>
                  <p class="mt-1 text-lg font-bold text-slate-900">${{ currentOrder?.fundingFee?.toFixed(2) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">交易手续费</p>
                  <p class="mt-1 text-lg font-bold text-slate-900">${{ currentOrder?.tradingFee?.toFixed(2) }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p class="text-xs text-slate-500">已实现盈亏</p>
                  <p class="mt-1 text-lg font-bold" :class="currentOrder?.realizedPnl >= 0
                    ? 'text-emerald-600'
                    : 'text-rose-600'">
                    {{ currentOrder?.realizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.realizedPnl?.toFixed(2) }}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 3: 用户信息 -->
          <div v-if="currentTab === 'user'" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100">
                  <svg class="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                  </svg>
                </span>
                <span>用户信息</span>
              </h3>
              <div class="grid gap-4 md:grid-cols-3">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户 ID</label>
                  <p class="font-mono text-sm font-medium text-slate-900">{{ currentOrder?.userId }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">用户名</label>
                  <p class="text-sm font-medium text-slate-900">{{ currentOrder?.userName }}</p>
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-slate-500">VIP 等级</label>
                  <div><Tag>{{ currentOrder?.vipLevel || '—' }}</Tag></div>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 4: 盈亏分析 -->
          <div v-if="currentTab === 'pnl'" class="space-y-5">
            <section class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                  <svg class="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                  </svg>
                </span>
                <span>盈亏明细</span>
              </h3>
              <div class="space-y-4">
                <div class="flex justify-between items-center p-4 rounded-lg" :class="currentOrder?.unrealizedPnl >= 0
                  ? 'bg-emerald-50 border border-emerald-200'
                  : 'bg-rose-50 border border-rose-200'">
                  <span class="text-sm font-medium text-slate-700">未实现盈亏</span>
                  <div class="text-right">
                    <p class="text-2xl font-bold" :class="currentOrder?.unrealizedPnl >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'">
                      {{ currentOrder?.unrealizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.unrealizedPnl?.toFixed(2) }}
                    </p>
                    <p class="text-sm" :class="currentOrder?.unrealizedPnl >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'">
                      {{ currentOrder?.unrealizedPnlRate?.toFixed(2) }}%
                    </p>
                  </div>
                </div>

                <div class="flex justify-between items-center p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span class="text-sm font-medium text-slate-700">已实现盈亏</span>
                  <div class="text-right">
                    <p class="text-2xl font-bold" :class="currentOrder?.realizedPnl >= 0
                      ? 'text-emerald-600'
                      : 'text-rose-600'">
                      {{ currentOrder?.realizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.realizedPnl?.toFixed(2) }}
                    </p>
                  </div>
                </div>

                <div class="flex justify-between items-center p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <span class="text-sm font-medium text-slate-700">总费用</span>
                  <div class="text-right">
                    <p class="text-xl font-bold text-slate-900">
                      ${{ ((currentOrder?.fundingFee || 0) + (currentOrder?.tradingFee || 0)).toFixed(2) }}
                    </p>
                    <p class="text-xs text-slate-500">资金费 + 交易费</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 5: 操作记录 -->
          <div v-if="currentTab === 'history'" class="space-y-4">
            <div class="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 class="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </span>
                <span>操作记录</span>
              </h3>
              <div class="space-y-3">
                <div class="flex items-start gap-3 pb-3 border-b border-slate-200">
                  <div class="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg class="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-slate-900">开仓</p>
                    <p class="text-xs text-slate-500 mt-1">{{ currentOrder?.openTime }}</p>
                    <p class="text-xs text-slate-600 mt-1">
                      以 ${{ currentOrder?.entryPrice?.toLocaleString() }} 开设 {{ currentOrder?.leverage }}x {{ perpetualOrderSideMeta[currentOrder?.side]?.text }} 仓
                    </p>
                  </div>
                </div>

                <div v-if="currentOrder?.status !== PERPETUAL_ORDER_STATUS.HOLDING" class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-full" :class="{
                    'bg-emerald-100': currentOrder?.status === PERPETUAL_ORDER_STATUS.CLOSED,
                    'bg-rose-100': currentOrder?.status === PERPETUAL_ORDER_STATUS.LIQUIDATED
                  }">
                    <svg class="w-4 h-4" :class="{
                      'text-emerald-600': currentOrder?.status === PERPETUAL_ORDER_STATUS.CLOSED,
                      'text-rose-600': currentOrder?.status === PERPETUAL_ORDER_STATUS.LIQUIDATED
                    }" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                  </div>
                  <div class="flex-1">
                    <p class="text-sm font-medium text-slate-900">
                      {{ currentOrder?.status === PERPETUAL_ORDER_STATUS.CLOSED ? '主动平仓' : '强制平仓' }}
                    </p>
                    <p class="text-xs text-slate-500 mt-1">{{ currentOrder?.closeTime }}</p>
                    <p class="text-xs text-slate-600 mt-1">
                      实现盈亏：{{ currentOrder?.realizedPnl >= 0 ? '+' : '' }}${{ currentOrder?.realizedPnl?.toFixed(2) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部按钮 -->
        </template>
<template #footer><template v-if="showDetailModal"><footer class="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <div class="flex items-center justify-end">
            <a-button html-type="button" class="ant-btn !px-6 !py-2.5 !h-auto" @click="closeDetailModal">
              关闭
            </a-button>
          </div>
        </footer></template></template>
</a-modal>
  </PageShell>
</template>

<script setup>
// 永续合约订单 — Ant Design Pro list page (2026-11-28): query card (one field per filter, ranges as number/date
// ranges), table card with export toolbar and pagination, side/status as text Tags, right-aligned amounts.
// The old 开仓时间 filter took a single date; it is now a date range. Export is a toast (no file in the demo).
import { ref, computed, onMounted } from 'vue'
import { Button, Space, Tag, TypographyText, message } from 'ant-design-vue'
import { DownloadOutlined } from '@ant-design/icons-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import { createPerpetualOrdersMock, PERPETUAL_ORDER_STATUS, PERPETUAL_ORDER_SIDE, perpetualOrderStatusMeta, perpetualOrderSideMeta } from '../../../admin/mock/perpetualOrder'

const orders = ref([])
const currentPage = ref(1)
const showDetailModal = ref(false)
const currentOrder = ref(null)
const currentTab = ref('overview')

const blank = () => ({ orderId: '', userId: '', status: 'all', symbol: 'all', side: 'all', leverage: [null, null], positionValue: [null, null], pnl: [null, null], openDate: null })
const filters = ref(blank())
const fields = computed(() => [
  { key: 'orderId', label: '订单号' },
  { key: 'userId', label: '用户 ID' },
  { key: 'status', label: '状态', options: [{ value: 'all', label: '全部状态' }, ...Object.entries(perpetualOrderStatusMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'symbol', label: '交易对', searchable: true, options: [{ value: 'all', label: '全部交易对' }, ...[...new Set(orders.value.map((o) => o.symbol))].sort().map((value) => ({ value, label: value }))] },
  { key: 'side', label: '方向', options: [{ value: 'all', label: '全部方向' }, ...Object.entries(perpetualOrderSideMeta).map(([value, meta]) => ({ value, label: meta.text }))] },
  { key: 'leverage', label: '杠杆倍数', numberRange: true, min: 1 },
  { key: 'positionValue', label: '仓位价值', numberRange: true, min: 0 },
  { key: 'pnl', label: '未实现盈亏', numberRange: true },
  { key: 'openDate', label: '开仓日期', range: true }
])

const statusColor = { [PERPETUAL_ORDER_STATUS.HOLDING]: 'blue', [PERPETUAL_ORDER_STATUS.CLOSED]: 'default', [PERPETUAL_ORDER_STATUS.LIQUIDATED]: 'red' }
const money = (value) => Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const marginRisk = (order) => order.marginRatio > 50 ? { type: 'danger', text: '高风险' } : order.marginRatio > 20 ? { type: 'warning', text: '关注' } : { type: 'success', text: '正常' }
const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const inRange = (value, range) => { const [min, max] = range || []; return (min === null || min === undefined || value >= min) && (max === null || max === undefined || value <= max) }

const columns = [
  { key: 'order', title: '订单', width: 190, fixed: 'left' },
  { key: 'user', title: '用户', width: 150 },
  { key: 'product', title: '交易对 / 方向', width: 160 },
  { key: 'position', title: '仓位价值（USDT）', width: 170, align: 'right' },
  { key: 'price', title: '价格（USDT）', width: 170, align: 'right' },
  { key: 'pnl', title: '未实现盈亏（USDT）', width: 170, align: 'right' },
  { key: 'marginRatio', title: '保证金率', width: 110, align: 'right' },
  { key: 'status', title: '状态', width: 90 },
  { key: 'actions', title: '操作', width: 80, fixed: 'right' }
]

const detailTabs = [
  { id: 'overview', label: '概览', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'position', label: '仓位详情', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { id: 'user', label: '用户信息', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'pnl', label: '盈亏分析', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
  { id: 'history', label: '操作记录', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' }
]

onMounted(() => {
  orders.value = createPerpetualOrdersMock()
})

const filteredOrders = computed(() => orders.value.filter((o) => {
  const f = filters.value
  const day = String(o.openTime).slice(0, 10)
  return has(o.orderId, f.orderId) && has(o.userId, f.userId) &&
    (f.status === 'all' || o.status === f.status) &&
    (f.symbol === 'all' || o.symbol === f.symbol) &&
    (f.side === 'all' || o.side === f.side) &&
    inRange(o.leverage, f.leverage) && inRange(o.positionValue, f.positionValue) && inRange(o.unrealizedPnl, f.pnl) &&
    (!f.openDate || (day >= f.openDate[0] && day <= f.openDate[1]))
}))

function search(values) { filters.value = { ...blank(), ...values }; currentPage.value = 1 }
function resetFilters() { filters.value = blank(); currentPage.value = 1 }

const viewOrder = (order) => {
  currentOrder.value = order
  currentTab.value = 'overview'
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  currentOrder.value = null
}

// Mock export: no file yet, so say so instead of a native alert (operation feedback is toast-only).
const exportOrders = () => {
  message.info(`已按当前筛选条件准备导出 ${filteredOrders.value.length} 条订单（演示环境不生成文件）`)
}
</script>
