<script setup>
import { ref } from 'vue'
import { createRuleStatisticsMock } from '../../../admin/mock/deliveryControl'

const statistics = ref(createRuleStatisticsMock())
</script>

<template>
  <section class="space-y-5">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">规则效果统计</h1>
      <p class="mt-1 text-sm text-slate-500">分析自动化规则的执行效果和影响范围</p>
    </header>

    <!-- 总体统计卡片 -->
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <article class="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5">
        <p class="text-sm text-slate-600">规则总数</p>
        <p class="mt-2 text-4xl font-bold text-blue-600">{{ statistics.totalRules }}</p>
        <div class="mt-3 flex items-center gap-2 text-sm">
          <span class="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
            运行中: {{ statistics.enabledRules }}
          </span>
          <span class="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
            暂停: {{ statistics.pausedRules }}
          </span>
        </div>
      </article>

      <article class="rounded-xl border border-slate-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-5">
        <p class="text-sm text-slate-600">总触发次数</p>
        <p class="mt-2 text-4xl font-bold text-emerald-600">{{ statistics.totalHits }}</p>
        <p class="mt-3 text-sm text-slate-500">
          今日触发: <span class="font-semibold text-emerald-700">{{ statistics.todayHits }}</span>
        </p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-gradient-to-br from-violet-50 to-purple-50 p-5">
        <p class="text-sm text-slate-600">总影响用户</p>
        <p class="mt-2 text-4xl font-bold text-violet-600">{{ statistics.totalAffectedUsers }}</p>
        <p class="mt-3 text-sm text-slate-500">
          今日影响: <span class="font-semibold text-violet-700">{{ statistics.todayAffectedUsers }}</span>
        </p>
      </article>

      <article class="rounded-xl border border-slate-200 bg-gradient-to-br from-orange-50 to-red-50 p-5">
        <p class="text-sm text-slate-600">平均触发率</p>
        <p class="mt-2 text-4xl font-bold text-orange-600">{{ statistics.avgHitRate }}%</p>
        <p class="mt-3 text-sm text-slate-500">
          规则执行效率指标
        </p>
      </article>
    </div>

    <!-- 趋势图表 -->
    <div class="rounded-xl border border-slate-200 bg-white p-6">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-slate-900">📊 过去7天触发趋势</h3>
        <div class="flex gap-2">
          <button 
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            7天
          </button>
          <button 
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            30天
          </button>
        </div>
      </div>

      <div class="grid grid-cols-7 gap-2">
        <div 
          v-for="data in statistics.performanceData" 
          :key="data.date" 
          class="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center transition hover:border-blue-300 hover:shadow-md"
        >
          <p class="text-xs font-medium text-slate-500">{{ data.date }}</p>
          <p class="mt-3 text-3xl font-bold text-blue-600">{{ data.hits }}</p>
          <p class="mt-1 text-xs text-slate-600">触发次数</p>
          <div class="mx-auto mt-3 h-1 w-full rounded-full bg-slate-200">
            <div 
              class="h-1 rounded-full bg-blue-600"
              :style="{ width: `${(data.hits / 70) * 100}%` }"
            ></div>
          </div>
          <p class="mt-3 text-lg font-bold text-violet-600">{{ data.affected }}</p>
          <p class="text-xs text-slate-600">影响用户</p>
        </div>
      </div>
    </div>

    <!-- 详细统计 -->
    <div class="grid gap-4 md:grid-cols-2">
      <!-- 按规则类型统计 -->
      <article class="rounded-xl border border-slate-200 bg-white p-6">
        <h3 class="mb-4 text-lg font-semibold text-slate-900">📋 按触发类型统计</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                📊
              </div>
              <div>
                <p class="font-medium text-slate-900">交易次数触发</p>
                <p class="text-xs text-slate-500">最常用的触发类型</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-blue-600">156</p>
          </div>

          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                📈
              </div>
              <div>
                <p class="font-medium text-slate-900">盈亏触发</p>
                <p class="text-xs text-slate-500">盈亏异常监控</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-emerald-600">89</p>
          </div>

          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                💰
              </div>
              <div>
                <p class="font-medium text-slate-900">日盈利触发</p>
                <p class="text-xs text-slate-500">盈利封顶控制</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-violet-600">67</p>
          </div>

          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                🎯
              </div>
              <div>
                <p class="font-medium text-slate-900">连续盈利触发</p>
                <p class="text-xs text-slate-500">连胜阻断</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-orange-600">54</p>
          </div>
        </div>
      </article>

      <!-- 按动作类型统计 -->
      <article class="rounded-xl border border-slate-200 bg-white p-6">
        <h3 class="mb-4 text-lg font-semibold text-slate-900">⚡ 按执行动作统计</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                🎚️
              </div>
              <div>
                <p class="font-medium text-slate-900">盈亏控制</p>
                <p class="text-xs text-slate-500">最常用的控制手段</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-blue-600">178</p>
          </div>

          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                ❌
              </div>
              <div>
                <p class="font-medium text-slate-900">强制亏损</p>
                <p class="text-xs text-slate-500">阻断连胜</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-rose-600">67</p>
          </div>

          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                💹
              </div>
              <div>
                <p class="font-medium text-slate-900">价格调整</p>
                <p class="text-xs text-slate-500">大额持仓控制</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-amber-600">89</p>
          </div>

          <div class="flex items-center justify-between rounded-lg bg-slate-50 p-3">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                🚫
              </div>
              <div>
                <p class="font-medium text-slate-900">订单拒绝</p>
                <p class="text-xs text-slate-500">锁定新开仓</p>
              </div>
            </div>
            <p class="text-2xl font-bold text-orange-600">32</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
