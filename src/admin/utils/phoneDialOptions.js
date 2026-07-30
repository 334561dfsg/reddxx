import { PHONE_DIAL_PRESETS } from '../constants/i18nCatalog.js'
import { getSiteConfigSnapshot } from '../mock/siteConfig.js'

const DEFAULT_DIAL_CODES = ['+86']

const normalizeDial = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits ? `+${digits}` : ''
}

const dialDigits = (value) => normalizeDial(value).replace(/\D/g, '')
const isImageIcon = (icon) => {
  const value = String(icon || '').trim()
  return /^(https?:\/\/|data:image\/|\/)/i.test(value) || /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(value)
}
const isTextIcon = (icon) => {
  const value = String(icon || '').trim()
  return Boolean(value) && !isImageIcon(value) && Array.from(value).length <= 4
}

const dialCatalog = (siteConfig) => [
  ...PHONE_DIAL_PRESETS,
  ...(Array.isArray(siteConfig?.customDialCodes) ? siteConfig.customDialCodes : [])
]

const resolveDialMeta = (siteConfig, dial) => {
  const normalizedDial = normalizeDial(dial)
  const base = dialCatalog(siteConfig).find((item) => normalizeDial(item.dial) === normalizedDial) || {
    dial: normalizedDial,
    label: normalizedDial,
    icon: ''
  }
  const override = siteConfig?.dialMetaOverrides?.[normalizedDial] || {}
  return {
    ...base,
    ...override,
    dial: normalizedDial,
    label: override.label || base.label || normalizedDial,
    icon: override.icon || base.icon || ''
  }
}

export function getAllowedPhoneDialOptions(siteConfig = getSiteConfigSnapshot()) {
  const rawCodes = siteConfig?.phoneLoginEnabled === false
    ? DEFAULT_DIAL_CODES
    : Array.isArray(siteConfig?.allowedDialCodes) && siteConfig.allowedDialCodes.length
      ? siteConfig.allowedDialCodes
      : DEFAULT_DIAL_CODES
  const order = siteConfig?.dialSortOrder || {}
  const catalog = dialCatalog(siteConfig)
  const codes = Array.from(new Set(rawCodes.map(normalizeDial).filter(Boolean)))
  return codes
    .sort((left, right) => {
      const leftOrder = Number.isFinite(order[left]) ? order[left] : 999999
      const rightOrder = Number.isFinite(order[right]) ? order[right] : 999999
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      const leftIndex = catalog.findIndex((item) => normalizeDial(item.dial) === left)
      const rightIndex = catalog.findIndex((item) => normalizeDial(item.dial) === right)
      return (leftIndex < 0 ? 999999 : leftIndex) - (rightIndex < 0 ? 999999 : rightIndex)
    })
    .map((dial) => resolveDialMeta(siteConfig, dial))
}

export function getPhoneDialTextLabel(option) {
  const label = option?.label || option?.dial || ''
  const icon = String(option?.icon || '').trim()
  return isTextIcon(icon) ? `${icon} ${label}` : label
}

export function splitPhoneByDial(phone, dialOptions = getAllowedPhoneDialOptions()) {
  const digits = String(phone ?? '').replace(/\D/g, '')
  const fallbackDial = dialOptions[0]?.dial || '+86'
  if (!digits) return { dial: fallbackDial, nationalDigits: '' }
  const matched = [...dialOptions]
    .sort((left, right) => dialDigits(right.dial).length - dialDigits(left.dial).length)
    .find((option) => {
      const prefix = dialDigits(option.dial)
      return prefix && digits.startsWith(prefix)
    })
  if (!matched) return { dial: fallbackDial, nationalDigits: digits }
  return {
    dial: matched.dial,
    nationalDigits: digits.slice(dialDigits(matched.dial).length)
  }
}

export function composePhoneFromDial(dial, nationalDigits) {
  const digits = String(nationalDigits ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return `${dialDigits(dial)}${digits}`
}
