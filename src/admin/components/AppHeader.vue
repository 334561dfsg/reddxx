<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminNotificationsStore } from '../stores/adminNotifications'

const emit = defineEmits(['toggle-menu'])

const route = useRoute()
const router = useRouter()
const notifications = useAdminNotificationsStore()
const triggerRef = ref(null)
const menuRef = ref(null)
const menuOpen = ref(false)

const totalUnreadLabel = computed(() => {
  if (notifications.totalUnread > 99) return '99+'
  return String(notifications.totalUnread)
})

const notificationButtonLabel = computed(() =>
  notifications.hasUnread ? `消息通知，${notifications.totalUnread} 条未读` : '消息通知，暂无未读'
)

const closeMenu = ({ returnFocus = false } = {}) => {
  if (!menuOpen.value) return
  menuOpen.value = false
  if (returnFocus) triggerRef.value?.focus()
}

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const openCategory = async (category) => {
  notifications.markCategoryRead(category.key)
  closeMenu()
  if (route.path !== category.route) await router.push(category.route)
}

const onSoundChange = (event) => {
  notifications.setSoundEnabled(event.target.checked)
}

const onDocumentPointerDown = (event) => {
  if (!menuOpen.value) return
  const target = event.target
  if (triggerRef.value?.contains(target) || menuRef.value?.contains(target)) return
  closeMenu()
}

const onDocumentKeydown = (event) => {
  if (event.key !== 'Escape') return
  closeMenu({ returnFocus: true })
}

const onIncomingNotification = (event) => {
  notifications.receiveNotification(event.detail?.key, event.detail?.count)
}

watch(
  () => route.fullPath,
  () => closeMenu()
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('admin-notification-received', onIncomingNotification)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('admin-notification-received', onIncomingNotification)
})
</script>

<template>
  <header class="flex h-12 items-center justify-between border-b border-black/[0.06] bg-white px-4 md:px-6">
    <div class="flex items-center gap-3 text-sm text-black/45">
      <button
        type="button"
        class="rounded-md p-1.5 text-black/65 transition hover:bg-black/5 lg:hidden"
        aria-label="open menu"
        @click="emit('toggle-menu')"
      >
        <svg viewBox="0 0 20 20" class="h-5 w-5" fill="none">
          <path d="M3.5 5.5H16.5M3.5 10H16.5M3.5 14.5H16.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
      </button>
      <span class="hover:text-black/85 cursor-pointer transition-colors">首页</span>
      <span class="text-black/15">/</span>
      <span class="text-black/85">运营系统</span>
    </div>

    <div class="flex items-center gap-4 text-black/45">
      <div class="relative">
        <button
          ref="triggerRef"
          type="button"
          class="relative rounded-md p-1.5 transition hover:bg-black/5 hover:text-black/85 focus:outline-none focus:ring-2 focus:ring-antd-primary/30"
          :aria-label="notificationButtonLabel"
          aria-haspopup="menu"
          aria-controls="admin-notification-menu"
          :aria-expanded="menuOpen ? 'true' : 'false'"
          @click="toggleMenu"
        >
          <svg viewBox="0 0 20 20" class="h-5 w-5" fill="none" aria-hidden="true">
            <path d="M10 3.8C7.7 3.8 5.8 5.7 5.8 8V10.3L4.5 12.2V13H15.5V12.2L14.2 10.3V8C14.2 5.7 12.3 3.8 10 3.8Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M8.6 14.4C8.8 15.1 9.4 15.5 10 15.5C10.6 15.5 11.2 15.1 11.4 14.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <span
            v-if="notifications.hasUnread"
            class="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            aria-hidden="true"
          >
            {{ totalUnreadLabel }}
          </span>
        </button>

        <div
          v-if="menuOpen"
          id="admin-notification-menu"
          ref="menuRef"
          role="menu"
          aria-label="后台消息通知"
          class="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xl"
        >
          <div class="border-b border-slate-100 px-4 py-3">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-semibold text-slate-900">消息通知</p>
                <p class="mt-0.5 text-xs text-slate-500">共 {{ notifications.totalUnread }} 条未读</p>
              </div>
              <span
                class="rounded-full px-2 py-0.5 text-xs font-medium"
                :class="notifications.soundEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'"
              >
                {{ notifications.soundEnabled ? '声音开启' : '声音关闭' }}
              </span>
            </div>
          </div>

          <div class="max-h-[min(26rem,calc(100vh-9rem))] overflow-y-auto py-1 supports-[height:100dvh]:max-h-[min(26rem,calc(100dvh-9rem))]">
            <button
              v-for="category in notifications.visibleCategories"
              :key="category.key"
              type="button"
              role="menuitem"
              class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              @click="openCategory(category)"
            >
              <span class="min-w-0">
                <span class="block truncate text-sm font-medium text-slate-900">{{ category.label }}</span>
                <span class="mt-0.5 block truncate text-xs text-slate-500">{{ category.section }}</span>
              </span>
              <span class="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-rose-600">
                {{ category.unreadCount }}
              </span>
            </button>

            <div v-if="!notifications.visibleCategories.length" class="px-4 py-6 text-center text-sm text-slate-500">
              暂无未读消息
            </div>
          </div>

          <label class="flex cursor-pointer items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700">
            <span>
              <span class="block font-medium text-slate-900">消息提示音</span>
              <span class="mt-0.5 block text-xs text-slate-500">新消息到达时播放对应提示音</span>
            </span>
            <input
              type="checkbox"
              class="h-5 w-5 shrink-0 accent-antd-primary focus:outline-none focus:ring-2 focus:ring-antd-primary/30"
              :checked="notifications.soundEnabled"
              aria-label="消息提示音"
              @change="onSoundChange"
            />
          </label>
        </div>
      </div>
      <div class="flex items-center gap-2 px-2 py-1 cursor-pointer rounded-md hover:bg-black/5 transition-colors">
        <div class="h-6 w-6 rounded-full bg-antd-primary/10 text-antd-primary grid place-items-center text-xs font-bold">
          AD
        </div>
        <span class="text-sm text-black/65">Admin</span>
      </div>
    </div>
  </header>
</template>
