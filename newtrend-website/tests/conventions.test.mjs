// Project conventions from AGENTS.md that are easy to break silently (refactor phase 5, 2026-11-27). Each test reads the
// source, so a failure names the file and the rule instead of surfacing later as a visual regression.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import postcss from 'postcss'
import {overlayTypes} from '../src/components/overlay/overlayRegistry.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src')
const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
const files = walk(root)
const rel = file => path.relative(root, file)
const read = file => fs.readFileSync(file, 'utf8')
const VENDOR = new Set(['source-theme.css'])

// Every stylesheet in the site, as {file, css}: .css files plus the <style> blocks of single-file components.
const sheets = files.flatMap(file => {
  if (file.endsWith('.css')) return VENDOR.has(rel(file)) ? [] : [{file: rel(file), css: read(file)}]
  if (!file.endsWith('.vue')) return []
  return [...read(file).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => ({file: rel(file), css: m[1]}))
})
const rules = sheets.flatMap(({file, css}) => {
  const out = []
  postcss.parse(css).walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes/.test(rule.parent.name)) return
    const media = rule.parent?.type === 'atrule' ? rule.parent.params : ''
    out.push({file, selector: rule.selector, media, decls: rule.nodes.filter(n => n.type === 'decl')})
  })
  return out
})

test('--nt-* tokens are defined in tokens.css (plus the documented local remaps)', () => {
  // App.vue measures the tab bar, the channel sheets switch the display face, the trading terminal maps green/red.
  const allowed = {'App.vue': ['--nt-tabbar-h'], 'styles/channel-system.css': ['--nt-font-display'], 'styles/quant-system.css': ['--nt-font-display'], 'styles/trade-workspace.css': ['--nt-green', '--nt-red']}
  const stray = rules.flatMap(r => r.decls.filter(d => d.prop.startsWith('--nt-') && r.file !== 'styles/tokens.css' && !allowed[r.file]?.includes(d.prop)).map(d => `${r.file}: ${d.prop}`))
  assert.deepEqual(stray, [])
})

test('the doubled #main-content id is only used by the two channel system sheets', () => {
  const doubled = rules.filter(r => r.selector.includes('#main-content#main-content')).map(r => r.file)
  assert.deepEqual([...new Set(doubled)].sort(), ['styles/channel-system.css', 'styles/quant-system.css'])
})

test('focused, focus-within and expanded states add no outline, ring or border highlight', () => {
  const state = /:focus(-visible|-within)?\b|\[aria-expanded=(true|"true")\]/
  const bad = []
  for (const r of rules) {
    if (!state.test(r.selector) || /forced-colors/.test(r.media)) continue
    for (const d of r.decls) {
      const value = d.value.replace(/\s*!important/, '').trim()
      if (d.prop === 'outline' && !/^(none|0)$/.test(value)) bad.push(`${r.file}: ${r.selector} { outline: ${value} }`)
      if (d.prop === 'box-shadow' && value !== 'none') bad.push(`${r.file}: ${r.selector} { box-shadow: ${value} }`)
      if (/^border(-(top|right|bottom|left))?(-color)?$/.test(d.prop) && !/transparent|^0$|^none$/.test(value)) {
        // A rule that only restates the resting border is allowed; anything else is a highlight.
        bad.push(`${r.file}: ${r.selector} { ${d.prop}: ${value} }`)
      }
    }
  }
  assert.deepEqual(bad, [])
})

test('breakpoints use the shared pairs (≤767/≥768 for phones, 640 for small phones)', () => {
  const old = sheets.flatMap(({file, css}) => [...css.matchAll(/@media[^{]*\b(max-width:\s*(760|639)px|min-width:\s*(761|640)px)/g)].map(m => `${file}: ${m[0]}`))
  assert.deepEqual(old, [])
  assert.match(read(path.join(root, 'composables/useMediaQuery.js')), /COMPACT_TRADE_QUERY='\(max-width: 767px\)'/)
})

test('shared stylesheets are imported from script, never through <style src>', () => {
  const src = files.filter(f => f.endsWith('.vue') && /<style[^>]*\ssrc=/.test(read(f))).map(rel)
  assert.deepEqual(src, [])
})

test('browser storage is only touched through utils/storage.js', () => {
  const direct = files.filter(f => /\.(js|vue)$/.test(f) && rel(f) !== 'utils/storage.js' && /\b(localStorage|sessionStorage)\b/.test(read(f))).map(rel)
  assert.deepEqual(direct, [])
})

test('every overlay type that is opened is configured, and every configured type is opened', () => {
  const source = files.filter(f => /\.(js|vue)$/.test(f)).map(read).join('\n')
  const opened = new Set([...source.matchAll(/openModal\(\s*['"]([a-z0-9-]+)['"]/g)].map(m => m[1]))
  const overlay = read(path.join(root, 'components/Overlay.vue'))
  // Types with a body branch in Overlay.vue (wallet, vip, c2c-detail…) need no registry entry when they use the defaults.
  const unhandled = [...opened].filter(type => !overlayTypes[type] && !overlay.includes(`'${type}'`))
  assert.deepEqual(unhandled, [])
  const unused = Object.keys(overlayTypes).filter(type => !opened.has(type))
  assert.deepEqual(unused, [])
})

test('every language namespace is referenced from the source', () => {
  // Unused namespaces (copytrade, seo, referral, withdraw, app) were removed in phase 5; keep new ones from going stale.
  const source = files.filter(f => /\.(js|vue)$/.test(f) && !rel(f).startsWith('locales')).map(f => read(f).replaceAll('&quot;', '"')).join('\n')
  const namespaces = fs.readdirSync(path.join(root, 'locales/en-US')).filter(n => n.endsWith('.json')).map(n => n.slice(0, -5))
  const unused = namespaces.filter(ns => !new RegExp(`["'\`]${ns}\\.`).test(source))
  assert.deepEqual(unused, [])
})
