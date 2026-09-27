<script setup>
import { Pagination } from 'ant-design-vue'
defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalCount: { type: Number, required: true },
  pageSize: { type: Number, required: true }
})
const emit = defineEmits(['update:currentPage', 'update:pageSize'])
function change(page, size, currentSize) {
  if (size !== currentSize) emit('update:pageSize', size)
  else emit('update:currentPage', page)
}
</script>

<template>
  <div v-if="totalCount > 0" class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
    <span>合计 {{ totalCount }} 条 · 第 {{ currentPage }} / {{ totalPages }} 页</span>
    <Pagination
      size="small"
      :current="currentPage"
      :total="totalCount"
      :page-size="pageSize"
      :page-size-options="['5', '10', '20', '50']"
      show-size-changer
      :show-less-items="true"
      aria-label="分页导航"
      @change="(page, size) => change(page, size, pageSize)"
    />
  </div>
</template>
