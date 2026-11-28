<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

defineOptions({ name: 'SidebarNode' })

const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  level: {
    type: Number,
    default: 0
  }
})

const route = useRoute()

const iconPaths = {
  dashboard: 'M4 4H9V9H4V4ZM11 4H16V9H11V4ZM4 11H9V16H4V11ZM11 11H16V16H11V11Z',
  contract: 'M5 3.8H12L15 6.8V16.2H5V3.8ZM12 3.8V6.8H15',
  delivery: 'M4 5.2H12V14.8H4V5.2ZM12 7.4H16V14.8H12',
  wallet: 'M4 6.2C4 5 5 4 6.2 4H14.2C15.4 4 16.4 5 16.4 6.2V13.8C16.4 15 15.4 16 14.2 16H6.2C5 16 4 15 4 13.8V6.2ZM12.6 10C12.6 10.7 13.2 11.3 13.9 11.3C14.6 11.3 15.2 10.7 15.2 10C15.2 9.3 14.6 8.7 13.9 8.7C13.2 8.7 12.6 9.3 12.6 10Z',
  droplet: 'M10 3.8C10 3.8 6 8.2 6 11.2C6 13.4 7.8 15.2 10 15.2C12.2 15.2 14 13.4 14 11.2C14 8.2 10 3.8 10 3.8Z',
  loan: 'M10 4C6.7 4 4 6.7 4 10C4 13.3 6.7 16 10 16C13.3 16 16 13.3 16 10C16 6.7 13.3 4 10 4ZM10 7V10M10 10V13M10 10H7M10 10H13',
  robot: 'M10 3.5V5.5M7 5.5H13C14.1 5.5 15 6.4 15 7.5V13.5C15 14.6 14.1 15.5 13 15.5H7C5.9 15.5 5 14.6 5 13.5V7.5C5 6.4 5.9 5.5 7 5.5ZM8 9.5V9.51M12 9.5V9.51M7.5 12.5H12.5',
  users: 'M7 8C8.1 8 9 7.1 9 6C9 4.9 8.1 4 7 4C5.9 4 5 4.9 5 6C5 7.1 5.9 8 7 8ZM13 8C14.1 8 15 7.1 15 6C15 4.9 14.1 4 13 4C11.9 4 11 4.9 11 6C11 7.1 11.9 8 13 8ZM7 9.5C5.3 9.5 2 10.4 2 12V13.5H12V12C12 10.4 8.7 9.5 7 9.5ZM13 9.5C12.8 9.5 12.5 9.5 12.2 9.6C13 10.2 13.5 11 13.5 12V13.5H18V12C18 10.4 14.7 9.5 13 9.5Z',
  'users-group': 'M5 7C5.55 7 6 6.55 6 6C6 5.45 5.55 5 5 5C4.45 5 4 5.45 4 6C4 6.55 4.45 7 5 7ZM10 7C10.55 7 11 6.55 11 6C11 5.45 10.55 5 10 5C9.45 5 9 5.45 9 6C9 6.55 9.45 7 10 7ZM15 7C15.55 7 16 6.55 16 6C16 5.45 15.55 5 15 5C14.45 5 14 5.45 14 6C14 6.55 14.45 7 15 7ZM5 8C3.9 8 2 8.5 2 9.5V11H8V9.5C8 8.5 6.1 8 5 8ZM10 8C8.9 8 7 8.5 7 9.5V11H13V9.5C13 8.5 11.1 8 10 8ZM15 8C13.9 8 12 8.5 12 9.5V11H18V9.5C18 8.5 16.1 8 15 8ZM3 13V14C3 14.55 3.45 15 4 15H6L7 16L8 15H10L11 16L12 15H14C14.55 15 15 14.55 15 14V13H3Z',
  vip: 'M10 3L6 8L10 16L14 8L10 3ZM6 8H14M8 10.5H12M9 13H11',
  heart: 'M10 15.6L4.9 10.6C3.6 9.3 3.6 7.2 4.9 5.9C6.2 4.6 8.3 4.6 9.6 5.9L10 6.3L10.4 5.9C11.7 4.6 13.8 4.6 15.1 5.9C16.4 7.2 16.4 9.3 15.1 10.6L10 15.6Z',
  spark: 'M10 3.8L11.8 8.2L16.2 10L11.8 11.8L10 16.2L8.2 11.8L3.8 10L8.2 8.2L10 3.8Z',
  swap: 'M4 7H15M15 7L12 4M15 7L12 10M16 13H5M5 13L8 10M5 13L8 16',
  exchange: 'M7 16L3 12M3 12L7 8M3 12H14C15.1 12 16 11.1 16 10V4M13 4L17 8M17 8L13 12M17 8H6C4.9 8 4 8.9 4 10',
  finance: 'M4 15.5H16M5.2 13V10.2M8.4 13V7.8M11.6 13V9.1M14.8 13V5.6M4.8 7.2L8.4 4.8L11.6 6.6L15.2 3.9',
  'customer-service': 'M16 11.5C16 13.4 14.4 15 12.5 15H8L4 17V7C4 5.3 5.3 4 7 4H13C14.7 4 16 5.3 16 7V11.5ZM7 9H7.01M10 9H10.01M13 9H13.01'
}

const hasChildren = computed(() => Array.isArray(props.item.children) && props.item.children.length > 0)

const matchTree = (node, path) => {
  if (node.path && node.path === path) return true
  if (!node.children) return false
  return node.children.some((child) => matchTree(child, path))
}

const isActive = computed(() => Boolean(props.item.path && route.path === props.item.path))
const hasActiveDescendant = computed(() => hasChildren.value && matchTree(props.item, route.path))
const isExpanded = ref(Boolean(props.item.defaultOpen || hasActiveDescendant.value))

watch(hasActiveDescendant, (next) => {
  if (next) isExpanded.value = true
})

const paddingLeft = computed(() => `${props.level * 18 + 12}px`)
const showIcon = computed(() => props.level === 0 && Boolean(props.item.icon))

const rowClass = computed(() => {
  if (isActive.value) return 'bg-antd-primary/10 text-antd-primary font-medium'
  if (hasActiveDescendant.value) return 'bg-slate-100/70 text-slate-900'
  return 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors'
})

const toggle = () => {
  if (hasChildren.value) isExpanded.value = !isExpanded.value
}
</script>

<template>
  <li>
    <RouterLink
      v-if="item.path && !hasChildren"
      :to="item.path"
      class="flex min-w-0 w-full items-center gap-2 rounded-md py-2 pr-2 text-sm transition"
      :class="rowClass"
      :style="{ paddingLeft }"
    >
      <svg v-if="showIcon" viewBox="0 0 20 20" class="h-4 w-4 shrink-0" fill="none">
        <path :d="iconPaths[item.icon]" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="min-w-0 truncate">{{ item.title }}</span>
    </RouterLink>

    <button
      v-else
      type="button"
      class="flex w-full items-center gap-2 rounded-md py-2 pr-2 text-sm transition"
      :class="rowClass"
      :style="{ paddingLeft }"
      @click="toggle"
    >
      <svg v-if="showIcon" viewBox="0 0 20 20" class="h-4 w-4 shrink-0" fill="none">
        <path :d="iconPaths[item.icon]" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
      <span class="min-w-0 flex-1 truncate text-left" :class="{ 'font-medium': level === 0 }">{{ item.title }}</span>
      <svg
        v-if="hasChildren"
        class="h-4 w-4 shrink-0 text-slate-400 transition"
        :class="{ 'rotate-90': isExpanded }"
        viewBox="0 0 20 20"
        fill="none"
      >
        <path d="M7 5L13 10L7 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <ul v-if="hasChildren && isExpanded" class="mt-0.5 space-y-0.5">
      <SidebarNode v-for="child in item.children" :key="child.title + (child.path || '')" :item="child" :level="level + 1" />
    </ul>
  </li>
</template>
