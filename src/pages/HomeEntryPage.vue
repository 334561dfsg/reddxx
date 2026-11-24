<template>
  <div class="min-h-screen bg-[#050505] px-6 py-10 text-white">
    <div class="mx-auto max-w-5xl">
      <h1 class="text-3xl font-semibold">选择入口</h1>
      <p class="mt-2 text-sm text-white/60">
        选择管理台、响应式前台、代理系统，或独立的 NewQuantCapital 网站原型。
      </p>

      <div class="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <RouterLink
          to="/admin"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-lime-300/40 hover:bg-lime-300/10"
        >
          <div class="text-xl font-semibold">管理台</div>
          <div class="mt-2 text-sm text-white/65">后台运营与风控管理</div>
        </RouterLink>

        <RouterLink
          to="/front/home"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-lime-300/40 hover:bg-lime-300/10"
        >
          <div class="text-xl font-semibold">前台</div>
          <div class="mt-2 text-sm text-white/65">行情、资产、交易与个人中心（含移动端布局）</div>
        </RouterLink>

        <RouterLink
          to="/agent-system/dashboard"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-emerald-400/35 hover:bg-emerald-500/10"
        >
          <div class="text-xl font-semibold">代理系统</div>
          <div class="mt-2 text-sm text-white/65">由后台对注册用户开通代理后登录；数据、审核与佣金</div>
        </RouterLink>
        <a
          href="/newtrend/zh-TW/"
          class="rounded-2xl border border-white/10 bg-white/[0.04] p-6 transition hover:border-lime-300/40 hover:bg-lime-300/10"
        >
          <div class="text-xl font-semibold">NewQuantCapital</div>
          <div class="mt-2 text-sm text-white/65">独立网站原型 · 多语言、新闻与账户中心</div>
        </a>
      </div>
    </div>
  </div>
</template>
