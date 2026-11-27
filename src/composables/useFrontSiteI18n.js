import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSiteConfigSnapshot } from '../admin/mock/siteConfig'
import { FRONT_LOCALE_CATALOG, PHONE_DIAL_PRESETS } from '../admin/constants/i18nCatalog'

/** 与 FrontTopNav 共用：语言偏好存于 localStorage，与站点配置联动 */
export const FRONT_LANG_STORAGE_KEY = 'fex-front-locale-pref-v1'

const DEFAULT_DIAL_CODES = ['+86']

const siteConfigRevision = ref(0)

export function bumpFrontSiteI18n() {
  siteConfigRevision.value += 1
}

/**
 * 根据站点配置与 localStorage 解析当前前台语言 code
 */
export function resolveFrontLocalePreference() {
  const snap = getSiteConfigSnapshot()
  if (snap.languageSettingsEnabled === false) {
    return 'zh-CN'
  }
  const list = snap.i18n?.enabledLocales
  const available = Array.isArray(list) && list.length ? list : ['zh-CN']
  const def = snap.i18n?.defaultLocale
  const fallback = def && available.includes(def) ? def : available[0]
  try {
    const raw = localStorage.getItem(FRONT_LANG_STORAGE_KEY)
    const preferred = raw ? String(raw).trim() : ''
    if (preferred && available.includes(preferred)) return preferred
  } catch {
    /* ignore */
  }
  return fallback
}

function localeLabel(code) {
  const snap = getSiteConfigSnapshot()
  const catalog = localeCatalog(snap)
  return snap.i18n?.localeMetaOverrides?.[code]?.label || catalog.find((l) => l.code === code)?.label || code
}

function localeCatalog(siteConfig) {
  return [
    ...FRONT_LOCALE_CATALOG,
    ...(Array.isArray(siteConfig.customLocales) ? siteConfig.customLocales : []),
  ]
}

function dialCatalog(siteConfig) {
  return [
    ...PHONE_DIAL_PRESETS,
    ...(Array.isArray(siteConfig.customDialCodes) ? siteConfig.customDialCodes : []),
  ]
}

function resolveDialMeta(siteConfig, dial) {
  const base = dialCatalog(siteConfig).find((p) => p.dial === dial) || { dial, label: dial }
  const override = siteConfig.dialMetaOverrides?.[dial] || {}
  return {
    ...base,
    ...override,
    dial,
    label: override.label || base.label || dial,
    icon: override.icon || base.icon || '',
  }
}

export function useFrontSiteI18n() {
  const route = useRoute()
  const siteConfig = ref(getSiteConfigSnapshot())

  const refreshSiteConfig = () => {
    siteConfig.value = getSiteConfigSnapshot()
  }

  watch(
    () => route.fullPath,
    () => {
      refreshSiteConfig()
    },
  )

  watch(siteConfigRevision, () => {
    refreshSiteConfig()
  })

  const phoneLoginEnabled = computed(() => siteConfig.value.phoneLoginEnabled !== false)
  const languageSettingsEnabled = computed(() => siteConfig.value.languageSettingsEnabled !== false)

  const allowedDialPresets = computed(() => {
    const codes = phoneLoginEnabled.value
      ? (() => {
          const list = siteConfig.value.allowedDialCodes
          return Array.isArray(list) && list.length ? list : DEFAULT_DIAL_CODES
        })()
      : DEFAULT_DIAL_CODES
    const order = siteConfig.value.dialSortOrder || {}
    const catalog = dialCatalog(siteConfig.value)
    const sorted = [...codes].sort((a, b) => {
      const da = Number.isFinite(order[a]) ? order[a] : -Infinity
      const db = Number.isFinite(order[b]) ? order[b] : -Infinity
      if (da !== db) return db - da
      return catalog.findIndex((x) => x.dial === a) - catalog.findIndex((x) => x.dial === b)
    })
    return sorted.map((dial) => resolveDialMeta(siteConfig.value, dial))
  })

  const enabledLocales = computed(() => {
    if (!languageSettingsEnabled.value) {
      return ['zh-CN']
    }
    const list = siteConfig.value.i18n?.enabledLocales
    const base = Array.isArray(list) && list.length ? list : ['zh-CN']
    const order = siteConfig.value.i18n?.localeSortOrder || {}
    const catalog = localeCatalog(siteConfig.value)
    return [...base].sort((a, b) => {
      const da = Number.isFinite(order[a]) ? order[a] : -Infinity
      const db = Number.isFinite(order[b]) ? order[b] : -Infinity
      if (da !== db) return db - da
      return catalog.findIndex((x) => x.code === a) - catalog.findIndex((x) => x.code === b)
    })
  })

  const defaultLocale = computed(() => {
    if (!languageSettingsEnabled.value) {
      return 'zh-CN'
    }
    const d = siteConfig.value.i18n?.defaultLocale
    return enabledLocales.value.includes(d) ? d : enabledLocales.value[0]
  })

  const languageSwitcherEnabled = computed(() => {
    if (!languageSettingsEnabled.value) return false
    return siteConfig.value.i18n?.languageSwitcherEnabled !== false
  })

  const localeOptionsForNav = computed(() =>
    enabledLocales.value.map((code) => {
      const catalog = localeCatalog(siteConfig.value)
      const base = catalog.find((l) => l.code === code) || { code, label: code, short: code, icon: '' }
      const override = siteConfig.value.i18n?.localeMetaOverrides?.[code] || {}
      return {
        code,
        label: override.label || base.label || code,
        short: override.short || base.short || code,
        icon: override.icon || base.icon || '',
      }
    }),
  )

  return {
    siteConfig,
    refreshSiteConfig,
    phoneLoginEnabled,
    languageSettingsEnabled,
    allowedDialPresets,
    enabledLocales,
    defaultLocale,
    languageSwitcherEnabled,
    localeOptionsForNav,
  }
}
