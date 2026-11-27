<script setup>
// 手动插线 — Ant Design Pro list page (2026-11-28): the combined code/name keyword box became query-card fields with
// explicit 查询/重置 (plus 手动线控 state), the live board is an AdminTable card (10 rows per page, last refresh in the
// toolbar), amounts right-aligned, link actions, and the manual-line state/summary (manualOverrideSummary, previously
// computed but never shown) is a column. Dialogs and the MFA flow are unchanged; feedback is toast instead of alert().
import { computed, ref, watch, onBeforeUnmount, onMounted } from 'vue'
import { Button, Space, Tag, TypographyText, message } from 'ant-design-vue'
import PageShell from '../earn/EarnPageShell.vue'
import SearchForm from '../earn/EarnSearchForm.vue'
import AdminTable from '../earn/EarnAdminTable.vue'
import MfaVerificationModal from '../../../admin/components/MfaVerificationModal.vue'
import ControlConfigModal from '../../../admin/components/ControlConfigModal.vue'
import PerpetualManualLineModal from '../../../admin/components/PerpetualManualLineModal.vue'
import { PERP_CONTROL_CONTRACT_STATUS, PERP_CONTROL_OFFSET_DIRECTION } from '../../../admin/constants/perpetualControl'
import { createPerpetualControlContractsMock } from '../../../admin/mock/perpetualControl'
import { createDefaultPerpetualControlConfig } from '../../../admin/mock/perpetual'

const clone = (value) => JSON.parse(JSON.stringify(value))

const contracts = ref(createPerpetualControlContractsMock())
const blank = () => ({ symbol: '', alias: '', manual: 'all' })
const filters = ref(blank())
const fields = [
  { key: 'symbol', label: '合约代码' },
  { key: 'alias', label: '合约名称' },
  { key: 'manual', label: '手动线控', options: [{ value: 'all', label: '全部' }, { value: 'active', label: '插线中' }, { value: 'inactive', label: '未插线' }] }
]
const columns = [
  { key: 'rank', title: '排名', width: 70 },
  { key: 'contract', title: '合约', width: 160, fixed: 'left' },
  { key: 'price', title: '市场价（USDT）', width: 140, align: 'right' },
  { key: 'volume', title: '24h 交易量（USD）', width: 150, align: 'right' },
  { key: 'position', title: '持仓 多/空/净（USD）', width: 210, align: 'right' },
  { key: 'ratio', title: '多空比', width: 90, align: 'right' },
  { key: 'platformPnl', title: '平台盈亏（USD）', width: 140, align: 'right' },
  { key: 'manual', title: '手动线控', width: 260 },
  { key: 'actions', title: '操作', width: 130, fixed: 'right' }
]

const boardRefreshIntervalMs = ref(2000)
const boardLastRefreshAt = ref('')
const boardNow = ref(Date.now())

const boardPage = ref(1)

const metricLabel = {
  LONG: '多头持仓',
  SHORT: '空头持仓',
  NET: '净持仓',
  RATIO: '多空比',
  VOLUME: '24h交易量',
  PLATFORM_PNL: '平台盈亏',
  USER_PNL: '用户盈亏'
}

const parseCompactUsd = (raw) => {
  if (raw == null) return 0
  const text = String(raw).trim().replaceAll(',', '')
  if (!text) return 0
  let sign = 1
  let s = text
  if (s.startsWith('+')) {
    sign = 1
    s = s.slice(1)
  } else if (s.startsWith('-')) {
    sign = -1
    s = s.slice(1)
  }
  s = s.trim()
  if (s.startsWith('$')) s = s.slice(1)
  const unit = s.slice(-1).toUpperCase()
  let multiplier = 1
  let numberPart = s
  if (unit === 'K') {
    multiplier = 1e3
    numberPart = s.slice(0, -1)
  } else if (unit === 'M') {
    multiplier = 1e6
    numberPart = s.slice(0, -1)
  } else if (unit === 'B') {
    multiplier = 1e9
    numberPart = s.slice(0, -1)
  }
  const n = Number(numberPart)
  if (!Number.isFinite(n)) return 0
  return sign * n * multiplier
}

const formatCompactNumber = (n, digits) => {
  const str = Number(n).toFixed(digits)
  return str.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

const formatCompactUsd = (value, { withSign = false } = {}) => {
  const sign = value < 0 ? '-' : value > 0 ? '+' : ''
  const abs = Math.abs(value || 0)
  let unit = ''
  let scaled = abs
  let digits = 0
  if (abs >= 1e9) {
    unit = 'B'
    scaled = abs / 1e9
    digits = 1
  } else if (abs >= 1e6) {
    unit = 'M'
    scaled = abs / 1e6
    digits = 1
  } else if (abs >= 1e3) {
    unit = 'K'
    scaled = abs / 1e3
    digits = 1
  } else {
    unit = ''
    scaled = abs
    digits = 0
  }
  const body = `${formatCompactNumber(scaled, digits)}${unit}`
  return `${withSign ? sign : ''}$${body}`
}

const getMetric = (contract, label) => {
  return (contract.metrics || []).find((m) => m.label === label) || null
}

const upsertMetric = (contract, label, next) => {
  const metrics = Array.isArray(contract.metrics) ? contract.metrics : []
  const idx = metrics.findIndex((m) => m.label === label)
  if (idx === -1) return [...metrics, { label, ...next }]
  const updated = metrics.slice()
  updated[idx] = { ...updated[idx], ...next }
  return updated
}

const ensureMetrics = (contract) => {
  const seed = String(contract.symbol || contract.id || '')
    .split('')
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  const baseVol = 8_000_000 + (seed % 45) * 900_000
  const baseLong = 650_000 + (seed % 30) * 85_000
  const baseShort = 600_000 + (seed % 28) * 80_000
  const net = baseLong - baseShort
  const ratio = baseShort > 0 ? baseLong / baseShort : 1
  const platformPnl = (seed % 2 === 0 ? 1 : -1) * (15_000 + (seed % 70) * 800)
  const userPnl = (seed % 3 === 0 ? 1 : -1) * (12_000 + (seed % 90) * 750)

  const existing = Array.isArray(contract.metrics) ? contract.metrics : []
  const byLabel = new Map(existing.map((m) => [m.label, { ...m }]))
  const getOr = (label, fallback) => {
    const hit = byLabel.get(label)
    return hit ? { ...fallback, ...hit } : fallback
  }

  return [
    getOr(metricLabel.LONG, { label: metricLabel.LONG, value: formatCompactUsd(baseLong), tone: 'up' }),
    getOr(metricLabel.SHORT, { label: metricLabel.SHORT, value: formatCompactUsd(baseShort), tone: 'down' }),
    getOr(metricLabel.NET, { label: metricLabel.NET, value: formatCompactUsd(net, { withSign: true }), tone: net >= 0 ? 'up' : 'down' }),
    getOr(metricLabel.RATIO, { label: metricLabel.RATIO, value: ratio.toFixed(2), tone: 'neutral' }),
    getOr(metricLabel.VOLUME, { label: metricLabel.VOLUME, value: formatCompactUsd(baseVol), tone: 'neutral' }),
    getOr(metricLabel.PLATFORM_PNL, {
      label: metricLabel.PLATFORM_PNL,
      value: formatCompactUsd(platformPnl, { withSign: true }),
      tone: platformPnl >= 0 ? 'up' : 'down'
    }),
    getOr(metricLabel.USER_PNL, { label: metricLabel.USER_PNL, value: formatCompactUsd(userPnl, { withSign: true }), tone: userPnl >= 0 ? 'up' : 'down' })
  ]
}

contracts.value = contracts.value.map((contract) => ({ ...contract, metrics: ensureMetrics(contract) }))

const jitter = (base, pct) => {
  const factor = 1 + (Math.random() * 2 - 1) * pct
  return Math.max(0, base * factor)
}

const ensureNonZeroSigned = (raw, minAbs) => {
  const v = Number(raw || 0)
  const abs = Math.abs(v)
  if (abs >= minAbs) return v
  const sign = v === 0 ? (Math.random() > 0.5 ? 1 : -1) : v > 0 ? 1 : -1
  return sign * minAbs
}

const marketPrices = ref({})

const baseMarketPrice = (symbol) => {
  const s = String(symbol || '')
  if (s.includes('BTC')) return 50000
  if (s.includes('ETH')) return 3000
  if (s.includes('SOL')) return 100
  const seed = s.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0)
  return 500 + (seed % 4500)
}

const marketVolatilityPct = (symbol) => {
  const s = String(symbol || '')
  if (s.includes('BTC')) return 0.0015
  if (s.includes('ETH')) return 0.002
  if (s.includes('SOL')) return 0.0035
  return 0.0025
}

const manualOverrides = ref({})
const manualTimers = new Map()

const isManualActive = (contractId) => Boolean(manualOverrides.value[contractId])

const clearManualTimer = (contractId) => {
  const existing = manualTimers.get(contractId)
  if (existing) clearTimeout(existing)
  manualTimers.delete(contractId)
}

const revertManual = (contractId) => {
  const entry = manualOverrides.value[contractId]
  if (!entry) return
  clearManualTimer(contractId)
  contracts.value = contracts.value.map((c) => {
    if (c.id !== contractId) return c
    return { ...c, status: entry.baseStatus ?? c.status, config: clone(entry.baseConfig) }
  })
  const next = { ...manualOverrides.value }
  delete next[contractId]
  manualOverrides.value = next
}

const scheduleManualExpiry = (contractId, durationSec) => {
  clearManualTimer(contractId)
  if (!Number(durationSec) || Number(durationSec) <= 0) return
  const handle = setTimeout(() => revertManual(contractId), Number(durationSec) * 1000)
  manualTimers.set(contractId, handle)
}

const refreshBoard = () => {
  const now = Date.now()
  const nextMarketPrices = { ...marketPrices.value }
  contracts.value = contracts.value.map((contract) => {
    const next = { ...contract }
    const metrics = ensureMetrics(next)

    const contractId = next.id
    const symbol = next.symbol || next.id
    const prevPrice = Number(nextMarketPrices[contractId] ?? baseMarketPrice(symbol))
    const vol = marketVolatilityPct(symbol)
    const nextPrice = Math.max(0.0001, prevPrice * (1 + (Math.random() * 2 - 1) * vol))
    nextMarketPrices[contractId] = nextPrice

    const long = jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.LONG)?.value), 0.012)
    const short = jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.SHORT)?.value), 0.012)
    const net = long - short
    const ratio = short > 0 ? long / short : 1
    const volume = jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.VOLUME)?.value), 0.03)
    const platformPnl = ensureNonZeroSigned(
      jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.PLATFORM_PNL)?.value), 0.06) * (Math.random() > 0.52 ? 1 : -1),
      500
    )
    const userPnl = ensureNonZeroSigned(
      jitter(parseCompactUsd(getMetric({ metrics }, metricLabel.USER_PNL)?.value), 0.08) * (Math.random() > 0.52 ? 1 : -1),
      500
    )

    let updated = metrics
    updated = upsertMetric({ metrics: updated }, metricLabel.LONG, { value: formatCompactUsd(long), tone: 'up' })
    updated = upsertMetric({ metrics: updated }, metricLabel.SHORT, { value: formatCompactUsd(short), tone: 'down' })
    updated = upsertMetric({ metrics: updated }, metricLabel.NET, { value: formatCompactUsd(net, { withSign: true }), tone: net >= 0 ? 'up' : 'down' })
    updated = upsertMetric({ metrics: updated }, metricLabel.RATIO, { value: ratio.toFixed(2), tone: 'neutral' })
    updated = upsertMetric({ metrics: updated }, metricLabel.VOLUME, { value: formatCompactUsd(volume), tone: 'neutral' })
    updated = upsertMetric({ metrics: updated }, metricLabel.PLATFORM_PNL, { value: formatCompactUsd(platformPnl, { withSign: true }), tone: platformPnl >= 0 ? 'up' : 'down' })
    updated = upsertMetric({ metrics: updated }, metricLabel.USER_PNL, { value: formatCompactUsd(userPnl, { withSign: true }), tone: userPnl >= 0 ? 'up' : 'down' })

    next.metrics = updated
    return next
  })
  marketPrices.value = nextMarketPrices
  boardNow.value = now
  boardLastRefreshAt.value = new Date(now).toISOString().replace('T', ' ').split('.')[0]
}

let boardTimer = null
const stopBoardTimer = () => {
  if (boardTimer) clearInterval(boardTimer)
  boardTimer = null
}
const startBoardTimer = () => {
  stopBoardTimer()
  boardTimer = setInterval(() => refreshBoard(), Number(boardRefreshIntervalMs.value))
}

watch([boardRefreshIntervalMs], () => {
  refreshBoard()
  startBoardTimer()
})

onMounted(() => {
  refreshBoard()
  startBoardTimer()
})

onBeforeUnmount(() => {
  stopBoardTimer()
  for (const [, timer] of manualTimers.entries()) clearTimeout(timer)
  manualTimers.clear()
})

const has = (value, query) => !query || String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
const filteredContracts = computed(() => {
  const f = filters.value
  return contracts.value.filter((item) =>
    has(item.symbol, f.symbol) && has(item.alias, f.alias) &&
    (f.manual === 'all' || isManualActive(item.id) === (f.manual === 'active'))
  )
})
const applySearch = (values) => {
  filters.value = { ...blank(), ...values }
  boardPage.value = 1
}
const resetSearch = () => {
  filters.value = blank()
  boardPage.value = 1
}

const boardSortedContracts = computed(() => {
  const list = filteredContracts.value.slice()
  list.sort((a, b) => {
    const av = parseCompactUsd(getMetric(a, metricLabel.VOLUME)?.value)
    const bv = parseCompactUsd(getMetric(b, metricLabel.VOLUME)?.value)
    return bv - av
  })
  return list
})

// Rank follows the live 24h-volume order across all filtered contracts.
const boardRank = computed(() => new Map(boardSortedContracts.value.map((contract, index) => [contract.id, index + 1])))
const boardTotalPages = computed(() => Math.max(1, Math.ceil(boardSortedContracts.value.length / 10)))

watch(() => boardSortedContracts.value.length, () => {
  if (boardPage.value > boardTotalPages.value) boardPage.value = boardTotalPages.value
})

const marketPriceText = (contract) => {
  const id = contract?.id
  const symbol = contract?.symbol || id
  const price = Number((id && marketPrices.value[id]) || baseMarketPrice(symbol))
  if (!Number.isFinite(price) || price <= 0) return '-'
  const decimals = price >= 1000 ? 2 : price >= 1 ? 4 : 6
  return price.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

const offsetDirectionLabel = (value) => {
  const map = {
    [PERP_CONTROL_OFFSET_DIRECTION.AGAINST]: '逆势',
    [PERP_CONTROL_OFFSET_DIRECTION.FOLLOW]: '顺势',
    [PERP_CONTROL_OFFSET_DIRECTION.RANDOM]: '随机',
    [PERP_CONTROL_OFFSET_DIRECTION.UP]: '向上',
    [PERP_CONTROL_OFFSET_DIRECTION.DOWN]: '向下'
  }
  return map[value] || '随机'
}

const manualOverrideSummary = (contractId) => {
  const entry = manualOverrides.value[contractId]
  if (!entry) return '-'
  const cfg = entry.overrideConfig || {}
  const durationSec = Number(entry.durationSec || 0)
  let remain = '持续'
  if (durationSec > 0) {
    const startedAt = Number(entry.startedAt || boardNow.value)
    const elapsed = Math.max(0, (boardNow.value - startedAt) / 1000)
    remain = `${Math.max(0, Math.ceil(durationSec - elapsed))}s`
  }
  return [
    `偏移 ${Number(cfg.priceOffset || 0)} 点`,
    offsetDirectionLabel(cfg.offsetDirection),
    `滑点 ${Number(cfg.slippagePct || 0).toFixed(2)}%`,
    `延迟 ${Number(cfg.latencyMs || 0)}ms`,
    remain
  ].join(' / ')
}

const showConfigModal = ref(false)
const activeConfigContractId = ref('')
const activeConfig = computed(() => contracts.value.find((item) => item.id === activeConfigContractId.value)?.config || createDefaultPerpetualControlConfig())

const showMfaModal = ref(false)
const pendingSaveData = ref(null)
const mfaLoading = ref(false)
const currentSaveAction = ref(null)

const openConfig = (contractId) => {
  activeConfigContractId.value = contractId
  showConfigModal.value = true
}

const saveConfig = (next) => {
  pendingSaveData.value = {
    type: 'CONFIG',
    contractId: activeConfigContractId.value,
    config: next
  }
  currentSaveAction.value = 'config'
  showMfaModal.value = true
}

const showManualModal = ref(false)
const manualContractId = ref('')
const manualInitialConfig = ref({})
const manualInitialDurationSec = ref(0)

const manualContract = computed(() => contracts.value.find((c) => c.id === manualContractId.value) || null)
const manualContractMetrics = computed(() => {
  const c = manualContract.value
  return {
    volume: getMetric(c || {}, metricLabel.VOLUME)?.value || '-',
    long: getMetric(c || {}, metricLabel.LONG)?.value || '-',
    short: getMetric(c || {}, metricLabel.SHORT)?.value || '-',
    net: getMetric(c || {}, metricLabel.NET)?.value || '-',
    ratio: getMetric(c || {}, metricLabel.RATIO)?.value || '-',
    platformPnl: getMetric(c || {}, metricLabel.PLATFORM_PNL)?.value || '-'
  }
})

const manualBasePrice = computed(() => {
  const id = manualContractId.value
  if (id && marketPrices.value[id]) return Number(marketPrices.value[id])
  const symbol = manualContract.value?.symbol || id || 'BTCUSDT'
  return baseMarketPrice(symbol)
})

const openManualLine = (contractId) => {
  const contract = contracts.value.find((c) => c.id === contractId)
  manualContractId.value = contractId
  manualInitialConfig.value = {
    priceOffset: Number(contract?.config?.priceOffset ?? 5),
    offsetDirection: contract?.config?.offsetDirection ?? PERP_CONTROL_OFFSET_DIRECTION.AGAINST,
    slippagePct: 0,
    latencyMs: 0
  }
  manualInitialDurationSec.value = 0
  showManualModal.value = true
}

const requestSaveManualLine = ({ contractId, payload }) => {
  const contract = contracts.value.find((c) => c.id === contractId)
  if (!contract) return
  const baseConfig = isManualActive(contract.id) ? clone(manualOverrides.value[contract.id].baseConfig) : clone(contract.config)
  const baseStatus = isManualActive(contract.id) ? manualOverrides.value[contract.id].baseStatus : contract.status
  const overrideConfig = {
    priceOffset: Math.max(0, Math.min(50, Number(payload?.priceOffset || 0))),
    offsetDirection: payload?.offsetDirection ?? PERP_CONTROL_OFFSET_DIRECTION.AGAINST,
    slippagePct: Math.max(0, Math.min(2, Number(payload?.slippagePct || 0))),
    latencyMs: Math.max(0, Math.min(5000, Number(payload?.latencyMs || 0))),
    maxLeverage: Math.max(1, Math.min(125, Number(baseConfig?.maxLeverage ?? contract?.config?.maxLeverage ?? 100))),
    autoTriggerEnabled: false
  }
  pendingSaveData.value = {
    type: 'MANUAL',
    contractId: contract.id,
    baseConfig,
    baseStatus,
    overrideConfig,
    durationSec: Number(payload?.durationSec || 0)
  }
  currentSaveAction.value = 'manual'
  showManualModal.value = false
  showMfaModal.value = true
}

const requestRemoveManualLine = (contractId) => {
  if (!isManualActive(contractId)) return
  pendingSaveData.value = {
    type: 'MANUAL_REMOVE',
    contractId
  }
  currentSaveAction.value = 'manual_remove'
  showMfaModal.value = true
}

const mfaMeta = computed(() => {
  if (currentSaveAction.value === 'manual') {
    const symbol = pendingSaveData.value?.contractId || ''
    return { title: '手动插线验证', description: `对 ${symbol} 执行手动插线属于敏感操作，请输入 MFA 验证码` }
  }
  if (currentSaveAction.value === 'manual_remove') {
    const symbol = pendingSaveData.value?.contractId || ''
    return { title: '解除手动线控验证', description: `解除 ${symbol} 的手动线控属于敏感操作，请输入 MFA 验证码` }
  }
  return { title: '线控配置验证', description: '修改永续合约线控配置属于敏感操作，请输入 MFA 验证码' }
})

const handleMfaVerify = async (code) => {
  mfaLoading.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (pendingSaveData.value) {
      if (currentSaveAction.value === 'config') {
        contracts.value = contracts.value.map((contract) =>
          contract.id === pendingSaveData.value.contractId ? { ...contract, config: { ...pendingSaveData.value.config } } : contract
        )
        showConfigModal.value = false
        message.success('线控配置保存成功')
      } else if (currentSaveAction.value === 'manual') {
        const { contractId, baseConfig, baseStatus, overrideConfig, durationSec } = pendingSaveData.value
        manualOverrides.value = {
          ...manualOverrides.value,
          [contractId]: { baseConfig: clone(baseConfig), baseStatus, overrideConfig: clone(overrideConfig), startedAt: Date.now(), durationSec: Number(durationSec || 0) }
        }
        contracts.value = contracts.value.map((c) => (c.id === contractId ? { ...c, status: PERP_CONTROL_CONTRACT_STATUS.RUNNING, config: clone(overrideConfig) } : c))
        scheduleManualExpiry(contractId, durationSec)
        message.success('手动插线已生效')
      } else if (currentSaveAction.value === 'manual_remove') {
        const { contractId } = pendingSaveData.value
        revertManual(contractId)
        message.success('手动线控已解除')
      }

      pendingSaveData.value = null
      currentSaveAction.value = null
      showMfaModal.value = false
    }
  } catch (error) {
    message.error('MFA 验证失败：' + (error.message || '请稍后重试'))
  } finally {
    mfaLoading.value = false
  }
}
</script>

<template>
  <PageShell>
    <SearchForm name="perpetual-manual-line-filters" :model="filters" :fields="fields" @search="applySearch" @reset="resetSearch" />
    <AdminTable title="实时合约数据看板" v-model:page="boardPage" :rows="boardSortedContracts" :columns="columns" row-key="id" desktop-only>
      <template #toolbar>
        <TypographyText type="secondary">按 24h 交易量排序 · 最后刷新：{{ boardLastRefreshAt || '—' }}</TypographyText>
      </template>
      <template #cell="{ column, record: contract }">
        <template v-if="column.key === 'rank'">{{ boardRank.get(contract.id) }}</template>
        <Space v-else-if="column.key === 'contract'" direction="vertical" :size="0">
          <TypographyText strong>{{ contract.symbol }}</TypographyText>
          <TypographyText type="secondary">{{ contract.alias }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'price'">{{ marketPriceText(contract) }}</template>
        <template v-else-if="column.key === 'volume'">{{ getMetric(contract, metricLabel.VOLUME)?.value || '—' }}</template>
        <Space v-else-if="column.key === 'position'" direction="vertical" :size="0" align="end">
          <span>多 {{ getMetric(contract, metricLabel.LONG)?.value || '—' }} / 空 {{ getMetric(contract, metricLabel.SHORT)?.value || '—' }}</span>
          <TypographyText :type="parseCompactUsd(getMetric(contract, metricLabel.NET)?.value) >= 0 ? 'success' : 'danger'">净 {{ getMetric(contract, metricLabel.NET)?.value || '—' }}</TypographyText>
        </Space>
        <template v-else-if="column.key === 'ratio'">{{ getMetric(contract, metricLabel.RATIO)?.value || '—' }}</template>
        <TypographyText v-else-if="column.key === 'platformPnl'" :type="parseCompactUsd(getMetric(contract, metricLabel.PLATFORM_PNL)?.value) >= 0 ? 'success' : 'danger'">{{ getMetric(contract, metricLabel.PLATFORM_PNL)?.value || '—' }}</TypographyText>
        <Space v-else-if="column.key === 'manual'" direction="vertical" :size="0">
          <Tag :color="isManualActive(contract.id) ? 'purple' : 'default'">{{ isManualActive(contract.id) ? '插线中' : '未插线' }}</Tag>
          <TypographyText v-if="isManualActive(contract.id)" type="secondary">{{ manualOverrideSummary(contract.id) }}</TypographyText>
        </Space>
        <Space v-else-if="column.key === 'actions'" :size="8">
          <Button type="link" class="px-0" @click="openManualLine(contract.id)">手动插线</Button>
          <Button v-if="isManualActive(contract.id)" type="link" danger class="px-0" @click="requestRemoveManualLine(contract.id)">解除</Button>
        </Space>
        <template v-else>{{ contract[column.key] ?? '—' }}</template>
      </template>
    </AdminTable>
  </PageShell>

  <ControlConfigModal
    :open="showConfigModal"
    :symbol="activeConfigContractId"
    :config="activeConfig"
    @close="showConfigModal = false"
    @save="saveConfig"
  />

  <PerpetualManualLineModal
    :open="showManualModal"
    :contract-id="manualContractId"
    :contract-label="manualContract?.alias || ''"
    :base-price="manualBasePrice"
    :last-refresh-at="boardLastRefreshAt"
    :metrics="manualContractMetrics"
    :initial-config="manualInitialConfig"
    :initial-duration-sec="manualInitialDurationSec"
    @close="showManualModal = false"
    @save="requestSaveManualLine"
  />

  <MfaVerificationModal
    v-model:open="showMfaModal"
    :loading="mfaLoading"
    :title="mfaMeta.title"
    :description="mfaMeta.description"
    @verify="handleMfaVerify"
    @cancel="pendingSaveData = null; currentSaveAction = null"
  />
</template>
