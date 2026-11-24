import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
// The deployment uses literal paths and regex catch-all sources.
function fallback(pathname) {
  return config.rewrites.find(rule => new RegExp(`^${rule.source}$`).test(pathname))?.destination
}

test('NewQuantCapital direct navigation and refresh use its own HTML entry', () => {
  for (const pathname of ['/newtrend', '/newtrend/', '/newtrend/zh-TW/', '/newtrend/en-US/news', '/newtrend/de-DE/profile']) {
    assert.equal(fallback(pathname), '/newtrend/index.html', pathname)
  }
})

test('existing prototype routes keep the original HTML entry', () => {
  for (const pathname of ['/', '/admin', '/front/home', '/agent-system/dashboard', '/newtrend-other']) {
    assert.equal(fallback(pathname), '/index.html', pathname)
  }
})
