<script setup>
import { storeToRefs } from 'pinia'
import { useConsoleStore } from '../../../admin/stores/console'
import KpiCard from '../../../admin/components/KpiCard.vue'
import OrderTable from '../../../admin/components/OrderTable.vue'

const store = useConsoleStore()
const { summary, orders } = storeToRefs(store)
</script>

<template>
  <div class="-m-4 md:-m-8">
    <!-- Page Header -->
    <header class="bg-white px-4 py-4 mb-6 border-b border-black/[0.06] md:px-8">
      <div class="mb-2 flex items-center gap-2 text-sm text-black/45">
        <span>首页</span>
        <span class="text-black/15">/</span>
        <span class="text-black/85">分析页</span>
      </div>
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-black/85">工作台</h1>
          <p class="mt-2 text-sm text-black/45">欢迎回来，Admin。这是您今天的业务数据概览。</p>
        </div>
      </div>
    </header>

    <div class="px-4 pb-8 md:px-8 space-y-6">
      <!-- KPI Cards -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          v-for="item in summary"
          :key="item.label"
          :label="item.label"
          :value="item.value"
          :trend="item.trend"
          :good="item.good"
        />
      </div>

      <!-- Content Grid -->
      <div class="grid gap-6 xl:grid-cols-[1.2fr,0.8fr]">
        <div class="pro-card p-6">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-base font-medium text-black/85">最近订单</h2>
            <button class="text-sm text-antd-primary hover:text-antd-primary-hover transition-colors">查看全部</button>
          </div>
          <OrderTable :orders="orders" />
        </div>

        <div class="space-y-6">
          <div class="pro-card p-6 bg-antd-sidebar-dark text-white/85">
            <div class="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45 mb-4">
              <span class="h-2 w-2 rounded-full bg-antd-primary"></span>
              业务洞察
            </div>
            <h3 class="text-lg font-medium text-white">流量峰值提醒</h3>
            <p class="mt-3 text-sm text-white/65 leading-relaxed">
              根据最近 7 天的数据分析，系统流量在 20:00-22:00 达到顶峰。建议在该时段加强系统监控。
            </p>
            <div class="mt-6 pt-6 border-t border-white/10">
              <div class="flex items-center justify-between text-xs text-white/45">
                <span>转化率提升</span>
                <span class="text-emerald-400 font-medium">+16%</span>
              </div>
              <div class="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-500 w-[76%]"></div>
              </div>
            </div>
          </div>

          <div class="pro-card p-6">
            <h3 class="text-base font-medium text-black/85 mb-4">系统公告</h3>
            <div class="space-y-4">
              <div v-for="i in 3" :key="i" class="flex gap-3">
                <div class="mt-1 h-2 w-2 rounded-full bg-antd-primary/20 border border-antd-primary/50"></div>
                <div>
                  <p class="text-sm text-black/85">系统版本更新至 v2.4.0</p>
                  <p class="text-xs text-black/45 mt-1">2024-03-12 10:00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
