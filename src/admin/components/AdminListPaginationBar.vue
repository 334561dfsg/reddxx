<script setup>
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
		v-if="totalCount > 0"
		class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
	>
		<div class="flex flex-wrap items-center gap-2">
			<span class="text-slate-500">每页</span>
			<select
				:value="pageSize"
				class="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm outline-none"
				@change="$emit('update:pageSize', Number($event.target.value))"
			>
				<option :value="5">5</option>
				<option :value="10">10</option>
				<option :value="20">20</option>
				<option :value="50">50</option>
			</select>
			<span class="text-slate-500"
				>条，合计 <span class="font-medium tabular-nums text-slate-800">{{ totalCount }}</span> 条</span
			>
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
				:disabled="currentPage <= 1"
				@click="$emit('update:currentPage', currentPage - 1)"
			>
				上一页
			</button>
			<span class="tabular-nums text-slate-700">第 {{ currentPage }} / {{ totalPages }} 页</span>
			<button
				type="button"
				class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
				:disabled="currentPage >= totalPages"
				@click="$emit('update:currentPage', currentPage + 1)"
			>
				下一页
			</button>
		</div>
	</div>
</template>
