<script setup>
import FinanceLiquidityOrdersPanel from './FinanceLiquidityOrdersPanel.vue'

const prefix = '/front'
</script>

<template>
  <div
    class="min-h-[100dvh] bg-[#050505] pb-10 text-white lg:min-h-[calc(100dvh-3.5rem)]"
    aria-label="流动性挖矿订单页"
  >
    <header
      class="fixed inset-x-0 top-0 z-40 flex min-h-14 items-center justify-center border-b border-white/[0.06] bg-black/95 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur supports-[backdrop-filter]:bg-black/80 lg:hidden"
      aria-label="流动性挖矿订单移动端标题栏"
    >
      <RouterLink
        :to="`${prefix}/finance/liquidity`"
        class="absolute left-3 inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-lime-300/60"
        aria-label="返回流动性挖矿"
      >
        <span class="text-3xl leading-none" aria-hidden="true">‹</span>
      </RouterLink>
      <h1 class="text-base font-semibold text-white">投资订单</h1>
    </header>

    <header class="hidden border-b border-white/[0.06] bg-[#050505] lg:block">
      <div class="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-7 lg:px-10">
        <nav class="text-xs text-white/40 sm:text-sm" aria-label="流动性挖矿订单路径">
          <RouterLink :to="`${prefix}/finance`" class="transition hover:text-lime-300">金融</RouterLink>
          <span class="mx-1.5 text-white/20 sm:mx-2">/</span>
          <RouterLink :to="`${prefix}/finance/liquidity`" class="transition hover:text-lime-300">流动性挖矿</RouterLink>
          <span class="mx-1.5 text-white/20 sm:mx-2">/</span>
          <span class="text-white/70">投资订单</span>
        </nav>
        <div class="mt-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold tracking-tight text-white sm:text-3xl">投资订单</h1>
            <p class="mt-2 text-sm text-white/50">查看流动性挖矿订单状态、收益和赎回操作。</p>
          </div>
          <RouterLink
            :to="`${prefix}/finance/liquidity`"
            class="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/20 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 transition hover:bg-white/10"
          >
            返回产品
          </RouterLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 pb-5 pt-[calc(4.75rem+env(safe-area-inset-top,0px))] sm:px-8 sm:pb-8 sm:pt-[calc(5.5rem+env(safe-area-inset-top,0px))] lg:px-10 lg:py-8">
      <FinanceLiquidityOrdersPanel />
    </main>
  </div>
</template>
