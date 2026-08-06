const clone = (value) => JSON.parse(JSON.stringify(value))

export const PUBLIC_DEPOSIT_COINS = ['USDT', 'USDC', 'BTC', 'ETH', 'TRX', 'BNB']
export const PUBLIC_DEPOSIT_NETWORKS = ['TRC20', 'ERC20', 'BSC', 'Bitcoin', 'Ethereum']

export const publicDepositAddressMock = [
  {
    id: 'pda_0001', coin: 'USDT', network: 'TRC20',
    address: 'TXj6P3QhY9rK7aM2wV8sN4cD1fG5uL0bEe',
    enabled: true, sortOrder: 100, remark: 'TRON 网络默认收款地址', operator: 'admin_01', updatedAt: '2026-07-20 10:32:18'
  },
  {
    id: 'pda_0002', coin: 'USDT', network: 'ERC20',
    address: '0x7B4d8aE91F3cC5bA26e10d4E8a97fA72B19D63c1',
    enabled: true, sortOrder: 90, remark: 'Ethereum 网络默认收款地址', operator: 'admin_02', updatedAt: '2026-07-19 16:08:42'
  },
  {
    id: 'pda_0003', coin: 'USDC', network: 'ERC20',
    address: '0x4dA3F1e90aB6c27853D4f2C38d90aA4Ef8125Bc7',
    enabled: true, sortOrder: 80, remark: 'USDC 独立收款地址', operator: 'admin_02', updatedAt: '2026-07-18 09:21:06'
  },
  {
    id: 'pda_0004', coin: 'BTC', network: 'Bitcoin',
    address: 'bc1q9m0w7j6s4l2f8x3a5d1k7n6e2c9p4h8u3v5z0r',
    enabled: true, sortOrder: 70, remark: 'BTC 主网充值', operator: 'admin_01', updatedAt: '2026-07-17 14:55:31'
  },
  {
    id: 'pda_0005', coin: 'USDT', network: 'TRC20',
    address: 'TOld8uV2nP5yQ1cK6sM9dR4xL7aE3gF0wH',
    enabled: false, sortOrder: 10, remark: '历史公共地址', operator: 'admin_03', updatedAt: '2026-06-28 11:12:09'
  }
]

export const publicDepositAddressLogMock = [
  {
    id: 'pdal_0001', addressId: 'pda_0001', action: 'edit', operator: 'admin_01',
    occurredAt: '2026-07-20 10:32:18',
    before: { enabled: true, remark: 'TRON 网络收款地址' },
    after: { enabled: true, remark: 'TRON 网络默认收款地址' }
  },
  {
    id: 'pdal_0003', addressId: 'pda_0001', action: 'edit', operator: 'admin_03',
    occurredAt: '2026-07-15 17:24:09',
    before: { enabled: true, remark: 'TRC20 公共地址' },
    after: { enabled: true, remark: 'TRON 网络收款地址' }
  },
  {
    id: 'pdal_0004', addressId: 'pda_0001', action: 'enable', operator: 'admin_01',
    occurredAt: '2026-07-10 09:18:46',
    before: { enabled: false, remark: 'TRC20 公共地址' },
    after: { enabled: true, remark: 'TRC20 公共地址' }
  },
  {
    id: 'pdal_0005', addressId: 'pda_0001', action: 'disable', operator: 'admin_02',
    occurredAt: '2026-07-09 22:06:11',
    before: { enabled: true, remark: 'TRC20 公共地址' },
    after: { enabled: false, remark: 'TRC20 公共地址' }
  },
  {
    id: 'pdal_0006', addressId: 'pda_0001', action: 'edit', operator: 'admin_01',
    occurredAt: '2026-07-01 14:40:27',
    before: { address: 'TXj6P3QhY9rK7aM2wV8sN4cD1fG5uL0bEe', enabled: true, remark: 'TRC20 公共地址' },
    after: { address: 'TXj6P3QhY9rK7aM2wV8sN4cD1fG5uL0bEe', enabled: true, remark: 'TRC20 公共地址' }
  },
  {
    id: 'pdal_0007', addressId: 'pda_0001', action: 'edit', operator: 'admin_03',
    occurredAt: '2026-06-22 11:15:03',
    before: { enabled: true, remark: 'USDT 收款地址' },
    after: { enabled: true, remark: 'TRC20 收款地址' }
  },
  {
    id: 'pdal_0008', addressId: 'pda_0001', action: 'create', operator: 'admin_03',
    occurredAt: '2026-06-18 08:33:52',
    before: null,
    after: {
      coin: 'USDT', network: 'TRC20', address: 'TXj6P3QhY9rK7aM2wV8sN4cD1fG5uL0bEe',
      enabled: true, remark: 'USDT 收款地址'
    }
  },
  {
    id: 'pdal_0002', addressId: 'pda_0003', action: 'enable', operator: 'admin_02',
    occurredAt: '2026-07-18 09:21:06',
    before: { enabled: false, remark: 'USDC 独立收款地址' },
    after: { enabled: true, remark: 'USDC 独立收款地址' }
  },
  {
    id: 'pdal_0009', addressId: 'pda_0002', action: 'edit', operator: 'admin_02',
    occurredAt: '2026-07-12 16:05:20',
    before: { enabled: true, remark: 'ETH 网络默认地址' },
    after: { enabled: true, remark: 'Ethereum 网络默认收款地址' }
  },
  {
    id: 'pdal_0010', addressId: 'pda_0002', action: 'create', operator: 'admin_01',
    occurredAt: '2026-06-30 10:12:44',
    before: null,
    after: {
      coin: 'USDT', network: 'ERC20', address: '0x7B4d8aE91F3cC5bA26e10d4E8a97fA72B19D63c1',
      enabled: true, remark: 'ETH 网络默认地址'
    }
  }
]

const comparableFields = ['coin', 'network', 'address', 'enabled', 'sortOrder', 'remark']

function normalizeSortOrder(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.trunc(parsed))
}

function withDefaults(row) {
  return {
    sortOrder: 0,
    ...row,
    sortOrder: normalizeSortOrder(row?.sortOrder)
  }
}

function sortPublicDepositAddresses(a, b) {
  return normalizeSortOrder(b.sortOrder) - normalizeSortOrder(a.sortOrder)
    || String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''))
    || String(a.id || '').localeCompare(String(b.id || ''))
}

function logSnapshot(row) {
  if (!row) return null
  return Object.fromEntries(comparableFields.map((field) => [field, row[field]]))
}

function isStatusOnlyChange(before, after) {
  return comparableFields
    .filter((field) => field !== 'enabled')
    .every((field) => before[field] === after[field])
}

export function createPublicDepositAddressRepository(initialRows = [], initialLogs = []) {
  let sequence = initialRows.length
  let logSequence = initialLogs.length
  let rows = clone(initialRows).map(withDefaults)
  let logs = clone(initialLogs)

  function appendLog(addressId, action, before, after, source) {
    logSequence += 1
    logs.push({
      id: `pdal_${String(logSequence).padStart(4, '0')}`,
      addressId,
      action,
      operator: source.operator || 'admin_current',
      occurredAt: source.updatedAt || new Date().toISOString(),
      before: logSnapshot(before),
      after: logSnapshot(after)
    })
  }

  return {
    list() {
      return clone(rows).sort(sortPublicDepositAddresses)
    },

    listLogs(addressId) {
      return clone(logs)
        .filter((log) => log.addressId === addressId)
        .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
    },

    save(payload) {
      const next = withDefaults(clone(payload))
      let currentIndex = next.id ? rows.findIndex((row) => row.id === next.id) : -1
      const current = currentIndex >= 0 ? clone(rows[currentIndex]) : null
      const addressChanged = currentIndex >= 0 && rows[currentIndex].address !== next.address

      if (addressChanged) {
        const disabled = { ...rows[currentIndex], enabled: false, operator: next.operator, updatedAt: next.updatedAt }
        rows[currentIndex] = disabled
        appendLog(disabled.id, 'replace', current, disabled, next)
        delete next.id
        currentIndex = -1
      }

      if (next.enabled) {
        rows = rows.map((row) => {
          const sameTarget = row.network === next.network && row.coin === next.coin
          if (row.id !== next.id && sameTarget && row.enabled) {
            const disabled = { ...row, enabled: false, operator: next.operator, updatedAt: next.updatedAt }
            appendLog(row.id, 'disable', row, disabled, next)
            return disabled
          }
          return row
        })
      }

      if (currentIndex >= 0) {
        const before = clone(rows[currentIndex])
        rows[currentIndex] = { ...before, ...next }
        const action = isStatusOnlyChange(before, rows[currentIndex])
          ? (rows[currentIndex].enabled ? 'enable' : 'disable')
          : 'edit'
        appendLog(rows[currentIndex].id, action, before, rows[currentIndex], next)
        return clone(rows[currentIndex])
      }

      sequence += 1
      const created = { ...next, id: `pda_${String(sequence).padStart(4, '0')}` }
      rows.push(created)
      appendLog(created.id, addressChanged ? 'replace-in' : 'create', null, created, next)
      return clone(created)
    },

    resolve(coin, network) {
      const address = rows.find(
        (row) => row.enabled && row.coin === coin && row.network === network
      )
      return address ? clone(address) : null
    }
  }
}
