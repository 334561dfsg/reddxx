/** 资产中心充提页演示数据；对接链上 / 后台后替换 */

export const FRONT_ASSET_COIN_META = [
  { symbol: 'USDC', name: 'USD Coin', precision: 6, usdPrice: 1, balance: '24832.512345', withdrawable: '24620.312345' },
  { symbol: 'ETH', name: 'Ethereum', precision: 8, usdPrice: 3200, balance: '6.42031578', withdrawable: '5.92031578' },
  { symbol: 'BTC', name: 'Bitcoin', precision: 8, usdPrice: 98000, balance: '0.18543210', withdrawable: '0.16543210' },
  { symbol: 'DAI', name: 'Dai', precision: 6, usdPrice: 1, balance: '15320.800000', withdrawable: '15320.800000' },
  { symbol: 'SHIB', name: 'Shiba Inu', precision: 8, usdPrice: 0.000015, balance: '125000000.12345678', withdrawable: '124500000.12345678' },
  { symbol: 'XRP', name: 'XRP', precision: 6, usdPrice: 0.62, balance: '8400.234567', withdrawable: '7900.234567' },
  { symbol: 'TRX', name: 'TRON', precision: 6, usdPrice: 0.23, balance: '32600.000001', withdrawable: '32600.000001' },
  { symbol: 'SOL', name: 'Solana', precision: 9, usdPrice: 145, balance: '128.987654321', withdrawable: '120.987654321' },
  { symbol: 'BNB', name: 'BNB', precision: 8, usdPrice: 620, balance: '45.12000000', withdrawable: '44.12000000' },
  { symbol: 'DOGE', name: 'Dogecoin', precision: 8, usdPrice: 0.15, balance: '50500.87654321', withdrawable: '50500.87654321' }
]

const FRONT_ASSET_COIN_META_BY_SYMBOL = FRONT_ASSET_COIN_META.reduce((acc, coin) => {
  acc[coin.symbol] = coin
  return acc
}, {})

function amountNumber(value) {
  const n = Number(String(value ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

export function frontAssetCoinMeta(symbol) {
  return FRONT_ASSET_COIN_META_BY_SYMBOL[String(symbol || '').toUpperCase()]
}

export function frontAssetPrecision(symbol) {
  return frontAssetCoinMeta(symbol)?.precision ?? 8
}

export function formatFrontAssetAmount(value, symbol, options = {}) {
  const precision = options.precision ?? frontAssetPrecision(symbol)
  const trimZeros = options.trimZeros ?? false
  return amountNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: trimZeros ? 0 : precision,
    maximumFractionDigits: precision
  })
}

export function formatFrontUsdAmount(value, options = {}) {
  const decimals = options.decimals ?? 2
  return amountNumber(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

function signedUsd(value) {
  const n = amountNumber(value)
  const sign = n > 0 ? '+' : n < 0 ? '-' : ''
  return `${sign}$ ${formatFrontUsdAmount(Math.abs(n))}`
}

/** 提币可选划出账户；演示用，对接资产分账户后替换 */
export const FRONT_ACCOUNT_TYPE_OPTIONS = [
  { value: 'spot', label: '币币' },
  { value: 'perpetual', label: '永续合约' },
  { value: 'delivery', label: '交割合约' },
  { value: 'earn', label: '理财账户' }
]

export const FRONT_WITHDRAW_NETWORKS = [
  { key: 'ethereum', label: 'Ethereum' },
  { key: 'polygon', label: 'Polygon' },
  { key: 'tron', label: 'Tron' },
  { key: 'solana', label: 'Solana' }
]

export const FRONT_DEPOSIT_COINS = FRONT_ASSET_COIN_META.map(({ symbol, name, precision }) => ({
  symbol,
  name,
  precision
}))

/** 资产页等入口「充币」直达详情的默认币种（与列表首项一致） */
export const FRONT_DEPOSIT_DEFAULT_SYMBOL_LOWER = FRONT_DEPOSIT_COINS[0].symbol.toLowerCase()

/** 提币可选币种（与充币列表可对齐） */
export const FRONT_WITHDRAW_ASSETS = FRONT_ASSET_COIN_META.map((c) => ({
  symbol: c.symbol,
  balance: formatFrontAssetAmount(c.balance, c.symbol),
  withdrawable: formatFrontAssetAmount(c.withdrawable, c.symbol),
  rawBalance: c.balance,
  rawWithdrawable: c.withdrawable,
  precision: c.precision
}))

const ADDR = {
  ethereum: '0x068b94aB79A1234567890abcdef1234567890ab',
  polygon: '0xPolygon1a2b3c4d5e6f7890abcdef1234567890ab',
  tron: 'TXYZdemo1234567890WithdrawTronAddress42',
  solana: 'So1anaDemoAddr11111234567890123456789012'
}

export function demoDepositAddress(_symbol, networkKey) {
  return ADDR[networkKey] || ADDR.ethereum
}

export function networkHintWithdraw(networkLabel) {
  return `${networkLabel} 提币，请输入 ${networkLabel} 钱包地址`
}

export function networkHintDeposit(networkLabel) {
  return `请确认充值网络为 ${networkLabel}，与提币方所选网络一致`
}

/** 站内划转：子账户 + 资金账户（演示） */
export const FRONT_TRANSFER_ACCOUNT_OPTIONS = [
  { value: 'spot', label: '币币账户' },
  { value: 'perpetual', label: '永续合约账户' },
  { value: 'delivery', label: '交割合约账户' },
  { value: 'earn', label: '理财账户' },
  { value: 'funding', label: '资金账户' }
]

const TRANSFER_BALANCE_DEMO = {
  spot: {
    USDC: '1250.500000',
    ETH: '0.42000000',
    BTC: '0.01500000',
    DAI: '860.000000',
    SHIB: '2200000.12345678',
    XRP: '1200.500000',
    TRX: '6800.000000',
    SOL: '12.123456789',
    BNB: '2.65000000',
    DOGE: '12000.00000000'
  },
  perpetual: {
    USDC: '320.000000',
    ETH: '0.08000000',
    BTC: '0.00250000',
    DAI: '100.000000',
    SHIB: '0',
    XRP: '300.000000',
    TRX: '1200.000000',
    SOL: '1.500000000',
    BNB: '0.25000000',
    DOGE: '800.00000000'
  },
  delivery: {
    USDC: '180.000000',
    ETH: '0.01000000',
    BTC: '0.00120000',
    DAI: '0',
    SHIB: '0',
    XRP: '0',
    TRX: '0',
    SOL: '0.300000000',
    BNB: '0',
    DOGE: '0'
  },
  earn: {
    USDC: '5000.000000',
    ETH: '1.20000000',
    BTC: '0.05000000',
    DAI: '3500.000000',
    SHIB: '12200000.00000000',
    XRP: '2400.000000',
    TRX: '18000.000000',
    SOL: '20.000000000',
    BNB: '8.00000000',
    DOGE: '25000.00000000'
  },
  funding: {
    USDC: '888.880000',
    ETH: '0.10000000',
    BTC: '0',
    DAI: '200.000000',
    SHIB: '350000.00000000',
    XRP: '80.000000',
    TRX: '600.000000',
    SOL: '0.500000000',
    BNB: '0.12000000',
    DOGE: '900.00000000'
  }
}

export function demoTransferAvailable(accountValue, symbol) {
  const bucket = TRANSFER_BALANCE_DEMO[accountValue]
  if (!bucket) return '0'
  return formatFrontAssetAmount(bucket[symbol] ?? '0', symbol)
}

/** 模拟账户领取资产配置；当前为后台配置 mock，对接后替换为接口返回 */
export const FRONT_DEMO_ACCOUNT_ASSET_CONFIG = {
  monthlyClaimLimit: 1,
  claimAmountUsd: 500000,
  currency: 'USDT'
}

export function normalizeFrontDemoAccountAssetConfig(raw) {
  const base = FRONT_DEMO_ACCOUNT_ASSET_CONFIG
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...base }

  const monthlyClaimLimit = Number(raw.monthlyClaimLimit)
  const claimAmountUsd = Number(raw.claimAmountUsd)
  return {
    monthlyClaimLimit:
      Number.isFinite(monthlyClaimLimit) && monthlyClaimLimit >= 0
        ? Math.floor(monthlyClaimLimit)
        : base.monthlyClaimLimit,
    claimAmountUsd:
      Number.isFinite(claimAmountUsd) && claimAmountUsd > 0
        ? Math.round(claimAmountUsd * 100) / 100
        : base.claimAmountUsd,
    currency: typeof raw.currency === 'string' && raw.currency.trim()
      ? raw.currency.trim().toUpperCase()
      : base.currency
  }
}

export function frontDemoAssetClaimMonthKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return 'unknown-month'
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function sumUsdForAccount(accountValue) {
  const bucket = TRANSFER_BALANCE_DEMO[accountValue] || {}
  return FRONT_ASSET_COIN_META.reduce(
    (sum, coin) => sum + amountNumber(bucket[coin.symbol]) * coin.usdPrice,
    0
  )
}

const BTC_USD_PRICE = frontAssetCoinMeta('BTC')?.usdPrice || 1

function overviewAccount(key, title, dayPnlUsd) {
  const usd = sumUsdForAccount(key)
  return {
    key,
    title,
    btc: `${formatFrontAssetAmount(usd / BTC_USD_PRICE, 'BTC')} BTC`,
    usd: formatFrontUsdAmount(usd),
    dayPnl: signedUsd(dayPnlUsd)
  }
}

export const FRONT_ASSET_OVERVIEW = (() => {
  const accounts = [
    overviewAccount('spot', '币币账户资产', 125.36),
    overviewAccount('perpetual', '永续合约账户资产', -18.92),
    overviewAccount('delivery', '交割合约账户资产', 6.18),
    overviewAccount('earn', '理财账户资产', 78.45),
    overviewAccount('funding', '资金账户资产', 0.86)
  ]
  const totalUsd = accounts.reduce((sum, account) => sum + amountNumber(account.usd), 0)
  const totalPnl = accounts.reduce((sum, account) => {
    const sign = account.dayPnl.trim().startsWith('-') ? -1 : 1
    return sum + sign * amountNumber(account.dayPnl.replace(/[+$\s-]/g, ''))
  }, 0)
  return {
    totalBtc: `${formatFrontAssetAmount(totalUsd / BTC_USD_PRICE, 'BTC')} BTC`,
    totalUsd: formatFrontUsdAmount(totalUsd),
    todayPnl: signedUsd(totalPnl),
    subAccounts: accounts
  }
})()

/** 闪兑参考价（USD）；演示用不对接盘口 */
const FLASH_USD_PRICE = FRONT_ASSET_COIN_META.reduce((acc, coin) => {
  acc[coin.symbol] = coin.usdPrice
  return acc
}, {})

function formatFlashRateNumber(n) {
  if (!Number.isFinite(n) || n === 0) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e9) return n.toExponential(4)
  if (abs >= 1_000_000) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  if (abs >= 1_000)
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (abs >= 1) return n.toFixed(6).replace(/\.?0+$/, '')
  if (abs >= 0.0001) return n.toFixed(8).replace(/\.?0+$/, '')
  return n.toPrecision(8).replace(/\.?0+$/, '')
}

/**
 * 当前币对参考汇率（与数量无关）。对接盘后仍可用同一结构替换 forward / inverse 文案。
 * @returns {{ ok: true, forward: number, inverse: number, forwardText: string, inverseText: string } | { ok: false, message: string }}
 */
export function demoFlashConvertRate(fromSymbol, toSymbol) {
  if (!fromSymbol || !toSymbol || fromSymbol === toSymbol) {
    return { ok: false, message: '请选择不同的两个币种' }
  }
  const pf = FLASH_USD_PRICE[fromSymbol]
  const pt = FLASH_USD_PRICE[toSymbol]
  if (pf == null || pt == null || pt === 0 || pf === 0) {
    return { ok: false, message: '演示暂无该币种参考价' }
  }
  const forward = pf / pt
  const inverse = pt / pf
  return {
    ok: true,
    forward,
    inverse,
    forwardText: `1 ${fromSymbol} = ${formatFlashRateNumber(forward)} ${toSymbol}`,
    inverseText: `1 ${toSymbol} = ${formatFlashRateNumber(inverse)} ${fromSymbol}`
  }
}

export function demoFlashConvertEstimate(fromSymbol, toSymbol, payAmountStr) {
  const rate = demoFlashConvertRate(fromSymbol, toSymbol)
  const pay = parseFloat(String(payAmountStr || '').replace(/,/g, ''))
  if (!rate.ok) {
    return { receive: '', rateLabel: rate.message }
  }
  if (!Number.isFinite(pay) || pay <= 0) {
    return { receive: '', rateLabel: rate.forwardText + ' · 输入数量查看预计获得' }
  }
  const pf = FLASH_USD_PRICE[fromSymbol]
  const pt = FLASH_USD_PRICE[toSymbol]
  const recv = (pay * pf) / pt
  return {
    receive: formatFrontAssetAmount(recv, toSymbol),
    rateLabel: rate.forwardText + '（演示）'
  }
}
