// Earn service implementation; pages import the bound functions from ./earn.js. The in-memory portfolio
// (earnPortfolio.js) stands in for the server. Each function documents the HTTP shape it replaces.
//
// Catalogue products are returned as the shared catalogue objects so their locale-aware `name` getter keeps
// following the language switch; a real API returns the localized name per request locale instead.
import {earnPortfolioFor, earnBalance, earnCommitted, recordEarnSubscription, redeemEarnHolding} from '../earnPortfolio.js'
import {earnSummary} from '../utils/mockEarnPortfolio.js'
import {ApiError, mockCall, snapshot} from './transport.js'

const SERVICE = 'earn'

/** Builds the service over a product catalogue (earn.js binds the localized site catalogue; tests pass raw facts). */
export function createEarnApi(products) {
  const productById = id => products.find(product => product.id === id)
  const withProduct = row => ({...row, product: productById(row.productId) || null})

  /** GET /earn/products */
  const listEarnProducts = () => mockCall(SERVICE, () => [...products])

  /** GET /earn/products/:id — ApiError('notFound') for an unknown id. */
  const getEarnProduct = id => mockCall(SERVICE, () => {
    const product = productById(id)
    if (!product) throw new ApiError('notFound')
    return product
  })

  /**
   * GET /earn/portfolio?mode= — summary plus every list of the My Earnings page.
   * Holdings exclude fully redeemed rows; every row carries its catalogue `product`.
   */
  const getEarnPortfolio = mode => mockCall(SERVICE, () => {
    const portfolio = earnPortfolioFor(mode)
    const data = snapshot({holdings: portfolio.holdings, orders: portfolio.orders, redemptions: portfolio.redemptions, rewards: portfolio.rewards})
    return {
      summary: earnSummary(portfolio, products),
      holdings: data.holdings.filter(row => row.status !== 'redeemed').map(withProduct),
      orders: data.orders.map(withProduct),
      redemptions: data.redemptions.map(withProduct),
      rewards: data.rewards.map(withProduct),
    }
  })

  /** GET /earn/holdings/:id?mode= — ApiError('notFound') when the holding does not exist in this mode. */
  const getEarnHolding = (holdingId, mode) => mockCall(SERVICE, () => {
    const holding = earnPortfolioFor(mode).holdings.find(row => row.id === holdingId)
    if (!holding) throw new ApiError('notFound')
    return withProduct(snapshot(holding))
  })

  /** GET /earn/products/:id/subscription-context?mode= — wallet balance and this user's committed amount. */
  const getEarnSubscriptionContext = (productId, mode) => mockCall(SERVICE, () => {
    const product = productById(productId)
    if (!product) throw new ApiError('notFound')
    return {balance: earnBalance(mode, product.symbol), committed: earnCommitted(product.id, mode)}
  })

  /**
   * POST /earn/subscriptions {productId, amount, mode, requestId} — creates a pending-review order (no holding yet);
   * a repeated requestId returns the order it already created.
   * Validation failures reject with the same codes as subscriptionError() plus eligibility codes.
   */
  const subscribeEarn = ({productId, amount, mode, requestId}) => mockCall(SERVICE, () => {
    const product = productById(productId)
    if (!product) throw new ApiError('notFound')
    return snapshot(recordEarnSubscription(product, Number(amount), mode, requestId))
  })

  /**
   * POST /earn/redemptions {holdingId, amount, acknowledgeEarly, requestId, mode}. A repeated requestId returns
   * the original record (idempotent). Failures reject with redemptionQuote() codes, e.g. 'exceedsPrincipal'.
   */
  const redeemEarn = ({holdingId, amount, acknowledgeEarly = false, requestId, mode}) => mockCall(SERVICE, () => {
    const result = redeemEarnHolding(holdingId, amount, {id: requestId, acknowledgeEarly}, mode)
    if (result.error) {
      const {error, ...params} = result
      throw new ApiError(error, params)
    }
    return snapshot(result.record)
  })

  return {listEarnProducts, getEarnProduct, getEarnPortfolio, getEarnHolding, getEarnSubscriptionContext, subscribeEarn, redeemEarn}
}
