import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('platform report omits salesperson count from user data metrics and rules', () => {
  const source = read('../src/pages/admin/system/PlatformReportPage.vue')

  assert.doesNotMatch(source, /业务员数量/)
})

test('platform report names recharge metrics as user and customer-service deposits', () => {
  const source = read('../src/pages/admin/system/PlatformReportPage.vue')

  assert.match(source, /label: '用户入金'/)
  assert.match(source, /label: '客服入金'/)
  assert.match(source, /每个可提现币种一行，分别展示用户入金、客服入金、到钱包金额/)
  assert.doesNotMatch(source, /充值-充值/)
  assert.doesNotMatch(source, /充值-彩金/)
  assert.doesNotMatch(source, /彩金/)
})

test('platform report renders asset metrics as currency rows with metric columns', () => {
  const source = read('../src/pages/admin/system/PlatformReportPage.vue')

  assert.match(source, /kind: 'assetTable'/)
  assert.match(source, /<th scope="col" class="w-32 whitespace-nowrap px-4 py-3">币种<\/th>/)
  assert.match(source, /v-for="column in section\.tableColumns"/)
  assert.match(source, /v-for="row in section\.rows"/)
  assert.match(source, /提币实际到账/)
  assert.match(source, /提币手续费/)
  assert.doesNotMatch(source, /后台提现/)
  assert.doesNotMatch(source, /划扣/)
})

test('platform report total overview renders all values as zero', () => {
  const source = read('../src/pages/admin/system/PlatformReportPage.vue')

  assert.match(source, /'USDT',\n  'BTC',\n  'ETH',\n  'TRX',\n  'LTC',\n  'PEPE'/)
  assert.match(source, /'TRUMP'/)
  assert.match(source, /'DOGE'/)
  assert.match(source, /label: '用户统计', value: '0'/)
  assert.match(source, /label: '代理数量', value: '0'/)
  assert.match(source, /label: '提现笔数', value: '0'/)
  assert.match(source, /value: '0'/)
  assert.doesNotMatch(source, /200\.000000000000000000/)
  assert.doesNotMatch(source, /1\.000000000000000000/)
  assert.doesNotMatch(source, /value: '31'/)
  assert.doesNotMatch(source, /value: '6'/)
  assert.doesNotMatch(source, /15min/)
  assert.match(source, /title: '充值数据-总'/)
  assert.doesNotMatch(source, /充值数据-总（/)
})

test('platform report only shows user account balance cards in total overview', () => {
  const source = read('../src/pages/admin/system/PlatformReportPage.vue')

  assert.match(source, /平台用户账上资金-总/)
  assert.doesNotMatch(source, /平台用户账上资金-本月/)
  assert.doesNotMatch(source, /平台用户账上资金-今日/)
  assert.match(source, /总览展示平台累计数据，包括平台用户账上资金、用户数据、充值数据、提现数据。/)
  assert.match(source, /本月展示当前自然月维度的数据，包括用户数据、充值数据、提现数据。/)
  assert.match(source, /今日展示当天维度的数据，包括今日新增用户、待审核充值、待审核提现、充值数据、提现数据。/)
  assert.doesNotMatch(source, /本月展示当前自然月维度的数据，包括平台用户账上资金/)
  assert.doesNotMatch(source, /今日展示当天维度的数据，包括平台用户账上资金/)
})

test('platform report exposes month and day period filters', () => {
  const source = read('../src/pages/admin/system/PlatformReportPage.vue')

  assert.match(source, /v-model="selectedMonth"/)
  assert.match(source, /type="month"/)
  assert.match(source, /v-model="selectedDate"/)
  assert.match(source, /type="date"/)
  assert.match(source, /displaySectionTitle\(section\.title\)/)
  assert.match(source, /恢复当前时间/)
})
