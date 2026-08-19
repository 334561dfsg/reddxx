import { defineStore } from 'pinia'

const SOUND_PREF_KEY = 'admin-notification-sound-enabled'

const safeLocalStorage = {
  get(key) {
    try {
      if (typeof localStorage === 'undefined') return null
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(key, value)
    } catch {
      /* ignore */
    }
  }
}

const readSoundPreference = () => safeLocalStorage.get(SOUND_PREF_KEY) !== 'off'

export const NOTIFICATION_CATEGORIES = Object.freeze([
  {
    key: 'deposit',
    label: '充值',
    section: '用户管理 / 入金审核',
    route: '/admin/users/deposit-orders',
    count: 3,
    tone: [880, 1175]
  },
  {
    key: 'withdraw',
    label: '提现',
    section: '用户管理 / 出金审核',
    route: '/admin/users/withdraw-audit',
    count: 2,
    tone: [740, 988]
  },
  {
    key: 'deposit-success',
    label: '充值成功',
    section: '资产管理 / 链上交易日志',
    route: '/admin/assets/address-logs',
    count: 4,
    tone: [988, 1319]
  },
  {
    key: 'mt-order',
    label: 'MT新交易订单',
    section: '合约场控面板',
    route: '/admin/contracts/panel',
    count: 5,
    tone: [659, 880]
  },
  {
    key: 'mt-position',
    label: 'MT 新增持仓',
    section: '永续合约 / 订单管理',
    route: '/admin/perpetual/orders',
    count: 6,
    tone: [622, 831]
  },
  {
    key: 'mt-close',
    label: 'MT 平仓',
    section: '永续合约 / 订单管理',
    route: '/admin/perpetual/orders',
    count: 1,
    tone: [587, 784]
  },
  {
    key: 'mt-login',
    label: 'MT 用户登录',
    section: '用户管理 / 用户操作日志',
    displayMode: 'dot',
    drawer: 'user-detail',
    userId: 'user_1004',
    tone: [523, 698]
  },
  {
    key: 'perpetual-order',
    label: '永续合约新交易订单',
    section: '永续合约 / 订单管理',
    route: '/admin/perpetual/orders',
    count: 8,
    tone: [784, 1047]
  },
  {
    key: 'delivery-order',
    label: '交割合约新交易订单',
    section: '交割合约 / 订单管理',
    route: '/admin/delivery/orders',
    count: 4,
    tone: [698, 932]
  },
  {
    key: 'verification',
    label: '认证',
    section: '会员管理 / 认证身份审核',
    route: '/admin/users/verification-audit',
    count: 2,
    tone: [831, 1109]
  }
])

const getInitialUnreadCount = (item) => (item.displayMode === 'dot' ? 1 : item.count)
const getUnreadWeight = (item) => (item.displayMode === 'dot' ? Math.min(item.unreadCount, 1) : item.unreadCount)

const makeInitialCategories = () =>
  NOTIFICATION_CATEGORIES.map((item) => ({
    ...item,
    unreadCount: getInitialUnreadCount(item),
    lastEventAt: '2026-08-04 09:30'
  }))

function getAudioContext() {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return null
  if (!window.__adminNotificationAudioContext) {
    window.__adminNotificationAudioContext = new AudioContextCtor()
  }
  return window.__adminNotificationAudioContext
}

function playTone(frequencies = [880, 1175]) {
  const ctx = getAudioContext()
  if (!ctx || ctx.state === 'suspended') return false

  const now = ctx.currentTime
  frequencies.slice(0, 2).forEach((frequency, index) => {
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.11)
    gain.gain.setValueAtTime(0.0001, now + index * 0.11)
    gain.gain.exponentialRampToValueAtTime(0.08, now + index * 0.11 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.11 + 0.1)
    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now + index * 0.11)
    oscillator.stop(now + index * 0.11 + 0.11)
  })
  return true
}

export const useAdminNotificationsStore = defineStore('adminNotifications', {
  state: () => ({
    categories: makeInitialCategories(),
    soundEnabled: readSoundPreference(),
    soundGuideNeeded: false,
    notificationCenterState: {
      notificationOwnerId: 'admin-shell-notification-center',
      deliveryChannelState: 'in-app',
      preferenceState: {
        soundEnabled: readSoundPreference(),
        commitMode: 'immediate-safe',
        preferenceVersion: 1
      },
      badgeState: {
        source: 'demo-admin-notification-store',
        refreshedAt: '2026-08-04 09:30',
        estimated: false
      },
      permissionBoundary: 'admin-shell-visible'
    }
  }),
  getters: {
    totalUnread(state) {
      return state.categories.reduce((sum, item) => sum + getUnreadWeight(item), 0)
    },
    hasUnread() {
      return this.totalUnread > 0
    },
    visibleCategories(state) {
      return state.categories.filter((item) => item.unreadCount > 0)
    }
  },
  actions: {
    setSoundEnabled(next) {
      this.soundEnabled = Boolean(next)
      if (!this.soundEnabled) this.soundGuideNeeded = false
      this.notificationCenterState.preferenceState = {
        ...this.notificationCenterState.preferenceState,
        soundEnabled: this.soundEnabled,
        preferenceVersion: this.notificationCenterState.preferenceState.preferenceVersion + 1
      }
      safeLocalStorage.set(SOUND_PREF_KEY, this.soundEnabled ? 'on' : 'off')
    },
    toggleSound() {
      this.setSoundEnabled(!this.soundEnabled)
    },
    markCategoryRead(key) {
      const category = this.categories.find((item) => item.key === key)
      if (!category) return
      category.unreadCount = 0
      this.notificationCenterState.badgeState = {
        ...this.notificationCenterState.badgeState,
        refreshedAt: '2026-08-04 09:30'
      }
    },
    receiveNotification(key, count = 1) {
      const category = this.categories.find((item) => item.key === key)
      if (!category) return
      if (category.displayMode === 'dot') {
        category.unreadCount = 1
      } else {
        category.unreadCount += Number.isFinite(Number(count)) ? Math.max(1, Number(count)) : 1
      }
      category.lastEventAt = '2026-08-04 09:30'
      this.notificationCenterState.badgeState = {
        ...this.notificationCenterState.badgeState,
        refreshedAt: category.lastEventAt
      }
      if (this.soundEnabled) {
        this.soundGuideNeeded = !playTone(category.tone)
      }
    },
    playRefreshTestSound() {
      if (!this.soundEnabled) return
      this.soundGuideNeeded = !playTone([880, 1175])
    },
    dismissSoundGuideNotice() {
      this.soundGuideNeeded = false
    }
  }
})
