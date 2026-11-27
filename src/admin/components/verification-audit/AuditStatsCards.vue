<script setup>
import { computed } from 'vue'

const props = defineProps({
  statistics: {
    type: Array,
    default: () => []
  },
  /** admin：管理后台浅色；agent：代理系统深色 */
  variant: {
    type: String,
    default: 'admin'
  }
})

const isAgent = computed(() => props.variant === 'agent')

function agentValueClass(color) {
  const map = {
    blue: 'bg-gradient-to-br from-emerald-200 to-emerald-400/90 bg-clip-text text-transparent',
    emerald: 'bg-gradient-to-br from-emerald-100 to-emerald-300/95 bg-clip-text text-transparent',
    rose: 'bg-gradient-to-br from-rose-100 to-rose-300/90 bg-clip-text text-transparent',
    gray: 'text-white'
  }
  return map[color] || 'text-white'
}

/** 卡片顶部微光条 */
function agentGlowClass(color) {
  const map = {
    blue: 'from-emerald-400/70 via-emerald-300/30 to-transparent',
    emerald: 'from-emerald-300/80 via-teal-400/25 to-transparent',
    rose: 'from-rose-400/70 via-rose-300/25 to-transparent',
    gray: 'from-white/35 via-white/10 to-transparent'
  }
  return map[color] || 'from-white/25 to-transparent'
}
</script>

<template>
  <div
    :class="
      isAgent
        ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4'
    "
  >
    <div
      v-for="stat in statistics"
      :key="stat.label"
      :class="
        isAgent
          ? 'group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.07] to-white/[0.02] px-5 py-4 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06),0_8px_24px_-8px_rgba(0,0,0,0.45)] transition duration-300 hover:border-emerald-500/20 hover:from-white/[0.09] hover:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08),0_12px_32px_-10px_rgba(16,185,129,0.12)]'
          : 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'
      "
    >
      <div
        v-if="isAgent"
        class="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r opacity-90"
        :class="agentGlowClass(stat.color)"
        aria-hidden="true"
      />
      <p
        :class="
          isAgent
            ? 'text-[11px] font-medium uppercase tracking-[0.14em] text-white/40'
            : 'text-sm text-slate-600'
        "
      >
        {{ stat.label }}
      </p>
      <p
        v-if="isAgent"
        :class="[
          'mt-2 inline-block min-h-[2.25rem] text-3xl font-semibold tabular-nums tracking-tight',
          agentValueClass(stat.color)
        ]"
      >
        {{ stat.value }}
      </p>
      <p v-else :class="`mt-2 text-2xl font-bold text-${stat.color}-600`">{{ stat.value }}</p>
      <p
        :class="
          isAgent
            ? 'mt-1.5 text-[11px] leading-snug text-white/38'
            : 'mt-1 text-xs text-slate-500'
        "
      >
        {{ stat.trend }}
      </p>
    </div>
  </div>
</template>
