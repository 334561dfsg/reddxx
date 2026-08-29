import test from 'node:test'
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { createMemoryHistory, createRouter } from 'vue-router'

import { frontDesktopRoutes } from '../src/router/modules/front.js'
import { createSfcHarness, loadVueSfc } from './helpers/vueSfcHarness.js'

const projectFile = (path) => resolve(new URL('..', import.meta.url).pathname, path)
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`

const ordersMockUrl = moduleUrl(`
  export function createLockedOrdersMock() {
    return [{
      id: 'ord-1001',
      productId: 'prod-1',
      productName: 'USDT 定期理财',
      currency: 'USDT',
      amount: 5000,
      lockDays: 10,
      dailyRate: 0.3888,
      totalInterest: 244.4,
      status: 'locked',
      lockedAt: '2026-03-01 14:22:10',
      unlockAt: '2026-03-11 14:22:10',
      completedAt: null,
      daysRemaining: 0
    }]
  }
`)

const productsMockUrl = moduleUrl(`
  export const lockedProductsCatalog = {
    value: [{
      id: 'prod-1',
      sortOrder: 50,
      name: 'USDT 定期理财',
      currency: 'USDT',
      icon: '₮',
      periods: [{ days: 10, annualRate: 141.912, minAmount: 200, maxAmount: 8000 }],
      earlyRedeemEnabled: true,
      earlyRedeemFee: 4,
      minVipLevel: 0,
      minKycLevel: 'none',
      purchaseLimitType: 'lifetime',
      lifetimeLimit: 50000,
      periodLimit: 10000,
      periodDays: 30,
      status: 'enabled'
    }]
  }
`)

const emptyExtraOrdersUrl = moduleUrl(`
  export function buildLockedDemoExtraOrders() {
    return []
  }
`)

const loadList = async () => {
  const componentFile = projectFile('src/pages/front/finance/liquidity/FinanceLiquidityListPage.vue')
  return loadVueSfc(componentFile, {
    vueImports: {
      [projectFile('src/admin/mock/liquidityLocked')]: ordersMockUrl,
      [projectFile('src/admin/state/financeCatalogs')]: productsMockUrl,
      [projectFile('src/admin/mock/frontFinanceDemoBulk')]: emptyExtraOrdersUrl
    }
  })
}

const loadOrderDetail = async () => {
  const componentFile = projectFile('src/pages/front/finance/liquidity/FinanceLiquidityOrderDetailPage.vue')
  return loadVueSfc(componentFile, {
    vueImports: {
      [projectFile('src/admin/mock/liquidityLocked')]: ordersMockUrl,
      [projectFile('src/admin/state/financeCatalogs')]: productsMockUrl,
      [projectFile('src/admin/mock/frontFinanceDemoBulk')]: emptyExtraOrdersUrl
    }
  })
}

const findByAriaLabel = (harness, label) =>
  harness.allNodes().find((node) => node.getAttribute?.('aria-label') === label)

const financeChildren = () => frontDesktopRoutes.find((route) => route.path === 'finance')?.children || []

test('front liquidity order detail route hides mobile chrome', () => {
  const route = financeChildren().find((row) => row.name === 'front-finance-liquidity-order-detail')
  assert.ok(route, 'liquidity order detail route should exist')
  assert.equal(route.meta?.hideFrontChromeOnMobile, true)
  assert.equal(route.meta?.hideFrontFloatingOnMobile, true)
})

test('front liquidity order list opens order details on a dedicated page', async (t) => {
  const component = await loadList()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/front/finance', component: { template: '<div />' } },
      { path: '/front/finance/liquidity', component },
      { path: '/front/finance/liquidity/order/:orderId', component: { template: '<div />' } },
      { path: '/front/finance/liquidity/:productId', component: { template: '<div />' } }
    ]
  })
  await router.push('/front/finance/liquidity')
  const harness = await createSfcHarness(component, {}, {}, { plugins: [router] })
  t.after(() => harness.cleanup())

  harness.findByText('我的订单', 'button').dispatchEvent({ type: 'click' })
  await harness.flush()

  const detailLink = harness.findByText('查看详情', 'a')
  assert.ok(detailLink, 'my orders list should link to the order detail page')
  assert.equal(detailLink.getAttribute('href'), '/front/finance/liquidity/order/ord-1001?from=orders')
  assert.equal(harness.findByText('订单详情'), undefined, 'list should not expand order details inline')
})

test('front liquidity order list restores my orders from query', async (t) => {
  const component = await loadList()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/front/finance', component: { template: '<div />' } },
      { path: '/front/finance/liquidity', component },
      { path: '/front/finance/liquidity/order/:orderId', component: { template: '<div />' } },
      { path: '/front/finance/liquidity/:productId', component: { template: '<div />' } }
    ]
  })
  await router.push('/front/finance/liquidity?tab=orders')
  const harness = await createSfcHarness(component, {}, {}, { plugins: [router] })
  t.after(() => harness.cleanup())

  assert.ok(harness.findByText('订单明细'), 'orders tab should be restored from the route query')
  const productsTab = harness.allNodes().find((node) => node.tag === 'button' && node.getAttribute?.('role') === 'tab' && node.textContent.includes('挖矿产品'))
  const ordersTab = harness.allNodes().find((node) => node.tag === 'button' && node.getAttribute?.('role') === 'tab' && node.textContent.includes('我的订单'))
  assert.equal(productsTab.getAttribute('class').includes('text-lime-200'), false)
  assert.equal(ordersTab.getAttribute('class').includes('text-lime-200'), true)
})

test('front liquidity order mobile cards separate status from actions', async (t) => {
  const component = await loadList()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/front/finance', component: { template: '<div />' } },
      { path: '/front/finance/liquidity', component },
      { path: '/front/finance/liquidity/order/:orderId', component: { template: '<div />' } },
      { path: '/front/finance/liquidity/:productId', component: { template: '<div />' } }
    ]
  })
  await router.push('/front/finance/liquidity')
  const harness = await createSfcHarness(component, {}, {}, { plugins: [router] })
  t.after(() => harness.cleanup())

  harness.findByText('我的订单', 'button').dispatchEvent({ type: 'click' })
  await harness.flush()

  const cardInfo = harness.allNodes().find((node) => node.getAttribute?.('data-testid') === 'liquidity-order-card-info-ord-1001')
  assert.ok(cardInfo, 'mobile order card should keep status inside the existing info grid')
  assert.ok(cardInfo.textContent.includes('当前状态'))
  assert.ok(cardInfo.textContent.includes('待领取'))

  const mobileActions = harness.allNodes().find((node) => node.getAttribute?.('data-testid') === 'liquidity-order-card-actions-ord-1001')
  assert.ok(mobileActions, 'mobile order card should keep actions in a dedicated footer')
  assert.ok(mobileActions.getAttribute('class').includes('grid grid-cols-2'), 'action footer should split the mobile row into two equal columns')
  assert.ok(mobileActions.textContent.includes('查看详情'))
  assert.ok(mobileActions.textContent.includes('领取本息'))
  assert.equal(mobileActions.textContent.includes('待领取'), false, 'action footer should not include status text')
  const actionControls = mobileActions.children.filter((node) => ['a', 'button'].includes(node.tag))
  assert.ok(actionControls.length >= 2, 'mobile order card should render at least two actions for matured orders')
  actionControls.forEach((node) => {
    assert.ok(
      node.getAttribute('class').includes('max-md:w-full'),
      'mobile order actions should fill their half-width action column'
    )
  })
})

test('front liquidity order detail page shows daily earnings rows', async (t) => {
  const component = await loadOrderDetail()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/front/finance', component: { template: '<div />' } },
      { path: '/front/finance/liquidity', component: { template: '<div />' } },
      { path: '/front/finance/liquidity/order/:orderId', component }
    ]
  })
  await router.push('/front/finance/liquidity/order/ord-1001')
  const harness = await createSfcHarness(component, {}, {}, { plugins: [router] })
  t.after(() => harness.cleanup())

  const page = findByAriaLabel(harness, '流动性挖矿订单详情页')
  assert.ok(page, 'detail page should expose a page landmark for mobile chrome-free layout')
  assert.ok(page.getAttribute('class').includes('min-h-[100dvh]'))
  assert.ok(harness.findByText('订单详情'), 'detail page should identify itself')
  const mobileTitleBar = findByAriaLabel(harness, '订单详情移动端标题栏')
  assert.ok(mobileTitleBar, 'detail page should provide its own mobile title bar')
  assert.ok(harness.findByText('详情'), 'mobile title bar should use the compact title')
  assert.equal(
    findByAriaLabel(harness, '返回流动性挖矿')?.getAttribute('href'),
    '/front/finance/liquidity?tab=orders'
  )
  assert.ok(harness.findByText('每日收益明细'), 'detail page should show the daily earnings section')
  assert.ok(harness.root.textContent.includes('19.440000 USDT'), 'daily earnings amount should be shown')
  assert.ok(harness.root.textContent.includes('累计收益'), 'daily table should include cumulative earnings')

  const headers = harness.allNodes().filter((node) => node.tag === 'th').map((node) => node.textContent.trim())
  assert.ok(headers.includes('收益'), 'daily table should label earnings as 收益')
  assert.equal(headers.includes('每日收益'), false, 'daily table should not use 每日收益 as a column label')
  assert.equal(headers.includes('状态'), false, 'daily table should not show a status column')

  const dailySection = findByAriaLabel(harness, '每日收益明细')
  assert.ok(dailySection, 'detail page should keep a daily earnings section')
  assert.doesNotMatch(dailySection.textContent, /天数|第 1 天|已计息|待计息/)
  assert.equal(dailySection.textContent.includes('2026-03-10'), false, 'daily earnings should initially show the first page only')

  const mobileDailyList = findByAriaLabel(harness, '移动端每日收益明细列表')
  assert.ok(mobileDailyList, 'daily earnings should use mobile cards instead of a squeezed table on small screens')
  assert.ok(mobileDailyList.getAttribute('class').includes('md:hidden'))
  const firstDailyCard = harness.allNodes().find((node) => node.getAttribute?.('data-testid') === 'daily-earning-card-1')
  assert.ok(firstDailyCard, 'daily earnings mobile list should render one card per earnings day')
  assert.ok(firstDailyCard.getAttribute('aria-label').includes('2026-03-01 收益明细'))
  assert.ok(firstDailyCard.textContent.includes('日期'))
  assert.ok(firstDailyCard.textContent.includes('收益'))
  assert.ok(firstDailyCard.textContent.includes('累计收益'))
  assert.ok(firstDailyCard.textContent.includes('19.440000 USDT'))
  const desktopDailyTable = findByAriaLabel(harness, '桌面端每日收益明细表格')
  assert.ok(desktopDailyTable, 'daily earnings should keep the desktop table for wider screens')
  assert.ok(desktopDailyTable.getAttribute('class').includes('hidden md:block'))

  const loadMoreButton = harness.findByText('加载更多', 'button')
  assert.ok(loadMoreButton, 'daily earnings section should offer a load more button when more rows exist')
  loadMoreButton.click()
  await harness.flush()
  assert.ok(dailySection.textContent.includes('2026-03-10'), 'load more should append the next daily earnings rows')
  assert.equal(harness.findByText('加载更多', 'button'), undefined, 'load more button should disappear when all rows are visible')

  const summary = findByAriaLabel(harness, '订单概要')
  assert.ok(summary, 'detail page should keep an order summary section')
  assert.equal(harness.findByText('订单概要'), undefined, 'summary section should not show a heading block')
  assert.ok(summary.textContent.includes('订单号'))
  assert.ok(summary.textContent.includes('产品'))
  assert.ok(summary.textContent.includes('金额'))
  assert.equal(summary.textContent.includes('订单状态'), false)
  assert.equal(
    summary.textContent.includes('USDT 流动性挖矿订单'),
    false,
    'summary section should not show the product subtitle block'
  )
  assert.doesNotMatch(summary.textContent, /锁仓期限|下单时间|到期时间|每日收益|日收益率|基础收益|收益调整|预计总收益|实际总收益/)
})
