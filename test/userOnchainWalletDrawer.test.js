import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const componentPath = resolve(process.cwd(), 'src/admin/components/user/UserOnchainWalletDrawer.vue')
const user = { id: 'user_1004', username: 'Alpha' }
const wallet = {
  userId: 'user_1004',
  addresses: [
    {
      id: 'wallet_user_1004_deposit_usdt_trc20',
      kind: 'deposit',
      coin: 'USDT',
      network: 'TRC20',
      address: 'TQp4YdHg9MSrMWz6p8LcuKf6Y1mJYVvnE5',
      label: '主入金地址',
      status: 'active',
      firstUsedAt: '2025-04-12T08:30:00.000Z',
      lastUsedAt: '2026-07-20T12:15:00.000Z'
    },
    {
      id: 'wallet_user_1004_withdrawal_usdt_trc20',
      kind: 'withdrawal',
      coin: 'USDT',
      network: 'TRC20',
      address: 'TRxKJ8TmqVe9Hv7uL6VJgWkFq5K2UE1aPZ',
      label: '常用提现地址',
      status: 'active',
      firstUsedAt: '2025-05-03T14:20:00.000Z',
      lastUsedAt: '2026-07-18T03:45:00.000Z'
    }
  ]
}

const mount = async (props = {}) => {
  const component = await loadVueSfc(componentPath)
  let harness
  harness = await createSfcHarness(component, {
    visible: true,
    user,
    wallet,
    returnFocus: null,
    ...props
  }, {
    onClose: () => { harness.props.visible = false }
  })
  await harness.finishTransitions()
  return harness
}

const findIn = (harness, parent, predicate) => harness.allNodes().find((node) => parent.contains(node) && predicate(node))

test('wallet drawer presents the user and deposit addresses by default', async (t) => {
  const harness = await mount()
  t.after(harness.cleanup)

  const frame = harness.findByTestId('user-onchain-wallet-drawer')
  assert.ok(frame)
  assert.match(frame.textContent, /链上钱包/)
  assert.match(frame.textContent, /Alpha · UID user_1004/)
  assert.equal(findIn(harness, frame, (node) => node.tag === 'button' && node.textContent.trim() === '入金地址').hasAttribute('aria-pressed'), true)
  assert.match(frame.textContent, /主入金地址/)
  assert.doesNotMatch(frame.textContent, /常用提现地址/)
  assert.match(frame.textContent, /TQp4YdHg…YVvnE5/)
  const addressCard = harness.findByTestId('wallet-address-wallet_user_1004_deposit_usdt_trc20')
  assert.match(addressCard.textContent, /首次使用/)
  assert.match(addressCard.textContent, /2025/)
  assert.match(addressCard.textContent, /最后使用/)
  assert.match(addressCard.textContent, /2026/)
})

test('wallet drawer ignores backdrop, pointer, touch, drag, and swipe closing attempts', async (t) => {
  const harness = await mount()
  t.after(harness.cleanup)
  const frame = harness.findByTestId('user-onchain-wallet-drawer')
  const backdrop = frame.parent

  backdrop.click()
  const gestureEventTypes = [
    'mousedown',
    'mouseup',
    'pointerdown',
    'pointermove',
    'pointerup',
    'touchstart',
    'touchmove',
    'touchend',
    'dragstart',
    'drag',
    'dragend'
  ]
  for (const target of [backdrop, frame]) {
    for (const type of gestureEventTypes) {
      target.dispatchEvent({
        type,
        target,
        defaultPrevented: false,
        preventDefault() { this.defaultPrevented = true }
      })
    }
  }
  await harness.flush()
  assert.equal(harness.emitted.filter(([name]) => name === 'onClose').length, 0)

  findIn(harness, frame, (node) => node.getAttribute?.('aria-label') === '关闭').click()
  await harness.flush()
  assert.equal(harness.emitted.filter(([name]) => name === 'onClose').length, 1)
})

test('wallet drawer renders safe timestamp fallbacks for missing or invalid values', async (t) => {
  const fallbackWallet = {
    userId: 'user_1004',
    addresses: [
      {
        ...wallet.addresses[0],
        firstUsedAt: '',
        lastUsedAt: 'not-a-date'
      }
    ]
  }
  const harness = await mount({ wallet: fallbackWallet })
  t.after(harness.cleanup)

  const addressCard = harness.findByTestId('wallet-address-wallet_user_1004_deposit_usdt_trc20')
  const firstUsedAt = findIn(harness, addressCard, (node) => node.getAttribute?.('data-testid') === 'wallet-address-wallet_user_1004_deposit_usdt_trc20-first-used-at')
  const lastUsedAt = findIn(harness, addressCard, (node) => node.getAttribute?.('data-testid') === 'wallet-address-wallet_user_1004_deposit_usdt_trc20-last-used-at')
  assert.ok(firstUsedAt)
  assert.ok(lastUsedAt)
  assert.equal(firstUsedAt.textContent.trim(), '—')
  assert.equal(lastUsedAt.textContent.trim(), '—')
})

test('wallet drawer never exposes a complete short address before reveal', async (t) => {
  const boundaryWallet = {
    userId: 'user_1004',
    addresses: [
      {
        ...wallet.addresses[0],
        id: 'short-address',
        address: 'Ab3'
      },
      {
        ...wallet.addresses[0],
        id: 'empty-address',
        address: '',
        label: '空地址'
      }
    ]
  }
  const harness = await mount({ wallet: boundaryWallet })
  t.after(harness.cleanup)

  const shortCard = harness.findByTestId('wallet-address-short-address')
  const emptyCard = harness.findByTestId('wallet-address-empty-address')
  assert.doesNotMatch(shortCard.textContent, /Ab3/)
  assert.match(shortCard.textContent, /…/)
  assert.match(emptyCard.textContent, /—/)
})

test('wallet drawer keeps one focused reveal toggle and re-gates copy after hiding', async (t) => {
  const harness = await mount()
  t.after(harness.cleanup)
  const addressCard = harness.findByTestId('wallet-address-wallet_user_1004_deposit_usdt_trc20')
  let toggle = findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() !== '复制地址')
  const copy = findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址')

  assert.ok(toggle)
  assert.equal(toggle.textContent.trim(), '查看完整地址')
  assert.equal(toggle.getAttribute('aria-pressed'), 'false')
  assert.equal(copy.disabled, true)
  toggle.focus()
  toggle.click()
  await harness.flush()

  toggle = findIn(harness, addressCard, (node) => node.getAttribute?.('data-testid') === 'wallet-address-wallet_user_1004_deposit_usdt_trc20-reveal-toggle')
  assert.equal(toggle.textContent.trim(), '隐藏完整地址')
  assert.equal(toggle.getAttribute('aria-pressed'), 'true')
  assert.equal(harness.document.activeElement, toggle)
  assert.equal(copy.disabled, false)
  assert.match(addressCard.textContent, /TQp4YdHg9MSrMWz6p8LcuKf6Y1mJYVvnE5/)

  toggle.click()
  await harness.flush()
  toggle = findIn(harness, addressCard, (node) => node.getAttribute?.('data-testid') === 'wallet-address-wallet_user_1004_deposit_usdt_trc20-reveal-toggle')
  assert.equal(toggle.textContent.trim(), '查看完整地址')
  assert.equal(toggle.getAttribute('aria-pressed'), 'false')
  assert.equal(harness.document.activeElement, toggle)
  assert.equal(copy.disabled, true)
  assert.doesNotMatch(addressCard.textContent, /TQp4YdHg9MSrMWz6p8LcuKf6Y1mJYVvnE5/)
})

test('wallet drawer reveals an address before allowing successful copy feedback', async (t) => {
  const previousNavigator = globalThis.navigator
  const copied = []
  globalThis.navigator = { clipboard: { writeText: async (value) => { copied.push(value) } } }
  const harness = await mount()
  t.after(() => {
    harness.cleanup()
    globalThis.navigator = previousNavigator
  })

  const frame = harness.findByTestId('user-onchain-wallet-drawer')
  const addressCard = findIn(harness, frame, (node) => node.getAttribute?.('data-testid') === 'wallet-address-wallet_user_1004_deposit_usdt_trc20')
  const copy = findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址')
  assert.equal(copy.disabled, true)

  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() !== '复制地址').click()
  await harness.flush()
  assert.match(addressCard.textContent, /TQp4YdHg9MSrMWz6p8LcuKf6Y1mJYVvnE5/)
  assert.equal(copy.disabled, false)
  copy.click()
  await harness.flush()

  assert.deepEqual(copied, ['TQp4YdHg9MSrMWz6p8LcuKf6Y1mJYVvnE5'])
  assert.match(frame.textContent, /地址已复制/)
})

test('wallet drawer keeps a failed copy error visible as an alert', async (t) => {
  const previousNavigator = globalThis.navigator
  globalThis.navigator = { clipboard: { writeText: async () => { throw new Error('denied') } } }
  const harness = await mount()
  t.after(() => {
    harness.cleanup()
    globalThis.navigator = previousNavigator
  })

  const frame = harness.findByTestId('user-onchain-wallet-drawer')
  const addressCard = findIn(harness, frame, (node) => node.getAttribute?.('data-testid') === 'wallet-address-wallet_user_1004_deposit_usdt_trc20')
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() !== '复制地址').click()
  await harness.flush()
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址').click()
  await harness.flush()

  const alert = findIn(harness, frame, (node) => node.getAttribute?.('role') === 'alert')
  assert.match(alert.textContent, /复制失败，请手动复制地址/)
})

test('wallet drawer serializes copies across addresses and disables segment actions while pending', async (t) => {
  const previousNavigator = globalThis.navigator
  let resolveFirstCopy
  const copied = []
  globalThis.navigator = {
    clipboard: {
      writeText: (value) => {
        copied.push(value)
        return new Promise((resolvePromise) => {
          resolveFirstCopy = resolvePromise
        })
      }
    }
  }
  const serializedWallet = {
    userId: 'user_1004',
    addresses: [
      wallet.addresses[0],
      {
        ...wallet.addresses[0],
        id: 'wallet_user_1004_deposit_usdc_erc20',
        coin: 'USDC',
        network: 'ERC20',
        address: '0x59E2Ad744D732614dF1Ae8438A1c50493600B1d7',
        label: '备用入金地址'
      },
      wallet.addresses[1]
    ]
  }
  const harness = await mount({ wallet: serializedWallet })
  t.after(() => {
    harness.cleanup()
    globalThis.navigator = previousNavigator
  })

  const frame = harness.findByTestId('user-onchain-wallet-drawer')
  const firstCard = harness.findByTestId('wallet-address-wallet_user_1004_deposit_usdt_trc20')
  const secondCard = harness.findByTestId('wallet-address-wallet_user_1004_deposit_usdc_erc20')
  findIn(harness, firstCard, (node) => node.tag === 'button' && node.textContent.trim() !== '复制地址').click()
  findIn(harness, secondCard, (node) => node.tag === 'button' && node.textContent.trim() !== '复制地址').click()
  await harness.flush()

  const firstCopy = findIn(harness, firstCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址')
  const secondCopy = findIn(harness, secondCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址')
  firstCopy.click()
  await harness.flush()

  assert.equal(secondCopy.disabled, true)
  assert.equal(findIn(harness, frame, (node) => node.tag === 'button' && node.textContent.trim() === '入金地址').disabled, true)
  assert.equal(findIn(harness, frame, (node) => node.tag === 'button' && node.textContent.trim() === '提现地址').disabled, true)
  assert.match(frame.textContent, /其他复制、分组和关闭操作暂不可用/)
  secondCopy.click()
  assert.deepEqual(copied, ['TQp4YdHg9MSrMWz6p8LcuKf6Y1mJYVvnE5'])

  resolveFirstCopy()
  await harness.flush()
  assert.equal(secondCopy.disabled, false)
})

test('wallet drawer blocks closing during copy and ignores a stale completion after reopening', async (t) => {
  const previousNavigator = globalThis.navigator
  let resolveCopy
  globalThis.navigator = {
    clipboard: {
      writeText: () => new Promise((resolvePromise) => { resolveCopy = resolvePromise })
    }
  }
  const harness = await mount()
  t.after(() => {
    harness.cleanup()
    globalThis.navigator = previousNavigator
  })

  let frame = harness.findByTestId('user-onchain-wallet-drawer')
  const addressCard = findIn(harness, frame, (node) => node.getAttribute?.('data-testid') === 'wallet-address-wallet_user_1004_deposit_usdt_trc20')
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() !== '复制地址').click()
  await harness.flush()
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址').click()
  await harness.flush()

  const close = findIn(harness, frame, (node) => node.getAttribute?.('aria-label') === '关闭')
  assert.equal(close.disabled, true)
  assert.match(findIn(harness, frame, (node) => node.getAttribute?.('role') === 'status').textContent, /其他复制、分组和关闭操作暂不可用/)
  close.click()
  const escape = harness.keydown('Escape')
  await harness.flush()
  assert.equal(harness.emitted.filter(([name]) => name === 'onClose').length, 0)
  assert.equal(escape.defaultPrevented, false)

  harness.props.visible = false
  await harness.flush()
  frame.parent.dispatchEvent({ type: 'transitionend', target: frame.parent })
  await harness.flush()
  await harness.finishTransitions()

  harness.props.visible = true
  await harness.flush()
  await harness.finishTransitions()
  resolveCopy()
  await harness.flush()

  frame = harness.findByTestId('user-onchain-wallet-drawer')
  assert.equal(findIn(harness, frame, (node) => node.getAttribute?.('aria-label') === '关闭').disabled, false)
  assert.doesNotMatch(frame.textContent, /地址已复制|复制失败，请手动复制地址|地址复制中/)
})

test('wallet drawer switches to withdrawal records and gives an empty state', async (t) => {
  const harness = await mount()
  t.after(harness.cleanup)
  const frame = harness.findByTestId('user-onchain-wallet-drawer')

  findIn(harness, frame, (node) => node.tag === 'button' && node.textContent.trim() === '提现地址').click()
  await harness.flush()
  assert.match(frame.textContent, /常用提现地址/)
  assert.doesNotMatch(frame.textContent, /主入金地址/)

  harness.props.wallet = { userId: 'user_1004', addresses: [] }
  await harness.flush()
  assert.match(frame.textContent, /暂无提现地址/)
})

test('wallet drawer retains the leave frame and restores configured focus after leave', async (t) => {
  const harness = await mount({ visible: false })
  t.after(harness.cleanup)
  const returnFocus = harness.root
  harness.props.returnFocus = returnFocus
  harness.props.visible = true
  await harness.flush()
  await harness.finishTransitions()

  const frame = harness.findByTestId('user-onchain-wallet-drawer')
  findIn(harness, frame, (node) => node.getAttribute?.('aria-label') === '关闭').click()
  await harness.flush()
  assert.ok(harness.findByTestId('user-onchain-wallet-drawer'))
  frame.parent.dispatchEvent({ type: 'transitionend', target: frame.parent })
  await harness.flush()
  await harness.finishTransitions()

  assert.equal(harness.findByTestId('user-onchain-wallet-drawer'), undefined)
  assert.equal(harness.document.activeElement, returnFocus)
})

test('wallet drawer source maintains the modal drawer contract', () => {
  assert.equal(existsSync(componentPath), true)
  const source = readFileSync(componentPath, 'utf8')

  assert.match(source, /<Teleport to="body">/)
  assert.match(source, /useDialogLifecycle/)
  assert.match(source, /role="dialog"/)
  assert.match(source, /aria-modal="true"/)
  assert.match(source, /aria-labelledby="user-onchain-wallet-title"/)
  assert.match(source, /aria-label="关闭"/)
  const verticalScrollerClasses = source.match(/\boverflow-y-(?:auto|scroll)\b/g) || []
  assert.equal(verticalScrollerClasses.length, 1)
  assert.match(source, /data-testid="user-onchain-wallet-body"[^>]*overflow-y-auto/)
  assert.match(source, /data-testid="user-onchain-wallet-drawer"[^>]*overflow-hidden/)
  assert.match(source, /h-\[100vh\]/)
  assert.match(source, /h-\[100dvh\]/)
  assert.match(source, /safe-area-inset-top/)
  assert.match(source, /safe-area-inset-bottom/)
  assert.match(source, /<header[^>]*safe-area-inset-left/)
  assert.match(source, /<nav[^>]*safe-area-inset-left/)
  assert.match(source, /data-testid="user-onchain-wallet-body"[^>]*safe-area-inset-left/)
  assert.match(source, /200ms ease-out/)
  assert.match(source, /150ms ease-in/)
  assert.match(source, /transition-duration: 50ms/)
  const backdropStart = source.indexOf('<div\n        v-if="rendered')
  const backdropEnd = source.indexOf('>\n        <aside', backdropStart)
  assert.notEqual(backdropStart, -1)
  assert.notEqual(backdropEnd, -1)
  assert.doesNotMatch(source.slice(backdropStart, backdropEnd), /@(?:click|mouse|pointer|touch|drag)/)
  assert.match(source, /\.onchain-wallet-drawer-title:focus\s*\{[^}]*outline:/s)
  assert.match(source, /@media \(forced-colors: active\)[\s\S]*\.onchain-wallet-drawer-title:focus/)
})
