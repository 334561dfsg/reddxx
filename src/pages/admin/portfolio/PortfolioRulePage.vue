<template>
  <section class="space-y-6">
    <header>
      <h1 class="text-3xl font-semibold text-slate-900">投资组合规则说明</h1>
      <p class="mt-1 text-sm text-slate-500">给运营人员查看产品逻辑、公式和提前赎回配置含义</p>
    </header>

    <article class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-slate-900">产品定位</h2>
      <p class="mt-3 text-sm leading-7 text-slate-600">
        投资组合是固定期限收益产品。用户以 USDT 申购一个多币种组合，平台展示组合币种、运行周期、收益区间、手续费和提前赎回规则。本期前端仅使用 mock 数据模拟，不执行真实调仓或钱包扣款。
      </p>
    </article>

    <article class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-slate-900">收益与手续费公式</h2>
      <div class="mt-4 space-y-3 rounded-lg bg-slate-50 p-4 font-mono text-sm text-slate-700">
        <p>最低收益 = 申购金额 × 最低日收益率 / 100 × 运行天数</p>
        <p>最高收益 = 申购金额 × 最高日收益率 / 100 × 运行天数</p>
        <p>手续费 = 申购金额 × 认购手续费率 / 100</p>
        <p>预计到账 = 申购金额 + 预估收益 - 手续费</p>
      </div>
      <p class="mt-4 text-sm text-slate-600">例如申购 1000 USDT，周期 3 天，日收益 0.20% - 0.60%，手续费 0.30%，预计收益为 6 - 18 USDT，手续费 3 USDT。</p>
    </article>

    <article class="rounded-xl border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-semibold text-slate-900">提前赎回配置</h2>
      <div class="mt-4 grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-slate-200 p-4">
          <h3 class="font-semibold text-slate-900">扣除全部收益</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">提前赎回只返还本金，并扣除提前赎回手续费。</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <h3 class="font-semibold text-slate-900">保留收益扣手续费</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">保留已产生收益，额外扣除提前赎回手续费。</p>
        </div>
        <div class="rounded-lg border border-slate-200 p-4">
          <h3 class="font-semibold text-slate-900">按持有天数计息</h3>
          <p class="mt-2 text-sm leading-6 text-slate-600">按实际持有天数计算收益，再扣除提前赎回手续费。</p>
        </div>
      </div>
    </article>
  </section>
</template>
