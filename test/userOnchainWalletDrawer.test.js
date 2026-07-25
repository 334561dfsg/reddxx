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
      status: 'active'
    },
    {
      id: 'wallet_user_1004_withdrawal_usdt_trc20',
      kind: 'withdrawal',
      coin: 'USDT',
      network: 'TRC20',
      address: 'TRxKJ8TmqVe9Hv7uL6VJgWkFq5K2UE1aPZ',
      label: '常用提现地址',
      status: 'active'
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
})

test('wallet drawer only closes through its intentional close action', async (t) => {
  const harness = await mount()
  t.after(harness.cleanup)
  const frame = harness.findByTestId('user-onchain-wallet-drawer')

  frame.parent.click()
  await harness.flush()
  assert.equal(harness.emitted.filter(([name]) => name === 'onClose').length, 0)

  findIn(harness, frame, (node) => node.getAttribute?.('aria-label') === '关闭').click()
  await harness.flush()
  assert.equal(harness.emitted.filter(([name]) => name === 'onClose').length, 1)
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

  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '显示地址').click()
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
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '显示地址').click()
  await harness.flush()
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址').click()
  await harness.flush()

  const alert = findIn(harness, frame, (node) => node.getAttribute?.('role') === 'alert')
  assert.match(alert.textContent, /复制失败，请手动复制地址/)
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
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '显示地址').click()
  await harness.flush()
  findIn(harness, addressCard, (node) => node.tag === 'button' && node.textContent.trim() === '复制地址').click()
  await harness.flush()

  const close = findIn(harness, frame, (node) => node.getAttribute?.('aria-label') === '关闭')
  assert.equal(close.disabled, true)
  assert.match(findIn(harness, frame, (node) => node.getAttribute?.('role') === 'status').textContent, /地址复制中，请等待复制完成后再关闭/)
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
  assert.match(source, /data-testid="user-onchain-wallet-body"[^>]*overflow-y-auto/)
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
  assert.doesNotMatch(source, /@click\.self|@mousedown\.self|@pointer|@touch|@drag/)
})
