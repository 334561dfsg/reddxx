import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  applyPortfolioYieldAdjustment,
  calculatePortfolioEstimate,
  canSubscribePortfolio,
  PRODUCT_STATUS,
  resetPortfolioYieldAdjustment
} from '../src/admin/constants/portfolio.js'
import { getFrontFinanceChannelEntries } from '../src/constants/frontNav.js'
import { frontDesktopRoutes } from '../src/router/modules/front.js'
import { navTree } from '../src/admin/config/nav.js'
import { consoleRoutes } from '../src/router/modules/console.js'

test('calculates portfolio subscription estimates from daily rate range and fee', () => {
  const result = calculatePortfolioEstimate(1000, {
    durationDays: 3,
    minDailyRatePct: 0.2,
    maxDailyRatePct: 0.6,
    subscriptionFeePct: 0.3
  })

  assert.deepEqual(result, {
    principal: 1000,
    minYield: 6,
    maxYield: 18,
    fee: 3,
    minSettlement: 1003,
    maxSettlement: 1015
  })
})

test('validates whether a portfolio product can be subscribed', () => {
  const product = {
    status: PRODUCT_STATUS.ENABLED,
    minAmount: 1000,
    maxAmount: 30000
  }

  assert.deepEqual(canSubscribePortfolio(product, 1000), { ok: true, reason: '' })
  assert.equal(canSubscribePortfolio(product, 999).reason, '金额低于最低申购金额')
  assert.equal(canSubscribePortfolio(product, 1000, { availableBalance: 500 }).reason, '可用余额不足')
  assert.equal(canSubscribePortfolio({ ...product, status: PRODUCT_STATUS.DISABLED }, 1000).reason, '产品当前不可认购')
})

test('applies and resets portfolio yield adjustment against base daily rates', () => {
  const product = {
    id: 'pf-test',
    minDailyRatePct: 0.2,
    maxDailyRatePct: 0.6
  }

  const adjusted = applyPortfolioYieldAdjustment(product, 50)
  assert.equal(adjusted.yieldAdjustmentRate, 50)
  assert.equal(adjusted.currentYieldMultiplier, 1.5)
  assert.equal(adjusted.baseMinDailyRatePct, 0.2)
  assert.equal(adjusted.baseMaxDailyRatePct, 0.6)
  assert.equal(adjusted.minDailyRatePct, 0.3)
  assert.equal(adjusted.maxDailyRatePct, 0.9)

  const reset = resetPortfolioYieldAdjustment(adjusted)
  assert.equal(reset.yieldAdjustmentRate, 0)
  assert.equal(reset.currentYieldMultiplier, 1)
  assert.equal(reset.minDailyRatePct, 0.2)
  assert.equal(reset.maxDailyRatePct, 0.6)
})

test('front portfolio subscription surfaces balance and detail-page subscribe flow', () => {
  const listSource = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )
  const detailSource = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(detailSource, /confirmSubscribe/)
  assert.match(detailSource, /账户余额/)
  assert.match(detailSource, /确定/)
})

test('front portfolio list uses detail page as the only subscription entry', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /:to="`\$\{prefix\}\/finance\/portfolio\/\$\{product\.id\}`"/)
  assert.match(source, /查看并参与/)
  assert.doesNotMatch(source, /selectedProduct|subscribeAmount|openSubscribe|closeSubscribe|confirmSubscribe|calculatePortfolioEstimate|canSubscribePortfolio|availableBalance|参与使用|认购组合|确认认购|当前可用余额/)
})

test('front portfolio list removes hero description and top summary card', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /投资组合/)
  assert.match(source, /组合市场/)
  assert.doesNotMatch(source, /以 USDT 申购多币种组合产品|在售组合/)
  assert.doesNotMatch(source, /<div class="mt-6 grid gap-6 lg:grid-cols-\[1\.25fr_0\.75fr\] lg:items-end">/)
})

test('front portfolio list only renders enabled products', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /const enabledProducts = computed\(\(\) =>\s*sortPortfolioProducts\(products\.value\.filter\(\(product\) => product\.status === PRODUCT_STATUS\.ENABLED\)\)\s*\)/)
  assert.match(source, /v-for="product in visibleProducts"/)
  assert.doesNotMatch(source, /v-for="product in products"/)
})

test('front portfolio mobile market uses load-more paging instead of desktop page controls', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /const mobileProductPageSize = 4/)
  assert.match(source, /visibleProductCount/)
  assert.match(source, /const visibleProducts = computed\(\(\) => enabledProducts\.value\.slice\(0, visibleProductCount\.value\)\)/)
  assert.match(source, /const hasMoreProducts = computed\(\(\) => visibleProductCount\.value < enabledProducts\.value\.length\)/)
  assert.match(source, /function loadMoreProducts\(\)/)
  assert.match(source, /v-if="hasMoreProducts"/)
  assert.match(source, /加载更多组合/)
  assert.match(source, /v-for="product in enabledProducts"/)
})

test('front portfolio detail follows the mobile portfolio subscription layout', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /product\.assets/)
  assert.match(source, /组合信息/)
  assert.match(source, /申购金额/)
  assert.doesNotMatch(source, /预计申购金额/)
  assert.match(source, /怎样进行运作/)
  assert.doesNotMatch(source, /产品规则|收益模拟/)
})

test('front portfolio detail subscribes inline without popup dialog', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /v-model="amount"/)
  assert.match(source, /@click="decreaseAmount"/)
  assert.match(source, /@click="increaseAmount"/)
  assert.match(source, /@click="confirmSubscribe"/)
  assert.match(source, /请输入投资金额/)
  assert.doesNotMatch(source, /FrontPopupShell|FrontPopupCard|FrontPopupCloseButton/)
  assert.doesNotMatch(source, /subscribeOpen|openSubscribeDialog|closeSubscribeDialog/)
  assert.doesNotMatch(source, /close-on-backdrop|variant="flow"|\swide(?:\s|>)|参与使用/)
})

test('front portfolio detail uses mobile-sized typography and card proportions', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /max-w-\[430px\]/)
  assert.match(source, /text-\[15px\]/)
  assert.match(source, /text-\[16px\]/)
  assert.match(source, /h-14 w-14/)
  assert.match(source, /min-h-\[8\.75rem\]/)
  assert.match(source, /min-h-\[4\.5rem\]/)
  assert.doesNotMatch(source, /max-w-\[46rem\]|text-\[1\.38rem\]/)
})

test('front portfolio mobile detail keeps the top title bar fixed', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /pt-\[5\.5rem\]/)
  assert.match(source, /fixed inset-x-0 top-0 z-50/)
  assert.match(source, /max-w-\[430px\]/)
  assert.match(source, /bg-black\/90/)
  assert.match(source, /backdrop-blur/)
  assert.match(source, /absolute left-4/)
  assert.match(source, /absolute right-4/)
})

test('front portfolio mobile detail spaces asset cards and plus signs cleanly', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /rounded-2xl bg-\[#121212\] p-4/)
  assert.match(source, /grid grid-cols-3 gap-5/)
  assert.match(source, /min-h-\[8\.75rem\] rounded-\[1\.35rem\] bg-black px-3 pb-4 pt-4/)
  assert.match(source, /-left-\[1\.45rem\] top-1\/2 -translate-y-1\/2/)
  assert.doesNotMatch(source, /rounded-b-2xl bg-black px-2 pb-5 pt-2/)
  assert.doesNotMatch(source, /-left-5 top-\[3\.65rem\]/)
})

test('front portfolio detail provides a separate desktop layout', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /max-w-7xl/)
  assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_24rem\]/)
  assert.match(source, /lg:sticky lg:top-8/)
  assert.match(source, /PC 详情/)
  assert.match(source, /lg:hidden/)
  assert.match(source, /hidden lg:block/)
})

test('front portfolio detail uses asset-symbol title and shows compact VIP tag on mobile and desktop', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /function formatPortfolioAssetTitle\(nextProduct = product\.value\)/)
  assert.match(source, /nextProduct\.assets\.map\(\(asset\) => asset\.symbol\)\.join\(' \+ '\)/)
  assert.match(source, /\{\{ formatPortfolioAssetTitle\(product\) \}\}/)
  assert.match(source, /v-if="product\.minVipLevel > 0"/)
  assert.match(source, /VIP \{\{ product\.minVipLevel \}\}/)
  assert.doesNotMatch(source, /VIP 要求/)
  assert.doesNotMatch(source, /VIP \{\{ product\.minVipLevel \}\}\+/)
  assert.doesNotMatch(source, /\{\{ product\.name \}\}/)
})

test('front portfolio desktop detail stays aligned with finance module visual system', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /金融<\/RouterLink>/)
  assert.match(source, /Portfolio Earn/)
  assert.match(source, /text-3xl font-bold tracking-tight text-white sm:text-4xl/)
  assert.match(source, /lg:grid-cols-\[minmax\(0,1fr\)_24rem\]/)
  assert.match(source, /rounded-2xl border border-white\/\[0\.08\] bg-white\/\[0\.025\]/)
  assert.match(source, /bg-lime-400/)
  assert.doesNotMatch(source, /rounded-\[1\.75rem\]|text-\[40px\]|border-cyan-300|bg-cyan-400|shadow-\[0_24px_80px/)
  assert.doesNotMatch(source, /<button\s*\n\s*<button/)
})

test('front portfolio orders use order tabs without summary stats', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /我的订单/)
  assert.match(source, /订单明细/)
  assert.match(source, /orderPanel/)
  assert.match(source, /进行中/)
  assert.match(source, /已赎回/)
  assert.match(source, /filteredOrders/)
  assert.match(source, /pagedOrders/)
  assert.match(source, /共 \{\{ filteredOrders\.length \}\} 条/)
  assert.doesNotMatch(source, /我的组合|运行中订单|托管本金|累计收益/)
})

test('front portfolio orders include pagination controls', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /currentOrderPage/)
  assert.match(source, /orderPageSize/)
  assert.match(source, /totalOrderPages/)
  assert.match(source, /goOrderPage/)
  assert.match(source, /上一页/)
  assert.match(source, /下一页/)
  assert.match(source, /v-for="page in totalOrderPages"/)
})

test('front portfolio mobile orders use incremental loading while desktop keeps page controls', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /const mobileOrderPageSize = 5/)
  assert.match(source, /visibleOrderCount/)
  assert.match(source, /const mobilePagedOrders = computed\(\(\) => filteredOrders\.value\.slice\(0, visibleOrderCount\.value\)\)/)
  assert.match(source, /const hasMoreOrders = computed\(\(\) => visibleOrderCount\.value < filteredOrders\.value\.length\)/)
  assert.match(source, /function loadMoreOrders\(\)/)
  assert.match(source, /v-for="order in mobilePagedOrders"/)
  assert.match(source, /v-for="order in pagedOrders"/)
  assert.match(source, /加载更多订单/)
  assert.match(source, /class="hidden flex-wrap items-center justify-between gap-3 border-t border-white\/\[0\.08\] p-5 text-sm lg:flex"/)
})

test('front portfolio mobile order status tabs stay side by side', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /mt-5 grid grid-cols-2 rounded-2xl border border-white\/\[0\.08\] bg-black\/35 p-1/)
  assert.doesNotMatch(source, /mt-5 grid rounded-2xl border border-white\/\[0\.08\] bg-black\/35 p-1 sm:max-w-xl sm:grid-cols-2/)
})

test('front portfolio mobile list reduces text density and uses compact cards', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /text-2xl font-bold tracking-tight text-white sm:text-4xl/)
  assert.match(source, /text-lg font-bold tracking-tight text-white/)
  assert.match(source, /grid grid-cols-2 gap-2 text-\[13px\]/)
  assert.match(source, /sm:grid-cols-4/)
  assert.match(source, /text-\[15px\] font-semibold text-white/)
  assert.match(source, /class="block text-lg font-bold tracking-tight text-white/)
})

test('front portfolio market cards hide enabled status and keep title spacing clean', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.doesNotMatch(source, /productStatusMeta|productStatusClass/)
  assert.doesNotMatch(source, /productStatusMeta\[product\.status\]\?\.label/)
  assert.doesNotMatch(source, /已启用/)
  assert.match(source, /<div class="pr-14 sm:pr-16">\s*<RouterLink/)
})

test('front portfolio market cards show monthly remaining subscription count', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /function getMonthlyRemainingCount\(product\)/)
  assert.match(source, /product\.monthlyLimitCount/)
  assert.match(source, /order\.userId === currentUserId/)
  assert.match(source, /order\.productId === product\.id/)
  assert.match(source, /本月剩余/)
  assert.match(source, /getMonthlyRemainingCount\(product\) \}\} 次/)
})

test('front portfolio market cards use asset symbols as title and show compact VIP tag only when required', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /function formatPortfolioAssetTitle\(product\)/)
  assert.match(source, /product\.assets\.map\(\(asset\) => asset\.symbol\)\.join\(' \+ '\)/)
  assert.match(source, /\{\{ formatPortfolioAssetTitle\(product\) \}\}/)
  assert.doesNotMatch(source, /\{\{ product\.name \}\}/)
  assert.match(source, /v-if="product\.minVipLevel > 0"/)
  assert.match(source, /VIP \{\{ product\.minVipLevel \}\}/)
  assert.doesNotMatch(source, /VIP 要求/)
  assert.doesNotMatch(source, /VIP \{\{ product\.minVipLevel \}\}\+/)
  assert.doesNotMatch(source, /稳健组合|进取组合|平衡组合|轻量组合|趋势组合/)
})

test('portfolio admin editor exposes required configuration fields', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )

  for (const field of [
    'productForm.id',
    'productForm.quoteCurrency',
    'productForm.minVipLevel',
    'productForm.userLimitAmount',
    'productForm.monthlyLimitCount'
  ]) {
    assert.match(source, new RegExp(field.replace('.', '\\.')))
  }
})

test('portfolio admin redeem mode select only shows two demo options', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /const earlyRedeemModeOptions = \[/)
  assert.match(source, /label: '扣除全部收益和手续费'/)
  assert.match(source, /label: '保留收益扣除手续费'/)
  assert.match(source, /v-for="option in earlyRedeemModeOptions"/)
  assert.doesNotMatch(source, /v-for="\(meta, key\) in earlyRedeemModeMeta"/)
})

test('portfolio admin selects min VIP level from configured VIP levels', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /getActiveVipLevels/)
  assert.match(source, /activeVipLevels/)
  assert.match(source, /<select\s+v-model\.number="productForm\.minVipLevel"/)
  assert.doesNotMatch(source, /<input\s+v-model\.number="productForm\.minVipLevel"/)
})

test('portfolio products support configurable hot badge display', () => {
  const adminSource = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )
  const listSource = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )
  const detailSource = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )
  const mockSource = readFileSync(new URL('../src/admin/mock/portfolio.js', import.meta.url), 'utf8')

  assert.match(adminSource, /productForm\.isHot/)
  assert.match(adminSource, /HOT 角标/)
  assert.match(listSource, /product\.isHot/)
  assert.match(detailSource, /product\.isHot/)
  assert.match(mockSource, /isHot:/)
})

test('portfolio admin supports numeric sorting and recommended flag', () => {
  const adminSource = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )
  const listSource = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )
  const mockSource = readFileSync(new URL('../src/admin/mock/portfolio.js', import.meta.url), 'utf8')

  assert.match(mockSource, /sortOrder:/)
  assert.match(mockSource, /isRecommended:/)
  assert.match(adminSource, /productForm\.sortOrder/)
  assert.match(adminSource, /v-model\.number="productForm\.sortOrder"/)
  assert.match(adminSource, /productForm\.isRecommended/)
  assert.match(adminSource, /加到推荐/)
  assert.doesNotMatch(adminSource, /<div>排序 \{\{ Number\(product\.sortOrder\) \|\| 0 \}\}<\/div>/)
  assert.match(adminSource, /sortPortfolioProducts/)
  assert.match(listSource, /sortPortfolioProducts/)
})

test('portfolio admin requires confirmation before enabling or disabling product', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /window\.confirm/)
  assert.match(source, /确认禁用/)
  assert.match(source, /确认启用/)
  assert.match(source, /if \(!confirmed\) return/)
})

test('front portfolio list places daily yield in the lower metrics grid', () => {
  const source = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /<dl class="mt-4 grid[\s\S]*日收益区间[\s\S]*formatPortfolioRateRange\(product\)[\s\S]*<\/dl>/)
  assert.doesNotMatch(source, /<div class="text-right">[\s\S]*日收益区间[\s\S]*formatPortfolioRateRange\(product\)[\s\S]*<\/div>/)
})

test('portfolio UI and admin do not expose display copy configuration', () => {
  const sources = [
    '../src/admin/mock/portfolio.js',
    '../src/pages/admin/portfolio/PortfolioProductPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue'
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

  for (const source of sources) {
    assert.doesNotMatch(source, /展示文案|产品亮点|风险提示|操作说明|highlights|riskNote|operationNote|highlightsText/)
  }
})

test('portfolio UI and admin do not expose minimum holding days configuration', () => {
  const sources = [
    '../src/admin/mock/portfolio.js',
    '../src/pages/admin/portfolio/PortfolioProductPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue'
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

  for (const source of sources) {
    assert.doesNotMatch(source, /minHoldingDays|最短持有天数|持有满/)
  }
})

test('portfolio products only expose enabled and disabled statuses', () => {
  const sources = [
    '../src/admin/constants/portfolio.js',
    '../src/admin/mock/portfolio.js',
    '../src/pages/admin/portfolio/PortfolioProductPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue'
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

  assert.deepEqual(Object.values(PRODUCT_STATUS).sort(), ['disabled', 'enabled'])
  for (const source of sources) {
    assert.doesNotMatch(source, /SOLD_OUT|MAINTENANCE|sold_out|maintenance|已售罄|维护中/)
  }
})

test('portfolio UI does not expose asset ratio configuration', () => {
  const adminSource = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )
  const detailSource = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue', import.meta.url),
    'utf8'
  )
  const listSource = readFileSync(
    new URL('../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue', import.meta.url),
    'utf8'
  )
  const mockSource = readFileSync(new URL('../src/admin/mock/portfolio.js', import.meta.url), 'utf8')

  for (const source of [adminSource, detailSource, listSource, mockSource]) {
    assert.doesNotMatch(source, /weightPct/)
  }
  assert.doesNotMatch(detailSource, /<h2 class="text-lg font-semibold text-white">组合资产<\/h2>/)
  assert.doesNotMatch(adminSource, /组合资产/)
})

test('portfolio admin selects composition assets from supported exchange coins', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /createAssetsCoinsMock/)
  assert.match(source, /supportedTradeCoins/)
  assert.match(source, /<select\s+v-model="asset\.symbol"/)
  assert.doesNotMatch(source, /<input\s+v-model="asset\.symbol"/)
})

test('portfolio admin limits composition assets to three coins', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioProductPage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /const MAX_PORTFOLIO_ASSETS = 3/)
  assert.match(source, /productForm\.assets\.length >= MAX_PORTFOLIO_ASSETS/)
  assert.match(source, /:disabled="productForm\.assets\.length >= MAX_PORTFOLIO_ASSETS"/)
  assert.match(source, /最多选择 \{\{ MAX_PORTFOLIO_ASSETS \}\} 个币种/)
})

test('portfolio admin provides yield control and adjustment log pages', () => {
  const controlSource = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioYieldControlPage.vue', import.meta.url),
    'utf8'
  )
  const logSource = readFileSync(
    new URL('../src/pages/admin/portfolio/PortfolioYieldAdjustmentLogPage.vue', import.meta.url),
    'utf8'
  )
  const stateSource = readFileSync(
    new URL('../src/admin/state/portfolioYieldAdjustmentLogs.js', import.meta.url),
    'utf8'
  )

  assert.match(controlSource, /portfolioProductsCatalog/)
  assert.match(controlSource, /applyPortfolioYieldAdjustment/)
  assert.match(controlSource, /resetPortfolioYieldAdjustment/)
  assert.match(controlSource, /appendPortfolioYieldAdjustmentLog/)
  assert.match(controlSource, /收益调控/)
  assert.match(controlSource, /调整原因/)
  assert.match(logSource, /portfolioYieldAdjustmentLogs/)
  assert.match(logSource, /收益调整日志/)
  assert.match(logSource, /AdminListPaginationBar/)
  assert.match(stateSource, /portfolioYieldAdjustmentLogs/)
  assert.match(stateSource, /appendPortfolioYieldAdjustmentLog/)
})

test('portfolio admin list pages use pagination', () => {
  const pages = [
    {
      path: '../src/pages/admin/portfolio/PortfolioProductPage.vue',
      rows: 'pagedProducts',
      sourceRows: 'filteredProducts'
    },
    {
      path: '../src/pages/admin/portfolio/PortfolioYieldControlPage.vue',
      rows: 'pagedProducts',
      sourceRows: 'filteredProducts'
    },
    {
      path: '../src/pages/admin/portfolio/PortfolioOrderPage.vue',
      rows: 'pagedOrders',
      sourceRows: 'filteredOrders'
    },
    {
      path: '../src/pages/admin/portfolio/PortfolioYieldRecordsPage.vue',
      rows: 'pagedRecords',
      sourceRows: 'portfolioYieldRecords'
    },
    {
      path: '../src/pages/admin/portfolio/PortfolioOperationLogPage.vue',
      rows: 'pagedLogs',
      sourceRows: 'portfolioOperationLogs'
    }
  ]

  for (const page of pages) {
    const source = readFileSync(new URL(page.path, import.meta.url), 'utf8')
    assert.match(source, /AdminListPaginationBar/)
    assert.match(source, /useAdminListPagination/)
    assert.match(source, new RegExp(`v-for="[^"]+ in ${page.rows}"`))
    assert.match(source, new RegExp(`total-count="${page.sourceRows}\\.length"`))
    assert.match(source, /@update:page-size="onPageSizeChange"/)
  }
})

test('portfolio UI and admin do not expose product share quotas', () => {
  const sources = [
    '../src/admin/constants/portfolio.js',
    '../src/admin/mock/portfolio.js',
    '../src/pages/admin/portfolio/PortfolioProductPage.vue',
    '../src/pages/admin/portfolio/PortfolioRulePage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue'
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

  for (const source of sources) {
    assert.doesNotMatch(source, /totalSlots|remainingSlots|总份额|剩余份额|剩余\s*\d+\s*份/)
  }
})

test('portfolio UI and admin do not expose composition tags', () => {
  const sources = [
    '../src/admin/mock/portfolio.js',
    '../src/pages/admin/portfolio/PortfolioProductPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue'
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

  for (const source of sources) {
    assert.doesNotMatch(source, /组合标签|productForm\.tag|product\.tag|\btag:/)
  }
})

test('portfolio UI and admin do not expose risk levels', () => {
  const sources = [
    '../src/admin/mock/portfolio.js',
    '../src/pages/admin/portfolio/PortfolioProductPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioListPage.vue',
    '../src/pages/front/finance/portfolio/FinancePortfolioDetailPage.vue'
  ].map((path) => readFileSync(new URL(path, import.meta.url), 'utf8'))

  for (const source of sources) {
    assert.doesNotMatch(source, /风险等级|riskLevel|RISK_LEVEL|riskLevelMeta/)
  }
})

test('registers portfolio in front finance navigation and routes', () => {
  const channels = getFrontFinanceChannelEntries('/front')
  assert.equal(channels.find((entry) => entry.key === 'portfolio')?.to, '/front/finance/portfolio')

  const financeRoute = frontDesktopRoutes.find((route) => route.path === 'finance')
  const children = financeRoute.children
  const listRoute = children.find((route) => route.name === 'front-finance-portfolio')
  assert.equal(listRoute?.path, 'portfolio')
  assert.equal(listRoute?.meta?.hideFrontFloatingOnMobile, true)
  const detailRoute = children.find((route) => route.name === 'front-finance-portfolio-detail')
  assert.equal(detailRoute?.path, 'portfolio/:productId')
  assert.equal(detailRoute?.meta?.hideFrontChromeOnMobile, true)
  assert.equal(detailRoute?.meta?.hideFrontFloatingOnMobile, true)
  assert.equal(detailRoute?.meta?.hideFrontChrome, undefined)
})

test('front layout hides chrome only on mobile for immersive routes', () => {
  const source = readFileSync(new URL('../src/layouts/FrontDesktopLayout.vue', import.meta.url), 'utf8')

  assert.match(source, /hideFrontChromeOnMobile/)
  assert.match(source, /showFrontChrome/)
  assert.match(source, /frontTopNavClass/)
  assert.match(source, /frontBottomTabClass/)
  assert.match(source, /crossPlatformNavClass/)
  assert.match(source, /hideFrontFloatingOnMobile/)
  assert.match(source, /frontFloatingClass/)
  assert.match(source, /<FrontTopNav v-if="showFrontChrome" :class="frontTopNavClass"/)
  assert.match(source, /<FrontBottomTabBar v-if="showFrontChrome" :class="frontBottomTabClass"/)
  assert.match(source, /<CustomerServiceFloatButton :class="frontFloatingClass" \/>/)
  assert.match(source, /<CrossPlatformFloatNav v-if="showFrontChrome" :class="crossPlatformNavClass"/)
  assert.match(source, /hideFrontChromeOnMobile\.value \? 'hidden lg:block' : ''/)
  assert.match(source, /hideFrontChromeOnMobile\.value \? 'hidden' : ''/)
  assert.match(source, /hideFrontFloatingOnMobile\.value \? 'hidden lg:inline-flex' : ''/)
  assert.doesNotMatch(source, /route\.matched\.some\(\(record\) => record\.meta\?\.hideFrontChrome\)/)
})

test('registers portfolio admin navigation and routes', () => {
  const item = navTree.find((entry) => entry.title === '投资组合')
  assert.ok(item)
  assert.equal(item.icon, 'finance')
  assert.deepEqual(
    item.children.map((child) => child.path),
    [
      '/admin/portfolio/products',
      '/admin/portfolio/yield-control',
      '/admin/portfolio/yield-adjustment-log',
      '/admin/portfolio/orders',
      '/admin/portfolio/yield-records',
      '/admin/portfolio/operation-log',
      '/admin/portfolio/rules'
    ]
  )

  assert.equal(consoleRoutes.find((route) => route.name === 'portfolio-products')?.path, 'portfolio/products')
  assert.equal(consoleRoutes.find((route) => route.name === 'portfolio-yield-control')?.path, 'portfolio/yield-control')
  assert.equal(consoleRoutes.find((route) => route.name === 'portfolio-yield-adjustment-log')?.path, 'portfolio/yield-adjustment-log')
  assert.equal(consoleRoutes.find((route) => route.name === 'portfolio-orders')?.path, 'portfolio/orders')
  assert.equal(consoleRoutes.find((route) => route.name === 'portfolio-yield-records')?.path, 'portfolio/yield-records')
  assert.equal(consoleRoutes.find((route) => route.name === 'portfolio-operation-log')?.path, 'portfolio/operation-log')
  assert.equal(consoleRoutes.find((route) => route.name === 'portfolio-rules')?.path, 'portfolio/rules')
})

test('admin sidebar defines the portfolio finance icon path', () => {
  const source = readFileSync(new URL('../src/admin/components/SidebarNode.vue', import.meta.url), 'utf8')

  assert.match(source, /finance:/)
})
