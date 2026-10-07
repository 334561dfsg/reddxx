export const DEFAULT_MINIMUM_USDT = '100'
const STORAGE_KEY = 'fex-admin:minimum-deposit:v1'
const amountError = '请输入大于 0 的金额，最多 12 位整数和 6 位小数，不支持科学计数法。'

function decimal(value) {
  const text = String(value ?? '').trim()
  if (!/^\d{1,24}(\.\d{1,18})?$/.test(text)) return null
  const [whole, fraction = ''] = text.split('.')
  const numerator = BigInt(whole + fraction)
  return numerator > 0n ? { numerator, denominator: 10n ** BigInt(fraction.length) } : null
}

function formatUnits(units, precision) {
  const digits = units.toString().padStart(precision + 1, '0')
  if (!precision) return digits
  return `${digits.slice(0, -precision)}.${digits.slice(-precision)}`.replace(/\.?0+$/, '')
}

export function normalizeMinimumUsdt(value) {
  const text = String(value ?? '').trim()
  if (!/^\d{1,12}(\.\d{1,6})?$/.test(text)) throw new Error(amountError)
  const parsed = decimal(text)
  if (!parsed) throw new Error(amountError)
  return formatUnits(parsed.numerator * 1000000n / parsed.denominator, 6)
}

// marketRate is quote units per base unit. Prefer the direct coin/USDT pair;
// invert USDT/coin algebraically, never through floating-point reciprocal math.
export function calculateMinimumQuantity(amount, symbol, precision, pairs) {
  if (!Number.isInteger(precision) || precision < 0 || precision > 18) return null
  const minimum = decimal(normalizeMinimumUsdt(amount))
  let numerator = minimum.numerator
  let denominator = minimum.denominator
  if (symbol !== 'USDT') {
    const valid = pairs.filter(pair => pair.enabled && decimal(pair.marketRate))
    const direct = valid.find(pair => pair.baseAsset === symbol && pair.quoteAsset === 'USDT')
    const inverse = valid.find(pair => pair.baseAsset === 'USDT' && pair.quoteAsset === symbol)
    const pair = direct || inverse
    if (!pair) return null
    const rate = decimal(pair.marketRate)
    numerator *= direct ? rate.denominator : rate.numerator
    denominator *= direct ? rate.numerator : rate.denominator
  }
  const scaled = numerator * 10n ** BigInt(precision)
  return formatUnits((scaled + denominator - 1n) / denominator, precision)
}

// Browser-local mock adapter. A production adapter must enforce authorization,
// config versions and deposit validation on the server.
export function createMinimumDepositRepository(getStorage) {
  function read() {
    try {
      const raw = getStorage().getItem(STORAGE_KEY)
      if (raw === null) return { amountUsdt: DEFAULT_MINIMUM_USDT, revision: 0, updatedAt: null }
      const data = JSON.parse(raw)
      if (!Number.isSafeInteger(data.revision) || data.revision < 1 || typeof data.updatedAt !== 'string') throw new Error('invalid')
      return { amountUsdt: normalizeMinimumUsdt(data.amountUsdt), revision: data.revision, updatedAt: data.updatedAt }
    } catch {
      throw new Error('最低充值金额读取失败，请检查浏览器存储后重试。')
    }
  }
  return {
    read,
    save(value, expected) {
      const amountUsdt = normalizeMinimumUsdt(value)
      const current = read()
      if (current.revision !== expected?.revision || current.amountUsdt !== expected?.amountUsdt) {
        throw new Error('最低充值金额已更新，请关闭弹窗并重新打开后再修改。')
      }
      const saved = { amountUsdt, revision: current.revision + 1, updatedAt: new Date().toISOString() }
      try { getStorage().setItem(STORAGE_KEY, JSON.stringify(saved)) }
      catch { throw new Error('最低充值金额保存失败，请检查浏览器存储后重试。') }
      return saved
    }
  }
}

export function createMinimumDepositMfaSession(repository, verify) {
  let pending = null
  let verifying = false
  return {
    prepare(value, snapshot) {
      if (verifying) throw new Error('正在验证，请稍候')
      pending = { amount: normalizeMinimumUsdt(value), snapshot: { ...snapshot } }
    },
    cancel() { pending = null },
    async confirm(code) {
      if (!pending || verifying) return null
      const request = pending
      verifying = true
      try {
        await verify(code)
        if (pending !== request) return null
        const result = repository.save(request.amount, request.snapshot)
        pending = null
        return result
      } finally { verifying = false }
    }
  }
}
