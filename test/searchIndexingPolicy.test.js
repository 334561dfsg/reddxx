import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')
const directives = value => value.split(',').map(item => item.trim().toLowerCase())

test('both independent HTML entries declare noindex before JavaScript runs', () => {
  for (const file of ['index.html', 'newtrend-website/index.html']) {
    const tag = read(file).match(/<meta\s+name="robots"\s+content="([^"]+)"\s*\/?>/i)
    assert.ok(tag, file)
    for (const directive of ['noindex', 'nofollow', 'nosnippet', 'noimageindex']) assert.ok(directives(tag[1]).includes(directive), `${file}: ${directive}`)
  }
})

test('deployment sends noindex for every prototype route and asset', () => {
  const config = JSON.parse(read('vercel.json'))
  for (const url of ['/', '/admin', '/front/home', '/agent-system/login', '/NewQuantCapital/zh-TW/', '/NewQuantCapital/en-US/news/123', '/assets/app.js', '/NewQuantCapital/assets/image.png']) {
    const headers = config.headers.filter(rule => new RegExp(`^${rule.source}$`).test(url)).flatMap(rule => rule.headers)
    assert.ok(headers.some(h => h.key.toLowerCase() === 'x-robots-tag' && directives(h.value).includes('noindex')), url)
  }
})

test('robots policies do not prevent crawlers from reading noindex', () => {
  for (const file of ['public/robots.txt', 'newtrend-website/public/robots.txt']) {
    const rules = read(file).split('\n').filter(line => !line.trim().startsWith('#')).join('\n')
    assert.match(rules, /User-agent:\s*\*/i)
    assert.doesNotMatch(rules, /^\s*Disallow:\s*\S+/im)
  }
})
