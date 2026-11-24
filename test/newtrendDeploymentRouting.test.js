import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
// The deployment uses literal paths and regex catch-all sources.
function fallback(pathname) {
  return config.rewrites.find(rule => new RegExp(`^${rule.source}$`).test(pathname))?.destination
}

test('NewQuantCapital direct navigation and refresh use its own HTML entry', () => {
  for (const pathname of ['/NewQuantCapital', '/NewQuantCapital/', '/NewQuantCapital/zh-TW/', '/NewQuantCapital/en-US/news', '/NewQuantCapital/de-DE/profile']) {
    assert.equal(fallback(pathname), '/NewQuantCapital/index.html', pathname)
  }
})

test('existing prototype routes keep the original HTML entry', () => {
  for (const pathname of ['/', '/admin', '/front/home', '/agent-system/dashboard', '/NewQuantCapital-other']) {
    assert.equal(fallback(pathname), '/index.html', pathname)
  }
})

test('legacy site links redirect to the branded path', () => {
 assert.ok(config.redirects.some(rule=>rule.source==='/newtrend'&&rule.destination==='/NewQuantCapital/'))
 assert.ok(config.redirects.some(rule=>rule.source==='/newtrend/:path*'&&rule.destination==='/NewQuantCapital/:path*'))
})
