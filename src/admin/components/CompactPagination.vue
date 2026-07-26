<script setup>
import { computed } from 'vue'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalCount: { type: Number, required: true },
  pageSize: { type: Number, default: 10 },
  alwaysShowNavigation: { type: Boolean, default: false }
})

const emit = defineEmits(['update:currentPage'])

const safePageSize = computed(() => (
  Number.isFinite(props.pageSize) && props.pageSize > 0 ? Math.max(1, Math.trunc(props.pageSize)) : 10
))

const totalPages = computed(() => Math.max(1, Math.ceil(Math.max(0, props.totalCount) / safePageSize.value)))

const page = computed(() => {
  const requestedPage = Number.isFinite(props.currentPage) ? Math.trunc(props.currentPage) : 1
  return Math.min(totalPages.value, Math.max(1, requestedPage))
})

const pageButtons = computed(() => {
  const windowSize = Math.min(5, totalPages.value)
  const start = Math.min(
    Math.max(1, page.value - Math.floor(windowSize / 2)),
    totalPages.value - windowSize + 1
  )

  return Array.from({ length: windowSize }, (_, index) => start + index)
})

const goToPage = (requestedPage) => {
  const integerPage = Number.isFinite(requestedPage) ? Math.trunc(requestedPage) : 1
  emit('update:currentPage', Math.min(totalPages.value, Math.max(1, integerPage)))
}
</script>

<template>
  <div class="flex min-w-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 sm:px-4">
    <span data-testid="compact-pagination-summary" class="min-w-0 break-words tabular-nums text-slate-700">
      共 {{ totalCount }} 条 · 第 {{ page }} / {{ totalPages }} 页
    </span>

    <nav v-if="alwaysShowNavigation || totalPages > 1" class="flex w-full min-w-0 flex-wrap items-center justify-center gap-1 sm:w-auto sm:justify-end" aria-label="分页导航">
      <button
        type="button"
        class="min-h-10 rounded-lg border border-slate-200 px-2 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
        :disabled="page <= 1"
        @click="goToPage(page - 1)"
      >
        上一页
      </button>
      <button
        v-for="pageNumber in pageButtons"
        :key="pageNumber"
        type="button"
        class="min-h-10 min-w-9 rounded-lg border px-2 py-1.5 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-3"
        :class="pageNumber === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 text-slate-700 hover:bg-slate-50'"
        :aria-current="pageNumber === page ? 'page' : undefined"
        :aria-label="`第 ${pageNumber} 页`"
        @click="goToPage(pageNumber)"
      >
        {{ pageNumber }}
      </button>
      <button
        type="button"
        class="min-h-10 rounded-lg border border-slate-200 px-2 py-1.5 font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3"
        :disabled="page >= totalPages"
        @click="goToPage(page + 1)"
      >
        下一页
      </button>
    </nav>
  </div>
</template>
