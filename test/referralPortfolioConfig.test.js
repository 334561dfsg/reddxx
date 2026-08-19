import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('referral config includes portfolio commission line and default rates', () => {
  const constants = readFileSync(new URL('../src/admin/constants/referral.js', import.meta.url), 'utf8')
  const mock = readFileSync(new URL('../src/admin/mock/referral.js', import.meta.url), 'utf8')
  const page = readFileSync(new URL('../src/pages/admin/agent/ReferralConfigPage.vue', import.meta.url), 'utf8')

  assert.match(constants, /PORTFOLIO_COMMISSION_RATES: 'portfolioCommissionRates'/)
  assert.match(constants, /commissionPortfolioEnabled: false/)
  assert.match(constants, /portfolioCommissionRates: '0,0,0'/)

  assert.match(mock, /'portfolioCommissionRates'/)
  assert.match(mock, /'commissionPortfolioEnabled'/)

  assert.match(page, /key: 'portfolio'/)
  assert.match(page, /enabledKey: 'commissionPortfolioEnabled'/)
  assert.match(page, /ratesKey: 'portfolioCommissionRates'/)
  assert.match(page, /title: '投资组合'/)
  assert.match(page, /投资组合订单/)
  assert.match(page, /lineKeys: \['aiQuant', 'portfolio', 'lending', 'borrowing'\]/)
})

test('referral config explains fee-based commission bases', () => {
  const page = readFileSync(new URL('../src/pages/admin/agent/ReferralConfigPage.vue', import.meta.url), 'utf8')

  assert.match(page, /交易类产品按该笔订单实收的交易手续费记佣/)
  assert.match(page, /理财类及产品策略按认购手续费、违约手续费记佣/)
  assert.match(page, /认购手续费.*违约手续费/)
  assert.doesNotMatch(page, /计佣本金/)
})
