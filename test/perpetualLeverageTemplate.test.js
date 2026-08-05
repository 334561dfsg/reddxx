import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('perpetual leverage template editor includes contract template settings', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/perpetual/PerpetualLeverageTemplatePage.vue', import.meta.url),
    'utf8'
  )
  const mockSource = readFileSync(new URL('../src/admin/mock/perpetual.js', import.meta.url), 'utf8')

  assert.match(source, /activeTemplateTab/)
  assert.match(source, /'leverage', '杠杆档位'/)
  assert.match(source, /'contract', '合约模板'/)
  assert.match(source, /templateOrderMode/)
  assert.match(source, /templateContractFaceValueUsdt/)
  assert.match(source, /templateMaintenanceMarginRate/)
  assert.match(source, /templateLiquidationFeeRate/)
  assert.match(source, /下单模式/)
  assert.match(source, /按成本\(USDT\)下单/)
  assert.match(source, /按数量\(张数=币价\)下单/)
  assert.match(source, /合约面值/)
  assert.match(source, /维持保证金率/)
  assert.match(source, /强平手续费率/)
  assert.match(source, /value="cost"/)
  assert.match(source, /value="quantity"/)
  assert.match(source, /templateOrderMode\.value = template\.orderMode \?\? 'cost'/)
  assert.match(source, /templateContractFaceValueUsdt\.value = Number\(template\.contractFaceValueUsdt \?\? 1000\)/)
  assert.match(source, /templateMaintenanceMarginRate\.value = Number\(template\.maintenanceMarginRate \?\? 0\.5\)/)
  assert.match(source, /templateLiquidationFeeRate\.value = Number\(template\.liquidationFeeRate \?\? 0\)/)
  assert.match(source, /orderMode: templateOrderMode\.value/)
  assert.match(source, /contractFaceValueUsdt: Number\(templateContractFaceValueUsdt\.value\) \|\| 1000/)
  assert.match(source, /maintenanceMarginRate: Number\(templateMaintenanceMarginRate\.value\) \|\| 0\.5/)
  assert.match(source, /liquidationFeeRate: Number\(templateLiquidationFeeRate\.value\) \|\| 0/)

  assert.match(mockSource, /orderMode: 'cost'/)
  assert.match(mockSource, /contractFaceValueUsdt: 1000/)
  assert.match(mockSource, /maintenanceMarginRate: 0\.5/)
  assert.match(mockSource, /liquidationFeeRate: 0/)
})

test('perpetual leverage template editor includes trade unlimited switch', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/perpetual/PerpetualLeverageTemplatePage.vue', import.meta.url),
    'utf8'
  )
  const mockSource = readFileSync(new URL('../src/admin/mock/perpetual.js', import.meta.url), 'utf8')

  assert.match(source, /'contract', '合约模板'[\s\S]*\['trade', '交易'\]/)
  assert.match(source, /templateTradeLimitUnlimited/)
  assert.match(source, /savePerpetualTemplatesMock/)
  assert.match(source, /templateTradeLimitUnlimited\.value = template\.tradeLimitUnlimited === true/)
  assert.match(source, /tradeLimitUnlimited: templateTradeLimitUnlimited\.value === true/)
  assert.match(source, /templates\.value = savePerpetualTemplatesMock\(templates\.value\)/)
  assert.match(source, /role="switch"/)
  assert.match(source, /不限交易额度/)
  assert.match(source, /使用此杠杆模板的永续合约/)
  assert.match(source, /最低买入量、最大买入量和最大持仓量/)
  assert.match(source, /不影响杠杆档位、下单模式、手续费、维持保证金率和强平手续费率/)
  assert.match(mockSource, /tradeLimitUnlimited: false/)
  assert.match(mockSource, /let perpetualTemplatesState = clone\(perpetualTemplates\)/)
  assert.match(mockSource, /export const savePerpetualTemplatesMock = \(nextTemplates = \[\]\) =>/)
})

test('perpetual contract template settings explain order mode impact and margin formula', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/perpetual/PerpetualLeverageTemplatePage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /模式影响/)
  assert.match(source, /按成本\(USDT\)下单：用户输入的是保证金成本/)
  assert.match(source, /按数量\(张数=币价\)下单：用户输入的是张数，1 张的名义价值等于当前币种价格/)
  assert.match(source, /保证金计算规则/)
  assert.match(source, /按成本模式：保证金 = 用户输入的 USDT 数量 × 合约面值\(配置\)/)
  assert.match(source, /按数量下单模式：保证金 = 用户输入的张数 × 合约面值\(币价\)/)
  assert.match(source, /维持保证金率用于计算爆仓安全线/)
  assert.match(source, /维持保证金 = 仓位价值 × 维持保证金率/)
  assert.match(source, /强平手续费率用于爆仓强平时扣除费用/)
  assert.match(source, /二者不影响下单保证金/)
})

test('perpetual leverage template editor supports validated custom leverage levels', () => {
  const source = readFileSync(
    new URL('../src/pages/admin/perpetual/PerpetualLeverageTemplatePage.vue', import.meta.url),
    'utf8'
  )

  assert.match(source, /customLeverageInput/)
  assert.match(source, /customLeverageError/)
  assert.match(source, /const addCustomLeverage = \(\) =>/)
  assert.match(source, /Number\.isInteger\(value\)/)
  assert.match(source, /value < 1 \|\| value > 1000/)
  assert.match(source, /请输入杠杆倍数/)
  assert.match(source, /请输入 1–1000 的正整数/)
  assert.match(source, /该杠杆档位已存在/)
  assert.match(source, /@keyup\.enter="addCustomLeverage"/)
  assert.match(source, /@click="addCustomLeverage"/)
  assert.match(source, /@click="toggleLeverage\(lv\)"/)
  assert.match(source, /title="删除该档位"/)
  assert.match(source, /bg-rose-50 text-rose-500/)
  assert.match(source, /<svg[^>]+viewBox="0 0 20 20"[^>]+aria-hidden="true"/)
})
