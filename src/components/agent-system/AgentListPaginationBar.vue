<script setup>
import SelectOnlyCombobox from '../../admin/components/form/SelectOnlyCombobox.vue'
defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalCount: { type: Number, required: true },
  pageSize: { type: Number, required: true }
})

defineEmits(['update:currentPage', 'update:pageSize'])
</script>

<template>
  <div
    class="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.07] bg-gradient-to-b from-white/[0.03] to-transparent px-5 py-3.5 text-xs text-white/50"
  >
    <span>共 <span class="tabular-nums font-medium text-white/75">{{ totalCount }}</span> 条</span>
    <div class="flex flex-wrap items-center gap-2.5">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-medium uppercase tracking-wider text-white/35">每页</span>
        <SelectOnlyCombobox
          :model-value="pageSize"
          theme="agent"
          label="每页条数"
          hide-label
          class="w-20"
          :options="[5, 10, 20, 50].map(value => ({ value, label: String(value) }))"
          @update:model-value="$emit('update:pageSize', $event)"
        />
      </div>
      <button
        type="button"
        class="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition hover:border-emerald-500/25 hover:bg-emerald-500/[0.08] hover:text-emerald-50 disabled:cursor-not-allowed disabled:opacity-35"
        :disabled="currentPage <= 1"
        @click="$emit('update:currentPage', currentPage - 1)"
      >
        上一页
      </button>
      <span class="tabular-nums text-[11px] font-medium text-white/60">第 {{ currentPage }} / {{ totalPages }} 页</span>
      <button
        type="button"
        class="rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition hover:border-emerald-500/25 hover:bg-emerald-500/[0.08] hover:text-emerald-50 disabled:cursor-not-allowed disabled:opacity-35"
        :disabled="currentPage >= totalPages"
        @click="$emit('update:currentPage', currentPage + 1)"
      >
        下一页
      </button>
    </div>
  </div>
</template>
