import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../src/pages/admin/liquidity/LiquidityLockedYieldControlPage.vue', import.meta.url),
  'utf8'
)

test('locked liquidity yield control disambiguates same-name products by period rule', () => {
  assert.match(source, /name: 'USDT锁仓宝'/)
  assert.match(source, /ruleId: 'USDT-7D'/)
  assert.match(source, /ruleId: 'USDT-30D'/)
  assert.match(source, /ruleId: 'USDT-90D'/)
  assert.match(source, /lockDays: 7/)
  assert.match(source, /lockDays: 30/)
  assert.match(source, /lockDays: 90/)
  assert.match(source, /const productRuleLabel = \(product\) =>/)
  assert.match(source, /days > 0 \? `\$\{days\}天规则` : '—'/)
  assert.match(source, /const productControlIdentity = \(product\) =>/)
  assert.match(source, /\$\{product\.name\} · \$\{productRuleLabel\(product\)\} · \$\{product\.currency\}/)
  assert.match(source, /搜索产品名称、币种、天数或规则ID/)
  assert.match(source, /\$\{item\.name\} \$\{item\.currency\} \$\{productRuleLabel\(item\)\} \$\{item\.ruleId\} \$\{fmtApr\(item\.baseRate\)\}/)
  assert.match(source, /\{\{ productRuleLabel\(product\) \}\}/)
  assert.match(source, /收益率 \{\{ fmtApr\(product\.baseRate\) \}\}/)
  assert.match(source, /收益率（年化）/)
  assert.match(source, /ID \{\{ product\.ruleId \}\}/)
  assert.match(source, /productName: productControlIdentity\(product\)/)
  assert.match(source, /targetLabel: productControlIdentity\(product\)/)
  assert.match(source, /previewDays\(activeProduct\)/)
  assert.doesNotMatch(source, /USDT-FLEX|活期规则|lockDays: 0|基准 \{\{ fmtApr\(product\.baseRate\) \}\}|基础利率（年化）/)
})
