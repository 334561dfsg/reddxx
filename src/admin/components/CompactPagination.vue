<script setup>
import { Pagination } from 'ant-design-vue'

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

    <nav v-if="alwaysShowNavigation || totalPages > 1" class="flex w-full min-w-0 flex-wrap justify-end sm:w-auto" aria-label="分页导航">
    <Pagination
      size="small"
      :current="page"
      :total="Math.max(0, totalCount)"
      :page-size="safePageSize"
      :show-size-changer="false"
      :show-less-items="true"
      class="flex flex-wrap"
      @change="goToPage"
    />
    </nav>
  </div>
</template>
