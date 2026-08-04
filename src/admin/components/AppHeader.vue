<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AdminChangePasswordDialog from './AdminChangePasswordDialog.vue'
import AdminSoundGuideDialog from './AdminSoundGuideDialog.vue'
import MfaVerificationModal from './MfaVerificationModal.vue'
import { useAdminAccountStore } from '../stores/adminAccount'
import { useAdminNotificationsStore } from '../stores/adminNotifications'

const emit = defineEmits(['toggle-menu'])

const route = useRoute()
const router = useRouter()
const adminAccount = useAdminAccountStore()
const notifications = useAdminNotificationsStore()
const triggerRef = ref(null)
const menuRef = ref(null)
const menuOpen = ref(false)
const accountTriggerRef = ref(null)
const accountMenuRef = ref(null)
const accountMenuOpen = ref(false)
const changePasswordOpen = ref(false)
const soundGuideOpen = ref(false)
const soundGuideTriggerRef = ref(null)
const pendingPasswordChange = ref(null)
const passwordMfaOpen = ref(false)
const passwordMfaLoading = ref(false)
const passwordMfaError = ref('')
const passwordMfaErrorAttempt = ref(0)
let refreshSoundTimer = null

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

const closeAccountMenu = ({ returnFocus = false } = {}) => {
  if (!accountMenuOpen.value) return
  accountMenuOpen.value = false
  if (returnFocus) accountTriggerRef.value?.focus()
}

const toggleMenu = () => {
  const next = !menuOpen.value
  closeAccountMenu()
  menuOpen.value = next
}

const openCategory = async (category) => {
  notifications.markCategoryRead(category.key)
  closeMenu()
  if (route.path !== category.route) await router.push(category.route)
}

const toggleAccountMenu = () => {
  const next = !accountMenuOpen.value
  closeMenu()
  accountMenuOpen.value = next
}

const openChangePasswordDialog = () => {
  closeAccountMenu()
  passwordMfaError.value = ''
  pendingPasswordChange.value = null
  changePasswordOpen.value = true
}

const logout = async () => {
  closeAccountMenu()
  await router.push('/')
}

const resolveAccountReturnFocus = () => accountTriggerRef.value

const resolvePasswordMfaReturnFocus = () => pendingPasswordChange.value?.returnFocus || accountTriggerRef.value

const requestPasswordMfa = (payload) => {
  pendingPasswordChange.value = payload
  passwordMfaError.value = ''
  passwordMfaOpen.value = true
}

const verifyPasswordMfa = async (code) => {
  if (!pendingPasswordChange.value || passwordMfaLoading.value) return
  passwordMfaLoading.value = true
  passwordMfaError.value = ''

  try {
    await new Promise((resolve) => setTimeout(resolve, 400))
    adminAccount.changePassword({
      currentPassword: pendingPasswordChange.value.currentPassword,
      newPassword: pendingPasswordChange.value.newPassword,
      mfaCode: code
    })
    passwordMfaOpen.value = false
    changePasswordOpen.value = false
    pendingPasswordChange.value = null
  } catch (error) {
    passwordMfaError.value = error instanceof Error ? error.message : '修改密码失败，请稍后重试'
    passwordMfaErrorAttempt.value += 1
  } finally {
    passwordMfaLoading.value = false
  }
}

const cancelPasswordMfa = () => {
  if (passwordMfaLoading.value) return
  passwordMfaOpen.value = false
  passwordMfaError.value = ''
  pendingPasswordChange.value = null
}

const onSoundChange = (event) => {
  notifications.setSoundEnabled(event.target.checked)
}

const openSoundGuide = () => {
  notifications.dismissSoundGuideNotice()
  closeMenu()
  closeAccountMenu()
  soundGuideOpen.value = true
}

const handleSoundGuideOpenChange = (nextOpen) => {
  soundGuideOpen.value = nextOpen
  if (!nextOpen) notifications.dismissSoundGuideNotice()
}

const resolveSoundGuideReturnFocus = () => soundGuideTriggerRef.value || triggerRef.value

const onDocumentPointerDown = (event) => {
  const target = event.target
  if (
    menuOpen.value &&
    !triggerRef.value?.contains(target) &&
    !menuRef.value?.contains(target)
  ) {
    closeMenu()
  }
  if (
    accountMenuOpen.value &&
    !accountTriggerRef.value?.contains(target) &&
    !accountMenuRef.value?.contains(target)
  ) {
    closeAccountMenu()
  }
}

const onDocumentKeydown = (event) => {
  if (event.key !== 'Escape') return
  closeMenu({ returnFocus: true })
  closeAccountMenu({ returnFocus: true })
}

const onIncomingNotification = (event) => {
  notifications.receiveNotification(event.detail?.key, event.detail?.count)
}

const clearRefreshSoundTimer = () => {
  if (!refreshSoundTimer) return
  window.clearTimeout(refreshSoundTimer)
  refreshSoundTimer = null
}

const scheduleRefreshSoundTest = () => {
  clearRefreshSoundTimer()
  refreshSoundTimer = window.setTimeout(() => {
    refreshSoundTimer = null
    notifications.playRefreshTestSound()
  }, 1500)
}

const onWindowLoad = () => {
  scheduleRefreshSoundTest()
}

watch(
  () => route.fullPath,
  () => {
    closeMenu()
    closeAccountMenu()
    changePasswordOpen.value = false
    soundGuideOpen.value = false
    notifications.dismissSoundGuideNotice()
    passwordMfaOpen.value = false
    pendingPasswordChange.value = null
  }
)

watch(
  () => notifications.soundGuideNeeded,
  (needed) => {
    if (!needed || soundGuideOpen.value) return
    closeMenu()
    closeAccountMenu()
    soundGuideOpen.value = true
  }
)

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('admin-notification-received', onIncomingNotification)
  if (document.readyState === 'complete') scheduleRefreshSoundTest()
  else window.addEventListener('load', onWindowLoad, { once: true })
})

onUnmounted(() => {
  clearRefreshSoundTimer()
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('admin-notification-received', onIncomingNotification)
  window.removeEventListener('load', onWindowLoad)
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
            <span class="relative inline-flex h-7 w-12 shrink-0 items-center">
              <input
                type="checkbox"
                role="switch"
                class="peer sr-only"
                :checked="notifications.soundEnabled"
                aria-label="消息提示音"
                @change="onSoundChange"
              />
              <span
                aria-hidden="true"
                class="h-6 w-11 rounded-full bg-slate-200 transition-colors peer-checked:bg-antd-primary peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-antd-primary/40"
              ></span>
              <span
                aria-hidden="true"
                class="pointer-events-none absolute left-0.5 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"
              ></span>
            </span>
          </label>

          <div class="border-t border-slate-100 px-4 py-3">
            <button
              ref="soundGuideTriggerRef"
              type="button"
              role="menuitem"
              class="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
              @click="openSoundGuide"
            >
              <span class="min-w-0">
                <span class="block font-medium text-slate-900">刷新后没有声音？</span>
                <span class="mt-0.5 block break-words text-xs text-slate-500">查看 Chrome 允许播放声音设置</span>
              </span>
              <svg viewBox="0 0 20 20" class="h-4 w-4 shrink-0 text-slate-400" fill="none" aria-hidden="true">
                <path d="M7.5 4.5L12.5 10L7.5 15.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div class="relative">
        <button
          ref="accountTriggerRef"
          type="button"
          class="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-antd-primary/30"
          aria-label="Admin 账号菜单"
          aria-haspopup="menu"
          aria-controls="admin-account-menu"
          :aria-expanded="accountMenuOpen ? 'true' : 'false'"
          @click="toggleAccountMenu"
        >
          <span class="grid h-6 w-6 place-items-center rounded-full bg-antd-primary/10 text-xs font-bold text-antd-primary">
            AD
          </span>
          <span class="text-sm text-black/65">Admin</span>
          <svg viewBox="0 0 20 20" class="h-4 w-4 text-black/35" fill="none" aria-hidden="true">
            <path d="M6 8L10 12L14 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div
          v-if="accountMenuOpen"
          id="admin-account-menu"
          ref="accountMenuRef"
          role="menu"
          aria-label="Admin 账号操作"
          class="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-slate-700 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
            @click="openChangePasswordDialog"
          >
            <svg viewBox="0 0 20 20" class="h-4 w-4 text-slate-400" fill="none" aria-hidden="true">
              <path d="M6.5 8V6.8C6.5 4.9 8 3.5 10 3.5C12 3.5 13.5 4.9 13.5 6.8V8M5.5 8H14.5V15.5H5.5V8ZM10 11V12.8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>修改密码</span>
          </button>
          <button
            type="button"
            role="menuitem"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-600 transition hover:bg-rose-50 focus:bg-rose-50 focus:outline-none"
            @click="logout"
          >
            <svg viewBox="0 0 20 20" class="h-4 w-4 text-rose-400" fill="none" aria-hidden="true">
              <path d="M8 4.5H5.5V15.5H8M11 7L14 10M14 10L11 13M14 10H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  </header>

  <AdminChangePasswordDialog
    v-model:open="changePasswordOpen"
    :saving="passwordMfaLoading"
    :submit-error="passwordMfaError"
    :return-focus="resolveAccountReturnFocus"
    @request-mfa="requestPasswordMfa"
  />

  <AdminSoundGuideDialog
    :open="soundGuideOpen"
    :return-focus="resolveSoundGuideReturnFocus"
    @update:open="handleSoundGuideOpenChange"
  />

  <MfaVerificationModal
    v-model:open="passwordMfaOpen"
    :loading="passwordMfaLoading"
    :error="passwordMfaError"
    :error-attempt="passwordMfaErrorAttempt"
    :return-focus="resolvePasswordMfaReturnFocus"
    title="修改登录密码安全验证"
    description="修改后台登录密码属于敏感操作，请输入 MFA 验证码"
    @verify="verifyPasswordMfa"
    @cancel="cancelPasswordMfa"
  />
</template>
