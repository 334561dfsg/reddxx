import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {iconSets, lineIcon} from '../src/icons/lineIcons.js'
import {statusDomains, statusLabelKey} from '../src/utils/statusLabels.js'
import {earnPortfolios} from '../src/server/earnPortfolio.js'
import {quantFundAccount} from '../src/server/quantFundPortfolio.js'
import {strategyAccounts} from '../src/server/strategyPortfolio.js'
import {seedStrategy} from '../../src/shared/strategy/seed.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const vueFiles = (function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.vue')) out.push(full)
  }
  return out
})(path.join(root, 'src'))

test('line icon registry holds only static SVG shapes', () => {
  for (const [set, {icons}] of Object.entries(iconSets)) for (const [name, entry] of Object.entries(icons)) {
    const {body, viewBox} = lineIcon(set, name)
    assert.match(viewBox, /^0 0 \d+ \d+$/, `${set}/${name} viewBox`)
    const tags = [...body.matchAll(/<(\/?)(\w+)/g)].map(m => m[2])
    assert.ok(tags.length, `${set}/${name} empty`)
    assert.ok(tags.every(tag => ['path', 'circle', 'rect', 'line', 'polyline'].includes(tag)), `${set}/${name} has ${tags}`)
    assert.ok(!/on\w+=|javascript:|\{\{/.test(body), `${set}/${name} must be inert markup`)
    assert.ok(typeof entry === 'string' || entry.body, `${set}/${name} shape`)
  }
  assert.equal(lineIcon('ui', 'missing'), null)
  assert.equal(lineIcon('nope', 'check'), null)
})

test('every LineIcon used in the templates resolves', () => {
  const missing = []
  for (const file of vueFiles) {
    const source = fs.readFileSync(file, 'utf8')
    for (const [tag] of source.matchAll(/<LineIcon\b[^>]*>/g)) {
      const set = tag.match(/\sset="([^"]+)"/)?.[1] || 'ui'
      const literal = tag.match(/\sname="([^"]+)"/)?.[1]
      const bound = tag.match(/\s:name="([^"]+)"/)?.[1]
      const names = literal ? [literal] : [...(bound || '').matchAll(/[?:]\s*'([a-z0-9-]+)'/g)].map(m => m[1]) // ternary results, not comparisons
      for (const name of names) if (!lineIcon(set, name)) missing.push(`${path.relative(root, file)}: ${set}/${name}`)
    }
  }
  assert.deepEqual(missing, [])
  // Names passed in through variables (tabs, catalogue icons) are checked against their sources here.
  for (const name of ['buy', 'sell', 'orders']) assert.ok(lineIcon('c2c', name), `c2c/${name}`) // C2CBuy nav
  for (const name of ['clock', 'lock']) assert.ok(lineIcon('earn', name), `earn/${name}`) // EarnCatalog filters
})

function localeHas(key) {
  const [module, ...rest] = key.split('.')
  const file = path.join(root, 'src/locales/en-US', module + '.json')
  if (!fs.existsSync(file)) return false
  return rest.reduce((node, part) => node?.[part], JSON.parse(fs.readFileSync(file, 'utf8'))) != null
}

test('every status the mock data can show has a label in its domain', () => {
  const statuses = {
    earn: [...earnPortfolios.real.holdings, ...earnPortfolios.demo.holdings].map(row => row.status),
    'quant-fund': quantFundAccount.orders.map(order => order.status),
    strategy: [...seedStrategy().subscriptions, ...strategyAccounts.demo.records].map(record => record.status).concat('initializing'),
    lending: ['pending', 'active', 'repaying', 'overdue', 'completed', 'rejected', 'cancelled', 'liquidated'],
  }
  assert.deepEqual(Object.keys(statuses).sort(), Object.keys(statusDomains).sort())
  for (const [domain, list] of Object.entries(statuses)) for (const status of new Set(list))
    assert.ok(localeHas(statusLabelKey(domain, status)), `${statusLabelKey(domain, status)} missing`)
})
