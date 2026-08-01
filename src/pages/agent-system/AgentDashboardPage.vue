<script setup>
import { ref, computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { agentDashboardSummary, buildAgentInviteLink } from '../../admin/mock/agentPortal'
import { agentSettlementApi } from '../../admin/mock/agentSettlement'
import { agentPortalSettlementHeadline } from '../../admin/constants/agentSettlement'
import { useAgentAuthStore } from '../../stores/agentAuth'

const auth = useAgentAuthStore()
const s = agentDashboardSummary
const periodSummary = ref(null)

const agentInviteLink = computed(() => buildAgentInviteLink(auth.inviteCode))

function copyAgentText(text) {
  if (!text) return
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {})
  }
}

onMounted(async () => {
  const res = await agentSettlementApi.getCurrentPeriodSummary(auth.uid)
  if (res.success) periodSummary.value = res.data
})

const settlementSubline = computed(() => {
  const p = periodSummary.value
  if (!p?.status) return `${s.settlementStatus} · ${s.nextSettlementDate}`
  return `${agentPortalSettlementHeadline(p.status)} · ${p.period} 账期 · 预计 ${p.nextSettlementDate}`
})
</script>

<template>
  <div class="space-y-6">
    <p class="text-sm text-white/55 md:hidden">{{ auth.nickname }} · UID {{ auth.uid }}</p>

    <section
      class="agent-overview-card overflow-hidden rounded-2xl border border-white/[0.07] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] ring-1 ring-emerald-950/30"
    >
      <header
        class="flex items-start justify-between gap-3 border-b border-white/[0.06] bg-gradient-to-r from-[#0c1219] via-[#0a1418] to-[#0c1219] px-5 py-4"
      >
        <div>
          <div class="flex items-center gap-2">
            <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.35)]" aria-hidden="true" />
            <h2 class="text-sm font-semibold tracking-wide text-white">概览</h2>
          </div>
          <p class="mt-1 pl-3.5 text-xs leading-relaxed text-white/42">本月数据、直邀推广与待办</p>
        </div>
      </header>
      <div class="space-y-6 p-5">
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.1]">
            <p class="text-[11px] font-medium uppercase tracking-wider text-white/38">本月预估佣金</p>
            <p class="mt-2 text-2xl font-semibold tabular-nums text-emerald-300">
              {{ s.monthCommission.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
              <span class="text-sm font-normal text-white/40">USDT</span>
            </p>
            <p class="mt-2 border-t border-white/[0.05] pt-2 text-[11px] leading-snug text-white/35">{{ settlementSubline }}</p>
          </div>
          <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.1]">
            <p class="text-[11px] font-medium uppercase tracking-wider text-white/38">本月直邀交易量</p>
            <p class="mt-2 text-2xl font-semibold tabular-nums text-white">
              {{ s.monthVolume.toLocaleString('zh-CN') }}
              <span class="text-sm font-normal text-white/40">{{ s.monthVolumeUnit }}</span>
            </p>
          </div>
          <div class="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 transition hover:border-white/[0.1]">
            <p class="text-[11px] font-medium uppercase tracking-wider text-white/38">待审核认证</p>
            <p class="mt-2 text-2xl font-semibold tabular-nums text-amber-200">{{ s.pendingKyc }}</p>
            <RouterLink
              to="/agent-system/verification-audit"
              class="mt-3 inline-flex text-xs font-medium text-emerald-400/95 hover:text-emerald-300 hover:underline"
            >
              去处理 →
            </RouterLink>
          </div>
        </div>

        <div
          v-if="auth.inviteCode"
          class="rounded-xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.07] to-emerald-950/[0.12] p-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] md:p-5"
        >
          <h3 class="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/90">代理推广</h3>
          <p class="mt-2 max-w-2xl text-xs leading-relaxed text-white/48">
            将推广码或链接发给好友；对方在注册流程中使用后，即记为您的直邀用户（与「团队管理」一致）。
          </p>
          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div class="min-w-0 flex-1">
              <label class="text-[11px] font-medium text-white/40">代理推广码</label>
              <p
                class="mt-1.5 rounded-lg border border-emerald-500/25 bg-[#080d11] px-3 py-2.5 font-mono text-base font-semibold tracking-wide text-emerald-200 shadow-inner"
              >
                {{ auth.inviteCode }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-emerald-950/40 transition hover:bg-emerald-500 sm:shrink-0"
              @click="copyAgentText(auth.inviteCode)"
            >
              复制推广码
            </button>
          </div>
          <div class="mt-4">
            <label class="text-[11px] font-medium text-white/40">代理邀请链接</label>
            <div class="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-stretch sm:gap-3">
              <p
                class="flex min-h-[2.75rem] min-w-0 flex-1 items-center break-all rounded-lg border border-white/10 bg-[#080d11] px-3 py-2.5 text-xs leading-relaxed text-white/60"
              >
                {{ agentInviteLink }}
              </p>
              <button
                type="button"
                class="rounded-lg border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/88 transition hover:border-emerald-500/30 hover:bg-white/[0.1] sm:w-auto sm:shrink-0"
                @click="copyAgentText(agentInviteLink)"
              >
                复制链接
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 shadow-[0_8px_28px_-14px_rgba(0,0,0,0.45)]">
      <h2 class="text-sm font-semibold text-white">快捷入口</h2>
      <ul class="mt-3 space-y-2 text-sm">
        <li>
          <RouterLink class="text-emerald-300/95 hover:underline" to="/agent-system/data-query">数据查询 · 按日期与产品线检索业绩</RouterLink>
        </li>
        <li>
          <RouterLink class="text-emerald-300/95 hover:underline" to="/agent-system/daily-report">数据日报 · 按日交易与佣金</RouterLink>
        </li>
        <li>
          <RouterLink class="text-emerald-300/95 hover:underline" to="/agent-system/commission-rates">记佣比例 · 各产品线一级比例</RouterLink>
        </li>
        <li>
          <RouterLink class="text-emerald-300/95 hover:underline" to="/agent-system/commission">佣金结算 · 账期、进度与入账</RouterLink>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 概览外框：深色底 + 顶部轻微翠色光晕，避免与页面背景糊成一片 */
.agent-overview-card {
  background-color: #0c1219;
  background-image: radial-gradient(ellipse 100% 72% at 50% -32%, rgba(52, 211, 153, 0.1), transparent 52%);
}
</style>
