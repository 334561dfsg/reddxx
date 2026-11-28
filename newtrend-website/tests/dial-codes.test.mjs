import test from 'node:test'
import assert from 'node:assert/strict'
import {DIAL_CODES, DEFAULT_DIAL_ISO, dialOptions, filterDialOptions, flagOf} from '../src/utils/dialCodes.js'

test('dial codes are unique per country and include the default', () => {
  const isos = DIAL_CODES.map(entry => entry.iso)
  assert.equal(new Set(isos).size, isos.length)
  assert.ok(isos.includes(DEFAULT_DIAL_ISO))
  assert.ok(DIAL_CODES.every(entry => /^[A-Z]{2}$/.test(entry.iso) && /^\+\d{1,4}$/.test(entry.dial)))
  assert.equal(flagOf('US'), '🇺🇸')
})

test('search matches localized name, ISO code and dial prefix', () => {
  const options = dialOptions('en-US')
  assert.equal(options[0].name, 'Afghanistan', 'sorted by localized name')
  assert.deepEqual(filterDialOptions(options, 'bangla').map(o => o.iso), ['BD'])
  assert.ok(filterDialOptions(options, 'tw').some(o => o.iso === 'TW'))
  assert.deepEqual(filterDialOptions(options, '+880').map(o => o.iso), ['BD'])
  assert.ok(filterDialOptions(options, '85').every(o => o.dial.startsWith('+85')))
  assert.equal(filterDialOptions(options, 'zzzz').length, 0)
  assert.equal(filterDialOptions(options, '  ').length, options.length)
})
